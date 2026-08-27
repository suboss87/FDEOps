# AGENTS.md - working in the fdeops repository

This repository **is** fdeops - forward deployed engineering skills with memory, for AI coding agents. One `@fde` skill routes an entire client engagement across six domains, the `fde` CLI does the deterministic work, and per-customer memory lands in `.fde/` files as a side effect of the work (you still confirm judgment).

## If you are helping use fdeops in an engagement

Route via **`@fde`** - read `skills/fde/SKILL.md` (the single source of truth), pick the phase, do the work, and write `.fde/` memory. Never ask the human to pick a skill. Other tools get the same behavior through thin pointer files in [`adapters/`](adapters/README.md).

## If you are contributing to this repository

- **One brain.** Method lives once in `skills/fde/SKILL.md` + `skills/fde/references/`. Adapters in `adapters/` only point at it - never fork logic per platform.
- **Deterministic core.** `bin/fde.js` is local-only (git + file reads, no network, no AI). Keep it that way.
- **Run the checks.** `npm run check` must pass before any PR (`node bin/check.js`).
- **Conventions.** See `CONTRIBUTING.md`, `docs/REPO_LAYOUT.md`, and `docs/schema.md`.

## Boundaries

The `fde` CLI never reaches the network. `<private>` blocks are redacted from CLI/dashboard/hook outputs; do not load raw private blocks into a model via file tools or paste. fdeops installs on the FDE's own machine, never on customer infrastructure.
