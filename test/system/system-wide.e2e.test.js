import { expect } from "chai";
import { network } from "hardhat";

describe("System-wide: controls and edge cases", function () {
  it("enforces access control, balances, and claim windows", async function () {
    const { ethers } = await network.create();
    const [admin, provider, student, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ScholarshipApprovalRelease");
    const contract = await Factory.connect(admin).deploy(admin.address);
    await contract.waitForDeployment();

    const totalAmount = ethers.parseEther("1");

    await expect(
      contract.connect(outsider).approveScholarship(student.address, totalAmount, 1, 60)
    ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");

    await contract.connect(admin).approveScholarship(student.address, totalAmount, 1, 60);

    await expect(contract.connect(admin).releaseInstallment(student.address, 1)).to.be.revertedWith(
      "Insufficient funded balance"
    );

    await contract.connect(provider).fundScholarship({ value: totalAmount });
    await contract.connect(admin).releaseInstallment(student.address, 1);

    const info = await contract.getInstallmentInfo(student.address, 1);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(info.claimDeadline) + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(contract.connect(student).claimInstallment(1)).to.be.revertedWith(
      "Claim window closed"
    );
  });
});
