# Reality (actual problem)

**Confirmed:** EU payment failures in the API are a symptom. **Root workflow:** finance reprocesses failed EU rows manually in Excel each night because ingest has no idempotent retry.

**Stated brief was wrong because:** brief assumed API bug; ops knew about spreadsheet workaround but did not include it in the RFP.

**Implication for build:** thin ingest + reconciliation visibility, not a full API rewrite.

**Validated with:** ops lead (Day 5 workshop), sample spreadsheet (anonymized).
