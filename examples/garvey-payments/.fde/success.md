# Definition of done

**Done when:** finance runs one full week with zero manual Excel reprocess of EU failures, on the path they operate, and the controller says so in writing.
**Primary value bucket:** cost-save
**Baseline → target:** 31 rows reprocessed by hand per night (2026-05-26 sample) → 0 rows, by 2026-06-13.
**Explicitly out of scope:** full API modernisation; non-EU payment rails.
**Stakeholder who signs off:** Finance controller accepts the number (she runs the Excel night today). CTO sponsors and signs the phase. Both, or it does not count.

**In scope (revised Day 5):**
- Nightly EU ingest with idempotent retry
- Finance can retire manual Excel reprocess for EU path
- Audit log of failed rows

**Visible win by:** Friday demo to CTO - working ingest on staging, not slide deck.
