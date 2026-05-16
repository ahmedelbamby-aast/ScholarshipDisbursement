/**
 * Central backend runtime configuration.
 *
 * Responsibilities:
 * - Loads `.env` values and resolves network profile specific settings.
 * - Produces a normalized config object consumed by routes/services/adapters.
 *
 * Security considerations:
 * - Contains sensitive fields (`adminPrivateKey`, `databaseUrl`); callers must not log raw values.
 * - Default local hardhat private key is only for development/test bootstrap.
 */
import dotenv from "dotenv";
import { resolveNetworkConfig } from "../../config/network-profile.js";

dotenv.config();

const defaultHardhatPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const network = resolveNetworkConfig(process.env);

const config = {
  port: Number(process.env.PORT || 4000),
  networkProfile: network.profile,
  rpcUrl: network.rpcUrl,
  contractAddress: network.contractAddress,
  contractAddressFile:
    process.env.CONTRACT_ADDRESS_FILE || `${process.cwd()}/runtime/contract-address`,
  contractMetadataFile:
    process.env.CONTRACT_METADATA_FILE || `${process.cwd()}/runtime/contract-metadata.json`,
  adminPrivateKey: network.adminPrivateKey || defaultHardhatPrivateKey,
  chainId: network.chainId,
  databaseUrl: process.env.DATABASE_URL || "",
  txTimeoutMs: Number(process.env.TX_TIMEOUT_MS || 120000),
};

export default config;
