# options-analysis - three paths, not one recommendation

**Enter when:** a significant technical or strategic decision needs to be made, the FDE is asked "what should we do?", the team is stuck between approaches, or a fork in the engagement requires the sponsor's input.

**Read first:** `reality.md`, `terrain.md`, `success.md`, `context.md`. Load `business-case.md` if the decision has cost implications.

One option is a request for trust. Two options is a false choice. Three options is a conversation between professionals. The FDE who presents three genuine options earns the decision-maker's respect - and their protection when things get hard.

## Method (you do this work)

**1. Name the decision.** One sentence: what needs to be decided, by whom, by when, and what happens if it's deferred.

> "Decision: approach for the payment migration. Decided by: CTO. Needed by: Friday. Deferral cost: blocks the next sprint and delays the pilot by two weeks."

**2. Generate three genuine options.** Not "good / medium / bad" - three approaches with real trade-offs:

| Option archetype | Description | When it fits |
|-----------------|-------------|-------------|
| **Conservative** | Lowest risk, smallest change, longest timeline | When trust is thin or the system is fragile |
| **Pragmatic** | Balanced risk/reward, proven patterns, moderate timeline | When the team is competent and the deadline is real |
| **Ambitious** | Highest reward, most change, highest risk | When the sponsor has appetite and the team has capacity |

Each option must be one the FDE would genuinely recommend under different circumstances. If you can't defend an option, replace it - padding is visible.

**3. Structure each option identically.** Same dimensions, same format - so comparison is instant:

```markdown
### Option A: <name> (Conservative)
- **What:** <the approach in one paragraph>
- **Timeline:** <estimate with basis>
- **Cost:** <effort, infrastructure, external>
- **Risk:** <what could go wrong and the mitigation>
- **Trade-off:** <what you give up by choosing this>
- **Best when:** <the condition that makes this the right choice>
```

**4. Add the comparison matrix.** Visually scannable:

| Dimension | Option A | Option B | Option C |
|-----------|----------|----------|----------|
| Timeline | 6 weeks | 4 weeks | 3 weeks |
| Risk | Low | Medium | High |
| Reversibility | Easy rollback | Partial rollback | Difficult to reverse |
| Team impact | Minimal | Moderate retraining | Significant ramp-up |
| Long-term cost | Highest (tech debt) | Moderate | Lowest |

**5. State your recommendation - and why.** The options are objective; the recommendation is your professional judgment:

> "I recommend Option B. The timeline pressure makes the conservative approach too slow, but the system fragility (see terrain.md hotspots) makes the ambitious approach reckier than the reward justifies. Option B gets us to pilot in 4 weeks with a tested rollback."

**6. Handle the override gracefully.** If the sponsor picks a different option:

- Log it in `decisions.md`: the choice, who made it, the trade-off they accepted.
- Adjust the plan to the chosen option. Don't passive-aggressively optimise for your preference.
- If the chosen option has a specific risk you flagged: note the early-warning signal in `risks.md` so it's caught if it materialises.

## Artifact

**`decisions.md`** - the options analysis:
```markdown
## Decision: <name> - <date>
Decided by: <who>
Options presented: A (<name>), B (<name>), C (<name>)
Recommended: B - <one line why>
Chosen: <A/B/C> by <who>
Trade-off accepted: <what the choice gives up>
```

The full option details in the same entry or linked to a section in `reality.md`.

## Checkpoint

Present the three options and the recommendation. One question to the FDE: "Which option matches what the sponsor can hear right now?" (A risk-averse sponsor after an incident → conservative. A founder pre-fundraise → ambitious.) If unsure: present all three and let the sponsor decide.

## Worked example

Acme: the reconciliation job needs to survive the FDE leaving. Priya asks "so what should we do?"

Three real paths, not a strawman set. **Safe:** keep the job, add the rota and runbook — two weeks, no new failure modes, does nothing about the 47-commits/90d hotspot. **Pragmatic:** extract the settlement-matching step behind a tested interface — six weeks, retires the untested hotspot, needs Raj's time and he currently opposes it. **Aggressive:** rewrite the service — a quarter, fixes everything, and the same team already abandoned this once.

Same dimensions on each, so comparison is instant, and every cost carries a source: the six-week figure is churn-based, not felt.

Recommendation: pragmatic, conditional — *if* Raj is on the design, otherwise safe, because the aggressive path failed here before for exactly the reason it would fail again. `decisions.md` records the decision, who chose it, and the condition, so week 10's "why aren't we rewriting it" has an answer with a date on it.

## Principles

- Three options, never one. One option is a request for trust; three is a real decision.
- Each option must be genuinely defensible - no straw men.
- Same structure for each option. Comparison should take 30 seconds.
- Recommend one. State why. Accept the override gracefully.
- An override logged with its trade-off protects the FDE when the risk materialises.
