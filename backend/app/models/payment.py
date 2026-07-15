import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Enum, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    PAYSTACK_MOMO = "paystack_momo"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    method = Column(Enum(PaymentMethod), nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    amount = Column(Float, nullable=False)

    # Paystack mobile money specifics
    paystack_reference = Column(String, nullable=True, index=True)
    momo_provider = Column(String, nullable=True)   # mtn, tel, tgo (AirtelTigo)
    momo_phone = Column(String, nullable=True)
    gateway_response = Column(String, nullable=True)
    display_text = Column(String, nullable=True)    # e.g. "Approve on your phone"

    received_by = Column(String, ForeignKey("users.id"), nullable=False)  # worker who recorded/initiated it
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    order = relationship("Order", back_populates="payments")
