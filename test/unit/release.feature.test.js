import { expect } from "chai";
import { network } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-ethers-chai-matchers/withArgs";

describe("Feature: controlled fund release", function () {
  async function deployFixture() {
    const { ethers } = await network.create();
    const [admin, provider, student] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ScholarshipApprovalRelease");
    const contract = await Factory.connect(admin).deploy(admin.address);
    await contract.waitForDeployment();
    return { contract, admin, provider, student };
  }

  it("releases installments only when approved and funded", async function () {
    const { ethers } = await network.create();
    const { contract, admin, provider, student } = await deployFixture();
    const total = ethers.parseEther("2");

    await contract
      .connect(admin)
      .approveScholarship(student.address, total, 2, 60 * 60 * 24);
    await contract.connect(provider).fundScholarship({ value: total });

    await expect(contract.connect(admin).releaseInstallment(student.address, 1))
      .to.emit(contract, "InstallmentReleased")
      .withArgs(student.address, 1, ethers.parseEther("1"), anyValue);

    const afterFirst = await contract.getScholarship(student.address);
    expect(afterFirst.releasedInstallments).to.equal(1n);
    expect(afterFirst.releasedAmount).to.equal(ethers.parseEther("1"));

    await expect(contract.connect(admin).releaseInstallment(student.address, 2))
      .to.emit(contract, "InstallmentReleased")
      .withArgs(student.address, 2, ethers.parseEther("1"), anyValue);

    const afterSecond = await contract.getScholarship(student.address);
    expect(afterSecond.releasedInstallments).to.equal(2n);
    expect(afterSecond.releasedAmount).to.equal(total);
  });

  it("blocks non-admin release and over-release", async function () {
    const { ethers } = await network.create();
    const { contract, admin, provider, student } = await deployFixture();
    const total = ethers.parseEther("1");

    await contract.connect(admin).approveScholarship(student.address, total, 1, 3600);
    await contract.connect(provider).fundScholarship({ value: total });

    await expect(
      contract.connect(student).releaseInstallment(student.address, 1)
    ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");

    await contract.connect(admin).releaseInstallment(student.address, 1);
    await expect(
      contract.connect(admin).releaseInstallment(student.address, 2)
    ).to.be.revertedWith("Installment number out of range");
  });
});
