# Diagram Title
Contract State Machine from ScholarshipApprovalRelease.sol

## Diagram Type
State Machine Diagram

## Scope
Lifecycle transitions enforced by contract write functions and guards.

## Verification Summary
States inferred only from explicit function guards/counters in Solidity code.

## Evidence Sources
- contracts/ScholarshipApprovalRelease.sol:103-202
- contracts/ScholarshipApprovalRelease.sol:239-273

## Mermaid Diagram
```mermaid
stateDiagram-v2
  [*] --> Unapproved
  Unapproved --> Approved: approveScholarship (onlyOwner)
  Approved --> InstallmentReleased: releaseInstallment (onlyOwner, sequential)
  InstallmentReleased --> InstallmentClaimed: claimInstallment (before claimDeadline)
  InstallmentReleased --> InstallmentRecovered: recoverExpiredInstallment (onlyOwner, after deadline)
  InstallmentRecovered --> InstallmentReleased: releaseInstallment replacement
  InstallmentClaimed --> Completed: claimedInstallments == installments
  InstallmentClaimed --> Approved: more installments pending
```

## Confidence Level
Medium-High

## Unverified/Missing Areas
- No explicit enum state variable exists; state derives from struct fields and counters.

## Sequence Diagram
```mermaid
sequenceDiagram
  participant Reader
  participant Document
  Reader->>Document: Open and read
  Document-->>Reader: Render documented content
```
