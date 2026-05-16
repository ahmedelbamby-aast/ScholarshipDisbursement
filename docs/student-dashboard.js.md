# Diagram Title
Student Wallet Flow from student-dashboard.js

## Diagram Type
Sequence Diagram

## Scope
MetaMask connect, nonce-sign login, claim transaction.

## Verification Summary
All steps from direct fetch/RPC/sign/contract calls.

## Evidence Sources
- frontend/js/student-dashboard.js:100-143
- frontend/js/student-dashboard.js:166-188
- frontend/js/student-dashboard.js:190-215
- backend/src/routes/auth-routes.js:39-64

## Mermaid Diagram
```mermaid
sequenceDiagram
  participant U as Student Browser
  participant MM as MetaMask
  participant API as Backend API
  participant SC as Scholarship Contract

  U->>MM: eth_requestAccounts
  U->>API: GET /api/runtime/network
  U->>API: POST /api/auth/metamask/nonce
  API-->>U: nonce message
  U->>MM: signMessage(nonce message)
  U->>API: POST /api/auth/metamask/login
  API-->>U: session token
  U->>SC: claimInstallment(installmentNumber)
  SC-->>U: tx receipt hash
```

## Confidence Level
High

## Unverified/Missing Areas
- No backend endpoint writes claim rows to PostgreSQL audit tables.
