const runtime = {
  apiBase: window.FrontendUtils.getApiBase(),
};

const alertBox = document.getElementById("alertBox");
const approveForm = document.getElementById("approveForm");
const releaseForm = document.getElementById("releaseForm");
const approveButton = approveForm.querySelector('button[type="submit"]');
const releaseButton = releaseForm.querySelector('button[type="submit"]');
const refreshAuditBtn = document.getElementById("refreshAuditBtn");
const prevAuditBtn = document.getElementById("prevAuditBtn");
const nextAuditBtn = document.getElementById("nextAuditBtn");
const auditRows = document.getElementById("auditRows");
const auditMeta = document.getElementById("auditMeta");
const auditStudentAddress = document.getElementById("auditStudentAddress");
const auditPageSize = document.getElementById("auditPageSize");

const auditState = {
  // UI-local cursor; backend remains stateless via query params.
  page: 1,
};

function showAlert(message, isSuccess) {
  window.FrontendUtils.showAlert(alertBox, message, isSuccess);
}

function shortHash(hash) {
  if (!hash || hash.length < 12) {
    return hash || "-";
  }
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function renderAuditRows(rows) {
  if (!rows.length) {
    auditRows.innerHTML = '<tr><td colspan="4" class="text-secondary">No rows found for this filter.</td></tr>';
    return;
  }

  auditRows.innerHTML = rows
    .map(
      (row) => `<tr>
        <td>${row.type}</td>
        <td><code>${row.student_address || "-"}</code></td>
        <td><code title="${row.tx_hash || ""}">${shortHash(row.tx_hash)}</code></td>
        <td>${row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</td>
      </tr>`
    )
    .join("");
}

function mergeAuditRows(approvals, releases) {
  // Merge on client to preserve a single time-sorted activity stream for operators.
  const approvalRows = approvals.map((item) => ({ ...item, type: "approval" }));
  const releaseRows = releases.map((item) => ({ ...item, type: "release" }));
  return [...approvalRows, ...releaseRows].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
}

async function loadAuditHistory() {
  if (!refreshAuditBtn) {
    return;
  }

  window.FrontendUtils.setButtonLoading(refreshAuditBtn, true, "Refresh");
  prevAuditBtn.disabled = true;
  nextAuditBtn.disabled = true;

  try {
    const params = new URLSearchParams({
      page: String(auditState.page),
      pageSize: String(Number(auditPageSize.value || 10)),
    });
    if (auditStudentAddress.value.trim()) {
      params.set("studentAddress", auditStudentAddress.value.trim());
    }

    const response = await fetch(`${runtime.apiBase}/api/audits/history?${params.toString()}`);
    const data = await window.FrontendUtils.readJson(response);
    if (!response.ok) {
      throw new Error(data.error || "Failed to load audit history");
    }

    const rows = mergeAuditRows(data.approvals || [], data.releases || []);
    renderAuditRows(rows);
    auditMeta.textContent = `Page ${data.pagination.page}, page size ${data.pagination.pageSize}. Totals: approvals ${data.pagination.approvalsTotal}, releases ${data.pagination.releasesTotal}.`;

    prevAuditBtn.disabled = auditState.page <= 1;
    // Next is derived from larger dataset to avoid false "end reached" when one table is sparse.
    const maxTotal = Math.max(data.pagination.approvalsTotal || 0, data.pagination.releasesTotal || 0);
    const consumed = data.pagination.page * data.pagination.pageSize;
    nextAuditBtn.disabled = consumed >= maxTotal;
  } catch (error) {
    auditRows.innerHTML = `<tr><td colspan="4" class="text-danger">${error.message || "Failed to load audit history"}</td></tr>`;
    auditMeta.textContent = "Audit history unavailable.";
  } finally {
    window.FrontendUtils.setButtonLoading(refreshAuditBtn, false, "Refresh");
  }
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
    await loadAuditHistory();
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
    await loadAuditHistory();
  } catch (error) {
    showAlert(error.message || "Release failed", false);
  } finally {
    window.FrontendUtils.setButtonLoading(releaseButton, false, "Release");
  }
}

approveForm.addEventListener("submit", submitApprove);
releaseForm.addEventListener("submit", submitRelease);
if (refreshAuditBtn) {
  refreshAuditBtn.addEventListener("click", () => {
    auditState.page = 1;
    loadAuditHistory();
  });
  prevAuditBtn.addEventListener("click", () => {
    auditState.page = Math.max(1, auditState.page - 1);
    loadAuditHistory();
  });
  nextAuditBtn.addEventListener("click", () => {
    auditState.page += 1;
    loadAuditHistory();
  });
  auditPageSize.addEventListener("change", () => {
    auditState.page = 1;
    loadAuditHistory();
  });
}
