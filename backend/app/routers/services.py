"""
routers/services.py — Services catalog (the 7 offices: Library, Registrar, etc.)

Read access: any authenticated user (used for dropdown population).
Write access: admin only.

Renaming a service propagates to all existing records and to any staff
user whose assigned_office referenced the old name — this fixes the
orphan-on-rename bug from the old project.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models import Service, ServiceRecord, User
from app.schemas import (
    MessageResponse,
    ServiceCreate,
    ServiceResponse,
    ServiceUpdate,
)


router = APIRouter(prefix="/api/services", tags=["services"])


@router.get("", response_model=list[ServiceResponse])
def list_services(
    include_inactive: bool = False,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Service)
    if not include_inactive:
        q = q.filter(Service.is_active.is_(True))
    return q.order_by(Service.name).all()


@router.get("/{service_id}", response_model=ServiceResponse)
def get_service(
    service_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    service = db.query(Service).get(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
def create_service(
    payload: ServiceCreate,
    db: DBSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = db.query(Service).filter(Service.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="A service with that name already exists")

    service = Service(
        name=payload.name.strip(),
        category=payload.category,
        description=payload.description,
        is_active=payload.is_active,
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.patch("/{service_id}", response_model=ServiceResponse)
def update_service(
    service_id: int,
    payload: ServiceUpdate,
    db: DBSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    service = db.query(Service).get(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    old_name = service.name

    if payload.name is not None and payload.name.strip() != old_name:
        new_name = payload.name.strip()
        conflict = (
            db.query(Service)
            .filter(Service.name == new_name, Service.id != service_id)
            .first()
        )
        if conflict:
            raise HTTPException(status_code=409, detail="Another service already uses that name")
        service.name = new_name
        # Propagate rename to records.office and users.assigned_office
        db.query(ServiceRecord).filter(ServiceRecord.service_id == service_id).update(
            {"office": new_name}
        )
        db.query(User).filter(User.assigned_office == old_name).update(
            {"assigned_office": new_name}
        )

    if payload.category is not None:
        service.category = payload.category
    if payload.description is not None:
        service.description = payload.description
    if payload.is_active is not None:
        service.is_active = payload.is_active

    db.commit()
    db.refresh(service)
    return service


@router.delete("/{service_id}", response_model=MessageResponse)
def delete_service(
    service_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    service = db.query(Service).get(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    record_count = (
        db.query(ServiceRecord)
        .filter(ServiceRecord.service_id == service_id)
        .count()
    )
    if record_count > 0:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot delete: {record_count} records reference this service. "
                "Deactivate it instead (set is_active=false)."
            ),
        )

    db.delete(service)
    db.commit()
    return MessageResponse(message=f"Deleted service {service.name}")
