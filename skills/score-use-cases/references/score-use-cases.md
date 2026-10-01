# score-use-cases - Score use cases

**Enter when:** multiple potential use cases compete for attention, the customer says "we want to do everything," a transformation engagement needs a starting point, or the FDE needs to recommend which problem to solve first.

**Read first:** `reality.md`, `brief.md`, `terrain.md`, `context.md`. If `business-case.md` or `prototype-log.md` exist from poc, load those - they carry forward.

The most dangerous moment in a multi-use-case engagement is when the technically interesting problem wins over the high-value problem. Scoring makes assumptions and trade-offs visible; it does not replace evidence or judgment. These ordinal ratings are a discussion aid, not calibrated estimates of value or a reason to override a hard constraint.

## Method (you do this work)

**1. List every candidate.** From the brief, from discovery conversations, from the FDE's own observations. Include the ones the customer hasn't said aloud but the codebase implies - a high-churn module with no tests is a candidate even if nobody named it.

Before ranking work for the proposed step, identify hard feasibility, access, data-permission and policy constraints. Keep blocked or unverified candidates visible with the affected step, owner or authority gap, and evidence needed to reconsider. A high score cannot make dependent work eligible. An authorized design or evidence check may proceed while implementation is blocked; a sponsor's preference does not grant missing API or data permission.

**2. Score on five dimensions.** Each 1-5, with the scoring rubric below. Reuse discovery's evidence and rationale, rechecking whether the candidates are eligible for the same next step. Do not invent dimension scores from a thin brief - write `unknown`, return a conditional recommendation and ask only what changes the decision.

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
- **Multiplied numerator** - a lower rating reduces the score relative to otherwise identical ratings. Because every scale starts at 1, the formula does not establish that urgency, sponsorship or permission is present; eligibility must be checked separately.
- **Feasibility inverted** - harder problems get a higher denominator, pulling the score down. A feasibility of 5 (easy) gives denominator 1; feasibility of 1 (hard) gives denominator 5.
- **Data readiness as multiplier** - for data-dependent use cases (ML, analytics). For pure engineering work, set to 3 (neutral) unless data quality is genuinely a factor.

**4. Rank and present.** Compare eligible candidates; show up to three useful options and list blocked work separately. If an uncertain input could reverse the order, show the plausible alternative rankings and the smallest permitted check that distinguishes them, with its owner or an explicit ownership gap. Do not hide uncertainty in a precise-looking score or delay independent authorized work while waiting. The following scores illustrate a recommendation, not a commitment:

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
- If the responsible decision-maker overrides the ranking, preserve the choice, source and trade-off under the existing record-confirmation rules. Check capacity and required permissions before dependent work; an override changes preference, not hard constraints or acceptance authority. An unconfirmed choice remains proposed.

## Artifact

**`reality.md`** - the scored use-case table with the recommendation. This is the evidence the sponsor references when justifying the prioritisation upward.

**`decisions.md`** - if the scored recommendation was overridden: what was chosen, by whom, the trade-off accepted.

## Checkpoint

Walk the FDE through the eligible options, relevant blockers and any uncertainty that could reverse the recommendation. Keep the proposed allocation pending the appropriate decision authority; silence is not approval. Reuse existing authorization when it covers the next step. If evidence is insufficient, recommend a bounded distinguishing check rather than automatically proceeding with the highest score.

## Principles

- Scores expose assumptions; evidence and eligible scope govern the recommendation.
- A numerical advantage cannot override a hard constraint or unknown permission.
- The technically interesting problem that scores low gets deferred, not pursued.
- Present the model; let the human decide. If overridden, log the trade-off.
- A use case with no active sponsor is a research project, not an engagement deliverable.
