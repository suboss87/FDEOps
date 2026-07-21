# The skills matrix - 35 skills + 5 overlays

One skill (`@fde`) routes across six domains. You never pick a method by name - describe your situation and the router picks. This page is the full map; per-method details live in [skills-reference.md](./skills-reference.md).

## 35 skills across 6 domains

| Domain | Skills | What it covers |
|--------|--------|---------------|
| **Embed & Trust** | land, audit, stakeholder-radar, trust-engineering, scope-defense | First days: access, credibility, scope |
| **Discover & Diagnose** | discover, assumption-audit, use-case-scoring, sketch | Finding the real problem behind the brief |
| **Plan & Align** | plan, business-case, options-analysis, initiative-triage | Sequencing work, getting sponsor alignment |
| **Build & Guard** | build, incremental-build, test-on-legacy, blast-radius, debug, rescue, security-audit, observability | Building safely on their codebase |
| **Ship & Verify** | ship, review, rollback-drill, qa-live | Getting to production without surprises |
| **Operate & Close** | status, demo-prep, debrief, exec-narrative, dashboard, multi-customer-ops, close, handoff-engineering, pattern-extract, red-team | Running and ending the engagement well |

Each skill is a **method, not advice**: the thinking the agent does, the artifact it drafts into `.fde/` under `~/fde-engagements/`, and the checkpoint with the human FDE.

**Field judgment (blended into methods, not separate skills):** land/discover use **brief interrogation** when the brief is thin; `@fde` enforces **anti-invention gates**; ship/red-team run a **pre-blast challenge** before irreversible moves.

## 5 overlays (activate automatically on signal)

Overlays layer domain judgment onto whatever skill is running - the agent activates them when your engagement involves the signal, without being told:

| Overlay | Triggers on | What it adds |
|---------|------------|-------------|
| **ai** | AI, ML, LLM, model, embeddings, RAG, agents | Model selection, RAG architecture, agent safety, drift monitoring, cost management |
| **artifacts** | deck, slides, report, governance, compliance pack, ADR | Executive decks, governance frameworks, ADRs, value reports |
| **fintech** | payments, PCI-DSS, cardholder data, anything that moves money | Idempotency, transaction integrity, fraud signals, silent-failure prevention |
| **healthcare** | PHI, HIPAA, EHR, patient data | De-identification, minimum-necessary, audit trails |
| **gov** | FedRAMP, ATO, CUI, classified | Authority boundaries, CUI marking, continuous monitoring |

**AI companion (not a sixth overlay):** `eval-pack` - engagement golden set / SHIP gate (`evals.md`). Loaded with the **ai** overlay when models are in scope.

## See also

- [skills-reference.md](./skills-reference.md) - what each method does, phase by phase
- [schema.md](./schema.md) - the `.fde/` files the methods write
- [USAGE.md](./USAGE.md) - what to type, day to day
