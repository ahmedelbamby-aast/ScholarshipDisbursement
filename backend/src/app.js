import express from "express";
import cors from "cors";
import helmet from "helmet";
import { ethers } from "ethers";
import { getContract } from "./contract.js";
import { getSupabaseClient } from "./supabase.js";

// -----------------------------------------------------------------------------
// API structure (reference-labs identity)
// -----------------------------------------------------------------------------
// 1) Middleware baseline
// 2) Validation helpers
// 3) Contract/Supabase access helpers
// 4) Route handlers
// -----------------------------------------------------------------------------

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Shared message keeps route behavior consistent when contract client is missing.
const CONTRACT_NOT_READY_MESSAGE =
  "Contract client not configured. Set CONTRACT_ADDRESS and ADMIN_PRIVATE_KEY, and ensure RPC_URL is reachable.";

function toErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function parseApprovalPayload(body) {
  const { studentAddress, amountWei, installments, claimWindowSeconds } = body;

  if (!ethers.isAddress(studentAddress)) {
    return { error: "Invalid student address" };
  }

  const parsedAmount = BigInt(amountWei || 0);
  if (parsedAmount <= 0n) {
    return { error: "Amount must be greater than zero" };
  }

  if (!Number.isInteger(installments) || installments <= 0) {
    return { error: "Installments must be a positive integer" };
  }

  if (!Number.isInteger(claimWindowSeconds) || claimWindowSeconds <= 0) {
    return { error: "Claim window must be a positive integer" };
  }

  return {
    value: { studentAddress, parsedAmount, installments, claimWindowSeconds },
  };
}

function parseReleasePayload(body) {
  const { studentAddress, installmentNumber } = body;

  if (!ethers.isAddress(studentAddress)) {
    return { error: "Invalid student address" };
  }

  if (!Number.isInteger(installmentNumber) || installmentNumber <= 0) {
    return { error: "Installment number must be positive" };
  }

  return { value: { studentAddress, installmentNumber } };
}

function getConfiguredContractOrNull() {
  return getContract();
}

async function saveApprovalAudit(payload) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  await supabase.from("scholarship_approvals").insert(payload);
}

async function saveReleaseAudit(payload) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  await supabase.from("scholarship_releases").insert(payload);
}

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "scholarship-backend" });
});

app.post("/api/scholarships/approve", async (req, res) => {
  try {
    const parsed = parseApprovalPayload(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const { studentAddress, parsedAmount, installments, claimWindowSeconds } = parsed.value;
    const contract = getConfiguredContractOrNull();
    if (!contract) {
      return res.status(503).json({ error: CONTRACT_NOT_READY_MESSAGE });
    }

    const tx = await contract.approveScholarship(
      studentAddress,
      parsedAmount,
      installments,
      claimWindowSeconds
    );
    const receipt = await tx.wait();

    await saveApprovalAudit({
      student_address: studentAddress,
      amount_wei: parsedAmount.toString(),
      installments,
      claim_window_seconds: claimWindowSeconds,
      tx_hash: receipt.hash,
    });

    return res.status(201).json({ ok: true, txHash: receipt.hash });
  } catch (error) {
    return res.status(500).json({ error: toErrorMessage(error, "Approval failed") });
  }
});

app.post("/api/scholarships/release", async (req, res) => {
  try {
    const parsed = parseReleasePayload(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const { studentAddress, installmentNumber } = parsed.value;
    const contract = getConfiguredContractOrNull();
    if (!contract) {
      return res.status(503).json({ error: CONTRACT_NOT_READY_MESSAGE });
    }

    const tx = await contract.releaseInstallment(studentAddress, installmentNumber);
    const receipt = await tx.wait();

    await saveReleaseAudit({
      student_address: studentAddress,
      installment_number: installmentNumber,
      tx_hash: receipt.hash,
    });

    return res.status(200).json({ ok: true, txHash: receipt.hash });
  } catch (error) {
    return res.status(500).json({ error: toErrorMessage(error, "Release failed") });
  }
});

app.get("/api/scholarships/approved", async (_req, res) => {
  try {
    const contract = getConfiguredContractOrNull();
    if (!contract) {
      return res.status(503).json({ error: CONTRACT_NOT_READY_MESSAGE });
    }

    const students = await contract.getApprovedStudents();
    return res.status(200).json({ ok: true, students });
  } catch (error) {
    return res.status(500).json({ error: toErrorMessage(error, "Read failed") });
  }
});

export default app;
