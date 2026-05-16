# Frontend Architecture (Verified)

## Overview
Frontend is static HTML served by `server.js`, with browser-side JavaScript modules handling auth/session, admin operations, and student wallet claim flow.

## Responsibilities
- Auth pages: register/login and session storage.
- Admin dashboard: approval/release actions, student verification, audit edits, telemetry, funds graph, exports.
- Student dashboard: MetaMask connect/sign-in, claimable installment loading, claim tx submission.

## Internal Interactions
```mermaid
flowchart TD
  Index[index.html] --> AdminPage[admin.html]
  Index --> StudentPage[student-dashboard.html]
  Index --> AuthPages[admin/student/auditor login+register pages]

  Common[common.js] --> AdminJS[admin-dashboard.js]
  Common --> StudentJS[student-dashboard.js]
  Common --> AuthJS[auth-pages.js]

  AuthJS -->|POST /api/auth/register| API[Backend API]
  AuthJS -->|POST /api/auth/login| API

  AdminJS -->|POST /api/scholarships/approve| API
  AdminJS -->|POST /api/scholarships/release| API
  AdminJS -->|GET/PATCH audit+student+telemetry+export| API

  StudentJS -->|POST nonce/login| API
  StudentJS -->|ethers BrowserProvider + Contract| Chain[EVM RPC via MetaMask]
```

### Diagram Explanation
- `common.js` provides shared session/auth header utilities.
- `auth-pages.js` persists session after successful login.
- `admin-dashboard.js` uses `fetch` to backend only.
- `student-dashboard.js` mixes backend auth endpoints with direct contract calls via MetaMask signer.

## User Journey
```mermaid
journey
  title Implemented User Journeys
  section Admin
    Register/Login: 4: Admin
    Approve scholarship: 5: Admin
    Release installment: 5: Admin
    Verify students: 4: Admin
    Export logs: 4: Admin
  section Auditor
    Login: 4: Auditor
    View audits and telemetry: 4: Auditor
  section Student
    Register: 4: Student
    Wait admin verification: 2: Student
    MetaMask login: 5: Student
    Claim installment: 5: Student
```

### Diagram Explanation
- Student login depends on admin verification (`is_verified` check in backend).
- Student claim path is wallet-based contract interaction.
- Auditor has view-only API access enforced by role checks.

## External Dependencies
- Browser `fetch` API
- MetaMask (`window.ethereum`)
- `ethers` UMD in student page
- Chart.js UMD in admin page

## Data Flow
- Session in localStorage key `scholarship_session`.
- Admin UI state in localStorage key `scholarship_admin_ui_state`.
- Student UI state in localStorage key `scholarship_student_ui_state`.

## Failure/Error Flow
- Missing/invalid session -> redirect to role login page.
- Missing MetaMask -> explicit error alert.
- Wrong chainId -> prompt to switch network.
- API error -> alert with backend error message.

## Security Considerations
- Uses bearer token from localStorage for protected APIs.
- Adds `x-user-role` header from session role.
- **UNVERIFIED**: no client-side token encryption/storage hardening beyond localStorage.

## Scalability Considerations
- Audit and telemetry queries are paginated/windowed via backend.
- Charts refresh every 8 seconds in admin dashboard.

## Performance Considerations
- Async refresh and incremental UI updates.
- Silent wallet reconnect avoids unnecessary account prompt on refresh.

## Code References
- `server.js`
- `frontend/js/common.js`
- `frontend/js/auth-pages.js`
- `frontend/js/admin-dashboard.js`
- `frontend/js/student-dashboard.js`
- `frontend/*.html`

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
Frontend is implemented as static pages in `frontend/*.html` with behavior in `frontend/js/common.js`, `frontend/js/auth-pages.js`, `frontend/js/admin-dashboard.js`, and `frontend/js/student-dashboard.js`.

### 2. Entry Points
```mermaid
flowchart TD
  Browser --> Index[index.html]
  Index --> AdminLogin[admin-login.html]
  Index --> AuditorLogin[auditor-login.html]
  Index --> StudentLogin[student-login.html]
  Index --> AdminDash[admin.html]
  Index --> StudentDash[student-dashboard.html]
```
#### Diagram Explanation
User enters through static pages; scripts bind forms/buttons on DOM load and call backend APIs or MetaMask.

```mermaid
sequenceDiagram
  participant U as User
  participant P as auth-pages.js
  participant API as backend API
  U->>P: Submit login/register form
  P->>API: POST auth endpoint
  API-->>P: session/user payload
  P-->>U: redirect + localStorage session
```
#### Diagram Explanation
Login/register execution path from UI to backend is implemented in `auth-pages.js` handlers.

### 3. Internal Execution Flow
`admin-dashboard.js` loads users/audits/telemetry/funds and renders tables/charts; `student-dashboard.js` verifies runtime network, handles MetaMask nonce/sign-in, and claims installments.

### 4. Architecture & Component Relationships
```mermaid
classDiagram
  class common_js
  class auth_pages_js
  class admin_dashboard_js
  class student_dashboard_js
  auth_pages_js --> common_js
  admin_dashboard_js --> common_js
  student_dashboard_js --> common_js
```
#### Diagram Explanation
All major pages depend on shared helpers from `common.js` for status rendering/session header logic.

### 5. Data Flow
```mermaid
flowchart LR
  UI[Forms/Buttons] --> JS[Page Script]
  JS --> API[Backend API]
  JS --> LS[(localStorage)]
  StudentJS[student-dashboard.js] --> MM[MetaMask]
  MM --> Chain[Contract]
```
#### Diagram Explanation
Data enters from user input and wallet signer; localStorage stores session and page UI state.

### 6. Feature Lifecycle
Page load -> session guard -> fetch initial data -> periodic refresh (admin telemetry/funds) -> user actions -> API/wallet updates.

### 7. Interactions With Other Features/Services
Frontend depends on backend auth/session and scholarship APIs; student flow also depends on MetaMask + chain RPC.

### 8. Use Cases
Admin workflow, auditor read-only workflow, student self-registration + verified-login + claim workflow.

### 9. Edge Cases
No MetaMask installed, wrong chain, empty student list dropdown, expired session, failed exports.

### 10. Error Handling & Recovery
Errors surfaced via alert/status blocks; role-login redirects on auth failures.

### 11. Security Considerations
Role data in session object; bearer token in localStorage; no client-side secret storage besides browser storage.

### 12. Performance & Scalability
Charts refresh at interval; paginated audit reads via backend query params.

### 13. Pros / Cons / Tradeoffs
Pros: simple deploy and explicit role pages. Cons: localStorage token model and browser-heavy state management.

### 14. Known Blockers / Risks
Behavior unclear from current codebase: no service worker/offline mode; no frontend rate-limiting.

```mermaid
journey
  title Frontend Roles Journey
  section Admin
    Login: 4: Admin
    Approve/Release: 5: Admin
  section Auditor
    Login: 4: Auditor
    View only: 4: Auditor
  section Student
    Register: 4: Student
    Wait verification: 2: Student
    Claim via MetaMask: 5: Student
```
#### Diagram Explanation
Reflects implemented UI paths and role boundaries in frontend scripts and backend role checks.
