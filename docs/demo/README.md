# Demo Evidence Checklist

## Context
This folder stores evidence artifacts required by the submission grading package.

## Scope
- Screenshots and optional video links proving end-to-end behavior.

## Capture Convention
- Use PNG format for screenshots.
- Naming pattern: `<step-number>_<short-title>.png`
- Keep images in `docs/demo/screenshots/`.

## Required Captures
1. `01_admin_dashboard_loaded.png` - captured
2. `02_approve_success_txhash.png` - captured as API evidence (`docs/demo/evidence-log.md`, `docs/demo/api-evidence.json`)
3. `03_release_success_txhash.png` - captured as API evidence (`docs/demo/evidence-log.md`, `docs/demo/api-evidence.json`)
4. `04_student_wallet_connected.png` - pending manual wallet popup capture
5. `05_student_claim_success_txhash.png` - captured as tx evidence (`docs/demo/evidence-log.md`)
6. `06_audit_history_rows.png` - captured as API evidence (`docs/demo/evidence-log.md`, `docs/demo/api-evidence.json`)

## Optional Bonus Captures
7. `07_claim_window_expired_error.png`
8. `08_expired_installment_recovered.png`
9. `09_docker_services_healthy.png`

## Video Evidence (Optional)
- Add a short demo link in this file:
  - `Demo Video URL: <link>`

## Validation Checklist
1. Each required screenshot exists.
2. Each screenshot shows timestamp/tx hash where relevant.
3. Filenames follow the naming pattern.
4. Cross-check tx hashes against audit rows in `docs/demo/evidence-log.md`.
