/* ============================================================
   FINANCIAL FRAUD DETECTION SYSTEM
   Landing Page JavaScript

   Responsibilities:
   1. Mobile navigation
   2. Smooth navigation and active links
   3. Scroll reveal animations
   4. Live FastAPI, PostgreSQL, and ML model status
   5. Automatic footer year
   ============================================================ */

"use strict";


/* ============================================================
   1. CONFIGURATION
   ============================================================ */

// Support the frontend running through VS Code Live Server
// or through the FastAPI application.

const API_BASE =
    window.location.protocol === "file:" ||
    window.location.port === "5500"
        ? "http://127.0.0.1:8000"
        : window.location.origin;


/* ============================================================
   2. DOM HELPERS
   ============================================================ */

function getElement(id) {
    return document.getElementById(id);
}


/* ============================================================
   3. LIVE STATUS DISPLAY
   ============================================================ */

function updateStatusElement(elementId, label, state = "unknown") {
    const element = getElement(elementId);

    if (!element) {
        return;
    }

    element.textContent = label;

    element.classList.remove(
        "service-online",
        "service-offline",
        "service-unknown"
    );

    const stateClasses = {
        online: "service-online",
        offline: "service-offline",
        unknown: "service-unknown"
    };

    element.classList.add(
        stateClasses[state] || stateClasses.unknown
    );
}


/* ============================================================
   4. FETCH FASTAPI HEALTH INFORMATION
   ============================================================ */

async function refreshSystemStatus() {
    const apiElement = getElement("apiStatus");
    const databaseElement = getElement("databaseStatus");
    const modelElement = getElement("modelStatus");
    const thresholdElement = getElement("decisionThreshold");

    // Avoid errors if the status strip is not present.
    if (
        !apiElement ||
        !databaseElement ||
        !modelElement ||
        !thresholdElement
    ) {
        return;
    }

    try {
        const controller = new AbortController();

        const timeoutId = window.setTimeout(
            () => controller.abort(),
            5000
        );

        let response;

        try {
            response = await fetch(`${API_BASE}/health`, {
                method: "GET",
                headers: {
                    Accept: "application/json"
                },
                signal: controller.signal,
                cache: "no-store"
            });
        } finally {
            window.clearTimeout(timeoutId);
        }

        if (!response.ok) {
            throw new Error(
                `Health endpoint returned HTTP ${response.status}`
            );
        }

        const health = await response.json();

        // FastAPI status
        updateStatusElement(
            "apiStatus",
            health.status === "healthy" ? "Online" : "Degraded",
            health.status === "healthy" ? "online" : "unknown"
        );

        // PostgreSQL status
        const database = health.database || {};

        const databaseConnected =
            database.status === "connected";

        updateStatusElement(
            "databaseStatus",
            databaseConnected ? "Connected" : "Disconnected",
            databaseConnected ? "online" : "offline"
        );

        // Machine learning model status
        const modelLoaded = health.model_loaded === true;

        updateStatusElement(
            "modelStatus",
            modelLoaded ? "Loaded" : "Not Loaded",
            modelLoaded ? "online" : "offline"
        );

        // Model decision threshold
        const threshold = Number(
            health.threshold ??
            health.calibrated_threshold
        );

        thresholdElement.textContent =
            Number.isFinite(threshold)
                ? threshold.toFixed(2)
                : "--";

        thresholdElement.classList.remove(
            "service-online",
            "service-offline",
            "service-unknown"
        );

        thresholdElement.classList.add(
            Number.isFinite(threshold)
                ? "service-online"
                : "service-unknown"
        );

    } catch (error) {
        console.error(
            "Unable to retrieve system health:",
            error
        );

        updateStatusElement(
            "apiStatus",
            "Offline",
            "offline"
        );

        updateStatusElement(
            "databaseStatus",
            "Unavailable",
            "unknown"
        );

        updateStatusElement(
            "modelStatus",
            "Unavailable",
            "unknown"
        );

        thresholdElement.textContent = "--";
        thresholdElement.classList.remove(
            "service-online",
            "service-offline"
        );
        thresholdElement.classList.add("service-unknown");
    }
}


/* ============================================================
   5. MOBILE NAVIGATION
   ============================================================ */

function initializeMobileNavigation() {
    const menuButton = getElement("mobileMenuButton");
    const navigation = getElement("mainNavigation");

    if (!menuButton || !navigation) {
        return;
    }

    function closeMenu() {
        navigation.classList.remove("menu-open");
        menuButton.classList.remove("is-open");

        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );

        menuButton.setAttribute(
            "aria-label",
            "Open navigation menu"
        );
    }

    function toggleMenu() {
        const isOpen =
            navigation.classList.toggle("menu-open");

        menuButton.classList.toggle(
            "is-open",
            isOpen
        );

        menuButton.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        menuButton.setAttribute(
            "aria-label",
            isOpen
                ? "Close navigation menu"
                : "Open navigation menu"
        );
    }

    menuButton.addEventListener(
        "click",
        toggleMenu
    );

    // Close the menu after the user selects a link.
    navigation.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", closeMenu);
    });

    // Close the menu when Escape is pressed.
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeMenu();
        }
    });

    // Close the mobile menu when returning to desktop width.
    window.addEventListener("resize", () => {
        if (window.innerWidth > 850) {
            closeMenu();
        }
    });
}


/* ============================================================
   6. SCROLL REVEAL ANIMATIONS
   ============================================================ */

function initializeRevealAnimations() {
    const revealElements = document.querySelectorAll(
        ".reveal"
    );

    if (!revealElements.length) {
        return;
    }

    // Respect the visitor's accessibility preferences.
    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (
        reducedMotion ||
        !("IntersectionObserver" in window)
    ) {
        revealElements.forEach(element => {
            element.classList.add("is-visible");
        });

        return;
    }

    // CSS enables hidden reveal states only after this class
    // is added, so the page remains visible if JS is disabled.
    document.body.classList.add("motion-ready");

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add(
                        "is-visible"
                    );

                    observer.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.08,
            rootMargin: "0px 0px -35px 0px"
        }
    );

    revealElements.forEach(element => {
        observer.observe(element);
    });
}


/* ============================================================
   7. ACTIVE NAVIGATION LINKS
   ============================================================ */

function initializeActiveNavigation() {
    const sections = document.querySelectorAll(
        "main section[id]"
    );

    const navigationLinks = document.querySelectorAll(
        '.main-navigation a[href^="#"]'
    );

    if (!sections.length || !navigationLinks.length) {
        return;
    }

    function setActiveLink(sectionId) {
        navigationLinks.forEach(link => {
            const isActive =
                link.getAttribute("href") === `#${sectionId}`;

            link.classList.toggle(
                "active",
                isActive
            );
        });
    }

    const sectionObserver = new IntersectionObserver(
        entries => {
            const visibleSections = entries
                .filter(entry => entry.isIntersecting)
                .sort(
                    (a, b) =>
                        b.intersectionRatio -
                        a.intersectionRatio
                );

            if (visibleSections.length) {
                setActiveLink(
                    visibleSections[0].target.id
                );
            }
        },
        {
            rootMargin: "-18% 0px -65% 0px",
            threshold: [0, 0.1, 0.25, 0.5]
        }
    );

    sections.forEach(section => {
        sectionObserver.observe(section);
    });

    // Ensure Home is active at the top of the page.
    if (window.scrollY < 100) {
        setActiveLink("home");
    }
}


/* ============================================================
   8. FOOTER YEAR
   ============================================================ */

function initializeFooter() {
    const yearElement = getElement("currentYear");

    if (yearElement) {
        yearElement.textContent =
            new Date().getFullYear();
    }
}


/* ============================================================
   9. STATUS AUTO-REFRESH
   ============================================================ */

function initializeStatusRefresh() {
    // Fetch immediately when the page opens.
    refreshSystemStatus();

    // Refresh periodically while the page is visible.
    window.setInterval(() => {
        if (!document.hidden) {
            refreshSystemStatus();
        }
    }, 30000);

    // Refresh when the visitor returns to the page.
    document.addEventListener(
        "visibilitychange",
        () => {
            if (!document.hidden) {
                refreshSystemStatus();
            }
        }
    );
}


/* ============================================================
   10. THEME TOGGLE (1 BUTTON — CYCLES ALL 5 THEMES)
   ============================================================ */

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


/* ============================================================
   11. INITIALIZE THE LANDING PAGE
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    initializeThemeToggle();

    initializeMobileNavigation();

    initializeRevealAnimations();

    initializeActiveNavigation();

    initializeFooter();

    initializeStatusRefresh();

    console.info(
        "Financial Fraud Detection landing page initialized."
    );
});