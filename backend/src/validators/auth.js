import { ethers } from "ethers";
import { ValidationError } from "../errors.js";

const allowedRoles = new Set(["admin", "student", "auditor"]);

function parseRegisterPayload(body) {
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = String(body.role || "").trim().toLowerCase();
  const walletAddress = String(body.walletAddress || "").trim();

  if (!fullName) {
    throw new ValidationError("Full name is required");
  }
  if (!email || !email.includes("@")) {
    throw new ValidationError("Valid email is required");
  }
  if (password.length < 6) {
    throw new ValidationError("Password must be at least 6 characters");
  }
  if (!allowedRoles.has(role)) {
    throw new ValidationError("Role must be admin, student, or auditor");
  }
  if (role === "student") {
    if (!ethers.isAddress(walletAddress)) {
      throw new ValidationError("Valid wallet address is required for students");
    }
  } else if (walletAddress && !ethers.isAddress(walletAddress)) {
    throw new ValidationError("Wallet address must be valid when provided");
  }

  return {
    fullName,
    email,
    password,
    role,
    walletAddress,
  };
}

function parseLoginPayload(body) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) {
    throw new ValidationError("Email and password are required");
  }
  return { email, password };
}

function parseStudentId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("User id must be a positive integer");
  }
  return id;
}

export { parseRegisterPayload, parseLoginPayload, parseStudentId };
