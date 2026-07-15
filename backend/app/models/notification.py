import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Boolean
from app.db.database import Base


class NotificationType(str, enum.Enum):
    ORDER_READY = "order_ready"
    PAYMENT_RECEIPT = "payment_receipt"
    ORDER_RECEIVED = "order_received"
    CUSTOM = "custom"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String, ForeignKey("orders.id"), nullable=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    type = Column(Enum(NotificationType), default=NotificationType.CUSTOM)
    message = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    sent_successfully = Column(Boolean, default=False)
    provider_response = Column(String, nullable=True)
    sent_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
