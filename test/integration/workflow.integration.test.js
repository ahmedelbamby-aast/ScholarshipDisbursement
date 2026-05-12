import { expect } from "chai";
import { network } from "hardhat";

describe("Integration: scholarship workflow", function () {
  it("handles full workflow from approval to final claim", async function () {
    // Integration path validates combined state transitions rather than single revert conditions.
    const { ethers } = await network.create();
    const [admin, provider, student] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ScholarshipApprovalRelease");
    const contract = await Factory.connect(admin).deploy(admin.address);
    await contract.waitForDeployment();

    const totalAmount = ethers.parseEther("3");

    await contract
      .connect(admin)
      .approveScholarship(student.address, totalAmount, 3, 60 * 60 * 24);
    await contract.connect(provider).fundScholarship({ value: totalAmount });

    await contract.connect(admin).releaseInstallment(student.address, 1);
    await contract.connect(student).claimInstallment(1);

    await contract.connect(admin).releaseInstallment(student.address, 2);
    await contract.connect(student).claimInstallment(2);

    await contract.connect(admin).releaseInstallment(student.address, 3);
    await contract.connect(student).claimInstallment(3);

    const scholarship = await contract.getScholarship(student.address);
    expect(scholarship.releasedInstallments).to.equal(3n);
    expect(scholarship.claimedInstallments).to.equal(3n);
    expect(scholarship.releasedAmount).to.equal(totalAmount);
    expect(scholarship.claimedAmount).to.equal(totalAmount);
  });
});
