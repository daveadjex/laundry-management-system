from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.order import OrderStatus


class OrderItemCreate(BaseModel):
    service_type: str
    description: Optional[str] = None
    quantity: int = Field(default=1, ge=1)
    unit_price: float = Field(ge=0)


class OrderItemOut(OrderItemCreate):
    id: str

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    customer_id: str
    items: List[OrderItemCreate]
    notes: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderOut(BaseModel):
    id: str
    order_number: str
    customer_id: str
    status: OrderStatus
    total_amount: float
    notes: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime
    ready_at: Optional[datetime] = None
    picked_up_at: Optional[datetime] = None
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True
