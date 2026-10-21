# ============================================================
# Financial Fraud Detection System
# Fraud Alert Management Routes
# ============================================================

from typing import Optional
from fastapi import (
    APIRouter,
    Body,
    Depends,
    HTTPException,
    Path as FastAPIPath,
    Query,
    status,
)

from backend.config import logger
from backend.auth import verify_bearer_token
from backend.schemas import AlertStatusUpdate
from backend.alert_service import (
    get_all_alerts,
    get_alert,
    update_alert_status,
    delete_alert,
    get_alert_summary,
)

alert_router = APIRouter(tags=["Fraud Alert Management"])

# ------------------------------------------------------------
# Status Normalization Helper
# ------------------------------------------------------------

ALLOWED_ALERT_STATUSES = {
    "new": "New",
    "under review": "Under Review",
    "resolved": "Resolved",
}

def normalize_alert_status(value: str) -> str:
    normalized = value.strip().lower()
    status_value = ALLOWED_ALERT_STATUSES.get(normalized)

    if status_value is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Allowed values are New, Under Review, and Resolved.",
        )

    return status_value

# ------------------------------------------------------------
# Retrieve All Alerts
# ------------------------------------------------------------

@alert_router.get(
    "/alerts",
    summary="Retrieve fraud alerts",
    dependencies=[Depends(verify_bearer_token)],
)
def get_alerts(
    status_filter: Optional[str] = Query(
        None,
        alias="status",
        description="Filter by New, Under Review, or Resolved.",
    ),
):
    try:
        normalized_status = (
            normalize_alert_status(status_filter)
            if status_filter
            else None
        )

        alerts = get_all_alerts(status=normalized_status)

        return {
            "total_alerts": len(alerts),
            "alerts": alerts,
        }

    except HTTPException:
        raise

    except Exception:
        logger.exception("Failed to retrieve alerts.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve alerts.",
        )

# ------------------------------------------------------------
# Retrieve One Alert
# ------------------------------------------------------------

@alert_router.get(
    "/alerts/{alert_id}",
    summary="Retrieve one alert",
    dependencies=[Depends(verify_bearer_token)],
)
def get_single_alert(
    alert_id: int = FastAPIPath(
        ...,
        ge=1,
        description="Alert ID",
    ),
):
    try:
        alert = get_alert(alert_id)

        if alert is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found.",
            )

        return alert

    except HTTPException:
        raise

    except Exception:
        logger.exception("Failed to retrieve alert.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve the requested alert.",
        )

# ------------------------------------------------------------
# Update Alert Status
# ------------------------------------------------------------

@alert_router.put(
    "/alerts/{alert_id}/status",
    summary="Update alert status",
    dependencies=[Depends(verify_bearer_token)],
)
def change_alert_status(
    alert_id: int = FastAPIPath(
        ...,
        ge=1,
    ),
    payload: Optional[AlertStatusUpdate] = Body(
        default=None,
    ),
    status_query: Optional[str] = Query(
        None,
        alias="status",
    ),
):
    target_status = (
        payload.status if payload else None
    ) or status_query

    if not target_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide the new status in the request body.",
        )

    normalized_status = normalize_alert_status(target_status)

    try:
        result = update_alert_status(
            alert_id=alert_id,
            status=normalized_status,
        )

        if not result.get("updated", False):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found.",
            )

        return result

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )

    except Exception:
        logger.exception("Failed to update alert status.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update alert status.",
        )

# ------------------------------------------------------------
# Delete Alert
# ------------------------------------------------------------

@alert_router.delete(
    "/alerts/{alert_id}",
    summary="Delete an alert",
    dependencies=[Depends(verify_bearer_token)],
)
def remove_alert(
    alert_id: int = FastAPIPath(
        ...,
        ge=1,
    ),
):
    try:
        result = delete_alert(alert_id)

        if not result.get("deleted", False):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found.",
            )

        return result

    except HTTPException:
        raise

    except Exception:
        logger.exception("Failed to delete alert.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to delete alert.",
        )

# ------------------------------------------------------------
# Alert Summary
# ------------------------------------------------------------

@alert_router.get(
    "/alerts-summary",
    summary="Retrieve alert counts",
    dependencies=[Depends(verify_bearer_token)],
)
def alerts_summary():
    try:
        return get_alert_summary()
    except Exception:
        logger.exception("Failed to calculate alert summary.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve alert summary.",
        )
