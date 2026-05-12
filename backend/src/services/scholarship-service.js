import {
  approveScholarship as approveOnChain,
  getApprovedStudents as getApprovedStudentsOnChain,
  releaseInstallment as releaseOnChain,
} from "./contract-service.js";
import { saveApprovalAudit, saveReleaseAudit } from "../repositories/audit-repository.js";

async function approveScholarship(payload, txTimeoutMs) {
  const { txHash } = await approveOnChain(payload, txTimeoutMs);

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

export { approveScholarship, releaseInstallment, getApprovedStudents };
