# ============================================================
# Financial Fraud Detection System
# Backend Configuration & Lifecycle
# ============================================================

import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI

# ------------------------------------------------------------
# Project Paths & Environment
# ------------------------------------------------------------

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

load_dotenv(PROJECT_ROOT / ".env")

# ------------------------------------------------------------
# Logging Configuration
# ------------------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fraud_detection_api")

# ------------------------------------------------------------
# OpenAPI Tags Metadata
# ------------------------------------------------------------

TAGS_METADATA = [
    {
        "name": "Authentication & Security",
        "description": "Authentication and Bearer token management.",
    },
    {
        "name": "Fraud Prediction Engine",
        "description": (
            "Single and batch transaction prediction using the trained machine learning model."
        ),
    },
    {
        "name": "Fraud Alert Management",
        "description": (
            "Retrieval, review, status updates, and deletion of suspicious prediction alerts."
        ),
    },
    {
        "name": "System Health & Monitoring",
        "description": (
            "Backend health, model readiness, database connectivity, and monitoring information."
        ),
    },
]

# ------------------------------------------------------------
# CORS Configuration
# ------------------------------------------------------------

default_origins = (
    "http://127.0.0.1:5500,"
    "http://localhost:5500,"
    "http://127.0.0.1:8000,"
    "http://localhost:8000"
)

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", default_origins).split(",")
    if origin.strip()
]

# ------------------------------------------------------------
# Database Initialization Lifespan
# ------------------------------------------------------------

from backend.alert_service import initialize_database

@asynccontextmanager
async def lifespan(application: FastAPI):
    """
    Initialize alert storage when the application starts.
    The health endpoint reports database connectivity.
    """
    try:
        initialize_database()
        logger.info("Alert database initialized successfully.")
    except Exception:
        logger.exception("Alert database initialization failed.")
    yield
