# pick-three - Prioritize three

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

**Triage score = Impact + Dependency + Cost of delay** (simple sum, 2-15 range).

**3. Sort into three lanes:**

| Lane | Score | Action |
|------|-------|--------|
| **Now** (max 3) | 11-15 | Proposed active work, subject to actual capacity, dependencies and authority. |
| **Next** (max 5) | 7-10 | Proposed sequencing; dependencies tracked but not started. |
| **Later** (unlimited) | 2-6 | Captured, not committed. Revisit at next triage. |

**The cap matters.** Three is a maximum, not a quota. Use fewer or zero Now items when capacity, unresolved dependencies or required permissions prevent useful authorized work. Check who is available, effort within the phase and shared bottlenecks; one engineer cannot be allocated to several full-capacity initiatives at once. The score bands are a starting point, not automatic lane assignments: high-scoring blocked work waits, and a lower-scoring prerequisite may come first with an explained rationale. Keep uncertain allocations proposed rather than inventing capacity or approval.

**4. Handle the political override.** When a powerful stakeholder pushes a low-scoring initiative into "Now":

- Show the capacity and dependency trade-off. If Now is full for the available team, adding X requires deferring work or an explicitly agreed capacity change; a vacant slot alone is not capacity.
- Ask the responsible decision-maker to resolve the actual choice, without assuming three items are already active. Record the supplied choice and its source under the existing confirmation rules.
- An override cannot waive required permissions or create capacity. Keep an unresolved request proposed, with its impact, rather than reporting it as an allocated commitment.

**5. Set the triage cadence.** Triage is not a one-time event:

| Engagement type | Triage frequency | Trigger for emergency re-triage |
|----------------|-----------------|-------------------------------|
| Sprint (1-2 weeks) | Once, at plan | Crisis or sponsor change |
| Standard (1-4 weeks) | Weekly | New P0 from sponsor |
| Programme (months) | Bi-weekly | Quarterly review, team change, market shift |

**6. Communicate the triage result.** Distinguish a proposed allocation from an authorized commitment:

> "For the available capacity, I propose [eligible items, or none] this phase. Here's what they deliver, what is blocked or deferred, and which allocation still needs confirmation. Existing agreed work remains agreed; changes need the appropriate decision authority."

## Artifact

**`decisions.md`** - the triage table with scores, lanes, and proposed or agreed deferrals. Keep status and decision sources explicit. Update the same Now/Next/Later section plan already uses under the record-confirmation rules; do not open a second plan section. Standalone work returns the draft without initializing records.

For a recorded triage result, preserve this closing block. A draft may contain pending allocations and deferrals; missing agreement must not be filled with invented acceptance:

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
| ... | ... | <pending, or supplied name, date and source> |

Allocation: <proposed, or agreed with source>. Now contains only work feasible within the stated capacity and authority. Additions require a capacity and dependency check, and displacement when full.
```

**`reality.md`** - if triage revealed that the engagement scope is larger than the timeline supports, update the assessment.

## Checkpoint

Walk the FDE through: the proposed or agreed Now items and available capacity, the Next items and what enables their promotion, and any real trade-off requiring a decision. Explain an empty Now lane when applicable; do not fill it to satisfy the title.

## Principles

- Now has at most three items and must fit actual capacity and dependencies.
- Every addition requires a capacity check; displace work when full rather than silently overloading the team.
- Triage is recurring, not one-time. The list changes; the discipline doesn't.
- A logged override protects the FDE. An unlogged override blames them.
- The initiative everyone wants but nobody will trade for is the one to watch.
