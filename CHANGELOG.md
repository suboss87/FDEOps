# Changelog

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
