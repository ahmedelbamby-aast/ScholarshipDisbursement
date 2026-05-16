/**
 * Blockchain service adapter for scholarship workflows.
 *
 * Responsibilities:
 * - Executes admin-write transactions (approve/release) with confirmation timeout.
 * - Reads event-based telemetry and funds movement data.
 * - Provides backward-compatible fallbacks for older contract deployments that may
 *   not expose newer optional view methods.
 *
 * Performance considerations:
 * - Telemetry/funds endpoints batch event queries with `Promise.all`.
 * - Day/block aggregation is done in-memory; lookback windows are bounded upstream.
 */
import { getContract } from "../contract.js";
import { CONTRACT_NOT_READY_MESSAGE } from "../constants.js";
import { DependencyUnavailableError } from "../errors.js";

function getContractOrThrow() {
  const contract = getContract();
  if (!contract) {
    // Route layer expects dependency failures to map to 503.
    throw new DependencyUnavailableError(CONTRACT_NOT_READY_MESSAGE);
  }
  return contract;
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timer = null;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  // Timeout guards avoid indefinitely hanging API requests on slow chain confirmations.
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
  return readApprovedStudentsSafe(contract);
}

function toDayKey(unixSeconds) {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

async function getFundsMovement(days) {
  const contract = getContractOrThrow();
  const provider = contract.runner?.provider;
  if (!provider) {
    throw new DependencyUnavailableError(CONTRACT_NOT_READY_MESSAGE);
  }

  const latestBlock = await provider.getBlock("latest");
  const latestNumber = Number(latestBlock?.number || 0);
  // Approximate block/day ratio for local testnets; minimum avoids empty windows.
  const lookbackBlocks = Math.max(500, days * 7200);
  const fromBlock = Math.max(0, latestNumber - lookbackBlocks);

  const [fundedEvents, releasedEvents, claimedEvents] = await Promise.all([
    contract.queryFilter(contract.filters.ScholarshipFunded(), fromBlock, latestNumber),
    contract.queryFilter(contract.filters.InstallmentReleased(), fromBlock, latestNumber),
    contract.queryFilter(contract.filters.InstallmentClaimed(), fromBlock, latestNumber),
  ]);

  const movementByDay = new Map();

  async function addEventAmount(eventList, bucketField, amountIndex) {
    // Block timestamps are resolved per event to build day buckets for charting.
    for (const item of eventList) {
      const block = await provider.getBlock(item.blockNumber);
      const day = toDayKey(Number(block.timestamp));
      const current = movementByDay.get(day) || {
        day,
        fundedWei: "0",
        releasedWei: "0",
        claimedWei: "0",
      };
      const amount = BigInt(item.args?.[amountIndex] || 0n);
      current[bucketField] = (BigInt(current[bucketField]) + amount).toString();
      movementByDay.set(day, current);
    }
  }

  await addEventAmount(fundedEvents, "fundedWei", 1);
  await addEventAmount(releasedEvents, "releasedWei", 2);
  await addEventAmount(claimedEvents, "claimedWei", 2);

  const rows = Array.from(movementByDay.values()).sort((a, b) => a.day.localeCompare(b.day));
  return {
    days,
    points: rows,
  };
}

async function getChainTelemetry(lookbackBlocks) {
  const contract = getContractOrThrow();
  const provider = contract.runner?.provider;
  if (!provider) {
    throw new DependencyUnavailableError(CONTRACT_NOT_READY_MESSAGE);
  }

  const latestBlock = await provider.getBlock("latest");
  const latestNumber = Number(latestBlock?.number || 0);
  const fromBlock = Math.max(0, latestNumber - lookbackBlocks);

  const [fundedEvents, releasedEvents, claimedEvents, fundedBalance, approvedStudents] = await Promise.all([
    contract.queryFilter(contract.filters.ScholarshipFunded(), fromBlock, latestNumber),
    contract.queryFilter(contract.filters.InstallmentReleased(), fromBlock, latestNumber),
    contract.queryFilter(contract.filters.InstallmentClaimed(), fromBlock, latestNumber),
    readFundedBalanceSafe(contract),
    readApprovedStudentsSafe(contract),
  ]);

  // Normalize event families into one sorted stream to compute totals and per-block view.
  const allEvents = [
    ...fundedEvents.map((ev) => ({ type: "funded", ev, amount: BigInt(ev.args?.[1] || 0n) })),
    ...releasedEvents.map((ev) => ({ type: "released", ev, amount: BigInt(ev.args?.[2] || 0n) })),
    ...claimedEvents.map((ev) => ({ type: "claimed", ev, amount: BigInt(ev.args?.[2] || 0n) })),
  ].sort((a, b) => Number(a.ev.blockNumber) - Number(b.ev.blockNumber));

  const totals = {
    fundedWei: "0",
    releasedWei: "0",
    claimedWei: "0",
  };
  const byBlock = new Map();

  for (const item of allEvents) {
    if (item.type === "funded") totals.fundedWei = (BigInt(totals.fundedWei) + item.amount).toString();
    if (item.type === "released") totals.releasedWei = (BigInt(totals.releasedWei) + item.amount).toString();
    if (item.type === "claimed") totals.claimedWei = (BigInt(totals.claimedWei) + item.amount).toString();

    const key = Number(item.ev.blockNumber);
    const row = byBlock.get(key) || { blockNumber: key, fundedWei: "0", releasedWei: "0", claimedWei: "0" };
    if (item.type === "funded") row.fundedWei = (BigInt(row.fundedWei) + item.amount).toString();
    if (item.type === "released") row.releasedWei = (BigInt(row.releasedWei) + item.amount).toString();
    if (item.type === "claimed") row.claimedWei = (BigInt(row.claimedWei) + item.amount).toString();
    byBlock.set(key, row);
  }

  const recentEvents = allEvents.slice(-25).reverse().map((item) => ({
    type: item.type,
    txHash: item.ev.transactionHash,
    blockNumber: Number(item.ev.blockNumber),
    amountWei: item.amount.toString(),
  }));

  return {
    latestBlock: latestNumber,
    fromBlock,
    lookbackBlocks,
    fundedBalanceWei: fundedBalance.toString(),
    approvedStudentsCount: approvedStudents.length,
    totals,
    byBlock: Array.from(byBlock.values()).sort((a, b) => a.blockNumber - b.blockNumber),
    recentEvents,
  };
}

async function readFundedBalanceSafe(contract) {
  try {
    const value = await contract.fundedBalance();
    return BigInt(value || 0n);
  } catch (error) {
    // Backward compatibility: older deployments may not implement fundedBalance().
    const message = String(error?.message || "");
    const isMissingMethod =
      message.includes("BAD_DATA") ||
      message.includes("could not decode result data") ||
      message.includes("is not a function");
    if (isMissingMethod) {
      return 0n;
    }
    throw error;
  }
}

async function readApprovedStudentsSafe(contract) {
  try {
    const values = await contract.getApprovedStudents();
    return Array.isArray(values) ? values : [];
  } catch (error) {
    // Backward compatibility: older deployments may not implement getApprovedStudents().
    const message = String(error?.message || "");
    const isMissingMethod =
      message.includes("BAD_DATA") ||
      message.includes("could not decode result data") ||
      message.includes("is not a function");
    if (isMissingMethod) {
      return [];
    }
    throw error;
  }
}

export { approveScholarship, releaseInstallment, getApprovedStudents, getFundsMovement, getChainTelemetry };
