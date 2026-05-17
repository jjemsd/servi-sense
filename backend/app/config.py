"""
config.py — Application settings loaded from environment variables.
"""

import os
from dotenv import load_dotenv

load_dotenv()  # reads .env file if present


class Settings:
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./servisense.db",  # local-dev fallback
    )

    # Auth
    SESSION_COOKIE_NAME: str = "servisense_session"
    SESSION_LIFETIME_HOURS: int = 12

    # CORS — frontend origins allowed to call this API
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")

    # Environment flag
    ENV: str = os.getenv("ENV", "development")

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"


settings = Settings()
