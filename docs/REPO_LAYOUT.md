# Repository layout

| Path | Purpose |
|------|---------|
| `skills/fde/` | **The one skill** - router (`SKILL.md`) + 34 skill methods and 5 overlays (`references/`) - installed to `~/.claude/skills/` |
| `adapters/` | Thin per-tool pointers (Codex/`AGENTS.md`, Gemini, Cursor, Copilot) - `node bin/install.js adapters <dir>` |
| `templates/.fde/` | Core memory templates for `init` (phase artifacts are created by phases on demand) |
| `examples/acme-payments/` | Fictional walkthrough with sample `.fde/` files |
| `bin/install.js` | `node bin/install.js` and `node bin/install.js init <name>` |
| `hooks/` | `fdeops-session-start` (read), `fdeops-session-stop` (write), `fdeops-pre-compact` |
| `.claude-plugin/` | Claude Code marketplace metadata |
| `docs/` | install, USAGE, schema, OPERATIONS, REPO_LAYOUT, skills-reference |

**Install:** [install.md](./install.md) - Claude plugin + git clone is the reliable path.
