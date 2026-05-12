import { ethers } from "ethers";
import fs from "node:fs";
import config from "./config.js";

const CONTRACT_ABI = [
  "function approveScholarship(address student,uint256 totalAmount,uint256 installments,uint256 claimWindowSeconds)",
  "function releaseInstallment(address student,uint256 installmentNumber)",
  "function fundScholarship() payable",
  "function getScholarship(address student) view returns (tuple(bool approved,uint256 totalAmount,uint256 releasedAmount,uint256 claimedAmount,uint256 installments,uint256 releasedInstallments,uint256 claimedInstallments,uint256 claimWindowSeconds))",
  "function getApprovedStudents() view returns (address[])",
];

function getContract() {
  const contractAddress = getResolvedContractAddress();

  if (!contractAddress || !config.adminPrivateKey) {
    return null;
  }

  const cacheKey = `${config.rpcUrl}|${config.chainId}|${contractAddress}|${config.adminPrivateKey}`;
  if (runtimeCache.cacheKey === cacheKey && runtimeCache.contract) {
    return runtimeCache.contract;
  }

  const provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId);
  const wallet = new ethers.Wallet(config.adminPrivateKey, provider);
  const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);

  runtimeCache = {
    cacheKey,
    contract,
  };

  return contract;
}

function getResolvedContractAddress() {
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

let runtimeCache = {
  cacheKey: "",
  contract: null,
};

export { getContract };
