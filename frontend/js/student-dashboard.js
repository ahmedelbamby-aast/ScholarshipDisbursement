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

const ABI = [
  "function claimInstallment(uint256 installmentNumber)",
  "function getScholarship(address student) view returns (tuple(bool approved,uint256 totalAmount,uint256 releasedAmount,uint256 claimedAmount,uint256 installments,uint256 releasedInstallments,uint256 claimedInstallments,uint256 claimWindowSeconds))",
];

function showStudentAlert(message, success) {
  window.FrontendUtils.showAlert(studentAlert, message, success);
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

    const installmentNumber = Number(document.getElementById("claimInstallmentNumber").value);
    if (!Number.isInteger(installmentNumber) || installmentNumber < 1) {
      throw new Error("Installment number must be at least 1");
    }

    const tx = await runtime.contract.claimInstallment(installmentNumber);
    const receipt = await tx.wait();

    showStudentAlert(`Claim successful. Tx: ${receipt.hash}`, true);
    claimForm.reset();
  } catch (error) {
    showStudentAlert(error.message || "Claim failed", false);
  } finally {
    window.FrontendUtils.setButtonLoading(claimButton, false, "Claim");
  }
}

connectBtn.addEventListener("click", connectWallet);
claimForm.addEventListener("submit", submitClaim);
