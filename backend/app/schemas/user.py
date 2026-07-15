from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.user import UserRole


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    full_name: str
    phone: Optional[str] = None
    password: str = Field(min_length=6)
    role: UserRole


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResetPassword(BaseModel):
    new_password: str = Field(min_length=6)


class UserOut(BaseModel):
    id: str
    username: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
