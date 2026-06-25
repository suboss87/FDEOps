# pattern-extract - if you did it twice, encode it

**Enter when:** the engagement is closing and reusable patterns exist, a technique worked well and will apply to future clients, the FDE notices themselves doing the same thing on a second engagement, or close identified a pattern worth preserving.

**Read first:** `decisions.md`, `reality.md`, `delivery.md`, `retrospectives/`, `context.md`. Patterns live in what was *done*, not what was planned.

The difference between a 5-year FDE and a 15-year FDE is not talent - it's encoded patterns. The 15-year FDE walks into a new engagement and recognises the situation in minutes because they've seen it before, named it, and know the move. Pattern extraction turns experience into reusable intelligence.

## Method (you do this work)

**1. Identify the pattern candidates.** Scan the engagement for things that:

| Signal | Example |
|--------|---------|
| Worked well and would work again in a similar situation | The "show the workaround first" approach to earning ops team trust |
| Failed and the failure mode is predictable | The "refactor before understanding" mistake on legacy codebases |
| Was discovered late and should have been discovered early | The hidden cron job that broke the migration - always ask about cron jobs |
| Required a workaround that others would face too | The compliance dance for getting AI tools approved in regulated environments |
| Involved a political dynamic that repeats | The passed-over internal team dynamic - present in every engagement with external FDEs |

**2. Write the pattern in a transferable format.** Each pattern must be usable by a future FDE who has never heard of this engagement:

```markdown
## Pattern: <name>

### Situation
<When does this pattern apply? What does the FDE see/hear that triggers recognition?>

### The move
<What to do, specifically. Not advice - steps.>

### Why it works
<The mechanism - why this approach succeeds where the obvious approach fails.>

### Watch out for
<The failure mode or edge case that makes the pattern not apply.>

### Evidence
<Which engagement, what happened, what the result was. Specific, not generic.>
```

**3. The pattern quality test.** Before encoding:

| Test | Pass | Fail |
|------|------|------|
| **Transferable?** | Another FDE could apply this without context from this engagement | Only makes sense if you know the specific client |
| **Specific enough?** | Contains concrete steps, not just principles | "Build trust" / "Communicate well" - too vague to act on |
| **Repeatable?** | Applies to a class of situations, not just this one | Only worked because of a unique circumstance |
| **Falsifiable?** | You can tell when the pattern is working or not | No way to measure whether applying it helped |

**4. Classify by domain.** Patterns sort into the same domains as the skills:

| Domain | Pattern type | Example |
|--------|-------------|---------|
| **Embed & Trust** | Political / relational | "The passed-over team warm-up protocol" |
| **Discover & Diagnose** | Investigative / analytical | "The cron-job discovery checklist for legacy systems" |
| **Plan & Align** | Structural / strategic | "The three-option presentation for nervous sponsors" |
| **Build & Guard** | Technical / safety | "The Strangler Fig on financial transaction code" |
| **Ship & Verify** | Operational / process | "The regulated-environment change-approval timeline buffer" |
| **Operate & Close** | Knowledge / handoff | "The 2am document format that actually gets used" |

**5. Version and evolve.** Patterns are living documents:

- First use: **v0.1** - hypothesis based on one engagement
- Second use: **v1.0** - confirmed pattern, refined from two experiences
- After modification: increment minor version with what changed and why
- After contradiction: note the counter-example, adjust the "watch out for" section

**6. Cross-engagement pattern mining.** When the FDE has multiple engagements in `.fde/`:

- Compare `reality.md` across engagements - do the same problems recur?
- Compare `decisions.md` - are the same decisions being made?
- Compare `retrospectives/` - are the same lessons being "learned" twice?

A pattern learned twice is a process failure. Encoding it prevents the third time.

## Artifact

**`patterns.md`** - the pattern library, growing across engagements. Each pattern in the format above. Indexed by domain and situation trigger.

**`retrospectives/YYYY-MM-DD-<engagement>.md`** - reference to which patterns were extracted from this engagement.

## Checkpoint

Present the extracted patterns to the FDE: "From this engagement, I've identified N patterns worth encoding. The highest-value one is <name> because <it will apply to future engagements in these situations>." Confirm the pattern is accurate - the FDE's field judgment outranks the analysis.

## Principles

- If you did it twice, encode it. The same lesson learned three times is a failure.
- Patterns are steps, not principles. "Build trust" isn't a pattern; "fix a small visible bug on day one" is.
- Every pattern needs a situation trigger - the FDE must recognise when it applies.
- Version patterns. A pattern from one engagement is a hypothesis; from two, it's confirmed.
- The pattern library is the FDE's compound interest. It's what separates 5 years of experience from 1 year repeated 5 times.
