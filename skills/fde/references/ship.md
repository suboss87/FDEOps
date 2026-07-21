# ship - production without surprises

**Enter when:** a slice is built, reviewed, and ready to deploy.

**Read first:** `context.md`, `delivery.md`, `success.md`. Load `trust-profile.md` if the deploy touches regulated data or needs an approval chain. Load `evals.md` when the deploy touches AI/ML/LLM/RAG/agents.

Opening question, calm tech lead voice: **has anyone actually *run* the rollback, or is it still a slide?** If only planned, that's today's work - say so plainly.

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

**If anything is blank:** ask now. Discovering deployment constraints AFTER build is where timelines slip. If the client hasn't defined these yet, that's a conversation before you write the runbook - not after.

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
| **Value bucket** | `success.md` names primary bucket (`cost-save` \| `risk-mitigation` \| `revenue-uplift`) and a baseline→target metric; this slice’s value-ledger row has **Bucket** + **Promised** | Bucket named; **Measured** still `pending` with a pulse date | No bucket, or Promised empty / ticket-theater only |
| **Audit receipt** | Dated line in `delivery.md` (`## Ship receipts` or ledger Evidence) proving exceptions/operating path were walked — cite `terrain.md` / `reality.md` / `audit.md` | Path described, not verified this ship | No audit receipt for this slice |
| **Eval receipt** | **n/a** (no AI on this slice) **or** `evals.md` Verdict SHIP with dated golden run + HITL gate named | Eval pack exists; known fails open with owner + date | AI in scope and no eval receipt |
| **AI eval pack** | `.fde/evals.md` Verdict SHIP; goldens run this change; critical fails 0; HITL filled if policy requires | Pack exists; run stale vs change log | AI-touching deploy and pack missing / NO-SHIP / HITL required but empty |

**Any RED = stop. Do not deploy. Fix the red dimension first.**
**2+ AMBER = sponsor conversation before deploying.** Present the ambers and get explicit "proceed" or "fix first."

**AI-touching deploys (model, embeddings, RAG, agent, or inference path):**
1. Read `.fde/evals.md`. If missing → **RED. Do not deploy.** Create the pack (`eval-pack` / `ai` overlay) and re-score.
2. If Verdict is not **SHIP**, or Last run is older than the latest change-log row → **RED.**
3. If `trust-profile.md` requires human-in-the-loop and the HITL gate has no reviewer → **RED.**
4. Log in `delivery.md` → `## Ship receipts` before deploy: audit cite + eval receipt.
5. Non-AI deploys: Eval = **n/a** — do not invent an empty pack.

Write the readiness score (including value + receipts) to `delivery.md` before deploying. The score is the evidence if anything goes wrong.

## Intent vs diff (before pre-blast)

Ship the change you intended — not the drift that snuck in. Run this on the deploy branch against the **one-line intent** from `decisions.md` / `success.md` (the slice you said you were building).

```bash
git diff <base>...HEAD --stat
git diff <base>...HEAD
```

Score every touched path (or logical hunk):

| Path / change | Verdict | Rule |
|---------------|---------|------|
| | **KEEP** | Directly required for the stated intent |
| | **JUSTIFY** | Adjacent but load-bearing — one sentence why it must ship *now*, or split |
| | **SPLIT** | Real work, wrong PR — park in `decisions.md` kill/Next; do not deploy with this slice |
| | **DROP** | Noise (format-only, drive-by rename, unrelated tidy) — revert before ship |

**Any SPLIT or DROP still in the tree = fix-first.** JUSTIFY without a written sentence = treat as SPLIT. Log a one-line receipt in `delivery.md`: `intent vs diff: KEEP n · JUSTIFY n · SPLIT n · DROP n — <intent>`.

This is **code drift**, not stakeholder "also can you…" (that is `scope-defense`). Same family as review Stage 1 — ship refuses green when the diff outgrew the claim.

## Pre-blast challenge (before the deploy button)

For any non-trivial go-live (shared infra, regulated data, irreversible migration, or first prod touch), run this once before canary — not as theater, as a stop-the-line check:

```
CLAIM: <what you are about to ship, in one sentence>
WHY IT MATTERS: <blast radius / who feels pain if wrong>
CHALLENGE: <the strongest argument this is not ready — grounded in delivery.md / risks.md / trust-profile.md>
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

**Canary:** 1–5% of traffic, ≥10 minutes. Watch error rate, latency, and **the business metric this change affects**. Anything looks wrong → roll back immediately; investigate safely; redeploy when confident. Never investigate during the canary. Then stage up: 5% → 25% → 100%, each confirmed stable.

**Programme-scale rollout (transformations)** - different problem from one service:
1. **Pilot** - one team, one use case; success metrics defined *before* it starts (after = fitting metrics to results).
2. **Limited release** - 3–5 teams, real load; this is where the failure modes the pilot hid show up.
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
2. **Limited** (3–5 teams, real load) → prove operability, find scale bugs
3. **Broad** (self-serve onboarding) → prove the team doesn't need the FDE
4. **Standard** (enterprise default) → the FDE exits this workstream

Never skip a step. The sponsor always wants to skip from pilot to standard - that's the conversation the FDE protects.

## Method - progressive adoption (built it, now people need to use it)

Adoption isn't a handoff-stage problem - it starts during build. Software that launches to silence is software that gets decommissioned.

**During build:**
- **Feature flags from day one.** Every new capability behind a flag. Ship to 5% of users first. Watch behavior before opening to 100%.
- **Feedback loops built in.** A thumbs-up/down, a "was this helpful?", a usage counter. Instrument adoption, don't assume it.
- **Resistance signals.** Watch for: workaround creation (they built a spreadsheet instead of using the tool), drop-off after day 3 (onboarding fails), vocal detractors (one influential skeptic can kill adoption). Address these DURING build, not after launch.

**At launch:**
- **Champion network.** Identify 2–3 power users per team who adopt early. Support them intensely - they become your multiplier.
- **30-60-90 adoption targets.** Week 1: 20% of target users try it. Week 4: 50% use it weekly. Week 12: 80% can't imagine working without it. If week 1 misses → the onboarding is broken. If week 4 misses → the value proposition is wrong.
- **The "switching cost" test.** If users can still do it the old way, they will. Adoption requires either: the old way is removed, the new way is dramatically better, or management mandates the switch. Know which lever applies.

**Write adoption metrics to `delivery.md`:** active users, frequency, drop-off points, resistance signals. This is the evidence for renewal.

## Artifact

**`delivery.md`** - deployment record: what shipped, when, what it delivers in business terms, rollback procedure, pulse definition, **scale-readiness assessment, and adoption metrics**. Written for whoever inherits the system.

## Checkpoint

Before 100%: canary clean, business metric verified, pulse written into `delivery.md`. Also green: value bucket named, audit receipt dated, eval receipt **n/a or pass**, **intent vs diff clean** (no unresolved SPLIT/DROP). Missing any of those → not green. For enterprise-scale: scale-readiness gate passed before broad rollout.

## Principles

- A deployment without a tested rollback is reckless.
- Roll back on any canary anomaly; investigate safely.
- Verify the business metric, not just the technical one.
- No value bucket, no green ship. No pulse, no done.
- Diff larger than the stated intent without KEEP/JUSTIFY receipts = fix-first.
- AI path without eval receipt = fix-first; non-AI ships leave eval as n/a.
- Scale readiness is organizational, not just technical. Check all 8 dimensions.
- Adoption is measured from day one, not hoped for at launch.
