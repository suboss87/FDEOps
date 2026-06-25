# review - two stages, always in order

**Enter when:** a change needs review before merge - "is this safe," "does it match what we agreed."

**Read first:** `context.md`, `decisions.md`, `trust-profile.md`, `terrain.md`. Not `reality.md`/`stakeholders.md` - irrelevant to reviewing code against agreed scope.

Engagement review ≠ product-company review: a codebase you don't own, systems you can't fully see, a customer who can't afford a bad release.

## Pre-flight: is this reviewable?

Thousands of lines or dozens of unrelated files → **stop**, recommend the split in `decisions.md`, route to plan. Review loops fail on huge diffs. Ask: one agreed task, or did scope merge mid-build?

## Stage 1 - did we build what we agreed? (you do this work)

Check the diff against `decisions.md` - what was *explicitly decided*, not what seems right:
- Matches agreed scope?
- Any sacred system from `trust-profile.md` touched?
- Any sensitive data newly in scope?
- Rollback path defined before build still honoured?

**Stage 1 fails → stop.** Quality review on out-of-scope code is wasted work. Record the specific mismatch in `decisions.md`.

## Stage 2 - is it safe to live with?

Five dimensions, line-specific ("line 47 fails under concurrent writes - no lock"), never "could be better":

- **Correctness** - does what it says; edge cases; error paths traced.
- **Blast radius** - what breaks at 2am; downstream systems; failure mode loud (errors surface) or silent (data corrupts over time)?
- **Security** - input validation at boundaries; no secrets in logs; no new attack surface; `trust-profile.md` sensitivity classes respected.
- **Rollback** - revertible in under 5 minutes, documented? "We'd need a data migration to roll back" is a blocker.
- **AI policy & components** - human-review requirements honoured; model output treated as untrusted until validated; fallback exists; inputs/outputs logged; outputs bounded so a hallucination can't cascade; in regulated environments a human can explain why the AI decided X (compliance requirement, not preference).

**Structural pass on AI-heavy or data-touching changes:** migrations reversible · destructive SQL guarded · PII/PCI/PHI paths match `trust-profile.md` · side effects (flags, webhooks, emails, jobs) fire only when intended · magic strings that break on rename · new behaviour has a test or an explicit reason it can't yet. One line problem, one line fix.

## The review-fix loop (until clean)

1. Read the full diff before commenting.
2. Verdicts: **Stage 1: Pass / Blocked (reason)** · **Stage 2: Pass / Concerns (line-specific)**.
3. Fix only **real** findings tied to this change - no drive-by refactors. Reject false positives with one sentence why.
4. Add or update a test per bug found where possible.
5. Re-run tests/typechecks - state what ran.
6. Re-review. Repeat until Pass/Pass or a human must decide scope/product.

## Artifact

**`decisions.md`** - each cycle logged: what was reviewed, flagged, fixed, verified. Stage 1 failures recorded with the specific mismatch.

## Principles

- Stage 1 before Stage 2. Wrong scope reviewed well is still wrong scope.
- Specific or silent - vague concerns waste everyone's time.
- No rollback path = first finding.
- A clean review proves this diff is safe as agreed - not that the feature was right.
