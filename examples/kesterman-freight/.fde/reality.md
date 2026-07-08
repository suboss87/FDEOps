# Reality (actual problem)

**Confirmed:** the ops team's spreadsheet is the real system of record. `dispatch-board.xlsx` (shared drive, Randy's team) is where loads are actually assigned, re-routed, and annotated. The Postgres `loads` table lags it by 2-26 hours because the floor updates the sheet first and back-fills the system "when there's time."

**Evidence:**
- 2026-06-12 workshop: Randy shared his screen to answer a status question - opened the sheet, not the system. Asked directly: "the system is for billing, the sheet is how we run the floor." (verbatim)
- Sampled 2026-06-15: 340 active loads; 61 rows differ between sheet and DB (status, carrier, or ETA).
- Nightly export script (`scripts/nightly_export.js`) writes DB → CSV for finance; nobody exports the sheet anywhere.

**Differs from brief how:** brief asks for a dashboard over the DB. A dashboard over stale data teaches ops to ignore it in week one. The real build is: ingest the sheet (or replace its job) first, dashboard second.

**Implication for build:** shadow-read the sheet into staging, prove parity, then render. Agreed with Denise 2026-06-15 (see decisions.md).
