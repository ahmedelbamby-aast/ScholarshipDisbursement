const runtime = {
  apiBase: window.location.origin.includes("localhost") ? "http://localhost:4000" : "",
};

const alertBox = document.getElementById("alertBox");
const approveForm = document.getElementById("approveForm");
const releaseForm = document.getElementById("releaseForm");

function showAlert(message, isSuccess) {
  alertBox.className = `alert ${isSuccess ? "alert-success" : "alert-danger"}`;
  alertBox.textContent = message;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch (_error) {
    return {};
  }
}

async function submitApprove(event) {
  event.preventDefault();

  try {
    const payload = {
      studentAddress: document.getElementById("studentAddress").value.trim(),
      amountWei: document.getElementById("amountWei").value.trim(),
      installments: Number(document.getElementById("installments").value),
      claimWindowSeconds: Number(document.getElementById("claimWindowSeconds").value),
    };

    const response = await fetch(`${runtime.apiBase}/api/scholarships/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.error || "Approval failed");
    }

    showAlert(`Approval submitted. Tx: ${data.txHash}`, true);
  } catch (error) {
    showAlert(error.message || "Approval failed", false);
  }
}

async function submitRelease(event) {
  event.preventDefault();

  try {
    const payload = {
      studentAddress: document.getElementById("releaseStudentAddress").value.trim(),
      installmentNumber: Number(document.getElementById("installmentNumber").value),
    };

    const response = await fetch(`${runtime.apiBase}/api/scholarships/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.error || "Release failed");
    }

    showAlert(`Release submitted. Tx: ${data.txHash}`, true);
  } catch (error) {
    showAlert(error.message || "Release failed", false);
  }
}

approveForm.addEventListener("submit", submitApprove);
releaseForm.addEventListener("submit", submitRelease);
