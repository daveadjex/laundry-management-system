import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from app.db.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=False, index=True)  # used for SMS + Paystack MoMo charge
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
