import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import { ethers } from "ethers";

const defaultPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const chainRpcUrl = process.env.CHAIN_RPC_URL || process.env.DOCKER_RPC_URL || "http://chain:8545";
const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY || defaultPrivateKey;
const explicitContractAddress = process.env.CONTRACT_ADDRESS || "";
const outputPath = process.env.CONTRACT_ADDRESS_FILE || "/runtime/contract-address";
const contractSourcePath = path.resolve(process.cwd(), "contracts/ScholarshipApprovalRelease.sol");

async function main() {
  await waitForRpc(chainRpcUrl, 40, 1500);

  if (explicitContractAddress) {
    writeContractAddress(explicitContractAddress);
    console.log(`Using provided contract address: ${explicitContractAddress}`);
    return;
  }

  const source = fs.readFileSync(contractSourcePath, "utf8");
  const { abi, bytecode } = compileContract(source);

  const provider = new ethers.JsonRpcProvider(chainRpcUrl, Number(process.env.CHAIN_ID || 31337));
  const wallet = new ethers.Wallet(adminPrivateKey, provider);
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  const contract = await factory.deploy(wallet.address);
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  writeContractAddress(deployedAddress);
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

async function waitForRpc(url, retries, delayMs) {
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
