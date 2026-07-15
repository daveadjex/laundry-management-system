from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.notification import NotificationType


class NotificationSend(BaseModel):
    customer_id: str
    order_id: Optional[str] = None
    message: str
    type: NotificationType = NotificationType.CUSTOM


class NotificationOut(BaseModel):
    id: str
    order_id: Optional[str] = None
    customer_id: str
    type: NotificationType
    message: str
    phone: str
    sent_successfully: bool
    created_at: datetime

    class Config:
        from_attributes = True
