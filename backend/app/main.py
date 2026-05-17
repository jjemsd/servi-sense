"""
main.py — FastAPI app entry point.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, SessionLocal, engine
from app import models  # noqa: F401 — registers models with Base.metadata
from app.routers import auth as auth_router
from app.seed import seed_initial_data


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(name)s  %(message)s",
)
log = logging.getLogger("servisense")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────────────────────────
    log.info("Starting ServiSense API (env=%s)", settings.ENV)
    log.info("Creating tables if missing…")
    Base.metadata.create_all(bind=engine)

    log.info("Seeding initial data if needed…")
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()

    log.info("Startup complete")
    yield

    # ── Shutdown ──────────────────────────────────────────────────────────────
    log.info("Shutting down")


app = FastAPI(
    title="ServiSense API",
    description="Student Services Utilization & Performance Analytics System",
    version="2.0.0",
    lifespan=lifespan,
)


# ── CORS ─────────────────────────────────────────────────────────────────────
# allow_credentials=True requires explicit origins (not "*"). If the env var
# is "*" we relax to a permissive regex for dev convenience but warn loudly.
if settings.CORS_ORIGINS == ["*"]:
    log.warning(
        "CORS_ORIGINS=* with credentials is not allowed by browsers — using "
        "permissive regex fallback. Set a real origin list in production."
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router.router)


# ── Health / root ────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "service": "ServiSense API",
        "version": "2.0.0",
        "env": settings.ENV,
        "status": "ok",
    }


@app.get("/api/health")
def health():
    return {"status": "healthy"}
