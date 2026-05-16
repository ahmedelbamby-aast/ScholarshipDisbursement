const runtime = { apiBase: window.FrontendUtils.getApiBase() };

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
const roleSelect = document.getElementById("roleSelect");
const releaseStudentAddress = document.getElementById("releaseStudentAddress");
const refreshFundsBtn = document.getElementById("refreshFundsBtn");
const fundsDays = document.getElementById("fundsDays");
const fundsChartCanvas = document.getElementById("fundsChart");
const telemetryBlocks = document.getElementById("telemetryBlocks");
const refreshTelemetryBtn = document.getElementById("refreshTelemetryBtn");
const telemetryMeta = document.getElementById("telemetryMeta");
const telemetryChartCanvas = document.getElementById("telemetryChart");
const exportBlocks = document.getElementById("exportBlocks");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportXlsxBtn = document.getElementById("exportXlsxBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");

let fundsChart = null;
let telemetryChart = null;
let telemetryTimer = null;

const auditState = { page: 1 };

function getRole() { return roleSelect?.value || "admin"; }
function apiHeaders(extra = {}) { return { "Content-Type": "application/json", "x-user-role": getRole(), ...extra }; }
function showAlert(message, isSuccess) { window.FrontendUtils.showAlert(alertBox, message, isSuccess); }
function shortHash(hash) { return !hash || hash.length < 12 ? (hash || "-") : `${hash.slice(0, 8)}...${hash.slice(-6)}`; }
function toEth(weiValue) { return Number(BigInt(weiValue || "0")) / 1e18; }

function setRoleUiState() {
  const isAdmin = getRole() === "admin";
  approveButton.disabled = !isAdmin;
  releaseButton.disabled = !isAdmin;
  approveForm.querySelectorAll("input, select").forEach((el) => { el.disabled = !isAdmin; });
  releaseForm.querySelectorAll("input, select").forEach((el) => { el.disabled = !isAdmin; });
  exportCsvBtn.disabled = !isAdmin;
  exportXlsxBtn.disabled = !isAdmin;
  exportPdfBtn.disabled = !isAdmin;
}

async function exportFile(kind, button) {
  if (getRole() !== "admin") {
    showAlert("Only admin can export blockchain transactions/logs", false);
    return;
  }

  window.FrontendUtils.setButtonLoading(button, true, button.textContent.trim());
  try {
    const blocks = Number(exportBlocks.value || 1000);
    const response = await fetch(`${runtime.apiBase}/api/exports/transactions.${kind}?blocks=${blocks}`, {
      headers: { "x-user-role": getRole() },
    });
    if (!response.ok) {
      const body = await window.FrontendUtils.readJson(response);
      throw new Error(body.error || `Export ${kind} failed`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `transactions-and-logs.${kind}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    showAlert(error.message || `Export ${kind} failed`, false);
  } finally {
    const label = kind === "csv" ? "Export CSV" : kind === "xlsx" ? "Export Excel" : "Export PDF";
    window.FrontendUtils.setButtonLoading(button, false, label);
  }
}

function renderFundsChart(points) {
  const labels = points.map((p) => p.day);
  const funded = points.map((p) => toEth(p.fundedWei));
  const released = points.map((p) => toEth(p.releasedWei));
  const claimed = points.map((p) => toEth(p.claimedWei));
  if (fundsChart) fundsChart.destroy();
  fundsChart = new Chart(fundsChartCanvas, {
    type: "line",
    data: { labels, datasets: [
      { label: "Funded (ETH)", data: funded, borderColor: "#0d6efd", tension: 0.25 },
      { label: "Released (ETH)", data: released, borderColor: "#212529", tension: 0.25 },
      { label: "Claimed (ETH)", data: claimed, borderColor: "#198754", tension: 0.25 },
    ] }, options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

function renderTelemetryChart(byBlock) {
  const labels = byBlock.map((p) => String(p.blockNumber));
  const funded = byBlock.map((p) => toEth(p.fundedWei));
  const released = byBlock.map((p) => toEth(p.releasedWei));
  const claimed = byBlock.map((p) => toEth(p.claimedWei));
  if (telemetryChart) telemetryChart.destroy();
  telemetryChart = new Chart(telemetryChartCanvas, {
    type: "bar",
    data: { labels, datasets: [
      { label: "Funded/block (ETH)", data: funded, backgroundColor: "#74b9ff" },
      { label: "Released/block (ETH)", data: released, backgroundColor: "#636e72" },
      { label: "Claimed/block (ETH)", data: claimed, backgroundColor: "#55efc4" },
    ] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

async function loadTelemetry() {
  window.FrontendUtils.setButtonLoading(refreshTelemetryBtn, true, "Refresh Telemetry");
  try {
    const params = new URLSearchParams({ blocks: String(Number(telemetryBlocks.value || 500)) });
    const response = await fetch(`${runtime.apiBase}/api/chain/telemetry?${params.toString()}`, { headers: apiHeaders() });
    const data = await window.FrontendUtils.readJson(response);
    if (!response.ok) throw new Error(data.error || "Failed to load telemetry");
    renderTelemetryChart(data.byBlock || []);
    telemetryMeta.textContent = `Latest block: ${data.latestBlock}. Window: ${data.fromBlock}..${data.latestBlock}. Approved students: ${data.approvedStudentsCount}. Funded balance: ${toEth(data.fundedBalanceWei).toFixed(4)} ETH.`;
  } catch (error) {
    telemetryMeta.textContent = "Telemetry unavailable.";
    showAlert(error.message || "Telemetry unavailable", false);
  } finally {
    window.FrontendUtils.setButtonLoading(refreshTelemetryBtn, false, "Refresh Telemetry");
  }
}

async function loadFundsMovement() {
  window.FrontendUtils.setButtonLoading(refreshFundsBtn, true, "Refresh Graph");
  try {
    const params = new URLSearchParams({ days: String(Number(fundsDays.value || 14)) });
    const response = await fetch(`${runtime.apiBase}/api/audits/funds-movement?${params.toString()}`, { headers: apiHeaders() });
    const data = await window.FrontendUtils.readJson(response);
    if (!response.ok) throw new Error(data.error || "Failed to load funds movement");
    renderFundsChart(data.points || []);
  } catch (error) {
    showAlert(error.message || "Funds graph unavailable", false);
  } finally {
    window.FrontendUtils.setButtonLoading(refreshFundsBtn, false, "Refresh Graph");
  }
}

function renderAuditRows(rows) {
  if (!rows.length) { auditRows.innerHTML = '<tr><td colspan="8" class="text-secondary">No rows found for this filter.</td></tr>'; return; }
  const isAdmin = getRole() === "admin";
  auditRows.innerHTML = rows.map((row) => {
    const statusValue = row.audit_status || "recorded";
    const noteValue = row.audit_note || "";
    const safeNote = noteValue.replace(/"/g, "&quot;");
    const editControls = isAdmin
      ? `<div class="d-flex gap-1"><select data-edit-status class="form-select form-select-sm" data-type="${row.type}" data-id="${row.id}"><option value="recorded" ${statusValue === "recorded" ? "selected" : ""}>recorded</option><option value="reviewed" ${statusValue === "reviewed" ? "selected" : ""}>reviewed</option><option value="flagged" ${statusValue === "flagged" ? "selected" : ""}>flagged</option></select><input data-edit-note class="form-control form-control-sm" data-type="${row.type}" data-id="${row.id}" maxlength="500" value="${safeNote}" /><button data-save-audit class="btn btn-sm btn-outline-primary" data-type="${row.type}" data-id="${row.id}">Save</button></div>`
      : '<span class="text-secondary">View only</span>';
    return `<tr><td>${row.id || "-"}</td><td>${row.type}</td><td><code>${row.student_address || "-"}</code></td><td><code title="${row.tx_hash || ""}">${shortHash(row.tx_hash)}</code></td><td>${statusValue}</td><td>${noteValue || "-"}</td><td>${editControls}</td><td>${row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</td></tr>`;
  }).join("");
}

function mergeAuditRows(approvals, releases) {
  return [...(approvals || []).map((i) => ({ ...i, type: "approval" })), ...(releases || []).map((i) => ({ ...i, type: "release" }))]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

async function loadApprovedStudents() {
  try {
    const response = await fetch(`${runtime.apiBase}/api/scholarships/approved`, { headers: apiHeaders() });
    const data = await window.FrontendUtils.readJson(response);
    if (!response.ok) throw new Error(data.error || "Failed to load approved students");
    const students = data.students || [];
    releaseStudentAddress.innerHTML = ['<option value="">Select approved student</option>', ...students.map((a) => `<option value="${a}">${a}</option>`)].join("");
    auditStudentAddress.innerHTML = ['<option value="">All students</option>', ...students.map((a) => `<option value="${a}">${a}</option>`)].join("");
  } catch (error) { showAlert(error.message || "Failed to load approved students", false); }
}

async function loadAuditHistory() {
  window.FrontendUtils.setButtonLoading(refreshAuditBtn, true, "Refresh");
  prevAuditBtn.disabled = true; nextAuditBtn.disabled = true;
  try {
    const params = new URLSearchParams({ page: String(auditState.page), pageSize: String(Number(auditPageSize.value || 10)) });
    if (auditStudentAddress.value) params.set("studentAddress", auditStudentAddress.value);
    const response = await fetch(`${runtime.apiBase}/api/audits/history?${params.toString()}`, { headers: apiHeaders() });
    const data = await window.FrontendUtils.readJson(response);
    if (!response.ok) throw new Error(data.error || "Failed to load audit history");
    renderAuditRows(mergeAuditRows(data.approvals, data.releases));
    auditMeta.textContent = `Role ${getRole()}. Page ${data.pagination.page}, page size ${data.pagination.pageSize}. Totals: approvals ${data.pagination.approvalsTotal}, releases ${data.pagination.releasesTotal}.`;
    prevAuditBtn.disabled = auditState.page <= 1;
    const maxTotal = Math.max(data.pagination.approvalsTotal || 0, data.pagination.releasesTotal || 0);
    nextAuditBtn.disabled = data.pagination.page * data.pagination.pageSize >= maxTotal;
  } catch (error) {
    auditRows.innerHTML = `<tr><td colspan="8" class="text-danger">${error.message || "Failed to load audit history"}</td></tr>`;
    auditMeta.textContent = "Audit history unavailable.";
  } finally { window.FrontendUtils.setButtonLoading(refreshAuditBtn, false, "Refresh"); }
}

async function saveAuditEdit(button) {
  const { type, id } = button.dataset;
  const statusInput = document.querySelector(`select[data-edit-status][data-type="${type}"][data-id="${id}"]`);
  const noteInput = document.querySelector(`input[data-edit-note][data-type="${type}"][data-id="${id}"]`);
  if (!statusInput || !noteInput) return;
  window.FrontendUtils.setButtonLoading(button, true, "Save");
  try {
    const response = await fetch(`${runtime.apiBase}/api/audits/${type}/${id}`, {
      method: "PATCH", headers: apiHeaders(),
      body: JSON.stringify({ auditStatus: statusInput.value, auditNote: noteInput.value.trim() }),
    });
    const data = await window.FrontendUtils.readJson(response);
    if (!response.ok) throw new Error(data.error || "Failed to update audit entry");
    showAlert(`Audit ${type}#${id} updated`, true);
    await loadAuditHistory();
  } catch (error) { showAlert(error.message || "Failed to update audit entry", false); }
  finally { window.FrontendUtils.setButtonLoading(button, false, "Save"); }
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
    const response = await fetch(`${runtime.apiBase}/api/scholarships/approve`, { method: "POST", headers: apiHeaders(), body: JSON.stringify(payload) });
    const data = await window.FrontendUtils.readJson(response);
    if (!response.ok) throw new Error(data.error || "Approval failed");
    showAlert(`Approval submitted. Tx: ${data.txHash}`, true);
    approveForm.reset();
    await loadApprovedStudents();
    await Promise.all([loadAuditHistory(), loadFundsMovement(), loadTelemetry()]);
  } catch (error) { showAlert(error.message || "Approval failed", false); }
  finally { window.FrontendUtils.setButtonLoading(approveButton, false, "Approve"); }
}

async function submitRelease(event) {
  event.preventDefault();
  window.FrontendUtils.setButtonLoading(releaseButton, true, "Release");
  try {
    const payload = { studentAddress: releaseStudentAddress.value, installmentNumber: Number(document.getElementById("installmentNumber").value) };
    const response = await fetch(`${runtime.apiBase}/api/scholarships/release`, { method: "POST", headers: apiHeaders(), body: JSON.stringify(payload) });
    const data = await window.FrontendUtils.readJson(response);
    if (!response.ok) throw new Error(data.error || "Release failed");
    showAlert(`Release submitted. Tx: ${data.txHash}`, true);
    releaseForm.reset();
    await Promise.all([loadAuditHistory(), loadFundsMovement(), loadTelemetry()]);
  } catch (error) { showAlert(error.message || "Release failed", false); }
  finally { window.FrontendUtils.setButtonLoading(releaseButton, false, "Release"); }
}

approveForm.addEventListener("submit", submitApprove);
releaseForm.addEventListener("submit", submitRelease);
refreshAuditBtn.addEventListener("click", () => { auditState.page = 1; loadAuditHistory(); });
prevAuditBtn.addEventListener("click", () => { auditState.page = Math.max(1, auditState.page - 1); loadAuditHistory(); });
nextAuditBtn.addEventListener("click", () => { auditState.page += 1; loadAuditHistory(); });
auditPageSize.addEventListener("change", () => { auditState.page = 1; loadAuditHistory(); });
refreshFundsBtn.addEventListener("click", loadFundsMovement);
fundsDays.addEventListener("change", loadFundsMovement);
refreshTelemetryBtn.addEventListener("click", loadTelemetry);
telemetryBlocks.addEventListener("change", loadTelemetry);
exportCsvBtn.addEventListener("click", () => exportFile("csv", exportCsvBtn));
exportXlsxBtn.addEventListener("click", () => exportFile("xlsx", exportXlsxBtn));
exportPdfBtn.addEventListener("click", () => exportFile("pdf", exportPdfBtn));
roleSelect.addEventListener("change", async () => {
  setRoleUiState();
  await loadApprovedStudents();
  await Promise.all([loadAuditHistory(), loadFundsMovement(), loadTelemetry()]);
});
auditRows.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-save-audit]");
  if (button) saveAuditEdit(button);
});

setRoleUiState();
loadApprovedStudents().then(() => Promise.all([loadAuditHistory(), loadFundsMovement(), loadTelemetry()]));
if (telemetryTimer) clearInterval(telemetryTimer);
telemetryTimer = setInterval(loadTelemetry, 8000);
