from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.security import verify_password, create_access_token, hash_password
from app.models.user import User
from app.schemas.auth import TokenResponse, ChangePasswordRequest
from app.schemas.user import UserOut
from app.api.deps import get_current_user, log_activity

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been disabled. Contact the IT Administrator.")

    token = create_access_token({"sub": user.id, "role": user.role.value, "username": user.username})
    log_activity(db, user, "LOGIN", f"{user.username} logged in")
    return TokenResponse(
        access_token=token,
        role=user.role.value,
        full_name=user.full_name,
        username=user.username,
        must_change_password=user.must_change_password,
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/change-password")
def change_password(payload: ChangePasswordRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(payload.new_password)
    current_user.must_change_password = False
    db.commit()
    log_activity(db, current_user, "CHANGE_PASSWORD")
    return {"detail": "Password updated successfully"}
