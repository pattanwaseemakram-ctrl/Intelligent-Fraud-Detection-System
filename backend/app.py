# ============================================================
# Financial Fraud Detection System
# FastAPI Main Application Entry Point
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import ALLOWED_ORIGINS, TAGS_METADATA, lifespan
from backend.auth import (
    auth_router,
    verify_bearer_token,
    login_for_access_token,
    USER_DATABASE,
    ACTIVE_TOKENS,
)
from backend.routes.system_routes import system_router
from backend.routes.prediction_routes import prediction_router
from backend.routes.alert_routes import alert_router

# ------------------------------------------------------------
# Initialize FastAPI Application
# ------------------------------------------------------------

app = FastAPI(
    title="Intelligent Fraud Detection for Financial Transactions API",
    description=(
        "REST API for real-time and batch financial "
        "transaction prediction, alert management, "
        "and system monitoring."
    ),
    version="1.0.0",
    openapi_tags=TAGS_METADATA,
    lifespan=lifespan,
)

# ------------------------------------------------------------
# CORS Middleware
# ------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ------------------------------------------------------------
# Mount Modular Routers
# ------------------------------------------------------------

app.include_router(system_router)
app.include_router(auth_router)
app.include_router(prediction_router)
app.include_router(alert_router)

# ------------------------------------------------------------
# Direct Execution
# ------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.app:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )