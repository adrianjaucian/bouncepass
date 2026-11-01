import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt

JWT_SECRET = os.getenv("JWT_SECRET") or os.getenv("AUTH_SECRET") or "dev-insecure-jwt-secret-change-me"
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 7


def normalize_email(email: str) -> str:
    return email.strip().lower()


def allowed_login_email() -> str:
    return normalize_email(os.getenv("ADMIN_EMAIL", "demo@bouncepass.net"))


def is_allowed_login_email(email: str) -> bool:
    return normalize_email(email) == allowed_login_email()


def site_password() -> str:
    return os.getenv("ACCESS_PASSWORD") or os.getenv("SITE_PASSWORD") or "pregame"


def is_valid_site_password(password: str) -> bool:
    expected = site_password().encode("utf-8")
    given = (password or "").encode("utf-8")
    if len(given) != len(expected):
        hmac.compare_digest(expected, expected)
        return False
    return hmac.compare_digest(given, expected)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _token_secrets() -> list[str]:
    secrets = [
        os.getenv("JWT_SECRET"),
        os.getenv("AUTH_SECRET"),
        JWT_SECRET,
        "dev-insecure-jwt-secret-change-me",
    ]
    unique: list[str] = []
    for secret in secrets:
        if secret and secret not in unique:
            unique.append(secret)
    return unique


def get_or_create_site_user(db):
    from models import User

    email = allowed_login_email()
    password = site_password()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, password_hash=hash_password(password))
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    if not verify_password(password, user.password_hash):
        user.password_hash = hash_password(password)
        db.commit()
    return user


def decode_access_token(token: str) -> Optional[int]:
    for secret in _token_secrets():
        try:
            payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
            subject = payload.get("sub")
            if subject is None:
                continue
            return int(subject)
        except (jwt.PyJWTError, TypeError, ValueError):
            continue
    return None
