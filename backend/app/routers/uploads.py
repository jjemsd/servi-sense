"""
routers/uploads.py — Bulk record import via CSV/Excel upload.

Flow:
1. User uploads file via multipart/form-data
2. The raw file is persisted to `uploaded_files` (audit trail)
3. The file is parsed with pandas, validated, and rows are inserted as
   service records — with per-row errors collected and returned

Expected columns (case-insensitive, extras ignored):
- service_date     (required)  YYYY-MM-DD or any pandas-parseable date
- student_id       (required)
- student_name     (required)
- service_name     (required)  must match an active service in the catalog
- time             (optional)  HH:MM
- year_level       (optional)
- department       (optional)
- notes            (optional)
"""

from io import BytesIO
from typing import Optional

import pandas as pd
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session as DBSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Service, ServiceRecord, UploadedFile, User
from app.schemas import (
    MessageResponse,
    UploadProcessResult,
    UploadResponse,
)


router = APIRouter(prefix="/api/uploads", tags=["uploads"])


# Files larger than this are rejected (15 MB)
_MAX_FILE_BYTES = 15 * 1024 * 1024
_ALLOWED_EXTS = (".csv", ".xlsx", ".xls")
_REQUIRED_COLS = {"service_date", "student_id", "student_name", "service_name"}


# ── Helpers ──────────────────────────────────────────────────────────────────
def _resolve_target_office(user: User, target_office: Optional[str]) -> str:
    """Admin must supply target_office; staff is forced to their own office."""
    if user.role == "admin":
        if not target_office:
            raise HTTPException(
                status_code=400,
                detail="target_office is required when uploading as admin",
            )
        return target_office
    if not user.assigned_office:
        raise HTTPException(
            status_code=400,
            detail="Your account has no assigned office; ask an admin",
        )
    return user.assigned_office


def _read_file_to_dataframe(filename: str, content: bytes) -> pd.DataFrame:
    fname = filename.lower()
    try:
        if fname.endswith(".csv"):
            df = pd.read_csv(BytesIO(content))
        else:  # .xlsx or .xls
            df = pd.read_excel(BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {e}")

    # Normalize column names: lowercase, strip
    df.columns = [str(c).strip().lower() for c in df.columns]
    return df


def _value_or_none(v) -> Optional[str]:
    if pd.isna(v):
        return None
    s = str(v).strip()
    return s or None


def _process_dataframe(
    df: pd.DataFrame,
    office: str,
    username: str,
    db: DBSession,
) -> tuple[int, list[str]]:
    """Insert one record per row. Returns (inserted_count, errors)."""
    missing = _REQUIRED_COLS - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {sorted(missing)}",
        )

    # Build service name → id map for the office (we only accept records that
    # match the upload's target office)
    services_for_office = {
        s.name: s.id
        for s in db.query(Service)
        .filter(Service.is_active.is_(True), Service.name == office)
        .all()
    }
    if not services_for_office:
        raise HTTPException(
            status_code=400,
            detail=f"No active service found with name '{office}'",
        )

    inserted = 0
    errors: list[str] = []

    for idx, row in df.iterrows():
        row_num = idx + 2  # +2: 1 for header, 1 for 1-indexing
        try:
            service_name = str(row["service_name"]).strip()
            if service_name not in services_for_office:
                errors.append(
                    f"Row {row_num}: service '{service_name}' does not match upload office '{office}'"
                )
                continue

            try:
                svc_date = pd.to_datetime(row["service_date"]).date()
            except Exception:
                errors.append(f"Row {row_num}: invalid service_date '{row['service_date']}'")
                continue

            svc_time = None
            if "time" in df.columns:
                t = row.get("time")
                if pd.notna(t):
                    try:
                        svc_time = pd.to_datetime(str(t)).time()
                    except Exception:
                        pass  # silently drop a bad time

            student_id = _value_or_none(row["student_id"])
            student_name = _value_or_none(row["student_name"])
            if not student_id or not student_name:
                errors.append(f"Row {row_num}: student_id and student_name are required")
                continue

            record = ServiceRecord(
                service_date=svc_date,
                time=svc_time,
                day_of_week=svc_date.strftime("%A"),
                student_id=student_id,
                student_name=student_name,
                year_level=_value_or_none(row.get("year_level")) if "year_level" in df.columns else None,
                department=_value_or_none(row.get("department")) if "department" in df.columns else None,
                service_id=services_for_office[service_name],
                office=service_name,
                notes=_value_or_none(row.get("notes")) if "notes" in df.columns else None,
                processed_by=username,
            )
            db.add(record)
            inserted += 1
        except Exception as e:  # pragma: no cover — defensive catch-all
            errors.append(f"Row {row_num}: unexpected error: {e}")

    db.commit()
    return inserted, errors


# ── Endpoints ────────────────────────────────────────────────────────────────
@router.post("", response_model=UploadProcessResult, status_code=status.HTTP_201_CREATED)
async def upload_records(
    file: UploadFile = File(...),
    target_office: Optional[str] = Form(None),
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    fname = (file.filename or "").lower()
    if not fname.endswith(_ALLOWED_EXTS):
        raise HTTPException(
            status_code=400,
            detail=f"File must be one of: {_ALLOWED_EXTS}",
        )

    office = _resolve_target_office(user, target_office)

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > _MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large (max {_MAX_FILE_BYTES // (1024 * 1024)} MB)",
        )

    # Persist raw file for audit
    upload = UploadedFile(
        filename=file.filename or "upload",
        content_type=file.content_type,
        content=content,
        size_bytes=len(content),
        uploaded_by=user.username,
        office=office,
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)

    # Parse and process
    df = _read_file_to_dataframe(file.filename or "upload", content)
    total_rows = len(df)
    inserted, errors = _process_dataframe(df, office, user.username, db)

    return UploadProcessResult(
        upload=UploadResponse.model_validate(upload),
        total_rows=total_rows,
        inserted=inserted,
        errors=errors,
    )


@router.get("", response_model=list[UploadResponse])
def list_uploads(
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
    office: Optional[str] = None,
):
    q = db.query(UploadedFile).order_by(UploadedFile.uploaded_at.desc())
    if user.role != "admin":
        if not user.assigned_office:
            return []
        q = q.filter(UploadedFile.office == user.assigned_office)
    elif office:
        q = q.filter(UploadedFile.office == office)
    return q.all()


@router.get("/{upload_id}/download")
def download_upload(
    upload_id: int,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    upload = db.query(UploadedFile).get(upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    if user.role != "admin" and upload.office != user.assigned_office:
        raise HTTPException(status_code=403, detail="Not authorized for this upload")

    return Response(
        content=upload.content,
        media_type=upload.content_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{upload.filename}"',
        },
    )


@router.delete("/{upload_id}", response_model=MessageResponse)
def delete_upload(
    upload_id: int,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    upload = db.query(UploadedFile).get(upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    if user.role != "admin" and upload.office != user.assigned_office:
        raise HTTPException(status_code=403, detail="Not authorized for this upload")

    filename = upload.filename
    db.delete(upload)
    db.commit()
    return MessageResponse(message=f"Deleted upload '{filename}'")


# ── Preview an upload ────────────────────────────────────────────────────────
from fastapi import Query
import math


@router.get("/{upload_id}/preview")
def preview_upload(
    upload_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Parse a previously-uploaded file and return its rows as JSON.

    Staff can only preview uploads for their assigned office; admin can
    preview any upload.
    """
    upload = db.query(UploadedFile).get(upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    if user.role != "admin" and upload.office != user.assigned_office:
        raise HTTPException(status_code=403, detail="Not authorized for this upload")

    df = _read_file_to_dataframe(upload.filename, upload.content)
    total_rows = len(df)
    offset = (page - 1) * page_size
    chunk = df.iloc[offset : offset + page_size]

    # Normalize cell values to JSON-serializable plain types
    def _clean(v):
        if pd.isna(v):
            return None
        if isinstance(v, (int, float, bool)):
            return v
        return str(v)

    rows = [
        {str(col): _clean(val) for col, val in row.items()}
        for _, row in chunk.iterrows()
    ]

    return {
        "id": upload.id,
        "filename": upload.filename,
        "office": upload.office,
        "uploaded_at": upload.uploaded_at.isoformat() if upload.uploaded_at else None,
        "uploaded_by": upload.uploaded_by,
        "size_bytes": upload.size_bytes,
        "total_rows": total_rows,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total_rows / page_size) if total_rows else 1,
        "columns": [str(c) for c in df.columns],
        "rows": rows,
    }
