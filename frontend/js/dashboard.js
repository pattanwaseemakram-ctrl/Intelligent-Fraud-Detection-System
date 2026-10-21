/* ============================================================
   FINANCIAL FRAUD DETECTION SYSTEM
   Dashboard Controller
   Frontend: Vanilla JavaScript
   Backend: FastAPI
============================================================ */

(() => {
    "use strict";

    // ========================================================
    // 1. CONFIGURATION AND STATE
    // ========================================================

    const API = window.FraudAPI;

    const state = {
        currentView: "overview",
        alerts: [],
        summary: {},
        health: null,
        selectedAlertId: null,
        loading: false,
        batchResponse: null
    };

    const VIEW_NAMES = {
        overview: "Overview",
        alerts: "Alert Management",
        prediction: "Fraud Prediction",
        analytics: "Analytics & Graphs"
    };

    const ALERT_STATUSES = [
        "New",
        "Under Review",
        "Resolved"
    ];


    // ========================================================
    // 2. DOM HELPERS
    // ========================================================

    function getElement(id) {
        return document.getElementById(id);
    }

    function setText(id, value) {
        const element = getElement(id);

        if (element) {
            element.textContent = value ?? "—";
        }
    }

    function setHTML(id, value) {
        const element = getElement(id);

        if (element) {
            element.innerHTML = value;
        }
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function toNumber(value, fallback = 0) {
        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : fallback;
    }

    function formatNumber(value) {
        return toNumber(value).toLocaleString("en-US");
    }

    function formatMoney(value) {
        return toNumber(value).toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        });
    }

    function normalizeProbability(value) {
        const probability = Number(value);

        if (!Number.isFinite(probability)) {
            return null;
        }

        // Support both fractional probabilities and percentages.
        const normalized = probability > 1
            ? probability / 100
            : probability;

        return Math.min(1, Math.max(0, normalized));
    }

    function formatProbability(value) {
        const probability = normalizeProbability(value);

        if (probability === null) {
            return "—";
        }

        return `${(probability * 100).toFixed(2)}%`;
    }

    function formatTimestamp(value) {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function getFirstValue(object, keys, fallback = undefined) {
        if (!object || typeof object !== "object") {
            return fallback;
        }

        for (const key of keys) {
            if (
                object[key] !== undefined &&
                object[key] !== null
            ) {
                return object[key];
            }
        }

        return fallback;
    }


    // ========================================================
    // 3. MESSAGES
    // ========================================================

    function showMessage(message, type = "info") {
        const element = getElement("dashboardMessage");

        if (!element) {
            return;
        }

        element.textContent = message;
        element.className = `dashboard-message ${type}`;

        element.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }

    function clearMessage() {
        const element = getElement("dashboardMessage");

        if (!element) {
            return;
        }

        element.textContent = "";
        element.className = "dashboard-message";
    }


    // ========================================================
    // 4. AUTHENTICATION
    // ========================================================

    function requireAuthentication() {
        if (!API || !API.isAuthenticated()) {
            window.location.replace(
                "login.html?next=dashboard.html"
            );

            return false;
        }

        return true;
    }

    function initializeUserInformation() {
        const role = API.getUserRole() || "Authenticated User";

        setText("userName", "Authenticated User");
        setText("userRole", role);

        const initials = role
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0].toUpperCase())
            .join("");

        setText(
            "userInitials",
            initials || "U"
        );
    }

    function handleLogout() {
        const confirmed = window.confirm(
            "Are you sure you want to sign out?"
        );

        if (!confirmed) {
            return;
        }

        API.logout();

        window.location.replace("login.html");
    }


    // ========================================================
    // 5. NAVIGATION
    // ========================================================

    function closeMobileSidebar() {
        getElement("dashboardSidebar")
            ?.classList.remove("is-open");

        getElement("sidebarOverlay")
            ?.classList.remove("is-visible");

        const toggle = getElement("sidebarToggle");

        if (toggle) {
            toggle.setAttribute("aria-expanded", "false");
        }
    }

    function toggleMobileSidebar() {
        const sidebar = getElement("dashboardSidebar");
        const overlay = getElement("sidebarOverlay");
        const toggle = getElement("sidebarToggle");

        if (!sidebar || !overlay) {
            return;
        }

        const isOpening = !sidebar.classList.contains("is-open");

        sidebar.classList.toggle("is-open", isOpening);
        overlay.classList.toggle("is-visible", isOpening);

        if (toggle) {
            toggle.setAttribute(
                "aria-expanded",
                String(isOpening)
            );
        }
    }

    function navigateTo(viewName) {
        if (!VIEW_NAMES[viewName]) {
            return;
        }

        state.currentView = viewName;

        // Switch visible sections.
        document.querySelectorAll("[data-view-panel]").forEach(
            (panel) => {
                const isActive =
                    panel.dataset.viewPanel === viewName;

                panel.hidden = !isActive;
                panel.classList.toggle("active", isActive);
            }
        );

        // Update the sidebar selection.
        document.querySelectorAll("[data-nav]").forEach(
            (button) => {
                const isActive =
                    button.dataset.nav === viewName;

                button.classList.toggle("active", isActive);

                if (isActive) {
                    button.setAttribute("aria-current", "page");
                } else {
                    button.removeAttribute("aria-current");
                }
            }
        );

        setText(
            "breadcrumbCurrent",
            VIEW_NAMES[viewName]
        );

        closeMobileSidebar();
        clearMessage();

        // Load relevant data when opening a section.
        if (viewName === "alerts") {
            loadAlerts();
        }

        if (viewName === "monitoring") {
            loadMonitoring();
        }

        if (viewName === "overview") {
            loadDashboardData();
        }

        if (viewName === "analytics") {
            renderAnalyticsGraphs();
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function initializeNavigation() {
        document.querySelectorAll("[data-nav]").forEach(
            (button) => {
                button.addEventListener("click", () => {
                    navigateTo(button.dataset.nav);
                });
            }
        );

        document.querySelectorAll("[data-open-view]").forEach(
            (button) => {
                button.addEventListener("click", () => {
                    navigateTo(button.dataset.openView);
                });
            }
        );

        getElement("sidebarToggle")
            ?.addEventListener("click", toggleMobileSidebar);

        getElement("sidebarOverlay")
            ?.addEventListener("click", closeMobileSidebar);

        getElement("logoutButton")
            ?.addEventListener("click", handleLogout);

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeMobileSidebar();
            }
        });
    }


    // ========================================================
    // 6. DATE AND FOOTER
    // ========================================================

    function initializeDateAndFooter() {
        const now = new Date();

        setText(
            "dashboardDate",
            now.toLocaleDateString("en-IN", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric"
            })
        );

        setText(
            "dashboardFooterYear",
            `© ${now.getFullYear()}`
        );
    }


    // ========================================================
    // 7. NORMALIZE API RESPONSES
    // ========================================================

    function normalizeAlertList(response) {
        if (Array.isArray(response)) {
            return response;
        }

        if (!response || typeof response !== "object") {
            return [];
        }

        const possibleLists = [
            response.alerts,
            response.items,
            response.results,
            response.data
        ];

        for (const list of possibleLists) {
            if (Array.isArray(list)) {
                return list;
            }

            if (list && Array.isArray(list.alerts)) {
                return list.alerts;
            }
        }

        return [];
    }

    function normalizeAlert(alert) {
        const probability = getFirstValue(alert, [
            "fraud_probability",
            "probability",
            "prediction_probability"
        ]);

        const riskScore = getFirstValue(alert, [
            "risk_score",
            "riskScore"
        ]);

        return {
            id: getFirstValue(alert, [
                "id",
                "alert_id",
                "alertId"
            ]),

            transactionId: getFirstValue(alert, [
                "transaction_id",
                "transactionId",
                "transaction"
            ], "Unknown transaction"),

            probability,
            riskScore,

            prediction: getFirstValue(alert, [
                "prediction",
                "predicted_label"
            ], "Suspicious"),

            riskLevel: getFirstValue(alert, [
                "risk_level",
                "riskLevel"
            ], "Unknown"),

            status: getFirstValue(alert, [
                "status",
                "alert_status"
            ], "New"),

            createdAt: getFirstValue(alert, [
                "created_at",
                "createdAt",
                "timestamp"
            ]),

            updatedAt: getFirstValue(alert, [
                "updated_at",
                "updatedAt"
            ]),

            raw: alert
        };
    }

    function getSummaryCount(summary, keys, fallback = 0) {
        const value = getFirstValue(summary, keys);

        return value === undefined
            ? fallback
            : toNumber(value, fallback);
    }

    function getAlertCounts() {
        const statuses = state.alerts.map(normalizeAlert);

        return {
            total: statuses.length,

            new: statuses.filter(
                (alert) => alert.status === "New"
            ).length,

            review: statuses.filter(
                (alert) => alert.status === "Under Review"
            ).length,

            resolved: statuses.filter(
                (alert) => alert.status === "Resolved"
            ).length
        };
    }

    function resolveSummaryCounts() {
        const fallback = getAlertCounts();
        const summary = state.summary || {};

        return {
            total: getSummaryCount(
                summary,
                ["total", "total_alerts", "total_count"],
                fallback.total
            ),

            new: getSummaryCount(
                summary,
                ["new", "new_alerts", "new_count"],
                fallback.new
            ),

            review: getSummaryCount(
                summary,
                [
                    "under_review",
                    "under_review_alerts",
                    "under_review_count"
                ],
                fallback.review
            ),

            resolved: getSummaryCount(
                summary,
                [
                    "resolved",
                    "resolved_alerts",
                    "resolved_count"
                ],
                fallback.resolved
            )
        };
    }


    // ========================================================
    // 8. FETCH ALERTS AND SUMMARY
    // ========================================================

    async function fetchAlerts() {
        const response = await API.getAlerts();

        state.alerts = normalizeAlertList(response);

        return state.alerts;
    }

    async function fetchSummary() {
        state.summary = await API.getAlertsSummary();

        if (
            !state.summary ||
            typeof state.summary !== "object"
        ) {
            state.summary = {};
        }

        return state.summary;
    }

    async function fetchHealth() {
        state.health = await API.getHealth();

        return state.health;
    }

    async function loadDashboardData() {
        if (!requireAuthentication()) {
            return;
        }

        const results = await Promise.allSettled([
            fetchHealth(),
            fetchAlerts(),
            fetchSummary()
        ]);

        if (!API.isAuthenticated()) {
            window.location.replace(
                "login.html?next=dashboard.html"
            );

            return;
        }

        const failures = results.filter(
            (result) => result.status === "rejected"
        );

        if (failures.length > 0) {
            console.error(
                "Some dashboard requests failed:",
                failures.map((item) => item.reason)
            );
        }

        renderOverview();
        renderSystemHealth();

        if (failures.length === results.length) {
            showMessage(
                "Unable to load dashboard data. Check the backend connection.",
                "error"
            );

            return;
        }

        if (failures.length > 0) {
            showMessage(
                "Some information could not be refreshed. Available data is displayed.",
                "info"
            );
        } else {
            clearMessage();
        }
    }


    // ========================================================
    // 9. ALERT SUMMARY DISPLAY
    // ========================================================

    function renderOverview() {
        const counts = resolveSummaryCounts();

        setText("statTotalAlerts", formatNumber(counts.total));
        setText("statNewAlerts", formatNumber(counts.new));
        setText("statUnderReviewAlerts", formatNumber(counts.review));
        setText("statResolvedAlerts", formatNumber(counts.resolved));

        setText("distributionNewCount", formatNumber(counts.new));
        setText("distributionReviewCount", formatNumber(counts.review));
        setText("distributionResolvedCount", formatNumber(counts.resolved));

        setText(
            "sidebarAlertCount",
            formatNumber(counts.new)
        );

        setText(
            "alertDistributionTotal",
            `${formatNumber(counts.total)} alerts`
        );

        const total = Math.max(counts.total, 0);

        const newPercent = total > 0
            ? (counts.new / total) * 100
            : 0;

        const reviewPercent = total > 0
            ? (counts.review / total) * 100
            : 0;

        const resolvedPercent = total > 0
            ? (counts.resolved / total) * 100
            : 0;

        updateBar("overviewNewBar", newPercent);
        updateBar("overviewReviewBar", reviewPercent);
        updateBar("overviewResolvedBar", resolvedPercent);

        renderRiskDistribution();
        renderRecentAlerts();
    }

    function updateBar(id, percentage) {
        const element = getElement(id);

        if (!element) {
            return;
        }

        const safePercentage = Math.min(
            100,
            Math.max(0, percentage)
        );

        element.style.width = `${safePercentage}%`;
    }

    function renderRiskDistribution() {
        const alerts = state.alerts.map(normalizeAlert);

        const counts = {
            high: 0,
            medium: 0,
            low: 0
        };

        alerts.forEach((alert) => {
            const level = String(alert.riskLevel).toLowerCase();

            if (level === "high") {
                counts.high += 1;
            } else if (level === "medium") {
                counts.medium += 1;
            } else if (level === "low") {
                counts.low += 1;
            }
        });

        setText("riskHighCount", formatNumber(counts.high));
        setText("riskMediumCount", formatNumber(counts.medium));
        setText("riskLowCount", formatNumber(counts.low));

        const total = alerts.length || 0;

        updateBar(
            "riskHighBar",
            total ? (counts.high / total) * 100 : 0
        );

        updateBar(
            "riskMediumBar",
            total ? (counts.medium / total) * 100 : 0
        );

        updateBar(
            "riskLowBar",
            total ? (counts.low / total) * 100 : 0
        );
    }


    // ========================================================
    // 10. ALERT BADGES AND TABLE ROWS
    // ========================================================

    function statusClass(status) {
        return String(status)
            .toLowerCase()
            .replace(/\s+/g, "-");
    }

    function predictionClass(prediction) {
        return String(prediction).toLowerCase() === "suspicious"
            ? "suspicious"
            : "normal";
    }

    function riskClass(level) {
        const normalized = String(level).toLowerCase();

        if (normalized === "high") {
            return "high";
        }

        if (normalized === "medium") {
            return "medium";
        }

        if (normalized === "low") {
            return "low";
        }

        return "";
    }

    function renderRecentAlerts() {
        const tbody = getElement("recentAlertsBody");

        if (!tbody) {
            return;
        }

        const sortedAlerts = state.alerts
            .map(normalizeAlert)
            .sort((a, b) => {
                const first = new Date(a.createdAt || 0).getTime();
                const second = new Date(b.createdAt || 0).getTime();

                return second - first;
            })
            .slice(0, 5);

        if (sortedAlerts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="table-empty">
                        No alert records were returned by the backend.
                    </td>
                </tr>
            `;

            setText(
                "recentAlertsCount",
                "No alert records available"
            );

            return;
        }

        tbody.innerHTML = sortedAlerts.map((alert) => {
            const probability = formatProbability(alert.probability);
            const riskClassName = riskClass(alert.riskLevel);

            return `
                <tr>
                    <td>
                        <span class="transaction-id">
                            ${escapeHTML(alert.transactionId)}
                        </span>
                    </td>

                    <td>
                        <span class="prediction-badge ${predictionClass(alert.prediction)}">
                            ${escapeHTML(alert.prediction)}
                        </span>
                    </td>

                    <td>
                        <span class="probability-value">
                            ${escapeHTML(probability)}
                        </span>
                    </td>

                    <td>
                        <span class="risk-badge ${riskClassName}">
                            ${escapeHTML(alert.riskLevel)}
                        </span>
                    </td>

                    <td>
                        <span class="status-badge ${statusClass(alert.status)}">
                            ${escapeHTML(alert.status)}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(formatTimestamp(alert.createdAt))}
                    </td>
                </tr>
            `;
        }).join("");

        setText(
            "recentAlertsCount",
            `Showing ${sortedAlerts.length} most recent alert records`
        );
    }


    // ========================================================
    // 11. ALERT MANAGEMENT TABLE
    // ========================================================

    function getFilteredAlerts() {
        const searchValue = (
            getElement("alertsSearchInput")?.value || ""
        ).trim().toLowerCase();

        const statusValue =
            getElement("alertsStatusFilter")?.value || "";

        return state.alerts
            .map(normalizeAlert)
            .filter((alert) => {
                const matchesSearch =
                    String(alert.transactionId)
                        .toLowerCase()
                        .includes(searchValue);

                const matchesStatus =
                    !statusValue ||
                    alert.status === statusValue;

                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => {
                const first = new Date(a.createdAt || 0).getTime();
                const second = new Date(b.createdAt || 0).getTime();

                return second - first;
            });
    }

    function renderAlertManagementSummary() {
        const counts = resolveSummaryCounts();

        setText("alertsPageTotal", formatNumber(counts.total));
        setText("alertsPageNew", formatNumber(counts.new));
        setText("alertsPageReview", formatNumber(counts.review));
        setText("alertsPageResolved", formatNumber(counts.resolved));

        setText(
            "sidebarAlertCount",
            formatNumber(counts.new)
        );
    }

    function renderAlertsTable() {
        const tbody = getElement("alertsTableBody");

        if (!tbody) {
            return;
        }

        const alerts = getFilteredAlerts();

        if (alerts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="table-empty">
                        No alerts match the selected filters.
                    </td>
                </tr>
            `;

            setText("alertsCountLabel", "No matching alerts");
            return;
        }

        tbody.innerHTML = alerts.map((alert) => {
            const id = escapeHTML(alert.id);
            const probability = formatProbability(alert.probability);

            const score = alert.riskScore === undefined
                || alert.riskScore === null
                ? "—"
                : toNumber(alert.riskScore).toFixed(2);

            const statusOptions = ALERT_STATUSES.map((status) => {
                const selected = alert.status === status
                    ? "selected"
                    : "";

                return `
                    <option value="${escapeHTML(status)}" ${selected}>
                        ${escapeHTML(status)}
                    </option>
                `;
            }).join("");

            return `
                <tr data-alert-row="${id}">
                    <td>
                        <span class="transaction-id">
                            #${id}
                        </span>
                    </td>

                    <td>
                        <span class="transaction-id">
                            ${escapeHTML(alert.transactionId)}
                        </span>
                    </td>

                    <td>
                        <span class="probability-value">
                            ${escapeHTML(probability)}
                        </span>
                    </td>

                    <td>
                        <span class="risk-score-value">
                            ${escapeHTML(score)}
                        </span>
                    </td>

                    <td>
                        <span class="risk-badge ${riskClass(alert.riskLevel)}">
                            ${escapeHTML(alert.riskLevel)}
                        </span>
                    </td>

                    <td>
                        <select
                            class="alert-status-select"
                            data-alert-status="${id}"
                            aria-label="Change status for alert ${id}"
                        >
                            ${statusOptions}
                        </select>
                    </td>

                    <td>
                        ${escapeHTML(formatTimestamp(alert.createdAt))}
                    </td>

                    <td>
                        <div class="alert-actions-cell">

                            <button
                                type="button"
                                class="table-action-button"
                                data-view-alert="${id}"
                            >
                                View
                            </button>

                            <button
                                type="button"
                                class="table-action-button delete"
                                data-delete-alert="${id}"
                            >
                                Delete
                            </button>

                        </div>
                    </td>
                </tr>
            `;
        }).join("");

        setText(
            "alertsCountLabel",
            `Showing ${alerts.length} of ${state.alerts.length} alert records`
        );
    }

    async function loadAlerts() {
        if (!requireAuthentication()) {
            return;
        }

        const tbody = getElement("alertsTableBody");

        if (tbody && state.alerts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="table-empty">
                        <span class="table-loading-indicator"></span>
                        Loading alert records...
                    </td>
                </tr>
            `;
        }

        try {
            const results = await Promise.allSettled([
                fetchAlerts(),
                fetchSummary()
            ]);

            if (!API.isAuthenticated()) {
                window.location.replace("login.html");
                return;
            }

            const failed = results.some(
                (result) => result.status === "rejected"
            );

            renderAlertManagementSummary();
            renderAlertsTable();
            renderOverview();

            if (failed) {
                showMessage(
                    "Some alert information could not be refreshed.",
                    "error"
                );
            } else {
                clearMessage();
            }

        } catch (error) {
            console.error("Unable to load alerts:", error);

            showMessage(
                error.message || "Unable to load alerts.",
                "error"
            );
        }
    }


    // ========================================================
    // 12. CHANGE ALERT STATUS
    // ========================================================

    async function handleAlertStatusChange(event) {
        const select = event.target.closest(
            "[data-alert-status]"
        );

        if (!select) {
            return;
        }

        const alertId = select.dataset.alertStatus;
        const newStatus = select.value;

        if (!ALERT_STATUSES.includes(newStatus)) {
            showMessage("Invalid alert status.", "error");
            return;
        }

        select.disabled = true;

        try {
            await API.updateAlertStatus(alertId, newStatus);

            showMessage(
                `Alert #${alertId} status changed to ${newStatus}.`,
                "success"
            );

            await Promise.allSettled([
                fetchAlerts(),
                fetchSummary()
            ]);

            renderOverview();
            renderAlertsTable();
            renderAlertManagementSummary();

        } catch (error) {
            console.error("Failed to update alert:", error);

            showMessage(
                error.message || "Unable to update alert status.",
                "error"
            );

            await loadAlerts();

        } finally {
            select.disabled = false;
        }
    }


    // ========================================================
    // 13. DELETE ALERT
    // ========================================================

    async function handleDeleteAlert(alertId) {
        const alert = state.alerts
            .map(normalizeAlert)
            .find((item) => String(item.id) === String(alertId));

        const transactionId = alert
            ? alert.transactionId
            : `#${alertId}`;

        const confirmed = window.confirm(
            `Delete alert ${transactionId}?\n\n` +
            "This removes the alert record from the backend."
        );

        if (!confirmed) {
            return;
        }

        try {
            await API.deleteAlert(alertId);

            showMessage(
                `Alert ${transactionId} was deleted.`,
                "success"
            );

            if (
                String(state.selectedAlertId) === String(alertId)
            ) {
                closeAlertDetails();
            }

            await Promise.allSettled([
                fetchAlerts(),
                fetchSummary()
            ]);

            renderOverview();
            renderAlertsTable();
            renderAlertManagementSummary();

        } catch (error) {
            console.error("Unable to delete alert:", error);

            showMessage(
                error.message || "Unable to delete alert.",
                "error"
            );
        }
    }


    // ========================================================
    // 14. ALERT DETAILS
    // ========================================================

    async function showAlertDetails(alertId) {
        const panel = getElement("alertDetailsPanel");
        const content = getElement("alertDetailsContent");

        if (!panel || !content) {
            return;
        }

        state.selectedAlertId = alertId;

        panel.hidden = false;

        content.textContent = "Loading alert details...";

        try {
            const response = await API.request(
                `/alerts/${encodeURIComponent(alertId)}`
            );

            const alert = response?.alert || response?.data || response;

            const normalized = normalizeAlert(alert);

            const values = [
                ["Alert ID", normalized.id],
                ["Transaction ID", normalized.transactionId],
                ["Prediction", normalized.prediction],
                [
                    "Fraud Probability",
                    formatProbability(normalized.probability)
                ],
                ["Risk Score", normalized.riskScore],
                ["Risk Level", normalized.riskLevel],
                ["Status", normalized.status],
                ["Created At", formatTimestamp(normalized.createdAt)],
                ["Updated At", formatTimestamp(normalized.updatedAt)]
            ];

            content.innerHTML = `
                <div class="alert-details-grid">
                    ${values.map(([label, value]) => `
                        <div class="alert-detail-item">
                            <span>${escapeHTML(label)}</span>
                            <strong>${escapeHTML(value ?? "—")}</strong>
                        </div>
                    `).join("")}
                </div>
            `;

            panel.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        } catch (error) {
            console.error("Unable to get alert details:", error);

            content.textContent =
                error.message || "Unable to retrieve alert details.";
        }
    }

    function closeAlertDetails() {
        const panel = getElement("alertDetailsPanel");

        if (panel) {
            panel.hidden = true;
        }

        state.selectedAlertId = null;
    }

    function initializeAlertActions() {
        getElement("alertsTableBody")
            ?.addEventListener("change", handleAlertStatusChange);

        getElement("alertsTableBody")
            ?.addEventListener("click", (event) => {
                const viewButton = event.target.closest(
                    "[data-view-alert]"
                );

                if (viewButton) {
                    showAlertDetails(
                        viewButton.dataset.viewAlert
                    );

                    return;
                }

                const deleteButton = event.target.closest(
                    "[data-delete-alert]"
                );

                if (deleteButton) {
                    handleDeleteAlert(
                        deleteButton.dataset.deleteAlert
                    );
                }
            });

        getElement("alertsSearchInput")
            ?.addEventListener("input", renderAlertsTable);

        getElement("alertsStatusFilter")
            ?.addEventListener("change", renderAlertsTable);

        getElement("closeAlertDetailsButton")
            ?.addEventListener("click", closeAlertDetails);

        getElement("refreshAlertsButton")
            ?.addEventListener("click", loadAlerts);
    }


    // ========================================================
    // 15. HEALTH AND MONITORING
    // ========================================================

    function isHealthyValue(value) {
        if (value === true) {
            return true;
        }

        if (value === false || value === null || value === undefined) {
            return false;
        }

        const normalized = String(value).toLowerCase();

        return [
            "healthy",
            "connected",
            "online",
            "ready",
            "ok",
            "true",
            "up"
        ].includes(normalized);
    }

    function getDatabaseHealth(health) {
        const database = health?.database;

        if (typeof database === "string") {
            return database;
        }

        if (database && typeof database === "object") {
            return getFirstValue(database, [
                "status",
                "state"
            ], database.connected === true ? "connected" : "unknown");
        }

        return "unknown";
    }

    function setMonitoringStatus(
        valueId,
        detailId,
        isOnline,
        value,
        detail
    ) {
        const valueElement = getElement(valueId);
        const detailElement = getElement(detailId);

        if (valueElement) {
            valueElement.textContent = value;

            valueElement.classList.remove(
                "status-online",
                "status-offline",
                "status-unknown"
            );

            valueElement.classList.add(
                isOnline ? "status-online" : "status-offline"
            );
        }

        if (detailElement) {
            detailElement.textContent = detail;

            const footer = detailElement.closest(
                ".monitoring-card-footer"
            );

            if (footer) {
                footer.classList.remove(
                    "status-online",
                    "status-offline",
                    "status-unknown"
                );

                footer.classList.add(
                    isOnline ? "status-online" : "status-offline"
                );
            }
        }
    }

    function renderSystemHealth() {
        const health = state.health;

        if (!health || typeof health !== "object") {
            setText(
                "sidebarSystemStatus",
                "Status unavailable"
            );

            setText(
                "systemHealthText",
                "Unknown status"
            );

            return;
        }

        const apiStatus = getFirstValue(
            health,
            ["status", "api_status"],
            "unknown"
        );

        const databaseStatus = getDatabaseHealth(health);

        const modelLoaded = getFirstValue(
            health,
            ["model_loaded", "modelLoaded"],
            false
        );

        const apiOnline = isHealthyValue(apiStatus);
        const databaseOnline = isHealthyValue(databaseStatus);
        const modelOnline = modelLoaded === true ||
            isHealthyValue(modelLoaded);

        const allHealthy =
            apiOnline &&
            databaseOnline &&
            modelOnline;

        setText(
            "sidebarSystemStatus",
            allHealthy
                ? "All systems operational"
                : "Service attention required"
        );

        setText(
            "systemHealthText",
            allHealthy
                ? "All systems healthy"
                : "Check service status"
        );

        setMonitoringStatus(
            "monitoringApiStatus",
            "monitoringApiDetail",
            apiOnline,
            apiOnline ? "Online" : "Unavailable",
            `API status: ${apiStatus}`
        );

        setMonitoringStatus(
            "monitoringDatabaseStatus",
            "monitoringDatabaseDetail",
            databaseOnline,
            databaseOnline ? "Connected" : "Unavailable",
            `Database status: ${databaseStatus}`
        );

        setMonitoringStatus(
            "monitoringModelStatus",
            "monitoringModelDetail",
            modelOnline,
            modelOnline ? "Loaded" : "Unavailable",
            `Model loaded: ${modelOnline ? "Yes" : "No"}`
        );

        const threshold = getFirstValue(
            health,
            ["threshold", "calibrated_threshold", "decision_threshold"],
            null
        );

        setText(
            "monitoringThreshold",
            threshold === null
                ? "Not reported"
                : toNumber(threshold).toFixed(2)
        );

        // Keep the topbar status visually consistent.
        const badge = getElement("systemHealthBadge");

        if (badge) {
            badge.classList.toggle("status-offline", !allHealthy);
        }
    }

    function renderMonitoringSummary() {
        const counts = resolveSummaryCounts();

        setText("monitoringTotalAlerts", formatNumber(counts.total));
        setText("monitoringNewAlerts", formatNumber(counts.new));
        setText("monitoringReviewAlerts", formatNumber(counts.review));
        setText("monitoringResolvedAlerts", formatNumber(counts.resolved));
    }

    async function loadMonitoring() {
        if (!requireAuthentication()) {
            return;
        }

        const results = await Promise.allSettled([
            fetchHealth(),
            fetchAlerts(),
            fetchSummary()
        ]);

        if (!API.isAuthenticated()) {
            window.location.replace("login.html");
            return;
        }

        renderSystemHealth();
        renderMonitoringSummary();

        const failures = results.filter(
            (result) => result.status === "rejected"
        );

        if (failures.length > 0) {
            console.error(
                "Monitoring refresh errors:",
                failures.map((item) => item.reason)
            );

            showMessage(
                "Some monitoring information could not be refreshed.",
                "error"
            );
        } else {
            clearMessage();
        }
    }


    // ========================================================
    // 16. TRANSACTION FORM HELPERS
    // ========================================================

    function initializeTransactionForm() {
        const timestampInput = getElement("transactionTimestamp");

        if (timestampInput && !timestampInput.value) {
            const now = new Date();

            now.setMinutes(
                now.getMinutes() - now.getTimezoneOffset()
            );

            timestampInput.value = now
                .toISOString()
                .slice(0, 16);
        }

        getElement("transactionPredictionForm")
            ?.addEventListener("submit", handlePredictionSubmit);

        getElement("resetPredictionFormButton")
            ?.addEventListener("click", () => {
                resetPredictionResult();
            });

        getElement("newPredictionButton")
            ?.addEventListener("click", () => {
                resetPredictionResult();

                getElement("predictTransactionId")?.focus();
            });

        initializeInputClearButtons();
    }

    function initializeInputClearButtons() {
        const wrappers = document.querySelectorAll(".input-clearable-wrapper");

        wrappers.forEach((wrapper) => {
            const input = wrapper.querySelector("input");
            const btn = wrapper.querySelector(".input-clear-btn");
            if (!input || !btn) return;

            const updateVisibility = () => {
                if (input.value && String(input.value).trim().length > 0) {
                    btn.classList.add("is-visible");
                } else {
                    btn.classList.remove("is-visible");
                }
            };

            // Initial visibility check
            updateVisibility();

            // Listen for typing and value updates
            input.addEventListener("input", updateVisibility);
            input.addEventListener("change", updateVisibility);

            // Wrong icon click handler: clears already written input
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                input.value = "";
                btn.classList.remove("is-visible");

                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));

                input.focus();
            });
        });

        // Ensure clear buttons update when the form is reset
        const resetBtn = getElement("resetPredictionFormButton");
        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                setTimeout(() => {
                    wrappers.forEach((wrapper) => {
                        const input = wrapper.querySelector("input");
                        const btn = wrapper.querySelector(".input-clear-btn");
                        if (!input || !btn) return;
                        if (input.value && String(input.value).trim().length > 0) {
                            btn.classList.add("is-visible");
                        } else {
                            btn.classList.remove("is-visible");
                        }
                    });
                }, 60);
            });
        }
    }

    function buildTransactionPayload(form) {
        const formData = new FormData(form);

        const requiredFields = [
            "transaction_id",
            "timestamp",
            "sender_account_id",
            "receiver_account_id",
            "amount",
            "type",
            "device_id",
            "ip_address",
            "location",
            "account_balance",
            "user_device_recognition",
            "known_threat_flag",
            "login_location_match",
            "spending_pattern_deviation"
        ];

        for (const field of requiredFields) {
            const value = formData.get(field);

            if (value === null || String(value).trim() === "") {
                throw new Error(
                    `Please fill in the ${field.replace(/_/g, " ")} field.`
                );
            }
        }

        const timestamp = new Date(
            String(formData.get("timestamp"))
        );

        if (Number.isNaN(timestamp.getTime())) {
            throw new Error("Please enter a valid transaction timestamp.");
        }

        const amount = Number(formData.get("amount"));
        const balance = Number(formData.get("account_balance"));
        const deviation = Number(
            formData.get("spending_pattern_deviation")
        );

        if (
            !Number.isFinite(amount) ||
            !Number.isFinite(balance) ||
            !Number.isFinite(deviation) ||
            amount < 0 ||
            balance < 0 ||
            deviation < 0
        ) {
            throw new Error(
                "Amounts, balance, and deviation must be valid non-negative numbers."
            );
        }

        return {
            transaction_id: String(
                formData.get("transaction_id")
            ).trim(),

            timestamp: timestamp.toISOString(),

            sender_account_id: String(
                formData.get("sender_account_id")
            ).trim(),

            receiver_account_id: String(
                formData.get("receiver_account_id")
            ).trim(),

            amount,

            type: String(formData.get("type")),

            device_id: String(
                formData.get("device_id")
            ).trim(),

            ip_address: String(
                formData.get("ip_address")
            ).trim(),

            location: String(
                formData.get("location")
            ).trim(),

            account_balance: balance,

            user_device_recognition: Number(
                formData.get("user_device_recognition")
            ),

            known_threat_flag: Number(
                formData.get("known_threat_flag")
            ),

            login_location_match: Number(
                formData.get("login_location_match")
            ),

            spending_pattern_deviation: deviation
        };
    }


    // ========================================================
    // 17. RUN SINGLE TRANSACTION PREDICTION
    // ========================================================

    function setPredictionLoading(isLoading) {
        const button = getElement("runPredictionButton");
        const text = getElement("runPredictionButtonText");

        if (button) {
            button.disabled = isLoading;
            button.setAttribute(
                "aria-busy",
                String(isLoading)
            );
        }

        if (text) {
            text.textContent = isLoading
                ? "Analyzing Transaction..."
                : "Run Fraud Analysis";
        }
    }

    function resetPredictionResult() {
        const placeholder = getElement(
            "predictionResultPlaceholder"
        );

        const content = getElement(
            "predictionResultContent"
        );

        if (placeholder) {
            placeholder.hidden = false;
        }

        if (content) {
            content.hidden = true;
        }

        setText("predictionLabel", "—");
        setText("predictionProbability", "—");
        setText("predictionRiskScore", "—");
        setText("predictionRiskLevel", "—");
        setText("predictionTransactionId", "—");

        const bar = getElement("predictionProbabilityBar");

        if (bar) {
            bar.style.width = "0%";
        }

        const note = getElement("predictionAlertNote");

        if (note) {
            note.textContent = "";
            note.className = "prediction-alert-note";
        }
    }

    function renderPredictionResult(response, submittedPayload) {
        const placeholder = getElement(
            "predictionResultPlaceholder"
        );

        const content = getElement(
            "predictionResultContent"
        );

        if (placeholder) {
            placeholder.hidden = true;
        }

        if (content) {
            content.hidden = false;
        }

        const prediction = getFirstValue(
            response,
            ["prediction", "predicted_label", "label"],
            "Unknown"
        );

        const probability = getFirstValue(
            response,
            ["fraud_probability", "probability", "prediction_probability"],
            null
        );

        const riskScore = getFirstValue(
            response,
            ["risk_score", "riskScore"],
            probability === null
                ? null
                : normalizeProbability(probability) * 100
        );

        const riskLevel = getFirstValue(
            response,
            ["risk_level", "riskLevel"],
            "Not reported"
        );

        const transactionId = getFirstValue(
            response,
            ["transaction_id", "transactionId"],
            submittedPayload.transaction_id
        );

        const percentage = normalizeProbability(probability);

        setText("predictionLabel", prediction);
        setText(
            "predictionProbability",
            formatProbability(probability)
        );

        setText(
            "predictionRiskScore",
            riskScore === null
                ? "—"
                : toNumber(riskScore).toFixed(2)
        );

        setText("predictionRiskLevel", riskLevel);
        setText("predictionTransactionId", transactionId);

        const label = getElement("predictionLabel");

        if (label) {
            label.className =
                "prediction-label " +
                predictionClass(prediction);
        }

        const bar = getElement("predictionProbabilityBar");

        if (bar) {
            bar.style.width = `${
                percentage === null ? 0 : percentage * 100
            }%`;
        }

        const note = getElement("predictionAlertNote");

        if (note) {
            note.className = "prediction-alert-note";

            if (
                String(prediction).toLowerCase() === "suspicious"
            ) {
                note.classList.add("warning");

                note.textContent =
                    "The model flagged this transaction as Suspicious. " +
                    "Check Alert Management for a corresponding stored alert.";
            } else if (
                String(prediction).toLowerCase() === "normal"
            ) {
                note.classList.add("success");

                note.textContent =
                    "The model classified this transaction as Normal " +
                    "according to the backend's configured decision rule.";
            } else {
                note.textContent =
                    "Prediction received. Review the returned values.";
            }
        }
    }

    async function handlePredictionSubmit(event) {
        event.preventDefault();

        if (!requireAuthentication()) {
            return;
        }

        clearMessage();

        const form = getElement("transactionPredictionForm");

        if (!form) {
            return;
        }

        let payload;

        try {
            payload = buildTransactionPayload(form);
        } catch (error) {
            showMessage(error.message, "error");
            return;
        }

        setPredictionLoading(true);

        try {
            const response = await API.predictTransaction(payload);

            renderPredictionResult(response, payload);

            showMessage(
                "Transaction prediction completed successfully.",
                "success"
            );

            // Refresh alert information after a prediction.
            await Promise.allSettled([
                fetchAlerts(),
                fetchSummary()
            ]);

            renderOverview();

        } catch (error) {
            console.error("Prediction request failed:", error);

            showMessage(
                error.message || "Unable to predict this transaction.",
                "error"
            );

        } finally {
            setPredictionLoading(false);
        }
    }


    // ========================================================
    // 18. BATCH ANALYSIS
    // ========================================================

    function initializeBatchAnalysis() {
        getElement("batchPredictionForm")
            ?.addEventListener("submit", handleBatchSubmit);

        getElement("formatBatchJsonButton")
            ?.addEventListener("click", formatBatchJSON);

        getElement("clearBatchPayloadButton")
            ?.addEventListener("click", clearBatchPayload);

        getElement("copyBatchResponseButton")
            ?.addEventListener("click", copyBatchResponse);
    }

    function formatBatchJSON() {
        const textarea = getElement("batchPayload");

        if (!textarea) {
            return;
        }

        try {
            const data = JSON.parse(textarea.value);

            textarea.value = JSON.stringify(data, null, 2);

            showMessage("Batch JSON formatted successfully.", "success");

        } catch (error) {
            showMessage(
                `Invalid JSON: ${error.message}`,
                "error"
            );
        }
    }

    function clearBatchPayload() {
        const textarea = getElement("batchPayload");

        if (textarea) {
            textarea.value = "";
        }

        state.batchResponse = null;

        const result = getElement("batchPredictionResult");

        if (result) {
            result.textContent =
                "Submit a batch to display the API response.";
        }

        getElement("batchResultPlaceholder").hidden = false;
        getElement("batchResultContent").hidden = true;

        const copyButton = getElement("copyBatchResponseButton");

        if (copyButton) {
            copyButton.disabled = true;
        }

        clearMessage();
    }

    function setBatchLoading(isLoading) {
        const button = getElement("runBatchPredictionButton");

        const text = getElement("batchPredictionButtonText");

        if (button) {
            button.disabled = isLoading;
            button.setAttribute(
                "aria-busy",
                String(isLoading)
            );
        }

        if (text) {
            text.textContent = isLoading
                ? "Analyzing Batch..."
                : "Run Batch Analysis";
        }
    }

    function extractBatchCounts(response, submittedCount) {
        const results = Array.isArray(response?.results)
            ? response.results
            : Array.isArray(response?.predictions)
                ? response.predictions
                : [];

        const total = getFirstValue(
            response,
            [
                "total_transactions",
                "total",
                "transactions_processed",
                "processed_count"
            ],
            submittedCount
        );

        const suspicious = getFirstValue(
            response,
            [
                "suspicious_count",
                "suspicious_transactions",
                "flagged_count"
            ],
            results.filter(
                (item) =>
                    String(item.prediction).toLowerCase() === "suspicious"
            ).length
        );

        const normal = getFirstValue(
            response,
            [
                "normal_count",
                "normal_transactions"
            ],
            results.filter(
                (item) =>
                    String(item.prediction).toLowerCase() === "normal"
            ).length
        );

        return {
            total: toNumber(total, submittedCount),
            suspicious: toNumber(suspicious),
            normal: toNumber(normal)
        };
    }

    function renderBatchResponse(response, submittedCount) {
        state.batchResponse = response;

        const placeholder = getElement(
            "batchResultPlaceholder"
        );

        const content = getElement(
            "batchResultContent"
        );

        if (placeholder) {
            placeholder.hidden = true;
        }

        if (content) {
            content.hidden = false;
        }

        const counts = extractBatchCounts(
            response,
            submittedCount
        );

        setText(
            "batchTotalTransactions",
            formatNumber(counts.total)
        );

        setText(
            "batchSuspiciousCount",
            formatNumber(counts.suspicious)
        );

        setText(
            "batchNormalCount",
            formatNumber(counts.normal)
        );

        const resultsElement = getElement(
            "batchPredictionResult"
        );

        if (resultsElement) {
            resultsElement.textContent =
                JSON.stringify(response, null, 2);
        }

        const copyButton = getElement(
            "copyBatchResponseButton"
        );

        if (copyButton) {
            copyButton.disabled = false;
        }

        const message = getElement("batchResultsMessage");

        if (message) {
            message.textContent =
                `The API returned a response for ${counts.total} transactions. ` +
                `${counts.suspicious} were classified as Suspicious and ` +
                `${counts.normal} as Normal, according to the returned summary.`;
        }

        const messageByClass = getElement("batchResultContent")
            ?.querySelector(".batch-results-message");

        if (messageByClass) {
            messageByClass.textContent =
                `Processed: ${counts.total} · ` +
                `Suspicious: ${counts.suspicious} · ` +
                `Normal: ${counts.normal}`;
        }
    }

    async function handleBatchSubmit(event) {
        event.preventDefault();

        if (!requireAuthentication()) {
            return;
        }

        clearMessage();

        const textarea = getElement("batchPayload");

        if (!textarea) {
            return;
        }

        let payload;

        try {
            payload = JSON.parse(textarea.value);

            if (
                !payload ||
                typeof payload !== "object" ||
                Array.isArray(payload)
            ) {
                throw new Error(
                    "The JSON body must be an object."
                );
            }

            if (!Array.isArray(payload.transactions)) {
                throw new Error(
                    'The request must include a "transactions" array.'
                );
            }

            if (payload.transactions.length === 0) {
                throw new Error(
                    "The transactions array cannot be empty."
                );
            }

        } catch (error) {
            showMessage(
                `Please check the batch JSON. ${error.message}`,
                "error"
            );

            return;
        }

        setBatchLoading(true);

        try {
            const response = await API.batchPredict(payload);

            renderBatchResponse(
                response,
                payload.transactions.length
            );

            showMessage(
                "Batch prediction completed successfully.",
                "success"
            );

            await Promise.allSettled([
                fetchAlerts(),
                fetchSummary()
            ]);

            renderOverview();

        } catch (error) {
            console.error("Batch prediction failed:", error);

            showMessage(
                error.message || "Unable to process this batch.",
                "error"
            );

            const resultsElement = getElement(
                "batchPredictionResult"
            );

            if (resultsElement) {
                resultsElement.textContent = JSON.stringify({
                    error: error.message
                }, null, 2);
            }

        } finally {
            setBatchLoading(false);
        }
    }

    async function copyBatchResponse() {
        if (state.batchResponse === null) {
            return;
        }

        try {
            await navigator.clipboard.writeText(
                JSON.stringify(state.batchResponse, null, 2)
            );

            showMessage(
                "Batch response copied to clipboard.",
                "success"
            );

        } catch (error) {
            console.error("Clipboard access failed:", error);

            showMessage(
                "Unable to copy the response. Select and copy the JSON manually.",
                "error"
            );
        }
    }


    // ========================================================
    // 19. REFRESH BUTTONS
    // ========================================================

    function initializeRefreshButtons() {
        getElement("refreshDashboardButton")
            ?.addEventListener("click", loadDashboardData);

        getElement("refreshMonitoringButton")
            ?.addEventListener("click", loadMonitoring);
    }


    // ========================================================
    // 19B. INTERACTIVE ANALYTICS & MACHINE LEARNING GRAPHS
    // ========================================================

    const THRESHOLD_BENCHMARKS = [
        { threshold: 0.05, accuracy: 0.9460, precision: 0.6513, recall: 0.9900, f1: 0.7857, f2: 0.8967, tn: 1694, fp: 106, fn: 2, tp: 198, fpr: 0.0589 },
        { threshold: 0.10, accuracy: 0.9570, precision: 0.7021, recall: 0.9900, f1: 0.8216, f2: 0.9150, tn: 1716, fp: 84, fn: 2, tp: 198, fpr: 0.0467 },
        { threshold: 0.15, accuracy: 0.9660, precision: 0.7500, recall: 0.9900, f1: 0.8534, f2: 0.9305, tn: 1734, fp: 66, fn: 2, tp: 198, fpr: 0.0367 },
        { threshold: 0.20, accuracy: 0.9685, precision: 0.7645, recall: 0.9900, f1: 0.8627, f2: 0.9348, tn: 1739, fp: 61, fn: 2, tp: 198, fpr: 0.0339 },
        { threshold: 0.25, accuracy: 0.9710, precision: 0.7795, recall: 0.9900, f1: 0.8722, f2: 0.9393, tn: 1744, fp: 56, fn: 2, tp: 198, fpr: 0.0311 },
        { threshold: 0.30, accuracy: 0.9740, precision: 0.7984, recall: 0.9900, f1: 0.8839, f2: 0.9447, tn: 1750, fp: 50, fn: 2, tp: 198, fpr: 0.0278 },
        { threshold: 0.35, accuracy: 0.9785, precision: 0.8285, recall: 0.9900, f1: 0.9021, f2: 0.9528, tn: 1759, fp: 41, fn: 2, tp: 198, fpr: 0.0228 },
        { threshold: 0.40, accuracy: 0.9805, precision: 0.8455, recall: 0.9850, f1: 0.9099, f2: 0.9535, tn: 1764, fp: 36, fn: 3, tp: 197, fpr: 0.0200 },
        { threshold: 0.42, accuracy: 0.9805, precision: 0.8455, recall: 0.9850, f1: 0.9099, f2: 0.9535, tn: 1764, fp: 36, fn: 3, tp: 197, fpr: 0.0200 },
        { threshold: 0.45, accuracy: 0.9820, precision: 0.8628, recall: 0.9750, f1: 0.9155, f2: 0.9503, tn: 1769, fp: 31, fn: 5, tp: 195, fpr: 0.0172 },
        { threshold: 0.50, accuracy: 0.9830, precision: 0.8739, recall: 0.9700, f1: 0.9194, f2: 0.9491, tn: 1772, fp: 28, fn: 6, tp: 194, fpr: 0.0156 },
        { threshold: 0.55, accuracy: 0.9825, precision: 0.8873, recall: 0.9450, f1: 0.9153, f2: 0.9329, tn: 1776, fp: 24, fn: 11, tp: 189, fpr: 0.0133 },
        { threshold: 0.60, accuracy: 0.9815, precision: 0.8900, recall: 0.9300, f1: 0.9095, f2: 0.9217, tn: 1777, fp: 23, fn: 14, tp: 186, fpr: 0.0128 },
        { threshold: 0.65, accuracy: 0.9820, precision: 0.9059, recall: 0.9150, f1: 0.9104, f2: 0.9132, tn: 1781, fp: 19, fn: 17, tp: 183, fpr: 0.0106 },
        { threshold: 0.70, accuracy: 0.9845, precision: 0.9289, recall: 0.9150, f1: 0.9219, f2: 0.9178, tn: 1786, fp: 14, fn: 17, tp: 183, fpr: 0.0078 },
        { threshold: 0.75, accuracy: 0.9845, precision: 0.9333, recall: 0.9100, f1: 0.9215, f2: 0.9146, tn: 1787, fp: 13, fn: 18, tp: 182, fpr: 0.0072 },
        { threshold: 0.80, accuracy: 0.9815, precision: 0.9312, recall: 0.8800, f1: 0.9049, f2: 0.8898, tn: 1787, fp: 13, fn: 24, tp: 176, fpr: 0.0072 },
        { threshold: 0.85, accuracy: 0.9780, precision: 0.9333, recall: 0.8400, f1: 0.8842, f2: 0.8571, tn: 1788, fp: 12, fn: 32, tp: 168, fpr: 0.0067 },
        { threshold: 0.90, accuracy: 0.9755, precision: 0.9467, recall: 0.8000, f1: 0.8672, f2: 0.8256, tn: 1791, fp: 9, fn: 40, tp: 160, fpr: 0.0050 },
        { threshold: 0.95, accuracy: 0.9740, precision: 0.9684, recall: 0.7650, f1: 0.8547, f2: 0.7985, tn: 1795, fp: 5, fn: 47, tp: 153, fpr: 0.0028 }
    ];

    let currentAnalyticsThreshold = 0.42;

    function getMetricsForThreshold(th) {
        th = Number(th);
        if (Number.isNaN(th)) th = 0.42;

        if (th <= THRESHOLD_BENCHMARKS[0].threshold) {
            return { ...THRESHOLD_BENCHMARKS[0] };
        }

        const last = THRESHOLD_BENCHMARKS[THRESHOLD_BENCHMARKS.length - 1];
        if (th >= last.threshold) {
            return { ...last };
        }

        for (let i = 0; i < THRESHOLD_BENCHMARKS.length - 1; i++) {
            const a = THRESHOLD_BENCHMARKS[i];
            const b = THRESHOLD_BENCHMARKS[i + 1];

            if (th >= a.threshold && th <= b.threshold) {
                const span = b.threshold - a.threshold;
                const ratio = span > 0 ? (th - a.threshold) / span : 0;

                return {
                    threshold: th,
                    accuracy: a.accuracy + (b.accuracy - a.accuracy) * ratio,
                    precision: a.precision + (b.precision - a.precision) * ratio,
                    recall: a.recall + (b.recall - a.recall) * ratio,
                    f1: a.f1 + (b.f1 - a.f1) * ratio,
                    f2: a.f2 + (b.f2 - a.f2) * ratio,
                    fpr: a.fpr + (b.fpr - a.fpr) * ratio,
                    tn: Math.round(a.tn + (b.tn - a.tn) * ratio),
                    fp: Math.round(a.fp + (b.fp - a.fp) * ratio),
                    fn: Math.round(a.fn + (b.fn - a.fn) * ratio),
                    tp: Math.round(a.tp + (b.tp - a.tp) * ratio)
                };
            }
        }

        return { ...THRESHOLD_BENCHMARKS[8] };
    }

    function applyAnalyticsThreshold(th, updateSlider = true) {
        currentAnalyticsThreshold = Number(th);
        const m = getMetricsForThreshold(currentAnalyticsThreshold);

        // Update Slider
        const slider = getElement("analyticsThresholdSlider");
        if (slider && updateSlider) {
            slider.value = currentAnalyticsThreshold;
        }

        // Update Display Text
        setText("interactiveThresholdVal", currentAnalyticsThreshold.toFixed(2));

        // Update Preset Buttons Active State
        document.querySelectorAll("[data-preset-th]").forEach((btn) => {
            const targetTh = Number(btn.dataset.presetTh);
            btn.classList.toggle("active", Math.abs(targetTh - currentAnalyticsThreshold) < 0.015);
        });

        // Top Status Badge
        const badge = getElement("analyticsThresholdBadge");
        if (badge) {
            if (Math.abs(currentAnalyticsThreshold - 0.42) < 0.015) {
                badge.textContent = "OPTIMIZED THRESHOLD: 0.42";
                badge.style.color = "var(--dash-emerald)";
                badge.style.borderColor = "rgba(27, 197, 163, 0.35)";
            } else {
                badge.textContent = `SIMULATED THRESHOLD: ${currentAnalyticsThreshold.toFixed(2)}`;
                badge.style.color = "var(--dash-copper)";
                badge.style.borderColor = "rgba(217, 155, 98, 0.35)";
            }
        }

        // Top KPI Cards
        setText("analyticsKpiAccuracy", `${(m.accuracy * 100).toFixed(2)}%`);
        setText("analyticsKpiAccuracyDesc", `${(m.tn + m.tp).toLocaleString()} of 2,000 correctly classified`);

        setText("analyticsKpiRecall", `${(m.recall * 100).toFixed(2)}%`);
        setText("analyticsKpiRecallDesc", `${m.tp} / 200 Caught · ${m.fn} Missed`);

        setText("analyticsKpiPrecision", `${(m.precision * 100).toFixed(2)}%`);
        setText("analyticsKpiPrecisionDesc", `${m.fp} False Positives out of 1,800 normal`);

        setText("analyticsKpiF2Desc", `PR-AUC: 0.9712 · Peak F2: ${m.f2.toFixed(4)}`);

        // ROC Curve Operating Point Update
        // Origin: X = 65, Y = 285; Width = 520, Height = 250
        const rocX = 65 + m.fpr * 520;
        const rocY = 285 - m.recall * 250;

        const rocDot = getElement("rocOperatingDot");
        const rocPulse = getElement("rocOperatingPulse");
        const rocGuideX = getElement("rocGuideX");
        const rocGuideY = getElement("rocGuideY");
        const rocCalloutTitle = getElement("rocCalloutTitle");
        const rocCalloutDesc = getElement("rocCalloutDesc");

        if (rocDot) {
            rocDot.setAttribute("cx", String(rocX));
            rocDot.setAttribute("cy", String(rocY));
        }
        if (rocPulse) {
            rocPulse.setAttribute("cx", String(rocX));
            rocPulse.setAttribute("cy", String(rocY));
        }
        if (rocGuideX) {
            rocGuideX.setAttribute("x1", String(rocX));
            rocGuideX.setAttribute("y1", String(rocY));
            rocGuideX.setAttribute("x2", String(rocX));
        }
        if (rocGuideY) {
            rocGuideY.setAttribute("x1", String(rocX));
            rocGuideY.setAttribute("y1", String(rocY));
            rocGuideY.setAttribute("y2", String(rocY));
        }
        if (rocCalloutTitle) {
            rocCalloutTitle.textContent = Math.abs(currentAnalyticsThreshold - 0.42) < 0.015
                ? "★ OPTIMAL POINT: THRESHOLD 0.42"
                : `OPERATING POINT: THRESHOLD ${currentAnalyticsThreshold.toFixed(2)}`;
        }
        if (rocCalloutDesc) {
            rocCalloutDesc.textContent = `Recall (TPR): ${(m.recall * 100).toFixed(1)}% · FPR: ${(m.fpr * 100).toFixed(2)}%`;
        }

        // Precision-Recall Curve Operating Point Update
        const prX = 65 + m.recall * 520;
        const prY = 285 - m.precision * 250;

        const prDot = getElement("prOperatingDot");
        const prPulse = getElement("prOperatingPulse");
        const prGuideX = getElement("prGuideX");
        const prGuideY = getElement("prGuideY");
        const prCalloutTitle = getElement("prCalloutTitle");
        const prCalloutDesc = getElement("prCalloutDesc");

        if (prDot) {
            prDot.setAttribute("cx", String(prX));
            prDot.setAttribute("cy", String(prY));
        }
        if (prPulse) {
            prPulse.setAttribute("cx", String(prX));
            prPulse.setAttribute("cy", String(prY));
        }
        if (prGuideX) {
            prGuideX.setAttribute("x1", String(prX));
            prGuideX.setAttribute("y1", String(prY));
            prGuideX.setAttribute("x2", String(prX));
        }
        if (prGuideY) {
            prGuideY.setAttribute("x1", String(prX));
            prGuideY.setAttribute("y1", String(prY));
            prGuideY.setAttribute("y2", String(prY));
        }
        if (prCalloutTitle) {
            prCalloutTitle.textContent = Math.abs(currentAnalyticsThreshold - 0.42) < 0.015
                ? "★ CALIBRATED POINT: THRESHOLD 0.42"
                : `SIMULATED POINT: THRESHOLD ${currentAnalyticsThreshold.toFixed(2)}`;
        }
        if (prCalloutDesc) {
            prCalloutDesc.textContent = `Precision: ${(m.precision * 100).toFixed(1)}% · Recall: ${(m.recall * 100).toFixed(1)}%`;
        }

        // Threshold Tuning Curve Update
        const thCursorX = 65 + currentAnalyticsThreshold * 520;
        const thYRecall = 285 - Math.max(0, m.recall - 0.50) * 500;
        const thYPrecision = 285 - Math.max(0, m.precision - 0.50) * 500;
        const thYF2 = 285 - Math.max(0, m.f2 - 0.50) * 500;

        const thLine = getElement("thCursorLine");
        const thDotRec = getElement("thRecallDot");
        const thDotPrec = getElement("thPrecisionDot");
        const thDotF2 = getElement("thF2Dot");
        const thCallTitle = getElement("thCalloutTitle");
        const thCallDesc = getElement("thCalloutDesc");

        if (thLine) {
            thLine.setAttribute("x1", String(thCursorX));
            thLine.setAttribute("x2", String(thCursorX));
        }
        if (thDotRec) {
            thDotRec.setAttribute("cx", String(thCursorX));
            thDotRec.setAttribute("cy", String(thYRecall));
        }
        if (thDotPrec) {
            thDotPrec.setAttribute("cx", String(thCursorX));
            thDotPrec.setAttribute("cy", String(thYPrecision));
        }
        if (thDotF2) {
            thDotF2.setAttribute("cx", String(thCursorX));
            thDotF2.setAttribute("cy", String(thYF2));
        }
        if (thCallTitle) {
            thCallTitle.textContent = Math.abs(currentAnalyticsThreshold - 0.42) < 0.015
                ? "★ PEAK F2 THRESHOLD: 0.42"
                : `SELECTED THRESHOLD: ${currentAnalyticsThreshold.toFixed(2)}`;
        }
        if (thCallDesc) {
            thCallDesc.textContent = `F2: ${m.f2.toFixed(4)} · Caught: ${m.tp}/200 · Missed: ${m.fn} Frauds · FP: ${m.fp}`;
        }

        // Confusion Matrix Values Update
        setText("cmTnCount", m.tn.toLocaleString());
        setText("cmFpCount", m.fp.toLocaleString());
        setText("cmFnCount", m.fn.toLocaleString());
        setText("cmTpCount", m.tp.toLocaleString());

        setText("cmTnPct", `${((m.tn / 1800) * 100).toFixed(1)}% of Normal · Legitimate Approved`);
        setText("cmFpPct", `${((m.fp / 1800) * 100).toFixed(1)}% False Alarms (${m.fp} of 1,800)`);
        setText("cmFnPct", `${((m.fn / 200) * 100).toFixed(1)}% Missed (${m.fn} of 200 Frauds)`);
        setText("cmTpPct", `${((m.tp / 200) * 100).toFixed(1)}% Caught (${m.tp} of 200 Frauds)`);

        setText("cmSummarySpecificity", `${((m.tn / 1800) * 100).toFixed(2)}%`);
        setText("cmSummaryRecall", `${(m.recall * 100).toFixed(2)}%`);
        setText("cmSummaryPrecision", `${(m.precision * 100).toFixed(2)}%`);
        setText("cmSummaryAccuracy", `${(m.accuracy * 100).toFixed(2)}%`);

        // Financial Impact Callout
        const impTitle = getElement("analyticsImpactTitle");
        const impDesc = getElement("analyticsImpactDesc");
        if (impTitle && impDesc) {
            if (Math.abs(currentAnalyticsThreshold - 0.42) < 0.015) {
                impTitle.textContent = "50% Reduction in Undetected Fraud Losses";
                impDesc.textContent = "Calibrating to threshold 0.42 intercepts 3 additional high-value fraud transactions (197 caught vs. 194 at 0.50) with minimal review overhead (+8 FP in 1,800 normal cases).";
            } else if (currentAnalyticsThreshold < 0.42) {
                impTitle.textContent = `High-Sensitivity Catch Mode (Threshold ${currentAnalyticsThreshold.toFixed(2)})`;
                impDesc.textContent = `Prioritizing maximum safety (${m.tp} of 200 frauds intercepted), but increases verification overhead with ${m.fp} false positive alerts.`;
            } else {
                impTitle.textContent = `Conservative Cut-Off Mode (Threshold ${currentAnalyticsThreshold.toFixed(2)})`;
                impDesc.textContent = `Minimizes false alarms (${m.fp} FP), but allows ${m.fn} fraudulent transactions to slip through undetected, risking significant direct financial loss.`;
            }
        }
    }

    function setupGraphHoverInteraction(svgId, overlayId, hoverGroupId, onHover) {
        const svg = getElement(svgId);
        const overlay = getElement(overlayId);
        const hoverGroup = getElement(hoverGroupId);

        if (!svg || !overlay || !hoverGroup) return;

        overlay.addEventListener("mousemove", (e) => {
            const rect = svg.getBoundingClientRect();
            const relX = (e.clientX - rect.left) * (620 / rect.width);
            const relY = (e.clientY - rect.top) * (340 / rect.height);

            if (relX >= 65 && relX <= 585 && relY >= 35 && relY <= 285) {
                hoverGroup.style.display = "inline";
                onHover(relX, relY);
            } else {
                hoverGroup.style.display = "none";
            }
        });

        overlay.addEventListener("mouseleave", () => {
            hoverGroup.style.display = "none";
        });
    }

    function initializeAnalyticsGraphs() {
        const slider = getElement("analyticsThresholdSlider");
        if (slider) {
            slider.addEventListener("input", (e) => {
                applyAnalyticsThreshold(e.target.value, false);
            });
        }

        // Preset buttons
        document.querySelectorAll("[data-preset-th]").forEach((btn) => {
            btn.addEventListener("click", () => {
                applyAnalyticsThreshold(Number(btn.dataset.presetTh), true);
            });
        });

        // Setup ROC Hover
        setupGraphHoverInteraction("rocSvg", "rocInteractiveOverlay", "rocHoverGroup", (x) => {
            const fpr = Math.max(0, Math.min(1, (x - 65) / 520));
            const m = THRESHOLD_BENCHMARKS.find((row) => row.fpr >= fpr) || THRESHOLD_BENCHMARKS[0];

            const line = getElement("rocHoverLineX");
            const dot = getElement("rocHoverDot");
            const box = getElement("rocHoverBox");
            const t1 = getElement("rocHoverText1");
            const t2 = getElement("rocHoverText2");

            const dotY = 285 - m.recall * 250;
            if (line) {
                line.setAttribute("x1", String(x));
                line.setAttribute("x2", String(x));
            }
            if (dot) {
                dot.setAttribute("cx", String(x));
                dot.setAttribute("cy", String(dotY));
            }
            if (box) {
                const boxX = x > 440 ? x - 150 : x + 10;
                box.setAttribute("transform", `translate(${boxX}, ${Math.max(40, dotY - 20)})`);
            }
            if (t1) t1.textContent = `FPR: ${(fpr * 100).toFixed(1)}%`;
            if (t2) t2.textContent = `Recall: ${(m.recall * 100).toFixed(1)}%`;
        });

        // Setup PR Hover
        setupGraphHoverInteraction("prSvg", "prInteractiveOverlay", "prHoverGroup", (x) => {
            const recall = Math.max(0, Math.min(1, (x - 65) / 520));
            const m = THRESHOLD_BENCHMARKS.find((row) => row.recall <= recall) || THRESHOLD_BENCHMARKS[THRESHOLD_BENCHMARKS.length - 1];

            const line = getElement("prHoverLineX");
            const dot = getElement("prHoverDot");
            const box = getElement("prHoverBox");
            const t1 = getElement("prHoverText1");
            const t2 = getElement("prHoverText2");

            const dotY = 285 - m.precision * 250;
            if (line) {
                line.setAttribute("x1", String(x));
                line.setAttribute("x2", String(x));
            }
            if (dot) {
                dot.setAttribute("cx", String(x));
                dot.setAttribute("cy", String(dotY));
            }
            if (box) {
                const boxX = x > 440 ? x - 150 : x + 10;
                box.setAttribute("transform", `translate(${boxX}, ${Math.max(40, dotY - 20)})`);
            }
            if (t1) t1.textContent = `Recall: ${(recall * 100).toFixed(1)}%`;
            if (t2) t2.textContent = `Precision: ${(m.precision * 100).toFixed(1)}%`;
        });

        // Setup Threshold Hover & Click
        setupGraphHoverInteraction("thSvg", "thInteractiveOverlay", "thHoverGroup", (x) => {
            const th = Math.max(0.05, Math.min(0.95, (x - 65) / 520));
            const m = getMetricsForThreshold(th);

            const line = getElement("thHoverLine");
            const box = getElement("thHoverBox");
            const t1 = getElement("thHoverText1");
            const t2 = getElement("thHoverText2");
            const t3 = getElement("thHoverText3");

            if (line) {
                line.setAttribute("x1", String(x));
                line.setAttribute("x2", String(x));
            }
            if (box) {
                const boxX = x > 430 ? x - 165 : x + 10;
                box.setAttribute("transform", `translate(${boxX}, 60)`);
            }
            if (t1) t1.textContent = `Threshold: ${th.toFixed(2)}`;
            if (t2) t2.textContent = `Recall: ${(m.recall * 100).toFixed(1)}%`;
            if (t3) t3.textContent = `Prec: ${(m.precision * 100).toFixed(1)}% · F2: ${m.f2.toFixed(4)}`;
        });

        // Click on Threshold Curve directly sets threshold
        const thOverlay = getElement("thInteractiveOverlay");
        if (thOverlay) {
            thOverlay.addEventListener("click", (e) => {
                const rect = getElement("thSvg").getBoundingClientRect();
                const relX = (e.clientX - rect.left) * (620 / rect.width);
                if (relX >= 65 && relX <= 585) {
                    const th = Math.max(0.05, Math.min(0.95, (relX - 65) / 520));
                    applyAnalyticsThreshold(th, true);
                }
            });
        }

        // Clickable Confusion Matrix Cells
        const CM_DESCRIPTIONS = {
            tn: {
                title: "True Negatives (TN) · Legitimate Transactions Approved",
                desc: "1,764 normal banking activities correctly processed without triggering false alarm holds. Ensures friction-free customer experience for 98.0% of genuine users."
            },
            fp: {
                title: "False Positives (FP) · Low-Risk Verification Alarms",
                desc: "Only 36 normal transactions flagged for analyst security review. Keeps investigator caseload minimal (2.0% false alarm rate) while ensuring high-fidelity surveillance."
            },
            fn: {
                title: "False Negatives (FN) · Undetected Frauds (Minimized)",
                desc: "Only 3 fraudulent transactions slipped past the model. Optimized threshold 0.42 successfully cut missed fraud incidents by 50% down from 6 at default threshold."
            },
            tp: {
                title: "True Positives (TP) · Intercepted Fraudulent Attacks",
                desc: "197 confirmed fraud attempts intercepted and halted before fund disbursement. High-risk vectors (wire transfers, night logins) flagged with 98.5% recall."
            }
        };

        document.querySelectorAll("[data-cm-type]").forEach((cell) => {
            cell.addEventListener("click", () => {
                document.querySelectorAll("[data-cm-type]").forEach((c) => c.classList.remove("active-cell"));
                cell.classList.add("active-cell");

                const type = cell.dataset.cmType;
                const info = CM_DESCRIPTIONS[type];
                const drawer = getElement("cmCellInspector");
                const title = getElement("cmInspectorTitle");
                const desc = getElement("cmInspectorDesc");

                if (drawer && info) {
                    drawer.style.display = "block";
                    if (title) title.textContent = info.title;
                    if (desc) desc.textContent = info.desc;
                }
            });
        });

        getElement("cmInspectorClose")?.addEventListener("click", () => {
            const drawer = getElement("cmCellInspector");
            if (drawer) drawer.style.display = "none";
            document.querySelectorAll("[data-cm-type]").forEach((c) => c.classList.remove("active-cell"));
        });

        // Initialize at 0.42
        applyAnalyticsThreshold(0.42, true);
    }

    function renderAnalyticsGraphs() {
        applyAnalyticsThreshold(currentAnalyticsThreshold, true);
    }

    function initializeThemeToggle() {
        const THEME_KEY = "fraudguard_theme";
        const toggleBtn = getElement("themeToggleBtn");
        const toggleIcon = getElement("themeToggleIcon");
        const toggleLabel = getElement("themeToggleLabel");

        const AVAILABLE_THEMES = [
            { id: "pearl-coral",  name: "Pearl Coral",   icon: "🪸", badge: "Warm FinTech Light" },
            { id: "arctic-mint",  name: "Arctic Mint",   icon: "🌿", badge: "Fresh Mint Light" },
            { id: "lavender-ice", name: "Lavender Ice",  icon: "🪻", badge: "Premium Violet Light" },
            { id: "glacier-blue", name: "Glacier Blue",  icon: "🧊", badge: "Ocean Glacier Light" },
            { id: "dark",         name: "Charcoal Dark", icon: "🌙", badge: "Charcoal Dark" }
        ];

        function resolveTheme(rawId) {
            if (!rawId || rawId === "light") return AVAILABLE_THEMES[0];
            const match = AVAILABLE_THEMES.find(t => t.id === rawId);
            return match || AVAILABLE_THEMES[0];
        }

        function updateThemeUI(themeId) {
            const theme = resolveTheme(themeId);
            document.documentElement.setAttribute("data-theme", theme.id);
            if (document.body) {
                document.body.setAttribute("data-theme", theme.id);
            }

            const currentIndex = AVAILABLE_THEMES.findIndex(t => t.id === theme.id);
            const nextTheme = AVAILABLE_THEMES[(currentIndex + 1) % AVAILABLE_THEMES.length];

            if (toggleIcon) {
                toggleIcon.textContent = theme.icon;
            }
            if (toggleLabel) {
                toggleLabel.textContent = theme.name;
            }
            if (toggleBtn) {
                toggleBtn.setAttribute(
                    "title",
                    `Current Theme: ${theme.name} (${theme.badge}). Click to switch to ${nextTheme.name} ${nextTheme.icon}`
                );
                toggleBtn.setAttribute("aria-label", `Current theme ${theme.name}. Switch to ${nextTheme.name}`);
            }

            // Refresh charts if rendered
            if (typeof renderAnalyticsGraphs === "function") {
                renderAnalyticsGraphs();
            }
        }

        const savedTheme = localStorage.getItem(THEME_KEY) || "pearl-coral";
        updateThemeUI(savedTheme);

        if (toggleBtn) {
            toggleBtn.addEventListener("click", () => {
                const activeId = document.documentElement.getAttribute("data-theme") || "pearl-coral";
                const currentTheme = resolveTheme(activeId);
                const currentIndex = AVAILABLE_THEMES.findIndex(t => t.id === currentTheme.id);
                const nextTheme = AVAILABLE_THEMES[(currentIndex + 1) % AVAILABLE_THEMES.length];

                localStorage.setItem(THEME_KEY, nextTheme.id);
                updateThemeUI(nextTheme.id);
            });
        }
    }


    // ========================================================
    // 20. INITIALIZATION
    // ========================================================

    async function initializeDashboard() {
        // The HTML must load api.js before dashboard.js.
        if (!API) {
            console.error(
                "FraudAPI is unavailable. Check the script order."
            );

            showMessage(
                "The API client could not be loaded. Refresh the page.",
                "error"
            );

            return;
        }

        if (!requireAuthentication()) {
            return;
        }

        initializeThemeToggle();
        initializeDateAndFooter();
        initializeUserInformation();

        initializeNavigation();
        initializeAlertActions();
        initializeTransactionForm();
        initializeBatchAnalysis();
        initializeRefreshButtons();
        initializeAnalyticsGraphs();

        navigateTo("overview");

        await loadDashboardData();
    }


    // ========================================================
    // 21. START APPLICATION
    // ========================================================

    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboard,
        { once: true }
    );

})();