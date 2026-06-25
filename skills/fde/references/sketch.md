# sketch - prototype to kill or confirm a direction

**Enter when:** a direction needs validating before committing real build time - show something, de-risk, pick between use cases.

**Read first:** `context.md`, `reality.md`. Load `terrain.md` only if the prototype touches the existing codebase.

## Method (you do this work)

**0. Name the killer assumption.** With the FDE: "What's the belief that kills the project if it's wrong?" Prototype **that** - not the pretty demo.

**1. Pick by score when several use cases compete.** Use the scoring model from `discover.md` - (Value × Data readiness) / Complexity. If discover already scored, reuse; never re-score independently.

**2. Build the minimum that tests the assumption.** No error handling, no tests, no polish. Same-day demo if possible. Rough is honest - polish tricks people into believing it's further along than it is.

**3. AI directions - test these before anything else:**
- Data: available, clean, sufficient volume? Synthetic-data prototypes say nothing about production behaviour.
- Environment: are external model calls even allowed here?
- Latency: acceptable against real user expectations, not ideal conditions?
- Is AI the right tool at all - or is this a data-quality or process problem wearing an AI costume?

**4. Kill it immediately if:** the assumption is disproven · the customer ignores it (indifference is a signal, not neutrality) · 3 iterations and feedback isn't converging · it works but the customer can't explain or trust the output (unexplainable AI in a high-stakes context is not a solution). When killed: write down what was *learned*, not what was built. The learning is the asset.

**5. Translate to business language** once validated: problem solved, cost of inaction, success in numbers, 2–3 trade-offs. Three sentences max for the stakeholder - can't say it in three, don't understand it yet.

## Artifact

**`prototype-log.md`** - what was built, shown, the actual reaction, what was learned (including kills - a killed prototype that saved three weeks is a win worth recording).

**`business-case.md`** - scored use case, cost of inaction, success metrics, trade-offs, the 3-sentence pitch. `plan` builds around this file.

## Checkpoint

Tell the FDE: did the riskiest assumption hold · what the customer's reaction actually revealed · proceed / pivot / kill · the 3-sentence case if proceeding. The pitch is written for the person who can say yes or no.

## Principles

- Speed of learning beats code quality. Never more than a day.
- Show it rough. Polish misleads.
- Prototype the killer assumption, not the demo.
- Kill fast; log the learning.
