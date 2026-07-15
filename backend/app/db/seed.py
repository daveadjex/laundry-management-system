"""
Run once to create the initial IT Administrator account:
    python -m app.db.seed
"""
from app.db.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.core.security import hash_password
from app.core.config import get_settings

settings = get_settings()


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.role == UserRole.IT_ADMIN).first()
        if existing:
            print(f"IT Admin already exists: {existing.username}")
            return

        it_admin = User(
            username=settings.SEED_IT_ADMIN_USERNAME,
            full_name="IT Administrator",
            hashed_password=hash_password(settings.SEED_IT_ADMIN_PASSWORD),
            role=UserRole.IT_ADMIN,
            must_change_password=True,
        )
        db.add(it_admin)
        db.commit()
        print(f"✅ Created IT Admin account -> username: '{it_admin.username}'  password: '{settings.SEED_IT_ADMIN_PASSWORD}'")
        print("⚠️  Log in and change this password immediately, then create the Owner (admin) and Shop Worker accounts from the IT Admin panel.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
