/**
 * Container-friendly standalone deployer/bootstrap script.
 *
 * Responsibilities:
 * - Waits for RPC readiness to avoid startup race conditions.
 * - Either reuses explicit contract address or compiles+deploys contract with solc+ethers.
 * - Writes contract address and metadata files consumed by backend runtime.
 *
 * Failure behavior:
 * - Exits non-zero on compilation, RPC, or deployment failures.
 */
import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import { ethers } from "ethers";
import { resolveNetworkConfig } from "../config/network-profile.js";

const defaultPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const network = resolveNetworkConfig(process.env);
const chainRpcUrl =
  process.env.CHAIN_RPC_URL ||
  process.env.DOCKER_RPC_URL ||
  network.rpcUrl ||
  "http://chain:8545";
const adminPrivateKey = network.adminPrivateKey || defaultPrivateKey;
const explicitContractAddress = network.contractAddress || "";
const outputPath = process.env.CONTRACT_ADDRESS_FILE || "/runtime/contract-address";
const outputMetaPath = process.env.CONTRACT_METADATA_FILE || "/runtime/contract-metadata.json";
const contractSourcePath = path.resolve(process.cwd(), "contracts/ScholarshipApprovalRelease.sol");

async function main() {
  // Deployment is intentionally gated on RPC readiness to avoid transient startup races in Docker.
  await waitForRpc(chainRpcUrl, 40, 1500);

  if (explicitContractAddress) {
    writeContractAddress(explicitContractAddress);
    writeContractMetadata({
      contractAddress: explicitContractAddress,
      rpcUrl: chainRpcUrl,
      chainId: network.chainId,
      networkProfile: network.profile,
      source: "env",
    });
    console.log(`Using provided contract address: ${explicitContractAddress}`);
    return;
  }

  const source = fs.readFileSync(contractSourcePath, "utf8");
  const { abi, bytecode } = compileContract(source);

  const provider = new ethers.JsonRpcProvider(chainRpcUrl, network.chainId);
  const wallet = new ethers.Wallet(adminPrivateKey, provider);
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  const contract = await factory.deploy(wallet.address);
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  writeContractAddress(deployedAddress);
  writeContractMetadata({
    contractAddress: deployedAddress,
    deployer: wallet.address,
    rpcUrl: chainRpcUrl,
    chainId: network.chainId,
    networkProfile: network.profile,
    txHash: contract.deploymentTransaction()?.hash || "",
    source: "deployer",
  });
  console.log(`Deployed ScholarshipApprovalRelease to ${deployedAddress}`);
}

function compileContract(sourceCode) {
  const input = {
    language: "Solidity",
    sources: {
      "ScholarshipApprovalRelease.sol": {
        content: sourceCode,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  // Native solc compile call allows deployment without hardhat runtime in container.
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const fatalErrors = output.errors.filter((item) => item.severity === "error");
    if (fatalErrors.length > 0) {
      throw new Error(fatalErrors.map((item) => item.formattedMessage).join("\n"));
    }
  }

  const contract = output.contracts["ScholarshipApprovalRelease.sol"]["ScholarshipApprovalRelease"];
  if (!contract || !contract.evm || !contract.evm.bytecode || !contract.evm.bytecode.object) {
    throw new Error("Compilation failed to produce bytecode");
  }

  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
  };
}

function writeContractAddress(address) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${address}\n`, "utf8");
}

function writeContractMetadata(metadata) {
  fs.mkdirSync(path.dirname(outputMetaPath), { recursive: true });
  // Metadata provides backend/runtime diagnostics without requiring chain calls.
  fs.writeFileSync(
    outputMetaPath,
    JSON.stringify(
      {
        ...metadata,
        createdAt: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf8"
  );
}

async function waitForRpc(url, retries, delayMs) {
  // Bounded retry loop keeps bootstrap deterministic while tolerating short chain warm-up.
  for (let i = 0; i < retries; i += 1) {
    try {
      const provider = new ethers.JsonRpcProvider(url);
      await provider.getBlockNumber();
      return;
    } catch (_error) {
      if (i === retries - 1) {
        throw new Error(`RPC not reachable at ${url}`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
