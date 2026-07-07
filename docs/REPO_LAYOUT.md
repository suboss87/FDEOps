# Repository layout

| Path | Purpose |
|------|---------|
| `skills/fde/` | **The one skill** - router (`SKILL.md`) + 35 skill methods and 5 overlays (`references/`) - installed to `~/.claude/skills/` |
| `adapters/` | Thin per-tool pointers (Codex/`AGENTS.md`, Gemini, Cursor, Copilot) - `node bin/install.js adapters <dir>` |
| `templates/.fde/` | Core memory templates for `fde resume --init` (phase artifacts are created by phases on demand) |
| `examples/acme-payments/` | Fictional walkthrough with sample `.fde/` files |
| `bin/fde.js` | The `fde` CLI - scan, resume, debrief, log, receipts, capture, status, dashboard |
| `bin/install.js` | `node bin/install.js` (skills + hooks on disk) |
| `hooks/` | `fdeops-session-start` (read), `fdeops-session-stop` (write), `fdeops-pre-compact` - registry-aware |
| `.claude-plugin/` | Claude Code marketplace metadata |
| `docs/` | install, USAGE, schema, OPERATIONS, REPO_LAYOUT, skills, skills-reference |

**Install:** [install.md](./install.md) - Claude plugin + git clone is the reliable path.
