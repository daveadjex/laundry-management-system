import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.config import get_settings
from app.core.security import verify_password, create_access_token, hash_password
from app.models.user import User
from app.models.password_reset import PasswordResetOTP
from app.schemas.auth import TokenResponse, ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.schemas.user import UserOut
from app.api.deps import get_current_user, log_activity
from app.services.sms_service import send_sms

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    remember_me: bool = Form(False),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been disabled. Contact the IT Administrator.")

    expires_minutes = settings.REMEMBER_ME_EXPIRE_MINUTES if remember_me else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    token = create_access_token(
        {"sub": user.id, "role": user.role.value, "username": user.username},
        expires_minutes=expires_minutes,
    )
    log_activity(db, user, "LOGIN", f"{user.username} logged in" + (" (remembered)" if remember_me else ""))
    return TokenResponse(
        access_token=token,
        role=user.role.value,
        full_name=user.full_name,
        username=user.username,
        must_change_password=user.must_change_password,
        expires_in_minutes=expires_minutes,
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


_GENERIC_FORGOT_MESSAGE = "If that account exists, a reset code has been sent to the phone number on file."


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()

    # Always return the same generic response whether or not the account exists,
    # or has a phone on file — this avoids leaking which usernames are valid.
    if not user or not user.phone or not user.is_active:
        return {"detail": _GENERIC_FORGOT_MESSAGE}

    otp_code = f"{random.randint(0, 999999):06d}"
    otp = PasswordResetOTP(
        user_id=user.id,
        otp_code=otp_code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
    )
    db.add(otp)
    db.commit()

    send_sms(user.phone, f"Your Nagyees Laundry Service password reset code is {otp_code}. It expires in {settings.OTP_EXPIRE_MINUTES} minutes.")
    return {"detail": _GENERIC_FORGOT_MESSAGE}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    otp = (
        db.query(PasswordResetOTP)
        .filter(
            PasswordResetOTP.user_id == user.id,
            PasswordResetOTP.otp_code == payload.otp,
            PasswordResetOTP.used == False,  # noqa: E712
        )
        .order_by(PasswordResetOTP.created_at.desc())
        .first()
    )
    now = datetime.now(timezone.utc)
    expires_at = otp.expires_at.replace(tzinfo=timezone.utc) if otp and otp.expires_at.tzinfo is None else (otp.expires_at if otp else None)
    if not otp or expires_at < now:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    user.hashed_password = hash_password(payload.new_password)
    user.must_change_password = False
    otp.used = True
    db.commit()
    log_activity(db, user, "RESET_PASSWORD_OTP", f"{user.username} reset their password via SMS code")
    return {"detail": "Password reset successfully. You can now log in."}
