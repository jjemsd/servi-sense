"""
seed.py — Idempotent initial data seeding.

Runs at startup. Inserts default office services and demo users *only if*
the relevant tables are empty, so it's safe to call on every boot.

Demo accounts (CHANGE THESE before any real deployment):
    admin     / admin123      → role=admin
    guidance  / guidance123   → role=staff, office="Guidance Counseling"
    library   / library123    → role=staff, office="Library"
"""

import logging

from sqlalchemy.orm import Session as DBSession

from app.auth import hash_password
from app.models import Service, User

log = logging.getLogger(__name__)


# Office name → category, used to seed both `services` rows AND as the
# canonical list of offices for staff `assigned_office`.
DEFAULT_SERVICES: list[tuple[str, str, str]] = [
    ("Guidance Counseling", "Student Life", "Counseling and student welfare services"),
    ("Library", "Academic", "Library resources, study spaces, and research help"),
    ("Clinic / Medical", "Health", "On-campus medical and first-aid services"),
    ("Registrar", "Enrollment", "Records, transcripts, and enrollment documents"),
    ("OSAA / Student Affairs", "Student Life", "Organizations, scholarships, and student affairs"),
    ("Cashier", "Other", "Tuition, fees, and payment processing"),
    ("ICTMO", "Other", "IT, network, and learning-management support"),
]


DEMO_USERS: list[dict] = [
    {
        "username": "admin",
        "password": "admin123",
        "role": "admin",
        "full_name": "System Administrator",
        "email": "admin@servisense.local",
        "assigned_office": None,
    },
    {
        "username": "guidance",
        "password": "guidance123",
        "role": "staff",
        "full_name": "Guidance Staff",
        "email": "guidance@servisense.local",
        "assigned_office": "Guidance Counseling",
    },
    {
        "username": "library",
        "password": "library123",
        "role": "staff",
        "full_name": "Library Staff",
        "email": "library@servisense.local",
        "assigned_office": "Library",
    },
]


def seed_initial_data(db: DBSession) -> None:
    _seed_services(db)
    _seed_users(db)


def _seed_services(db: DBSession) -> None:
    if db.query(Service).count() > 0:
        return  # already populated; do nothing

    for name, category, description in DEFAULT_SERVICES:
        db.add(
            Service(
                name=name,
                category=category,
                description=description,
                is_active=True,
            )
        )
    db.commit()
    log.info("Seeded %d default services", len(DEFAULT_SERVICES))


def _seed_users(db: DBSession) -> None:
    if db.query(User).count() > 0:
        return

    for u in DEMO_USERS:
        db.add(
            User(
                username=u["username"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
                full_name=u["full_name"],
                email=u["email"],
                assigned_office=u["assigned_office"],
                is_active=True,
            )
        )
    db.commit()
    log.info("Seeded %d demo users", len(DEMO_USERS))
