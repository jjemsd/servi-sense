"""
routers/reference.py — Reference data for frontend dropdowns.

One endpoint, returns everything the frontend needs to render selectors
(departments, year levels, roles, active offices).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.auth import get_current_user
from app.constants import (
    DEPARTMENTS,
    ROLES,
    SERVICE_CATEGORIES,
    YEAR_LEVELS,
)
from app.database import get_db
from app.models import Service, User
from app.schemas import ReferenceData


router = APIRouter(prefix="/api/reference", tags=["reference"])


@router.get("", response_model=ReferenceData)
def reference_data(
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    offices = [
        s.name
        for s in db.query(Service)
        .filter(Service.is_active.is_(True))
        .order_by(Service.name)
        .all()
    ]
    return ReferenceData(
        departments=DEPARTMENTS,
        year_levels=YEAR_LEVELS,
        service_categories=SERVICE_CATEGORIES,
        roles=ROLES,
        offices=offices,
    )
