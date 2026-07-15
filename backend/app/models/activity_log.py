import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from app.db.database import Base


class ActivityLog(Base):
    """Audit trail the IT Admin / Owner can review — who did what, when."""
    __tablename__ = "activity_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id = Column(String, nullable=True)
    actor_username = Column(String, nullable=True)
    action = Column(String, nullable=False)       # e.g. "CREATE_ORDER", "DELETE_USER"
    details = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
