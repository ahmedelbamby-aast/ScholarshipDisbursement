const SUPPORTED_PROFILES = new Set(["hardhat", "sepolia"]);

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveNetworkProfile(rawProfile) {
  const profile = String(rawProfile || "hardhat").trim().toLowerCase();
  return SUPPORTED_PROFILES.has(profile) ? profile : "hardhat";
}

function resolveNetworkConfig(env) {
  const profile = resolveNetworkProfile(env.NETWORK_PROFILE);
  const upper = profile.toUpperCase();

  const rpcUrl =
    env[`${upper}_RPC_URL`] ||
    env.RPC_URL ||
    (profile === "sepolia" ? "https://sepolia.infura.io/v3/CHANGE_ME" : "http://127.0.0.1:8545");

  const chainId = toNumber(
    env[`${upper}_CHAIN_ID`] || env.CHAIN_ID,
    profile === "sepolia" ? 11155111 : 31337
  );

  const contractAddress = env[`${upper}_CONTRACT_ADDRESS`] || env.CONTRACT_ADDRESS || "";
  const adminPrivateKey = env[`${upper}_ADMIN_PRIVATE_KEY`] || env.ADMIN_PRIVATE_KEY || "";

  return {
    profile,
    rpcUrl,
    chainId,
    contractAddress,
    adminPrivateKey,
  };
}

export { resolveNetworkConfig, resolveNetworkProfile };
