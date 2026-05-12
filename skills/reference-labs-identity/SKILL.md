---
name: reference-labs-identity
description: Build, refactor, or review this blockchain education stack to match the coding identity of `reference Labs` while preserving existing product features. Use when normalizing architecture, coding style, naming, API semantics, frontend interaction model, Solidity contract layout, or dependency choices to stay consistent with Labs 1-4 patterns.
---

# Reference Labs Identity

Use this skill to enforce a consistent code identity derived from `reference Labs` before or during refactors.

## Baseline Workflow

1. Read `references/identity-baseline.md`.
2. Read `references/library-profile.md`.
3. Build a feature-preservation checklist from current repo behavior before editing.
4. Map each target module to a matching lab archetype:
- backend API -> `labs/lab{1..4}/api/src/server.js`
- Solidity contract -> `labs/lab{1,3,4}/blockchain/contracts/*`
- frontend JS/HTML/CSS -> `labs/lab{1..4}/frontend/*`
5. Refactor in small slices and keep public behavior stable.
6. Validate with existing tests and add focused regression tests for any changed path.

## Non-Negotiable Identity Constraints

- Keep Node backend as ESM (`"type": "module"`) with explicit imports.
- Keep backend stack centered on `express`, `cors`, `ethers` patterns from labs.
- Preserve educationally explicit structure and comments where they clarify flow boundaries.
- Keep deterministic helper functions for formatting/normalization and explicit validation guards.
- Keep Solidity contracts with clear sectioned comments.
- Keep Solidity contracts with explicit access-control modifiers.
- Keep Solidity contracts with event-first auditability for state-changing actions.
- Keep Solidity contracts with readable require messages.
- Keep frontend as frameworkless HTML/CSS/vanilla JS with explicit DOM handles and render helpers.
- Keep blockchain plumbing centered on Hardhat local flow and ethers contract adapters.

## Feature Preservation Protocol

1. Enumerate current features and endpoints before changes.
2. Mark each refactor commit/patch with a preserved-feature list.
3. If identity and behavior conflict, preserve behavior first and apply identity through internal structure.
4. Do not silently change API request/response shapes.
5. Keep event semantics and contract invariants equivalent unless explicitly requested.

## Refactor Plan Template

Use this exact plan format in responses:

```md
Identity Refactor Plan
1. Scope
2. Behavior to preserve
3. Identity deltas to apply
4. Files to change
5. Validation gates
```

## Validation Gates

- Contract: unit + integration + system scenarios for approvals/releases/claims and access control.
- Backend: route validation, success paths, and error envelope parity.
- Frontend: critical form and render flows remain intact.
- Wiring: frontend->backend and backend->contract paths remain valid in local and docker setups.

## References

- Identity details: `references/identity-baseline.md`
- Library/version profile: `references/library-profile.md`
- Refactor checklist: `references/refactor-checklist.md`
