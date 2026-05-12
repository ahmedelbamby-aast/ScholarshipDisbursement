const runtime = {
  apiBase: window.FrontendUtils.getApiBase(),
};

const alertBox = document.getElementById("alertBox");
const approveForm = document.getElementById("approveForm");
const releaseForm = document.getElementById("releaseForm");
const approveButton = approveForm.querySelector('button[type="submit"]');
const releaseButton = releaseForm.querySelector('button[type="submit"]');

function showAlert(message, isSuccess) {
  window.FrontendUtils.showAlert(alertBox, message, isSuccess);
}

async function submitApprove(event) {
  event.preventDefault();
  window.FrontendUtils.setButtonLoading(approveButton, true, "Approve");

  try {
    const payload = {
      studentAddress: document.getElementById("studentAddress").value.trim(),
      amountWei: document.getElementById("amountWei").value.trim(),
      installments: Number(document.getElementById("installments").value),
      claimWindowSeconds: Number(document.getElementById("claimWindowSeconds").value),
    };

    if (!payload.studentAddress || !payload.amountWei) {
      throw new Error("Student address and amount are required");
    }

    const response = await fetch(`${runtime.apiBase}/api/scholarships/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await window.FrontendUtils.readJson(response);
    if (!response.ok) {
      throw new Error(data.error || "Approval failed");
    }

    showAlert(`Approval submitted. Tx: ${data.txHash}`, true);
    approveForm.reset();
  } catch (error) {
    showAlert(error.message || "Approval failed", false);
  } finally {
    window.FrontendUtils.setButtonLoading(approveButton, false, "Approve");
  }
}

async function submitRelease(event) {
  event.preventDefault();
  window.FrontendUtils.setButtonLoading(releaseButton, true, "Release");

  try {
    const payload = {
      studentAddress: document.getElementById("releaseStudentAddress").value.trim(),
      installmentNumber: Number(document.getElementById("installmentNumber").value),
    };

    if (!payload.studentAddress || !payload.installmentNumber || payload.installmentNumber < 1) {
      throw new Error("Valid student address and installment number are required");
    }

    const response = await fetch(`${runtime.apiBase}/api/scholarships/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await window.FrontendUtils.readJson(response);
    if (!response.ok) {
      throw new Error(data.error || "Release failed");
    }

    showAlert(`Release submitted. Tx: ${data.txHash}`, true);
    releaseForm.reset();
  } catch (error) {
    showAlert(error.message || "Release failed", false);
  } finally {
    window.FrontendUtils.setButtonLoading(releaseButton, false, "Release");
  }
}

approveForm.addEventListener("submit", submitApprove);
releaseForm.addEventListener("submit", submitRelease);
