/**
 * Hardhat deploy script (network selected by hardhat runner flags).
 *
 * Responsibilities:
 * - Deploys `ScholarshipApprovalRelease` using current signer as contract owner/admin.
 * - Waits for deployment confirmation and logs resulting address.
 */
import hre from "hardhat";

async function main() {
  const { ethers, network } = hre;
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying to network: ${network.name}`);
  console.log(`Deploying with account: ${deployer.address}`);

  const Factory = await ethers.getContractFactory("ScholarshipApprovalRelease");
  const contract = await Factory.deploy(deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("ScholarshipApprovalRelease deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
