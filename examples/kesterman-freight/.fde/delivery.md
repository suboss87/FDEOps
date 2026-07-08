# Delivery log

## Shipped

### [2026-06-10] Day-1 deliverable: fixed the stuck board-refresh cron
- Board page cache had refreshed every 4h instead of every 15min since a 2025 config change. One-line fix, deployed with Karen's review.
- Value: first deploy in their environment, zero incidents. Randy noticed before we announced it.

### [2026-06-22] Sheet shadow-read (staging)
- `dispatch-board.xlsx` → staging table, every 5 min, parse failures logged with row IDs.
- Value: first time sheet data has been queryable. Karen used it the same week to answer a billing dispute.

### [2026-06-26] Parity report
- Daily diff, sheet vs DB: 94.1% row parity day one → 98.8% by 2026-07-02.
- Value: the number Denise can take to the CFO - the data-trust problem is now measured, not argued about.

## Running value

- Finance nightly export: unchanged and now monitored (was silent-failing 1-2 nights/month per Randy; alert added 2026-06-22).
