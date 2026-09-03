# Reality (actual problem)

**Working theory:** EU payment failures in the API are a symptom. Finance reprocesses failed EU rows by hand in Excel every night because ingest has no idempotent retry. The job is unowned retry visibility, not a broken API.

**Evidence:**

- 2026-05-26, Day 5 workshop with the ops lead: nightly spreadsheet reprocess named unprompted; RFP never mentioned it.
- 2026-05-26, anonymised sample of the reprocess sheet: 31 rows from one night, all EU rail, all retriable.
- `EuRetryQueue` last touched 2019 with a revert in history (`terrain.md`).

**Differs from brief how:** brief assumed an API bug and asked for an API rewrite. Theory says thin ingest retry plus reconciliation visibility retires the Excel night; the API stays.

**Confirm by:** one trial night on staging with the retry worker on and the spreadsheet untouched. Finance controller counts the rows. Target 2026-06-02.
