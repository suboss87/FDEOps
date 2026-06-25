# status - the sponsor update that keeps the engagement alive

**Enter when:** the weekly update is due, an exec asks "where are we," or the FDE says "I need to send Dana something." This artifact decides renewals; engineers underinvest in it.

**Read first:** `success.md` (the yardstick), `delivery.md`, `decisions.md`, `risks.md`, `context.md`. Gather the week's facts: `fde receipts` for agreements, `git log --since='7 days ago' --oneline` for shipped work.

## Method (you do this work)

1. **Lead with value in their units** - time saved, errors prevented, revenue protected, risk retired. Never "completed the API endpoint"; always what the endpoint *does for the business*.
2. **Progress against `success.md`** - the agreed definition of done, not a task list. On / ahead / behind, with the why in one line.
3. **Bad news first, never buried.** A risk the sponsor learns from your update is managed; a risk they learn from their staff is a trust fire. Each risk: one line + what you're doing about it + what you need from them.
4. **The ask, explicit.** Access, a decision, an introduction, a sign-off. Updates without asks train sponsors to skim.
5. **Next week in three bullets.** What they'll see, when, and the next touchpoint.

One page maximum. Exec voice: no jargon, no hedging, every claim traceable to the memory (`(shipped Tue, delivery.md)`). Draft in the **FDE's voice, for the FDE to send** - never send anything yourself.

## Artifact

Append the draft to `delivery.md` under `## Status - <date>` (the running record the close phase and dashboard read). Note in `context.md`: status drafted, awaiting FDE review/send.

## Checkpoint

Walk the FDE through the two highest-stakes lines - the worst risk and the biggest ask - and confirm the framing matches what the sponsor can hear right now (check `stakeholders.md` signal first: a red-signal sponsor gets a different opening than a green one).

## Principles

- No surprises: anything the sponsor would be angry to learn later goes in this update.
- Value in their units, progress against the agreed yardstick, one page.
- An update without an ask is a missed move.
- You draft; the FDE sends. Their voice, their relationship.
