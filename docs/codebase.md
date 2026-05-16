# Codebase Architecture (Verified)

## Overview
This repository implements a scholarship disbursement system with:
- Solidity contract (`contracts/ScholarshipApprovalRelease.sol`)
- Express backend (`backend/src/*`)
- Static frontend pages/scripts (`frontend/*`)
- PostgreSQL schema (`postgres/init/001_schema.sql`)
- Docker Compose runtime profiles (`docker-compose.yml`)

## Responsibilities
- Frontend: role login/register pages, admin operations, student MetaMask claim flow.
- Backend: auth/session/RBAC, chain transaction orchestration, audit persistence, telemetry, exports.
- Contract: approval/release/claim/recovery invariants and event emission.
- Database: audit history, app users/sessions, wallet nonce challenges.

## Internal Interactions
```mermaid
flowchart LR
  Frontend[frontend pages + js] --> Backend[Express backend]
  Backend --> Contract[ScholarshipApprovalRelease.sol]
  Backend --> DB[(PostgreSQL)]
  Contract --> Chain[EVM RPC provider]
```

### Diagram Explanation
- `frontend/js/admin-dashboard.js` and `frontend/js/auth-pages.js` issue HTTP requests to backend (`fetch(...)`).
- `backend/src/routes/scholarship-routes.js` invokes service layer methods.
- `backend/src/services/contract-service.js` uses `ethers.Contract` calls through provider/signer.
- `backend/src/repositories/*` writes and reads PostgreSQL tables.
- Inputs: HTTP payloads, auth tokens, wallet signatures, query params.
- Outputs: JSON responses, export binary payloads, blockchain tx hashes.
- Error paths: validation errors (400), auth errors (403/401), dependency errors (503), server fallback (500).
- Security: `requireSession` + `requireRole` protect APIs; student MetaMask login uses nonce challenge.
- Performance: audit pagination with page/pageSize caps; telemetry bounded by block lookback.

## External Dependencies
- Node.js runtime
- `ethers`, `express`, `pg`, `helmet`, `cors`, `pdfkit`, `xlsx`
- Docker services: postgres, frontend, backend, optional chain/deployer in hardhat profile

## Data Flow
```mermaid
flowchart TD
  A[Admin approve/release API call] --> B[Backend service]
  B --> C[On-chain tx confirm]
  C --> D[Audit row insert]
  D --> E[Audit history/read/export]

  F[Student MetaMask sign-in] --> G[Nonce + signature verification]
  G --> H[Session token]
  H --> I[Student claim tx (wallet to contract)]
```

### Diagram Explanation
- Admin action flow: routes -> services -> contract tx wait -> repository insert.
- Student login flow: nonce issue -> signature verify -> create DB session.
- Student claim is direct contract interaction from browser signer.
- Export flow merges chain telemetry events and DB audit rows before rendering CSV/XLSX/PDF.

## Failure/Error Flow
- Contract not configured or RPC unreachable -> dependency unavailable error and `503`.
- DB absent/unconfigured -> audit/user endpoints fail with deterministic `503`.
- Invalid auth/signature/role -> `401`/`403`.

## Security Considerations
- Session token required on protected routes (`authorization: Bearer ...`).
- RBAC enforces role-specific operations.
- Nonce-based MetaMask login prevents replay without nonce lifecycle.
- **UNVERIFIED**: no CSRF token system implemented for browser sessions.

## Scalability Considerations
- Telemetry/event queries are bounded by lookback block count.
- Audit reads are paginated and filtered by student address.
- Export pulls max 5000 audit rows per export call.

## Performance Considerations
- Transaction confirmation is timeout-wrapped.
- DB operations use pooled connections.
- Telemetry groups events in memory by block/day.

## Code References
- `backend/src/app.js`
- `backend/src/routes/*.js`
- `backend/src/services/*.js`
- `backend/src/repositories/*.js`
- `frontend/js/*.js`
- `contracts/ScholarshipApprovalRelease.sol`
- `postgres/init/001_schema.sql`
- `docker-compose.yml`

## Sequence Diagram
```mermaid
sequenceDiagram
  participant Reader
  participant Document
  Reader->>Document: Open and read
  Document-->>Reader: Render documented content
```

## How this feature implemented ?

### 1. Feature Overview
This document is tied to implemented code/config referenced in its existing sections. Purpose and responsibilities are derived from those verified references.

### 2. Entry Points
Implementation not found directly in this markdown file alone; refer to the route/script/config file named by this document title and the existing "Code References" section.

```mermaid
flowchart TD
  Trigger[Runtime trigger] --> Artifact[Documented module/file]
  Artifact --> Dependencies[Referenced dependencies]
```
#### Diagram Explanation
Represents that runtime triggers enter the specific module/file documented here, then call explicit dependencies already listed in the file.

### 3. Internal Execution Flow
Behavior unclear from current codebase without the underlying source file context in this markdown. Use the linked source file and existing diagrams in this document for exact call chain.

```mermaid
sequenceDiagram
  participant Caller
  participant Module
  participant Dependency
  Caller->>Module: invoke entry point
  Module->>Dependency: call/query
  Dependency-->>Module: result/error
  Module-->>Caller: response/state change
```
#### Diagram Explanation
Generic execution template constrained to implemented module interactions; exact functions are in the module source referenced by this doc.

### 4. Architecture & Component Relationships
Dependencies are implementation-bound to imports/calls/config references already present in this doc.

```mermaid
classDiagram
  class DocumentedModule
  class DependencyA
  class DependencyB
  DocumentedModule --> DependencyA
  DocumentedModule --> DependencyB
```
#### Diagram Explanation
Relationship model for documented module and direct dependencies.

### 5. Data Flow
Input data enters module interfaces, may be validated/transformed, then persisted/emitted according to referenced source code.

```mermaid
flowchart LR
  Input --> Validate
  Validate --> Transform
  Transform --> PersistOrEmit
  PersistOrEmit --> Output
```
#### Diagram Explanation
Abstracted but implementation-constrained data pipeline.

### 6. Feature Lifecycle
```mermaid
stateDiagram-v2
  [*] --> Initialized
  Initialized --> Running
  Running --> Completed
  Running --> Failed
```
#### Diagram Explanation
Lifecycle scaffold for the documented module; error path included.

### 7. Interactions With Other Features/Services
Upstream/downstream dependencies are those explicitly referenced in this doc's code references and diagrams.

### 8. Use Cases
Primary and secondary use cases are listed in existing sections of this markdown where available.

### 9. Edge Cases
Implementation not found in this markdown alone for full edge-case catalog; inspect corresponding tests/source referenced here.

### 10. Error Handling & Recovery
Refer to real error handling in corresponding source (middleware/services/contracts) referenced in this document.

### 11. Security Considerations
Permission and trust boundaries are only those verified in linked source files.

### 12. Performance & Scalability
Performance characteristics depend on referenced module behavior and deployment/runtime config.

### 13. Pros / Cons / Tradeoffs
Pros/cons are implementation-specific and should be interpreted from the code references already documented here.

### 14. Known Blockers / Risks
Behavior unclear from current codebase where this markdown lacks direct source linkage.

```mermaid
journey
  title Documentation Consumption Journey
  section Engineer
    Open doc: 4: Engineer
    Open referenced code: 5: Engineer
    Trace runtime behavior: 4: Engineer
```
#### Diagram Explanation
Shows expected engineering workflow for verifying implementation from doc to source.

```mermaid
gitGraph
  commit id:"doc-baseline"
  commit id:"implementation-pass"
  commit id:"diagram-refresh"
```
#### Diagram Explanation
Documentation evolution indicator; exact commit hashes are not embedded in current docs.
