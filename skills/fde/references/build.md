# build - safe implementation on someone else's codebase

**Enter when:** an agreed slice is ready to implement - feature, fix, integration, legacy change. Includes the review gate before merge.

**Read first:** `context.md`, `terrain.md`, `decisions.md`. Load `trust-profile.md` when touching regulated areas. No map or no plan → route to discover/plan first; say it plainly: "We're not ready to touch code until we know what's connected to this module."

## Validation gate (confirm understanding, clarify where it elevates)

Before starting, state what you're working with in 2-4 lines - a brief playback that invites correction, not a question:

> "Building: [task name]. Blast radius: [files/systems]. Terrain is [X days] fresh. [Any risk or concern worth naming, or 'clear to proceed']."

Then check - probe ONLY if it prevents a mistake:

1. **Acceptance criteria are falsifiable.** If the criteria are vague ("should work well", "handle errors gracefully") → rephrase them specifically: "I'm reading 'works well' as: responds in <500ms, retries 3x, alerts on failure. That right?"
2. **Terrain is current.** If terrain.md is significantly older than the plan → one line: "Terrain is from Day 3, plan from Day 8 - assuming nothing shifted in between."
3. **No open CRITICAL risk on the module.** If found → name it: "There's an open risk on this module (rate limiting). Building around it unless you say otherwise."

Don't interrogate. State your read, let the FDE correct if needed, then move.

## Spec generation (AI generates, human approves)

Before writing code, generate the implementation spec for this task and present it to the FDE:

```
Spec: [task name from decisions.md]
Inputs: [what triggers this - event, request, user action, data shape]
Outputs: [what the user/system sees when it works]
Accepts:
  - [scenario 1: specific testable outcome]
  - [scenario 2: specific testable outcome]
Edge cases:
  - [boundary condition]: [what happens]
  - [error scenario]: [what happens]
Constraints: [performance, security, compliance bounds from trust-profile.md]
```

Present this to the FDE: "Here's what I'm about to build. Any open questions or changes before I start?"

- FDE says "yes" / "go" / "approved" → build against the spec exactly
- FDE modifies → update spec, confirm, then build
- Fast-track: if the task is under 30 minutes and the FDE has established trust (week 2+), state the spec inline and proceed unless they object

The spec becomes the test list - every line is something to verify after build.

## The loop (you do this work, in this order)

1. **Confirm scope in writing.** The task exists in `decisions.md` with acceptance criteria. Not there → plan first or name the scope creep.
2. **Declare blast radius.** Read the full dependency chain of what you're about to change. State: which files, which users, which systems. The change that breaks something always looked small.
3. **Confirm the rollback path exists** before writing a line. "We can always revert" is not a rollback path.
4. **Legacy code: characterisation tests first.** Tests for what the code *actually does right now* - including the parts that seem wrong; those behaviours are the contract the system depends on. Then wrap with Strangler Fig: new interface around old code, deprecate gradually, never rewrite in place.
5. **Search before creating.** Read the existing code in the area; don't add parallel helpers where a service exists. Integrating an SDK/vendor API → read real source (local `reference/repos/...` or official repo) before guessing names; record the files used in `decisions.md`. If an API looks invented, stop and search source.
6. **Build the minimal working path.** Thin vertical slice the customer can see. No opportunistic refactors. Every changed line traces to the task.
7. **Verify with evidence.** Run tests/typechecks/smallest proving script. State what ran and what didn't. "Seems right" is never evidence.
8. **Convergence check (spec vs. reality).** Walk through every acceptance scenario and edge case from the spec. State each one explicitly with its result:
   - `[PASS]` scenario verified with evidence
   - `[FAIL]` scenario not met - fix before proceeding
   - `[DEFERRED]` intentionally left for a later task (state which one)
   Surface the results to the FDE. If any scenario fails, fix it before cleanup. This is not optional - the spec is the contract.
9. **Cleanup pass after it works.** Dedupe repeated mechanics into the smallest service module; behavior unchanged; re-run the same tests. If you wrote 200 lines and 50 would do, rewrite before review.
10. **Review gate (before merge):** two stages, in order - (a) **scope**: does the diff match the approved spec and `decisions.md`, nothing more? (b) **safety**: blast radius honest, tests meaningful, rollback real, secrets absent. Fix real findings, re-verify, repeat until clean or blocked on a human decision.
11. **Log and deliver.** Update the artifacts (below). Visible progress beats invisible perfection - every 2–3 tasks something shown to a stakeholder.

**Touching existing code - classify before changing:**
- **Fix now:** actively failing or blocking.
- **Fix when touched:** will bite when surrounding code changes - fix as part of this change.
- **Document and leave:** ugly but uninvolved. The hardest discipline. Opportunistic refactors create diffs nobody asked for and regressions nobody expected.

**AI components:** build the fallback path *before* the AI path (model slow? garbage? down?). Add observability before deploy: log inputs, outputs, confidence - hallucinations don't throw exceptions. Confirm the data processing agreement covers customer data before it goes to an external model; in regulated environments this is a blocker, not a detail.

**Regulated environments:** check the AI code policy in `trust-profile.md` first. Some modules require human review of AI-generated code or prohibit it. Find out before building, not after showing the code.

## Mid-build scope requests

"Also can you add…" → "That's worth looking at - let me place it." Current phase, future phase, or separate engagement? If it's outside `success.md`, name it: "Outside what we agreed; future phase or rescope conversation." Absorbed scope sets the precedent that the boundary doesn't exist - and in commercial engagements it silently moves billing and liability. Surface it to whoever owns the commercials.

## Method - integration design (connecting systems)

FDEs spend 40%+ of build time on integrations. Connecting system A to system B is where projects die quietly - wrong assumptions about APIs, missing auth, schema mismatches, rate limits.

**The integration checklist (before writing code):**

1. **Contract first.** Define what crosses the boundary: request shape, response shape, error shape. Write it down before calling anything. An undocumented contract changes without warning.
2. **Auth model.** OAuth2, API key, mTLS, SAML? Who provisions the credential? Who rotates it? What's the expiry? One expired token at 2am = production down.
3. **Rate limits and quotas.** Every external API has them, most aren't documented. Test with a burst early - don't discover the 429 on launch day.
4. **Error taxonomy.** Retryable (timeout, 503) vs. fatal (401, 422). Build retry with exponential backoff for the first, circuit-breaker for the second.
5. **Data transformation.** Their schema ≠ your schema. Map fields explicitly. Null handling rules. Timezone assumptions. Currency/locale. One unmapped field = silent data corruption.
6. **Idempotency.** Can you safely retry? If not, you need deduplication. Double-charges, double-posts, double-notifications - all integration bugs.
7. **Observability at the boundary.** Log every outbound call: request (redacted), response code, latency. The integration is the first thing to blame and the last thing instrumented.

**The integration contract template (write to `decisions.md`):**
```
Integration: [System A] → [System B]
Direction: push / pull / bidirectional
Auth: [method] - provisioned by [who] - expires [when]
Rate limit: [n] req/[period]
Retry: [strategy]
Data mapping: [field map or link to schema]
Failure mode: [what happens when B is down]
Owner: [who gets paged]
```

## Method - team amplification (making their engineers better)

The FDE's job is to make themselves replaceable. Not at handoff - every day. A client team that can only ship when the FDE is present is a dependency, not a success.

**Daily practices:**
- **Pair, don't take over.** When a client engineer is stuck, pair for 30 minutes rather than solving it alone in 10. The 10-minute fix creates dependency; the 30-minute pair creates capability.
- **Review their PRs with teaching intent.** Not "fix this" - "here's why this approach creates risk, and here's the pattern I'd use instead." Link to their own codebase for examples, not external docs.
- **Make decisions visible.** When you make an architecture choice, write a 3-line rationale in `decisions.md`. The team sees your reasoning, not just your output.
- **Name patterns, not just fixes.** "This is a circuit breaker pattern - here's when to use it again" converts one fix into a reusable skill.

**Weekly practices:**
- **One 30-min knowledge session per week.** Not a lecture - pick the hardest thing you built this week, walk through the thinking with the team. Answer: "why this approach and not the obvious one?"
- **Track the team's solo wins.** When a client engineer ships without FDE help, note it. This is the metric that proves the engagement is working.

**The independence signal:** When the team stops asking "how should we do X?" and starts asking "we're thinking X because Y - does that sound right?" - the engagement is succeeding.

## Stop signals - reassess immediately

- "I'll add tests after this works" - the regression is already in.
- "Small change, no need to declare blast radius" - famous last words.
- "I'll refactor this while I'm here" - unasked-for risk in an unrelated change.
- **Three fixes in and still broken - the diagnosis is wrong.** No fourth fix: state your current model of the problem, name the evidence that would disprove it, test that first (see `debug.md`).

## Artifact (logged as you go, not after)

- **`decisions.md`** - each significant choice: what, alternatives considered, why this one. For non-trivial architecture decisions, present three options to the FDE (safe / pragmatic / aggressive) with costs and a recommendation - three options is a real decision; one option is a request for trust. Integration contracts go here too.
- **`risks.md`** - new risks discovered while building.
- **`delivery.md`** - append a **value ledger** row for every ship: Date | Slice | Bucket | Promised | Measured | Evidence | Rollback. Bucket is `cost-save` / `risk-mitigation` / `revenue-uplift`. "Measured" may be `pending` until the pulse exists - never skip the promised column. Narrative under Shipped is optional color; the ledger is the record status and close read.

## Checkpoint

Before merge: the two-stage review (scope, then safety) has run clean, verification evidence is stated, and the slice is demonstrable. If `trust-profile.md` requires human sign-off on AI-generated code, that sign-off exists.

## Principles

- Characterisation tests before modification. Every time.
- Blast radius declared before every change; rollback confirmed before every deploy.
- Scope creep is a decision, not a request. Name it.
- Build the fallback before the AI feature.
- Small diffs, objective verification, no thousand-line hope PRs.
