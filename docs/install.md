# Installing fdeops

fdeops installs on **your laptop** - where **your AI coding agent** runs. Not on client servers, CI, or environments you do not own.

**Terminology:** **You** = human FDE. **Agent** = AI coding software (e.g. Claude Code), never a person. See [README § Who this is for](../README.md#who-this-is-for).

**Try before installing:** `npx fdeops scan` works zero-config in any repo - no install, no init. It prints day-1 recon plus an "ASK ON DAY 1" question list, entirely local.

---

## Quickstart (the whole setup)

```text
/plugin marketplace add suboss87/fdeops        # 1. install (Claude Code)
/plugin install fdeops@fdeops
```

```bash
npx fdeops resume --init <client-name>         # 2. run once, inside the client's workspace
```

The plugin install alone does **not** put a bare `fde` command on your shell PATH. `npx fdeops <command>` always works with nothing pre-installed; run `npm i -g fdeops` once if you want the short `fde` form used in the rest of these docs.

Done. `fde resume --init` creates `~/fde-engagements/<client-name>/.fde/` and **binds this workspace to it in the workspace registry**. The session hooks read that binding, so memory auto-loads at session start and auto-captures at session end - nothing else to configure, no environment variables.

Type `@fde` in the AI chat and start working.

---

## Who needs which install

| Situation | Install |
|-----------|---------|
| Claude Code only | Marketplace plugin (above); run `node bin/install.js` once for hooks on disk |
| Multiple AI tools or air-gap | Git clone + `node bin/install.js`, then adapters per tool |
| Quick trial, no install | `npx fdeops scan` (uses **fdeops v3.0.0 or later from npm** - the npm version, not your npm client's version) |

---

## Claude Code (recommended)

```text
/plugin marketplace add suboss87/fdeops
/plugin install fdeops@fdeops
```

Copy skills and hooks to disk:

```bash
git clone https://github.com/suboss87/fdeops.git
cd fdeops
node bin/install.js
```

---

## Create an engagement

The canonical way - one command, run inside the client's workspace:

```bash
fde resume --init <client-name>      # or: npx fdeops resume --init <client-name>
```

```text
~/fde-engagements/<client-name>/
  .fde/           ← AI reads/writes; you own it
```

This also registers the workspace → engagement binding, so every later `fde resume` (and the hooks) resolve the right client automatically. One folder per client; run it again from another workspace to bind that workspace to the same or a different client.

(Alternative scaffold without binding: `node bin/install.js init <client-name>` from the clone, or `npx fdeops@latest init <client-name>`. Prefer `fde resume --init` - it is the one step that makes the hooks work.)

---

## Local LLMs (Ollama, LM Studio, llama.cpp, vLLM)

No cloud required. Load `SKILL.md` as your model's system prompt. Full guide: [`adapters/LOCAL-LLM.md`](../adapters/LOCAL-LLM.md).

---

## Other AI tools (Cursor, Codex, Gemini CLI, Copilot)

**Switching tools:** the fieldbook stays at `~/fde-engagements/<client>/.fde/`. Install `@fde` on the new tool, open a bound workspace (`fde resume --init <client>` once if needed), then `@fde` / `fde resume`. Same client record. Session start/stop hooks are Claude Code–first; other tools get the same brain and CLI, usually on demand.

One skill file powers every tool. Drop the right adapter into the **client workspace** (the repo you open in the tool - not only the engagement folder):

```bash
node bin/install.js adapters /path/to/client-workspace
# or: npx fdeops@latest adapters <dir>   (fdeops v3.2.0+ on npm)
```

Defaults to the current directory if no path is given.

| Tool | Pointer file written |
|------|----------------------|
| Codex / OpenAI / generic | `AGENTS.md` |
| Gemini CLI | `GEMINI.md` |
| Cursor | `.cursor/rules/fde.mdc` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Claude Code | `CLAUDE.md` (plus the plugin above) |

Existing `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` files are never clobbered - an fdeops pointer block is appended once (idempotent). See [`adapters/`](../adapters/README.md) for the templates and the design.

---

## Agent Plugins clients

fdeops is packaged as an [Agent Plugins 1.0.0](https://agent-plugins.org/specification) plugin: the repository root is the plugin root, with `plugin.json`, the `@fde` skill under `skills/fde/`, and the ingest MCP sink declared in `mcp.json`. A client that supports the format loads all three from a checkout or the npm tarball with no per-client wiring and no absolute paths.

The format covers packaging only - it defines no install mechanism, permissions, or trust model, so nothing above changes. Claude Code keeps using `.claude-plugin/` and the hooks; other tools keep using the adapters.

---

## The memory hooks

`node bin/install.js` copies three hooks to `~/.claude/hooks/` (registered automatically by the Claude Code plugin; for other tools, register per that tool's hook documentation):

| Hook | When | What it does |
|------|------|--------------|
| `fdeops-session-start` | session start | resolves the engagement via the workspace registry; injects TRIAGE + a bounded view of `context.md` + a one-line `@fde` pointer (not the full skill body) |
| `fdeops-session-stop` | session end | appends a deterministic "where we left off" (branch, changes, updated artifacts) to `context.md` |
| `fdeops-pre-compact` | before compaction | preserves engagement state across long sessions |

The hooks honor the workspace registry written by `fde resume --init` - bind a workspace once and the loop closes by itself: read side + write side. You still confirm judgment; the fieldbook is not self-maintaining without you.

**Windows:** the CLI and `hooks/run-hook.cmd` work on Windows. The session hooks themselves are `#!/bin/bash` scripts — on Windows you need Git Bash (or another bash) available for Claude Code hooks to run. The `fde` CLI (Node) does not require bash.

---

## Advanced: engagement overrides

### `FDEOPS_ENGAGEMENTS_ROOT`

Puts the whole engagements tree (init, registry, status, dashboard) somewhere other than `~/fde-engagements`. Use this for dogfood or isolated simulations:

```bash
export FDEOPS_ENGAGEMENTS_ROOT=~/fde-sims/client-a
fde resume --init meridian
```

### `FDEOPS_ENGAGEMENT` (single-folder override)

You do **not** need this for normal use - the workspace registry handles engagement resolution. The env var exists as an explicit override for unusual setups (one workspace serving several clients, shared machines, scripted environments):

```bash
export FDEOPS_ENGAGEMENT=~/fde-engagements/<client-name>/.fde
```

When set, it takes precedence over the registry. A `~/.claude/FDEOPS-CLAUDE.md` pointer file and a project `CLAUDE.md` line are equivalent overrides; the resolution order is env var → workspace registry → pointer file → workspace-name match (read-only) → in-repo `.fde/`.

**Writes** (`fde log`, `fde debrief`, `fde capture`) require env, registry bind, pointer, or in-repo `.fde/`. A folder-name match alone is not enough — that stops an unbound checkout named like a client from appending into the wrong memory.

---

## Update

```bash
cd fdeops && git pull && node bin/install.js
```

Or via npm: `npx fdeops@latest` (fetches the latest published fdeops).

### What the installer will not touch

Every skill directory fdeops creates under `~/.claude/skills/` carries a `.fdeops-managed` marker, and the installer only removes or overwrites directories that have it. If you wrote your own skill whose name collides with one fdeops ships or shipped in v2 (`healthcare-fde`, `fintech-fde`, `gov-fde`, `fde-*`), it is left untouched and reported:

```text
  skip   1 skill dir(s) fdeops did not create - removing them would destroy your own work:
           ~/.claude/skills/healthcare-fde
         move or delete them yourself, or re-run with --force to let fdeops take them over
```

Delete a `.fdeops-managed` marker to make fdeops treat that directory as yours from then on. `node bin/install.js --force` overrides the check.

---

## Usage

[USAGE.md](./USAGE.md) · [OPERATIONS.md](./OPERATIONS.md)
