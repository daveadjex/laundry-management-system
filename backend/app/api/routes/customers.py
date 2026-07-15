from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerOut
from app.api.deps import get_current_user, require_roles, log_activity

router = APIRouter(prefix="/api/customers", tags=["customers"])

STAFF = require_roles(UserRole.WORKER, UserRole.IT_ADMIN, UserRole.ADMIN)
WORKER_OR_IT = require_roles(UserRole.WORKER, UserRole.IT_ADMIN)


@router.get("", response_model=List[CustomerOut])
def list_customers(q: Optional[str] = Query(default=None), db: Session = Depends(get_db), current_user: User = Depends(STAFF)):
    query = db.query(Customer)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Customer.full_name.ilike(like), Customer.phone.ilike(like)))
    return query.order_by(Customer.created_at.desc()).all()


@router.post("", response_model=CustomerOut)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db), current_user: User = Depends(WORKER_OR_IT)):
    customer = Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    log_activity(db, current_user, "CREATE_CUSTOMER", f"Added customer '{customer.full_name}'")
    return customer


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: str, db: Session = Depends(get_db), current_user: User = Depends(STAFF)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.patch("/{customer_id}", response_model=CustomerOut)
def update_customer(customer_id: str, payload: CustomerUpdate, db: Session = Depends(get_db), current_user: User = Depends(WORKER_OR_IT)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer
