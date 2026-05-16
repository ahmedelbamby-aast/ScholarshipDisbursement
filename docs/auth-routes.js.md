# Diagram Title
Authentication Sequence from auth-routes.js

## Diagram Type
Sequence Diagram

## Scope
Email/password login, MetaMask nonce login, student verification endpoints.

## Verification Summary
Derived from implemented routes and called auth-service functions.

## Evidence Sources
- backend/src/routes/auth-routes.js:19-98
- backend/src/services/auth-service.js:39-120
- backend/src/repositories/user-repository.js:29-122

## Mermaid Diagram
```mermaid
sequenceDiagram
  participant C as Client
  participant R as auth-routes.js
  participant S as auth-service.js
  participant U as user-repository.js
  participant DB as PostgreSQL

  C->>R: POST /api/auth/login
  R->>S: loginUser(payload)
  S->>U: findUserByEmail(email)
  U->>DB: select app_users
  S->>U: createSession(user.id)
  U->>DB: insert app_sessions
  R-->>C: token + user

  C->>R: POST /api/auth/metamask/nonce
  R->>S: issueWalletNonce(walletAddress)
  S->>U: saveWalletNonce(...)
  U->>DB: upsert app_wallet_nonces
  R-->>C: nonce message

  C->>R: POST /api/auth/metamask/login
  R->>S: loginWithWallet(address,signature)
  S->>U: getWalletNonce + findStudentByWallet + createSession
  U->>DB: select/insert/delete nonce+session rows
  R-->>C: token + student user
```

## Confidence Level
High

## Unverified/Missing Areas
- No JWT issuance path implemented.
