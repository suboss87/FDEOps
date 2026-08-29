# who-decides - Map who decides

**Enter when:** new stakeholders appear, signals shift mid-engagement, a meeting felt off but you can't say why, or it's been two weeks and the map hasn't been updated.

**Read first:** `stakeholders.md`, `context.md`. Load `trust-profile.md` only if sacred-data boundaries affect who gets told what.

The org chart tells you who reports to whom. The stakeholder radar tells you who actually decides, who blocks quietly, and who's about to escalate. FDEs who read the org chart get blindsided; FDEs who read the room stay ahead.

## Method (you do this work)

**1. Map the five roles - every engagement has them, sometimes in one person:**

| Role | How to spot them | What they need from you |
|------|-----------------|------------------------|
| **Sponsor** | Signed the SOW, owns the budget, asks "are we on track" | Progress in their units (cost saved, risk retired), never technical detail |
| **Champion** | Wants you to succeed, opens doors, warns you about politics | Early wins they can point to - makes them look right for backing you |
| **Gatekeeper** | Controls access: repos, environments, meetings, introductions | Respect for their process; go around them and they close every door |
| **Resistor** | Sceptical, protective, or threatened - not necessarily wrong | To be heard first; resistors who feel consulted become the strongest allies |
| **Ghost** | Named on the project, never in the room - either checked out or operating above you | Find out which. A checked-out ghost is noise. A ghost operating above you is the real decision-maker. |

**2. Track signal, not sentiment.** A stakeholder's signal is what they *do*, not what they say:

| Signal | Evidence (not vibes) |
|--------|---------------------|
| **Green** | Responds same-day, shares context unprompted, introduces you to their people |
| **Amber** | Response time doubles, defers decisions, "let me check with…" when they used to decide alone |
| **Red** | Stops responding, routes around you, a new person you've never met starts asking questions |

**3. The 48-hour rule.** A stakeholder who goes amber has roughly 48 hours before they go red. A stakeholder who goes red is already escalating above you. Respond same-day to amber signals - not with more delivery, with a conversation.

**3b. One name per person.** If the table says "Denise Chen" and Signal history says "Denise" or "D. Chen", trust keys fork and prep lies. Consolidate to one spelling. `fde doctor` flags these identity clusters - treat that as a fix, not a nit.

**4. Detect the invisible escalation.** Three markers:
- Questions shift from "what are you building" to "when will it be done" - someone above is asking.
- A meeting gets shortened or cancelled - they're meeting without you.
- A new stakeholder appears with no introduction - they were sent to check.

When you see any of these: tell the FDE immediately, recommend a proactive conversation with the sponsor before the invisible meeting becomes visible.

**5. The passed-over team - the most dangerous and most valuable stakeholder.**

In every engagement where an external FDE was brought in, an internal team was passed over. They know the codebase better than you, they know the politics better than you, and they resent your presence. Three moves:

- **Ask what they tried.** Before your first standup. Their previous approach is the real requirements doc.
- **Use their language.** In every meeting. They hear their words coming back and they feel consulted, not replaced.
- **Make them look right.** Credit their prior work in your artifacts. They protect you if they feel respected; they wait for your mistake if they don't.

**6. Before a decision meeting: pre-wire, then pre-mortem.**

A recommendation that needs several people to say yes is not won in the room; it is won in the week before it. When the FDE is heading into a go/no-go, a budget ask, or anything that visibly costs someone territory:

- **Sort by position, not by seniority.** Firm supporter / firm opponent / **swing**. Effort goes almost entirely to swings - supporters need reinforcement, not persuasion, and a firm opponent is rarely moved by a louder version of the argument that already failed.
- **Name what each swing is protecting.** The objection voiced in a meeting is usually a proxy: headcount, budget, credibility, control, or the reporting line that gets messier. Write the underlying motivation next to the stated objection - they are different sentences.
- **Sequence the conversations.** Whoever makes the others easier to win goes first; whoever is reassured by seeing names already on board goes last. One-on-one for anyone who would lose face conceding in a group.
- **Pre-mortem the meeting.** "It's Thursday, the meeting went badly - who sank it, and with what sentence?" That sentence is the pre-wire you are missing. If the answer is a specific person's objection, their conversation happens *before* the room convenes, not in it.

Log the sequence and the pre-mortem sentence in `context.md` as the plan for the week - a pre-wire plan that lives only in the FDE's head is not a plan.

## Artifact

**`stakeholders.md`** - updated with evidence-dated signal changes:
```markdown
| Who | Role | Signal | Last evidence | Notes |
|-----|------|--------|---------------|-------|
| <name> | sponsor | green | responded same-day with budget approval (Jun 12) | owns renewal decision |
| <name> | resistor→champion | amber→green | shared API docs unprompted after we used their naming (Jun 14) | was passed-over lead |
```

Signal changes get a dated evidence note. A signal that moved without evidence logged is a guess, not radar.

## Checkpoint

One line per stakeholder who changed signal this week. If nobody changed: "Map stable - next check <date>." If a ghost appeared or a resistor went quiet: name it, recommend the move, and update `context.md` with the action.

## Worked example

Acme, week 6. Priya's replies have gone from same-day to two days, and a phase-2 go/no-go is scheduled for Thursday.

Two signals, not one feeling: response time doubled *and* a finance analyst nobody introduced started asking when the work completes. That combination is an invisible escalation - someone above Priya is asking, and the meeting is already happening without the FDE.

Positions: Priya is a supporter under pressure. Marco is a supporter who does not vote. Denise (finance) is the swing, and what she is protecting is not the budget line she cites - it is that her team's escalation started this and she has nothing to show her own director. Raj is a firm opponent on the rewrite question, and no amount of the same argument moves him.

Sequence: Denise one-on-one Tuesday with the incident numbers in her units, then Priya Wednesday, so Priya walks in already knowing finance is not going to object. Pre-mortem sentence: *"Denise says 'we still don't know if this actually caught anything'"* - which is precisely why Tuesday exists. `stakeholders.md` records `Priya | sponsor | green→amber | reply latency 1d → 2d, unintroduced analyst (Jul 3)`; `context.md` carries the sequence.

## Principles

- Signals are evidence-based, not feeling-based. "Seemed distant" doesn't move a signal; "stopped responding to three messages" does.
- The 48-hour rule: amber is a same-day response, not a next-week note.
- The passed-over team is your most important relationship. Win them first.
- Every engagement has a ghost. Find them before they find you.
- A stakeholder map that hasn't been updated in two weeks is fiction.
