# Terrain (codebase)

**Repo:** `payments-eu` module (legacy Java), ~40k LOC touched area.

**Hotspots:** `IngestJob.java`, `EuRetryQueue` - no tests; last change 2019 (revert in history).

**Test gap:** characterisation tests required before behavior change - none exist.

**Data flow:** API → queue → batch job → finance export (broken path for EU).
