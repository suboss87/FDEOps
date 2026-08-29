# pick-three - Pick three from twenty urgents

**Enter when:** a transformation engagement with a long list of initiatives, the customer's roadmap has more items than weeks, competing teams want different things, or the FDE needs to recommend what to do *first* across a complex programme.

**Read first:** `reality.md`, `success.md`, `stakeholders.md`, `context.md`. Load `business-case.md` if individual initiative cases exist.

Every enterprise engagement generates more work than any timeline can hold. Triage is the discipline of saying "not now" to real work with real sponsors - and making it stick. Without it, the FDE drowns in parallel efforts and ships nothing well.

## Method (you do this work)

**1. Collect the full list.** From the customer's roadmap, from discovery, from stakeholder requests, from `decisions.md` scope receipts. No filtering yet - everything goes on the board:

```markdown
| # | Initiative | Requested by | Stated priority | Current status |
|---|-----------|-------------|----------------|----------------|
| 1 | Payment API rewrite | CTO | P1 | Blocked on schema decision |
| 2 | Customer dashboard | Product | P1 | Design phase |
| 3 | SOC2 compliance | CISO | P0 | Not started |
| ... | ... | ... | ... | ... |
```

Notice: every stakeholder's initiative is P0 or P1. That's the problem this skill solves.

**2. Apply the triage matrix.** Each initiative scores on three axes:

| Axis | Question | Scale |
|------|----------|-------|
| **Impact** | If this ships, what changes for the business in 90 days? | 1 (marginal) → 5 (transformative) |
| **Dependency** | How many other initiatives are blocked waiting for this? | 0 (standalone) → 5 (critical path for 3+ others) |
| **Cost of delay** | What happens each week this doesn't ship? | 1 (nothing) → 5 (measurable loss or regulatory exposure) |

**Triage score = Impact + Dependency + Cost of delay** (simple sum, 3-15 range).

**3. Sort into three lanes:**

| Lane | Score | Action |
|------|-------|--------|
| **Now** (max 3) | 11-15 | Active work this phase. FDE and team capacity allocated. |
| **Next** (max 5) | 7-10 | Sequenced for the following phase. Dependencies tracked but not started. |
| **Later** (unlimited) | 3-6 | Captured, not committed. Revisit at next triage. |

**The cap matters.** "Now" has exactly 3 slots. Not 4, not "3 plus this small one." Discipline is the product.

**4. Handle the political override.** When a powerful stakeholder pushes a low-scoring initiative into "Now":

- Show the displacement: "Adding X to Now means Y drops to Next. Y is currently blocking Z and W."
- Let them choose: "Which of the current three should Y replace?" Making the trade-off visible makes the conversation honest.
- If they override without trading: log it. `decisions.md`: "Initiative X added to Now without displacement by <who>. Capacity impact: <what slows>."

**5. Set the triage cadence.** Triage is not a one-time event:

| Engagement type | Triage frequency | Trigger for emergency re-triage |
|----------------|-----------------|-------------------------------|
| Sprint (1-2 weeks) | Once, at plan | Crisis or sponsor change |
| Standard (1-4 weeks) | Weekly | New P0 from sponsor |
| Programme (months) | Bi-weekly | Quarterly review, team change, market shift |

**6. Communicate the triage result.** The output is not just a priority list - it's a commitment:

> "We're committing to these three initiatives this phase: [A, B, C]. Here's why, here's what they deliver, and here's what's explicitly deferred: [D, E, F, ...]. If priorities change, we re-triage - we don't add without removing."

## Artifact

**`decisions.md`** - the triage table with scores, lanes, **and an explicit Kill / Later commitment**. Dated. Referenced by plan and status.

Required closing block (plan will not treat triage as done without it):

```markdown
## Triage - <date>
### Now (max 3)
| # | Initiative | Score | Why now |
...
### Next
...
### Kill / defer (not this phase)
| Initiative | Why not now | Who accepted |
|------------|-------------|--------------|
| ... | ... | <name, date> |

Commitment: we ship only Now. Additions require a removal.
```

**`reality.md`** - if triage revealed that the engagement scope is larger than the timeline supports, update the assessment.

## Checkpoint

Walk the FDE through: the 3 "Now" initiatives and why, the top "Next" items and what triggers their promotion, and the one initiative that will generate the most political pushback for being in "Later." Prepare the FDE for that conversation.

## Principles

- "Now" has 3 slots. Not 4. Discipline is the product.
- Every addition requires a removal. Visible trade-offs beat invisible overload.
- Triage is recurring, not one-time. The list changes; the discipline doesn't.
- A logged override protects the FDE. An unlogged override blames them.
- The initiative everyone wants but nobody will trade for is the one to watch.
