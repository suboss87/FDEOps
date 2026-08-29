# plan - sequence the work

**Enter when:** scope is understood and the work needs breaking down - a slice, a phase, or the whole delivery.

**Read first:** `reality.md`, `success.md`, `terrain.md`, `stakeholders.md`. Load `business-case.md` if poc produced one. Not the full folder.

## Validation gate (confirm understanding, clarify where it elevates)

Before planning, state what you're working from in 2-3 lines:

> "Planning against: [success definition from success.md]. Scope boundary: [out-of-scope items]. Reality check: [brief aligns with reality.md / or note the delta]."

Then check - probe ONLY if it prevents a bad plan:

1. **Success is measurable.** If "done" is vague ("make it better") → rephrase it: "I'm reading success as: [specific measurable outcome]. That the target?"
2. **Reality matches the brief.** If discovery contradicted the brief → name it: "Discovery found [X] but the brief says [Y]. Planning against reality unless you say otherwise."
3. **Out-of-scope exists.** If missing → one line: "Nothing's marked out-of-scope yet. That means every new request is implicitly in. Worth defining now or after the first plan draft?"

State your read, let the FDE correct, then plan.

An FDE plan is not a sprint backlog. The technical sequence is the easy part. The hard part is when to show progress, who approves the next phase, and where trust is thin enough that two silent weeks read as failure. A technically correct plan that ignores engagement politics fails on schedule.

## Method (you do this work)

**0. Lock scope first.** Read `success.md`, `assumptions.md`, and the **Question** on `reality.md`. If out-of-scope is undefined, define it now with the FDE - a plan on undefined scope accumulates silent commitments. If any CRITICAL assumption is still `OPEN`, stop and run test-assumptions / discover before sequencing work. If `reality.md` has no Question, stop and finish discover - you are sequencing trivia.

**1. Work backwards from success.** What's the last thing that must be true before done? And before that? That's the dependency chain - not a wish list.

**2. Front-load the fragile.** Check `terrain.md` hotspots. Risky modules go early - fail fast, not in week three.

**3. Slice vertically.** Each task delivers something visible and testable end to end ("user submits form, sees it saved"), never a horizontal layer ("build the database layer").

**4. Size to 30-90 minutes, PR-sized.** Longer = two tasks. Each task implementable, testable, reviewable without a thousand-line diff.

**5. AI components get explicit eval tasks.** "Output validated on 50 real production examples," "fallback tested under model unavailability," "inputs/outputs logging to <destination>" - these are pre-conditions of shipping, in the plan before build starts.

**6. Stakeholder touchpoints every 2-3 tasks.** "Show progress to <name from stakeholders.md>." Not ceremony: a customer who sees small wins stays bought in; silence gets filled with doubt.

**7. End with a kill list.** Every plan names what you will **not** do this phase. If everything is "later," you have no plan - you have a wish list. Cap **Now** at 3 slices (same discipline as pick-three).

**Acceptance criteria gate:** no task moves to build without written happy-path AND unhappy-path criteria. Can't write them = the task isn't understood; the open question goes to the customer **before** the task starts. Vague criteria surface later as scope creep and rework.

## Artifact

The plan goes to **`decisions.md`** - always. Build reads the plan from `decisions.md`; anywhere else and the build starts blind.

A plan is **not done** until all four blocks exist:

```markdown
## Plan - <date>
### Now (max 3)
Task N: <outcome, not activity>
Delivers: <what someone can see/test>
Accepts: <happy path> / <unhappy path>
Touches: <files/systems - blast radius declared upfront>
Risk: <what could go wrong + fallback>
Kill if: <the observation that voids this slice - copy from assumptions.md How we test, or the check that means stop>
Verify: <specific check>
Value promised: <business unit change this slice claims>

### Next
- ...

### Later
- ...

### Kill list (explicitly not this phase)
| Item | Why killed / deferred | Who accepted |
|------|----------------------|--------------|
| <rewrite / nice-to-have / political ask> | <evidence> | <name, date> |
```

No kill list → not a finished plan. Reopen with the FDE until the deferrals are written.
## Checkpoint

Walk the FDE through: sequence + why this order, where the fragile work sits, where the touchpoints land, the acceptance gate and **Kill if** on task 1, and the kill list. One question: "Which stakeholder sees the first visible slice, and when?" Second: "Who accepted what we are not doing?" Third: "What observation stops task 1 this week?"

## Method - estimation (when the sponsor asks "how long, how much?")

Every FDE gets asked this in week one. The honest answer is a range, not a number. A single-point estimate is a promise; a range is a professional assessment.

**The 3-point method:**
1. **Best case** - everything goes right, no surprises, team has capacity. This is what the sponsor wants to hear.
2. **Expected case** - normal friction: one discovery changes the plan, one integration takes longer, one approval cycle stalls. This is what to plan against.
3. **Worst case** - a major unknown surfaces, a dependency fails, a key person is unavailable. This is what to protect against.

**Present as:** "2-4 weeks expected, could stretch to 6 if [named risk]." Never give one number.

**The sizing table:**

| Slice | Complexity | Dependencies | Unknowns | Estimate (expected) |
|-------|-----------|--------------|----------|---------------------|
| _per vertical slice from the plan_ | Low/Med/High | Named | Named | X days/weeks |

**Rules:**
- Estimate in weeks for engagements > 1 month. Days for < 1 month.
- Add 30% buffer for integration work (it always takes longer).
- Add 50% buffer for AI/ML work (eval cycles are unpredictable).
- Name assumptions explicitly: "assumes API docs are accurate", "assumes staging environment exists."
- Each named assumption needs a **kill observation**: the result that voids the estimate. Copy it from `assumptions.md` → How we test. No kill observation = it is not an assumption, it is hope.
- Revisit estimates every 2 weeks. An estimate that never updates is fiction.

Write estimates to `decisions.md` under `## Sizing`. Include the assumptions - when they break, the estimate changes and the FDE has evidence for the conversation.

## Method - migration strategy (when the engagement is "move from X to Y")

Migrations are the most common enterprise FDE engagement. The strategy precedes the plan:

**Step 1: Classify the migration type.**

| Type | What it means | Risk profile |
|------|---------------|-------------|
| **Rehost** (lift-and-shift) | Same code, different infrastructure | Low code risk, high ops risk |
| **Replatform** | Minor code changes to use new platform features | Medium risk, clear scope |
| **Refactor** | Rewrite components to fit the new architecture | High risk, scope creep magnet |
| **Replace** | Buy/build new, retire old | Highest risk, requires parallel running |
| **Retire** | Turn off, nobody uses it | Politically hard, technically easy |

**Step 2: Map the dependency graph.** What calls what. What breaks if this moves first. The migration order is the reverse of the dependency chain - leaf nodes first, core last.

**Step 3: Define the cutover strategy.**
- **Big bang** - everything moves at once. Fast but catastrophic on failure. Only for small systems.
- **Strangler fig** - new traffic to new system, old traffic drains. Safe but slow. Preferred for anything load-bearing.
- **Parallel run** - both systems run, outputs compared. Expensive but safest for data-critical systems.

**Step 4: Write the rollback before the migration starts.** "If we move service X and it fails, we route back to old within [time]." No rollback = no migration.

**Step 5: Define success metrics per phase.** Not "migration complete" - that's a project plan. "Error rate same or lower, latency within 10%, zero data loss, team can operate without FDE." Measurable, per service.

Write migration strategy to `decisions.md` under `## Migration`. Each service gets a row: type, order, cutover method, rollback, success metric.

## When the plan changes mid-engagement

Never quietly update tasks. Name the reset: update `reality.md` and `success.md`, one paragraph in `decisions.md` - what changed, why, new sequence. An undocumented reset looks like drift; a documented one looks like the FDE caught something important.

## Worked example

Acme, after discover: the reconciliation job is unowned, Marco's spreadsheet is the real fallback.

**Now** is three tasks, not eight. Task 1 is *failures reach a named human* - delivers a page to a rota, accepts "kill the job mid-run → the on-call is paged within 15 min", touches the job wrapper and the alert config, rollback is re-disable the route, **Kill if:** a real failure page is acked by nobody on the rota (the *finance would act* assumption, DISPROVED if Marco is the only name that answers), verify by killing it in staging. Value promised: `risk-mitigation - a silent failure becomes a 15-minute one`.

The kill list in `decisions.md` is where the plan earns its keep: the rewrite of the reconciliation service that Tom keeps proposing goes there - *deferred, the failure mode is ownership not architecture (Priya accepted, Jun 12)* - along with the finance dashboard finance asked for directly. Both stay visible so the same argument is not re-litigated in week 4 without a receipt.

First visible slice goes to Marco, not Priya: he is the one whose morning changes, and his confirmation is what makes the sponsor update true.

## Principles

- Plan from success backwards, not from today forwards.
- Fragile zones early. Fail fast.
- Every 2-3 tasks, a stakeholder touchpoint. Trust decays without visibility.
- No written acceptance criteria, no build.
- No kill list, no finished plan.
- No **Kill if** on a Now slice, that slice is hope.
- Estimates are ranges, not promises. Name the assumptions and the observation that voids them.
- Migrations: leaf nodes first, core last. Rollback before cutover.
