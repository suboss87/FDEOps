# review - two stages, always in order

**Enter when:** a change needs review before merge - "is this safe," "does it match what we agreed."

**Read first:** `context.md`, `decisions.md`, `trust-profile.md`, `terrain.md`. Not `reality.md`/`stakeholders.md` - irrelevant to reviewing code against agreed scope.

Engagement review ≠ product-company review: a codebase you don't own, systems you can't fully see, a customer who can't afford a bad release.

## Pre-flight: is this reviewable?

Thousands of lines or dozens of unrelated files → **stop**, recommend the split in `decisions.md`, route to plan. Review loops fail on huge diffs. Ask: one agreed task, or did scope merge mid-build?

## Stage 1 - did we build what we agreed? (you do this work)

Check the diff against the **one-line intent** in `decisions.md` / acceptance criteria - what was *explicitly decided*, not what seems right:

```bash
git diff <base>...HEAD --stat
```

For each touched path (or logical hunk), assign one verdict:

| Verdict | Meaning |
|---------|---------|
| **KEEP** | Required for the stated intent |
| **JUSTIFY** | Adjacent but must ship now - write one sentence why, or SPLIT |
| **SPLIT** | Real work for another PR / Next / kill list - do not merge with this slice |
| **DROP** | Noise / drive-by - revert before Pass |

Also check:
- Any sacred system from `trust-profile.md` touched?
- Any sensitive data newly in scope?
- Rollback path defined before build still honoured?

**Stage 1 fails → stop** if any SPLIT/DROP remains, or JUSTIFY lacks a written sentence. Quality review on out-of-scope code is wasted work. Record the mismatch (and the KEEP/JUSTIFY/SPLIT/DROP tally) in `decisions.md`.

Stakeholder "also can you…" mid-build is `hold-scope` - different axis. This stage is **code vs claim**.

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

## Before the PR - thinking for the next reader

Code alone loses the "why." Before you call the change reviewable, run the **session digest** from the memory contract (SKILL.md On exit): TL;DR, key decisions & rationale, scope + how you verified, gotchas. Confirm with the FDE, then write into `.fde/` - `decisions.md` / `delivery.md` / `context.md`. Reviewers (or Monday-you) should answer "why this approach?" from the fieldbook, not from a chat transcript. Do **not** dump agent logs into the product repo.

## Artifact

**`decisions.md`** - each cycle logged: what was reviewed, flagged, fixed, verified. Stage 1 failures recorded with the specific mismatch. Digest decisions (with *why*) land here too when the slice ships.

**`delivery.md`** - scope + verification from the digest when a PR is opening; intent-vs-diff receipt stays the ship gate.

## Principles

- Stage 1 before Stage 2. Wrong scope reviewed well is still wrong scope.
- KEEP / JUSTIFY / SPLIT / DROP - every path gets a verdict; silent extras fail Stage 1.
- Specific or silent - vague concerns waste everyone's time.
- No rollback path = first finding.
- A clean review proves this diff is safe as agreed - not that the feature was right.
- Judgment in `.fde/` beats transcript in git.
