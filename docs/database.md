# Database Architecture (Verified)

## Overview
PostgreSQL stores audit logs and application identity/session data.

## Responsibilities
- Persist scholarship approval/release audit rows.
- Persist users, sessions, and wallet nonce challenges.
- Provide query surfaces for history and student verification flows.

## Entity Relationship Diagram
```mermaid
erDiagram
  scholarship_approvals {
    bigint id PK
    timestamptz created_at
    text student_address
    text amount_wei
    int installments
    int claim_window_seconds
    text tx_hash UK
    text audit_status
    text audit_note
  }

  scholarship_releases {
    bigint id PK
    timestamptz created_at
    text student_address
    int installment_number
    text tx_hash UK
    text audit_status
    text audit_note
  }

  app_users {
    bigint id PK
    timestamptz created_at
    text full_name
    text email UK
    text password_hash
    text role
    text wallet_address
    bool is_verified
    timestamptz verified_at
  }

  app_sessions {
    bigint id PK
    timestamptz created_at
    bigint user_id FK
    text session_token UK
    timestamptz expires_at
  }

  app_wallet_nonces {
    text wallet_address PK
    text nonce
    timestamptz expires_at
  }

  app_users ||--o{ app_sessions : user_id
```

### Diagram Explanation
- `app_sessions.user_id` is the only explicit FK (`references app_users(id)`).
- `app_wallet_nonces` is keyed by wallet string; no explicit FK to users.
- Audit tables are independent and queried in parallel then merged by API.

## Internal Interactions
- Audit writes: `saveApprovalAudit`, `saveReleaseAudit`.
- Audit reads: `getAuditHistory`, `getAuditRowsForExport`.
- Auth/session: `findUserByEmail`, `createSession`, `findSession`.
- Wallet login: `saveWalletNonce`, `getWalletNonce`, `deleteWalletNonce`, `findStudentByWallet`.

## External Dependencies
- PostgreSQL via `pg` Pool.

## Data Flow
```mermaid
flowchart LR
  ApproveRelease[approve/release service calls] --> AuditRepo[audit-repository.js]
  AuditRepo --> Approvals[(scholarship_approvals)]
  AuditRepo --> Releases[(scholarship_releases)]

  AuthSvc[auth-service.js] --> UserRepo[user-repository.js]
  UserRepo --> Users[(app_users)]
  UserRepo --> Sessions[(app_sessions)]
  UserRepo --> Nonces[(app_wallet_nonces)]
```

### Diagram Explanation
- Admin chain actions write tx-backed audit rows.
- Auth uses users+sessions; MetaMask login uses nonce table.

## Failure/Error Flow
- Missing `DATABASE_URL` -> dependency unavailable error path.
- Duplicate unique keys (email/session_token/tx_hash) can reject writes.

## Security Considerations
- Passwords stored as hash format (`scrypt:*`) for registered users; seeded admin uses `plain:` bootstrap value.
- Sessions expire by `expires_at` and are validated in queries.

## Scalability Considerations
- Indexes on audit tables for `student_address` and `created_at`.
- History endpoint is paginated.

## Performance Considerations
- DB pool reuse.
- Parallel queries for approvals/releases in history and export read paths.

## Code References
- `postgres/init/001_schema.sql`
- `backend/src/repositories/audit-repository.js`
- `backend/src/repositories/user-repository.js`
- `backend/src/postgres.js`

## Sequence Diagram
```mermaid
sequenceDiagram
  participant FE as Frontend
  participant API as Express API
  participant MW as Session+RBAC Middleware
  participant SVC as Service Layer
  participant DB as PostgreSQL
  participant CH as Smart Contract
  FE->>API: HTTP request
  API->>MW: requireSession/requireRole (protected routes)
  MW->>SVC: validated authorized request
  alt DB-backed flow
    SVC->>DB: query/insert/update
    DB-->>SVC: rows/result
  else Chain-backed flow
    SVC->>CH: call/send transaction
    CH-->>SVC: read result / tx receipt
  end
  SVC-->>API: response payload
  API-->>FE: JSON/file response
```

## How this feature implemented ?

### 1. Feature Overview
Database schema is implemented in `postgres/init/001_schema.sql`. Runtime DB access is through repositories using `backend/src/postgres.js` pool.

### 2. Entry Points
```mermaid
flowchart TD
  Bootstrap[docker initdb] --> Schema[001_schema.sql]
  API[Express Services] --> Repos[repositories/*.js]
  Repos --> PG[(PostgreSQL)]
```
#### Diagram Explanation
Schema loads at container initialization; repositories execute parameterized SQL queries during runtime.

### 3. Internal Execution Flow
`auth-service.js` uses `user-repository.js`; `scholarship-service.js` uses `audit-repository.js`; export-service reads audit rows for file generation.

### 4. Architecture & Component Relationships
```mermaid
erDiagram
  app_users ||--o{ app_sessions : user_id
  scholarship_approvals {
    bigint id PK
    text tx_hash UK
  }
  scholarship_releases {
    bigint id PK
    text tx_hash UK
  }
  app_wallet_nonces {
    text wallet_address PK
  }
```
#### Diagram Explanation
Only explicit FK is `app_sessions.user_id -> app_users.id`.

### 5. Data Flow
Registration inserts user; login creates session; MetaMask login writes nonce then consumes/deletes it; approve/release append immutable tx-hash audit rows (editable status/note fields).

### 6. Feature Lifecycle
Schema init -> seed initial admin -> runtime CRUD through repositories.

### 7. Interactions With Other Features/Services
Used by auth, session middleware, audit history endpoints, export endpoints, and admin verification flow.

### 8. Use Cases
User onboarding, session tracking, audit trace persistence.

### 9. Edge Cases
Duplicate email/wallet/tx hash, missing DB URL, not-found verify/audit update targets.

### 10. Error Handling & Recovery
Repository throws are normalized by service/route layers to API errors.

### 11. Security Considerations
Parameterized queries reduce injection risk; password hash field exists but seeded admin is `plain:` bootstrap value.

### 12. Performance & Scalability
Indexes on `student_address`, `created_at`, and unique `tx_hash` improve read/query integrity.

### 13. Pros / Cons / Tradeoffs
Pros: minimal clear schema. Cons: no FK from wallet nonce to users; audit tables not relationally tied to user ids.

### 14. Known Blockers / Risks
Behavior unclear from current codebase: no migration framework/version table beyond init SQL file.

```mermaid
sequenceDiagram
  participant A as API Route
  participant S as Service
  participant R as Repository
  participant D as PostgreSQL
  A->>S: validated payload
  S->>R: db call
  R->>D: SQL query
  D-->>R: rows/result
  R-->>S: mapped result
  S-->>A: response model
```
#### Diagram Explanation
This is the actual call layering used by auth and audit services.
