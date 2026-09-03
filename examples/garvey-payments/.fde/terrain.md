# Terrain (codebase)

**Repo:** `payments-eu` module (legacy Java), ~40k LOC touched area.

**Hotspots:** `IngestJob.java`, `EuRetryQueue` - no tests; last change 2019 (revert in history).

**Test gap:** characterisation tests required before behavior change - none exist.

**Data flow:** API → queue → batch job → finance export (broken path for EU).

## Operating map (exception-led)

| Exception / break | Who notices first | What they do today (workaround) | System of record then | Blast if wrong | Evidence |
|-------------------|-------------------|---------------------------------|-----------------------|----------------|----------|
| EU row fails ingest overnight | Finance analyst, 08:30 export check | Reprocess by hand in the nightly Excel sheet | The spreadsheet, not the ledger | Month-end close slips; EU rail reported wrong | Day 5 workshop; 31-row sample 2026-05-26 |
| Retry queue stalls | Nobody until finance asks | Platform lead restarts the batch job | Batch job logs | Same rows fail twice; duplicates if retry is not idempotent | Platform lead, Day 2 |

**Shadow systems / silent workarounds:** the nightly Excel reprocess. It is the real EU reconciliation today.
**Sacred / untouchable in ops:** the finance export format; month-end close window (no deploys last three business days).
**Previous attempt residue:** 2019 `EuRetryQueue` revert; ask the platform lead what broke.
