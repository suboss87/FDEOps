# Changelog

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
