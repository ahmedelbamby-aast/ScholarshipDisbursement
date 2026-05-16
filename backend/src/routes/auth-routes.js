import { Router } from "express";
import { ethers } from "ethers";
import { AppError } from "../errors.js";
import { requireSession } from "../middleware/auth-session.js";
import { ROLES, requireRole } from "../middleware/role-auth.js";
import {
  loginUser,
  registerUser,
  listStudentUsers,
  approveStudentUser,
  issueWalletNonce,
  loginWithWallet,
} from "../services/auth-service.js";
import { parseLoginPayload, parseRegisterPayload, parseStudentId } from "../validators/auth.js";
import config from "../config.js";

const authRouter = Router();

authRouter.post("/api/auth/register", async (req, res, next) => {
  try {
    const payload = parseRegisterPayload(req.body);
    const created = await registerUser(payload);
    return res.status(201).json({ ok: true, user: created });
  } catch (error) {
    return next(normalizeError(error, "Registration failed"));
  }
});

authRouter.post("/api/auth/login", async (req, res, next) => {
  try {
    const payload = parseLoginPayload(req.body);
    const session = await loginUser(payload);
    return res.status(200).json({ ok: true, ...session });
  } catch (error) {
    return next(normalizeError(error, "Login failed"));
  }
});

authRouter.post("/api/auth/metamask/nonce", async (req, res, next) => {
  try {
    const walletAddress = String(req.body?.walletAddress || "").trim();
    if (!ethers.isAddress(walletAddress)) {
      throw new AppError("Valid wallet address is required", 400);
    }
    const message = await issueWalletNonce(walletAddress);
    return res.status(200).json({ ok: true, message });
  } catch (error) {
    return next(normalizeError(error, "Nonce request failed"));
  }
});

authRouter.post("/api/auth/metamask/login", async (req, res, next) => {
  try {
    const walletAddress = String(req.body?.walletAddress || "").trim();
    const signature = String(req.body?.signature || "");
    if (!ethers.isAddress(walletAddress) || !signature) {
      throw new AppError("Wallet address and signature are required", 400);
    }
    const session = await loginWithWallet(walletAddress, signature);
    return res.status(200).json({ ok: true, ...session });
  } catch (error) {
    return next(normalizeError(error, "MetaMask login failed"));
  }
});

authRouter.get("/api/users/students", requireSession, requireRole([ROLES.ADMIN, ROLES.AUDITOR]), async (_req, res, next) => {
  try {
    const students = await listStudentUsers();
    return res.status(200).json({ ok: true, students });
  } catch (error) {
    return next(normalizeError(error, "Students read failed"));
  }
});

authRouter.patch(
  "/api/users/students/:id/verify",
  requireSession,
  requireRole([ROLES.ADMIN]),
  async (req, res, next) => {
    try {
      const id = parseStudentId(req.params.id);
      const updated = await approveStudentUser(id);
      return res.status(200).json({ ok: true, student: updated });
    } catch (error) {
      return next(normalizeError(error, "Student verification failed"));
    }
  }
);

authRouter.get("/api/runtime/network", async (_req, res) => {
  return res.status(200).json({
    ok: true,
    networkProfile: config.networkProfile,
    chainId: config.chainId,
    contractAddress: config.contractAddress || "",
    rpcUrl: config.rpcUrl,
  });
});

function normalizeError(error, fallbackMessage) {
  if (error?.statusCode) {
    return error;
  }
  return new AppError(error?.message || fallbackMessage, 500);
}

export default authRouter;
