# debug - systematic, never guessing

**Enter when:** something is broken, can't be reproduced, or "shouldn't be happening" - and production is NOT down (that's `rescue.md`).

**Read first:** `context.md`, `terrain.md`, `chaos-log.md` (if this happened before, the cause is probably the same). Nothing else - noise kills focus.

Debugging on an engagement differs from debugging your own code: no full context, no history, high pressure to "just fix it." That pressure causes the second incident. The sequence below is the protection.

## Method (you do this work - never skip a step)

**1. Reproduce.** Get a consistent repro before looking at any code. Can't reproduce → instrument first (logging, narrowing) - not fixes. An unreproducible bug that gets "fixed" comes back.

**2. Isolate to the smallest failing case.** Strip everything that isn't the failure. Payment flow bug → does one hard-coded test transaction fail? Smallest case = smallest context = smallest blast radius for the fix.

**3. Ask "what changed?" before reading code.** Last 2 hours, 24 hours, last deploy - this one question solves most production bugs:
```bash
git log --since="48 hours ago" --format="%ad %an %s" --date=relative
git log --stat -5 --format="%h %s"   # works on any history depth
```
Don't read the codebase like a book. Write a script that answers one specific question - one execution, one answer.

**4. One hypothesis.** Not three. State it explicitly:
> "Hypothesis: X. If right, changing Y fixes it. If wrong, the symptom persists."
A hypothesis that can't be falsified isn't one.

**5. Fix the root cause, not the symptom.** A 500 is a symptom; an NPE is a symptom; the cause is upstream. Patch the symptom and you're back in a week.

**6. Verify the fix holds.** Repro case passes; tests covering the changed code + downstream callers green; no new errors in logs for N minutes. Define done *before* declaring it - "seems fixed" requires another cycle.

## Talking to the customer mid-debug (you coach)

They'll ask for status before there is one. The FDE gives: what's narrowed, what's ruled out, what's being tested next, and **a specific time** they'll hear back. Proactive update if past that time - never make them chase. Skip the phrases that add heat: "weird one," "never seen this," "might be…". Partial clarity beats raw uncertainty. Fixed without root cause → stabilise honestly, don't close the story until the why is explainable.

## Artifact

**`chaos-log.md`** - append, same day:
```markdown
## <date> - <symptom>
**Root cause:** <not the symptom>
**What changed to fix it:** <change>
**Hypotheses tested:** <in order, results>
**Recurrence risk:** <where this can happen again>
```
Update `terrain.md` if the investigation disproved something the map claimed.

## Checkpoint

Before closing: repro passes, root cause stated in one sentence, chaos log written. If the root cause is still unknown, the incident stays open - say so.

## Principles

- Reproduce before touching anything. Always.
- "What changed?" is the first question, not the last.
- One hypothesis at a time. Three fixes failed = wrong mental model - stop.
- Fix upstream. Symptoms patched are incidents scheduled.
