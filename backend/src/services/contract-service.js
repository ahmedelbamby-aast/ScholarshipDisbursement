import { getContract } from "../contract.js";
import { CONTRACT_NOT_READY_MESSAGE } from "../constants.js";
import { DependencyUnavailableError } from "../errors.js";

function getContractOrThrow() {
  const contract = getContract();
  if (!contract) {
    throw new DependencyUnavailableError(CONTRACT_NOT_READY_MESSAGE);
  }
  return contract;
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timer = null;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

async function approveScholarship(payload, txTimeoutMs) {
  const contract = getContractOrThrow();
  const tx = await contract.approveScholarship(
    payload.studentAddress,
    payload.parsedAmount,
    payload.installments,
    payload.claimWindowSeconds
  );
  const receipt = await withTimeout(tx.wait(), txTimeoutMs, "Approval transaction confirmation timed out");
  return { txHash: receipt.hash };
}

async function releaseInstallment(payload, txTimeoutMs) {
  const contract = getContractOrThrow();
  const tx = await contract.releaseInstallment(payload.studentAddress, payload.installmentNumber);
  const receipt = await withTimeout(tx.wait(), txTimeoutMs, "Release transaction confirmation timed out");
  return { txHash: receipt.hash };
}

async function getApprovedStudents() {
  const contract = getContractOrThrow();
  return contract.getApprovedStudents();
}

export { approveScholarship, releaseInstallment, getApprovedStudents };
