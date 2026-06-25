# Decisions

## 2026-05-28 - Slice scope (Day 10)

**Decision:** Ship idempotent retry on `EuRetryQueue` only; no API contract changes.

**Why:** Smallest path finance can see in staging by Friday.

**Review:** scope OK; added logging for failed row IDs.

## 2026-05-26 - Problem framing (Day 5)

**Decision:** Pause API “fix” PR; prioritize ingest.

**Why:** `reality.md` - spreadsheet is the operating spec.
