# audit - Verify inherited claims

**Enter when:** picking up someone else's work - previous consultant left, joining mid-project, half-done system.

**Read first:** `context.md` if it exists - otherwise start cold. The point of this phase is to establish ground truth, not assume it.

## Method - part 1: read everything that exists (you do this work)

Before forming any opinion:

1. **Inherit the paper.** Any previous `.fde/`, docs, README claims, ADRs, ticket history the FDE can export. Read it all - the previous FDE's decisions are evidence, not verdicts.
2. **Run the discover scans** (see `discover.md` method part 1: churn, test gaps, "temporary" grep, AI components). On a takeover, add:
```bash
git log --format="%an" | sort | uniq -c | sort -rn | head   # who actually built this
git log --since="60 days ago" --format="%ad %s" --date=short | head -20  # what was happening when they left
```
A repo where one departed author wrote 80% of commits = tribal knowledge walked out the door. Mark every module only they touched.
3. **Test the claims.** For each "this works" in the inherited docs, find the evidence: a passing test, a prod metric, a recent successful run. No evidence → it goes in the "assumed" column. "It should work" ≠ "it works."

## Method - part 2: the unload (you coach)

Let the team unload - what actually works, what's theater, what's held together with duct tape. Don't interrupt; separate fact from story. Then one follow-up if needed:

> "What's the one thing you'd be insane to touch blind?"

That's the load-bearing wall. Also establish: the single highest risk right now (what stops the customer's business if it breaks today), and who holds knowledge that exists nowhere else.

## Artifact

**`audit.md`** - written for the FDE who picks this up at 2am:
```markdown
# Audit - <date>
**Works (evidence):** <item - evidence>
**Assumed, unverified:** <item - what claim, what's missing>
**Load-bearing, do not touch blind:** <module - why - who knows it>
**Highest risk right now:** <one line>
**First 3 actions:** 1. … 2. … 3. …
```

**`terrain.md`** - the map as understood now. Honest beats complete: mark unknowns explicitly.

**`reality.md`** - real problem vs stated brief, even if the delta is small.

**`context.md`** - updated so anyone walking in is operational in five minutes.

All four files. Every later phase reads from these - an audit that doesn't populate them leaves the next phase blind.

## Checkpoint - route explicitly, never straight to build

- Real problem still unclear → **discover**.
- Problem clear, brief confirmed → **plan**.
- Active crisis in the inherited system → **rescue** now.

Build without a plan in an inherited system is the fastest path to the second incident.

## Principles

- Read everything that exists before forming any opinion.
- "It should work" is not "it works." Verify.
- The most dangerous systems are the ones everyone assumes someone else understands.
- Don't build until `audit.md`, `terrain.md`, `reality.md` are written.
