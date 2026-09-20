# three-options - Generate options

**Context:** apply [task context and evidence](task-context.md) before using the named records below.

**Enter when:** a significant technical or strategic decision needs to be made, the FDE is asked "what should we do?", the team is stuck between approaches, or a fork in the engagement requires the sponsor's input.

**Read first:** `reality.md`, `terrain.md`, `assumptions.md`, `success.md`, `context.md`. Load `business-case.md` if the decision has cost implications.

Compare materially different, defensible alternatives. Three is a useful presentation shape when three viable paths exist; do not pad the set to meet a quota. Include keeping the current approach or deferring when those are credible choices.

## Method (you do this work)

**1. Name the decision.** One sentence: what needs to be decided, by whom, by when, and what happens if it's deferred.

> "Decision: approach for the payment migration. Decided by: CTO. Needed by: Friday. Deferral cost: blocks the next sprint and delays the pilot by two weeks."

**2. Generate genuine options from the evidence.** Use confirmed assumptions and known system parts; exclude disproved assumptions. If those records are absent, identify the supplied facts and unknowns. Use [test-assumptions](test-assumptions.md) only when a consequential assumption needs investigation.

Alternatives should differ materially in architecture, operating model, scope, cost, or reversibility. Do not label the same plan good / medium / bad or manufacture an unsafe option to favor your recommendation.

Each option must be one the FDE would genuinely recommend under different circumstances. If you cannot defend an option, replace it - padding is visible.

For each option, name:
- which surviving blocks it is built from
- which constraint or convention it changes, if any
- its single biggest point of failure
- any new building block, labelled as a new assumption (`UNKNOWN` in `assumptions.md`) - do not smuggle one in as a fact

If only one viable path remains, explain what ruled out the alternatives and what evidence could reopen them.

**3. Structure each option identically.** Same dimensions, same format - so comparison is instant:

```markdown
### Option A: <name>
- **Blocks:** <which surviving assumptions / parts it is built from>
- **Constraint changed:** <constraint or convention changed, if any>
- **What:** <the approach in one paragraph>
- **Timeline:** <estimate with basis>
- **Cost:** <effort, infrastructure, external>
- **Biggest failure:** <the single point that kills this option>
- **Trade-off:** <what you give up by choosing this>
- **Best when:** <the condition that makes this the right choice>
```

**4. Make comparison easy.** Use consistent dimensions: expected outcome, evidence, build and operating cost, time with estimate basis, reversibility, owner, and the most consequential uncertainty. A compact table helps when alternatives need comparison; do not fill it with invented numbers or label one path universally cheapest.

**5. State your recommendation - and why.** Separate supplied facts and estimates from your judgment:

> "I recommend Option B. The limited team availability rules out a full rewrite this quarter, and the current hotspot makes keeping the job unchanged costly. Option B gets us to pilot in 4 weeks with a tested rollback."

**6. Handle the override gracefully.** If the sponsor picks a different option:

- Log it in `decisions.md`: the choice, who made it, the trade-off they accepted.
- Adjust the plan to the chosen option. Don't passive-aggressively optimise for your preference.
- If the chosen option has a specific risk you flagged: note the early-warning signal in `risks.md` so it's caught if it materialises.

## Artifact

**`decisions.md`** - the options analysis:
```markdown
## Decision: <name> - <date>
Decided by: <who>
Options presented: <viable alternatives>
Recommended: B - <one line why>
Chosen: <option or pending> by <actual decision-maker or unknown>
Trade-off accepted: <what the choice gives up>
```

The full option details in the same entry or linked to a section in `reality.md`.

## Checkpoint

Present the viable alternatives, recommendation, and the evidence or constraint that would change it. Reuse known decision authority; if a decision remains pending, record it as pending.

For a pending choice, identify the uncertainty that could change the recommendation and the smallest permitted check that distinguishes the viable options. Reuse an existing assumption test when available. Name who can supply or verify the evidence (unknown if unconfirmed), and explain how either result changes the choice. Do not expand one compatibility check into a full POC without a reason. A passed check supports the choice; it does not establish delivery approval.

## Worked example

Fictional example: a support team needs completed requests written back to its service system. Its product can export a file today. A supported connector is expected in six weeks; the customer wants automation in two. A custom API adapter looks feasible, but nobody has accepted its maintenance.

Two defensible paths remain. Continue the approved export while checking the supported connector's fit, or investigate a bounded adapter whose delivery depends on a named owner and tested API behavior. The export is a bridge within the first path, not a third option invented for the slide. Compare manual effort, engineering effort, ongoing support, and the effect of waiting. Time released is capacity unless spending actually falls.

Recommend the bridge while resolving native fit and the value of earlier automation. Reconsider the adapter if that value justifies full costs and an owner accepts it. `decisions.md` (or a standalone decision note) records the recommendation, evidence, unknowns, and pending decision. It does not claim that a sponsor chose it or that the adapter can meet the date.

## Principles

- Compare defensible alternatives; the number follows the evidence.
- Build from known facts and label new assumptions. Material differences make the comparison useful.
- Each option must be genuinely defensible - no straw men.
- Same structure for each option. Comparison should take 30 seconds.
- Recommend one. State why. Accept the override gracefully.
- An override logged with its trade-off protects the FDE when the risk materialises.
