"""
routers/users.py — User management (admin only) + self password change.

Safeguards:
- Can't deactivate yourself.
- Can't deactivate / demote the last active admin.
- When deactivating or resetting a password, all that user's sessions are
  revoked so they can't keep using the app.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.auth import (
    get_current_user,
    hash_password,
    require_admin,
    verify_password,
)
from app.database import get_db
from app.models import Service, User, UserSession
from app.schemas import (
    MessageResponse,
    PasswordChangeRequest,
    PasswordResetRequest,
    UserCreate,
    UserResponse,
    UserUpdate,
)


router = APIRouter(prefix="/api/users", tags=["users"])


# ── Helpers ──────────────────────────────────────────────────────────────────
def _count_other_active_admins(db: DBSession, exclude_user_id: int) -> int:
    return (
        db.query(User)
        .filter(
            User.role == "admin",
            User.is_active.is_(True),
            User.id != exclude_user_id,
        )
        .count()
    )


def _validate_assigned_office(db: DBSession, office: str) -> None:
    if not db.query(Service).filter(Service.name == office, Service.is_active.is_(True)).first():
        raise HTTPException(
            status_code=400,
            detail=f"'{office}' is not an active office in the services catalog",
        )


def _revoke_all_sessions(db: DBSession, user_id: int) -> None:
    db.query(UserSession).filter(UserSession.user_id == user_id).delete()


# ── Self: change own password ────────────────────────────────────────────────
# Must come BEFORE /{user_id} routes so "me" doesn't collide with the int matcher.
@router.post("/me/password", response_model=MessageResponse)
def change_own_password(
    payload: PasswordChangeRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )
    if payload.new_password == payload.current_password:
        raise HTTPException(
            status_code=400, detail="New password must be different from current"
        )

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return MessageResponse(message="Password changed")


# ── List ─────────────────────────────────────────────────────────────────────
@router.get("", response_model=list[UserResponse])
def list_users(
    db: DBSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    return db.query(User).order_by(User.username).all()


# ── Get one ──────────────────────────────────────────────────────────────────
@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ── Create ───────────────────────────────────────────────────────────────────
@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: DBSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=409, detail="Username already exists")

    assigned_office = None
    if payload.role == "staff":
        if not payload.assigned_office:
            raise HTTPException(status_code=400, detail="Staff role requires assigned_office")
        _validate_assigned_office(db, payload.assigned_office)
        assigned_office = payload.assigned_office

    user = User(
        username=payload.username.strip(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        full_name=payload.full_name,
        email=payload.email,
        assigned_office=assigned_office,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── Update ───────────────────────────────────────────────────────────────────
@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    is_self = user.id == current_user.id

    # Safeguard: can't deactivate yourself
    if is_self and payload.is_active is False:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

    # Safeguard: can't demote the last active admin
    if user.role == "admin" and payload.role and payload.role != "admin":
        if _count_other_active_admins(db, user.id) == 0:
            raise HTTPException(
                status_code=400, detail="Cannot demote the last active admin"
            )

    # Safeguard: can't deactivate the last active admin
    if user.role == "admin" and payload.is_active is False:
        if _count_other_active_admins(db, user.id) == 0:
            raise HTTPException(
                status_code=400, detail="Cannot deactivate the last active admin"
            )

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.email is not None:
        user.email = payload.email
    if payload.role is not None:
        user.role = payload.role
        if user.role == "admin":
            user.assigned_office = None
    if payload.assigned_office is not None:
        # Only meaningful if role is (or becomes) staff
        effective_role = payload.role or user.role
        if effective_role == "staff":
            _validate_assigned_office(db, payload.assigned_office)
            user.assigned_office = payload.assigned_office
    if payload.is_active is not None:
        user.is_active = payload.is_active
        if not user.is_active:
            _revoke_all_sessions(db, user.id)

    db.commit()
    db.refresh(user)
    return user


# ── Admin password reset ─────────────────────────────────────────────────────
@router.post("/{user_id}/reset-password", response_model=MessageResponse)
def admin_reset_password(
    user_id: int,
    payload: PasswordResetRequest,
    db: DBSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(payload.new_password)
    _revoke_all_sessions(db, user.id)
    db.commit()
    return MessageResponse(message=f"Password reset for {user.username}")


# ── Delete ───────────────────────────────────────────────────────────────────
@router.delete("/{user_id}", response_model=MessageResponse)
def delete_user(
    user_id: int,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    if user.role == "admin" and _count_other_active_admins(db, user.id) == 0:
        raise HTTPException(status_code=400, detail="Cannot delete the last active admin")

    username = user.username
    db.delete(user)
    db.commit()
    return MessageResponse(message=f"Deleted user {username}")
