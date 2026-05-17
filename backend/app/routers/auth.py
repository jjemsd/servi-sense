"""
routers/auth.py — Login, logout, and current-user endpoints.
"""

from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session as DBSession

from app.auth import (
    create_session,
    delete_session,
    get_current_user,
    verify_password,
)
from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, MessageResponse, UserResponse


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=UserResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: DBSession = Depends(get_db),
):
    user = (
        db.query(User).filter(User.username == payload.username.strip()).first()
    )
    # Identical error for both "user not found" and "bad password" so we don't
    # leak which usernames exist.
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled — contact your administrator",
        )

    session_id, _ = create_session(db, user.id)

    # Cookie strategy:
    #   dev      → samesite=lax, secure=False   (Vite proxy makes it same-origin)
    #   prod     → samesite=none, secure=True   (true cross-origin between
    #                                            servisense-web.onrender.com and
    #                                            servisense-api.onrender.com)
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_id,
        httponly=True,
        secure=settings.is_production,
        samesite="none" if settings.is_production else "lax",
        max_age=settings.SESSION_LIFETIME_HOURS * 3600,
        path="/",
    )
    return user


@router.post("/logout", response_model=MessageResponse)
def logout(
    response: Response,
    session_cookie: Optional[str] = Cookie(
        default=None, alias=settings.SESSION_COOKIE_NAME
    ),
    db: DBSession = Depends(get_db),
):
    if session_cookie:
        delete_session(db, session_cookie)
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
        samesite="none" if settings.is_production else "lax",
        secure=settings.is_production,
    )
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Return the currently-authenticated user. Frontend uses this on app load
    to determine whether the session cookie is still valid."""
    return current_user
