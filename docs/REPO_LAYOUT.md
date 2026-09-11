# Repository layout

| Path | Purpose |
|------|---------|
| `skills/fde/` | **The one skill** - router (`SKILL.md`) + 30 routed skills, 5 overlays, and AI companion `eval-pack` under `references/` |
| `.claude/commands/` | Slash commands: `/brief` `/discover` `/plan` `/ship` `/outcome` `/close` plus `/debrief` `/prep` `/trust` `/receipts` `/readout`. Each loads `@fde` |
| `adapters/` | Thin per-tool pointers (Codex/`AGENTS.md`, Gemini, Cursor, Copilot, local LLMs) - `node bin/install.js adapters <dir>` |
| `templates/.fde/` | Core memory templates for `fde resume --init` (phase artifacts are created by phases on demand; `evals.md` is optional) |
| `examples/` | Fictional walkthroughs with sample `.fde/` files |
| `bin/fde.js` | Deterministic CLI - scan, resume, recall, triage, log, debrief, ingest, prep, doctor, tidy, redact, receipts, defend, handoff, capture, preserve, status, dashboard, vault |
| `mcp/` | Optional MCP sink (`fdeops-ingest`) + source **recipes** (`mcp/recipes/` - file, granola, notion); source MCPs remain user-configured |
| `bin/lib/` | Shared memory, trust, acceptance, installer safety, and report helpers; embedded fonts and their notice stay separate from rendering logic |
| `bin/check.js` | Structural + install smoke gate (`npm run check`) |
| `bin/install.js` | `node bin/install.js` (skills + hooks on disk) |
| `hooks/` | session-start (read), session-stop (write), pre-compact - registry-aware |
| `test/` | CLI regression suite |
| `evals/` | Reproducible context, model, delivery, and routing evaluations; start with `evals/README.md` |
| `.claude-plugin/` | Claude Code marketplace metadata |
| `docs/` | install, USAGE, schema, OPERATIONS, REPO_LAYOUT, skills, skills-reference, methodology |
| `docs/methodology.md` | FDE principles the kit encodes (not loaded by hosts) |
| `PRODUCT.md` | Audience, product purpose, and dashboard design constraints |
| `media/` | Fictional dark fieldbook preview for README and a reproducible recorded session for USAGE.md |

## Where to start

- **Use the tool:** [installation](install.md), then the [five-minute walkthrough](USAGE.md#new-here-5-minutes).
- **Change a workflow:** edit the relevant `skills/fde/references/` file and its routing evaluation. Keep `SKILL.md` as the single entry.
- **Change records or reports:** start in `bin/fde.js` and `bin/lib/`, with regressions in `test/`. Document record changes in [schema.md](schema.md).
- **Change host setup:** use `bin/install.js`, `adapters/`, or `hooks/`; verify automatic and manual host behavior separately.
- **Change public instructions:** keep README concise; use [USAGE.md](USAGE.md) for routines and [install.md](install.md) for setup.

Keep customer `.fde/` records outside this repository. Examples and tests use fictional clients. Dashboard HTML and vaults are generated views, not new sources of truth. Avoid moving stable entry paths solely for appearance: installers, plugins, and external links depend on them.

## Further reading

[Documentation index](README.md) · [Contribution guide](../CONTRIBUTING.md) · [Product and design constraints](../PRODUCT.md)


Keep one-off plans, designer briefs, session notes, and raw host traces outside Git. Public validation belongs in [verification.md](verification.md); reusable fixtures and model results belong in `evals/`.
