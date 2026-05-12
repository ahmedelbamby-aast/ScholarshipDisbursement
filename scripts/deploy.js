import { network } from "hardhat";

async function main() {
  const { ethers } = await network.create();
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

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
