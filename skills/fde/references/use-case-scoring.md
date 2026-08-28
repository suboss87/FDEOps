# use-case-scoring - pick the right battle, not the interesting one

**Enter when:** multiple potential use cases compete for attention, the customer says "we want to do everything," a transformation engagement needs a starting point, or the FDE needs to recommend which problem to solve first.

**Read first:** `reality.md`, `brief.md`, `terrain.md`, `context.md`. If `business-case.md` or `prototype-log.md` exist from sketch, load those - they carry forward.

The most dangerous moment in a multi-use-case engagement is when the technically interesting problem wins over the high-value problem. Scoring replaces opinion with arithmetic. The arithmetic is wrong - all models are - but it's *visibly* wrong, which means it can be debated and corrected. Opinion can't.

## Method (you do this work)

**1. List every candidate.** From the brief, from discovery conversations, from the FDE's own observations. Include the ones the customer hasn't said aloud but the codebase implies - a high-churn module with no tests is a candidate even if nobody named it.

**2. Score on five dimensions.** Each 1-5, with the scoring rubric below:

| Dimension | 1 | 3 | 5 |
|-----------|---|---|---|
| **Business value** | Nice-to-have improvement | Noticeable cost or revenue impact | Existential - they lose customers or face regulatory action without it |
| **Urgency** | Someday; no deadline | Needed this quarter; mild pressure | Burning now; every week costs real money or trust |
| **Feasibility** | Requires new infrastructure, skills, or major refactoring | Moderate effort with known patterns | Can be built on existing systems with existing team |
| **Data readiness** | Data doesn't exist or is deeply unclean | Data exists but needs work; volume uncertain | Available, clean, sufficient volume today |
| **Stakeholder alignment** | No sponsor; political resistance | One sponsor but competing priorities | Active sponsor with budget and decision authority |

**3. Calculate the score.**

```
Score = (Business value × Urgency × Stakeholder alignment) / (6 - Feasibility) × Data readiness
```

Why this formula:
- **Multiplied numerator** - all three must be present. A high-value problem with no urgency or no sponsor scores low because it won't ship.
- **Feasibility inverted** - harder problems get a higher denominator, pulling the score down. A feasibility of 5 (easy) gives denominator 1; feasibility of 1 (hard) gives denominator 5.
- **Data readiness as multiplier** - for data-dependent use cases (ML, analytics). For pure engineering work, set to 3 (neutral) unless data quality is genuinely a factor.

**4. Rank and present.** Sort by score. Present the top 3 to the FDE and the sponsor:

```markdown
| Rank | Use case | Value | Urgency | Feasibility | Data | Alignment | Score | Recommend |
|------|----------|-------|---------|-------------|------|-----------|-------|-----------|
| 1 | Fix payment reconciliation | 5 | 5 | 4 | 3 | 5 | 187.5 | Start here |
| 2 | Dashboard redesign | 3 | 2 | 5 | 3 | 3 | 54.0 | Quick win if capacity |
| 3 | ML fraud detection | 5 | 3 | 2 | 2 | 4 | 30.0 | Phase 2 after data prep |
```

**5. Defend the recommendation, not the model.** The model is a reasoning tool, not a decision. When presenting:

- "The scoring puts payment reconciliation first because it's the only use case where all three conditions hold: the sponsor is active, the problem is burning, and we can build it on the existing system."
- Never: "The model says X." Models don't decide; people decide with evidence.

**6. Handle the CEO's pet project.** Sometimes the highest-scoring use case isn't the one the most powerful stakeholder wants. That's information, not a problem:

- Present the scores honestly - the stakeholder sees you're being rigorous, not political.
- If they override: log it in `decisions.md` as a deliberate choice, note the trade-off, and build what they chose. The FDE who was honest about the trade-off is protected when the override creates problems.

## Artifact

**`reality.md`** - the scored use-case table with the recommendation. This is the evidence the sponsor references when justifying the prioritisation upward.

**`decisions.md`** - if the scored recommendation was overridden: what was chosen, by whom, the trade-off accepted.

## Checkpoint

Walk the FDE through the top 3 scores and the recommendation. One question: "Does the sponsor have a strong preference that overrides the scoring?" If yes, log it. If no, proceed with the highest score to sketch or plan.

## Principles

- Score replaces opinion. Visible arithmetic beats invisible judgment.
- All three conditions (value, urgency, alignment) must hold - or the use case won't ship.
- The technically interesting problem that scores low gets deferred, not pursued.
- Present the model; let the human decide. If overridden, log the trade-off.
- A use case with no active sponsor is a research project, not an engagement deliverable.
