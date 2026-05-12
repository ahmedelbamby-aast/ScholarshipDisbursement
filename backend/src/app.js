import express from "express";
import cors from "cors";
import helmet from "helmet";
import { ethers } from "ethers";
import { getContract } from "./contract.js";
import { getSupabaseClient } from "./supabase.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "scholarship-backend" });
});

app.post("/api/scholarships/approve", async (req, res) => {
  try {
    const { studentAddress, amountWei, installments, claimWindowSeconds } = req.body;

    if (!ethers.isAddress(studentAddress)) {
      return res.status(400).json({ error: "Invalid student address" });
    }

    const parsedAmount = BigInt(amountWei || 0);
    if (parsedAmount <= 0n) {
      return res.status(400).json({ error: "Amount must be greater than zero" });
    }

    if (!Number.isInteger(installments) || installments <= 0) {
      return res.status(400).json({ error: "Installments must be a positive integer" });
    }

    if (!Number.isInteger(claimWindowSeconds) || claimWindowSeconds <= 0) {
      return res.status(400).json({ error: "Claim window must be a positive integer" });
    }

    const contract = getContract();
    if (!contract) {
      return res.status(503).json({
        error:
          "Contract client not configured. Set CONTRACT_ADDRESS and ADMIN_PRIVATE_KEY, and ensure RPC_URL is reachable.",
      });
    }

    const tx = await contract.approveScholarship(
      studentAddress,
      parsedAmount,
      installments,
      claimWindowSeconds
    );
    const receipt = await tx.wait();

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from("scholarship_approvals").insert({
        student_address: studentAddress,
        amount_wei: parsedAmount.toString(),
        installments,
        claim_window_seconds: claimWindowSeconds,
        tx_hash: receipt.hash,
      });
    }

    return res.status(201).json({ ok: true, txHash: receipt.hash });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Approval failed" });
  }
});

app.post("/api/scholarships/release", async (req, res) => {
  try {
    const { studentAddress, installmentNumber } = req.body;

    if (!ethers.isAddress(studentAddress)) {
      return res.status(400).json({ error: "Invalid student address" });
    }

    if (!Number.isInteger(installmentNumber) || installmentNumber <= 0) {
      return res.status(400).json({ error: "Installment number must be positive" });
    }

    const contract = getContract();
    if (!contract) {
      return res.status(503).json({
        error:
          "Contract client not configured. Set CONTRACT_ADDRESS and ADMIN_PRIVATE_KEY, and ensure RPC_URL is reachable.",
      });
    }

    const tx = await contract.releaseInstallment(studentAddress, installmentNumber);
    const receipt = await tx.wait();

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from("scholarship_releases").insert({
        student_address: studentAddress,
        installment_number: installmentNumber,
        tx_hash: receipt.hash,
      });
    }

    return res.status(200).json({ ok: true, txHash: receipt.hash });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Release failed" });
  }
});

app.get("/api/scholarships/approved", async (_req, res) => {
  try {
    const contract = getContract();
    if (!contract) {
      return res.status(503).json({
        error:
          "Contract client not configured. Set CONTRACT_ADDRESS and ADMIN_PRIVATE_KEY, and ensure RPC_URL is reachable.",
      });
    }

    const students = await contract.getApprovedStudents();
    return res.status(200).json({ ok: true, students });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Read failed" });
  }
});

export default app;
