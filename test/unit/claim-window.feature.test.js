import { expect } from "chai";
import { network } from "hardhat";

describe("Feature: claim window", function () {
  async function deployFixture() {
    const { ethers } = await network.create();
    const [admin, provider, student] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ScholarshipApprovalRelease");
    const contract = await Factory.connect(admin).deploy(admin.address);
    await contract.waitForDeployment();
    return { contract, admin, provider, student };
  }

  it("allows claim within window and blocks outside window", async function () {
    const { ethers } = await network.create();
    const { contract, admin, provider, student } = await deployFixture();
    const total = ethers.parseEther("1");

    await contract.connect(admin).approveScholarship(student.address, total, 1, 60);
    await contract.connect(provider).fundScholarship({ value: total });
    await contract.connect(admin).releaseInstallment(student.address, 1);

    await expect(contract.connect(student).claimInstallment(1)).to.emit(
      contract,
      "InstallmentClaimed"
    );

    // Explicitly moves chain time beyond deadline to verify closure behavior.
    const { timestamp } = await ethers.provider.getBlock("latest");
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(timestamp) + 120]);
    await ethers.provider.send("evm_mine", []);

    await expect(contract.connect(student).claimInstallment(1)).to.be.revertedWith(
      "Installment already claimed"
    );
  });
});
