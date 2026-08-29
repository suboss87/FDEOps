# ship - on their site, then live

**Enter when:** you are writing or updating on their codebase, they need to see something real, or you are going live.

**Read first:** `context.md`, `decisions.md`, `delivery.md`, `success.md`. Load `terrain.md` before you touch their code. Load `trust-profile.md` if the deploy touches regulated data or needs an approval chain. Load `evals.md` when the work touches AI/ML/LLM/RAG/agents.

Do not ask them to pick a mode. Name where you are, then start at the matching section:

- Nothing on their staging yet → **one change they can see**
- On staging, the signer in `success.md` can reject it → **go-live**
- Prod is the question → **go-live**. Do not start a second change.

If going live, opening question: **has anyone actually *run* the rollback, or is it still a slide?** If only planned, that's today's work - say so plainly.

A same-day throwaway that kills an assumption is `poc`. This method is the real change on a repo they will own, then production.

## Field (name it once, then the same loop)

| | Brownfield | Greenfield |
|--|------------|------------|
| What you touch | Code they already run | A new path or empty tree they will own |
| First move | Characterise their tests, their runner, the workaround in `terrain.md` | First path a user can click. Not the whole product. |
| Proof | Their staging, a screen they already use | Their staging, or the environment they will operate. Local demo is not delivery. |
| Undo | Revert this change on its own | Same. If you cannot undo it, the design is coupled. |

Skip POC only when the killer assumption already lives in the repo (typical brownfield). If the bet is unproven, `poc` first.

## Method - one change they can see

One change = one thing a user can do, with a test, that you can revert on its own. Not "all the APIs, then all the UI." Not a 2,000-line dump. A PR is how this often lands. It is not the job. The job is the change they can see.

```
BAD (layers):
  1: all database models
  2: all API endpoints
  3: all UI components
  4: wire everything together (and pray)

GOOD (one user action each):
  1: User can create a payment (schema + endpoint + minimal UI) - testable
  2: User can view payment status (query + endpoint + UI) - testable
  3: Payment retry on failure (logic + endpoint + UI feedback) - testable
  4: Admin can void a payment (auth + logic + UI) - testable
```

Each change is independently revertible.

**Before you start this change:**

- [ ] It is in `decisions.md` with acceptance criteria (happy + unhappy path)
- [ ] Blast radius declared: which files, which systems, which users affected
- [ ] Rollback named: revert this change, or something more specific
- [ ] No dependency on an unmerged change (if dependent, state it and land in order)
- [ ] `Kill if` is written - the observation that stops this change

**The loop.** In this order:

```
Read existing code in the area (search before creating)
  → Characterise what is already there (their tests, their runner; greenfield: the empty tree)
    → Implement the smallest path that works
      → Prove it on their staging (below)
        → Cleanup pass (dedupe, simplify - behaviour unchanged)
          → Self-review against acceptance criteria
            → Commit with a message the client's team can read
              → Update decisions.md + delivery.md
```

**Prove it on their staging.** A green check on your laptop is not delivery.

- Run **their** test command, typecheck, or smallest proving path. Write the command and the result in `delivery.md`.
- If the signer in `success.md` cannot reject this on a screen they already use, it is not proven.
- Staging they operate beats a local demo. If you have no staging: `unknown - ask:` who owns an environment, then stop pretending it shipped.
- Model in the path: `eval-pack` until `evals.md` says SHIP. Do not skip because "it looked right in chat."

The proof is whatever this client already believes, plus one new receipt they can replay.

**Size.** Each change targets:

| Metric | Target | Why |
|--------|--------|-----|
| Lines changed | 100-300 | Reviewable in one sitting |
| Time to implement | 30-90 minutes | Testable before context decays |
| Files touched | 1-5 | Blast radius stays containable |
| Tests added | ≥1 per new behaviour | Proves this change; guards against regression |

Larger than 300 lines → split first. "It's all connected" means the design needs work, not a bigger dump.

**Show it.** Every 2-3 changes, something the customer can see: an endpoint they can hit, a UI they can click, a metric that moved, a risk that was retired. Technical progress invisible to stakeholders is trust decay. `delivery.md` gets updated after every visible change.

**The scope trap.** Mid-change discoveries ("this module also needs updating," "I should refactor this while I'm here"):

- If it's in `decisions.md`: do it as a separate change.
- If it's NOT in `decisions.md`: log it as a scope receipt (see `hold-scope.md`), don't touch it.
- Ugly code outside this change stays ugly. That is discipline, not laziness.

After each change: tests pass (state the command and result), acceptance criteria met, blast radius as declared, `Kill if` still false. After every 2-3: what did they see, and what's their signal? Then, when the signer can reject it on their staging, go-live below.

---

## Deployment readiness gate (confirm the target before building the runway)

Before scoring readiness, confirm WHERE this is going. State it in 2-3 lines - brief playback that invites correction:

> "Deploying to: [target]. Pipeline: [how it gets there]. Rollback mechanism: [how to undo]. Any constraint I should know about?"

**The checklist (confirm, don't assume):**

| Dimension | Question | Status |
|-----------|----------|--------|
| **Target** | Cloud provider + service (ECS/Lambda/K8s/VM/on-prem)? | |
| **Pipeline** | CI/CD exists? Manual? Who triggers prod deploy? | |
| **Environments** | Dev → staging → prod path clear? Or deploying direct? | |
| **Secrets** | Where do they live? (vault/SSM/env vars) Who provisions? | |
| **Access** | Do YOU have deploy permissions, or does someone else push? | |
| **Compliance** | Region constraints? Data residency? Encryption requirements? CAB/change window? | |
| **Infra-as-code** | Terraform/Pulumi/CDK/manual? State file location? | |

**If anything is blank:** ask now. Discovering deployment constraints after the change is where timelines slip. If the client hasn't defined these yet, that's a conversation before you write the runbook - not after.

Write confirmed deployment context to `delivery.md` under a `## Deployment target` section.

---

## Method - readiness gate (score before touching the deploy button)

Score each dimension green/amber/red. This is the gate, not a suggestion:

| Dimension | Green | Amber | Red |
|-----------|-------|-------|-----|
| Tests | All pass on deploy branch | Flaky tests skipped with justification | Failures present or tests not run |
| Rollback | Tested end-to-end (not planned - TESTED) | Documented but untested | No rollback path defined |
| Sign-off | Stakeholder approval in `decisions.md` with date | Verbal approval, not logged | No approval sought |
| Runbook | Exists and someone other than you has read it | Exists but unreviewed | Missing |
| Monitoring | Alerts configured, owner named, dashboard live | Alerts configured, no named owner | No monitoring |

### Value + receipts gate (score with the table above)

| Dimension | Green | Amber | Red |
|-----------|-------|-------|-----|
| **Value bucket** | `success.md` names primary bucket (`cost-save` \| `risk-mitigation` \| `revenue-uplift`) and a baseline→target metric; this change's value-ledger row has **Bucket** + **Promised** | Bucket named; **Measured** still `pending` with a pulse date | No bucket, or Promised empty / ticket-theater only |
| **Audit receipt** | Dated line in `delivery.md` (`## Ship receipts` or ledger Evidence) proving exceptions/operating path were walked - cite `terrain.md` / `reality.md` / `audit.md` | Path described, not verified this ship | No audit receipt for this change |
| **Eval receipt** | **n/a** (no AI on this change) **or** `evals.md` Verdict SHIP with dated golden run + HITL gate named | Eval pack exists; known fails open with owner + date | AI in scope and no eval receipt |
| **AI eval pack** | `.fde/evals.md` Verdict SHIP; goldens run this change; critical fails 0; HITL filled if policy requires | Pack exists; run stale vs change log | AI-touching deploy and pack missing / NO-SHIP / HITL required but empty |

**Any RED = stop. Do not deploy. Fix the red dimension first.**
**2+ AMBER = sponsor conversation before deploying.** Present the ambers and get explicit "proceed" or "fix first."

**AI-touching deploys (model, embeddings, RAG, agent, or inference path):**
1. Read `.fde/evals.md`. If missing → **RED. Do not deploy.** Create the pack (`eval-pack` / `ai` overlay) and re-score.
2. If Verdict is not **SHIP**, or Last run is older than the latest change-log row → **RED.**
3. If `trust-profile.md` requires human-in-the-loop and the HITL gate has no reviewer → **RED.**
4. Log in `delivery.md` → `## Ship receipts` before deploy: audit cite + eval receipt.
5. Non-AI deploys: Eval = **n/a** - do not invent an empty pack.

Write the readiness score (including value + receipts) to `delivery.md` before deploying. The score is the evidence if anything goes wrong.

## Intent vs diff (before pre-blast)

Ship the change you intended - not the drift that snuck in. Run this on the deploy branch against the **one-line intent** from `decisions.md` / `success.md` (the change you said you were building).

```bash
git diff <base>...HEAD --stat
git diff <base>...HEAD
```

Score every touched path (or logical hunk):

| Path / change | Verdict | Rule |
|---------------|---------|------|
| | **KEEP** | Directly required for the stated intent |
| | **JUSTIFY** | Adjacent but load-bearing - one sentence why it must ship *now*, or split |
| | **SPLIT** | Real work, wrong change - park in `decisions.md` kill/Next; do not deploy with this one |
| | **DROP** | Noise (format-only, drive-by rename, unrelated tidy) - revert before ship |

**Any SPLIT or DROP still in the tree = fix-first.** JUSTIFY without a written sentence = treat as SPLIT. Log a one-line receipt in `delivery.md`: `intent vs diff: KEEP n · JUSTIFY n · SPLIT n · DROP n - <intent>`.

This is **code drift**, not stakeholder "also can you…" (that is `hold-scope`). Same family as review Stage 1 - ship refuses green when the diff outgrew the claim.

## Pre-blast challenge (before the deploy button)

For any non-trivial go-live (shared infra, regulated data, irreversible migration, or first prod touch), run this once before canary - not as theater, as a stop-the-line check:

```
CLAIM: <what you are about to ship, in one sentence>
WHY IT MATTERS: <blast radius / who feels pain if wrong>
CHALLENGE: <the strongest argument this is not ready - grounded in delivery.md / risks.md / trust-profile.md>
VERDICT: proceed | fix-first | sponsor conversation
```

Rules: no invented stakeholders; if evidence is missing, the verdict is **fix-first** or **sponsor conversation**, not "probably fine." Log the CLAIM + VERDICT as a dated line in `delivery.md`. Skip for mechanical one-line config with an already-tested rollback.

## Method - pre-flight (you verify each, confirmed not assumed)

- All tests pass - state the command and result.
- No hardcoded secrets/credentials (repeat `--include` per extension - brace globs silently match nothing):
```bash
grep -rnE "(api[_-]?key|secret|password|token)\s*[:=]\s*['\"][^'\"]{8,}" \
  --include="*.js" --include="*.ts" --include="*.py" --include="*.env" \
  --include="*.yaml" --include="*.json" . | grep -vE "example|template|test" | head
```
- DB migrations reversible.
- Rollback documented **and tested**.
- Monitoring alerts configured, someone watching.
- Team knows the deploy is happening.
- Not a Friday unless genuine emergency with someone on call.
- **Change approval (CAB) environments:** window open, ticket approved. In banking/healthcare/gov, deploying outside an approved window is a compliance finding even when the deploy succeeds. "We didn't know there was a CAB process" is not a defence - find out before the deploy date.

## Method - the deploy

**Canary:** 1-5% of traffic, ≥10 minutes. Watch error rate, latency, and **the business metric this change affects**. Anything looks wrong → roll back immediately; investigate safely; redeploy when confident. Never investigate during the canary. Then stage up: 5% → 25% → 100%, each confirmed stable.

**Programme-scale rollout (transformations)** - different problem from one service:
1. **Pilot** - one team, one use case; success metrics defined *before* it starts (after = fitting metrics to results).
2. **Limited release** - 3-5 teams, real load; this is where the failure modes the pilot hid show up.
3. **Broad release** - self-serve onboarding; if teams still need the FDE to start, onboarding isn't finished.
4. **Enterprise standard** - the FDE is no longer needed for this use case. That's the end state.
Straight from pilot to standard = a high-profile failure at scale.

## Method - after

Smoke tests against production. Verify the business metric moved the right way. Then **define the pulse before closing the laptop** - a deploy without a pulse is one you'll hear about only when it breaks:

1. **Metric:** the number that says it's working - "p99 on payment endpoint < 800ms", not "errors low."
2. **Frequency:** daily week one, weekly after, monthly when stable.
3. **Threshold:** the exact value that triggers incident response. Nobody knows the number → nobody acts until too late.

AI components: also define what *normal output* looks like and check a weekly sample of real production outputs - drift is technically-valid-but-wrong, and no exception will fire.

## Method - scale readiness (pilot proved it, now deploy enterprise-wide)

95% of AI pilots fail to reach production. The gap isn't technical - it's organizational, governance, and infrastructure readiness. This checklist determines whether the pilot is ready to scale.

**The scale-readiness gate (all must be YES before broad rollout):**

| Dimension | Question | Ready? |
|-----------|----------|--------|
| **Infra** | Can the system handle 10× current load without architectural change? | |
| **Ops** | Can someone other than the FDE operate it at 2am? (runbook exists, tested) | |
| **Data** | Is the data pipeline automated, not manual? Does it handle upstream schema changes? | |
| **Security** | Has infosec signed off for production data at scale? | |
| **Cost** | Is the cost model viable at 10× volume? (AI inference costs scale non-linearly) | |
| **Governance** | Is there an owner, a review cadence, and an escalation path? | |
| **Support** | Can users get help without the FDE? (docs, training, L1 support path) | |
| **Measurement** | Are success metrics automated and dashboarded, not manually calculated? | |

**If any dimension is "No":** that's the work before scaling. Name it, size it, put it in the plan. Scaling without readiness = a high-profile failure that kills the entire programme.

**The scale sequence:**
1. **Pilot** (1 team, controlled) → prove value, find failure modes
2. **Limited** (3-5 teams, real load) → prove operability, find scale bugs
3. **Broad** (self-serve onboarding) → prove the team doesn't need the FDE
4. **Standard** (enterprise default) → the FDE exits this workstream

Never skip a step. The sponsor always wants to skip from pilot to standard - that's the conversation the FDE protects.

## Method - progressive adoption (built it, now people need to use it)

Adoption isn't a handoff-stage problem - it starts while you are still writing the change. Software that launches to silence is software that gets decommissioned.

**During the change:**
- **Feature flags from day one.** Every new capability behind a flag. Ship to 5% of users first. Watch behavior before opening to 100%.
- **Feedback loops built in.** A thumbs-up/down, a "was this helpful?", a usage counter. Instrument adoption, don't assume it.
- **Resistance signals.** Watch for: workaround creation (they built a spreadsheet instead of using the tool), drop-off after day 3 (onboarding fails), vocal detractors (one influential skeptic can kill adoption). Address these before launch, not after.

**At launch:**
- **Champion network.** Identify 2-3 power users per team who adopt early. Support them intensely - they become your multiplier.
- **30-60-90 adoption targets.** Week 1: 20% of target users try it. Week 4: 50% use it weekly. Week 12: 80% can't imagine working without it. If week 1 misses → the onboarding is broken. If week 4 misses → the value proposition is wrong.
- **The "switching cost" test.** If users can still do it the old way, they will. Adoption requires either: the old way is removed, the new way is dramatically better, or management mandates the switch. Know which lever applies.

**Write adoption metrics to `delivery.md`:** active users, frequency, drop-off points, resistance signals. This is the evidence for renewal.

## Artifact

**`decisions.md`** - each change: what was implemented, what was tested, what was deferred, `Kill if`.

**`delivery.md`** - each visible change in business language; then the deployment record: what shipped, when, rollback procedure, pulse definition, **scale-readiness assessment, and adoption metrics**. Written for whoever inherits the system.

## Checkpoint

After each change: tests pass, acceptance criteria met, blast radius as declared, `Kill if` still false, proven on staging they operate.

Before 100% live: canary clean, business metric verified, pulse written into `delivery.md`. Also green: value bucket named, audit receipt dated, eval receipt **n/a or pass**, **intent vs diff clean** (no unresolved SPLIT/DROP). Missing any of those → not green. For enterprise-scale: scale-readiness gate passed before broad rollout.

## Worked example

Acme, brownfield. Plan Now has three changes, not "the payments rewrite."

Change 1 is *user sees retry status on a failed payment* - schema + endpoint + the existing ops screen, 180 lines, their `pytest -k payments` green, revert is this change. `Kill if:` the signer cannot reject it on the screen they already use. Ugly retry-queue code two files over stays ugly. `decisions.md` logs the change; `delivery.md` says ops can see a retry without opening the spreadsheet. Marco sees it on staging they operate. That is the proof. Local green was not.

Then Thursday go-live of the failure-routing change. Readiness scoring catches two things the diff does not. The audit receipt is missing: the operating map says Marco's manual re-run is the fallback, and nobody has checked whether the new page fires *before* his morning run or after - if after, the alert changes nothing. That gets walked and cited before deploy. Second, the intent-vs-diff read shows the PR also touches the settlement retry that was deferred; it comes out.

Pre-blast challenge: "what does this break if it fires at 3am and nobody acks?" Answer: nothing breaks, but the rota is not yet agreed - so the deploy waits on a name, not on code. That is a one-day slip that prevents a fake green.

After deploy: `delivery.md` ship receipt with the audit cite, the kill test evidence, and the rollback line. Eval receipt: n/a, no AI in this path.

Greenfield is the same loop with an empty tree: first path a user can click, on an environment they will operate, then this go-live. Not the whole product in one dump.

## Principles

- One user action per change. Layers are untestable until assembled.
- On their staging, and you can undo it. Local green is not delivery.
- The ugly code outside this change stays ugly. That's discipline, not laziness.
- A deployment without a tested rollback is reckless.
- Roll back on any canary anomaly; investigate safely.
- Verify the business metric, not just the technical one.
- No value bucket, no green ship. No pulse, no done.
- Diff larger than the stated intent without KEEP/JUSTIFY receipts = fix-first.
- AI path without eval receipt = fix-first; non-AI ships leave eval as n/a.
- Scale readiness is organizational, not just technical. Check all 8 dimensions.
- Adoption is measured from day one, not hoped for at launch.
