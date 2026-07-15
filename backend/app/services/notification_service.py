from sqlalchemy.orm import Session
from app.models.notification import Notification, NotificationType
from app.models.customer import Customer
from app.services.sms_service import send_sms


def notify_customer(
    db: Session,
    customer: Customer,
    message: str,
    notif_type: NotificationType = NotificationType.CUSTOM,
    order_id: str = None,
    sent_by: str = None,
) -> Notification:
    result = send_sms(customer.phone, message)
    success = result.get("status") == "sent"

    record = Notification(
        order_id=order_id,
        customer_id=customer.id,
        type=notif_type,
        message=message,
        phone=customer.phone,
        sent_successfully=success,
        provider_response=str(result),
        sent_by=sent_by,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
