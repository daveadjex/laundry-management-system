from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.payment import PaymentMethod, PaymentStatus


class CashPaymentCreate(BaseModel):
    order_id: str
    amount: float = Field(gt=0)


class MomoPaymentCreate(BaseModel):
    order_id: str
    amount: float = Field(gt=0)
    phone: str = Field(description="Customer MoMo number, e.g. 0241234567 or 233241234567")
    provider: str = Field(description="mtn | vod | tgo (AirtelTigo)")


class MomoOtpSubmit(BaseModel):
    payment_id: str
    otp: str


class PaymentOut(BaseModel):
    id: str
    order_id: str
    method: PaymentMethod
    status: PaymentStatus
    amount: float
    paystack_reference: Optional[str] = None
    momo_provider: Optional[str] = None
    momo_phone: Optional[str] = None
    display_text: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
