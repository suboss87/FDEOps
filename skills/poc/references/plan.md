# plan - Sequence the work

**Context:** apply [task context and evidence](task-context.md). Standalone planning evaluates supplied facts directly; it does not require initialized engagement records.

**Enter when:** scope is understood and the work needs breaking down - a slice, a phase, or the whole delivery.

**Read first:** `reality.md`, `success.md`, `terrain.md`, `stakeholders.md`. Load `business-case.md` if poc produced one. Not the full folder.

**On an initialized engagement, before a new delivery plan or material scope change:** run `fde doctor --ready`. For standalone planning, check the supplied outcome, scope, acceptance and authority directly; do not initialize records to run this validator. Missing acceptance criteria or authority blocks the affected implementation commitment, not a provisional plan. Draft proposed checks and next steps, mark them pending, and ask only what changes the next action. Use a test/input and observable pass/fail under **Done when:** or **Acceptance check:**. A number, role, or successful demo alone is insufficient. Do not invent missing facts to pass lint. Routine reversible fixes within confirmed scope reuse the existing signer, acceptance criteria, and engineering plan; record verification without reopening settled decisions.

## Validation gate (confirm understanding, clarify where it elevates)

Before planning, state what you're working from in 2-3 lines:

> "Planning against: [success definition from success.md]. Scope boundary: [out-of-scope items]. Reality check: [brief aligns with reality.md / or note the delta]."

Then check - probe ONLY if it prevents a bad plan:

1. **Success is measurable.** If "done" is vague ("make it better") → rephrase it: "I'm reading success as: [specific measurable outcome]. That the target?"
2. **Reality matches the brief.** If discovery contradicted the brief → name it: "Discovery found [X] but the brief says [Y]. Here is the proposed adjustment; it remains unagreed until confirmed."
3. **Out-of-scope exists.** If missing → one line: "I will keep this draft within the supplied request and mark proposed exclusions for confirmation."

State your read, let the FDE correct, then plan.

An FDE plan is not a sprint backlog. The technical sequence is the easy part. The hard part is when to show progress, who approves the next phase, and where trust is thin enough that two silent weeks read as failure. A technically correct plan that ignores engagement politics fails on schedule.

## Method (you do this work)

**0. Lock scope first.** Read `success.md`, `assumptions.md`, and the **Question** on `reality.md`. Make the boundary explicit using the supplied request; ask if an ambiguity changes the commitment. Resolve a critical open assumption before committing to or executing dependent work; a provisional plan may show the unresolved dependency. If the problem itself is unclear, use discovery for that gap; absent filenames do not block a plan supported by supplied facts.

When a premise behind an existing plan changes, identify affected slices before revising commitments, preserve prior decisions, and keep replacement choices pending until authorized. Do not reopen unrelated settled work.

**Reuse check.** Before sequencing a build, compare the requested solution with the smallest existing capability or operating change that could satisfy the same acceptance test. Cite the relevant repo/config/workaround evidence. Record why reuse is sufficient or insufficient in `decisions.md`; include “no new code” when supported. A request for AI does not establish that a model is needed. If a host engineering pack already has an approved implementation plan, reference it from `decisions.md`; do not generate a parallel user-story backlog.

Preserve supplied ticket identifiers and blocking dependencies; do not renumber them. For a dependency, name what it blocks, its status, and the responsible owner or unresolved question. Keep independent work moving. Reuse the customer's domain terms; define a term in the existing plan or glossary only when ambiguity could change behavior or acceptance. Do not introduce another ticket scheme or glossary by default.

**1. Work backwards from success.** What's the last thing that must be true before done? And before that? That's the dependency chain - not a wish list.

**2. Front-load the fragile.** Check `terrain.md` hotspots. Risky modules go early - fail fast, not in week three.

**3. One user action per change.** Each task delivers something visible and testable ("user submits form, sees it saved"), never a layer ("build the database layer"). See `ship`.

**4. Size to a coherent, verifiable outcome.** Split unrelated work and tasks too complex to review or recover safely. Use bounded review sections for large cohesive changes; elapsed time and line count are signals to examine, not universal limits.

**5. AI components get explicit eval tasks.** Plan representative permitted examples, relevant failure cases, fallback checks and policy-compliant observability. Choose sample sizes and thresholds from the decision and risk; do not assume production data or raw input/output logging is permitted.

**6. Agree useful stakeholder touchpoints.** Name who needs to see which result before the next decision. Reuse the customer's existing review cadence; task count alone does not justify another meeting or imply lost trust.

**7. End with a kill list.** Every plan names what you will **not** do this phase. If everything is "later," you have no plan - you have a wish list. Keep **Now** small enough to review and act on; split by independently verifiable outcomes.

Carry the agreed acceptance checks and their source into implementation and verification, preferably by linking the existing record. Added checks may strengthen coverage; changing a threshold or removing a requirement remains a proposal until the appropriate decision-maker approves the change with a dated source. Record what changed and why; a passing weaker test does not satisfy the original agreement.

**Acceptance criteria gate:** no task moves to build without written happy-path AND unhappy-path criteria. Can't write them = the task isn't understood; the open question goes to the customer **before** the task starts. Vague criteria surface later as scope creep and rework.

## Artifact

For standalone planning, return the requested draft or save to the authorized project document. In a bound engagement, propose the plan for **`decisions.md`** under its confirmation rules, or link the existing approved plan; do not duplicate it.

A plan is **not done** until all four blocks exist:

```markdown
## Plan - <date>
### Now
Task <existing ID, or local label when none supplied>: <outcome, not activity>
Blocked by: <existing task/access/decision + status and owner, or none>
Delivers: <what someone can see/test>
Accepts: <happy path> / <unhappy path>
Touches: <files/systems - blast radius declared upfront>
Risk: <what could go wrong + fallback>
Kill if: <the observation that voids this slice - copy from assumptions.md How we test, or the check that means stop>
Verify: <specific check>
Value promised: <business unit change this slice claims>
Baseline: <value + source/date/window/environment, or pending + measurement owner>
Acceptance owner: <name + authority source, or unknown - ask: who can accept?>
Evidence to collect: <before/after check, sample/window, environment, and receipt location>
Reuse: <existing capability used, or evidence it cannot satisfy the criteria>

### Next
- ...

### Later
- ...

### Kill list (explicitly not this phase)
| Item | Why killed / deferred | Who accepted |
|------|----------------------|--------------|
| <rewrite / nice-to-have / political ask> | <evidence> | <name, date> |
```

In `Who accepted`, distinguish a proposed deferral from an agreement: use `pending` until a named person accepted this scope with a dated source. Sponsorship alone is not approval of every plan detail.

Check the plan against every supplied requirement and constraint. Each must map to a task and acceptance check, an explicitly accepted exclusion, or a visible unresolved decision. Do not silently omit a requirement to simplify the plan. Reuse an existing approved plan rather than creating a second coverage record. If no work is deferred, say so; do not invent exclusions to fill the template.
## Checkpoint

Walk the FDE through: sequence + why this order, where the fragile work sits, where the touchpoints land, the acceptance gate and **Kill if** on task 1, and the kill list. State who sees the first slice and when, which exclusions are accepted or proposed, and what observation stops task 1. Reuse supplied answers; ask only about a missing or consequentially ambiguous answer.

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

Choose the strategy from the existing contracts and permitted operating constraints before sequencing changes.

**Step 1: Classify what changes.** Rehost moves infrastructure; replatform changes platform dependencies; refactor changes implementation; replace introduces a different system; retire removes one. Identify affected data, callers, ownership and external effects. The label alone does not determine the risk.

**Step 2: Order by compatibility.** Map who calls or reads what, which versions coexist, and which prerequisite each change needs. There is no universal leaf-first order. Add compatible schema/API capabilities and reader support before switching dependent writers or callers. Remove an old contract only after its consumers and retention obligations permit it, within approved scope.

**Step 3: Choose cutover and data handling.** Compare a direct switch, staged replacement or parallel comparison against downtime, consistency, capacity and side-effect constraints. Parallel execution must not duplicate customer actions. For a live backfill, define resumable batches, how concurrent writes are preserved, and reconciliation of actual values and tenant ownership; row counts alone do not prove correctness. Use the existing platform's supported mechanisms and test their failure cases.

**Step 4: Specify recovery before cutover.** Use the recovery required for release: rollback, restore, compensation or roll-forward must match the effects that persist and the agreed recovery limits. Do not route to an old binary that cannot read new writes. Identify the irreversible boundary, required authority, operator and stop conditions; exercise the chosen recovery in a permitted representative environment before release. Missing recovery evidence blocks cutover, not useful planning or reversible preparation.

**Step 5: Define phase acceptance.** Check supported old/new version combinations, no lost updates, tenant isolation and relevant service-level targets. Record baseline, environment, thresholds, evidence and operating owner rather than imposing generic percentages.

In a bound engagement, propose the migration plan in `decisions.md` under `## Migration`. Each step records compatibility prerequisites, cutover/data handling, recovery and acceptance evidence. Standalone work returns the same plan directly.

## When the plan changes mid-engagement

Never quietly update tasks. Name the reset: update `reality.md` and `success.md`, one paragraph in `decisions.md` - what changed, why, new sequence. An undocumented reset looks like drift; a documented one looks like the FDE caught something important.

## Worked example

Acme, after discover: the reconciliation job is unowned, Marco's spreadsheet is the real fallback.

**Now** is three tasks, not eight. Task 1 is *failures reach a named human* - delivers a page to a rota, accepts "a permitted staging failure → the agreed operator receives the test alert within 15 min", touches the job wrapper and the alert config, rollback is re-disable the route, **Kill if:** the approved drill alert is acked by nobody on the rota (the *finance would act* assumption, DISPROVED if Marco is the only name that answers), verify in an approved staging drill with the operator and route agreed beforehand. Record configured, delivered and acknowledged separately; the drill does not authorize production paging. Value promised: `risk-mitigation - a silent failure becomes a 15-minute one`.

The kill list in `decisions.md` is where the plan earns its keep: the rewrite of the reconciliation service that Tom keeps proposing goes there - *deferred, the failure mode is ownership not architecture (Priya accepted, Jun 12)* - along with the finance dashboard finance asked for directly. Both stay visible so the same argument is not re-litigated in week 4 without a receipt.

First visible slice goes to Marco, not Priya: he is the one whose morning changes, and his confirmation is what makes the sponsor update true.

## Principles

- Plan from success backwards, not from today forwards.
- Fragile zones early. Fail fast.
- Touchpoints serve the next customer decision and agreed cadence.
- No written acceptance criteria, no build.
- No kill list, no finished plan.
- No **Kill if** on a Now PR, that PR is hope.
- Estimates are ranges, not promises. Name the assumptions and the observation that voids them.
- Migrations: compatibility determines order; verified recovery precedes cutover.
