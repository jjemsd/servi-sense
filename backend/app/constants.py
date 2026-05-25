"""
constants.py — Reference data for dropdowns and validation.

Single source of truth for the enums used across the system.
"""

from typing import Literal


DEPARTMENTS: list[str] = [
    "BSIT", "BSCoE", "BSMath", "BSED",
    "BSARCHI", "BSCE", "BSEE", "BSME", "ABEL",
]

YEAR_LEVELS: list[str] = [
    "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year",
]

SERVICE_CATEGORIES: list[str] = [
    "Academic", "Health", "Enrollment", "Student Life", "Other",
]

ROLES: list[str] = ["admin", "staff"]


# Literal types for Pydantic validation
RoleLiteral = Literal["admin", "staff"]
CategoryLiteral = Literal["Academic", "Health", "Enrollment", "Student Life", "Other"]
