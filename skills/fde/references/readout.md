# readout - Report the outcome

**Context:** apply [task context and evidence](task-context.md). Standalone readouts use supplied permitted notes and evidence; no engagement binding or CLI command is required.

**Enter when:** the weekly update is due, an exec asks "where are we," or the FDE says "I need to send Dana something." This artifact decides renewals; engineers underinvest in it.

**Read first:** `success.md` (the yardstick), `delivery.md` (value ledger), `decisions.md` (plan + kill list), `assumptions.md` (OPEN criticals), `risks.md`, `context.md`. For bound work, gather agreements through `fde receipts`; use permitted repository history only when relevant. A commit shows a code change, not proof of deployment. For standalone work, use the supplied facts and mark missing evidence explicitly.

## Method (you do this work)

**First:** for a bound engagement, run `fde status`. It prints the value ledger before trust - promised → measured → accepted by, or `claimed, not yet accepted`. Keep the state of every important statement visible: **on record** is saved evidence, **proposed** is still a recommendation or interpretation, and **customer accepted** requires the named acceptance owner plus the required evidence. Check cited records through sanitized CLI views before making the claim. CLI output summarizes recorded text, not independently verified acceptance. For standalone work, build the same distinction from supplied permitted context without running engagement-only commands or initializing records. If a bound CLI is unavailable, use only permitted supplied excerpts and report the limitation. Never infer acceptance or fabricate missing measurements.

**Qualify the evidence before drafting.** For each result, identify baseline source, measurement environment, observation window/sample, and the scope of acceptance. Report an informal baseline as reported and a staging sample as staging; neither establishes realized savings. “Looks good” without what was accepted is not outcome acceptance. Attribute an engineer's note as such; do not turn it into a direct customer receipt. If evidence conflicts, include the conflict and the next verification action rather than choosing the flattering version.

**Always draft in SCQA.** One page maximum. No other shape.

| Block | What to write | Source |
|-------|---------------|--------|
| **S - Situation** | Where we are against `success.md`, in their words - including whether the floor still uses the old path | success.md, delivery value ledger, reality.md workaround |
| **C - Complication** | What changed, what is at risk, or what we learned (bad news first) | risks.md, assumptions DISPROVED/OPEN, stakeholders signal |
| **Q - Question / Ask** | The one decision or help you need from them | decisions.md, access/sign-off needs |
| **A - Answer** | What you recommend / what happens next week (≤3 bullets) | plan Now lane, delivery promised→measured |

Then add, still on the same page:
1. **Value this week** - from the value ledger: promised → measured (or "pending") → **accepted by whom**, with evidence citation. An unaccepted measurement stays labeled as measured but unaccepted; do not present it as realized or accepted value. Preserve the actual decision needed: it may be funding a bounded test to resolve uncertainty, rather than asking for sign-off on evidence that does not yet exist.
2. **Are they using it?** - Situation must say whether the workaround is still open: spreadsheet still running, shadow paste still happening, named operator completed Tuesday's job on the new path without you at the keyboard. If the old path remains live, report its role and remaining effort. Parallel operation may be a deliberate control; do not demand its removal without evidence and authority. Frame the next ask around the actual blocker or uncertainty.
3. **Kill / defer reminder** - one line from the plan kill list so scope fights stay visible.
4. **Hostile Q prep** - three questions a skeptical sponsor will ask, with one-line answers from memory.

Exec voice: no jargon, explicit uncertainty where evidence is incomplete, every claim traceable (`(shipped Tue, delivery.md)`). Draft in the **FDE's voice, for the FDE to send** - never send anything yourself.

For board / renewal / sponsor's boss (longer pyramid): use `board-memo.md`. Do not invent a second weekly format.

## Artifact

Append the draft to `delivery.md` under `## Status - <date>` using the SCQA headings. Note in `context.md`: status drafted, awaiting FDE review/send.

```markdown
## Status - YYYY-MM-DD
**S:** ...
**C:** ...
**Q:** ...
**A:** ...
**Value ledger:** promised … / measured … / accepted by … (evidence) - or `claimed, unaccepted`
**Kill list reminder:** …
**Hostile Qs:** 1) … 2) … 3) …
```

## Checkpoint

Before presenting a consequential draft, check whether its intended reader can identify what changed, what remains unproven, and the decision being requested without extra explanation. Use the draft alone for this check; repair the unclear passage rather than adding another summary. A simulated reader can flag confusion but cannot confirm stakeholder understanding or acceptance. Keep the existing FDE review/send boundary.

Walk the FDE through the Complication and the Ask - confirm the framing matches what the sponsor can hear right now (check `stakeholders.md` signal first: a red-signal sponsor gets a different opening than a green one).

## Worked example

Acme, week 3, Priya's Friday update.

**S:** failure routing is live; detection is 12 min against the 4h baseline in `success.md`. **C** leads with the bad news, not the win: the second incident was acked 40 minutes late because the rota has one name on it, and that name was on leave. **Q:** one ask - a second name on the rota by Wednesday. **A:** three bullets, top of the Now lane.

Value ledger line: `promised 4h → 15min / measured 12min over 2 incidents / accepted by - (Marco confirmed operationally, finance not yet)` → written as `claimed, unaccepted`, which is what makes the Ask honest rather than a victory lap.

Hostile Q prep, from memory not imagination: "why did we pay for alerting we already had?" → the receipt from `decisions.md` and the disabled-alerting finding in `reality.md`. Kill list reminder: the service rewrite is still deferred, accepted by Priya on Jun 12.

## Principles

- SCQA every time. Situation → Complication → Ask → Answer.
- No surprises: anything the sponsor would be angry to learn later goes in Complication.
- Value from the ledger, not from ticket theater.
- An update without an ask is a missed move.
- You draft; the FDE sends. Their voice, their relationship.
