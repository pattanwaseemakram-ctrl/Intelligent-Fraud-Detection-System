# ============================================================
# Financial Fraud Detection System
# System Health & Monitoring Routes
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, status

from backend.config import logger
from backend.auth import verify_bearer_token
from backend.model_service import is_model_loaded, MODEL_THRESHOLD
from backend.alert_service import test_connection, get_alert_summary

system_router = APIRouter(tags=["System Health & Monitoring"])

# ------------------------------------------------------------
# API Root and Service Discovery
# ------------------------------------------------------------

@system_router.get(
    "/",
    summary="API root and service discovery",
)
@system_router.get(
    "/api",
    include_in_schema=False,
)
def api_root():
    return {
        "service": "Financial Fraud Detection REST API",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_url": "/health",
        "default_threshold": MODEL_THRESHOLD,
        "endpoints": {
            "health": "/health",
            "predict_single": "/predict",
            "predict_batch": "/batch-predict",
            "alerts": "/alerts",
            "alert_summary": "/alerts-summary",
            "model_monitoring": "/model/monitoring-stats",
            "sample_batch": "/sample-197-batch",
            "auth_token": "/auth/token",
        },
    }

# ------------------------------------------------------------
# Service Health Check
# ------------------------------------------------------------

@system_router.get(
    "/health",
    summary="Check service health and model readiness",
)
def health_check():
    model_ok = is_model_loaded()
    database_status = test_connection()

    database_ok = (
        database_status.get("status") == "connected"
    )

    return {
        "status": (
            "healthy"
            if model_ok and database_ok
            else "degraded"
        ),
        "model_loaded": model_ok,
        "database": database_status,
        "threshold": MODEL_THRESHOLD,
        "algorithm": "ROS + Logistic Regression Pipeline",
    }

# ------------------------------------------------------------
# Model & Alert Monitoring Stats
# ------------------------------------------------------------

@system_router.get(
    "/model/monitoring-stats",
    summary="Retrieve model and alert monitoring information",
    dependencies=[Depends(verify_bearer_token)],
)
def get_model_monitoring_stats():
    """
    Return live service information and database alert counts.

    Evaluation metrics, drift values, latency measurements,
    and feature importance are deliberately not fabricated here.
    Connect verified evaluation artifacts or real monitoring
    instrumentation before exposing those metrics.
    """
    try:
        summary = get_alert_summary()
    except Exception:
        logger.exception("Unable to retrieve monitoring alert summary.")
        summary = {}

    total_alerts = summary.get("total_alerts", 0)

    return {
        "status": "online",
        "model_name": "Random Over-Sampling + Logistic Regression Pipeline",
        "pipeline_file": "ros_logistic_end_to_end_finetuned.pkl",
        "model_loaded": is_model_loaded(),
        "calibrated_threshold": MODEL_THRESHOLD,
        "kpis": {
            "model_loaded": is_model_loaded(),
            "threshold": MODEL_THRESHOLD,
            "db_alerts_stored": total_alerts,
            "total_alerts": total_alerts,
            "new_alerts": summary.get("new_alerts", 0),
            "under_review": summary.get("under_review", 0),
            "resolved": summary.get("resolved", 0),
        },
        "evaluation_metrics_available": False,
        "threshold_curve": [],
        "probability_distribution": {
            "bins": [],
            "normal_counts": [],
            "fraud_counts": [],
        },
        "feature_importance": [],
        "drift_psi_timeline": [],
        "latency_timeline": [],
        "metrics_note": (
            "Offline model metrics, drift measurements, "
            "latency, and feature importance are not "
            "calculated live by this endpoint."
        ),
    }
