const runtime = {
  contractAddress: window.CONTRACT_ADDRESS || "",
  signer: null,
  contract: null,
};

const connectBtn = document.getElementById("connectBtn");
const walletInfo = document.getElementById("walletInfo");
const claimForm = document.getElementById("claimForm");
const studentAlert = document.getElementById("studentAlert");
const claimButton = claimForm.querySelector('button[type="submit"]');
const claimInstallmentNumber = document.getElementById("claimInstallmentNumber");

const ABI = [
  "function claimInstallment(uint256 installmentNumber)",
  "function getScholarship(address student) view returns (tuple(bool approved,uint256 totalAmount,uint256 releasedAmount,uint256 claimedAmount,uint256 installments,uint256 releasedInstallments,uint256 claimedInstallments,uint256 claimWindowSeconds))",
  "function getInstallmentInfo(address student,uint256 installmentNumber) view returns (tuple(bool released,bool claimed,uint256 amount,uint256 releasedAt,uint256 claimDeadline))",
];

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

    if (!runtime.contractAddress) {
      showStudentAlert("Contract address is missing. Set window.CONTRACT_ADDRESS.", false);
      return;
    }

    runtime.contract = new ethers.Contract(runtime.contractAddress, ABI, runtime.signer);
    await loadClaimableInstallments(address);
  } catch (error) {
    showStudentAlert(error.message || "Wallet connection failed", false);
  } finally {
    window.FrontendUtils.setButtonLoading(connectBtn, false, "Connect");
  }
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
