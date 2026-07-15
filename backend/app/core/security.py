from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
from jose import jwt, JWTError
from app.core.config import get_settings

settings = get_settings()

# We call bcrypt directly rather than going through passlib's CryptContext.
# passlib 1.7.4 detects the bcrypt backend by reading bcrypt.__about__.__version__,
# an attribute that newer bcrypt releases (4.1+) removed — this breaks hashing/
# verification with a confusing "no attribute '__about__'" error depending on
# whichever bcrypt version happens to get resolved on a given machine/Python
# version. bcrypt's own hashpw/checkpw API has stayed stable across versions,
# so calling it directly sidesteps the problem entirely.
_BCRYPT_MAX_BYTES = 72  # bcrypt silently ignores bytes beyond this; we truncate explicitly


def hash_password(password: str) -> str:
    pw_bytes = password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    pw_bytes = plain.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    try:
        return bcrypt.checkpw(pw_bytes, hashed.encode("utf-8"))
    except ValueError:
        # hashed value isn't a valid bcrypt hash (e.g. corrupted/foreign data)
        return False


def create_access_token(data: dict, expires_minutes: Optional[int] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
