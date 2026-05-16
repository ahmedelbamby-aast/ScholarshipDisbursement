/**
 * Authentication domain service.
 *
 * Responsibilities:
 * - Password hashing/verification and account login orchestration.
 * - Session issuance and session lookups.
 * - Wallet nonce challenge issuance and signature login validation.
 * - User verification workflows used by admin operations.
 *
 * Security considerations:
 * - Uses scrypt with per-user random salt for new registrations.
 * - Supports legacy `plain:` seeded password format for bootstrap admin account.
 * - Signature login binds signed message to one-time nonce stored in DB.
 */
import { ethers } from "ethers";
import crypto from "node:crypto";
import { AppError } from "../errors.js";
import {
  createSession,
  createUser,
  deleteWalletNonce,
  findSession,
  findStudentByWallet,
  findUserByEmail,
  findUserByWallet,
  getWalletNonce,
  listUsers,
  listStudents,
  saveWalletNonce,
  verifyStudent,
  verifyUser,
} from "../repositories/user-repository.js";

function hashPassword(password) {
  // Random salt prevents rainbow-table reuse across users with same password.
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${digest}`;
}

function verifyPassword(input, storedHash) {
  if (storedHash.startsWith("plain:")) {
    // Compatibility for bootstrap seed values; should be migrated to hashed format.
    return input === storedHash.slice(6);
  }
  const [algo, salt, digest] = storedHash.split(":");
  if (algo !== "scrypt" || !salt || !digest) {
    return false;
  }
  const inputDigest = crypto.scryptSync(input, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(inputDigest, "hex"));
}

async function registerUser(payload) {
  // Uniqueness checks are done before insert to return user-friendly conflict errors.
  const existing = await findUserByEmail(payload.email);
  if (existing) {
    throw new AppError("Email is already registered", 409);
  }
  if (payload.walletAddress) {
    const walletOwner = await findUserByWallet(payload.walletAddress);
    if (walletOwner) {
      throw new AppError("Wallet address is already registered", 409);
    }
  }
  const passwordHash = hashPassword(payload.password);
  const created = await createUser({
    fullName: payload.fullName,
    email: payload.email,
    passwordHash,
    role: payload.role,
    walletAddress: payload.walletAddress,
    isVerified: false,
  });
  return created;
}

async function loginUser(payload) {
  const user = await findUserByEmail(payload.email);
  if (!user || !verifyPassword(payload.password, user.password_hash)) {
    throw new AppError("Invalid email or password", 401);
  }
  if (!user.is_verified) {
    throw new AppError("Account pending admin verification", 403);
  }
  const session = await createSession(user.id);
  return {
    token: session.session_token,
    expiresAt: session.expires_at,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified,
      walletAddress: user.wallet_address || "",
    },
  };
}

async function getSessionByToken(token) {
  return findSession(token);
}

async function listStudentUsers() {
  return listStudents();
}

async function listAllUsers() {
  return listUsers();
}

async function approveStudentUser(studentId) {
  const updated = await verifyStudent(studentId);
  if (!updated) {
    throw new AppError("Student not found", 404);
  }
  return updated;
}

async function approveUser(userId) {
  const updated = await verifyUser(userId);
  if (!updated) {
    throw new AppError("User not found", 404);
  }
  return updated;
}

async function issueWalletNonce(walletAddress) {
  const nonce = crypto.randomBytes(12).toString("hex");
  await saveWalletNonce(walletAddress, nonce);
  return `ScholarshipDisbursement login nonce: ${nonce}`;
}

async function loginWithWallet(walletAddress, signature) {
  const nonceRow = await getWalletNonce(walletAddress);
  if (!nonceRow) {
    throw new AppError("Nonce expired or not found", 400);
  }
  const message = `ScholarshipDisbursement login nonce: ${nonceRow.nonce}`;
  const recovered = ethers.verifyMessage(message, signature);
  // Case-insensitive compare handles checksum casing differences for same address.
  if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new AppError("Invalid wallet signature", 401);
  }

  const student = await findStudentByWallet(walletAddress);
  if (!student) {
    throw new AppError("Student wallet is not registered", 404);
  }
  if (!student.is_verified) {
    throw new AppError("Student account pending admin verification", 403);
  }
  await deleteWalletNonce(walletAddress);
  const session = await createSession(student.id);
  return {
    token: session.session_token,
    expiresAt: session.expires_at,
    user: {
      id: student.id,
      fullName: student.full_name,
      email: student.email,
      role: student.role,
      isVerified: student.is_verified,
      walletAddress: student.wallet_address || "",
    },
  };
}

export {
  registerUser,
  loginUser,
  getSessionByToken,
  listStudentUsers,
  listAllUsers,
  approveStudentUser,
  approveUser,
  issueWalletNonce,
  loginWithWallet,
};
