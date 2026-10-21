/* ============================================
   FINANCIAL FRAUD DETECTION SYSTEM
   Login Controller
============================================ */

(() => {
    "use strict";

    const loginForm = document.getElementById("loginForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    const togglePasswordButton =
        document.getElementById("togglePassword");

    const loginButton = document.getElementById("loginButton");
    const loginButtonText =
        document.getElementById("loginButtonText");

    const loginMessage = document.getElementById("loginMessage");
    const loginYear = document.getElementById("loginYear");


    // Clear the login fields.
    function clearLoginFields() {
        if (usernameInput) {
            usernameInput.value = "";
        }

        if (passwordInput) {
            passwordInput.value = "";
            passwordInput.type = "password";
        }

        if (togglePasswordButton) {
            togglePasswordButton.textContent = "Show";

            togglePasswordButton.setAttribute(
                "aria-label",
                "Show password"
            );

            togglePasswordButton.setAttribute(
                "aria-pressed",
                "false"
            );
        }
    }


    // Display an authentication message.
    function showMessage(message, type = "info") {
        if (!loginMessage) {
            return;
        }

        loginMessage.textContent = message;
        loginMessage.className = `login-message ${type}`;
        loginMessage.hidden = false;
    }


    // Clear the authentication message.
    function clearMessage() {
        if (!loginMessage) {
            return;
        }

        loginMessage.textContent = "";
        loginMessage.className = "login-message";
        loginMessage.hidden = true;
    }


    // Toggle password visibility without scrolling.
    function togglePasswordVisibility(event) {
        event.preventDefault();

        if (!passwordInput) {
            return;
        }

        const showPassword =
            passwordInput.type === "password";

        passwordInput.type = showPassword
            ? "text"
            : "password";

        if (togglePasswordButton) {
            togglePasswordButton.textContent =
                showPassword ? "Hide" : "Show";

            togglePasswordButton.setAttribute(
                "aria-label",
                showPassword ? "Hide password" : "Show password"
            );

            togglePasswordButton.setAttribute(
                "aria-pressed",
                String(showPassword)
            );
        }
    }


    // Update the sign-in button state.
    function setLoading(isLoading) {
        if (loginButton) {
            loginButton.disabled = isLoading;

            loginButton.setAttribute(
                "aria-busy",
                String(isLoading)
            );
        }

        if (loginButtonText) {
            loginButtonText.textContent = isLoading
                ? "Signing in..."
                : "Sign In Securely";
        }
    }


    // Redirect after successful authentication.
    function redirectToDashboard() {
        window.location.replace("./dashboard.html");
    }


    function initializeThemeToggle() {
        const THEME_KEY = "fraudguard_theme";
        const toggleBtn = document.getElementById("themeToggleBtn");
        const toggleIcon = document.getElementById("themeToggleIcon");
        const toggleLabel = document.getElementById("themeToggleLabel");

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


    // Initialize the login page without automatic login.
    function initializeLoginPage() {
        initializeThemeToggle();

        // Remove any previously saved session when the
        // login page is opened.
        if (window.FraudAPI) {
            window.FraudAPI.clearSession();
        }

        // Never redirect automatically to the dashboard.
        clearLoginFields();
        clearMessage();

        if (loginYear) {
            loginYear.textContent = new Date().getFullYear();
        }

        // Clear browser-restored input values.
        window.setTimeout(() => {
            clearLoginFields();
        }, 200);
    }


    // Authenticate using the FastAPI login endpoint.
    async function handleLogin(event) {
        event.preventDefault();

        clearMessage();

        if (!window.FraudAPI) {
            showMessage(
                "The API client could not be loaded. Check js/api.js.",
                "error"
            );

            return;
        }

        const username = usernameInput
            ? usernameInput.value.trim()
            : "";

        const password = passwordInput
            ? passwordInput.value
            : "";

        if (!username) {
            showMessage(
                "Please enter your username.",
                "error"
            );

            usernameInput?.focus();
            return;
        }

        if (!password) {
            showMessage(
                "Please enter your password.",
                "error"
            );

            passwordInput?.focus();
            return;
        }

        setLoading(true);

        try {
            const response = await window.FraudAPI.login(
                username,
                password
            );

            if (!response || !response.access_token) {
                throw new Error(
                    "The server did not return an access token."
                );
            }

            showMessage(
                "Login successful. Opening your dashboard...",
                "success"
            );

            window.setTimeout(() => {
                redirectToDashboard();
            }, 300);

        } catch (error) {
            console.error("Login failed:", error);

            showMessage(
                error.message ||
                "Login failed. Please check your credentials.",
                "error"
            );

            if (passwordInput) {
                passwordInput.value = "";
                passwordInput.type = "password";
            }

            if (togglePasswordButton) {
                togglePasswordButton.textContent = "Show";

                togglePasswordButton.setAttribute(
                    "aria-label",
                    "Show password"
                );

                togglePasswordButton.setAttribute(
                    "aria-pressed",
                    "false"
                );
            }

        } finally {
            setLoading(false);
        }
    }


    // Event listeners.
    loginForm?.addEventListener(
        "submit",
        handleLogin
    );

    togglePasswordButton?.addEventListener(
        "click",
        togglePasswordVisibility
    );

    usernameInput?.addEventListener(
        "input",
        clearMessage
    );

    passwordInput?.addEventListener(
        "input",
        clearMessage
    );

    // Clear fields when returning to the login page.
    window.addEventListener("pageshow", () => {
        clearLoginFields();
    });

    // Start the login page.
    document.addEventListener(
        "DOMContentLoaded",
        initializeLoginPage,
        { once: true }
    );

})();