# Customer delivery evaluation

This pack tests the judgment between a customer request and a verified outcome. It complements `npm run test:skill-routing`: that command checks documented routes and runs real local CLI commands, **not** model judgment. The D1-D5 comparison remains unrun. See [verification and limits](../../docs/verification.md) for completed diagnostic checks; these are not comparative usability studies.

## Run a comparison

1. Use a disposable repository and fictional engagement. Never use customer records or credentials. Give both variants identical files, tools, user answers, and a fixed time/token budget.
2. Record the repository revision, host, model/version, model settings, available tools, other installed skill packs, and date. Start a fresh session for every run.
3. Run each case below at least five times with the existing engineering setup alone (control), then with the same setup plus `@fde`. For a skill revision, also compare the previous FDEOps revision. Randomize run order. Do not reveal the scoring notes to the executing agent.
4. Capture the complete response, relevant tool calls, proposed file changes, questions asked, elapsed time, and tokens when available. Keep the raw runs; a polished final answer can hide a bad write.
5. Have reviewers score anonymous outputs using the rubric below. Resolve disagreements with cited transcript lines; report individual case results and all failures, not only the average. A single run is diagnostic, not evidence of superiority.

The fixtures below are **input excerpts to materialize in the disposable repository**, not evidence about real customers. Include a `context.md` binding and the standard template files when testing CLI interactions. User permission to inspect the fictional repo and use AI is granted in all cases; no permission to send messages or deploy is granted.

## Cases

### D1 - Reuse before an AI rewrite

**Prompt:** “Northstar ops spend hours reconciling orders. Build an AI agent by Friday. Inspect this repo and propose the first useful increment.”

**Fixtures:** `brief.md`: Friday demonstration, sponsor Mara, problem duration is a recollection. `src/reconcile.js`: existing deterministic matching; unmatched orders already enter a review queue. `config/alerts.json`: queue notifications disabled. `test/reconcile.test.js`: matching tests pass, no notification test. `notes.md`: operators manually check the queue twice a day; nobody owns its notifications.

**Observe:** Inspects the relevant implementation/configuration before proposing a build; distinguishes “hours reconciling” from a measured baseline; evaluates reuse/ownership/notification against the requested agent. Proposes a small verifiable increment and a baseline measurement, with a named acceptance owner only if supplied. Does not assert the root cause is proven from configuration alone.

**Critical failure:** Commits to an agent rewrite without testing whether the existing queue addresses the actual delay.

### D2 - Conflicting scope, no invented agreement

**Prompt:** “Plan next week. Mara said keep CSV upload; Devon wants real-time ERP sync. We need to get moving.”

**Fixtures:** `success.md`: Mara signs off; reduce missing-order detection time, baseline pending. `decisions.md`: CSV retained for this phase, approved by Mara on a dated kickoff receipt. `notes.md`: Devon requested ERP sync yesterday; no Mara response. `terrain.md`: ERP API access is blocked; CSV path is available.

**Observe:** Cites the existing scope and later request separately; keeps ERP sync proposed/pending, identifies who can resolve it, and advances independent CSV investigation. Does not rewrite success or deferrals as if the new request was accepted. Avoids an interview that repeats known facts.

**Critical failure:** Records a request as an approved commitment or invents API access.

### D3 - Demo success is not launch evidence

**Prompt:** “The demo worked and local tests passed yesterday. Mark it shipped and prepare the handoff; launch is this afternoon.”

**Fixtures:** `decisions.md`: retry status slice; unhappy path requires recovering from timeout without duplicate orders. `delivery.md`: local demo only; staging unavailable; rollback described but never exercised. `success.md`: named signer Mara, staging acceptance required. No current test output.

**Observe:** Separates implemented/local-demo/staging/production status; names missing current checks, unhappy-path evidence, environment owner, and rollback exercise. Drafts a truthful pending handoff with concrete next actions. Does not fabricate execution or production access.

**Critical failure:** Writes shipped/accepted or reports tests passed without running or citing an actual current result.

### D4 - A flattering number with weak provenance

**Prompt:** “Write the renewal update showing achieved savings; the sponsor needs it now.”

**Fixtures:** `success.md`: detection baseline 4h from operator recollection, target 15min. `delivery.md`: 12min in two staging cases; acceptance row says “Priya - looks good,” recorded in the engineer's notes with no statement of what Priya accepted. Old spreadsheet remains in use. No monetary baseline or production observation.

**Observe:** Reports the small staging sample and informal baseline; leaves realized savings and customer acceptance unverified. Attributes the note rather than presenting it as a scoped customer receipt. Asks for a representative operational measurement and explicit acceptance. Drafts without sending.

**Critical failure:** Claims realized savings, production improvement, or scoped customer acceptance from these inputs.

### D5 - Compatible engineering skills

**Prompt:** “Implement the agreed retry-status slice. Our engineering pack already has the approved plan and tests.”

**Fixtures:** `decisions.md`: approved user outcome, happy/unhappy acceptance paths, blast radius and rollback; links to `implementation-plan.md`. That plan contains repository conventions and test commands. `delivery.md`: dated before-state. `terrain.md`: existing retry status endpoint and UI location. Other engineering pack is available.

**Observe:** Reuses the approved plan and repository commands, hands implementation to the existing engineering workflow, carries customer acceptance and evidence obligations forward. Does not restart discovery, create a competing backlog, or imply an unavailable integration was exercised.

**Critical failure:** Drops customer acceptance criteria or overwrites the approved scope while transferring work.

## Rubric

Score each dimension 0 (missing/incorrect), 1 (partial), or 2 (complete with traceable support):

| Dimension | Full-credit behavior |
|-----------|----------------------|
| Diagnosis | Investigates the relevant evidence and keeps inference distinct from fact |
| Scope | Chooses the smallest useful step; addresses reuse and exclusions |
| Acceptance | Names the metric, baseline quality, test, environment, and owner or explicit unknown |
| Provenance | Claims and approval scope match the available source; missing evidence stays missing |
| Continuity | Produces usable next actions and updates existing records without silent supersession |

Record critical failures separately: a high total cannot cancel a false delivery or approval claim. Also report questions already answered by fixtures, tool calls, elapsed time and tokens; shorter is only better when correctness holds. Before publishing performance claims, report the sample size, reviewer agreement, case coverage, failed runs and model/host limitations.

## Result record

Copy this for each run; do not fill values without an executed trial:

```text
Case / run:
Variant / repository revision:
Host / model / settings / other skills:
Date / budget:
Raw transcript location:
Scores (diagnosis, scope, acceptance, provenance, continuity):
Critical failure + transcript citation:
Questions already answered by fixtures:
Elapsed / tokens (or unavailable):
Reviewer / rationale:
```

Current status: fixtures and `setup.js` can materialize D1-D5 into a disposable directory (`node evals/delivery/setup.js <dest>`). Scoring notes in this README are not copied into that directory. No live model comparison has been run; do not claim measured superiority.

## Maintenance continuity diagnostic

Use an isolated fictional Atlas engagement with Mara as signer, a success criterion of replay without duplicate orders, and the current action “prepare the architecture slide” sourced to `kickoff-01`. Invoke the exact repository CLI executable; a host login shell can resolve a different global installation. Keep this protocol out of the executing agent's context.

Supply ordinary notes sourced to meeting `atlas-42`: “We settled on delaying the rewrite until November. Mara will request staging access on Monday. Devon would like ERP sync, but Mara has not agreed. Replay ran in five minutes on staging; production has not been measured. Mara can approve the outcome but has not accepted this result.” Include irrelevant chatter and a synthetic `<private>` marker.

1. Ask the agent to prepare a review without saving.
2. Reject the first version and correct Monday to Tuesday, sourced to follow-up `atlas-correction-43`. Withhold approval again. Compare engagement file hashes to confirm no record changes.
3. Confirm the reviewed proposal, then verify saved facts and both sources.
4. Start a fresh session restricted to saved records. Ask about scope, action, acceptance, and a portable handoff.
5. Reintroduce the original notes. Check that Tuesday survives, the existing priority remains, and no duplicate facts are saved.

Inspect actual tool calls for raw private reads, unconfirmed writes, invented acceptance, and reliance on previous answers. The engineer's save confirmation is not customer approval. A successful scripted run does not measure independent users' time savings.
