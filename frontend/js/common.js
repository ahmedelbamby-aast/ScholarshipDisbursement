window.FrontendUtils = (() => {
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

  return {
    getApiBase,
    readJson,
    setButtonLoading,
    showAlert,
  };
})();
