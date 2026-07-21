# Changelog

## 3.9.12 — 2026-07-21

Honest privacy wording for `<private>` tags.

### Changed
- Document `<private>` as CLI/dashboard/hook redaction plus an operational rule: do not open raw private blocks with file tools or paste them into prompts.
- Remove overclaims that tags never enter model context by themselves.

## 3.9.11 — 2026-07-20

Minimal field hardening for integrity and privacy without schema or workflow changes.

### Fixed
- Private signal-ledger content is redacted before prep and dashboard extraction.
- Secret detection now applies to `next:` debrief entries.
- Dashboard output replaces the existing fieldbook atomically.
- Hooks delegate capture and preserve through the explicitly resolved engagement.
- Mutation hooks prefer PATH `fde`, then plugin copies — same discovery order as session-start.
- Preserve keeps daily deduplication atomic and commits only local memory changes.
- Session capture derives its date and time from one consistent local timestamp.

### Added
- Focused regressions for privacy, locking, atomic replacement, hook delegation (including PATH fallback), upgrade-shaped fixtures, deduplication, and timestamps.

## 3.9.10 — 2026-07-20

Skill routing clarity + switch-tools docs + cheap skill eval pack.

### Added
- **Switch coding agents** - README / install / adapters state plainly: fieldbook stays on disk; install `@fde` + bind; Claude hooks are fullest; elsewhere load on demand.
- **`evals/skill-routing/`** - contract check + live CLI smoke for happy `@fde` verbs (`npm run test:skill-routing`).

### Changed
- **Skill description** - when to use + explicit *do not use for ordinary code edits, tests, refactors, or git commits*.
- **`fde redact`** documented in the skill CLI routing table.
- **Trust signal** - if the human already named the color, that is the confirm.

## 3.9.9 — 2026-07-19

Proactive fieldbook hygiene at high-value moments only.

### Added
- **TRIAGE `hygiene:` line** - session-start / `fde triage` / `fde resume` surface doctor issues when the fieldbook has real work and gaps. Silent when clean or brand-new (day-1 templates).
- **Phase → ship/close warn** - stderr if open risks still live.
- **`@fde clean up the fieldbook`** - skill routes to `fde doctor`; nothing auto-rewrites.

### Changed
- **Doctor** skips day-1 empty-template nagging (phase unset / empty success / empty next action with no dated work).

## 3.9.8 — 2026-07-17

Launch funnel hardenings from the v3.9.7 field run.

### Fixed
- **First-run git identity noise** - memory commits pass `-c user.name` / `-c user.email` (and set local repo identity) so clean laptops with `user.useConfigOnly` never print "Please tell me who you are."

### Added
- **`fde redact <term> [--apply]`** - preview/remove buried lines (secrets noticed hours later). Undo stays last-write-only; redact commits the scrub to the ledger.
- **`fde doctor`** - warns when phase is `ship`/`close` with open risks, and when open risks look like duplicate echoes.

## 3.9.7 — 2026-07-17

Defensible memory: stop laundering manual edits into the next write's commit.

### Fixed
- **Tamper laundering** - `commitMemory` stages only the files for that write (`opts.files`). Hand-edits to past records stay dirty, are warned on write, and surface in `triage` / `status` / `resume`. Init remains a full-tree commit.
- **Memory warn on green** - unreadable / corrupt stakeholders still print when trust resolves green from the signal ledger.
- **Receipts header** - `ON RECORD (dated - defensible):` (was `AGREED`, which mislabeled DECLINED entries).

### Changed
- **`bin/fde.js` split** - `bin/lib/memory.js` (scoped git commits), `bin/lib/trust.js` (signals / triage), `bin/lib/render.js` (dashboard). CLI entry stays command routing.
- **`examples/fieldbook.html`** - untracked (generated; regenerate with `fde dashboard`).

## 3.9.6 — 2026-07-17

Adoption contract in code: human speaks natural language; agent runs the CLI.

### Changed
- **`@fde` skill** - explicit Human surface vs agent plumbing; never ask the FDE to type `fde …`; route walk-in prep to `fde prep`; prefer `fde debrief --smart` → confirm → `--apply`.
- **`references/debrief.md`** - smart path first; agent owns the CLI.
- **Session-start pointer + Cursor adapter** - same contract.
- **README** - week as what you say; CLI reframed as under-the-hood map.

## 3.9.5 — 2026-07-17

Token discipline: SessionStart matches progressive-disclosure L1.

### Changed
- **`hooks/session-start`** no longer `cat`s the full `SKILL.md` (~24KB) into every session. Injects a one-line `@fde` pointer + TRIAGE + bounded `context.md` only. Skill body loads when `@fde` triggers.
- check.js asserts the lean inject; CLI test covers the hook output.

## 3.9.4 — 2026-07-17

Revert packaging-only 3.9.3 (week-loop README / Next: line / skills-add elevate). Restore 3.9.2 docs and skill wording.

## 3.9.3 — 2026-07-17

Yanked from product surface — packaging clarity experiment; superseded by 3.9.4.

## 3.9.2 — 2026-07-17

Field judgment hardenings blended into existing methods — no new skills, no imported skill names.

### Added
- **Brief interrogation** in `land` / `discover` — one Q + GUESS + confidence when the brief is thin; never invent stakeholders to fill gaps.
- **Anti-invention gates** in `@fde` — when not to invent, over-route, grill, or ship on vibes.
- **Pre-blast challenge** in `ship` / `red-team` — CLAIM → CHALLENGE → VERDICT before irreversible client moves.

## 3.9.1 — 2026-07-14

Field-sim closeout: prep and smart debrief match how FDEs actually write memory (logs, not only tables).

### Fixed
- **`fde prep` reads log-shaped memory** — stakeholders from Signal history / ledger when the table is empty; risks from dated bullets as well as the table.
- **`fde debrief --smart`** — infers `[signal:amber|green|red]` from contact language; person lines like “Randy opened the sheet…” route as contacts; open questions → risks; `next:` / “Next action:” updates `## Next action`.
- Worst-of trust still holds when smart apply lands Denise amber + Randy green in one pass.

## 3.9.0 — 2026-07-14

Defensible memory + frictionless debrief loop. Still a field kit — not a coworker shell. Zero telemetry; CLI stays offline.

### Added
- **Versioned `.fde/`** — `git init` inside engagement memory; every log/debrief/capture/phase/garden write auto-commits. Tamper-evident receipts (`@hash` on writes). No new dependencies.
- **Owner attribution** — `.owner` + `[@author]` on dated entries; `fde owner` / `fde owner set`.
- **`fde triage`** — same TRIAGE block as `fde resume`; session-start hook and Cursor adapter load it on entry.
- **`fde doctor`** — deterministic lint (stale signals, unset phase, empty success, missing next action).
- **`fde debrief --smart` / `--apply`** — heuristic propose from messy notes → review → confirm. Prefix router unchanged for air-gap.
- **`fde prep [label]`** — grounded walk-in brief from existing `.fde/` only (no invention).
- **`fde garden [--apply]`** — contract: no new facts, no deleted substance, git-reversible; mechanical archive of 60d+ session-end blocks.
- **`docs/field-reports/`** — attack-our-own-tool notes shipped in-repo.

### Fixed
- Session-start now injects TRIAGE (not only raw `context.md`), matching `fde resume`.

## 3.8.3 — 2026-07-14

Real field-use fixes: trust colors that cannot lie at 5pm, Monday resume that earns its keep, honest phase.

### Fixed
- **Worst-of-stakeholder trust** — latest `[signal:x]` is kept per person, then the worst active color wins. A green about Randy no longer clears Denise’s sponsor amber/red.
- **`fde resume` leads with TRIAGE** — trust, phase, open risks, next action, then engagement memory.
- **Phase is honest** — template defaults to `unset` (not fake `land`); `fde log phase <land|discover|plan|build|ship|close>` advances it.

## 3.8.2 — 2026-07-14

Filesystem last-mile hardenings from brutal edge-case report v2.

### Fixed
- **Human fs errors** — permission denied / disk full / lock failures print one line and exit 1; no Node stack dumps on the field path.
- **Atomic `resume --init`** — new engagements build in a staging dir and rename into place; partial failures clean up instead of leaving a half-built tree.
- **Symlink write guard** — `lstat` refuses appends/writes when a memory file is a symlink (would escape the engagement tree).

## 3.8.1 — 2026-07-14

Field edge-case follow-ups from live multi-client / hostile-handoff review.

### Fixed
- **Secret hygiene** — `fde log` / routed `fde debrief` lines that look like credentials (AKIA…, `ghp_…`, PEM keys, etc.) are refused; pass `--force` only if intentional. `fde log --undo` removes the last CLI write.
- **Corrupt memory ≠ green** — binary or unparseable `stakeholders.md` (or invalid `**Trust:**` value) surfaces as amber with `memory unreadable - verify`, not a healthy green.
- **Status reason** — non-green rows prefer the triggering signal / memory warning over a random latest risk line.

## 3.8.0 — 2026-07-14

Trust + hygiene cut for the field kit (second brain), not an OS.

### Fixed
- **Unknown commands exit 1** — typos in scripts/hooks no longer look like success (`fde help` still exits 0).
- **Basename match is read-only** — `log` / `debrief` / `capture` require a workspace bind, `FDEOPS_ENGAGEMENT`, pointer, or in-repo `.fde/`. A folder that merely shares a client name cannot write into that client's memory.
- **Memory write locking** — exclusive `.lock` + atomic rename on append/rewrite paths so parallel agent sessions (or hook + CLI) do not interleave the same markdown file.
- **Signal ledger** — CLI `[signal:x]` lines also append to `.signal-ledger` so trust colors survive an agent rewrite that drops `## Signal history`.

### Docs
- Dropped leftover “writes itself” / “never cross-contaminated” claims; clarified bind-before-write and Windows Git Bash need for bash hooks.

## 3.7.8 — 2026-07-13

- Adapters install places the skill pointer files reference.
- Stakeholder signal tokens land under `## Signal history` regardless of writer/token position.
