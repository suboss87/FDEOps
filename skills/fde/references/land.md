# land - first 48 hours

**Enter when:** new customer, first meeting, just got the brief, nothing started yet.

**Read first:** `context.md` if it exists. Nothing else until you know what kind of engagement this is.

## Validation gate (confirm understanding, clarify where it elevates)

Before landing, state what you know in 2-3 lines:

> "New engagement: [client name]. Timeline: [days/weeks/months or 'not clear yet']. Starting with: [what the FDE has told you so far - the brief, the context, the ask]."

Then check - probe ONLY if it prevents a bad start:

1. **Engagement speed.** If timeline is unclear → weave it in naturally: "Is this days, weeks, or months? That shapes how much structure we set up now."
2. **Existing context.** If `.fde/` already exists → one line: "There's existing engagement memory here. Continuing this or starting fresh?"
3. **Access.** If the FDE is about to start work → one line: "Got repo and environment access sorted, or is that still pending?"

State your read, let the FDE correct, then land.

## Brief interrogation (only when the brief is thin)

Use this when the ask is conventional or underspecified — missing who decides, why now, what success looks like, or the binding constraint. **Do not** run it when the FDE already gave a clear brief, is mid-flow, or asked for speed over verification.

Format — one question at a time, with a guess the FDE can correct:

```
READ: <one sentence — what you think they actually need>
CONFIDENCE: ~NN% — missing: <what still blocks a safe start>
Q: <one focused question>
GUESS: <your best answer, so they can push back fast>
```

Wait for the reaction before the next question. Stop when confidence is high enough to write `success.md` without inventing names, or when the FDE says move on. Every answer that is still unknown stays `unknown - ask:` in the artifact — never fill the gap with a plausible stakeholder.

## Method - part 1: interrogate the brief (you do this work)

Read the brief the FDE gives you. What is **not** in it matters as much as what is. Produce the gap list yourself:

- **No named decision-maker** → the FDE will spend two weeks building for someone who can't say yes. Flag it.
- **"Straightforward cleanup" on an 8-year-old system** → the previous attempt is still visible in git history as a revert. Flag it.
- **Very tight timeline** → someone already promised the outcome before hiring the FDE. Flag it.
- **No out-of-scope section** → scope creep is pre-authorized. Flag it.

Write these into `brief.md` as **questions to answer**, not problems - they're what the FDE is walking in to resolve.

Pre-arrival checks to run through with the FDE:
- Access confirmed? Repo, environment, docs. Waiting for access on day two burns trust.
- Has someone tried this before? Find out why it failed before assuming this approach is different.
- Other vendors/teams in scope? Then the FDE is not the only one in the room, even when alone in the meeting.
- Tech stack recon: job postings, GitHub org - know the stack before they say it.

## Method - part 2: the first conversation (you coach, the FDE asks)

Intent: before any tech, learn what keeps the sponsor up at night - personally, not the project charter. Failure talk surfaces truth faster than "requirements." Angles in the FDE's own words:

- "Before you open the laptop - what would make this a bad engagement for *them*, not just a delayed project?"
- "What are they afraid you'll miss?"
- "Who loses credibility if this goes wrong?"

Let silence sit. If their fear doesn't match the written brief, the brief is wrong - say so plainly, log it.

**Listen for, and capture as you hear it:**
- **The real decision-maker** - whoever others mention most, especially if not yet met. That's who judges the work.
- **The previous attempt** - "we tried something similar last year" is the most important sentence in the first meeting. Who was involved? Still there and protective, or gone because of it?
- **The passed-over internal team** - they know exactly what's wrong, and they resent the FDE's presence. Find them before the first standup, ask what they tried, use their language in every meeting. Make them look right and they protect you; ignore them and they wait for the mistake.
- **The sacred thing** - "Is there anything in this environment I should treat as untouchable?" The hesitation before the answer is the answer.
- **Exception path (operating map seed)** - "When the happy path breaks this week, what do people actually do — who do they call, what spreadsheet opens, what do they skip?" Capture the break → workaround → who owns it. Do not build a full map on day 1; seed rows later in `terrain.md` → `## Operating map (exception-led)` during discover. Unknowns stay `unknown - ask:`.
- **AI posture and policy** - tools already in use (sanctioned or shadow), and: "Does your organisation have a policy on AI-generated code? Are there decisions where you would not be comfortable with AI involvement?"
- **Boundaries in multi-vendor rooms** - who owns what surface, who signs off before a change crosses it.

## The day 1 deliverable

Before the end of day 1, ship one visible thing: a small bug fix, a cleanup the team has stepped over, a dashboard tweak, a config improvement. Not because it matters technically - because it proves you can ship in their environment without breaking things. The first deploy sets the trust trajectory for the entire engagement. A day-1 deliverable earns more credibility than a week-3 architecture deck.

## Artifact (write as the conversation is debriefed)

**`brief.md`** - what they said, who sent the FDE, the timeline, **and the gap list**.

**`success.md`** - what done looks like, **primary value bucket** (`cost-save` | `risk-mitigation` | `revenue-uplift`), baseline → target, who actually signs off, what is explicitly out of scope. Agreed with the customer, not assumed.

For every target number, run the **gaming check** before it is written down: *how could this metric hit its target without the customer being any better off?* There is always an answer, and the answer is what the org will drift toward under pressure. Write the guard next to the metric:

```markdown
| Metric | Baseline → target | Gamed by | Guard |
|--------|-------------------|----------|-------|
| reconciliation alert latency | 4h → 15min | alerting on everything, so nobody reads them | alerts acked by a named owner, ≤2/week |
```

A metric with no gaming check is a metric the FDE will be held to and cannot defend. If the customer resists the guard, that is the real conversation - they are attached to the number, not the outcome.

**`stakeholders.md`**:
```markdown
| Who | Role | Signal | Notes |
|-----|------|--------|-------|
| <name> | sponsor / champion / resistor / veto / passed-over | green/amber/red | <evidence, day> |
```
If `stakeholders.md` already has a `## Signal history` section (it does from the template), **never delete or overwrite it** when you rewrite this file - it holds the dated `[signal:...]` tokens `fde log contact --signal` and `fde debrief` write, and `fde status`/`fde receipts`/the dashboard read only from that section. Edit the table above it freely; keep the section below intact.

**`trust-profile.md`** - sacred data (`<private>` tagged), fears heard, AI policy, approval chain. Sensitive: skip for status reads; use CLI/redacted surfaces; never paste raw `<private>` into prompts or subagents.

**`assumptions.md`** - seed every unverified claim from the brief (and the day-1 hypothesis) as rows with blast radius CRITICAL / LOAD-BEARING / CONVENIENCE and status `OPEN`. Do not wait for assumption-audit - land makes the register exist. Example:

```markdown
| # | Assumption | Blast radius | How we test | Status | Evidence |
|---|------------|--------------|-------------|--------|----------|
| 1 | <claim from brief> | CRITICAL | <cheapest falsifying test> | OPEN | (stated, unverified) |
```

One falsifiable hypothesis about the real problem also goes at the bottom of `brief.md` - discover / assumption-audit will test it.

## Checkpoint

One page back to the FDE: success + value bucket + sign-off owner, out-of-scope boundary, sacred data, stakeholder map with veto power, AI posture, the hypothesis, the top CRITICAL assumptions still OPEN, and any exception-path seeds heard (break → workaround → owner) for discover to map into `terrain.md`. If it doesn't fit one page, the engagement isn't understood yet.

If remote: trust-building takes ~40% longer - push for a short video call before anything asynchronous.

## Worked example

Kickoff at Acme payments. Priya (VP Eng) sponsors; the brief says "add monitoring to the reconciliation service."

Asking what happens the week after a perfect delivery gets: "I stop hearing about it from finance." That is the real success statement — not monitoring. The previous attempt surfaces too: the platform team built alerting last year, it was turned off. Raj, who built it, is still there and was not in the kickoff — the passed-over team, found on day 1 rather than at the first standup.

What gets written: `success.md` with bucket `risk-mitigation`, `reconciliation failures reach a named owner within 15 min (baseline: 4h, found by finance)`, gaming check `alerting on everything so nobody reads them` → guard `≤2 alerts/week, acked by name`, sign-off Priya. `brief.md` carries the gap list and the hypothesis: *the job is not unmonitored, it is unowned*. `assumptions.md` seeds `"finance would act on an alert" — CRITICAL — OPEN — (stated, unverified)`. `trust-profile.md` records the sacred thing Priya hesitated before naming.

Day-1 deliverable: fix the log line that swallows the job's exit code. Small, visible, in their environment.

## Principles

- Never start technical work before `success.md` exists.
- Sacred data tagged `<private>` stays out of model context: use CLI/redacted reads; never paste raw private blocks.
- The brief is a hypothesis; discover confirms it. Seed `assumptions.md` on day one.
- The passed-over internal team is the best source of truth, not an obstacle.
- If the customer cannot define success, that is the first problem to solve.
