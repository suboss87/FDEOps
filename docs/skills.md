# One skill, three layers

One skill (`@fde`) routes by situation - you never pick a skill by name. Three layers:

1. **Daily** - prep, debrief, receipts, status, triage / doctor
2. **Engagement** - brief wrong, they went quiet, when did we agree, what's the outcome - plus the skills below
3. **Overlays** - ai / fintech / healthcare / gov / artifacts (plus eval-pack as an AI companion)

The full map is below; per-skill details live in [skills-reference.md](./skills-reference.md).

## Engagement skills (30 skills across 6 stages)

| Stage | Skills | What it covers |
|--------|--------|---------------|
| **Land** (Engage) | land, audit, who-decides, earn-trust, hold-scope | First days: access, credibility, scope |
| **Discover** (Diagnose) | discover, test-assumptions, score-use-cases, poc | Finding the real problem behind the brief |
| **Plan** (Align) | plan, business-case, three-options, pick-three | Sequencing work, getting sponsor alignment |
| **Ship** (Deliver) | ship, what-breaks, rescue, review, rollback | One visible change on their repo, then go-live |
| **Outcome** (Realize) | readout, demo-prep, debrief, board-memo, dashboard, ingest, connect | Get the number accepted; dated receipts |
| **Close** (Transfer) | close, runbook, switch-clients, encode-pattern, red-team | They can run it without you |

Each skill is a workflow, not advice: the thinking the agent does, the artifact it drafts into `.fde/` under `~/fde-engagements/`, and the checkpoint with the human FDE.

**Field judgment (blended into skills, not a separate pack):** land/discover use **brief interrogation** when the brief is thin; `@fde` enforces **anti-invention gates**; ship/red-team run a **pre-blast challenge** before irreversible moves.

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

- [skills-reference.md](./skills-reference.md) - what each skill does, stage by stage
- [schema.md](./schema.md) - the `.fde/` files the skills write
- [USAGE.md](./USAGE.md) - what to type, day to day
