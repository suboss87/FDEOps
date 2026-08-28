# One skill, three layers

One skill (`@fde`) routes by situation - you never pick one by name. Three layers:

1. **Daily** - prep, debrief, receipts, status, triage / doctor
2. **Engagement** - brief wrong, they went quiet, when did we agree, what they got — plus the skills below
3. **Overlays** - ai / fintech / healthcare / gov / artifacts (plus eval-pack as an AI companion)

The full map is below; per-skill details live in [skills-reference.md](./skills-reference.md).

## Engagement skills (31 skills across 6 stages)

| Stage | Skills | What it covers |
|--------|--------|---------------|
| **Land** | land, audit, stakeholder-radar, trust-engineering, scope-defense | First days: access, credibility, scope |
| **Discover** | discover, assumption-audit, use-case-scoring, sketch | Finding the real problem behind the brief |
| **Plan** | plan, business-case, options-analysis, initiative-triage | Sequencing work, getting sponsor alignment |
| **Ship** | incremental-build, blast-radius, rescue, ship, review, rollback-drill | Visible slices, go-live, rollback — not generic debug/build |
| **Prove** | status, demo-prep, debrief, exec-narrative, dashboard, ingest, ingest-connect | What they got; pulling from source MCPs |
| **Close** | close, handoff-engineering, multi-customer-ops, pattern-extract, red-team | They can run it without you |

Each skill is a **method, not advice**: the thinking the agent does, the artifact it drafts into `.fde/` under `~/fde-engagements/`, and the checkpoint with the human FDE.

**Field judgment (blended into the skills, not separate ones):** land/discover use **brief interrogation** when the brief is thin; `@fde` enforces **anti-invention gates**; ship/red-team run a **pre-blast challenge** before irreversible moves.

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

- [skills-reference.md](./skills-reference.md) - what each skill does, phase by phase
- [schema.md](./schema.md) - the `.fde/` files the skills write
- [USAGE.md](./USAGE.md) - what to type, day to day
