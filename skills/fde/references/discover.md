# discover - find the real problem, map the terrain

**Enter when:** the brief feels wrong, the real problem is unclear, shadow processes are suspected, or any phase found that the map is missing.

**Read first:** `context.md`, `brief.md`. Load `terrain.md` if it exists - extend it, never regenerate from scratch.

## Validation gate (confirm understanding, clarify where it elevates)

Before discovering, state what you're investigating and why in 2-3 lines:

> "Investigating: [the hypothesis or problem area]. This informs: [the decision it feeds - descope/rescope/pick A over B]. Existing terrain: [what's already mapped vs. what's unknown]."

Then check - probe ONLY if it prevents wasted discovery:

1. **Hypothesis is testable.** If the stated problem is unfalsifiable ("the architecture is wrong") → rephrase it: "I'd narrow this to: [specific testable claim]. That closer to what you're seeing?"
2. **Discovery feeds a decision.** If there's no named decision → one line: "What changes depending on what we find? That keeps the discovery focused."
3. **Not repeating previous work.** If terrain.md already covers this area → name it: "Terrain already maps this from Day [X]. Extending it or has something shifted?"

State your read, let the FDE correct, then discover.

## Brief interrogation (when the hypothesis is still mush)

Use when the "problem" is unfalsifiable, success is undefined, or you cannot name the decision discovery informs. Skip when `reality.md` / `terrain.md` already pin a testable claim and the FDE is ready to dig.

Same format as land - one Q + GUESS, no checklist:

```
READ: <the real problem you think exists, in one sentence>
CONFIDENCE: ~NN% - missing: <what would falsify or confirm it>
Q: <one question that changes where you dig>
GUESS: <your answer, so they can correct it>
```

Stop when you can write the decision sentence under **Frame the decision first**. If a name, quote, or metric is still missing, write `unknown - ask:` - never invent ops folklore to make the map look complete.

## Frame the decision first

Before any scanning, write one sentence at the top of your working notes:

> "What will the sponsor do differently because of this discovery?"

If you can't name the decision this informs (descope? rescope? pick use case A over B? touch module X first?), you're collecting trivia, not discovering. Every output of this phase is aimed at that decision.

## Method - part 1: the codebase (you do this work)

**First move: `fde scan`** - it runs everything below deterministically in seconds (churn×tests, "temporary" archaeology, AI components, secrets redacted, previous attempts). Your job is then **interpretation**: read its output against the brief, follow the hotspots into the code, and connect the technical findings to the human signals in part 2.

If the CLI is unavailable, run the manual commands below. Either way: do not load the full codebase into context - scan wide, read deep only on hotspots.

**1. Stack and age.** Language, framework, build system, date of last major upgrade:
```bash
git log --reverse --format="%ad" --date=short | head -1   # repo birth
git log -1 --format="%ad" --date=short                     # last commit
```

**2. Churn heat - the modules everyone touches but fears:**
```bash
git log --since="90 days ago" --name-only --pretty=format: | sort | uniq -c | sort -rn | head -20
```
The highest-churn file in a legacy codebase is the one everyone is afraid to refactor but cannot avoid touching. Cross-reference with complexity (file size, nesting) and mark "handle with care."

**3. Test gaps - what's covered, what's a lie:**
```bash
find . -path ./node_modules -prune -o -name "*test*" -print | head -30
```
Map test files against the churn list. A high-churn module with no test neighbors is a load-bearing wall with no insurance. Spot-read the tests that do exist: tests that pass but assert nothing are worse than no tests - note them.

**4. The "temporary" archaeology** (repeat `--include` per extension - brace globs silently match nothing):
```bash
grep -rnE "HACK|FIXME|XXX|temporary|for now|remove this|workaround" \
  --include="*.js" --include="*.ts" --include="*.py" --include="*.java" \
  --include="*.go" --include="*.rb" --include="*.cs" --include="*.php" . | head -30
```
Temporary code in production is permanent code with an excuse. Each hit is a candidate for "what was never built properly."

**5. AI components - they fail silently:**
```bash
grep -rlnE "openai|anthropic|llm|prompt|embedding|vector|inference" \
  --include="*.js" --include="*.ts" --include="*.py" --include="*.java" \
  --include="*.go" . | head -20
```
Flag every one. AI components don't fail like regular code - they degrade as the world changes. Each needs: model version, fallback path (or note its absence), observability (or note its absence).

**6. Data flow.** Where data enters, how it moves, where it stops. Entry points first: routes, queues, cron, file drops.

## Method - part 2: the humans (you coach, the FDE asks)

The real spec is what people **do** when the system fails - not what the slide deck says. Arm the FDE with these, in their own words:

- **"How is the team coping today without the fix?"** - the workaround is the honest requirements doc.
- **Find the spreadsheet.** Almost always there. Whoever maintains it is the best interview in the building.
- **The hesitation.** When someone says "well, there's also this other thing we do…" - stop them, ask them to finish. The main story is what they're comfortable explaining; the hesitation is the real problem.
- **"Which part of the codebase do you least want to touch?"** The answer is unanimous and it's the load-bearing wall. Check it against your churn scan - when the human answer and the churn data agree, that's your first map landmark.
- **Shadow AI.** Someone pasting data into ChatGPT to cope = a real unmet need + an uncontrolled data risk. Note both.
- **Exception-led operating map.** For each real break (not the slide-deck process): what fails, who notices first, what they do today, and which artifact is trusted in that moment. Prefer exceptions over happy-path swimlanes - the workaround is the operating system. Write rows under `terrain.md` → `## Operating map (exception-led)`. If the section is missing on an older engagement, add it; never regenerate the rest of terrain. When AI is in play, also fill `## Intelligence placement` (deterministic vs LLM judgement vs human approve). **`fde doctor` requires at least one filled exception row before plan/build/ship/close** - empty map after discover is a hygiene fail, not optional polish.

## Method - part 3: workshop facilitation

When discovery requires a structured session with multiple stakeholders (alignment, prioritisation, design):

**Before the room:**
- Define the single decision the workshop must produce - not "discuss options" but "rank the three candidates and commit to one."
- Cap at 8 people. Every person above 8 halves the probability of a decision.
- Time-box: 90 minutes max. Anything longer splits into two sessions.
- Pre-read: one page, sent 48 hours ahead. Nobody will read more.

**In the room (the FDE facilitates, not presents):**
1. **5 min - frame.** One slide: the decision, the constraint, the deadline. No history lesson.
2. **15 min - diverge.** Silent post-its (or digital equivalent). Everyone writes before anyone talks - prevents the loudest voice dominating.
3. **20 min - cluster.** Group themes, name them. The FDE does NOT label - the room labels.
4. **30 min - converge.** Dot-vote or forced-rank. The FDE counts, the room decides.
5. **10 min - lock.** State the decision back. "We're saying X. Anyone who can't live with this, speak now." Silence = consent.
6. **10 min - next steps.** Who does what by when. Written before people stand up.

**After the room:** Summary in `decisions.md` within 2 hours. Decisions decay - what felt clear at 3pm is debatable by 5pm if unwritten.

## Method - part 4: data estate assessment

When the engagement involves AI, analytics, or data-heavy automation, assess the data estate before scoring use cases:

**The 5 questions (ask the data owner, not the sponsor):**
1. **Where does data live?** - List every source: databases, warehouses, SaaS exports, spreadsheets, S3 buckets, vendor APIs. Map it.
2. **How fresh is it?** - Real-time, daily batch, "someone uploads a CSV on Mondays"? Freshness determines what's buildable.
3. **Who owns it?** - Not "IT" - the named person who can grant access and explain the schema. No name = no access in practice.
4. **What's the quality?** - Sample 100 rows from each critical source. Check: nulls, duplicates, format consistency, semantic correctness. A 60% null rate in a key field = that source is fiction.
5. **What are the governance constraints?** - PII classification, retention policies, cross-border rules, consent basis. One missed constraint = a compliance stop later.

**The data readiness matrix:**

| Source | Location | Freshness | Owner | Quality (sample) | Governance | Verdict |
|--------|----------|-----------|-------|-----------------|------------|---------|
| _fill per source_ | | | | | | Ready / Needs work / Blocker |

A use case that depends on a "Blocker" source doesn't get scored - it gets a data remediation conversation first. Write this to `terrain.md` under a `## Data estate` section.

## When scope is a transformation, not a single problem

Score every candidate use case before anything gets prototyped:

| Dimension | Question | 1-5 |
|---|---|---|
| Business value | What does it cost them unsolved? | |
| Complexity | How hard to build safely? (5 = hardest) | |
| Data readiness | Available, clean, sufficient volume today? | |

**Score = (Value × Data readiness) / Complexity.** Highest score gets prototyped first (hand to `sketch`). A 5-value/1-complexity/5-readiness case scores 25; a 5-value/5-complexity/2-readiness case scores 2 - they look identical on a whiteboard. Never let a technically interesting use case override the score.

## Artifact (this IS the memory - write it as you work)

**`reality.md`** - the readout the FDE takes into the sponsor meeting:
```markdown
# Reality (actual problem)
**Decision this informs:** <one line>
**Confirmed:** <real problem> (evidence: <workaround/data/quote, source, day>)
**Stated brief was wrong/right because:** <delta, with evidence>
**Implication for build:** <thin-slice direction>
**Validated with:** <who, when>
```

**`terrain.md`** - the map every later phase loads:
```markdown
# Terrain
**Stack:** <lang/framework/build, age>
**Hotspots (handle with care):** <file - churn n/90d - tests: none/weak/ok - why it matters>
**AI components:** <file - model - fallback? - observability?>
**Data flow:** <entry → transform → store → exit>
**Test landscape:** <covered / gaps / lies>
**Unknowns:** <named explicitly - an honest gap beats a confident guess>

## Operating map (exception-led)
| Exception / break | Who notices first | What they do today | System of record then | Blast | Evidence |
|-------------------|-------------------|--------------------|----------------------|-------|----------|
| <break> | <role> | <workaround> | <sheet/DB/person> | CRITICAL / LOAD-BEARING / CONVENIENCE | <who/day> |
```

Every line carries its evidence. `(churn: 47/90d)` `(ops lead, Day 5)` `(stated, unverified)`.

**`assumptions.md`** - update statuses from what discovery proved or disproved. Seed any new OPEN assumptions the brief never named. CRITICAL + OPEN must be named in the checkpoint.

## Checkpoint (before any build)

Present to the FDE, five things, one paragraph each - no padding:
1. The real problem, with the two strongest pieces of evidence.
2. The top 3 risk areas of the codebase, one line of why each.
3. What must not be touched without characterisation tests.
4. The exception-led operating map: the two breaks that matter most, who owns the workaround, and where shadow systems live.
5. The recommendation: confirm brief / descope / rescope - and the decision it puts in front of the sponsor.

If discovery revealed the problem is 3× the brief: the FDE tells the customer **before** telling themselves it's manageable. Lead with evidence, offer three paths (descope / rescope / pause-and-plan), confirm any reset in writing - update `success.md` and `brief.md` before continuing.

## If you've formed three wrong reads

Stop. Don't form a fourth hypothesis. Three disproven reads means the brief is actively misleading - usually the person who briefed doesn't know, or knows and can't say. Change method: stop analysing the system, ask three people separately "if you had to bet on what's actually wrong here, what would you say?" The thing they all hesitate before saying is the real problem.

## Worked example

Acme's brief blamed missing monitoring. Discovery goes to the workaround first.

`git log` shows the reconciliation module at 47 commits/90d with no tests, all from one author who left in February. Marco (ops lead) turns out to keep a spreadsheet: every morning he re-runs the job manually and eyeballs the totals - a habit nobody mentioned because to him it is just the job. That spreadsheet is the system of record when the job fails, which is the actual finding.

`reality.md`: **Confirmed:** the job has no owner, and the manual re-run masks failures for a day (evidence: Marco's sheet, Day 5; two silent failures since March, finance escalation Mar 14). **Stated brief was wrong because:** alerting existed last year and was disabled - adding it again without an owner reproduces the same outcome. `terrain.md` gets the hotspot row and an operating-map row: `job fails silently → Marco notices next morning → re-runs by hand → spreadsheet is truth → LOAD-BEARING (Marco, Day 5)`.

Checkpoint to the FDE names the sponsor decision this creates: fund ownership, or fund alerting and accept the same failure in six months.

## Principles

- The brief is a hypothesis until evidence confirms it.
- The workaround is more honest than the requirements document.
- Churn data + the human's "don't touch that" pointing at the same module = the map is true.
- Never modify code before the terrain map exists.
- Scan wide, read deep only on hotspots.
