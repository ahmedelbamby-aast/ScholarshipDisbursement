import {
  approveScholarship as approveOnChain,
  getChainTelemetry as getChainTelemetryOnChain,
  getFundsMovement as getFundsMovementOnChain,
  getApprovedStudents as getApprovedStudentsOnChain,
  releaseInstallment as releaseOnChain,
} from "./contract-service.js";
import {
  getAuditHistory,
  saveApprovalAudit,
  saveReleaseAudit,
  updateAuditEntry,
} from "../repositories/audit-repository.js";
import { AppError } from "../errors.js";

async function approveScholarship(payload, txTimeoutMs) {
  const { txHash } = await approveOnChain(payload, txTimeoutMs);

  // Audit write follows confirmed tx so database never records speculative operations.
  await saveApprovalAudit({
    student_address: payload.studentAddress,
    amount_wei: payload.parsedAmount.toString(),
    installments: payload.installments,
    claim_window_seconds: payload.claimWindowSeconds,
    tx_hash: txHash,
  });

  return { txHash };
}

async function releaseInstallment(payload, txTimeoutMs) {
  const { txHash } = await releaseOnChain(payload, txTimeoutMs);

  // Release audit mirrors on-chain release semantics for operator traceability.
  await saveReleaseAudit({
    student_address: payload.studentAddress,
    installment_number: payload.installmentNumber,
    tx_hash: txHash,
  });

  return { txHash };
}

async function getApprovedStudents() {
  return getApprovedStudentsOnChain();
}

async function listAuditHistory(query) {
  return getAuditHistory(query);
}

async function editAuditEntry(type, id, payload) {
  try {
    return await updateAuditEntry(type, id, payload);
  } catch (error) {
    if (error.message === "Audit entry not found") {
      throw new AppError("Audit entry not found", 404);
    }
    throw error;
  }
}

async function getFundsMovement(days) {
  return getFundsMovementOnChain(days);
}

async function getChainTelemetry(blocks) {
  return getChainTelemetryOnChain(blocks);
}

export {
  approveScholarship,
  releaseInstallment,
  getApprovedStudents,
  listAuditHistory,
  editAuditEntry,
  getFundsMovement,
  getChainTelemetry,
};
