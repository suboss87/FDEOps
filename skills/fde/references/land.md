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
- **AI posture and policy** - tools already in use (sanctioned or shadow), and: "Does your organisation have a policy on AI-generated code? Are there decisions where you would not be comfortable with AI involvement?"
- **Boundaries in multi-vendor rooms** - who owns what surface, who signs off before a change crosses it.

## The day 1 deliverable

Before the end of day 1, ship one visible thing: a small bug fix, a cleanup the team has stepped over, a dashboard tweak, a config improvement. Not because it matters technically - because it proves you can ship in their environment without breaking things. The first deploy sets the trust trajectory for the entire engagement. A day-1 deliverable earns more credibility than a week-3 architecture deck.

## Artifact (write as the conversation is debriefed)

**`brief.md`** - what they said, who sent the FDE, the timeline, **and the gap list**.

**`success.md`** - what done looks like, how it's measured, who actually signs off, what is explicitly out of scope. Agreed with the customer, not assumed.

**`stakeholders.md`**:
```markdown
| Who | Role | Signal | Notes |
|-----|------|--------|-------|
| <name> | sponsor / champion / resistor / veto / passed-over | green/amber/red | <evidence, day> |
```

**`trust-profile.md`** - sacred data (`<private>` tagged), fears heard, AI policy, approval chain. Sensitive: never loaded for status reads, never into subagent prompts.

One falsifiable hypothesis about the real problem goes at the bottom of `brief.md` - discover will test it.

## Checkpoint

One page back to the FDE: success + sign-off owner, out-of-scope boundary, sacred data, stakeholder map with veto power, AI posture, the hypothesis. If it doesn't fit one page, the engagement isn't understood yet.

If remote: trust-building takes ~40% longer - push for a short video call before anything asynchronous.

## Principles

- Never start technical work before `success.md` exists.
- Sacred data never enters AI context. Ever.
- The brief is a hypothesis; discover confirms it.
- The passed-over internal team is the best source of truth, not an obstacle.
- If the customer cannot define success, that is the first problem to solve.
