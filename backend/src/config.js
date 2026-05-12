import dotenv from "dotenv";

dotenv.config();

const defaultHardhatPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const config = {
  port: Number(process.env.PORT || 4000),
  rpcUrl: process.env.RPC_URL || "http://127.0.0.1:8545",
  contractAddress: process.env.CONTRACT_ADDRESS || "",
  contractAddressFile:
    process.env.CONTRACT_ADDRESS_FILE || `${process.cwd()}/runtime/contract-address`,
  adminPrivateKey: process.env.ADMIN_PRIVATE_KEY || defaultHardhatPrivateKey,
  chainId: Number(process.env.CHAIN_ID || 31337),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  txTimeoutMs: Number(process.env.TX_TIMEOUT_MS || 120000),
};

export default config;
