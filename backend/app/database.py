"""
database.py — SQLAlchemy engine, session factory, FastAPI dependency.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from app.config import settings


# Render's old-style postgres:// URLs need to be normalized
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# SQLite needs check_same_thread=False for FastAPI's threading model
connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

engine_kwargs = {"pool_pre_ping": True}
if not db_url.startswith("sqlite"):
    engine_kwargs["pool_size"] = 5

engine = create_engine(db_url, connect_args=connect_args, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session, closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
