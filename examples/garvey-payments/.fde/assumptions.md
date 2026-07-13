# Assumptions

| # | Assumption | Blast radius | How we test | Status | Evidence |
|---|------------|--------------|-------------|--------|----------|
| 1 | EU payment failures are an API bug | CRITICAL | Workshop with ops + inspect nightly process | DISPROVED | ops lead Day 5: Excel reprocess is the real workflow |
| 2 | Finance will drop Excel if ingest retries work | LOAD-BEARING | One-night trial without Excel after staging demo | TESTING | CTO + finance agreed trial (delivery 2026-05-30) |
| 3 | Q3 audit needs full API rewrite | CRITICAL | Map audit controls to ingest + reconciliation visibility | DISPROVED | thin ingest + visibility covers the control; rewrite out of scope |
