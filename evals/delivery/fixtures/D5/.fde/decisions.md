# Decisions

## Record

- [2026-09-05] Retry-status slice approved. User-visible outcome: operators see current retry without duplicate orders. Happy path and unhappy path (timeout recovery) required. Blast radius: status endpoint + status UI. Rollback: revert deploy, feature flag off. Implementation notes: see `implementation-plan.md`.
