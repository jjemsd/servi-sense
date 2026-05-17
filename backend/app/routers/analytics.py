"""
routers/analytics.py — Aggregations powering the Dashboard and Analytics pages.

One endpoint returns everything the frontend visualizations need so we make
a single roundtrip per filter change instead of one per chart.

Scoping: staff users are pinned to their assigned_office (server-side).
Admins can additionally filter by `office` in the query string.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import Integer, func
from sqlalchemy.orm import Session as DBSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Service, ServiceRecord, User


router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ── Response shapes ──────────────────────────────────────────────────────────
class KPIs(BaseModel):
    total_records: int
    completed_records: int
    avg_satisfaction: Optional[float] = None
    avg_response_time_minutes: Optional[float] = None
    unique_students: int
    active_services_used: int


class Bucket(BaseModel):
    label: str
    count: int


class SatisfactionBucket(BaseModel):
    label: str
    avg_rating: Optional[float] = None
    rated_count: int


class HourlyBucket(BaseModel):
    hour: int
    count: int


class AnalyticsResponse(BaseModel):
    kpis: KPIs
    by_office: list[Bucket]
    by_department: list[Bucket]
    by_status: list[Bucket]
    by_month: list[Bucket]
    by_day_of_week: list[Bucket]
    by_hour: list[HourlyBucket]
    satisfaction_by_office: list[SatisfactionBucket]


# ── Helpers ──────────────────────────────────────────────────────────────────
_DOW_ORDER = [
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday",
]


def _base_query(db: DBSession, user: User):
    q = db.query(ServiceRecord)
    if user.role != "admin":
        if user.assigned_office:
            q = q.filter(ServiceRecord.office == user.assigned_office)
        else:
            q = q.filter(ServiceRecord.id == -1)
    return q


def _apply_filters(q, office, date_from, date_to):
    if office:
        q = q.filter(ServiceRecord.office == office)
    if date_from:
        q = q.filter(ServiceRecord.service_date >= date_from)
    if date_to:
        q = q.filter(ServiceRecord.service_date <= date_to)
    return q


# ── Endpoint ─────────────────────────────────────────────────────────────────
@router.get("", response_model=AnalyticsResponse)
def analytics(
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
    office: Optional[str] = None,
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
):
    # Admin-only office filter is the only one that needs guarding; the rest
    # are scoped automatically inside _base_query.
    office_filter = office if user.role == "admin" else None

    base = _apply_filters(_base_query(db, user), office_filter, date_from, date_to)

    # ── KPIs ────────────────────────────────────────────────────────────────
    total_records = base.count()
    completed_records = base.filter(ServiceRecord.status == "Completed").count()

    avg_sat = base.with_entities(
        func.avg(ServiceRecord.satisfaction_rating)
    ).filter(ServiceRecord.satisfaction_rating.isnot(None)).scalar()

    avg_rt = base.with_entities(
        func.avg(ServiceRecord.response_time_minutes)
    ).filter(ServiceRecord.response_time_minutes.isnot(None)).scalar()

    unique_students = (
        base.with_entities(ServiceRecord.student_id)
        .filter(ServiceRecord.student_id.isnot(None))
        .distinct()
        .count()
    )

    active_services_used = (
        base.with_entities(ServiceRecord.service_id).distinct().count()
    )

    kpis = KPIs(
        total_records=total_records,
        completed_records=completed_records,
        avg_satisfaction=round(float(avg_sat), 2) if avg_sat is not None else None,
        avg_response_time_minutes=round(float(avg_rt), 1) if avg_rt is not None else None,
        unique_students=unique_students,
        active_services_used=active_services_used,
    )

    # ── Per-office counts ──────────────────────────────────────────────────
    by_office_rows = (
        _apply_filters(_base_query(db, user), office_filter, date_from, date_to)
        .with_entities(ServiceRecord.office, func.count(ServiceRecord.id))
        .group_by(ServiceRecord.office)
        .order_by(func.count(ServiceRecord.id).desc())
        .all()
    )
    by_office = [Bucket(label=o or "—", count=c) for o, c in by_office_rows]

    # ── Per-department counts ──────────────────────────────────────────────
    by_dept_rows = (
        _apply_filters(_base_query(db, user), office_filter, date_from, date_to)
        .with_entities(ServiceRecord.department, func.count(ServiceRecord.id))
        .group_by(ServiceRecord.department)
        .order_by(func.count(ServiceRecord.id).desc())
        .all()
    )
    by_department = [Bucket(label=d or "Unspecified", count=c) for d, c in by_dept_rows]

    # ── Per-status counts ──────────────────────────────────────────────────
    by_status_rows = (
        _apply_filters(_base_query(db, user), office_filter, date_from, date_to)
        .with_entities(ServiceRecord.status, func.count(ServiceRecord.id))
        .group_by(ServiceRecord.status)
        .all()
    )
    by_status = [Bucket(label=s or "Unknown", count=c) for s, c in by_status_rows]

    # ── Per-month trend (YYYY-MM) ──────────────────────────────────────────
    # Use strftime on SQLite, to_char on Postgres; SQLAlchemy `func` for both.
    bind_name = db.bind.dialect.name if db.bind else "sqlite"
    if bind_name == "postgresql":
        month_expr = func.to_char(ServiceRecord.service_date, "YYYY-MM")
    else:
        month_expr = func.strftime("%Y-%m", ServiceRecord.service_date)

    by_month_rows = (
        _apply_filters(_base_query(db, user), office_filter, date_from, date_to)
        .with_entities(month_expr.label("month"), func.count(ServiceRecord.id))
        .group_by("month")
        .order_by("month")
        .all()
    )
    by_month = [Bucket(label=str(m), count=c) for m, c in by_month_rows]

    # ── Per-day-of-week counts (Monday → Sunday) ───────────────────────────
    by_dow_rows = (
        _apply_filters(_base_query(db, user), office_filter, date_from, date_to)
        .with_entities(ServiceRecord.day_of_week, func.count(ServiceRecord.id))
        .group_by(ServiceRecord.day_of_week)
        .all()
    )
    dow_map = {d: c for d, c in by_dow_rows if d}
    by_day_of_week = [Bucket(label=d, count=dow_map.get(d, 0)) for d in _DOW_ORDER]

    # ── Hourly distribution (0..23) ────────────────────────────────────────
    if bind_name == "postgresql":
        hour_expr = func.extract("hour", ServiceRecord.time)
    else:
        hour_expr = func.cast(func.strftime("%H", ServiceRecord.time), Integer)

    by_hour_rows = (
        _apply_filters(_base_query(db, user), office_filter, date_from, date_to)
        .with_entities(hour_expr.label("h"), func.count(ServiceRecord.id))
        .filter(ServiceRecord.time.isnot(None))
        .group_by("h")
        .order_by("h")
        .all()
    )
    hour_map = {int(h): c for h, c in by_hour_rows if h is not None}
    by_hour = [HourlyBucket(hour=h, count=hour_map.get(h, 0)) for h in range(24)]

    # ── Satisfaction by office ─────────────────────────────────────────────
    sat_rows = (
        _apply_filters(_base_query(db, user), office_filter, date_from, date_to)
        .filter(ServiceRecord.satisfaction_rating.isnot(None))
        .with_entities(
            ServiceRecord.office,
            func.avg(ServiceRecord.satisfaction_rating),
            func.count(ServiceRecord.id),
        )
        .group_by(ServiceRecord.office)
        .order_by(func.avg(ServiceRecord.satisfaction_rating).desc())
        .all()
    )
    satisfaction_by_office = [
        SatisfactionBucket(
            label=o or "—",
            avg_rating=round(float(avg), 2) if avg is not None else None,
            rated_count=n,
        )
        for o, avg, n in sat_rows
    ]

    return AnalyticsResponse(
        kpis=kpis,
        by_office=by_office,
        by_department=by_department,
        by_status=by_status,
        by_month=by_month,
        by_day_of_week=by_day_of_week,
        by_hour=by_hour,
        satisfaction_by_office=satisfaction_by_office,
    )
