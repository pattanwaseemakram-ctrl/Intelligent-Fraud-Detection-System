# ============================================================
# Financial Fraud Detection System
# Fraud Prediction Engine Routes
# ============================================================

import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.config import PROJECT_ROOT, logger
from backend.auth import verify_bearer_token
from backend.schemas import (
    TransactionRequest,
    PredictionResponse,
    BatchTransactionRequest,
    BatchPredictionResponse,
)
from backend.model_service import (
    predict_transaction,
    predict_batch,
)
from backend.alert_service import (
    create_alert,
    upsert_alerts_batch,
)

prediction_router = APIRouter(tags=["Fraud Prediction Engine"])

# ------------------------------------------------------------
# Sample Batch Data
# ------------------------------------------------------------

@prediction_router.get(
    "/sample-197-batch",
    summary="Retrieve the sample batch request",
)
def get_sample_197_batch():
    batch_file = (
        PROJECT_ROOT
        / "final_model"
        / "results"
        / "request_body_197_transactions.json"
    )

    if not batch_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sample batch file was not found.",
        )

    try:
        with batch_file.open("r", encoding="utf-8") as file:
            return json.load(file)
    except (OSError, json.JSONDecodeError):
        logger.exception("Failed to read the sample batch file.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load sample batch data.",
        )

# ------------------------------------------------------------
# Real-Time Single Transaction Prediction
# ------------------------------------------------------------

@prediction_router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Predict a single transaction",
    dependencies=[Depends(verify_bearer_token)],
)
def predict(
    transaction: TransactionRequest,
    threshold: Optional[float] = Query(
        None,
        ge=0.0,
        le=1.0,
        description="Optional decision threshold. Defaults to the configured model threshold.",
    ),
):
    """
    Predict one transaction.
    Suspicious predictions are sent to the alert service.
    """
    try:
        result = predict_transaction(
            transaction,
            threshold=threshold,
        )

        create_alert(
            transaction_id=result["transaction_id"],
            fraud_probability=result["fraud_probability"],
            prediction=result["prediction"],
            risk_score=result["risk_score"],
            risk_level=result["risk_level"],
        )

        return result

    except HTTPException:
        raise

    except Exception:
        logger.exception("Real-time transaction inference failed.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to process the transaction.",
        )

# ------------------------------------------------------------
# Batch Transaction Prediction
# ------------------------------------------------------------

@prediction_router.post(
    "/batch-predict",
    response_model=BatchPredictionResponse,
    summary="Predict multiple transactions",
    dependencies=[Depends(verify_bearer_token)],
)
def batch_predict(
    payload: BatchTransactionRequest,
    threshold: Optional[float] = Query(
        None,
        ge=0.0,
        le=1.0,
        description="Optional decision threshold. Defaults to the configured model threshold.",
    ),
):
    """
    Predict multiple transactions and store suspicious alerts.
    """
    try:
        result = predict_batch(
            payload.transactions,
            threshold=threshold,
        )

        predictions = result.get("predictions", [])

        if predictions:
            upsert_alerts_batch(predictions)

        return result

    except Exception:
        logger.exception("Batch prediction failed.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to process the transaction batch.",
        )
