# Diagram Title
API Interaction from scholarship-routes.js

## Diagram Type
API Interaction Diagram

## Scope
All scholarship/audit/telemetry/export routes and middleware guards.

## Verification Summary
All nodes and edges are from route handlers, requireSession, and requireRole usage.

## Evidence Sources
- backend/src/routes/scholarship-routes.js:20-131
- backend/src/middleware/auth-session.js:15-47
- backend/src/middleware/role-auth.js:16-25
- backend/src/services/scholarship-service.js:16-79
- backend/src/services/export-service.js:6-100

## Mermaid Diagram
```mermaid
flowchart TD
  Client[Client Request] --> Sess[requireSession]
  Sess --> Role[requireRole]

  Role --> Approve[POST /api/scholarships/approve]
  Role --> Release[POST /api/scholarships/release]
  Role --> Approved[GET /api/scholarships/approved]
  Role --> Hist[GET /api/audits/history]
  Role --> Edit[PATCH /api/audits/:type/:id]
  Role --> Funds[GET /api/audits/funds-movement]
  Role --> Telemetry[GET /api/chain/telemetry]
  Role --> Csv[GET /api/exports/transactions.csv]
  Role --> Xlsx[GET /api/exports/transactions.xlsx]
  Role --> Pdf[GET /api/exports/transactions.pdf]

  Approve --> ScholarshipService[approveScholarship]
  Release --> ScholarshipService
  Approved --> ScholarshipService
  Hist --> ScholarshipService
  Edit --> ScholarshipService
  Funds --> ScholarshipService
  Telemetry --> ScholarshipService

  Csv --> ExportService[exportCsv]
  Xlsx --> ExportService[exportXlsx]
  Pdf --> ExportService[exportPdf]
```

## Confidence Level
High

## Unverified/Missing Areas
- No queue/event-bus handlers in this route file.

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
  participant Client as Frontend Client
  participant Route as Express Route
  participant Validator as Request Validator
  participant Service as Business Service
  participant Repo as Repository
  participant Chain as Contract Adapter
  Route->>Validator: parse payload/query
  Validator-->>Route: normalized input
  Route->>Service: invoke use-case
  alt off-chain state change
    Service->>Repo: SQL operation
    Repo-->>Service: persisted record
  else on-chain operation
    Service->>Chain: send tx/read call
    Chain-->>Service: receipt/result
  end
  Service-->>Route: response model
  Route-->>Client: API response
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
