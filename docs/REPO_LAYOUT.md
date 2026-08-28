# Repository layout

| Path | Purpose |
|------|---------|
| `skills/fde/` | **The one skill** - router (`SKILL.md`) + 31 routed skills, 5 overlays, and AI companion `eval-pack` under `references/` |
| `.claude/commands/` | Slash commands: `/brief` `/discover` `/plan` `/ship` `/got` `/close` plus `/debrief` `/prep` `/quiet` `/agreed` `/status` — each loads `@fde` |
| `adapters/` | Thin per-tool pointers (Codex/`AGENTS.md`, Gemini, Cursor, Copilot, local LLMs) - `node bin/install.js adapters <dir>` |
| `templates/.fde/` | Core memory templates for `fde resume --init` (phase artifacts are created by phases on demand; `evals.md` is optional) |
| `examples/` | Fictional walkthroughs with sample `.fde/` files |
| `bin/fde.js` | Deterministic CLI - scan, resume, triage, log, debrief, ingest, prep, doctor, tidy, redact, receipts, capture, preserve, status, dashboard, vault |
| `mcp/` | Optional MCP sink (`fdeops-ingest`) + source **recipes** (`mcp/recipes/` — file, granola, notion); source MCPs remain user-configured |
| `bin/lib/` | Shared memory / trust / render helpers used by the CLI |
| `bin/check.js` | Structural + install smoke gate (`npm run check`) |
| `bin/install.js` | `node bin/install.js` (skills + hooks on disk) |
| `hooks/` | session-start (read), session-stop (write), pre-compact - registry-aware |
| `test/` | CLI regression suite |
| `evals/` | Cheap skill-routing contract checks |
| `.claude-plugin/` | Claude Code marketplace metadata |
| `docs/` | install, USAGE, schema, OPERATIONS, REPO_LAYOUT, skills, skills-reference |
| `media/` | Optional demo assets (not required for CLI/skill install) |

**Install:** [install.md](./install.md) - Claude plugin + git clone is the reliable path.
