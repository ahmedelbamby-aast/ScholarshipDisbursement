import {
  approveScholarship as approveOnChain,
  getApprovedStudents as getApprovedStudentsOnChain,
  releaseInstallment as releaseOnChain,
} from "./contract-service.js";
import { getAuditHistory, saveApprovalAudit, saveReleaseAudit } from "../repositories/audit-repository.js";

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

export { approveScholarship, releaseInstallment, getApprovedStudents, listAuditHistory };
