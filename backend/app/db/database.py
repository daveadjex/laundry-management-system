from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import get_settings

settings = get_settings()

# 1. Keep your existing SQLite check
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

# 2. Add pool configuration parameters to keep connections fresh
engine = create_engine(
    settings.DATABASE_URL, 
    connect_args=connect_args,
    pool_pre_ping=True,     # Verifies connection health before running the query
    pool_recycle=300,       # Recycles and refreshes connections older than 5 minutes
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
