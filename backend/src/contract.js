/**
 * Ethereum contract adapter factory/cache.
 *
 * Responsibilities:
 * - Resolves deployed contract address from metadata/env/runtime file.
 * - Creates ethers provider + signer + contract client.
 * - Caches contract instance keyed by runtime identity (RPC/chain/address/key).
 *
 * Integration boundaries:
 * - Upstream: service layer (`contract-service.js`) calls `getContract()`.
 * - Downstream: EVM JSON-RPC endpoint through `ethers.JsonRpcProvider`.
 *
 * Failure handling:
 * - Returns `null` instead of throwing when contract cannot be safely constructed.
 *   Service layer converts this to dependency-unavailable API errors.
 */
import { ethers } from "ethers";
import fs from "node:fs";
import config from "./config.js";

const CONTRACT_ABI = [
  // Keep ABI minimal to the backend call surface for deterministic runtime behavior.
  "function approveScholarship(address student,uint256 totalAmount,uint256 installments,uint256 claimWindowSeconds)",
  "function releaseInstallment(address student,uint256 installmentNumber)",
  "function fundScholarship() payable",
  "function getScholarship(address student) view returns (tuple(bool approved,uint256 totalAmount,uint256 releasedAmount,uint256 claimedAmount,uint256 installments,uint256 releasedInstallments,uint256 claimedInstallments,uint256 claimWindowSeconds))",
  "function getApprovedStudents() view returns (address[])",
  "function fundedBalance() view returns (uint256)",
  "event ScholarshipFunded(address indexed funder,uint256 amount,uint256 fundedBalance)",
  "event InstallmentReleased(address indexed student,uint256 installmentNumber,uint256 amount,uint256 claimDeadline)",
  "event InstallmentClaimed(address indexed student,uint256 installmentNumber,uint256 amount)",
];

function getContract() {
  const contractAddress = getResolvedContractAddress();

  // Null-return keeps API dependency checks centralized in service layer (503 path).
  if (!contractAddress || !config.adminPrivateKey || !ethers.isAddress(contractAddress)) {
    return null;
  }

  // Cache ties client identity to chain + signer + target contract, preventing stale reuse.
  const cacheKey = `${config.rpcUrl}|${config.chainId}|${contractAddress}|${config.adminPrivateKey}`;
  if (runtimeCache.cacheKey === cacheKey && runtimeCache.contract) {
    return runtimeCache.contract;
  }

  const provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId);
  // Wallet is bound to provider to sign admin transactions with deterministic chain context.
  const wallet = new ethers.Wallet(config.adminPrivateKey, provider);
  const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);

  runtimeCache = {
    cacheKey,
    contract,
  };

  return contract;
}

function getResolvedContractAddress() {
  const metadata = getResolvedContractMetadata();

  // Prefer deployment metadata when available to keep runtime source-of-truth explicit.
  if (metadata?.contractAddress) {
    return String(metadata.contractAddress).trim();
  }

  if (config.contractAddress) {
    return config.contractAddress;
  }

  if (config.contractAddressFile && fs.existsSync(config.contractAddressFile)) {
    const value = fs.readFileSync(config.contractAddressFile, "utf8").trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function getResolvedContractMetadata() {
  const metadataPath = config.contractMetadataFile || "";

  if (!metadataPath || !fs.existsSync(metadataPath)) {
    return null;
  }

  try {
    // Corrupt metadata should degrade gracefully to address file/env fallback.
    return JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  } catch (_error) {
    return null;
  }
}

let runtimeCache = {
  cacheKey: "",
  contract: null,
};

export { getContract, getResolvedContractMetadata };
