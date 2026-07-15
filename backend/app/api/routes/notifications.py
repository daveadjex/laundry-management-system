from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.notification import Notification
from app.schemas.notification import NotificationSend, NotificationOut
from app.api.deps import get_current_user, require_roles, log_activity
from app.services.notification_service import notify_customer

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

STAFF = require_roles(UserRole.WORKER, UserRole.IT_ADMIN, UserRole.ADMIN)
WORKER_OR_IT = require_roles(UserRole.WORKER, UserRole.IT_ADMIN)


@router.get("", response_model=List[NotificationOut])
def list_notifications(
    customer_id: Optional[str] = None,
    order_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(STAFF),
):
    query = db.query(Notification)
    if customer_id:
        query = query.filter(Notification.customer_id == customer_id)
    if order_id:
        query = query.filter(Notification.order_id == order_id)
    return query.order_by(Notification.created_at.desc()).all()


@router.post("/send", response_model=NotificationOut)
def send_manual_notification(payload: NotificationSend, db: Session = Depends(get_db), current_user: User = Depends(WORKER_OR_IT)):
    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    record = notify_customer(db, customer, payload.message, payload.type, payload.order_id, current_user.id)
    log_activity(db, current_user, "SEND_NOTIFICATION", f"To {customer.full_name}: {payload.message[:60]}")
    return record
