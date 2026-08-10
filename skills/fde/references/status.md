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
1. **Value this week** - from the value ledger: promised → measured (or "pending") → **accepted by whom**, with evidence citation. A measured number nobody on the customer side has agreed to is written as `claimed`, and the Ask never rests on it - if the whole case for the next phase is a claimed number, the real ask this week is "who signs off that this is real?".
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
**Value ledger:** promised … / measured … / accepted by … (evidence) — or `claimed, unaccepted`
**Kill list reminder:** …
**Hostile Qs:** 1) … 2) … 3) …
```

## Checkpoint

Walk the FDE through the Complication and the Ask - confirm the framing matches what the sponsor can hear right now (check `stakeholders.md` signal first: a red-signal sponsor gets a different opening than a green one).

## Worked example

Acme, week 3, Priya's Friday update.

**S:** failure routing is live; detection is 12 min against the 4h baseline in `success.md`. **C** leads with the bad news, not the win: the second incident was acked 40 minutes late because the rota has one name on it, and that name was on leave. **Q:** one ask — a second name on the rota by Wednesday. **A:** three bullets, top of the Now lane.

Value ledger line: `promised 4h → 15min / measured 12min over 2 incidents / accepted by — (Marco confirmed operationally, finance not yet)` → written as `claimed, unaccepted`, which is what makes the Ask honest rather than a victory lap.

Hostile Q prep, from memory not imagination: "why did we pay for alerting we already had?" → the receipt from `decisions.md` and the disabled-alerting finding in `reality.md`. Kill list reminder: the service rewrite is still deferred, accepted by Priya on Jun 12.

## Principles

- SCQA every time. Situation → Complication → Ask → Answer.
- No surprises: anything the sponsor would be angry to learn later goes in Complication.
- Value from the ledger, not from ticket theater.
- An update without an ask is a missed move.
- You draft; the FDE sends. Their voice, their relationship.
