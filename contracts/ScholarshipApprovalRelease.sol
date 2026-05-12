// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ScholarshipApprovalRelease {
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

    address public owner;
    uint256 public fundedBalance;

    mapping(address => Scholarship) private scholarships;
    mapping(address => mapping(uint256 => Installment)) private installmentRecords;

    address[] private approvedStudents;
    mapping(address => bool) private hasBeenListed;

    error OwnableUnauthorizedAccount(address account);

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert OwnableUnauthorizedAccount(msg.sender);
        }
        _;
    }

    constructor(address admin) {
        require(admin != address(0), "Admin cannot be zero address");
        owner = admin;
    }

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
        require(
            !record.approved || record.claimedInstallments == record.installments,
            "Existing active scholarship"
        );

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

    function fundScholarship() external payable {
        require(msg.value > 0, "Funding amount must be greater than zero");
        fundedBalance += msg.value;
        emit ScholarshipFunded(msg.sender, msg.value, fundedBalance);
    }

    function releaseInstallment(address student, uint256 installmentNumber) external onlyOwner {
        Scholarship storage record = scholarships[student];

        require(record.approved, "Student is not approved");
        require(installmentNumber > 0 && installmentNumber <= record.installments, "Installment number out of range");
        require(
            installmentNumber == record.releasedInstallments + 1,
            "Installments must be released in order"
        );

        uint256 releaseAmount = _calculateInstallmentAmount(record, installmentNumber);
        require(fundedBalance >= releaseAmount, "Insufficient funded balance");

        uint256 deadline = block.timestamp + record.claimWindowSeconds;
        installmentRecords[student][installmentNumber] = Installment({
            released: true,
            claimed: false,
            amount: releaseAmount,
            releasedAt: block.timestamp,
            claimDeadline: deadline
        });

        record.releasedInstallments += 1;
        record.releasedAmount += releaseAmount;
        fundedBalance -= releaseAmount;

        emit InstallmentReleased(student, installmentNumber, releaseAmount, deadline);
    }

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

        (bool sent, ) = payable(msg.sender).call{value: info.amount}("");
        require(sent, "Transfer failed");

        emit InstallmentClaimed(msg.sender, installmentNumber, info.amount);
    }

    function recoverExpiredInstallment(address student, uint256 installmentNumber) external onlyOwner {
        Installment storage info = installmentRecords[student][installmentNumber];
        require(info.released, "Installment not released");
        require(!info.claimed, "Installment already claimed");
        require(block.timestamp > info.claimDeadline, "Claim window still open");

        Scholarship storage record = scholarships[student];
        info.claimed = true;
        fundedBalance += info.amount;
        record.releasedAmount -= info.amount;
        record.releasedInstallments -= 1;

        emit ExpiredInstallmentRecovered(student, installmentNumber, info.amount);
    }

    function getScholarship(address student) external view returns (Scholarship memory) {
        return scholarships[student];
    }

    function getInstallmentInfo(
        address student,
        uint256 installmentNumber
    ) external view returns (Installment memory) {
        return installmentRecords[student][installmentNumber];
    }

    function getApprovedStudents() external view returns (address[] memory) {
        return approvedStudents;
    }

    function isApproved(address student) external view returns (bool) {
        return scholarships[student].approved;
    }

    function _calculateInstallmentAmount(
        Scholarship memory record,
        uint256 installmentNumber
    ) private pure returns (uint256) {
        if (installmentNumber == record.installments) {
            return record.totalAmount - record.releasedAmount;
        }

        return record.totalAmount / record.installments;
    }
}
