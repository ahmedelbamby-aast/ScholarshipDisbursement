// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// -----------------------------------------------------------------------------
// ScholarshipApprovalRelease Contract Structure
// -----------------------------------------------------------------------------
// 1. Data model:
//    - Scholarship tracks lifecycle totals and installment counters per student.
//    - Installment tracks per-release claim window and claim status.
//
// 2. Access model:
//    - owner is the admin account configured at deployment.
//    - onlyOwner protects approval/release/recovery operations.
//
// 3. Write operations:
//    - approveScholarship initializes a student scholarship plan.
//    - fundScholarship increases the available release pool.
//    - releaseInstallment releases one installment in strict sequence.
//    - claimInstallment lets student pull released funds within claim window.
//    - recoverExpiredInstallment reclaims expired unclaimed releases.
//
// 4. Read operations:
//    - getScholarship / getInstallmentInfo expose current state.
//    - getApprovedStudents / isApproved support roster queries.
//
// 5. Audit trail:
//    - Events are emitted for approval, funding, release, claim, and recovery.
// -----------------------------------------------------------------------------

contract ScholarshipApprovalRelease {
    // Scholarship aggregates the full lifecycle state for one student.
    struct Scholarship {
        bool approved;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 claimedAmount;
        uint256 installments;
        uint256 releasedInstallments;
        uint256 claimedInstallments;
        uint256 claimWindowSeconds;
    }

    // Installment stores one release unit and its claim deadline.
    struct Installment {
        bool released;
        bool claimed;
        uint256 amount;
        uint256 releasedAt;
        uint256 claimDeadline;
    }

    event ScholarshipApproved(
        address indexed student,
        uint256 totalAmount,
        uint256 installments,
        uint256 claimWindowSeconds
    );
    event ScholarshipFunded(address indexed funder, uint256 amount, uint256 fundedBalance);
    event InstallmentReleased(
        address indexed student,
        uint256 installmentNumber,
        uint256 amount,
        uint256 claimDeadline
    );
    event InstallmentClaimed(address indexed student, uint256 installmentNumber, uint256 amount);
    event ExpiredInstallmentRecovered(
        address indexed student,
        uint256 installmentNumber,
        uint256 amount
    );

    // The configured administrator for privileged operations.
    address public owner;
    // Funds available for future installment releases.
    uint256 public fundedBalance;

    // Student-level scholarship state.
    mapping(address => Scholarship) private scholarships;
    // Student -> installment number -> installment state.
    mapping(address => mapping(uint256 => Installment)) private installmentRecords;

    // Roster of all students ever approved at least once.
    address[] private approvedStudents;
    // Indexing guard to avoid duplicate roster entries.
    mapping(address => bool) private hasBeenListed;

    error OwnableUnauthorizedAccount(address account);

    // Privileged boundary for admin-only state changes.
    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert OwnableUnauthorizedAccount(msg.sender);
        }
        _;
    }

    // Admin is fixed at deployment and cannot be zero address.
    constructor(address admin) {
        require(admin != address(0), "Admin cannot be zero address");
        owner = admin;
    }

    // Approve or re-approve a student after prior scholarship completion.
    function approveScholarship(
        address student,
        uint256 totalAmount,
        uint256 installments,
        uint256 claimWindowSeconds
    ) external onlyOwner {
        require(student != address(0), "Student cannot be zero address");
        require(totalAmount > 0, "Amount must be greater than zero");
        require(installments > 0, "Installments must be greater than zero");
        require(claimWindowSeconds > 0, "Claim window must be greater than zero");

        Scholarship storage record = scholarships[student];
        require(!_isScholarshipActive(record), "Existing active scholarship");

        scholarships[student] = Scholarship({
            approved: true,
            totalAmount: totalAmount,
            releasedAmount: 0,
            claimedAmount: 0,
            installments: installments,
            releasedInstallments: 0,
            claimedInstallments: 0,
            claimWindowSeconds: claimWindowSeconds
        });

        if (!hasBeenListed[student]) {
            approvedStudents.push(student);
            hasBeenListed[student] = true;
        }

        emit ScholarshipApproved(student, totalAmount, installments, claimWindowSeconds);
    }

    // Any account can fund the shared release pool.
    function fundScholarship() external payable {
        require(msg.value > 0, "Funding amount must be greater than zero");
        fundedBalance += msg.value;
        emit ScholarshipFunded(msg.sender, msg.value, fundedBalance);
    }

    // Release next installment in strict order, reserving funds from pool.
    function releaseInstallment(address student, uint256 installmentNumber) external onlyOwner {
        Scholarship storage record = scholarships[student];

        require(record.approved, "Student is not approved");
        _validateInstallmentNumber(record, installmentNumber);
        require(
            installmentNumber == record.releasedInstallments + 1,
            "Installments must be released in order"
        );

        uint256 releaseAmount = _calculateInstallmentAmount(record, installmentNumber);
        require(fundedBalance >= releaseAmount, "Insufficient funded balance");

        uint256 deadline = block.timestamp + record.claimWindowSeconds;
        _recordInstallmentRelease(student, installmentNumber, releaseAmount, deadline);
        _applyReleaseToScholarship(record, releaseAmount);

        emit InstallmentReleased(student, installmentNumber, releaseAmount, deadline);
    }

    // Student pulls released funds before claim deadline.
    function claimInstallment(uint256 installmentNumber) external {
        Scholarship storage record = scholarships[msg.sender];
        require(record.approved, "Student is not approved");

        Installment storage info = installmentRecords[msg.sender][installmentNumber];
        require(info.released, "Installment not released");
        require(!info.claimed, "Installment already claimed");
        require(block.timestamp <= info.claimDeadline, "Claim window closed");

        info.claimed = true;
        record.claimedInstallments += 1;
        record.claimedAmount += info.amount;

        // Pull-payment uses call to support receiver wallet variations while reverting on failure.
        (bool sent, ) = payable(msg.sender).call{value: info.amount}("");
        require(sent, "Transfer failed");

        emit InstallmentClaimed(msg.sender, installmentNumber, info.amount);
    }

    // Admin can recover expired unreclaimed installment and return it to pool.
    function recoverExpiredInstallment(address student, uint256 installmentNumber) external onlyOwner {
        Installment storage info = installmentRecords[student][installmentNumber];
        require(info.released, "Installment not released");
        require(!info.claimed, "Installment already claimed");
        require(block.timestamp > info.claimDeadline, "Claim window still open");

        Scholarship storage record = scholarships[student];
        // Mark claimed to block any later claim/recovery re-entry on this installment slot.
        info.claimed = true;
        fundedBalance += info.amount;
        // Recovery intentionally reopens sequence so admin can release a replacement installment.
        record.releasedAmount -= info.amount;
        record.releasedInstallments -= 1;

        emit ExpiredInstallmentRecovered(student, installmentNumber, info.amount);
    }

    // Read full scholarship state for one student.
    function getScholarship(address student) external view returns (Scholarship memory) {
        return scholarships[student];
    }

    // Read one installment state for one student.
    function getInstallmentInfo(
        address student,
        uint256 installmentNumber
    ) external view returns (Installment memory) {
        return installmentRecords[student][installmentNumber];
    }

    // Read roster of approved students.
    function getApprovedStudents() external view returns (address[] memory) {
        return approvedStudents;
    }

    // Quick approval status helper.
    function isApproved(address student) external view returns (bool) {
        return scholarships[student].approved;
    }

    // Last installment receives remainder to preserve exact total amount.
    function _calculateInstallmentAmount(
        Scholarship memory record,
        uint256 installmentNumber
    ) private pure returns (uint256) {
        if (installmentNumber == record.installments) {
            return record.totalAmount - record.releasedAmount;
        }

        return record.totalAmount / record.installments;
    }

    function _isScholarshipActive(Scholarship storage record) private view returns (bool) {
        // Active means approval exists and lifecycle hasn't reached full claim completion yet.
        return record.approved && record.claimedInstallments != record.installments;
    }

    function _validateInstallmentNumber(
        Scholarship storage record,
        uint256 installmentNumber
    ) private view {
        require(
            installmentNumber > 0 && installmentNumber <= record.installments,
            "Installment number out of range"
        );
    }

    function _recordInstallmentRelease(
        address student,
        uint256 installmentNumber,
        uint256 amount,
        uint256 deadline
    ) private {
        installmentRecords[student][installmentNumber] = Installment({
            released: true,
            claimed: false,
            amount: amount,
            releasedAt: block.timestamp,
            claimDeadline: deadline
        });
    }

    function _applyReleaseToScholarship(Scholarship storage record, uint256 releaseAmount) private {
        record.releasedInstallments += 1;
        record.releasedAmount += releaseAmount;
        fundedBalance -= releaseAmount;
    }
}
