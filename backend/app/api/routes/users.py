"""
User management — IT Administrator only ("the God of the system").
Create / edit / delete workers & admins, toggle privileges (role), enable/disable, reset passwords.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate, UserOut, UserResetPassword
from app.api.deps import require_roles, log_activity

router = APIRouter(prefix="/api/users", tags=["users"])

IT_ONLY = require_roles(UserRole.IT_ADMIN)


@router.get("", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(IT_ONLY)):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("", response_model=UserOut)
def create_user(payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(IT_ONLY)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        username=payload.username,
        full_name=payload.full_name,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        created_by=current_user.id,
        must_change_password=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_activity(db, current_user, "CREATE_USER", f"Created {user.role.value} '{user.username}'")
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(IT_ONLY)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    log_activity(db, current_user, "UPDATE_USER", f"Updated user '{user.username}': {data}")
    return user


@router.post("/{user_id}/reset-password")
def reset_password(user_id: str, payload: UserResetPassword, db: Session = Depends(get_db), current_user: User = Depends(IT_ONLY)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = hash_password(payload.new_password)
    user.must_change_password = True
    db.commit()
    log_activity(db, current_user, "RESET_PASSWORD", f"Reset password for '{user.username}'")
    return {"detail": "Password reset successfully"}


@router.delete("/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(IT_ONLY)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    username = user.username
    db.delete(user)
    db.commit()
    log_activity(db, current_user, "DELETE_USER", f"Deleted user '{username}'")
    return {"detail": "User deleted"}
