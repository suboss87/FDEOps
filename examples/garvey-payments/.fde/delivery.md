# Delivery log

## Value ledger

| Date | Slice | Promised | Measured | Evidence | Rollback |
|------|-------|----------|----------|----------|----------|
| 2026-05-30 | EU ingest retry (staging) | One night without Excel reprocess | Trial agreed; measured nights pending | CTO + finance controller staging demo | Feature flag off; revert retry worker |

## Shipped

### 2026-05-30 - EU ingest retry (staging)

**Shipped:** idempotent retry + structured log of failed EU rows.  
**Demo:** CTO + finance controller - staging walkthrough.  
**Business value:** finance agreed to trial one night without Excel reprocess.  
**Next:** prod canary after security review (their process).

## Status updates

## Running value

- Manual Excel nights: trial pending (promised cut from nightly → none on EU failures).
