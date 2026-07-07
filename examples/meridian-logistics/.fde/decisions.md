# Decisions and plan

## Plan (build phase, revised 2026-06-15)

1. ~~Shadow-read `dispatch-board.xlsx` → staging table, log every parse failure~~ shipped 2026-06-22
2. ~~Parity report: sheet vs DB, daily diff count~~ shipped 2026-06-26 (94.1% row parity day one, 98.8% by 2026-07-02)
3. Write-back path: board edits land in DB within 5 min - in progress, target 2026-07-08
4. Dashboard read view over the reconciled table - target 2026-07-13
5. One full floor shift on dashboard only (Marcus's acceptance) - target week of 2026-07-20

Verification per slice: the parity report is the test. No parity, no next slice.

## Decision log

### [2026-06-15] Re-scope: sheet ingest before dashboard
- Context: reality.md confirmed the sheet is the system of record
- Options considered: (a) dashboard over DB as briefed, (b) ingest the sheet first, dashboard second, (c) force the floor onto the system directly
- Decision: (b)
- Rationale: (a) renders data ops ignores; (c) already failed in 2023 - Priya's rewrite died because it started by taking the sheet away
- Owner: Diana Okafor

### [2026-06-18] Scope change #1 - carrier ETA feed
- Context: Diana, weekly sync: "while you're in the ingest code, can we pull the FastLane ETA feed in too?"
- Decision: accepted into backlog, NOT into the 6-week window. Logged, not scheduled.
- Rationale: ETA feed is a new integration (auth, polling, vendor quota) - not a while-you're-in-there
- Owner: Diana Okafor. Timeline: unchanged by her call - flagged that slices 3-5 absorb the risk

### [2026-06-25] Scope change #2 - CSV export for finance
- Context: finance controller (via Diana, email) wants the reconciled table in their nightly export format
- Decision: accepted - small, rides on the existing export script. Absorbed without timeline change.
- Rationale: 1-day change; buys goodwill with the export consumer we have not met
- Owner: Diana Okafor

### [2026-07-01] Scope change #3 - role-based views for the Nashville depot
- Context: Diana, email, same day she went quiet on demo invites: Nashville depot manager wants a filtered board view per role
- Decision: NOT accepted yet. Parked pending scope conversation.
- Rationale: third addition in 13 days, timeline still "6 weeks." Individually reasonable, cumulatively a different project. Accumulation conversation needed before the 2026-07-09 demo - receipts: this log.
- Owner: pending - Diana Okafor
