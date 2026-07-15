from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CustomerCreate(BaseModel):
    full_name: str
    phone: str = Field(min_length=9, description="MoMo/SMS-capable phone number, e.g. 233241234567")
    notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class CustomerOut(BaseModel):
    id: str
    full_name: str
    phone: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
