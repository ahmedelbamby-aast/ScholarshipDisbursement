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
  getWalletNonce,
  listStudents,
  saveWalletNonce,
  verifyStudent,
} from "../repositories/user-repository.js";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${digest}`;
}

function verifyPassword(input, storedHash) {
  if (storedHash.startsWith("plain:")) {
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
  const existing = await findUserByEmail(payload.email);
  if (existing) {
    throw new AppError("Email is already registered", 409);
  }
  const passwordHash = hashPassword(payload.password);
  const created = await createUser({
    fullName: payload.fullName,
    email: payload.email,
    passwordHash,
    role: payload.role,
    walletAddress: payload.walletAddress,
    isVerified: payload.role === "student" ? false : true,
  });
  return created;
}

async function loginUser(payload) {
  const user = await findUserByEmail(payload.email);
  if (!user || !verifyPassword(payload.password, user.password_hash)) {
    throw new AppError("Invalid email or password", 401);
  }
  if (user.role === "student" && !user.is_verified) {
    throw new AppError("Student account pending admin verification", 403);
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

async function approveStudentUser(studentId) {
  const updated = await verifyStudent(studentId);
  if (!updated) {
    throw new AppError("Student not found", 404);
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
  approveStudentUser,
  issueWalletNonce,
  loginWithWallet,
};
