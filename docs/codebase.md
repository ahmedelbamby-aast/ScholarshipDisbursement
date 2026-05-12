# ScholarshipDisbursement Codebase

## 1) Repository Overview
This repository implements a scholarship approval and installment-disbursement system with:
- A Solidity smart contract for approval, funding, release, claim, and expired-claim recovery.
- A Node/Express backend exposing admin APIs that call the contract and optionally persist audit records in Supabase.
- Static frontend pages for admin and student interactions.
- Local/Docker runtime orchestration for chain + deployer + backend + frontend.
- Multi-layer tests (unit feature, integration, system/e2e, backend API, frontend structure).

## 2) Top-Level Structure
- `contracts/`: on-chain source (`ScholarshipApprovalRelease.sol`).
- `backend/src/`: backend app, contract adapter, config, Supabase adapter, server bootstrap.
- `scripts/`: deployment scripts for local Hardhat and Docker deployer flow.
- `test/`: smart contract + API + frontend tests.
- `supabase/`: SQL schema for approval/release audit tables.
- `types/ethers-contracts/`: generated ethers typings/factories.
- `chain/`, `deployer/`, `backend/` Dockerfiles + root `Dockerfile`: containerized services.
- `frontend/index.html`, `frontend/admin.html`, `frontend/student-dashboard.html`: UI pages.
- `frontend/js/admin-dashboard.js`, `frontend/js/student-dashboard.js`: frontend behavior scripts.
- `server.js`: static frontend host.
- `docker-compose.yml`: full stack orchestration.
- `reference Labs/`: lab/reference materials, separate from main runtime path.

## 3) Runtime Architecture
```mermaid
flowchart LR
  A[Admin UI\nfrontend/admin.html] -->|POST /api/scholarships/approve| B[Backend API\nExpress]
  A -->|POST /api/scholarships/release| B
  S[Student UI\nfrontend/student-dashboard.html] -->|Claim via MetaMask| C[Contract ScholarshipApprovalRelease]
  B -->|ethers Wallet\nADMIN_PRIVATE_KEY| C
  P[Provider/Funder] -->|fundScholarship payable| C
  B -->|optional inserts| D[(Supabase)]
  C -->|events| E[Audit Trail\nOn-chain logs]
```

## 4) Docker Deployment Topology
```mermaid
flowchart TB
  subgraph Compose
    CH[chain service\nGanache :8545]
    DP[deployer service\nnode scripts/deployer.js]
    BE[backend service\n:4000]
    FE[frontend service\n:3300]
    RT[(runtime_data volume\n/runtime/contract-address)]
  end

  CH --> DP
  DP --> RT
  RT --> BE
  CH --> BE
  BE --> FE
```

## 5) Main Data Model (Contract)
### Contract: `contracts/ScholarshipApprovalRelease.sol`
Core state:
- `owner`: admin address (only approver/releaser/recoverer).
- `fundedBalance`: available pooled contract funds for release.
- `scholarships[student]`: scholarship-level state.
- `installmentRecords[student][n]`: installment-level release/claim/deadline state.
- `approvedStudents[]` + `hasBeenListed`: list/indexing support.

### Structs
- `Scholarship`: approval status, total/released/claimed amounts, installment counts, claim window seconds.
- `Installment`: released/claimed flags, amount, release time, claim deadline.

### Rules
- Only owner can approve/release/recover expired installments.
- Installments must be released strictly in order.
- Claim must occur before deadline.
- Final installment uses remainder math to avoid division truncation loss.

```mermaid
classDiagram
  class ScholarshipApprovalRelease {
    +owner: address
    +fundedBalance: uint256
    +approveScholarship(student,total,installments,window)
    +fundScholarship() payable
    +releaseInstallment(student,installmentNo)
    +claimInstallment(installmentNo)
    +recoverExpiredInstallment(student,installmentNo)
    +getScholarship(student)
    +getInstallmentInfo(student,installmentNo)
    +getApprovedStudents()
    +isApproved(student)
  }

  class Scholarship {
    +approved: bool
    +totalAmount: uint256
    +releasedAmount: uint256
    +claimedAmount: uint256
    +installments: uint256
    +releasedInstallments: uint256
    +claimedInstallments: uint256
    +claimWindowSeconds: uint256
  }

  class Installment {
    +released: bool
    +claimed: bool
    +amount: uint256
    +releasedAt: uint256
    +claimDeadline: uint256
  }

  ScholarshipApprovalRelease --> Scholarship : scholarships[student]
  ScholarshipApprovalRelease --> Installment : installmentRecords[student][n]
```

## 6) API Surface (Backend)
### Files
- `backend/src/app.js`: routes + validation + contract calls + optional Supabase insert.
- `backend/src/contract.js`: ethers contract client, address resolution from env/file.
- `backend/src/config.js`: env-backed config + defaults.
- `backend/src/supabase.js`: optional client creation.
- `backend/src/server.js`: starts backend listener.

### Endpoints
- `GET /api/health`
- `POST /api/scholarships/approve`
- `POST /api/scholarships/release`
- `GET /api/scholarships/approved`

```mermaid
sequenceDiagram
  participant Admin as Admin UI
  participant API as Backend API
  participant ETH as Contract (ethers signer)
  participant DB as Supabase

  Admin->>API: POST /api/scholarships/approve
  API->>API: Validate address/amount/installments/window
  API->>ETH: approveScholarship(...)
  ETH-->>API: tx receipt
  API->>DB: insert scholarship_approvals (optional)
  API-->>Admin: 201 {ok, txHash}
```

## 7) Frontend Code Paths
- `frontend/index.html`: landing links.
- `frontend/admin.html`: submit approval/release forms to backend.
- `frontend/student-dashboard.html`: MetaMask connect + direct claim transaction (`claimInstallment`) using `window.CONTRACT_ADDRESS`.
- `frontend/js/admin-dashboard.js`: admin form wiring + API calls + status rendering.
- `frontend/js/student-dashboard.js`: wallet connect + claim flow + status rendering.
- `server.js`: serves static files and `/health`.

```mermaid
stateDiagram-v2
  [*] --> Disconnected
  Disconnected --> Connected: Connect Wallet
  Connected --> ContractReady: CONTRACT_ADDRESS present
  Connected --> Error: missing CONTRACT_ADDRESS
  ContractReady --> ClaimPending: Submit claim
  ClaimPending --> Claimed: tx mined
  ClaimPending --> Error: revert / RPC error
  Error --> Connected: retry
```

## 8) Database Schema (Supabase)
`supabase/schema.sql` defines two audit tables:
- `scholarship_approvals`
- `scholarship_releases`

```mermaid
erDiagram
  scholarship_approvals {
    bigint id PK
    timestamptz created_at
    text student_address
    text amount_wei
    int installments
    int claim_window_seconds
    text tx_hash
  }

  scholarship_releases {
    bigint id PK
    timestamptz created_at
    text student_address
    int installment_number
    text tx_hash
  }

  scholarship_approvals ||--o{ scholarship_releases : student_address
```

## 9) Smart Contract Workflow
```mermaid
flowchart TD
  A[Admin approveScholarship] --> B[Provider fundScholarship]
  B --> C[Admin releaseInstallment #1]
  C --> D{Student claims\nbefore deadline?}
  D -- Yes --> E[claimInstallment #1]
  D -- No --> F[Admin recoverExpiredInstallment #1]
  E --> G{More installments?}
  F --> G
  G -- Yes --> H[Release next installment]
  H --> D
  G -- No --> I[Workflow complete]
```

## 10) Tests and Coverage Model
- Unit feature tests (`test/unit/*`): approval, release, claim-window, audit events.
- Integration test (`test/integration/workflow.integration.test.js`): full 3-installment path.
- System/e2e (`test/system/system-wide.e2e.test.js`): access control + insufficient funds + expired claim.
- Backend tests (`test/backend/api.test.js`): health + validation.
- Frontend tests (`test/frontend/pages.test.js`): static page content checks.

```mermaid
gantt
  title Test Layers by Scope
  dateFormat  X
  axisFormat %s
  section Contract
  Unit features          :done, u1, 0, 2
  Integration workflow   :done, i1, 2, 2
  System-wide edge cases :done, s1, 4, 2
  section App
  Backend API tests      :done, b1, 2, 2
  Frontend page tests    :done, f1, 3, 1
```

## 11) Contract Lifecycle (Timeline)
```mermaid
timeline
  title Scholarship Instance Lifecycle
  Approval : Admin approves student with total amount/installments/window
  Funding : Any account funds contract pool
  Release : Admin releases installment N in order
  Claim : Student claims before claimDeadline
  Recovery : Admin recovers expired unreclaimed installment
  Completion : claimedInstallments reaches installments
```

## 12) Event Distribution (Conceptual)
```mermaid
pie showData
  title Contract Event Categories
  "ScholarshipApproved" : 20
  "ScholarshipFunded" : 20
  "InstallmentReleased" : 20
  "InstallmentClaimed" : 30
  "ExpiredInstallmentRecovered" : 10
```

## 13) User Journey
```mermaid
journey
  title Scholarship Disbursement User Journey
  section Admin
    Open dashboard: 5: Admin
    Approve student: 5: Admin
    Release installment: 4: Admin
  section Student
    Connect wallet: 3: Student
    Submit claim: 4: Student
    Receive funds on success: 5: Student
  section Provider
    Fund contract: 4: Provider
```

## 14) Delivery History View
```mermaid
gitGraph
  commit id: "Init"
  branch contract
  commit id: "Add ScholarshipApprovalRelease"
  checkout main
  merge contract
  branch backend
  commit id: "Add approval/release APIs"
  checkout main
  merge backend
  branch tests
  commit id: "Add unit/integration/system/API/frontend tests"
  checkout main
  merge tests
```

## 15) Requirements Traceability (Conceptual)
```mermaid
requirementDiagram
  requirement R1 {
    id: "1"
    text: "Admin-only scholarship approval"
    risk: medium
    verifymethod: test
  }
  requirement R2 {
    id: "2"
    text: "Installment release in strict order"
    risk: medium
    verifymethod: test
  }
  requirement R3 {
    id: "3"
    text: "Claim window enforcement"
    risk: high
    verifymethod: test
  }
  requirement R4 {
    id: "4"
    text: "Auditability via events and DB logging"
    risk: medium
    verifymethod: test
  }

  element C1 {
    type: "contract"
    docRef: "contracts/ScholarshipApprovalRelease.sol"
  }

  element B1 {
    type: "backend"
    docRef: "backend/src/app.js"
  }

  R1 - satisfies -> C1
  R2 - satisfies -> C1
  R3 - satisfies -> C1
  R4 - satisfies -> C1
  R4 - satisfies -> B1
```

## 16) Codebase Mindmap
```mermaid
mindmap
  root((ScholarshipDisbursement))
    Smart Contract
      ScholarshipApprovalRelease.sol
      approval/funding/release/claim/recovery
      events + getters
    Backend
      app.js routes
      contract.js ethers adapter
      config.js env defaults
      supabase.js optional persistence
    Frontend
      index.html landing
      admin.html admin actions
      student-dashboard.html wallet claim
      js/admin-dashboard.js logic
      js/student-dashboard.js logic
      server.js static host
    Infra
      docker-compose.yml
      chain Dockerfile (Ganache)
      deployer Dockerfile (solc + deploy)
      backend/front Dockerfiles
    Testing
      unit features
      integration workflow
      system edge cases
      backend API
      frontend smoke
    Data
      supabase schema
      approvals table
      releases table
    Generated Types
      ethers-contracts typings/factories
```

## 17) Notable Implementation Details
- `backend/src/config.js` includes a default Hardhat private key for dev convenience; production should override `ADMIN_PRIVATE_KEY`.
- Backend can resolve contract address from env (`CONTRACT_ADDRESS`) or runtime file (`CONTRACT_ADDRESS_FILE`), enabling Docker deployer handoff.
- `scripts/deployer.js` compiles with `solc` directly and writes deployed address to shared volume.
- Student page claims directly on-chain with wallet signer and does not currently query backend for tx submission.

## 18) Active vs Reference Scope
- Active production/runtime scope is the root project files listed above.
- `reference Labs/` is educational/reference content and not in main runtime flow (`docker-compose.yml`, backend server, or root scripts).
