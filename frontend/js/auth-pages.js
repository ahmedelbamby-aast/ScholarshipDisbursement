const apiBase = window.FrontendUtils.getApiBase();
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authAlert = document.getElementById("authAlert");
const generateWalletBtn = document.getElementById("generateWalletBtn");
const walletAddressInput = document.getElementById("walletAddress");

function show(message, success) {
  window.FrontendUtils.showAlert(authAlert, message, success);
}

async function handleLogin(event) {
  event.preventDefault();
  const role = loginForm.dataset.role;
  const payload = {
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
  };
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await window.FrontendUtils.readJson(response);
  if (!response.ok) {
    show(data.error || "Login failed", false);
    return;
  }
  if (data.user.role !== role) {
    show(`This account is role ${data.user.role}, not ${role}`, false);
    return;
  }
  window.FrontendUtils.saveSession({ token: data.token, user: data.user });
  if (role === "admin" || role === "auditor") {
    window.location.href = "admin.html";
    return;
  }
  window.location.href = "student-dashboard.html";
}

async function handleRegister(event) {
  event.preventDefault();
  const role = registerForm.dataset.role;
  const walletAddress = document.getElementById("walletAddress")?.value.trim() || "";
  if (role === "student") {
    const isAddress = /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
    if (!isAddress) {
      show("Wallet address format is invalid", false);
      return;
    }
  }
  const payload = {
    fullName: document.getElementById("fullName").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
    role,
    walletAddress,
  };
  const response = await fetch(`${apiBase}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await window.FrontendUtils.readJson(response);
  if (!response.ok) {
    show(data.error || "Registration failed", false);
    return;
  }
  show("Registration successful. Wait for admin verification before login.", true);
}

if (loginForm) {
  loginForm.addEventListener("submit", handleLogin);
}
if (registerForm) {
  registerForm.addEventListener("submit", handleRegister);
}
if (generateWalletBtn && walletAddressInput) {
  generateWalletBtn.addEventListener("click", async () => {
    try {
      if (window.ethereum && window.ethers?.BrowserProvider) {
        const provider = new window.ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        walletAddressInput.value = address;
        show("Wallet address loaded from MetaMask", true);
        return;
      }
      if (!window.ethers?.Wallet) {
        show("Wallet generator is unavailable on this page", false);
        return;
      }
      const wallet = window.ethers.Wallet.createRandom();
      walletAddressInput.value = wallet.address;
      show("Wallet address generated locally", true);
    } catch (error) {
      show(error.message || "Failed to generate wallet address", false);
    }
  });
}

async function preloadInitialAdminWallet() {
  if (!registerForm || registerForm.dataset.role !== "admin" || !walletAddressInput) {
    return;
  }
  try {
    const response = await fetch(`${apiBase}/api/runtime/admin-wallet`);
    const data = await window.FrontendUtils.readJson(response);
    if (!response.ok || !data.address) {
      return;
    }
    walletAddressInput.value = data.address;
  } catch (_error) {
    // Optional preload; silently ignore failures.
  }
}

preloadInitialAdminWallet();
