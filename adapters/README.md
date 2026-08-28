# Cross-platform adapters

**One brain, thin adapters.** fdeops has a single source of truth - the `@fde` skill at `skills/fde/SKILL.md` and the `fde` CLI. Each AI coding tool discovers it through a small pointer file in the place that tool already looks. No forked logic, no five copies to maintain - every adapter says the same thing: *route via `@fde`, read/write `.fde/` memory, talk like a peer, never touch what isn't yours.*

**Switching tools:** the fieldbook does not live in the agent. It lives at `~/fde-engagements/<client>/.fde/`. Point a new tool at a bound workspace, drop adapters (or install the skill/plugin for that tool), and the same client record opens. Auto session hooks are Claude Code-first; elsewhere load via `@fde` / `fde resume`. See [README § How it works](../README.md#how-it-works).

## What goes where

| Tool | File in your engagement workspace | Source template |
|------|-----------------------------------|-----------------|
| Claude Code | plugin + `~/.claude/FDEOPS-CLAUDE.md` (created on install) | `../CLAUDE.md.template` |
| Codex / OpenAI / generic | `AGENTS.md` | `AGENTS.md` |
| Gemini CLI | `GEMINI.md` | `GEMINI.md` |
| Cursor | `.cursor/rules/fde.mdc` | `cursor.fde.mdc` |
| GitHub Copilot | `.github/copilot-instructions.md` | `copilot-instructions.md` |
| Local LLMs (Ollama, LM Studio, llama.cpp, vLLM) | Load `SKILL.md` as system prompt | [`LOCAL-LLM.md`](LOCAL-LLM.md) (guide) |

`AGENTS.md` is the emerging cross-tool standard - many agents read it, so it doubles as the universal fallback. For local/self-hosted models, see [`LOCAL-LLM.md`](LOCAL-LLM.md).

## Install them in one command

From your fdeops clone, drop every pointer into a workspace at the right path:

```bash
node bin/install.js adapters /path/to/your/engagement-workspace
# or, with npm 3.2.0+:
npx fdeops@latest adapters /path/to/your/engagement-workspace
```

Defaults to the current directory if no path is given. Existing files are never clobbered - if a `CLAUDE.md` / `AGENTS.md` already exists, an fdeops pointer block is appended once (idempotent); files unique to fdeops are created fresh.

## The principle

The adapter only tells the tool **where the brain is and how to behave**. All 31 skills, the overlays, and the memory contract live once in `skills/fde/SKILL.md`. Update the brain, every platform gets it. That's why fdeops feels native in whatever the FDE already uses, without five things to keep in sync.
