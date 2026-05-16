# End-to-End Runbook

## Context
This runbook provides deterministic local and Docker execution steps for demo and validation.

## Scope
- Local execution
- Docker execution
- Expected outputs
- Known troubleshooting paths

## Architecture / Flow
```mermaid
sequenceDiagram
  participant Dev
  participant Chain
  participant Deployer
  participant Backend
  participant Frontend
  participant DB

  Dev->>Chain: start RPC
  Dev->>Deployer: deploy contract
  Deployer-->>Backend: runtime address + metadata
  Dev->>Backend: start API
  Backend->>DB: write/read audits
  Dev->>Frontend: open dashboards
```

## Components / Interfaces
### Local Mode
1. `npm.cmd run compile`
2. `npx hardhat node`
3. `npm.cmd run deploy:local`
4. Set `CONTRACT_ADDRESS` in `.env`
5. `npm.cmd run start:backend`
6. `npm.cmd run start:frontend`

### Docker Mode
1. `docker compose up -d --build`
2. `docker compose ps`
3. Validate service health:
  - backend: `http://localhost:4000/api/health`
  - frontend: `http://localhost:3300/health`

## Failure Modes and Recovery
- Hardhat compiler lock:
  - use `tools/run-hardhat.js` (already wired in npm scripts).
- RPC not reachable:
  - ensure `chain` is healthy before deployer/backend operations.
- Contract not configured:
  - verify `/runtime/contract-address` and `/runtime/contract-metadata.json` in volume handoff.
- DB unavailable:
  - verify `postgres` health and `DATABASE_URL`/`DOCKER_DATABASE_URL`.

## Validation Checklist
1. Approve flow returns `201 { ok: true, txHash }`
2. Release flow returns `200 { ok: true, txHash }`
3. Student claim succeeds from wallet
4. `GET /api/audits/history` returns paginated rows
5. Backend/frontend tests pass

## Open Questions
- Should we add a single command script to auto-run health + smoke assertions?

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
