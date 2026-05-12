import { expect } from "chai";
import { network } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-ethers-chai-matchers/withArgs";

describe("Feature: scholarship approval", function () {
  async function deployFixture() {
    const { ethers } = await network.create();
    const [admin, provider, student, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ScholarshipApprovalRelease");
    const contract = await Factory.connect(admin).deploy(admin.address);
    await contract.waitForDeployment();
    return { contract, admin, provider, student, outsider };
  }

  it("allows admin to approve a student with recipient amount", async function () {
    const { ethers } = await network.create();
    const { contract, admin, provider, student } = await deployFixture();
    const amount = ethers.parseEther("1");

    await expect(
      contract
        .connect(admin)
        .approveScholarship(student.address, amount, 2, 60 * 60 * 24)
    )
      .to.emit(contract, "ScholarshipApproved")
      .withArgs(student.address, amount, 2, anyValue);

    const info = await contract.getScholarship(student.address);
    expect(info.approved).to.equal(true);
    expect(info.totalAmount).to.equal(amount);
    expect(info.installments).to.equal(2n);

    const approved = await contract.isApproved(student.address);
    expect(approved).to.equal(true);

    const recipients = await contract.getApprovedStudents();
    expect(recipients).to.include(student.address);

    await expect(
      contract.connect(provider).approveScholarship(student.address, amount, 1, 60)
    ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
  });

  it("rejects invalid approval parameters", async function () {
    const { contract, admin, student } = await deployFixture();

    await expect(
      contract.connect(admin).approveScholarship(student.address, 0, 1, 60)
    ).to.be.revertedWith("Amount must be greater than zero");

    await expect(
      contract.connect(admin).approveScholarship(student.address, 1, 0, 60)
    ).to.be.revertedWith("Installments must be greater than zero");

    await expect(
      contract.connect(admin).approveScholarship(student.address, 1, 1, 0)
    ).to.be.revertedWith("Claim window must be greater than zero");
  });
});
