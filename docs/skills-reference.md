# The catalog - one skill, 30 skills across 6 stages

v3 ships **one skill**: `@fde` ([skills/fde/SKILL.md](../skills/fde/SKILL.md)). You describe the situation; it routes to a stage and follows that skill from [skills/fde/references/](../skills/fde/references/). Engagement memory lives in `~/fde-engagements/<name>/.fde/` (one folder per customer).

Each reference is a **skill, not a prompt**: the thinking the agent does, the artifact it drafts, and the checkpoint with the human FDE. The **Use when** column below is what the router actually matches on - the phrases in `skills/fde/SKILL.md` that send you to that skill, not a paraphrase.

---

## The 6 stages

### Land
*Engage. First days. Access, credibility, scope.*

| Skill | What it does | Use when |
|-------|-------------|----------|
| [land](../skills/fde/references/land.md) | Interrogate the brief | Starting fresh, new customer, first meeting, just got the brief, set product strategy, define success metrics, scope the brief |
| [audit](../skills/fde/references/audit.md) | Verify inherited claims | Taking over, previous consultant left, joining mid-project |
| [who-decides](../skills/fde/references/who-decides.md) | Map decision rights | Need to understand who matters, who decides, who blocks quietly |
| [earn-trust](../skills/fde/references/earn-trust.md) | Earn access | Need to earn access, navigate AI policy, build credibility |
| [hold-scope](../skills/fde/references/hold-scope.md) | Hold scope | "Also can you...", scope expanding, timeline unchanged, scope the brief after kickoff |

### Discover
*Diagnose. Finding the real problem. Testing what the brief claims.*

| Skill | What it does | Use when |
|-------|-------------|----------|
| [discover](../skills/fde/references/discover.md) | Frame the problem | Don't know the real problem, brief feels wrong, shadow processes, frame discovery, understand the problem space, data not ready, data estate |
| [test-assumptions](../skills/fde/references/test-assumptions.md) | Test assumptions | The brief feels too neat, assumptions untested, "we just need..." |
| [score-use-cases](../skills/fde/references/score-use-cases.md) | Score use cases | Multiple use cases competing, "we want to do everything" |
| [poc](../skills/fde/references/poc.md) | Validate the solution | Need to validate a direction, prototype, demo to de-risk, validate the solution, build prototype |

### Plan
*Align. Sequencing work and getting sponsor alignment.*

| Skill | What it does | Use when |
|-------|-------------|----------|
| [plan](../skills/fde/references/plan.md) | Sequence the work | Break this down, what order, sequence the build, plan the roadmap, create user stories, write the tasks |
| [business-case](../skills/fde/references/business-case.md) | Build the business case | Sponsor needs justification, need to defend budget or timeline |
| [three-options](../skills/fde/references/three-options.md) | Generate options | Significant decision, multiple approaches, "what should we do?", generate solutions |
| [pick-three](../skills/fde/references/pick-three.md) | Prioritize three | 20 things are "urgent," need to pick the 3 that matter |

### Ship
*Deliver. On their codebase, their staging, then go-live.*

| Skill | What it does | Use when |
|-------|-------------|----------|
| [what-breaks](../skills/fde/references/what-breaks.md) | Assess impact | What could go wrong, touching shared infrastructure, need to assess impact, provision, IaC, shared infra |
| [rescue](../skills/fde/references/rescue.md) | Resolve the incident | Production down, urgent, fix a prod bug, resolve incident - or stakeholder gone quiet, trust slipping |
| [ship](../skills/fde/references/ship.md) | Deliver the increment | Start building, update their checkout, first module, visible progress, going live, pre-flight, build the increment, create the launch plan |
| [review](../skills/fde/references/review.md) | Review the change | Review this change, review the pull request, is it safe, does it match what we agreed, scope creep in the PR |
| [rollback](../skills/fde/references/rollback.md) | Rehearse rollback | "We can always revert" - need to actually test the escape route |

### Outcome
*Realize. Dated receipts, not memory.*

| Skill | What it does | Use when |
|-------|-------------|----------|
| [readout](../skills/fde/references/readout.md) | Report the outcome | Weekly update due, "need to send the sponsor something" |
| [demo-prep](../skills/fde/references/demo-prep.md) | Prepare the demo | Demo coming up, show-and-tell, exec walkthrough |
| [debrief](../skills/fde/references/debrief.md) | Capture the meeting | Just out of a meeting, raw notes, "they said...", "debrief", user interviews, workshop notes |
| [board-memo](../skills/fde/references/board-memo.md) | Brief the board | Sponsor's boss needs a summary, board update, justify continued investment |
| [dashboard](../skills/fde/references/dashboard.md) | View the portfolio | Status across all my customers |
| [ingest](../skills/fde/references/ingest.md) | Ingest sources | "Pull today's transcript," "bring in the Notion page" |
| [connect](../skills/fde/references/connect.md) | Connect a source | "Connect Granola," "wire up Drive" |

### Close
*Transfer. They can run it without you.*

| Skill | What it does | Use when |
|-------|-------------|----------|
| [close](../skills/fde/references/close.md) | Transfer operations | Wrapping up, handoff, making yourself replaceable |
| [runbook](../skills/fde/references/runbook.md) | Write the runbook | Engagement ending, team needs to operate without you |
| [switch-clients](../skills/fde/references/switch-clients.md) | Switch engagements | Juggling 2+ customers, losing track, context-switching |
| [encode-pattern](../skills/fde/references/encode-pattern.md) | Encode the pattern | Something worked well and will apply to future engagements |
| [red-team](../skills/fde/references/red-team.md) | Challenge the plan | "Red-team this," "stress-test my plan," poke holes, what am I missing |

### Overlays (activate on signal, alongside whatever skill is running)

| Overlay | Triggers on | What it adds |
|---------|------------|-------------|
| [ai](../skills/fde/references/ai.md) | AI, ML, LLM, model, embeddings, RAG, agents | Model selection, RAG architecture, agent safety, governance, drift monitoring, cost management |
| [artifacts](../skills/fde/references/artifacts.md) | deck, slides, report, governance, compliance | Executive decks, governance frameworks, ADRs, compliance packs, value reports |
| [fintech](../skills/fde/references/fintech.md) | payments, PCI, banking, cardholder data | Idempotency, transaction integrity, fraud signals, silent-failure prevention |
| [healthcare](../skills/fde/references/healthcare.md) | PHI, HIPAA, patient data | De-identification, minimum-necessary, audit trails |
| [gov](../skills/fde/references/gov.md) | FedRAMP, ATO, CUI, classified | Authority boundaries, CUI marking, continuous monitoring |

**AI companion (not a sixth overlay):** [eval-pack](../skills/fde/references/eval-pack.md) - golden set / pass-fail before AI ship (`evals.md`). Loaded with the **ai** overlay when models are in scope.

---

## Core path (quick reference)

The six stages stay land → discover → plan → ship → outcome → close. These are the skills most engagements actually run, with what gets written where. POC, the change on their repo, proof on their staging, go-live, and eval stay on `@fde`.

| Skill | Enter when | What it does | Writes |
|-------|-----------|-------------------|--------|
| [land](../skills/fde/references/land.md) | New customer, first meeting | Interrogates the brief for what's missing; coaches the sponsor conversation; maps stakeholders and sacred data | `brief.md` `success.md` `stakeholders.md` `trust-profile.md` |
| [discover](../skills/fde/references/discover.md) | Brief feels wrong, real problem unclear | Runs churn/test-gap/"temporary"-archaeology/AI-component scans; hunts the workaround; scores use cases | `reality.md` `terrain.md` |
| [plan](../skills/fde/references/plan.md) | Scope clear, needs sequencing | Back from done; fragile first; PR-sized tasks; acceptance-criteria gate | `decisions.md` |
| [ship](../skills/fde/references/ship.md) | Writing or updating on their repo, or ready to deploy | Seen on their staging, then live; intent vs diff, pre-flight/CAB, rollback you have run | `decisions.md` `delivery.md` |
| [readout](../skills/fde/references/readout.md) | Friday, sponsor update, what's delivered | Promised → measured → accepted | `delivery.md` (ledger); presented via `fde status` |
| [close](../skills/fde/references/close.md) | Engagement ending | Retrospective with receipts; pattern extraction; the 2am handoff | `retrospectives/` `patterns.md` `handoff.md` |

Also-ran skills on the same loop (not a second map): [audit](../skills/fde/references/audit.md) · [poc](../skills/fde/references/poc.md) · [rescue](../skills/fde/references/rescue.md) · [review](../skills/fde/references/review.md).

---

## The `fde` CLI (deterministic core - works without AI)

`scan` recon + "ASK ON DAY 1" questions (zero-config via `npx fdeops scan`) · `resume [--full] [--init <name>]` memory (bounded by default - current state + recent activity; `--full` for the complete log) + bind (`--init` creates AND binds; prefer `@fde this is Acme` in chat, terminal `--init` as fallback) · `debrief <file>` (or stdin) route `decision:`/`risk:`/`delivery:`/`contact:` prefixed lines to their `.fde` files with dates, everything else to a dated block in `context.md` · `log <type> <text> [--signal green|amber|red]` structured appends; `--signal` writes the `[signal:...]` token that drives trust in status/dashboard (stale after 21 days) · `receipts <term>` agreements with dates · `capture` session snapshot · `status` value ledger then trust · `dashboard [--open] [--out <path>]` render every engagement into one offline `fieldbook.html`. The skill calls these for mechanics; the AI does interpretation and judgment. Every command above runs locally - no AI needed.

---

## The memory contract (what makes it a second brain)

1. On entry the agent reads a bounded view of `context.md` (via `fde resume`) - nothing else until the phase needs it.
2. **Deliverable = memory:** every phase's output IS a `.fde/` file; nothing is maintained by hand.
3. Every claim carries evidence: `(ops lead, Day 5)` · `(churn: 47/90d)` · `(stated, unverified)`.
4. On exit (and before a PR) the agent runs a **session digest** - TL;DR, key decisions & why, scope/verification, gotchas, next action - into existing `.fde/` files (not chat transcripts into the product repo); the `session-stop` hook backstops a thin snapshot (hooks resolve the engagement via the workspace registry written by `fde resume --init`).
5. One customer, one folder. Never merged.

One `@fde` router. Thirty skills across six stages.
