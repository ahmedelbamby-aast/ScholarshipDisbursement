window.FrontendUtils = (() => {
  const SESSION_KEY = "scholarship_session";

  function readJson(response) {
    return response.json().catch(() => ({}));
  }

  function setButtonLoading(button, loading, idleLabel) {
    if (!button) {
      return;
    }

    if (!button.dataset.idleLabel) {
      button.dataset.idleLabel = idleLabel || button.textContent.trim();
    }

    button.disabled = loading;
    button.textContent = loading ? "Processing..." : button.dataset.idleLabel;
  }

  function showAlert(alertElement, message, isSuccess) {
    if (!alertElement) {
      return;
    }

    alertElement.className = `alert status-alert ${isSuccess ? "alert-success" : "alert-danger"}`;
    alertElement.textContent = message;
    requestAnimationFrame(() => {
      alertElement.classList.add("is-visible");
    });
  }

  function getApiBase() {
    return window.location.origin.includes("localhost") ? "http://localhost:4000" : "";
  }

  function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session || {}));
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
    } catch (_error) {
      return {};
    }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function getAuthHeaders() {
    const session = getSession();
    const token = session.token || "";
    const role = session.user?.role || "";
    const headers = {};
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
    if (role) {
      headers["x-user-role"] = role;
    }
    return headers;
  }

  return {
    clearSession,
    getAuthHeaders,
    getApiBase,
    getSession,
    readJson,
    saveSession,
    setButtonLoading,
    showAlert,
  };
})();
