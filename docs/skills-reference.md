# fdeops Reference - one skill, 34 methods across 6 domains

v3 ships **one skill**: `@fde` ([skills/fde/SKILL.md](../skills/fde/SKILL.md)). You describe the situation; it routes to a phase and follows that phase's method from [skills/fde/references/](../skills/fde/references/). Engagement memory lives in `~/fde-engagements/<name>/.fde/` (one folder per customer).

Each reference is a **method, not advice**: the thinking the agent does, the artifact it drafts, and the checkpoint with the human FDE.

---

## The 6 domains

### 1. Embed & Trust
*First days. Getting access, building credibility, understanding scope.*

| Skill | What it does |
|-------|-------------|
| [land](../skills/fde/references/land.md) | First 48 hours: interrogate the brief, map stakeholders, define success before code |
| [audit](../skills/fde/references/audit.md) | Taking over mid-project: verify claims, find the load-bearing wall |
| [stakeholder-radar](../skills/fde/references/stakeholder-radar.md) | Map who decides, who blocks, who's about to escalate |
| [trust-engineering](../skills/fde/references/trust-engineering.md) | The trust ladder from observer to trusted; navigate AI policy |
| [scope-defense](../skills/fde/references/scope-defense.md) | "Let me place it": scope receipts, the accumulation conversation |

### 2. Discover & Diagnose
*Finding the real problem. Testing what the brief claims.*

| Skill | What it does |
|-------|-------------|
| [discover](../skills/fde/references/discover.md) | Scan repo + hunt the workaround + **workshop facilitation** + **data estate assessment** |
| [assumption-audit](../skills/fde/references/assumption-audit.md) | Extract untested assumptions, classify by blast radius, kill the riskiest first |
| [use-case-scoring](../skills/fde/references/use-case-scoring.md) | Score on value x urgency x alignment x data readiness / complexity |
| [sketch](../skills/fde/references/sketch.md) | Prototype the killer assumption in one day; kill fast, log the learning |

### 3. Plan & Align
*Sequencing work and getting sponsor alignment.*

| Skill | What it does |
|-------|-------------|
| [plan](../skills/fde/references/plan.md) | Work backwards from success + **estimation** (3-point sizing) + **migration strategy** |
| [business-case](../skills/fde/references/business-case.md) | Cost of doing nothing -> investment -> return -> sensitivity check |
| [options-analysis](../skills/fde/references/options-analysis.md) | Three genuine options (conservative / pragmatic / ambitious) |
| [initiative-triage](../skills/fde/references/initiative-triage.md) | 20 things are "urgent"; pick 3 for Now, make trade-offs visible |

### 4. Build & Guard
*Safe implementation on someone else's codebase.*

| Skill | What it does |
|-------|-------------|
| [build](../skills/fde/references/build.md) | Blast radius + legacy safety + **integration design** + **team amplification** |
| [incremental-build](../skills/fde/references/incremental-build.md) | Vertical slices, 100-300 lines each, visible progress every 2-3 days |
| [test-on-legacy](../skills/fde/references/test-on-legacy.md) | Characterise first, Strangler Fig, spot lying tests |
| [blast-radius](../skills/fde/references/blast-radius.md) | Trace dependencies, classify impact (CONTAINED -> IRREVERSIBLE) |
| [debug](../skills/fde/references/debug.md) | Systematic: reproduce -> isolate -> one hypothesis -> verify |
| [rescue](../skills/fde/references/rescue.md) | Production fire, trust fire, wrong-brief-mid-build, **or full pivot** |
| [security-audit](../skills/fde/references/security-audit.md) | Threat model in 5 minutes, STRIDE pass, secrets scan |
| [observability](../skills/fde/references/observability.md) | Define "working" before instrumenting; the four metrics |

### 5. Ship & Verify
*Getting to production without surprises.*

| Skill | What it does |
|-------|-------------|
| [ship](../skills/fde/references/ship.md) | Pre-flight + canary + rollback + **scale-readiness gate** + **progressive adoption** |
| [review](../skills/fde/references/review.md) | Scope first (did we build what was agreed), then safety |
| [rollback-drill](../skills/fde/references/rollback-drill.md) | Test the escape route on staging before you need it at 2am |
| [qa-live](../skills/fde/references/qa-live.md) | Test from the user's chair, real browser, five perspectives |

### 6. Operate & Close
*Running the engagement and ending it well.*

| Skill | What it does |
|-------|-------------|
| [status](../skills/fde/references/status.md) | Sponsor update from the week's actual record |
| [demo-prep](../skills/fde/references/demo-prep.md) | The one number, live-vs-canned, five hard questions |
| [debrief](../skills/fde/references/debrief.md) | Walk out of any meeting -> decisions, signals, actions in memory |
| [exec-narrative](../skills/fde/references/exec-narrative.md) | Pyramid: governing thought, three supports, SCQA frame |
| [dashboard](../skills/fde/references/dashboard.md) | Portfolio view across all customers, trust-ordered |
| [multi-customer-ops](../skills/fde/references/multi-customer-ops.md) | Daily triage, context-switch, cross-contamination prevention |
| [close](../skills/fde/references/close.md) | Retrospective, the 2am handoff document, what we learned |
| [handoff-engineering](../skills/fde/references/handoff-engineering.md) | Operations runbook, knowledge transfer, confidence scoring |
| [pattern-extract](../skills/fde/references/pattern-extract.md) | If you did it twice, encode it; patterns are compound interest |

### Overlays (activate on signal)

| Overlay | Triggers on | What it adds |
|---------|------------|-------------|
| [ai](../skills/fde/references/ai.md) | AI, ML, LLM, model, embeddings, RAG, agents | Model selection, RAG architecture, agent safety, governance, drift monitoring, cost management |
| [artifacts](../skills/fde/references/artifacts.md) | deck, slides, report, governance, compliance | Executive decks, governance frameworks, ADRs, compliance packs, value reports |
| [fintech](../skills/fde/references/fintech.md) | payments, PCI, banking, cardholder data | Idempotency, transaction integrity, fraud signals, silent-failure prevention |
| [healthcare](../skills/fde/references/healthcare.md) | PHI, HIPAA, patient data | De-identification, minimum-necessary, audit trails |
| [gov](../skills/fde/references/gov.md) | FedRAMP, ATO, CUI, classified | Authority boundaries, CUI marking, continuous monitoring |

---

## Engagement phases (quick reference)

| Phase | Enter when | Method highlights | Writes |
|-------|-----------|-------------------|--------|
| [land](../skills/fde/references/land.md) | New customer, first meeting | Interrogates the brief for what's missing; coaches the sponsor conversation; maps stakeholders and sacred data | `brief.md` `success.md` `stakeholders.md` `trust-profile.md` |
| [discover](../skills/fde/references/discover.md) | Brief feels wrong, real problem unclear | Runs churn/test-gap/"temporary"-archaeology/AI-component scans; hunts the workaround; scores use cases | `reality.md` `terrain.md` |
| [audit](../skills/fde/references/audit.md) | Taking over half-done work | Reads everything, tests every "this works" claim, finds tribal-knowledge holes via git authorship | `audit.md` `terrain.md` `reality.md` `context.md` |
| [sketch](../skills/fde/references/sketch.md) | Direction needs validating | Prototypes the killer assumption same-day; kill criteria; 3-sentence business case | `prototype-log.md` `business-case.md` |
| [rescue](../skills/fde/references/rescue.md) | Production fire, trust fire, or wrong-brief mid-build | Stabilise -> named unknowns -> minimum safe change; quiet-stakeholder protocol; three-path reset | `chaos-log.md` `risks.md` `decisions.md` |
| [close](../skills/fde/references/close.md) | Engagement ending | Retrospective with receipts; pattern extraction; the 2am handoff | `retrospectives/` `patterns.md` `handoff.md` |
| [plan](../skills/fde/references/plan.md) | Scope clear, needs sequencing | Backwards from success; fragile first; PR-sized tasks; acceptance-criteria gate | `decisions.md` |
| [build](../skills/fde/references/build.md) | Agreed slice ready | Blast radius declared; characterisation tests on legacy; Strangler Fig; cleanup pass | `decisions.md` `risks.md` `delivery.md` |
| [review](../skills/fde/references/review.md) | Change needs a merge gate | Stage 1 scope vs `decisions.md`, then 5-dimension safety; review-fix loop until clean | `decisions.md` |
| [ship](../skills/fde/references/ship.md) | Ready to deploy | Pre-flight incl. CAB; canary with rollback-on-anomaly; pulse defined before closing the laptop | `delivery.md` |

---

## The `fde` CLI (deterministic core - works without AI)

`scan` recon · `resume [--full] [--init <name>]` memory (bounded by default - current state + recent activity; `--full` for the complete log) + zero-ceremony bootstrap · `log <type> <text>` structured appends · `receipts <term>` agreements with dates · `capture` session snapshot · `status` portfolio triage · `dashboard [--open] [--out <path>]` render every engagement into one offline `fieldbook.html`. The skill calls these for mechanics; the AI does interpretation and judgment. Every command above runs locally - no AI needed.

---

## The memory contract (what makes it a second brain)

1. On entry the agent reads a bounded view of `context.md` (via `fde resume`) - nothing else until the phase needs it.
2. **Deliverable = memory:** every phase's output IS a `.fde/` file; nothing is maintained by hand.
3. Every claim carries evidence: `(ops lead, Day 5)` · `(churn: 47/90d)` · `(stated, unverified)`.
4. On exit the agent appends where-we-left-off to `context.md`; the `session-stop` hook backstops it deterministically.
5. One customer, one folder. Never merged.

v2's 16 standalone skills were consolidated into the single `@fde` router in v3.
