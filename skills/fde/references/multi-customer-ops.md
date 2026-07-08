# multi-customer-ops - juggling engagements without dropping any

**Enter when:** the FDE is running 2+ engagements simultaneously, context-switching is causing mistakes or delays, a new customer is being onboarded while existing engagements are active, or the FDE says "I'm losing track."

**Read first:** Run `fde status` for the portfolio view. Then per engagement: `context.md` only - load deeper files only for the engagement being worked on.

The solo FDE running three customers simultaneously is the norm, not the exception. Without a system, the third customer gets the scraps of attention left after the other two have their crises. Multi-customer ops is the discipline of giving each customer the experience of being your only customer.

## Method (you do this work)

**1. The hard boundary: one `.fde/` per customer, always.**

```
~/fde-engagements/
  garvey-payments/.fde/    ← Garvey's engagement memory
  kesterman-freight/.fde/  ← Kesterman's engagement memory
  rennick-health/.fde/     ← Rennick's engagement memory
```

**Never:**
- Merge two customers' data into one folder
- Reference one customer's code/data in another's context
- Load two customers' `.fde/` folders in the same session
- Copy patterns between customers without stripping identifying information

Cross-contamination is the fastest way to lose two engagements at once.

**2. The daily triage.** Every morning, before opening any editor:

```markdown
## Daily triage - <date>

| Customer | Trust signal | Top risk | Today's action | Time budget |
|----------|-------------|----------|---------------|-------------|
| Garvey | green | Canary blocked on their security ticket | Chase ticket, prep ship checklist | 4h |
| Kesterman | AMBER | Sponsor went quiet Tue | Proactive conversation TODAY | 2h |
| Rennick | green | None active | Build slice 3, push PR | 2h |

Priority order: Kesterman (amber trust), Garvey (deadline), Rennick (steady)
```

**3. The triage rules.** In order of priority:

| Priority | Rule | Why |
|----------|------|-----|
| **1** | Trust fires first | A green-trust engagement with a deadline can wait 4 hours. An amber-trust engagement cannot wait 4 hours - it's 48 hours from red. |
| **2** | Deadlines second | Real deadlines (customer-facing, regulatory, contractual) outrank planned milestones. |
| **3** | Highest-value delivery third | The engagement where today's work produces the most visible outcome. |
| **4** | Steady-state last | Engagements on track with no urgent needs get allocated remaining time. |

**4. Context-switch protocol.** When moving between customers:

```
BEFORE LEAVING CUSTOMER A:
  1. Write 3 lines to context.md: where we are, what changed, next step
  2. Commit or stash any work in progress
  3. Close all customer A files and browser tabs

BEFORE STARTING CUSTOMER B:
  1. Run: fde resume (loads Customer B's engagement)
  2. Read context.md - where did we leave off?
  3. Confirm: what's the one thing to accomplish in this block?
  4. Set a time boundary (e.g., "2 hours on Kesterman, then back to Garvey")
```

The 3-line context update is the bridge. Without it, the next session starts with "what was I doing?" - that's 20 minutes of re-discovery each time.

**5. The communication cadence.** Each customer gets a rhythm:

| Engagement intensity | Status cadence | Touchpoint type |
|---------------------|---------------|-----------------|
| Active build (daily work) | Weekly written + ad-hoc Slack | Status update + visible progress |
| Light touch (2–3 days/week) | Weekly written | Status update + next week's plan |
| Monitoring only | Bi-weekly written | Health check + any emerging risks |

**The golden rule: no customer should have to chase you for an update.** Proactive status updates are cheaper than reactive ones - and they protect trust across all engagements.

**6. Capacity management.** The honest conversation with yourself:

| Situation | Action |
|-----------|--------|
| All engagements are steady | Allocate by value; reserve 20% for unplanned |
| One engagement is on fire | Other engagements get a proactive heads-up: "Focus is on X this week; here's what's planned for you next week" |
| Two engagements are on fire | Triage - one gets full attention, one gets stabilised, tell the sponsor of the stabilised one what's happening |
| Three+ are on fire simultaneously | Escalate to your manager/team. Solo capacity is exceeded - communicate before quality drops |

**7. The cross-contamination checklist.** Before every customer interaction:

- [ ] Am I in the right `.fde/` folder?
- [ ] Am I referencing the right customer's context?
- [ ] Is the status update addressed to the right person?
- [ ] Does my current context contain any data from another customer?
- [ ] Are my browser tabs / code editors pointed at the right customer?

One wrong customer name in a status update damages both relationships.

## Artifact

**`context.md`** (per customer) - the 3-line bridge updated at every context switch. The most-written file in multi-customer ops.

**`fieldbook.html`** - regenerated by `fde dashboard` (deterministic, zero tokens) to give the portfolio view. Trust-ordered.

## Checkpoint

The daily triage is the checkpoint. One line per customer: signal, priority, today's action. If any customer hasn't been touched in 3+ business days: flag it - silence is noticed.

## Principles

- One `.fde/` per customer. Never merge. Never cross-reference.
- Trust fires outrank deadlines. A deadline can be renegotiated; trust can't.
- Write the 3-line context bridge at every switch. 20 seconds saves 20 minutes.
- No customer should have to chase for an update.
- Two fires simultaneously is a triage decision. Three is an escalation.
- The wrong customer name in a status update is a two-customer trust fire.
