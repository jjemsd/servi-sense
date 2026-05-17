"""
models.py — SQLAlchemy ORM models for ServiSense.

Tables:
- users               authentication + role + (optional) assigned office
- services            catalog of services offered by each office
- service_records     individual service utilization records
- uploaded_files      CSV/Excel uploads kept for audit
- sessions            server-side session store (cookie-based auth)

Design notes vs the old project:
- service_records.service_id is now a real FK to services.id, so renaming
  a service in System Settings won't orphan existing records.
- Sessions are kept server-side instead of JWTs — easier to reason about,
  trivially revocable (just delete the row).
"""

from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Date,
    Time,
    Text,
    ForeignKey,
    LargeBinary,
    Index,
)
from sqlalchemy.orm import relationship

from app.database import Base


# ── Users ──────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # "admin" | "staff"
    full_name = Column(String(100))
    email = Column(String(120))
    # NULL for admins; office name for staff (matches services.name)
    assigned_office = Column(String(80))
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    sessions = relationship(
        "UserSession", back_populates="user", cascade="all, delete-orphan"
    )


# ── Services catalog ───────────────────────────────────────────────────────────
class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True)
    name = Column(String(80), unique=True, nullable=False)
    category = Column(String(40), nullable=False)
    description = Column(String(500))
    is_active = Column(Boolean, default=True, nullable=False)

    records = relationship("ServiceRecord", back_populates="service")


# ── Service records ────────────────────────────────────────────────────────────
class ServiceRecord(Base):
    __tablename__ = "service_records"

    id = Column(Integer, primary_key=True)
    service_date = Column(Date, nullable=False, index=True)
    time = Column(Time)
    day_of_week = Column(String(10))

    student_id = Column(String(30), index=True)
    student_name = Column(String(120))
    year_level = Column(String(20))
    department = Column(String(20))

    service_id = Column(
        Integer, ForeignKey("services.id"), nullable=False, index=True
    )
    # Denormalized office name for fast filtering without a join
    office = Column(String(80), nullable=False, index=True)

    status = Column(String(20), default="Completed", nullable=False)
    notes = Column(Text)

    processed_by = Column(String(50))  # username of the staff who logged it
    response_time_minutes = Column(Integer)
    satisfaction_rating = Column(Integer)  # 1-5, nullable

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    service = relationship("Service", back_populates="records")


# Helpful composite index for the most common analytics filter
Index(
    "ix_service_records_office_date",
    ServiceRecord.office,
    ServiceRecord.service_date,
)


# ── Uploaded files (audit trail of bulk-uploaded CSV/Excel) ────────────────────
class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(Integer, primary_key=True)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(100))
    content = Column(LargeBinary, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    uploaded_by = Column(String(50), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    # Which office this upload is intended for (admins can target any office;
    # staff can only target their own)
    office = Column(String(80), index=True)


# ── Sessions (server-side auth) ────────────────────────────────────────────────
class UserSession(Base):
    __tablename__ = "sessions"

    # The cookie value itself — 64 chars, URL-safe random
    id = Column(String(80), primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)

    user = relationship("User", back_populates="sessions")
