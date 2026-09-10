# Definition of done

**Done when:** Replay one full week of EU failures on the finance-operated path; the audit log shows zero manual Excel reprocesses. June Porter reviews the log and records acceptance in writing.
**Primary value bucket:** cost-save
**Baseline → target:** 31 rows reprocessed by hand per night (2026-05-26 sample) → 0 rows, by 2026-06-13.
**Explicitly out of scope:** full API modernisation; non-EU payment rails.
**Stakeholder who signs off:** June Porter (finance controller, fictional example). She accepts the measured result; CTO phase approval is a separate release prerequisite.

**In scope (revised Day 5):**
- Nightly EU ingest with idempotent retry
- Finance can retire manual Excel reprocess for EU path
- Audit log of failed rows

**Visible win by:** Friday demo to CTO - working ingest on staging, not slide deck.
