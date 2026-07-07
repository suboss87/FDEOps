# Engagement context

**Engagement:** meridian-logistics
**Customer:** Meridian Logistics (fictional - regional freight, ~400 trucks, 3 depots)
**Phase:** build
**Last updated:** 2026-07-02

## Current state

Week 4. Build slices 1-2 shipped (sheet shadow-read + parity report, 98.8% parity). Slice 3 (write-back) in progress, target 2026-07-08. Trust amber: Diana unresponsive to demo invites since 2026-07-01; third scope add arrived same day, parked. Demo Thursday 2026-07-09.

## Next action

Book 15 min with Diana Monday 2026-07-06: scope accumulation conversation (3 adds in 13 days, receipts in decisions.md) + confirm Thursday demo. If no reply by Tuesday noon, ask Marcus for a floor-level read.

## Notes for the next session

- Priya reviews write-back design Tuesday 2026-07-07 - the dual read path race is her call.
- Do not touch DispatchBoardService.java:214 (Nashville skip) - characterisation test first, and it is out of scope anyway.
- Parity report is the demo centerpiece: 94.1% → 98.8% chart.

---

## Session log

## 2026-06-12 - session close
- Where we are: discover done - the sheet is the system of record, not the DB.
- What changed: Marcus walked us through the floor workflow on his screen; reality.md written with evidence.
- Next step: bring the reframe to Diana 2026-06-15 with the 61-row diff sample.

<!-- fdeops auto-capture -->
## Session end - 2026-06-12 17:31
- workspace: `main` @ e41c8b2 chore: add parity sampling script
- uncommitted: notes/diff-sample-2026-06-12.csv
- engagement files updated: reality.md stakeholders.md brief.md

## 2026-06-15 - session close
- Where we are: re-scope agreed; build plan is 5 slices, parity report is the gate.
- What changed: Diana approved sheet-ingest-first in one meeting. success.md revised, plan written.
- Next step: slice 1 - shadow-read importer on staging.

<!-- fdeops auto-capture -->
## Session end - 2026-06-15 18:04
- workspace: `feat/sheet-shadow-read` @ 9d02f4c feat: staging table + xlsx importer skeleton
- uncommitted: src/main/java/com/meridian/dispatch/ingest/SheetImportJob.java src/main/java/com/meridian/dispatch/ingest/RowParser.java
- engagement files updated: success.md decisions.md context.md

## 2026-06-24 - session close
- Where we are: slice 1 shipped 06-22; parity at 94.1% and climbing as the parser learns the sheet's dialects.
- What changed: Marcus explained the macro column (VLOOKUP chain → carrier assignment). Importer now preserves it; risk logged.
- Next step: parity report daily job, then demo it 2026-06-26.

<!-- fdeops auto-capture -->
## Session end - 2026-06-24 17:47
- workspace: `feat/parity-report` @ 3f2c9a1 feat: daily sheet-vs-db diff with row ids
- uncommitted: src/main/java/com/meridian/dispatch/ingest/ParityReport.java src/test/java/com/meridian/dispatch/ingest/ParityReportTest.java
- engagement files updated: risks.md terrain.md decisions.md

## 2026-07-01 - session close
- Where we are: parity 98.6%. Diana quiet - second demo skipped, now not replying to invites.
- What changed: scope add #3 arrived (Nashville role views) - parked in decisions.md, not accepted. Signal moved amber with evidence.
- Next step: scope accumulation conversation before the 2026-07-09 demo. Receipts ready.

<!-- fdeops auto-capture -->
## Session end - 2026-07-01 18:22
- workspace: `feat/write-back` @ b7a31dc wip: write-back queue, dry-run mode
- uncommitted: src/main/java/com/meridian/dispatch/ingest/WriteBack.java
- engagement files updated: decisions.md stakeholders.md risks.md

## 2026-07-02 - session close
- Where we are: debriefed the Marcus + Priya sync (raw notes: ../sample-debrief.txt).
- What changed: Marcus's read on Diana (Nashville audit, not dissatisfaction) logged as unverified; Priya confirmed Tuesday design review.
- Next step: Monday - direct ask to Diana, 15 min, scope + demo confirm.

<!-- fdeops auto-capture -->
## Session end - 2026-07-02 16:58
- workspace: `feat/write-back` @ b7a31dc wip: write-back queue, dry-run mode
- uncommitted: src/main/java/com/meridian/dispatch/ingest/WriteBack.java src/test/java/com/meridian/dispatch/ingest/WriteBackTest.java
- engagement files updated: stakeholders.md decisions.md risks.md context.md
