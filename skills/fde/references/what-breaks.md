# what-breaks - Name the blast radius

**Enter when:** about to make a change on a system you don't fully understand, touching a high-churn module from `terrain.md`, modifying shared infrastructure (auth, database, messaging), or the FDE asks "what could go wrong?"

**Read first:** `terrain.md`, `decisions.md`, `trust-profile.md` (for sacred systems), `context.md`.

On your own codebase, you know what breaks. On someone else's, you discover it in production. Blast-radius analysis is the discipline of mapping the damage before making the change - not after.

## Method (you do this work)

**1. Trace the dependency chain.** For the file/module/system you're about to change, answer:

| Question | How to find it |
|----------|---------------|
| Who calls this? | `grep -rn "function_name\|module_name" --include="*.ts" --include="*.py" .` |
| Who does this call? | Read the imports and external calls in the module |
| What data flows through? | Trace inputs to outputs - especially user data and money |
| What breaks if this returns differently? | Check every caller's assumptions about the return value |
| What breaks if this is slow? | Timeouts, queues, user-facing latency |
| What breaks if this is down? | Circuit breakers? Fallbacks? Or cascade failure? |

**2. Classify the blast radius:**

```
CONTAINED  → Only the module you're changing is affected
             Rollback: revert the PR
             Example: changing a utility function with no external callers

ADJACENT   → 2-5 callers or one downstream system affected
             Rollback: revert the PR + verify downstream
             Example: changing an API response format used by the frontend

SYSTEMIC   → Multiple systems, shared infrastructure, or data integrity
             Rollback: may require data migration or coordinated rollback
             Example: changing the auth token format, modifying a shared database schema

IRREVERSIBLE → Cannot be rolled back without data loss or manual intervention
               Example: data migration, dropping a column, changing encryption keys
```

**3. The what-breaks declaration.** Before writing any code, state it explicitly in `decisions.md`:

```markdown
## Blast radius: <change name>
Classification: ADJACENT
Affected: payment-service, billing-dashboard, reconciliation-job
Data impact: none (read-only change to response format)
Rollback: revert PR; frontend falls back to previous format handler
Monitoring: error rate on /api/payments endpoint, billing dashboard load time
Time to detect: <5 minutes via error rate alert
```

**4. Match the change to the blast radius:**

| Blast radius | Required before merge |
|-------------|----------------------|
| CONTAINED | Unit tests + self-review |
| ADJACENT | Unit + integration tests + team review + monitoring plan |
| SYSTEMIC | Full test suite + team review + staged rollout + incident playbook |
| IRREVERSIBLE | All of the above + sponsor approval + tested rollback of the rollback + go/no-go checkpoint |

**5. The invisible integration.** The most dangerous blast radius is the one you can't see in the code:

- A webhook endpoint that an external system calls - not in your repo's imports
- A cron job that reads the table you're modifying - runs at midnight, fails silently
- A reporting pipeline that depends on the exact column format
- An monitoring alert that triggers on a metric your change affects

**Ask the team:** "Is anything outside this repo reading from or writing to <the thing you're changing>?" The answer is almost always "yes, and here's one we forgot about."

**6. The 2am test.** For any SYSTEMIC or IRREVERSIBLE change, ask: "If this fails at 2am on Saturday, who gets woken up, what do they see, and what can they do?" If the answer is "they see nothing until Monday" - the monitoring plan needs work before the change ships.

## Artifact

**`decisions.md`** - the what-breaks declaration, filed before the change starts. Updated if the blast radius grew during implementation.

**`risks.md`** - new risks discovered during the trace (the invisible integrations, the midnight cron job).

**`terrain.md`** - update if the dependency trace revealed connections the map didn't know about.

## Checkpoint

Before merge: blast radius declared and still accurate, monitoring in place for the affected scope, rollback tested (not just planned). If the blast radius grew during implementation: re-classify, update the declaration, adjust the review/rollout requirements.

## Principles

- Declare the blast radius before writing code, not after.
- The invisible integration is always there. Ask the team.
- Match the process to the blast radius - contained gets speed, systemic gets ceremony.
- "We can always revert" is not a rollback plan. Test the rollback.
- If the 2am failure is invisible until Monday, the monitoring isn't ready.
