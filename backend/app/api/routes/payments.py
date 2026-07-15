from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.order import Order
from app.models.customer import Customer
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.notification import NotificationType
from app.schemas.payment import CashPaymentCreate, MomoPaymentCreate, MomoOtpSubmit, PaymentOut
from app.api.deps import get_current_user, require_roles, log_activity
from app.services.paystack_service import initiate_momo_charge, submit_otp, verify_transaction
from app.services.notification_service import notify_customer

router = APIRouter(prefix="/api/payments", tags=["payments"])

WORKER_OR_IT = require_roles(UserRole.WORKER, UserRole.IT_ADMIN)
STAFF = require_roles(UserRole.WORKER, UserRole.IT_ADMIN, UserRole.ADMIN)


@router.get("/order/{order_id}", response_model=List[PaymentOut])
def payments_for_order(order_id: str, db: Session = Depends(get_db), current_user: User = Depends(STAFF)):
    return db.query(Payment).filter(Payment.order_id == order_id).order_by(Payment.created_at.desc()).all()


@router.post("/cash", response_model=PaymentOut)
def record_cash_payment(payload: CashPaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(WORKER_OR_IT)):
    order = db.query(Order).filter(Order.id == payload.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payment = Payment(
        order_id=order.id,
        method=PaymentMethod.CASH,
        status=PaymentStatus.SUCCESS,
        amount=payload.amount,
        received_by=current_user.id,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
    notify_customer(
        db, customer,
        f"Payment received: GHS {payload.amount:.2f} (cash) for order {order.order_number}. Thank you!",
        NotificationType.PAYMENT_RECEIPT, order.id, current_user.id,
    )
    log_activity(db, current_user, "CASH_PAYMENT", f"GHS {payload.amount:.2f} for order {order.order_number}")
    return payment


@router.post("/momo/initiate", response_model=PaymentOut)
def initiate_momo(payload: MomoPaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(WORKER_OR_IT)):
    """
    Kicks off Paystack Mobile Money charge. The customer's phone will be
    prompted by their network (MTN/T/AirtelTigo) to enter their MoMo PIN.
    Final confirmation arrives via webhook (see /webhook) or can be polled via /momo/verify/{reference}.
    """
    order = db.query(Order).filter(Order.id == payload.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    result = initiate_momo_charge(
        email_placeholder=f"{current_user.username}@Nagyees Laundry Service.local",
        amount=payload.amount,
        phone=payload.phone,
        provider=payload.provider,
    )
    data = result.get("data", {})
    reference = data.get("reference")
    ps_status = data.get("status")  # 'send_otp' | 'pay_offline' | 'success' | 'failed'

    payment = Payment(
        order_id=order.id,
        method=PaymentMethod.PAYSTACK_MOMO,
        status=PaymentStatus.SUCCESS if ps_status == "success" else PaymentStatus.PENDING,
        amount=payload.amount,
        paystack_reference=reference,
        momo_provider=payload.provider,
        momo_phone=payload.phone,
        gateway_response=data.get("gateway_response"),
        display_text=data.get("display_text") or "Ask the customer to check their phone and enter their MoMo PIN to approve payment.",
        received_by=current_user.id,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    log_activity(db, current_user, "MOMO_PAYMENT_INITIATED", f"GHS {payload.amount:.2f} for order {order.order_number} ref={reference}")
    return payment


@router.post("/momo/submit-otp", response_model=PaymentOut)
def momo_submit_otp(payload: MomoOtpSubmit, db: Session = Depends(get_db), current_user: User = Depends(WORKER_OR_IT)):
    """Only needed if Paystack responds with status 'send_otp' for that MoMo provider."""
    payment = db.query(Payment).filter(Payment.id == payload.payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    result = submit_otp(payment.paystack_reference, payload.otp)
    data = result.get("data", {})
    if data.get("status") == "success":
        payment.status = PaymentStatus.SUCCESS
        _fire_payment_success_notification(db, payment, current_user.id)
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/momo/verify/{reference}", response_model=PaymentOut)
def momo_verify(reference: str, db: Session = Depends(get_db), current_user: User = Depends(STAFF)):
    """Manual poll — lets the shop worker refresh status while waiting for the customer to approve."""
    payment = db.query(Payment).filter(Payment.paystack_reference == reference).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    result = verify_transaction(reference)
    data = result.get("data", {})
    ps_status = data.get("status")

    if ps_status == "success" and payment.status != PaymentStatus.SUCCESS:
        payment.status = PaymentStatus.SUCCESS
        _fire_payment_success_notification(db, payment, current_user.id)
        db.commit()
    elif ps_status == "failed":
        payment.status = PaymentStatus.FAILED
        db.commit()

    db.refresh(payment)
    return payment


@router.post("/webhook")
async def paystack_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Paystack calls this automatically when a charge settles (charge.success / charge.failed).
    In production, verify the `x-paystack-signature` header against PAYSTACK_SECRET_KEY (HMAC SHA512)
    before trusting the payload.
    """
    body = await request.json()
    event = body.get("event")
    data = body.get("data", {})
    reference = data.get("reference")

    payment = db.query(Payment).filter(Payment.paystack_reference == reference).first()
    if not payment:
        return {"received": True, "note": "no matching payment"}

    if event == "charge.success":
        payment.status = PaymentStatus.SUCCESS
        _fire_payment_success_notification(db, payment, payment.received_by)
    elif event == "charge.failed":
        payment.status = PaymentStatus.FAILED

    db.commit()
    return {"received": True}


def _fire_payment_success_notification(db, payment: Payment, actor_id: str):
    order = db.query(Order).filter(Order.id == payment.order_id).first()
    if not order:
        return
    customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
    notify_customer(
        db, customer,
        f"Payment of GHS {payment.amount:.2f} confirmed via Mobile Money for order {order.order_number}. Thank you!",
        NotificationType.PAYMENT_RECEIPT, order.id, actor_id,
    )
