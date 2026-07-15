from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.database import Base, engine
from app.api.routes import auth, users, customers, orders, payments, notifications, dashboard

settings = get_settings()

# Create tables (SQLite — fine for this scale; swap for Alembic migrations if you outgrow it)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Laundry Management System API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    #allow_origins=["*"],
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(payments.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "laundry-management-system"}
