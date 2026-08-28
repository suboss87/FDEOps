# fdeops Reference - one skill, 31 skills across 6 stages

v3 ships **one skill**: `@fde` ([skills/fde/SKILL.md](../skills/fde/SKILL.md)). You describe the situation; it routes to a phase and follows that phase's skill from [skills/fde/references/](../skills/fde/references/). Engagement memory lives in `~/fde-engagements/<name>/.fde/` (one folder per customer).

Each reference is a **skill, not advice**: the thinking the agent does, the artifact it drafts, and the checkpoint with the human FDE. The **Use When** column below is what the router actually matches on - the phrases in `skills/fde/SKILL.md` that send you to that skill, not a paraphrase.

---

## The 6 stages

### Land
*First days. Getting access, building credibility, understanding scope.*

| Skill | What it does | Use when |
|-------|-------------|----------|
| [land](../skills/fde/references/land.md) | First 48 hours: interrogate the brief, map stakeholders, define success before code | Starting fresh, new customer, first meeting, just got the brief |
| [audit](../skills/fde/references/audit.md) | Taking over mid-project: verify claims, find the load-bearing wall | Taking over, previous consultant left, joining mid-project |
| [stakeholder-radar](../skills/fde/references/stakeholder-radar.md) | Map who decides, who blocks, who's about to escalate | Need to understand who matters, who decides, who blocks quietly |
| [trust-engineering](../skills/fde/references/trust-engineering.md) | The trust ladder from observer to trusted; navigate AI policy | Need to earn access, navigate AI policy, build credibility |
| [scope-defense](../skills/fde/references/scope-defense.md) | "Let me place it": scope receipts, the accumulation conversation | "Also can you...", scope expanding, timeline unchanged |

### Discover
*Finding the real problem. Testing what the brief claims.*

| Skill | What it does | Use when |
|-------|-------------|----------|
| [discover](../skills/fde/references/discover.md) | Scan repo + hunt the workaround + **workshop facilitation** + **data estate assessment** | Don't know the real problem, brief feels wrong, shadow processes |
| [assumption-audit](../skills/fde/references/assumption-audit.md) | Extract untested assumptions, classify by blast radius, kill the riskiest first | The brief feels too neat, assumptions untested, "we just need..." |
| [use-case-scoring](../skills/fde/references/use-case-scoring.md) | Score on value x urgency x alignment x data readiness / complexity | Multiple use cases competing, "we want to do everything" |
| [sketch](../skills/fde/references/sketch.md) | Prototype the killer assumption in one day; kill fast, log the learning | Need to validate a direction, prototype, demo to de-risk |

### Plan
*Sequencing work and getting sponsor alignment.*

| Skill | What it does | Use when |
|-------|-------------|----------|
| [plan](../skills/fde/references/plan.md) | Work backwards from success + **estimation** (3-point sizing) + **migration strategy** | Break this down, what order, sequence the build |
| [business-case](../skills/fde/references/business-case.md) | Cost of doing nothing -> investment -> return -> sensitivity check | Sponsor needs justification, need to defend budget or timeline |
| [options-analysis](../skills/fde/references/options-analysis.md) | Three genuine options (conservative / pragmatic / ambitious) | Significant decision, multiple approaches, "what should we do?" |
| [initiative-triage](../skills/fde/references/initiative-triage.md) | 20 things are "urgent"; pick 3 for Now, make trade-offs visible | 20 things are "urgent," need to pick the 3 that matter |

### Ship
*Safe implementation on someone else's codebase, then go-live.*

| Skill | What it does | Use when |
|-------|-------------|----------|
| [incremental-build](../skills/fde/references/incremental-build.md) | Vertical slices, 100-300 lines each, visible progress every 2-3 days | Large feature, need visible progress every 2-3 days |
| [blast-radius](../skills/fde/references/blast-radius.md) | Trace dependencies, classify impact (CONTAINED -> IRREVERSIBLE) | What could go wrong, touching shared infrastructure, need to assess impact |
| [rescue](../skills/fde/references/rescue.md) | Production fire, trust fire, wrong-brief-mid-build, **or full pivot** | Production down, urgent - or stakeholder gone quiet, trust slipping |
| [ship](../skills/fde/references/ship.md) | **Intent vs diff** (KEEP/JUSTIFY/SPLIT/DROP) + pre-flight + canary + rollback + **scale-readiness** + **progressive adoption** | Ready to deploy, going live, pre-flight check |
| [review](../skills/fde/references/review.md) | Stage 1 **intent vs diff** (KEEP/JUSTIFY/SPLIT/DROP), then safety | Review this change, is it safe, does it match what we agreed, scope creep in the PR |
| [rollback-drill](../skills/fde/references/rollback-drill.md) | Test the escape route on staging before you need it at 2am | "We can always revert" - need to actually test the escape route |

### Prove
*Show the outcome. Dated receipts, not memory.*

| Skill | What it does | Use when |
|-------|-------------|----------|
| [status](../skills/fde/references/status.md) | Sponsor update from the week's actual record | Weekly update due, "need to send the sponsor something" |
| [demo-prep](../skills/fde/references/demo-prep.md) | The one number, live-vs-canned, five hard questions | Demo coming up, show-and-tell, exec walkthrough |
| [debrief](../skills/fde/references/debrief.md) | Walk out of any meeting -> decisions, signals, actions in memory | Just out of a meeting, raw notes, "they said...", "debrief" |
| [exec-narrative](../skills/fde/references/exec-narrative.md) | Pyramid: governing thought, three supports, SCQA frame | Sponsor's boss needs a summary, board update, justify continued investment |
| [dashboard](../skills/fde/references/dashboard.md) | Portfolio view across all customers, trust-ordered | Status across all my customers |
| [ingest](../skills/fde/references/ingest.md) | Pull raw text from any source MCP into `.inbox/`, propose, you confirm | "Pull today's transcript," "bring in the Notion page" |
| [ingest-connect](../skills/fde/references/ingest-connect.md) | Guided config for a source MCP you already trust, plus a reusable recipe | "Connect Granola," "wire up Drive" |

### Close
*They can run it without you.*

| Skill | What it does | Use when |
|-------|-------------|----------|
| [close](../skills/fde/references/close.md) | Retrospective, the 2am handoff document, what we learned | Wrapping up, handoff, making yourself replaceable |
| [handoff-engineering](../skills/fde/references/handoff-engineering.md) | Operations runbook, knowledge transfer, confidence scoring | Engagement ending, team needs to operate without you |
| [multi-customer-ops](../skills/fde/references/multi-customer-ops.md) | Daily triage, context-switch, cross-contamination prevention | Juggling 2+ customers, losing track, context-switching |
| [pattern-extract](../skills/fde/references/pattern-extract.md) | If you did it twice, encode it; patterns are compound interest | Something worked well and will apply to future engagements |
| [red-team](../skills/fde/references/red-team.md) | Stress-test a plan, handoff, or narrative before someone else does | "Red-team this," "stress-test my plan," poke holes, what am I missing |

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

## Engagement phases (quick reference)

The 9 phases most engagements actually run through, with what gets written where. This is a shorter cut through the table above. POC, slice, on-site proof, and eval stay on `@fde` - they are not a side pack.

| Phase | Enter when | Method highlights | Writes |
|-------|-----------|-------------------|--------|
| [land](../skills/fde/references/land.md) | New customer, first meeting | Interrogates the brief for what's missing; coaches the sponsor conversation; maps stakeholders and sacred data | `brief.md` `success.md` `stakeholders.md` `trust-profile.md` |
| [discover](../skills/fde/references/discover.md) | Brief feels wrong, real problem unclear | Runs churn/test-gap/"temporary"-archaeology/AI-component scans; hunts the workaround; scores use cases | `reality.md` `terrain.md` |
| [audit](../skills/fde/references/audit.md) | Taking over half-done work | Reads everything, tests every "this works" claim, finds tribal-knowledge holes via git authorship | `audit.md` `terrain.md` `reality.md` `context.md` |
| [sketch](../skills/fde/references/sketch.md) | Direction needs validating | Prototypes the killer assumption same-day; kill criteria; 3-sentence business case | `prototype-log.md` `business-case.md` |
| [rescue](../skills/fde/references/rescue.md) | Production fire, trust fire, or wrong-brief mid-build | Stabilise -> named unknowns -> minimum safe change; quiet-stakeholder protocol; three-path reset | `chaos-log.md` `risks.md` `decisions.md` |
| [close](../skills/fde/references/close.md) | Engagement ending | Retrospective with receipts; pattern extraction; the 2am handoff | `retrospectives/` `patterns.md` `handoff.md` |
| [plan](../skills/fde/references/plan.md) | Scope clear, needs sequencing | Backwards from success; fragile first; PR-sized tasks; acceptance-criteria gate | `decisions.md` |
| [review](../skills/fde/references/review.md) | Change needs a merge gate | Stage 1 KEEP/JUSTIFY/SPLIT/DROP vs stated intent, then 5-dimension safety; review-fix loop until clean | `decisions.md` |
| [ship](../skills/fde/references/ship.md) | Ready to deploy | Intent vs diff receipt, then pre-flight/CAB; canary with rollback-on-anomaly; pulse before closing the laptop | `delivery.md` |

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

v2's 16 standalone skills were consolidated into the single `@fde` router in v3.
