"""
schemas.py — Pydantic models for request/response validation.

These define the SHAPE of JSON going in and out of the API. They're
separate from the SQLAlchemy models (database shape) on purpose —
e.g. UserResponse never includes password_hash.
"""

from datetime import datetime, date, time as Time
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

from app.constants import RoleLiteral, StatusLiteral, CategoryLiteral


# ── Auth ───────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=200)


class MessageResponse(BaseModel):
    message: str


# ── Users ──────────────────────────────────────────────────────────────────────
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

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(..., min_length=6, max_length=200)
    role: RoleLiteral
    full_name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = None
    assigned_office: Optional[str] = None  # required if role=staff, ignored if admin


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = None
    role: Optional[RoleLiteral] = None
    assigned_office: Optional[str] = None
    is_active: Optional[bool] = None


class PasswordResetRequest(BaseModel):
    """Admin resetting another user's password."""

    new_password: str = Field(..., min_length=6, max_length=200)


class PasswordChangeRequest(BaseModel):
    """User changing their own password."""

    current_password: str = Field(..., min_length=1, max_length=200)
    new_password: str = Field(..., min_length=6, max_length=200)


# ── Services (catalog) ────────────────────────────────────────────────────────
class ServiceResponse(BaseModel):
    id: int
    name: str
    category: str
    description: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class ServiceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    category: CategoryLiteral
    description: Optional[str] = Field(None, max_length=500)
    is_active: bool = True


class ServiceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=80)
    category: Optional[CategoryLiteral] = None
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


# ── Service records ───────────────────────────────────────────────────────────
class RecordCreate(BaseModel):
    service_date: date
    time: Optional[Time] = None
    student_id: str = Field(..., min_length=1, max_length=30)
    student_name: str = Field(..., min_length=1, max_length=120)
    year_level: Optional[str] = None
    department: Optional[str] = None
    service_id: int
    status: StatusLiteral = "Completed"
    notes: Optional[str] = None
    response_time_minutes: Optional[int] = Field(None, ge=0, le=1440)
    satisfaction_rating: Optional[int] = Field(None, ge=1, le=5)


class RecordUpdate(BaseModel):
    service_date: Optional[date] = None
    time: Optional[Time] = None
    student_id: Optional[str] = Field(None, min_length=1, max_length=30)
    student_name: Optional[str] = Field(None, min_length=1, max_length=120)
    year_level: Optional[str] = None
    department: Optional[str] = None
    service_id: Optional[int] = None
    status: Optional[StatusLiteral] = None
    notes: Optional[str] = None
    response_time_minutes: Optional[int] = Field(None, ge=0, le=1440)
    satisfaction_rating: Optional[int] = Field(None, ge=1, le=5)


class RecordResponse(BaseModel):
    id: int
    service_date: date
    time: Optional[Time] = None
    day_of_week: Optional[str] = None
    student_id: str
    student_name: str
    year_level: Optional[str] = None
    department: Optional[str] = None
    service_id: int
    service_name: str
    service_category: str
    office: str
    status: str
    notes: Optional[str] = None
    processed_by: Optional[str] = None
    response_time_minutes: Optional[int] = None
    satisfaction_rating: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecordListResponse(BaseModel):
    items: list[RecordResponse]
    total: int
    page: int
    page_size: int


# ── Uploaded files ────────────────────────────────────────────────────────────
class UploadResponse(BaseModel):
    id: int
    filename: str
    content_type: Optional[str] = None
    size_bytes: int
    uploaded_by: str
    uploaded_at: datetime
    office: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UploadProcessResult(BaseModel):
    upload: UploadResponse
    total_rows: int
    inserted: int
    errors: list[str]


# ── Reference data (dropdowns) ────────────────────────────────────────────────
class ReferenceData(BaseModel):
    departments: list[str]
    year_levels: list[str]
    service_categories: list[str]
    record_statuses: list[str]
    roles: list[str]
    offices: list[str]  # active service names
