"""
auth.py — Password hashing, session management, and FastAPI dependencies.

Approach: server-side sessions stored in the `sessions` table, identified
by an opaque token sent as an httpOnly cookie. Simpler to reason about than
JWT, trivially revocable, and you can see every active session in the DB.

Flow:
    1. POST /api/auth/login → validate password → insert session row →
       set cookie → return user
    2. Subsequent requests carry the cookie automatically → get_current_user
       looks up the session row → returns the user
    3. POST /api/auth/logout → delete session row → clear cookie
"""

import secrets
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.database import get_db
from app.models import User, UserSession


# ── Password hashing (bcrypt) ──────────────────────────────────────────────────
# bcrypt has a 72-byte input limit. We truncate at the byte level (not
# character level) to handle multi-byte UTF-8 cleanly.
_BCRYPT_MAX_BYTES = 72


def _to_bcrypt_bytes(plain: str) -> bytes:
    return plain.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(plain: str) -> str:
    hashed = bcrypt.hashpw(_to_bcrypt_bytes(plain), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_to_bcrypt_bytes(plain), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        # Malformed hash in DB — treat as auth failure rather than crashing
        return False


# ── Session management ────────────────────────────────────────────────────────
def create_session(db: DBSession, user_id: int) -> tuple[str, datetime]:
    """Create a new session row, return (session_id, expires_at)."""
    session_id = secrets.token_urlsafe(48)  # ~64 chars
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=settings.SESSION_LIFETIME_HOURS)

    db.add(
        UserSession(
            id=session_id,
            user_id=user_id,
            created_at=now,
            last_seen_at=now,
            expires_at=expires_at,
        )
    )
    db.commit()
    return session_id, expires_at


def delete_session(db: DBSession, session_id: str) -> None:
    db.query(UserSession).filter(UserSession.id == session_id).delete()
    db.commit()


def purge_expired_sessions(db: DBSession) -> int:
    """Housekeeping helper — deletes all expired sessions, returns count."""
    deleted = (
        db.query(UserSession)
        .filter(UserSession.expires_at < datetime.utcnow())
        .delete()
    )
    db.commit()
    return deleted


# ── FastAPI dependencies ──────────────────────────────────────────────────────
def get_current_user(
    session_cookie: Optional[str] = Cookie(
        default=None, alias=settings.SESSION_COOKIE_NAME
    ),
    db: DBSession = Depends(get_db),
) -> User:
    """Resolve the current user from the session cookie. 401 if not logged in."""
    if not session_cookie:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    session = (
        db.query(UserSession).filter(UserSession.id == session_cookie).first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session not found",
        )

    if session.expires_at < datetime.utcnow():
        db.delete(session)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired",
        )

    if not session.user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled",
        )

    # Update last_seen for activity tracking. Not committed — let the caller's
    # transaction handle it on next commit, or skip if read-only. We do a quick
    # commit here to keep things simple.
    session.last_seen_at = datetime.utcnow()
    db.commit()

    return session.user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Use as a dependency on admin-only routes."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return current_user
