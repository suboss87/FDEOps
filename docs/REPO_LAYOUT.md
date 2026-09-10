# Repository layout

| Path | Purpose |
|------|---------|
| `skills/fde/` | **The one skill** - router (`SKILL.md`) + 30 routed skills, 5 overlays, and AI companion `eval-pack` under `references/` |
| `.claude/commands/` | Slash commands: `/brief` `/discover` `/plan` `/ship` `/outcome` `/close` plus `/debrief` `/prep` `/trust` `/receipts` `/readout`. Each loads `@fde` |
| `adapters/` | Thin per-tool pointers (Codex/`AGENTS.md`, Gemini, Cursor, Copilot, local LLMs) - `node bin/install.js adapters <dir>` |
| `templates/.fde/` | Core memory templates for `fde resume --init` (phase artifacts are created by phases on demand; `evals.md` is optional) |
| `examples/` | Fictional walkthroughs with sample `.fde/` files |
| `bin/fde.js` | Deterministic CLI - scan, resume, recall, triage, log, debrief, ingest, prep, doctor, tidy, redact, receipts, capture, preserve, status, dashboard, vault |
| `mcp/` | Optional MCP sink (`fdeops-ingest`) + source **recipes** (`mcp/recipes/` - file, granola, notion); source MCPs remain user-configured |
| `bin/lib/` | Shared memory, trust, acceptance, installer safety, and report helpers; embedded fonts and their notice stay separate from rendering logic |
| `bin/check.js` | Structural + install smoke gate (`npm run check`) |
| `bin/install.js` | `node bin/install.js` (skills + hooks on disk) |
| `hooks/` | session-start (read), session-stop (write), pre-compact - registry-aware |
| `test/` | CLI regression suite |
| `evals/` | Skill-routing contract checks; `testing-fieldbook.md` is contributor CLI attack notes (not a skill) |
| `.claude-plugin/` | Claude Code marketplace metadata |
| `docs/` | install, USAGE, schema, OPERATIONS, REPO_LAYOUT, skills, skills-reference, methodology |
| `docs/methodology.md` | FDE principles the kit encodes (not loaded by hosts) |
| `media/` | Fictional dark fieldbook preview for README and a reproducible recorded session for USAGE.md |

## Where to start

- **Use the tool:** [installation](install.md), then the [five-minute walkthrough](USAGE.md#new-here-5-minutes).
- **Change a workflow:** edit the relevant `skills/fde/references/` file and its routing evaluation. Keep `SKILL.md` as the single entry.
- **Change records or reports:** start in `bin/fde.js` and `bin/lib/`, with regressions in `test/`. Document record changes in [schema.md](schema.md).
- **Change host setup:** use `bin/install.js`, `adapters/`, or `hooks/`; verify automatic and manual host behavior separately.
- **Change public instructions:** keep README concise; use [USAGE.md](USAGE.md) for routines and [install.md](install.md) for setup. The [website update brief](website-updates.md) describes matching public copy.

Keep customer `.fde/` records outside this repository. Examples and tests use fictional clients. Dashboard HTML and vaults are generated views, not new sources of truth. Avoid moving stable entry paths solely for appearance: installers, plugins, and external links depend on them.

## Documentation index

| You need | Read |
|---|---|
| First setup or changing hosts | [install.md](install.md) |
| The notes, review, apply, and evidence loop | [USAGE.md](USAGE.md) |
| Day zero, small delivery, or POC to production | [skills.md](skills.md#three-delivery-checklists) |
| A specific skill's entry condition and artifact | [skills-reference.md](skills-reference.md) |
| Record fields and acceptance semantics | [schema.md](schema.md) |
| Operating boundaries and field methodology | [OPERATIONS.md](OPERATIONS.md), [methodology.md](methodology.md) |
| Executed checks and known limits | [verification.md](verification.md) |
| Website changes for the designer | [website-updates.md](website-updates.md) |
| Contribution, review, or release process | [CONTRIBUTING.md](../CONTRIBUTING.md) |

The catalog overview and full reference serve different reading depths; neither duplicates the executable skill body. Historical field reports and evaluation fixtures preserve evidence, so they are retained. Personal machine setup and one-off release history do not belong in product documentation.
