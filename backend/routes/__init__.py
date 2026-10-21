# ============================================================
# Financial Fraud Detection System
# Routes Package
# ============================================================

from backend.routes.prediction_routes import prediction_router
from backend.routes.alert_routes import alert_router
from backend.routes.system_routes import system_router

__all__ = ["prediction_router", "alert_router", "system_router"]
