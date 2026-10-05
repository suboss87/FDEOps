# land - Interrogate the brief

**Enter when:** new customer, first meeting, just got the brief, nothing started yet, or an old or closed project is reopening.

**Read first:** apply [task context](task-context.md), then permitted `context.md` evidence if it exists and the supplied brief. Once the engagement type and AI/access policy are known, inspect the supplied repo/docs relevant to the ask before asking questions they can answer. This is a bounded evidence check, not a full discovery scan.

**Bounded engagement:** A new customer does not automatically require a full landing exercise. For a single-outcome task or simulation of any duration, use the supplied brief to establish the outcome, deadline, permitted inputs, acceptance and next authorized action. If those are clear, route to the working task immediately. If one material gap remains, investigate that gap; do not build a stakeholder map or populate engagement files for their own sake. A simulated stakeholder does not justify invented meetings or approval chains. Keep actual data and release authority checks where they affect the work.

## Validation gate (confirm understanding, clarify where it elevates)

Before landing, state what you know in 2-3 lines:

> "New engagement: [client name]. Timeline: [days/weeks/months or 'not clear yet']. Starting with: [what the FDE has told you so far - the brief, the context, the ask]."

Then check - probe ONLY if it prevents a bad start:

1. **Deadline and scope.** Ask about timing only when it changes the next action: "What result is needed by when?" Use uncertainty, dependencies, risk and access to choose the necessary structure; duration alone does not decide it.
2. **Existing context.** If `.fde/` already exists → one line: "There's existing engagement memory here. Continuing this or starting fresh?"
3. **Access.** If the FDE is about to start work → one line: "Got repo and environment access sorted, or is that still pending?"

State your read, let the FDE correct, then land.

**Reopening an old or closed project:** after the privacy-safe context check, use `fde recall <topic>` for relevant client patterns, retrospectives, and prior decisions. Treat old evidence as historical. Before dependent action, recheck current AI/data policy, access, decision and operating owners, and the deployed revision against current permitted evidence. Record changes and unknowns; an old approval or successful drill does not establish present authority or readiness. Continue independent preparation while material gaps are resolved.

## Brief interrogation (only when the brief is thin)

Use this when the ask is conventional or underspecified - missing who decides, why now, what success looks like, or the binding constraint. **Do not** run it when the FDE already gave a clear brief, is mid-flow, or asked for speed over verification.

Format - one question at a time, with a guess the FDE can correct:

```
READ: <one sentence - what you think they actually need>
MISSING: <fact or authority that changes the next action>
Q: <one focused question>
POSSIBLE READ: <clearly labeled interpretation, if useful; never guessed authority>
```

Wait for the reaction before the next question. Stop when the next authorized action is clear, or when the FDE says move on; unanswered material gaps remain visible. Every answer that is still unknown stays `unknown - ask:` in the artifact - never fill the gap with a plausible stakeholder.

## Method - part 1: interrogate the brief (you do this work)

Read the brief the FDE gives you. Separate **observed** (source/path and date), **reported** (who said it), and **hypothesis** (how to test it). A requested solution such as “build an agent” is not evidence of the cause. Ask only about gaps that change scope, access, acceptance, or the next investigation. What is **not** in the brief matters as much as what is. Produce the gap list yourself:

- **No named decision-maker** → identify who or what can accept the outcome and the source of that authority; keep it unknown until established.
- **"Straightforward cleanup" on an 8-year-old system** → inspect permitted relevant history and tests for prior attempts and constraints; age alone proves neither complexity nor a previous failure.
- **Very tight timeline** → establish the deadline, its source and which commitments are actually agreed.
- **No out-of-scope section** → clarify material boundaries against the existing agreement. An omission does not authorize additional work.

Write these into `brief.md` as **questions to answer**, not problems - they're what the FDE is walking in to resolve.

Pre-arrival checks to run through with the FDE:
- Access confirmed for the next task? Repo, environment and docs may have different permissions; identify gaps before dependent work.
- Has someone tried this before? Establish what happened and what evidence remains; do not assume the attempt failed.
- Other vendors/teams in scope? Then the FDE is not the only one in the room, even when alone in the meeting.
- Tech stack recon: job postings, GitHub org - know the stack before they say it.

## Method - part 2: the first conversation (you coach, the FDE asks)

Intent: coach the FDE's first *customer* conversation - what keeps the sponsor up at night, personally, not the project charter. You already inspected the supplied brief and any authorized repo/docs. This is before *their* laptop in the room / before a deep build, not before you read evidence. Failure talk surfaces truth faster than "requirements." Angles in the FDE's own words:

- "Before you open the laptop - what would make this a bad engagement for *them*, not just a delayed project?"
- "What are they afraid you'll miss?"
- "Who loses credibility if this goes wrong?"
- "If nothing changes over the agreed timeframe, what happens, and who bears it?" Record the consequence and its source in `brief.md`; distinguish reported impact from measured cost. Unknown cost stays unknown, not an invented ROI.

Allow time for an answer. If a stated concern differs from the brief, record the difference and clarify whether it changes the agreed outcome; neither statement automatically supersedes the other.

**Listen for, and capture as you hear it:**
- **Decision rights** - who can approve scope, accept the result and authorize release, as relevant. A frequently mentioned person may be influential; confirm their actual authority and scope.
- **The previous attempt** - "we tried something similar last year" identifies evidence to investigate. Who was involved, what happened, and which constraints still apply? Do not infer why someone left.
- **The existing internal team** - ask what they tried, what they know and what they expect to own. Use established terminology and credit their work. Do not assume resentment, displacement or complete knowledge of the problem.
- **The sacred thing** - "Is there anything in this environment I should treat as untouchable?" Capture the stated boundary and applicable policy; hesitation alone does not identify a restriction.
- **Exception path (operating map seed)** - "When the happy path breaks this week, what do people actually do - who do they call, what spreadsheet opens, what do they skip?" Capture the break → workaround → who owns it. Do not build a full map on day 1; seed rows later in `terrain.md` → `## Operating map (exception-led)` during discover. Unknowns stay `unknown - ask:`.
- **AI posture and policy** - tools already in use (sanctioned or shadow), and: "Does your organisation have a policy on AI-generated code? Are there decisions where you would not be comfortable with AI involvement?"
- **Future operator** - "Who will run this after we leave, and have they agreed?" Record the proposed operator and unresolved ownership in `success.md`, separately from the signer. A sponsor naming a team is not that team accepting responsibility; verify with the operator during discover.
- **Boundaries in multi-vendor rooms** - who owns what surface, who signs off before a change crosses it.

## An early deliverable

Choose an early useful result within confirmed scope: a verified small fix, a permitted diagnostic, or a concise map of an unresolved problem. Reuse the existing outcome and authority for routine work. A first-day deadline does not grant deployment permission or waive verification; use `ship` for a release. If a missing signer blocks a consequential decision, keep it visible and continue independent preparation.

## Artifact (write as the conversation is debriefed)

**`brief.md`** - what they said, who sent the FDE, the timeline, **and the gap list**.

**`success.md`** - what done looks like, **primary value bucket** (`cost-save` | `risk-mitigation` | `revenue-uplift`), baseline → target, who actually signs off, what is explicitly out of scope. Record agreement only with its source and scope; otherwise label the target proposed. For each baseline, record source, date/window, environment, and sample size when relevant. An operator recollection is reported, not measured. If no baseline exists, name the measurement owner and cheapest way to obtain it; do not manufacture a number.

For every target number, run the **gaming check** before it is written down: *how could this metric hit its target without the customer being any better off?* Identify plausible failure modes without predicting that the customer will exploit them. Write a relevant guard next to the metric:

```markdown
| Metric | Baseline → target | Gamed by | Guard |
|--------|-------------------|----------|-------|
| reconciliation alert latency | 4h → 15min | alerting on everything, so nobody reads them | alerts acked by a named owner, ≤2/week |
```

If a proposed guard is disputed, capture the stated reason and assess its cost and effect on the outcome. Do not infer that the customer values the number over the result.

**`stakeholders.md`**:
```markdown
| Who | Role | Signal | Notes |
|-----|------|--------|-------|
| <name> | <observed participation role; authority recorded separately> | green/amber/red | <evidence, day> |
```
If `stakeholders.md` already has a `## Signal history` section (it does from the template), **never delete or overwrite it** when you rewrite this file - it holds the dated `[signal:...]` tokens `fde log contact --signal` and `fde debrief` write, and `fde status`/`fde receipts`/the dashboard read only from that section. Edit the table above it freely; keep the section below intact.

**`trust-profile.md`** - sacred data (`<private>` tagged), fears heard, AI policy, approval chain. Sensitive: skip for status reads; use CLI/redacted surfaces; never paste raw `<private>` into prompts or subagents.

**`assumptions.md`** - seed consequential unverified claims from the brief (and the initial hypothesis) as rows with Kind `UNKNOWN` (or `CONVENTION` if they said "we always"), blast radius CRITICAL / LOAD-BEARING / CONVENIENCE, and status `OPEN`. Do not wait for test-assumptions - land makes the register exist. Example:

```markdown
| # | Assumption | Kind | Blast radius | How we test | Status | Evidence |
|---|------------|------|--------------|-------------|--------|----------|
| 1 | <claim from brief> | UNKNOWN | CRITICAL | <cheapest falsifying test> | OPEN | (stated, unverified) |
```

One falsifiable hypothesis about the real problem also goes at the bottom of `brief.md` - discover / test-assumptions will test it.

## Checkpoint

One page back to the FDE: success + value bucket + sign-off owner, out-of-scope boundary, sacred data, stakeholder map with veto power, AI posture, the hypothesis, the top CRITICAL assumptions still OPEN, and any exception-path seeds heard (break → workaround → owner) for discover to map into `terrain.md`. Keep the summary short and link necessary detail; a complex engagement may need supporting evidence.

If remote: agree how progress and blockers will be shared; use a short call when asynchronous context is insufficient.

## Worked example

Kickoff at Acme payments. Priya (VP Eng) sponsors; the brief says "add monitoring to the reconciliation service."

Asking what happens the week after a perfect delivery gets: "I stop hearing about it from finance." That suggests a concern to clarify alongside the monitoring request. The previous attempt surfaces too: the platform team built alerting last year, it was turned off. Raj, who built it, is still there and was not in the kickoff. Ask for his account of the earlier attempt; his absence does not explain his views.

In this example Priya reports a four-hour baseline and proposes the following target; her acceptance authority still needs its source. What gets written: `success.md` with proposed bucket `risk-mitigation`, `reconciliation failures reach a named owner within 15 min (baseline: 4h, found by finance)`, gaming check `alerting on everything so nobody reads them` → guard `≤2 alerts/week, acked by name`, proposed sign-off Priya until confirmed. `brief.md` carries the gap list and the hypothesis: *the job is not unmonitored, it is unowned*. `assumptions.md` seeds `"finance would act on an alert" - CRITICAL - OPEN - (stated, unverified)`. `trust-profile.md` records the boundary Priya explicitly names, through the permitted privacy-safe workflow.

Early deliverable: verify and fix the log line that swallows the job's exit code within the existing scope. Deployment remains subject to the established release authority and checks.

## Principles

- Establish the outcome and authority needed for the next action; missing record files do not block useful standalone work.
- Sacred data tagged `<private>` stays out of model context: use CLI/redacted reads; never paste raw private blocks.
- Treat unverified parts of the brief as hypotheses; discovery may support or overturn them. Record consequential assumptions.
- Learn from the existing team and verify consequential claims without guessing motives.
- If the customer cannot define success, that is the first problem to solve.
