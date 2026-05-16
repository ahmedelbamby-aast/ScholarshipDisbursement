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
