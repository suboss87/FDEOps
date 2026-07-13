# status - the sponsor update that keeps the engagement alive

**Enter when:** the weekly update is due, an exec asks "where are we," or the FDE says "I need to send Dana something." This artifact decides renewals; engineers underinvest in it.

**Read first:** `success.md` (the yardstick), `delivery.md` (value ledger), `decisions.md` (plan + kill list), `assumptions.md` (OPEN criticals), `risks.md`, `context.md`. Gather the week's facts: `fde receipts` for agreements, `git log --since='7 days ago' --oneline` for shipped work.

## Method (you do this work)

**Always draft in SCQA.** One page maximum. No other shape.

| Block | What to write | Source |
|-------|---------------|--------|
| **S — Situation** | Where we are against `success.md`, in their words | success.md, delivery value ledger |
| **C — Complication** | What changed, what is at risk, or what we learned (bad news first) | risks.md, assumptions DISPROVED/OPEN, stakeholders signal |
| **Q — Question / Ask** | The one decision or help you need from them | decisions.md, access/sign-off needs |
| **A — Answer** | What you recommend / what happens next week (≤3 bullets) | plan Now lane, delivery promised→measured |

Then add, still on the same page:
1. **Value this week** - from the value ledger: promised → measured (or "pending") with evidence citation.
2. **Kill / defer reminder** - one line from the plan kill list so scope fights stay visible.
3. **Hostile Q prep** - three questions a skeptical sponsor will ask, with one-line answers from memory.

Exec voice: no jargon, no hedging, every claim traceable (`(shipped Tue, delivery.md)`). Draft in the **FDE's voice, for the FDE to send** - never send anything yourself.

For board / renewal / sponsor's boss (longer pyramid): use `exec-narrative.md`. Do not invent a second weekly format.

## Artifact

Append the draft to `delivery.md` under `## Status - <date>` using the SCQA headings. Note in `context.md`: status drafted, awaiting FDE review/send.

```markdown
## Status - YYYY-MM-DD
**S:** ...
**C:** ...
**Q:** ...
**A:** ...
**Value ledger:** promised … / measured … (evidence)
**Kill list reminder:** …
**Hostile Qs:** 1) … 2) … 3) …
```

## Checkpoint

Walk the FDE through the Complication and the Ask - confirm the framing matches what the sponsor can hear right now (check `stakeholders.md` signal first: a red-signal sponsor gets a different opening than a green one).

## Principles

- SCQA every time. Situation → Complication → Ask → Answer.
- No surprises: anything the sponsor would be angry to learn later goes in Complication.
- Value from the ledger, not from ticket theater.
- An update without an ask is a missed move.
- You draft; the FDE sends. Their voice, their relationship.
