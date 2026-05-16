const apiBase = window.FrontendUtils.getApiBase();
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authAlert = document.getElementById("authAlert");

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
  const payload = {
    fullName: document.getElementById("fullName").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
    role,
    walletAddress: document.getElementById("walletAddress")?.value.trim() || "",
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
  if (role === "student") {
    show("Student registered. Wait for admin verification before login.", true);
    return;
  }
  show("Registration successful. You can now login.", true);
}

if (loginForm) {
  loginForm.addEventListener("submit", handleLogin);
}
if (registerForm) {
  registerForm.addEventListener("submit", handleRegister);
}
