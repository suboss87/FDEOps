# exec-narrative - the story that gets the next phase funded

**Enter when:** the sponsor's boss needs a summary, a board update mentions the engagement, the FDE needs to justify continued investment, or a quarterly review is approaching.

**Read first:** `delivery.md`, `success.md`, `reality.md`, `risks.md`, `stakeholders.md`, `context.md`. The narrative is built from the engagement record, not from memory.

Technical FDEs lose renewals by presenting work instead of outcomes. The exec doesn't want to know what was built - they want to know what it changed. A good exec narrative takes 60 seconds to deliver and survives hostile questions.

## Method (you do this work)

**1. The Pyramid Principle.** One governing thought, supported by three arguments, each backed by evidence. The exec hears the conclusion first, not the journey:

```
GOVERNING THOUGHT: (one sentence - the conclusion)
"The payment processing overhaul cut manual reconciliation from 
3 FTEs to 0.5 FTE and eliminated the $2M annual audit risk."

SUPPORT 1: What was done (one paragraph)
  → Evidence from delivery.md

SUPPORT 2: What it saved (quantified)
  → Evidence from business-case.md + delivery.md

SUPPORT 3: What's next (the ask)
  → Evidence from decisions.md + risks.md
```

**2. Four narrative lengths.** The same story, scaled for the context:

| Length | When | Format |
|--------|------|--------|
| **30 seconds** | Elevator, hallway, Slack thread | The governing thought + one number |
| **2 minutes** | Stand-up, exec check-in | Governing thought + 3 supports + the ask |
| **10 minutes** | Quarterly review, steering committee | Full pyramid + hard questions answered + visual |
| **60 minutes** | Board presentation, transformation review | Full pyramid + demos + deep-dive appendix |

Write all four. The FDE will need different lengths at different moments - having them pre-written means they're never caught improvising.

**3. The opening frame - SCQA.** Structure the first 30 seconds:

| Element | Purpose | Example |
|---------|---------|---------|
| **Situation** | Where we are (shared context) | "We started this engagement to fix the payment failures that were costing $200K/month in manual reconciliation." |
| **Complication** | What changed or what's at stake | "The problem was deeper than expected - the reconciliation failures traced to a data integrity issue in the core ledger." |
| **Question** | The decision the exec needs to make | "Should we extend the engagement to fix the root cause, or ship the workaround?" |
| **Answer** | Your recommendation | "Fix the root cause. The workaround adds $40K/year in maintenance and doesn't eliminate the audit risk." |

**4. Value in their units.** Translate every technical achievement:

| What you did (internal) | What it means (their units) |
|------------------------|---------------------------|
| Reduced p95 latency from 3s to 200ms | Customers complete checkout 15x faster |
| Added test coverage from 12% to 78% | Change failure rate dropped from 40% to 5% |
| Migrated from monolith to three services | Team can deploy independently - shipping frequency from monthly to weekly |
| Built ML fraud detection | $1.2M/year in fraud losses reduced to <$200K projected |

Never: "we refactored the authentication module." Always: what the refactoring *did* for them.

**5. Pre-wire the hostile questions.** Before any exec presentation, write the five toughest questions and one-line answers:

```markdown
## Hard questions - <presentation date>
1. "Why did this take longer than estimated?"
   → The original brief assumed API-only work; discovery revealed a database integrity issue. We surfaced it in week 2 instead of shipping a patch that would have required rework.

2. "How do we know it won't break again?"
   → Three guards: automated reconciliation check (runs daily), alerting on drift >0.1%, and the characterisation test suite covering the 12 failure modes we found.

3. "What happens when the FDE leaves?"
   → Handoff document written for the 2am scenario. The team ran the runbook independently last Thursday - no callbacks.

4. "Why should we fund phase 2?"
   → Phase 1 addressed the bleeding. Phase 2 eliminates the root cause. Without it: $40K/year maintenance on the workaround + the audit risk remains.

5. "Can the internal team do phase 2 without you?"
   → They can, with 2x the timeline. The value of an FDE in phase 2 is speed - the patterns are established and the trust with the ledger team is built.
```

**6. The one number.** Every exec narrative needs a single memorable quantity:

- "31 spreadsheet rows to zero"
- "p95 held at 180ms"
- "$200K monthly risk retired"
- "Time-to-deploy from 4 hours to 12 minutes"

The number should appear in the first 30 seconds and be the thing they repeat to *their* boss.

## Artifact

**`delivery.md`** - append under `## Exec narrative - <date>`:
- The four narrative lengths (30s, 2min, 10min, 60min)
- The SCQA frame
- The hard-question sheet
- The one number

**`context.md`** - note: exec narrative prepared, presentation date, what must be updated before delivery.

## Checkpoint

Dry-run the 2-minute version with the FDE. Confirm: the one number lands in the first 30 seconds, the SCQA frame answers "why now," and the hardest question has a prepared answer. If the FDE can't deliver the 30-second version from memory, simplify.

## Principles

- Conclusion first, evidence second. The exec decides in the first 30 seconds.
- Value in their units. Never present work; present outcomes.
- One number per narrative. The room remembers one thing - make it the right thing.
- Pre-wire every hostile question. Surprise in an exec meeting is a trust withdrawal.
- Write all four lengths. The FDE will need them at different moments.
