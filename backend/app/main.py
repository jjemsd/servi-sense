"""
main.py — FastAPI app entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings


app = FastAPI(
    title="ServiSense API",
    description="Student Services Utilization & Performance Analytics System",
    version="2.0.0",
)


# ── CORS ─────────────────────────────────────────────────────────────────────
# Allow the React dev server (and prod frontend) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,   # required for session cookies
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health check (sanity endpoint for Stage 1) ───────────────────────────────
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
