# poc - Validate the solution

**Enter when:** a direction needs validating before committing real build time - POC, spike, show something, de-risk, pick between use cases. The output is something a sponsor can reject in a room this week, not a polished product.

**Read first:** `context.md`, `reality.md`. Load `terrain.md` only if the prototype touches the existing codebase. If `terrain.md` **Data estate** has a Blocker source this prototype needs, stop - that is discover, not a day's demo.

A green check on synthetic data is not a validated solution. The person who can say no has to see it on evidence they already believe.

## Method (you do this work)

**0. Name the killer assumption.** With the FDE: "What's the belief that kills the project if it's wrong?" Prototype **that** - not the pretty demo. If `three-options` just ran: the cheapest test is for the recommended option first, unless they pick another.

**0b. Pass / fail before you build.** For the test you will run, write three lines in `prototype-log.md` first: what you will actually do (who you talk to, what you show, on whose screen); the result that **kills** this option; the result that keeps it alive. What you would learn either way. If every option's test would fail, name which `assumptions.md` block to reopen - do not invent a fourth playbook.

**1. Pick by score when several use cases compete.** Use the scoring model from `discover.md` - (Value × Data readiness) / Complexity. If discover or score-use-cases already produced a ranking, reuse it; never invent a third ranking.

**2. Build the minimum that tests the assumption.** Timebox the experiment with the FDE; aim for a same-day result when access and evidence permit it. Skip cosmetic polish, but keep the input validation, access controls, and failure handling needed to protect the test environment and data. Label shortcuts and simulated inputs. The POC is done when the person who can say no has seen the evidence and reacted, not when the code looks finished.

**3. AI directions - test these before anything else:**
- Data: available, clean, sufficient volume? Synthetic data can test mechanics, but does not establish production quality or real-world coverage.
- Environment: are external model calls even allowed here?
- Latency: acceptable against real user expectations, not ideal conditions?
- Is AI the right tool at all - or is this a data-quality or process problem wearing an AI costume?

**4. Kill it immediately if:** the assumption is disproven · the customer ignores it (indifference is a signal, not neutrality) · 3 iterations and feedback isn't converging · it works but the customer can't explain or trust the output (unexplainable AI in a high-stakes context is not a solution). When killed: write down what was *learned*, not what was built. The learning is the asset.

**5. Translate to business language** once validated: problem solved, cost of inaction, success in numbers, 2-3 trade-offs. Three sentences max for the stakeholder - can't say it in three, don't understand it yet.

## If proceeding to production

Carry the hypothesis, test evidence, customer reaction, and remaining unknowns into the existing `plan` and `ship` workflow. A working demo does not establish production readiness or customer acceptance.

Inspect the prototype before deciding what to reuse. Keep components whose behavior and boundaries are suitable and tested. Replace or harden shortcuts that fail production requirements; rewrite only where the evidence justifies it. Record the decision and remaining work in `decisions.md`, rather than treating all prototype code as disposable or all working code as ready to deploy.

Production work includes the actual data path, permissions, failure recovery, realistic load, observability, ownership, and required AI evaluations. Use the existing ship gates for those checks.

## Artifact

**`prototype-log.md`** - what was built, shown, the actual reaction, what was learned (including kills - a killed prototype that saved three weeks is a win worth recording).

**`business-case.md`** - scored use case, cost of inaction, success metrics, trade-offs, the 3-sentence pitch. `plan` builds around this file.

## Checkpoint

Tell the FDE: did the riskiest assumption hold · what the customer's reaction actually revealed · proceed / pivot / kill · the 3-sentence case if proceeding. The pitch is written for the person who can say yes or no.

## Principles

- Optimize for a bounded learning outcome. Agree a timebox and revisit scope if access or evidence blocks it; never skip necessary safeguards to meet an arbitrary duration.
- Write pass/fail before you build. A demo with no kill line is a show.
- Show it rough. Polish misleads.
- Prototype the killer assumption, not the demo.
- Kill fast; log the learning.
