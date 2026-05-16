import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatEthersChaiMatchers from "@nomicfoundation/hardhat-ethers-chai-matchers";
import hardhatMocha from "@nomicfoundation/hardhat-mocha";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";
import { resolveNetworkConfig } from "./config/network-profile.js";

const network = resolveNetworkConfig(process.env);
const dockerRpcUrl = process.env.DOCKER_RPC_URL || network.rpcUrl || "http://127.0.0.1:8545";
const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL || "";
const sepoliaKey = process.env.SEPOLIA_ADMIN_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY || "";
const sepoliaAccounts = sepoliaKey ? [sepoliaKey] : [];
const networks = {
  docker: {
    type: "http",
    chainType: "l1",
    url: dockerRpcUrl,
  },
};

if (sepoliaRpcUrl) {
  networks.sepolia = {
    type: "http",
    chainType: "l1",
    url: sepoliaRpcUrl,
    accounts: sepoliaAccounts,
  };
}

export default {
  plugins: [
    hardhatEthers,
    hardhatEthersChaiMatchers,
    hardhatMocha,
    hardhatNetworkHelpers,
  ],
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
  },
  networks,
};
