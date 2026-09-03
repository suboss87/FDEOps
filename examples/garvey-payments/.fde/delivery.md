# Delivery log

## Value ledger

| Date | Slice | Bucket | Promised | Measured | Accepted by | Evidence | Rollback |
|------|-------|--------|----------|----------|-------------|----------|----------|
| 2026-05-30 | EU ingest retry (staging) | cost-save | One night without Excel reprocess | pending - trial night 2026-06-02 | pending - finance controller after trial | CTO + finance controller staging demo 2026-05-30 | Feature flag off; revert retry worker |

## Ship receipts

- [2026-05-30] their runner: `mvn -pl payments-eu test` on their CI, green, run id 4471. Audit cite: `terrain.md` operating map row 1 walked with ops lead.

## Shipped

### 2026-05-30 - EU ingest retry (staging)

**Shipped:** idempotent retry + structured log of failed EU rows.
**Demo:** CTO + finance controller - staging walkthrough on the reconciliation screen finance already uses.
**Business value:** finance agreed to trial one night without Excel reprocess.
**Next:** prod canary after security review (their process). Measured lands after the trial night; nothing is accepted until the finance controller says so.

## Status updates

## Running value

- Manual Excel nights: trial pending (promised cut from nightly → none on EU failures). Claimed, not delivered, until the ledger row shows an acceptor.
