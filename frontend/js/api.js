/* =====================================================
   FINANCIAL FRAUD DETECTION SYSTEM
   API Client — Frontend to FastAPI Backend
===================================================== */

(() => {
    "use strict";

    // -------------------------------------------------
    // Configuration
    // -------------------------------------------------

    const API_BASE_URL = (
        window.FRAUD_API_BASE_URL || "http://127.0.0.1:8000"
    ).replace(/\/+$/, "");

    const TOKEN_KEY = "fraud_access_token";
    const ROLE_KEY = "fraud_user_role";

    // -------------------------------------------------
    // Authentication Storage
    // -------------------------------------------------

    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function getUserRole() {
        return localStorage.getItem(ROLE_KEY);
    }

    function isAuthenticated() {
        return Boolean(getToken());
    }

    function saveSession(authData) {
        if (!authData || !authData.access_token) {
            throw new Error("Login response did not contain an access token.");
        }

        localStorage.setItem(TOKEN_KEY, authData.access_token);

        if (authData.user_role) {
            localStorage.setItem(ROLE_KEY, authData.user_role);
        } else {
            localStorage.removeItem(ROLE_KEY);
        }
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ROLE_KEY);
    }

    // -------------------------------------------------
    // Response Processing
    // -------------------------------------------------

    async function parseResponse(response) {
        const text = await response.text();

        if (!text) {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }

    function getErrorMessage(data, status) {
        if (data && typeof data === "object") {
            if (typeof data.detail === "string") {
                return data.detail;
            }

            if (Array.isArray(data.detail)) {
                return data.detail
                    .map((item) => item.msg || "Invalid request")
                    .join("; ");
            }

            if (typeof data.message === "string") {
                return data.message;
            }
        }

        if (typeof data === "string" && data.trim()) {
            return data;
        }

        return `Request failed with status ${status}.`;
    }

    // -------------------------------------------------
    // Main API Request Function
    // -------------------------------------------------

    async function request(path, options = {}) {
        const {
            method = "GET",
            body,
            headers = {},
            auth = true,
            formEncoded = false,
            ...fetchOptions
        } = options;

        const requestHeaders = {
            Accept: "application/json",
            ...headers
        };

        // Attach the bearer token to protected requests.
        if (auth) {
            const token = getToken();

            if (token) {
                requestHeaders.Authorization = `Bearer ${token}`;
            }
        }

        let requestBody;

        if (body !== undefined && body !== null) {
            if (formEncoded) {
                requestHeaders["Content-Type"] =
                    "application/x-www-form-urlencoded";

                requestBody = body;
            } else if (
                typeof body === "string" ||
                body instanceof FormData
            ) {
                requestBody = body;
            } else {
                requestHeaders["Content-Type"] = "application/json";
                requestBody = JSON.stringify(body);
            }
        }

        let response;

        try {
            response = await fetch(`${API_BASE_URL}${path}`, {
                ...fetchOptions,
                method,
                headers: requestHeaders,
                body: requestBody
            });
        } catch (error) {
            if (error.name === "AbortError") {
                throw error;
            }

            throw new Error(
                "Unable to connect to the backend. " +
                "Check that the FastAPI server is running at " +
                `${API_BASE_URL}.`
            );
        }

        const data = await parseResponse(response);

        if (!response.ok) {
            // Remove an invalid session when the backend rejects it.
            if (response.status === 401 && auth) {
                clearSession();
            }

            throw new Error(
                getErrorMessage(data, response.status)
            );
        }

        return data;
    }

    // -------------------------------------------------
    // Authentication
    // POST /auth/token
    // -------------------------------------------------

    async function login(username, password) {
        const formData = new URLSearchParams();

        formData.append("username", username);
        formData.append("password", password);

        const response = await request("/auth/token", {
            method: "POST",
            body: formData.toString(),
            formEncoded: true,
            auth: false
        });

        saveSession(response);

        return response;
    }

    function logout() {
        clearSession();
    }

    // -------------------------------------------------
    // System Health
    // GET /health
    // -------------------------------------------------

    function getHealth() {
        return request("/health", {
            auth: false
        });
    }

    // -------------------------------------------------
    // Fraud Alerts
    // GET /alerts
    // -------------------------------------------------

    function getAlerts(filters = {}) {
        const params = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {
                params.set(key, String(value));
            }
        });

        const queryString = params.toString();

        const path = queryString
            ? `/alerts?${queryString}`
            : "/alerts";

        return request(path);
    }

    // -------------------------------------------------
    // Alert Summary
    // GET /alerts-summary
    // -------------------------------------------------

    function getAlertsSummary() {
        return request("/alerts-summary");
    }

    // -------------------------------------------------
    // Update Alert Status
    // PUT /alerts/{alert_id}/status
    // -------------------------------------------------

    function updateAlertStatus(alertId, status) {
        if (alertId === undefined || alertId === null) {
            throw new Error("An alert ID is required.");
        }

        if (!status || typeof status !== "string") {
            throw new Error("A valid alert status is required.");
        }

        return request(
            `/alerts/${encodeURIComponent(alertId)}/status`,
            {
                method: "PUT",
                body: { status }
            }
        );
    }

    // -------------------------------------------------
    // Delete Alert
    // DELETE /alerts/{alert_id}
    // -------------------------------------------------

    function deleteAlert(alertId) {
        if (alertId === undefined || alertId === null) {
            throw new Error("An alert ID is required.");
        }

        return request(
            `/alerts/${encodeURIComponent(alertId)}`,
            {
                method: "DELETE"
            }
        );
    }

    // -------------------------------------------------
    // Single Transaction Prediction
    // POST /predict
    // -------------------------------------------------

    function predictTransaction(transactionPayload) {
        if (
            !transactionPayload ||
            typeof transactionPayload !== "object"
        ) {
            throw new Error(
                "Transaction data must be provided as an object."
            );
        }

        return request("/predict", {
            method: "POST",
            body: transactionPayload
        });
    }

    // -------------------------------------------------
    // Batch Transaction Prediction
    // POST /batch-predict
    // -------------------------------------------------

    function batchPredict(batchPayload) {
        if (
            !batchPayload ||
            typeof batchPayload !== "object"
        ) {
            throw new Error(
                "Batch prediction data must be provided as an object."
            );
        }

        return request("/batch-predict", {
            method: "POST",
            body: batchPayload
        });
    }

    // -------------------------------------------------
    // Model Monitoring
    // GET /model/monitoring-stats
    // -------------------------------------------------

    function getMonitoringStats() {
        return request("/model/monitoring-stats");
    }

    // -------------------------------------------------
    // Public API
    // Other frontend JavaScript files can use FraudAPI.
    // -------------------------------------------------

    window.FraudAPI = Object.freeze({
        baseUrl: API_BASE_URL,

        request,

        login,
        logout,
        getToken,
        getUserRole,
        isAuthenticated,
        clearSession,

        getHealth,

        getAlerts,
        getAlertsSummary,
        updateAlertStatus,
        deleteAlert,

        predictTransaction,
        batchPredict,

        getMonitoringStats
    });

})();