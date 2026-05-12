import { expect } from "chai";
import { network } from "hardhat";

describe("Feature: expired installment recovery", function () {
  async function deployFixture() {
    const { ethers } = await network.create();
    const [admin, provider, student, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ScholarshipApprovalRelease");
    const contract = await Factory.connect(admin).deploy(admin.address);
    await contract.waitForDeployment();
    return { contract, admin, provider, student, outsider, ethers };
  }

  it("allows admin to recover expired installment and restore funded balance", async function () {
    const { contract, admin, provider, student, ethers } = await deployFixture();
    const total = ethers.parseEther("1");

    await contract.connect(admin).approveScholarship(student.address, total, 1, 60);
    await contract.connect(provider).fundScholarship({ value: total });
    await contract.connect(admin).releaseInstallment(student.address, 1);

    // Time travel isolates expiry logic without waiting wall-clock time.
    const info = await contract.getInstallmentInfo(student.address, 1);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(info.claimDeadline) + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(contract.connect(admin).recoverExpiredInstallment(student.address, 1)).to.emit(
      contract,
      "ExpiredInstallmentRecovered"
    );

    // Recovery should undo release accounting and return funds to shared pool.
    const scholarship = await contract.getScholarship(student.address);
    expect(scholarship.releasedAmount).to.equal(0n);
    expect(scholarship.releasedInstallments).to.equal(0n);
    expect(await contract.fundedBalance()).to.equal(total);
  });

  it("blocks non-admin recovery and recovery while claim window is open", async function () {
    const { contract, admin, provider, student, outsider, ethers } = await deployFixture();
    const total = ethers.parseEther("1");

    await contract.connect(admin).approveScholarship(student.address, total, 1, 600);
    await contract.connect(provider).fundScholarship({ value: total });
    await contract.connect(admin).releaseInstallment(student.address, 1);

    await expect(
      contract.connect(outsider).recoverExpiredInstallment(student.address, 1)
    ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");

    await expect(
      contract.connect(admin).recoverExpiredInstallment(student.address, 1)
    ).to.be.revertedWith("Claim window still open");
  });
});
