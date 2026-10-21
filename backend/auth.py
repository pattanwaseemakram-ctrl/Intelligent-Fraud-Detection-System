# ============================================================
# Financial Fraud Detection System
# Authentication & Security Module
# ============================================================

import os
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import (
    OAuth2PasswordBearer,
    OAuth2PasswordRequestForm,
)

auth_router = APIRouter(tags=["Authentication & Security"])

# ------------------------------------------------------------
# OAuth2 Scheme Configuration
# ------------------------------------------------------------

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/token",
    scheme_name="bearerAuth",
    description="Enter the credentials configured for your application.",
)

# ------------------------------------------------------------
# User Credential Store (Local Development & Demo)
# ------------------------------------------------------------

USER_DATABASE = {
    "admin": {
        "password": os.getenv(
            "FRAUD_ADMIN_PASSWORD",
            "admin123",
        ),
        "role": "Chief Risk Officer",
    },
    "analyst": {
        "password": os.getenv(
            "FRAUD_ANALYST_PASSWORD",
            "analyst123",
        ),
        "role": "Fraud Investigation Analyst",
    },
}

# Optional static token for controlled integrations
STATIC_MASTER_TOKEN = os.getenv("FRAUD_API_TOKEN", "").strip()

# In-memory access-token registry
ACTIVE_TOKENS: dict[str, dict[str, str]] = {}

if STATIC_MASTER_TOKEN:
    ACTIVE_TOKENS[STATIC_MASTER_TOKEN] = {
        "username": "admin",
        "role": "Chief Risk Officer",
    }

# ------------------------------------------------------------
# Token Verification Dependency
# ------------------------------------------------------------

def verify_bearer_token(
    token: str = Depends(oauth2_scheme),
) -> dict[str, str]:
    """
    Validate an issued OAuth2 Bearer access token.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = ACTIVE_TOKENS.get(token)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user

# ------------------------------------------------------------
# Authentication Endpoints
# ------------------------------------------------------------

@auth_router.post(
    "/auth/token",
    summary="Obtain an access token",
)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    """
    Validate user credentials and issue a Bearer token.
    """
    user = USER_DATABASE.get(form_data.username)

    if (
        user is None
        or not secrets.compare_digest(
            user["password"],
            form_data.password,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = secrets.token_urlsafe(32)

    ACTIVE_TOKENS[access_token] = {
        "username": form_data.username,
        "role": user["role"],
    }

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_role": user["role"],
    }


@auth_router.post(
    "/token",
    include_in_schema=False,
)
def legacy_token_alias(
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    """Backward-compatible alias for the token endpoint."""
    return login_for_access_token(form_data)
