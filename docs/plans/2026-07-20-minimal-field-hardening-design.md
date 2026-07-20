# Minimal Field Hardening Design

## Goal

Remove the highest-risk integrity and privacy gaps in FDEOps v3.9.10 without changing its product model, public workflows, Markdown schema, local-only posture, or dependency footprint.

## Scope

This hardening release will:

1. Route session-end and pre-compaction writes through the existing Node CLI safety layer.
2. Ensure hook-triggered CLI commands use the engagement already resolved by the hook.
3. Redact `.signal-ledger` before any dashboard or prep extraction.
4. Apply existing secret detection to `next:` debrief entries.
5. Replace the fieldbook atomically.
6. Recover conservatively from abandoned lock files.
7. Add process-level regression tests for each behavior.

## Compatibility contract

- Existing `.fde/` directories remain readable and writable by v3.9.10.
- Core Markdown files, headings, dated bullets, signal tokens, and `<private>` syntax do not change.
- Existing CLI commands and output remain unchanged; one internal `preserve` command is added for the pre-compact hook.
- Hooks remain best-effort and must never block an agent session.
- FDEOps remains dependency-free, local-only, and compatible with Node 18+.
- Project `CLAUDE.md`, environment, registry, global pointer, and approved in-repo `.fde` resolution remain supported.

## Design

```text
hook resolves engagement
          │
          ├── FDEOPS_ENGAGEMENT=<resolved> fde capture
          ├── FDEOPS_ENGAGEMENT=<resolved> fde preserve
          └── FDEOPS_ENGAGEMENT=<resolved> fde dashboard/triage
                                      │
                                      ▼
                         symlink guard + file lock
                                      │
                                      ▼
                              existing Markdown
```

The hook remains responsible for compatibility resolution. Once resolved, it passes the exact path into the CLI. The CLI becomes the only writer, eliminating unlocked Bash appends without removing legacy pointer behavior.

`fde preserve` reproduces the current pre-compaction block and daily deduplication. It uses redacted reads and a locked append, then records the change in the existing local memory Git repository. It exits successfully on missing engagement or write failure because compaction hooks cannot be allowed to block.

Lock recovery uses the lock file's modification time. A lock older than 30 seconds is treated as abandoned and removed once before normal acquisition retries continue. Normal Markdown writes complete far below this threshold.

## Failure behavior

- Active lock: wait up to five seconds, then return the existing retry message.
- Abandoned lock: remove it and continue; no user memory is modified during recovery.
- Hook cannot locate Node or the CLI: exit successfully without writing, preserving current best-effort behavior.
- Hook CLI write fails: exit successfully; existing memory remains untouched or contains only a complete append.
- Dashboard replacement fails: retain the previous complete fieldbook and report a concise filesystem error.
- Secret-like `next:` entry: skip it unless `--force` is explicitly supplied.
- Private signal ledger content: render only the existing redaction marker.

## Tests

Process-level `node:test` cases will prove:

- private canaries in `.signal-ledger` never appear in prep or dashboard output;
- secret-like `next:` lines are skipped and do not enter `context.md`;
- an abandoned lock is reclaimed while a fresh lock still blocks;
- dashboard replacement uses the atomic write path;
- session-stop invokes `capture` against the resolved engagement;
- pre-compact invokes `preserve`, retains redaction, and deduplicates daily;
- session-start triage uses the same resolved engagement as its context.

Every behavioral change follows red-green TDD. The full `npm run check` gate must remain clean.

## Rollout and rollback

Ship as a patch release only after testing upgrades from a v3.9.10 sandbox. No memory migration is required. Rolling back to v3.9.10 is safe because this design writes the same Markdown structures and hidden files already understood by that release.

## Not in scope

- Database, daemon, service layer, or cloud synchronization
- Schema v2 or conversion to JSON/frontmatter
- New skills, agent orchestration, or UI redesign
- Installer transaction/rollback redesign
- Multi-file ACID transactions for debrief
- Encryption or management of genuinely sensitive values
- Broad resolver rewrite or removal of legacy pointers
- Changes to trust scoring or dashboard information architecture
