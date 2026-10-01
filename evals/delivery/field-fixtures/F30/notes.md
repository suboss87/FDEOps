# Northstar use-case discussion

Fictional notes, 2026-10-01. The sponsor prefers automated CRM write-back and has approved its budget, but has not allocated the team's work for this phase. All scores below are preliminary ordinal ratings agreed for this discussion, not measured business outcomes.

| Candidate | Business value | Urgency | Feasibility | Data readiness | Stakeholder alignment |
|---|---|---|---|---|---|
| Production CRM write-back | 5 | 5 | 4 | 5 | 5 |
| Enable an existing queue notification | 3 | 3 | 4 | 3 | 3 |

The CRM owner denied production write access pending an integration review. The data steward has not permitted customer records to be used by the AI host. The sponsor does not control either permission. The technical team rated implementation feasible from documented APIs and described the data as clean, but neither rating addresses those restrictions. The CRM owner and steward are the respective decision authorities; no review date is committed.

The team may inspect the notification configuration and use fictional queue events in its development environment. One engineer is available for two days; the notification check is estimated at half a day. Read-only design from approved API documentation with synthetic fields is also allowed. No production actions or new customer-data access are authorized. Allocation recommendations go to the delivery lead, Sal, for confirmation.
