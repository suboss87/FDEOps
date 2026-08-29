# rollback - Rehearse rollback

**Enter when:** a deploy is planned for the next 48 hours, the FDE says "we can always revert," a previous rollback failed or took too long, or the engagement involves regulated/critical systems.

**Read first:** `delivery.md` (the deployment record), `terrain.md`, `trust-profile.md` (for change-approval requirements), `context.md`.

"We can always revert" is the most dangerous sentence in deployment. A rollback plan that hasn't been tested is a wish, not a plan. The drill proves the escape route works before you need it at 2am.

## Method (you do this work)

**1. Map the rollback path for every change type:**

| Change type | Rollback method | Complication | Test |
|-------------|----------------|--------------|------|
| **Code deploy** | Revert the PR / redeploy previous version | Feature flags, cache invalidation | Deploy previous version to staging, verify function |
| **Database migration** | Down migration script | Irreversible migrations (column drops, data transforms) | Run down migration on staging copy |
| **Config change** | Restore previous config | Propagation delay, dependent service restarts | Flip config, verify all services pick it up |
| **Infrastructure** | Terraform/Pulumi rollback or manual | State drift, dependent resources | Plan the rollback, review the diff |
| **Data backfill** | Restore from backup or reverse script | Mixed old/new data states | Run reverse on a 100-row sample |

**2. Identify the irreversible components.** Some changes can't be rolled back:

- Column drops after data migration
- Encryption key rotations after old key is destroyed
- External API version deprecations
- Emails/notifications already sent
- Published API changes consumed by third parties

For each irreversible component: **what's the compensating action?** Not "undo" but "what do we do to recover the same effect?"

**3. Run the drill.** On staging or a test environment - never on production:

```
DRILL PROTOCOL:
1. Deploy the change (confirm it works)
2. Start a timer
3. Execute the documented rollback procedure - exactly as written, no shortcuts
4. Measure: time to complete, services affected, data state after
5. Verify: can users still do the critical path?
6. Record: what worked, what was unclear, what failed
```

**4. The drill report.** Honest, specific, actionable:

```markdown
## Rollback drill - <date>
Change: <what was deployed>
Environment: staging
Rollback method: <what was executed>
Time to rollback: <minutes:seconds>
Result: PASS / FAIL / PARTIAL

What worked:
- Code revert completed in 45s
- Feature flag disabled correctly

What didn't:
- Database down migration left orphan rows in junction table
- Cache took 3 minutes to invalidate (stale data served)

Actions before production deploy:
- [ ] Fix down migration to clean junction table
- [ ] Add cache-bust step to rollback procedure
- [ ] Verify cache invalidation time is acceptable
```

**5. The "acceptable rollback time" conversation.** With the FDE and the team:

> "If this deploy fails in production, how long can the system be in a degraded state before it's a business problem?"

| Answer | Implication |
|--------|-------------|
| "Minutes" | Automated rollback trigger needed - human decision loop is too slow |
| "An hour" | Manual rollback is acceptable if the procedure is tested and documented |
| "A day" | Gradual rollback is fine - feature flag off, monitor, clean up next morning |
| "It can't fail" | Blue/green deployment with instant traffic switch - test both environments |

**6. Change-approval environments (CAB).** In regulated industries:

- The rollback procedure is part of the change ticket - filed before the approval window.
- The drill evidence goes with the change request: "Rollback tested on <date>, completed in <time>, no issues."
- A drill that fails → the change ticket isn't ready. Better to discover that now than during the CAB.

## Artifact

**`delivery.md`** - the drill report, attached to the deployment record for this change. The evidence that the rollback works.

**`risks.md`** - any irreversible components identified, with the compensating action.

**`decisions.md`** - if the drill failed and the deployment is delayed: what failed, the fix, the revised timeline.

## Checkpoint

One statement: "Rollback tested on staging. Time: <N minutes>. Result: <pass/fail>. Production deploy is / is not ready." If not ready: the specific blocker and when it'll be resolved.

## Principles

- A rollback plan that hasn't been tested is a wish.
- Time the drill. If it takes 45 minutes on staging, it takes 90 in production at 2am.
- Identify the irreversible components and name the compensating action.
- The drill report is evidence for the change ticket and the team's confidence.
- A drill that fails is a success - you found the problem before production did.
