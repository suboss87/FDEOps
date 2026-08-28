# trust-engineering - earning commit access one move at a time

**Enter when:** new engagement where you don't have full access yet, trust is thin, the customer said "let's start small," or you need to navigate "we don't trust AI-generated code."

**Read first:** `trust-profile.md`, `stakeholders.md`, `context.md`. The trust profile tells you where the walls are; the stakeholder map tells you who built them.

Trust is the currency of FDE work. Code quality gets you a second week; trust gets you the engagement. It's earned in small, visible moves - never demanded, never assumed, and never recovered once burned.

## Method (you do this work)

**1. The trust ladder - every engagement climbs it in order:**

```
Level 0: Observer     → read-only access, watching
Level 1: Advisor      → recommendations, no code changes
Level 2: Contributor  → PRs reviewed by their team
Level 3: Committer    → direct push to feature branches
Level 4: Owner        → production access, deploy authority
Level 5: Trusted      → they call you before making decisions
```

**Never skip a level.** The FDE who asks for production access on day two gets observer access for a month. The FDE who ships a clean PR on day two gets committer access by week two. Each level is earned by demonstrating competence AND respect at the current level.

**2. The first-week trust plays - specific, not generic:**

| Day | Move | Why it works |
|-----|------|-------------|
| 1 | Fix a small, visible, annoying bug - something the team has been stepping over | Proves you can ship in their environment without breaking things |
| 1 | Ask the passed-over team what naming conventions they use - then use them | Shows respect before competence |
| 2 | Send a one-paragraph status to the sponsor without being asked | Sets the pattern: they hear from you before they have to ask |
| 3 | Find a genuine risk and flag it without drama | Demonstrates you're protecting them, not performing |
| 5 | Show a small win to the champion so they can share it upward | Gives them evidence their bet on you was right |

**3. Navigate "we don't trust AI-generated code":**

This is increasingly common. The right response is respect, not persuasion:

- **Ask the policy, don't assume.** "Does your organisation have a position on AI-assisted code in production?"
- **If prohibited:** work without AI on their code. Use fdeops for engagement memory (`.fde/` files) and your own planning - that's your tooling, not theirs.
- **If permitted with review:** every AI-touched line goes through their normal review process. Flag it: "AI-assisted, human-reviewed" in commit messages if they want traceability.
- **If grey area:** treat as prohibited until someone with authority says otherwise. The cost of asking is zero; the cost of guessing wrong is the engagement.
- **Never hide it.** An FDE caught using prohibited AI tools loses the engagement and the reputation. Full stop.

**4. Trust recovery - when you've made a mistake:**

Mistakes happen. What matters is speed and honesty:

- **Own it in the first hour.** Not "we found an issue" - "I introduced this bug." Passive voice erodes trust faster than the mistake.
- **Show the fix AND the prevention.** "Here's what happened, here's the fix, here's the test that prevents it next time."
- **One visible win within 48 hours.** Trust recovery needs a concrete success close to the mistake - not weeks later.
- **Never minimise.** "It was a small bug" is your assessment, not theirs. Let them size it.

**5. The trust account - deposits and withdrawals:**

| Deposits (slow, steady) | Withdrawals (fast, expensive) |
|-------------------------|-------------------------------|
| On-time status updates | Surprises - especially bad ones they hear from someone else |
| Using their conventions | "I know better" energy - even when you do |
| Flagging risks early | Breaking something in production |
| Crediting the internal team | Taking credit for shared work |
| Asking before touching sensitive code | Assuming access you haven't been given |
| Over-communicating during incidents | Going quiet when things are hard |

## Artifact

**`trust-profile.md`** - updated sections:
```markdown
## Trust level
Current: <level 0-5> as of <date>
Evidence: <what earned this level>
Next target: <level> - requires: <specific action>

## AI policy
Status: <prohibited / permitted-with-review / grey-area-treating-as-prohibited>
Source: <who confirmed, when>
```

**`decisions.md`** - log trust-significant moves: "Flagged migration risk to ops lead before they discovered it (Day 3) - trust deposit."

## Checkpoint

One question to the FDE: "Are we at the right trust level for what we need to do next week?" If not: name the gap, name the move, and put it in `context.md` as the next action.

## The week 2-4 valley

Week 1 is the honeymoon - everyone's excited, access is fresh, the brief is new. Weeks 2-4 are the valley: novelty wears off, real problems surface, the sponsor's patience shifts from "take your time" to "when do we see results." Most engagements silently fail here, not at ship.

Counter it:
- Ship one visible artifact per week, even if discovery isn't done. A terrain map, a risk register, a stakeholder signal update - something the sponsor can point to.
- Proactive status update at end of week 2 - explicitly name what discovery revealed that wasn't in the brief. This resets expectations with evidence.
- If still in discovery at week 3: the conversation with the sponsor about scope or timeline reset is overdue. Don't wait for them to ask.

## Principles

- Trust is earned in small moves, lost in one. Never skip the ladder.
- The first-week plays are specific and deliberate - not "be helpful."
- AI policy: ask, never assume. Prohibited until confirmed.
- Mistakes happen; hiding them doesn't. Own it in the first hour.
- The FDE who makes the internal team look right earns trust faster than the FDE who ships the most code.
- Weeks 2-4 are where engagements silently die. Ship visible artifacts weekly to survive the valley.
