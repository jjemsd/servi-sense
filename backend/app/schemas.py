"""
schemas.py — Pydantic models for request/response validation.

These define the SHAPE of JSON going in and out of the API. They're
separate from the SQLAlchemy models (database shape) on purpose —
e.g. UserResponse never includes password_hash.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ── Auth ───────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=200)


class UserResponse(BaseModel):
    """Public-safe view of a User row — never includes password_hash."""

    id: int
    username: str
    role: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    assigned_office: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    message: str
