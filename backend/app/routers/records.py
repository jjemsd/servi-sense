"""
routers/records.py — Service records CRUD with filters + pagination.

Access rules:
- Staff users can only see/create/edit/delete records for their assigned_office.
- Admin users can do anything to any record.
- Records carry the service.name into their `office` column so we can filter
  without a join. When a service is renamed, services.py updates these too.
"""

from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session as DBSession, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Service, ServiceRecord, User
from app.schemas import (
    MessageResponse,
    RecordCreate,
    RecordListResponse,
    RecordResponse,
    RecordUpdate,
)


router = APIRouter(prefix="/api/records", tags=["records"])


# ── Helpers ──────────────────────────────────────────────────────────────────
def _base_query(db: DBSession, user: User):
    """Records query scoped to the user's authorization."""
    q = db.query(ServiceRecord).options(joinedload(ServiceRecord.service))
    if user.role != "admin":
        if not user.assigned_office:
            # Staff with no office assigned sees nothing
            q = q.filter(ServiceRecord.id == -1)
        else:
            q = q.filter(ServiceRecord.office == user.assigned_office)
    return q


def _ensure_can_touch(record: ServiceRecord, user: User) -> None:
    """403 if a staff user is trying to act on a record outside their office."""
    if user.role == "admin":
        return
    if not user.assigned_office or record.office != user.assigned_office:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access records for your assigned office",
        )


# ── List ─────────────────────────────────────────────────────────────────────
@router.get("", response_model=RecordListResponse)
def list_records(
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
    # Filters
    office: Optional[str] = None,
    department: Optional[str] = None,
    service_id: Optional[int] = None,
    record_status: Optional[str] = Query(None, alias="status"),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = Query(None, description="Match student_id or student_name"),
    # Pagination
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    q = _base_query(db, user)

    # Admin-only filter — staff already pinned to their office by _base_query
    if office and user.role == "admin":
        q = q.filter(ServiceRecord.office == office)

    if department:
        q = q.filter(ServiceRecord.department == department)
    if service_id:
        q = q.filter(ServiceRecord.service_id == service_id)
    if record_status:
        q = q.filter(ServiceRecord.status == record_status)
    if date_from:
        q = q.filter(ServiceRecord.service_date >= date_from)
    if date_to:
        q = q.filter(ServiceRecord.service_date <= date_to)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter(
            or_(
                ServiceRecord.student_id.ilike(like),
                ServiceRecord.student_name.ilike(like),
            )
        )

    total = q.count()
    items = (
        q.order_by(ServiceRecord.service_date.desc(), ServiceRecord.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return RecordListResponse(items=items, total=total, page=page, page_size=page_size)


# ── Get one ──────────────────────────────────────────────────────────────────
@router.get("/{record_id}", response_model=RecordResponse)
def get_record(
    record_id: int,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = (
        db.query(ServiceRecord)
        .options(joinedload(ServiceRecord.service))
        .filter(ServiceRecord.id == record_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    _ensure_can_touch(record, user)
    return record


# ── Create ───────────────────────────────────────────────────────────────────
@router.post("", response_model=RecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(
    payload: RecordCreate,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = db.query(Service).get(payload.service_id)
    if not service:
        raise HTTPException(status_code=400, detail="service_id does not exist")
    if not service.is_active:
        raise HTTPException(status_code=400, detail="Service is inactive")

    if user.role != "admin":
        if not user.assigned_office or service.name != user.assigned_office:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff can only create records for their assigned office",
            )

    record = ServiceRecord(
        service_date=payload.service_date,
        time=payload.time,
        day_of_week=payload.service_date.strftime("%A"),
        student_id=payload.student_id.strip(),
        student_name=payload.student_name.strip(),
        year_level=payload.year_level,
        department=payload.department,
        service_id=service.id,
        office=service.name,
        status=payload.status,
        notes=payload.notes,
        processed_by=user.username,
        response_time_minutes=payload.response_time_minutes,
        satisfaction_rating=payload.satisfaction_rating,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ── Update ───────────────────────────────────────────────────────────────────
@router.patch("/{record_id}", response_model=RecordResponse)
def update_record(
    record_id: int,
    payload: RecordUpdate,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = db.query(ServiceRecord).filter(ServiceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    _ensure_can_touch(record, user)

    # If service is being changed, validate the new one and update office too
    if payload.service_id is not None and payload.service_id != record.service_id:
        new_service = db.query(Service).get(payload.service_id)
        if not new_service:
            raise HTTPException(status_code=400, detail="service_id does not exist")
        if not new_service.is_active:
            raise HTTPException(status_code=400, detail="Service is inactive")
        if user.role != "admin" and new_service.name != user.assigned_office:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot reassign records to a different office",
            )
        record.service_id = new_service.id
        record.office = new_service.name

    if payload.service_date is not None:
        record.service_date = payload.service_date
        record.day_of_week = payload.service_date.strftime("%A")
    if payload.time is not None:
        record.time = payload.time
    if payload.student_id is not None:
        record.student_id = payload.student_id.strip()
    if payload.student_name is not None:
        record.student_name = payload.student_name.strip()
    if payload.year_level is not None:
        record.year_level = payload.year_level
    if payload.department is not None:
        record.department = payload.department
    if payload.status is not None:
        record.status = payload.status
    if payload.notes is not None:
        record.notes = payload.notes
    if payload.response_time_minutes is not None:
        record.response_time_minutes = payload.response_time_minutes
    if payload.satisfaction_rating is not None:
        record.satisfaction_rating = payload.satisfaction_rating

    db.commit()
    db.refresh(record)
    return record


# ── Delete ───────────────────────────────────────────────────────────────────
@router.delete("/{record_id}", response_model=MessageResponse)
def delete_record(
    record_id: int,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = db.query(ServiceRecord).filter(ServiceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    _ensure_can_touch(record, user)
    db.delete(record)
    db.commit()
    return MessageResponse(message=f"Deleted record {record_id}")
