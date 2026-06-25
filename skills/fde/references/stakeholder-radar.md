# stakeholder-radar - reading the room before it reads you

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

## Principles

- Signals are evidence-based, not feeling-based. "Seemed distant" doesn't move a signal; "stopped responding to three messages" does.
- The 48-hour rule: amber is a same-day response, not a next-week note.
- The passed-over team is your most important relationship. Win them first.
- Every engagement has a ghost. Find them before they find you.
- A stakeholder map that hasn't been updated in two weeks is fiction.
