import random
import string
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.order import Order, OrderItem, OrderStatus
from app.models.customer import Customer
from app.models.notification import NotificationType
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate
from app.api.deps import get_current_user, require_roles, log_activity
from app.services.notification_service import notify_customer

router = APIRouter(prefix="/api/orders", tags=["orders"])

STAFF = require_roles(UserRole.WORKER, UserRole.IT_ADMIN, UserRole.ADMIN)
WORKER_OR_IT = require_roles(UserRole.WORKER, UserRole.IT_ADMIN)


def generate_order_number() -> str:
    date_part = datetime.now().strftime("%y%m%d")
    rand_part = "".join(random.choices(string.digits, k=4))
    return f"LN-{date_part}-{rand_part}"


@router.get("", response_model=List[OrderOut])
def list_orders(
    status_filter: Optional[OrderStatus] = Query(default=None, alias="status"),
    customer_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(STAFF),
):
    query = db.query(Order)
    if status_filter:
        query = query.filter(Order.status == status_filter)
    if customer_id:
        query = query.filter(Order.customer_id == customer_id)
    return query.order_by(Order.created_at.desc()).all()


@router.post("", response_model=OrderOut)
def create_order(payload: OrderCreate, db: Session = Depends(get_db), current_user: User = Depends(WORKER_OR_IT)):
    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if not payload.items:
        raise HTTPException(status_code=400, detail="An order needs at least one item")

    order = Order(
        order_number=generate_order_number(),
        customer_id=customer.id,
        created_by=current_user.id,
        notes=payload.notes,
    )
    total = 0.0
    for item in payload.items:
        oi = OrderItem(**item.model_dump())
        total += oi.quantity * oi.unit_price
        order.items.append(oi)
    order.total_amount = total

    db.add(order)
    db.commit()
    db.refresh(order)

    notify_customer(
        db, customer,
        f"Hi {customer.full_name}, we've received your laundry order {order.order_number} "
        f"(GHS {order.total_amount:.2f}). We'll text you when it's ready for pickup.",
        NotificationType.ORDER_RECEIVED, order.id, current_user.id,
    )
    log_activity(db, current_user, "CREATE_ORDER", f"Order {order.order_number} for {customer.full_name}")
    return order


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: str, db: Session = Depends(get_db), current_user: User = Depends(STAFF)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/{order_id}/status", response_model=OrderOut)
def update_status(order_id: str, payload: OrderStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(WORKER_OR_IT)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = payload.status
    now = datetime.now(timezone.utc)

    if payload.status == OrderStatus.READY:
        order.ready_at = now
        customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
        notify_customer(
            db, customer,
            f"Hi {customer.full_name}, your laundry order {order.order_number} is ready for pickup! "
            f"Total due: GHS {order.total_amount:.2f}.",
            NotificationType.ORDER_READY, order.id, current_user.id,
        )
    elif payload.status == OrderStatus.PICKED_UP:
        order.picked_up_at = now

    db.commit()
    db.refresh(order)
    log_activity(db, current_user, "UPDATE_ORDER_STATUS", f"Order {order.order_number} -> {payload.status.value}")
    return order
