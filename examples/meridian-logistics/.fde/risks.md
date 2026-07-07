# Risk register

| Risk | Status | Owner | Mitigation |
|------|--------|-------|------------|
| Sponsor cooling: Diana unresponsive since 2026-07-01, demo 2026-07-09 at stake | open | FDE | Direct ask Mon 2026-07-06: 15 min, scope accumulation + demo confirm |
| Scope accumulation: 3 additions in 13 days, timeline unchanged | open | FDE + Diana | Conversation before the 2026-07-09 demo; decisions.md is the receipt trail |
| Sheet macro column (VLOOKUP chain only Marcus fully understands) drives carrier assignment | open | Marcus | Documented 2026-06-24; write-back must preserve it until replaced |
| Dual read path from the abandoned 2023 ops-api still live - writes can race | open | Priya | Priya reviews write-back design 2026-07-07 before any prod-path code |
| 2019 "temporary" Nashville validation skip (DispatchBoardService.java:214) is load-bearing | open | FDE | Characterisation test before touching; depot codes fix is out of scope |

## Retired

- [2026-06-26] Sheet parse failures - importer handles the macro column; parity 98.8% by 2026-07-02
