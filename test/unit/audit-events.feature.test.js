import { expect } from "chai";
import { network } from "hardhat";

describe("Feature: audit event log", function () {
  it("emits events for approval, funding, release, and claim", async function () {
    // Event assertions preserve off-chain observability contract for indexers/backoffice tools.
    const { ethers } = await network.create();
    const [admin, provider, student] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ScholarshipApprovalRelease");
    const contract = await Factory.connect(admin).deploy(admin.address);
    await contract.waitForDeployment();

    const amount = ethers.parseEther("1");
    await expect(contract.connect(admin).approveScholarship(student.address, amount, 1, 3600)).to.emit(
      contract,
      "ScholarshipApproved"
    );

    await expect(contract.connect(provider).fundScholarship({ value: amount })).to.emit(
      contract,
      "ScholarshipFunded"
    );

    await expect(contract.connect(admin).releaseInstallment(student.address, 1)).to.emit(
      contract,
      "InstallmentReleased"
    );

    await expect(contract.connect(student).claimInstallment(1)).to.emit(
      contract,
      "InstallmentClaimed"
    );
  });
});
