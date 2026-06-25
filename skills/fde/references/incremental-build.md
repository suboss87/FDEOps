# incremental-build - thin slices on someone else's codebase

**Enter when:** the build task is larger than a single PR, multiple files or systems are involved, or the FDE needs to show visible progress to a stakeholder every 2–3 days.

**Read first:** `decisions.md` (the plan), `terrain.md` (the danger zones), `context.md`. This skill works *inside* the build phase - it's the execution discipline that makes large features safe on codebases you don't own.

The FDE who builds a 2,000-line feature in one PR gets it rejected. The FDE who ships five 200-line PRs - each reviewable, testable, and revertible - earns the team's trust. On someone else's codebase, small and visible beats clever and large.

## Method (you do this work)

**1. Slice vertically, never horizontally.**

```
BAD (horizontal):
  PR 1: Build all database models
  PR 2: Build all API endpoints
  PR 3: Build all UI components
  PR 4: Wire everything together (and pray)

GOOD (vertical):
  PR 1: User can create a payment (schema + endpoint + minimal UI) - testable
  PR 2: User can view payment status (query + endpoint + UI) - testable
  PR 3: Payment retry on failure (logic + endpoint + UI feedback) - testable
  PR 4: Admin can void a payment (auth + logic + UI) - testable
```

Each vertical slice delivers working functionality the customer can see. Each slice is independently revertible.

**2. The slice checklist.** Before starting any slice:

- [ ] Slice is in `decisions.md` with acceptance criteria (happy + unhappy path)
- [ ] Blast radius declared: which files, which systems, which users affected
- [ ] Rollback path identified: "revert this PR" or something more specific
- [ ] No dependency on an unmerged slice (if dependent, state it and merge in order)

**3. The implementation loop.** For each slice, in this order:

```
Read existing code in the area (search before creating)
  → Write characterisation tests for what's there (if legacy)
    → Implement the minimal working path
      → Verify with evidence (tests + typecheck + smallest proving run)
        → Cleanup pass (dedupe, simplify - behaviour unchanged)
          → Self-review against acceptance criteria
            → Commit with descriptive message
              → Update decisions.md + delivery.md
```

**4. Size discipline.** Each slice targets:

| Metric | Target | Why |
|--------|--------|-----|
| Lines changed | 100–300 | Reviewable in one sitting |
| Time to implement | 30–90 minutes | Testable before context decays |
| Files touched | 1–5 | Blast radius stays containable |
| Tests added | ≥1 per new behaviour | Proves the slice works; guards against regression |

A slice larger than 300 lines → split before implementing. "It's all connected" means the design needs work, not the slice limit.

**5. Stakeholder visibility rhythm.** Every 2–3 slices, something the customer can see:

- A working endpoint they can hit
- A UI change they can click
- A metric that moved
- A risk that was retired

Technical progress invisible to stakeholders is trust decay. `delivery.md` gets updated after every visible slice.

**6. The scope trap.** Mid-slice discoveries - "this module also needs updating," "I should refactor this while I'm here":

- If it's in `decisions.md`: do it as a separate slice.
- If it's NOT in `decisions.md`: log it as a scope receipt (see `scope-defense.md`), don't touch it.
- The hardest discipline: leaving ugly code alone when it's not in your slice.

## Artifact

**`decisions.md`** - each slice logged with: what was implemented, what was tested, what was deferred.

**`delivery.md`** - each visible slice with business-language description of what it delivers.

## Checkpoint

After each slice: tests pass (state the command and result), acceptance criteria met, blast radius as declared. After every 2–3 slices: stakeholder visibility confirmed - what did they see, and what's their signal?

## Principles

- Vertical slices, always. Horizontal layers are untestable until assembled.
- 100–300 lines per slice. Larger means split first.
- Every slice is independently revertible. If it isn't, the design is coupled.
- Visible progress every 2–3 slices. Technical progress alone is trust decay.
- The ugly code outside your slice stays ugly. That's discipline, not laziness.
