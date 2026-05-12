import { ethers } from "ethers";
import { ValidationError } from "../errors.js";

function parsePositiveInteger(value, fieldName) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer`);
  }
  return value;
}

function parseApprovalPayload(body) {
  const { studentAddress, amountWei, installments, claimWindowSeconds } = body;

  if (!ethers.isAddress(studentAddress)) {
    throw new ValidationError("Invalid student address");
  }

  let parsedAmount = 0n;
  try {
    parsedAmount = BigInt(amountWei || 0);
  } catch (_error) {
    throw new ValidationError("Amount must be greater than zero");
  }

  if (parsedAmount <= 0n) {
    throw new ValidationError("Amount must be greater than zero");
  }

  return {
    studentAddress,
    parsedAmount,
    installments: parsePositiveInteger(installments, "Installments"),
    claimWindowSeconds: parsePositiveInteger(claimWindowSeconds, "Claim window"),
  };
}

function parseReleasePayload(body) {
  const { studentAddress, installmentNumber } = body;

  if (!ethers.isAddress(studentAddress)) {
    throw new ValidationError("Invalid student address");
  }

  return {
    studentAddress,
    installmentNumber: parsePositiveInteger(installmentNumber, "Installment number"),
  };
}

export { parseApprovalPayload, parseReleasePayload };
