const runtime = {
  apiBase: window.FrontendUtils.getApiBase(),
  contractAddress: window.CONTRACT_ADDRESS || "",
  expectedChainId: 31337,
  signer: null,
  contract: null,
};

const connectBtn = document.getElementById("connectBtn");
const walletInfo = document.getElementById("walletInfo");
const claimForm = document.getElementById("claimForm");
const studentAlert = document.getElementById("studentAlert");
const claimButton = claimForm.querySelector('button[type="submit"]');
const claimInstallmentNumber = document.getElementById("claimInstallmentNumber");
const studentSessionBadge = document.getElementById("studentSessionBadge");
const studentLogoutBtn = document.getElementById("studentLogoutBtn");
const STUDENT_UI_STATE_KEY = "scholarship_student_ui_state";

const ABI = [
  "function claimInstallment(uint256 installmentNumber)",
  "function getScholarship(address student) view returns (tuple(bool approved,uint256 totalAmount,uint256 releasedAmount,uint256 claimedAmount,uint256 installments,uint256 releasedInstallments,uint256 claimedInstallments,uint256 claimWindowSeconds))",
  "function getInstallmentInfo(address student,uint256 installmentNumber) view returns (tuple(bool released,bool claimed,uint256 amount,uint256 releasedAt,uint256 claimDeadline))",
];

function enforceStudentSession() {
  const session = window.FrontendUtils.getSession();
  if (!session.token || session.user?.role !== "student") {
    window.location.href = "student-login.html";
    return false;
  }
  if (studentSessionBadge) {
    studentSessionBadge.textContent = `${session.user?.fullName || session.user?.email || "Student"} (student)`;
  }
  return true;
}

function saveStudentUiState() {
  const state = {
    selectedInstallment: claimInstallmentNumber?.value || "",
    walletInfo: walletInfo?.textContent || "",
  };
  localStorage.setItem(STUDENT_UI_STATE_KEY, JSON.stringify(state));
}

function restoreStudentUiState() {
  try {
    const raw = localStorage.getItem(STUDENT_UI_STATE_KEY);
    if (!raw) {
      return;
    }
    const state = JSON.parse(raw);
    if (state.walletInfo && walletInfo) {
      walletInfo.textContent = state.walletInfo;
    }
  } catch (_error) {
    // Ignore malformed persisted state.
  }
}

function showStudentAlert(message, success) {
  window.FrontendUtils.showAlert(studentAlert, message, success);
}

async function loadClaimableInstallments(address) {
  if (!runtime.contract) {
    return;
  }

  const scholarship = await runtime.contract.getScholarship(address);
  const releasedCount = Number(scholarship.releasedInstallments || 0n);

  if (releasedCount < 1) {
    claimInstallmentNumber.innerHTML = '<option value="">No released installments</option>';
    return;
  }

  const options = ['<option value="">Select installment</option>'];
  for (let n = 1; n <= releasedCount; n += 1) {
    const info = await runtime.contract.getInstallmentInfo(address, n);
    if (info.released && !info.claimed) {
      options.push(`<option value="${n}">Installment ${n}</option>`);
    }
  }

  if (options.length === 1) {
    options.push('<option value="">No claimable installments</option>');
  }

  claimInstallmentNumber.innerHTML = options.join("");
  try {
    const saved = JSON.parse(localStorage.getItem(STUDENT_UI_STATE_KEY) || "{}");
    if (saved.selectedInstallment) {
      claimInstallmentNumber.value = saved.selectedInstallment;
    }
  } catch (_error) {
    // Ignore malformed state.
  }
}

async function connectWallet() {
  window.FrontendUtils.setButtonLoading(connectBtn, true, "Connect");
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask is required");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    runtime.signer = await provider.getSigner();

    const address = await runtime.signer.getAddress();
    walletInfo.textContent = `Connected: ${address}`;

    const networkResponse = await fetch(`${runtime.apiBase}/api/runtime/network`);
    const networkData = await window.FrontendUtils.readJson(networkResponse);
    if (networkResponse.ok) {
      runtime.expectedChainId = Number(networkData.chainId || runtime.expectedChainId);
      runtime.contractAddress = networkData.contractAddress || runtime.contractAddress;
    }
    const chain = await provider.getNetwork();
    if (Number(chain.chainId) !== runtime.expectedChainId) {
      showStudentAlert(
        `Wrong network. Please switch MetaMask to chain id ${runtime.expectedChainId}.`,
        false
      );
      return;
    }

    if (!runtime.contractAddress) {
      showStudentAlert("Contract address is missing. Set window.CONTRACT_ADDRESS.", false);
      return;
    }

    runtime.contract = new ethers.Contract(runtime.contractAddress, ABI, runtime.signer);
    await loginWithMetaMask(address);
    await loadClaimableInstallments(address);
    saveStudentUiState();
  } catch (error) {
    showStudentAlert(error.message || "Wallet connection failed", false);
  } finally {
    window.FrontendUtils.setButtonLoading(connectBtn, false, "Connect");
  }
}

async function trySilentReconnect() {
  try {
    if (!window.ethereum) {
      return;
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_accounts", []);
    if (!accounts.length) {
      return;
    }
    runtime.signer = await provider.getSigner();
    const address = await runtime.signer.getAddress();
    walletInfo.textContent = `Connected: ${address}`;
    runtime.contract = new ethers.Contract(runtime.contractAddress, ABI, runtime.signer);
    await loadClaimableInstallments(address);
    saveStudentUiState();
  } catch (_error) {
    // Silent path should not surface errors.
  }
}

async function loginWithMetaMask(address) {
  const nonceResponse = await fetch(`${runtime.apiBase}/api/auth/metamask/nonce`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress: address }),
  });
  const nonceData = await window.FrontendUtils.readJson(nonceResponse);
  if (!nonceResponse.ok) {
    throw new Error(nonceData.error || "MetaMask nonce request failed");
  }

  const signature = await runtime.signer.signMessage(nonceData.message);
  const loginResponse = await fetch(`${runtime.apiBase}/api/auth/metamask/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress: address, signature }),
  });
  const loginData = await window.FrontendUtils.readJson(loginResponse);
  if (!loginResponse.ok) {
    throw new Error(loginData.error || "MetaMask login failed");
  }
  window.FrontendUtils.saveSession({ token: loginData.token, user: loginData.user });
}

async function submitClaim(event) {
  event.preventDefault();
  window.FrontendUtils.setButtonLoading(claimButton, true, "Claim");

  try {
    if (!runtime.contract) {
      throw new Error("Connect wallet first");
    }

    const installmentNumber = Number(claimInstallmentNumber.value);
    if (!Number.isInteger(installmentNumber) || installmentNumber < 1) {
      throw new Error("Choose a valid claimable installment");
    }

    const tx = await runtime.contract.claimInstallment(installmentNumber);
    const receipt = await tx.wait();

    showStudentAlert(`Claim successful. Tx: ${receipt.hash}`, true);
    const address = await runtime.signer.getAddress();
    await loadClaimableInstallments(address);
  } catch (error) {
    showStudentAlert(error.message || "Claim failed", false);
  } finally {
    window.FrontendUtils.setButtonLoading(claimButton, false, "Claim");
  }
}

connectBtn.addEventListener("click", connectWallet);
claimForm.addEventListener("submit", submitClaim);
claimInstallmentNumber.addEventListener("change", saveStudentUiState);
window.addEventListener("beforeunload", saveStudentUiState);
studentLogoutBtn?.addEventListener("click", () => {
  window.FrontendUtils.clearSession();
  window.location.href = "student-login.html";
});
if (enforceStudentSession()) {
  restoreStudentUiState();
  trySilentReconnect();
}
