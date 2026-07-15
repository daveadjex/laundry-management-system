from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.models.customer import Customer
from app.models.activity_log import ActivityLog
from app.api.deps import require_roles

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Admin (owner) is primarily a read-only overseer; IT admin can see everything too.
CAN_VIEW = require_roles(UserRole.ADMIN, UserRole.IT_ADMIN)


@router.get("/overview")
def overview(db: Session = Depends(get_db), current_user: User = Depends(CAN_VIEW)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    total_orders = db.query(func.count(Order.id)).scalar() or 0
    orders_today = db.query(func.count(Order.id)).filter(Order.created_at >= today_start).scalar() or 0
    pending_orders = db.query(func.count(Order.id)).filter(
        Order.status.in_([OrderStatus.RECEIVED, OrderStatus.IN_PROGRESS])
    ).scalar() or 0
    ready_orders = db.query(func.count(Order.id)).filter(Order.status == OrderStatus.READY).scalar() or 0

    revenue_today = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
        Payment.status == PaymentStatus.SUCCESS, Payment.created_at >= today_start
    ).scalar() or 0.0
    revenue_week = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
        Payment.status == PaymentStatus.SUCCESS, Payment.created_at >= week_start
    ).scalar() or 0.0
    revenue_total = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
        Payment.status == PaymentStatus.SUCCESS
    ).scalar() or 0.0

    total_customers = db.query(func.count(Customer.id)).scalar() or 0
    active_workers = db.query(func.count(User.id)).filter(User.role == UserRole.WORKER, User.is_active == True).scalar() or 0

    recent_orders = db.query(Order).order_by(Order.created_at.desc()).limit(8).all()
    recent_activity = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(15).all()

    return {
        "total_orders": total_orders,
        "orders_today": orders_today,
        "pending_orders": pending_orders,
        "ready_orders": ready_orders,
        "revenue_today": revenue_today,
        "revenue_week": revenue_week,
        "revenue_total": revenue_total,
        "total_customers": total_customers,
        "active_workers": active_workers,
        "recent_orders": [
            {
                "id": o.id, "order_number": o.order_number, "status": o.status.value,
                "total_amount": o.total_amount, "created_at": o.created_at.isoformat(),
            } for o in recent_orders
        ],
        "recent_activity": [
            {
                "actor": a.actor_username, "action": a.action, "details": a.details,
                "created_at": a.created_at.isoformat(),
            } for a in recent_activity
        ],
    }
