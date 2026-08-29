# demo-prep - Prep the demo they can reject

**Enter when:** a demo, show-and-tell, or exec walkthrough is coming. FDE engagements live demo-to-demo; a flat demo costs more than a slipped task.

**Read first:** `delivery.md` (what actually works), `stakeholders.md` (who's in the room, what they care about, current signals), `success.md` (the promise being demonstrated), `trust-profile.md` (what must never appear on screen).

## Method (you do this work)

1. **Pick the ONE outcome** the room cares about - from `stakeholders.md`, not from what was hardest to build. Engineers demo effort; the room buys outcomes.
2. **Build the arc:** the problem in their words → before (the pain, ideally the workaround they recognize) → after, **live** → the one number → what's next. Five beats, ten minutes.
3. **The one number.** Every demo needs a single memorable quantity ("31 spreadsheet rows to zero", "p95 held at 180ms"). Pull it from `delivery.md`; if no number exists, that's a gap to fix *before* the demo, not narrate around.
4. **Live vs. canned, decided per beat.** Demo live only what has run clean **twice today**. Everything else: recording or screenshot. A live failure in front of a skeptical room undoes three weeks of trust.
5. **The hard-question sheet.** Write the five toughest questions this room will ask (check `risks.md` and amber/red stakeholders for where they'll push) + one-line answers with evidence. Include the question you're afraid of.
6. **The failure plan.** If the live path breaks: the pre-recorded fallback, and the one sentence that keeps the room ("let me show you the captured run while that resets").
7. **Sacred-data sweep.** Nothing from `trust-profile.md` `<private>` on screen - real customer data, carrier rates, PHI, keys. Demo data is staged data.

## Artifact

`delivery.md` under `## Demo plan - <date>`: the arc, live/canned split, the one number, hard-question sheet, fallback. `context.md`: demo scheduled, prep state, what must run clean twice before it.

## Checkpoint

Dry-run the arc with the FDE once, timed. Confirm: the one number lands in the first three minutes; the riskiest beat has a fallback; the opening line is about *their* problem, not our work.

## Principles

- Demo the outcome, never the architecture.
- One number per demo. Rooms remember numbers, not features.
- Never demo live what hasn't run clean twice today.
- Rough is honest in week one; rough is alarming in week four - match polish to engagement stage.
- Sacred data stays off screen, every time, no exceptions.
