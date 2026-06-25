# Installing fdeops

fdeops installs on **your laptop**-where **your AI coding agent** runs. Not on client servers, CI, or environments you do not own.

**Terminology:** **You** = human FDE. **Agent** = AI coding software (e.g. Claude Code), never a person. See [README § Who this is for](../README.md#who-this-is-for).

**Read first:** [Quickstart](../README.md#quickstart) · [How it works](../README.md#how-it-works)

---

## Who needs this install

| Situation | Install |
|-----------|---------|
| Claude Code only | Marketplace plugin; run `node bin/install.js` once for hooks on disk |
| Multiple AI tools or air-gap | Git clone + `node bin/install.js` per tool |
| Convenience | `npx fdeops@latest` when npm ≥ **3.0.0** |

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

## npm CLI

```bash
npx fdeops@latest
```

---

## Create an engagement

```bash
cd fdeops
node bin/install.js init <engagement-name>
```

Or with npm 3.0.0+: `npx fdeops@latest init <engagement-name>`

```text
~/fde-engagements/<engagement-name>/
  .fde/           ← AI reads/writes; you own it
  ENGAGEMENT.md
```

---

## Point the AI at your notes

```text
FDEOPS_ENGAGEMENT=~/fde-engagements/<engagement-name>/.fde
```

| Method | When |
|--------|------|
| `~/.claude/FDEOPS-CLAUDE.md` | Default (created on install) |
| Shell `export` | Quick session |
| Project `CLAUDE.md` | Only if engagement allows that file in workspace |

Open your workspace. In the **AI chat**, type `@fde`.

---

## Local LLMs (Ollama, LM Studio, llama.cpp, vLLM)

No cloud required. Load `SKILL.md` as your model's system prompt and set the engagement path. Full guide: [`adapters/LOCAL-LLM.md`](../adapters/LOCAL-LLM.md).

---

## Other AI tools (Cursor, Codex, Gemini CLI, Copilot)

One skill file powers every tool. Drop the right adapter into your engagement workspace:

```bash
node bin/install.js adapters ~/fde-engagements/<engagement-name>
# or with npm 3.2.0+: npx fdeops@latest adapters ~/fde-engagements/<engagement-name>
```

Defaults to the current directory if no path is given.

| Tool | Pointer file written |
|------|----------------------|
| Codex / OpenAI / generic | `AGENTS.md` |
| Gemini CLI | `GEMINI.md` |
| Cursor | `.cursor/rules/fde.mdc` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Claude Code | `CLAUDE.md` (plus the plugin + `~/.claude/FDEOPS-CLAUDE.md` above) |

Existing `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` files are never clobbered - an fdeops pointer block is appended once (idempotent). See [`adapters/`](../adapters/README.md) for the templates and the design.

---

## The memory hooks

`node bin/install.js` copies three hooks to `~/.claude/hooks/` (registered automatically by the Claude Code plugin; for other tools, register per that tool's hook documentation):

| Hook | When | What it does |
|------|------|--------------|
| `fdeops-session-start` | session start | loads a bounded view of `context.md` (current state + recent activity) so the AI starts where you left off without paying for months of old log |
| `fdeops-session-stop` | session end | appends a deterministic "where we left off" (branch, changes, updated artifacts) to `context.md` |
| `fdeops-pre-compact` | before compaction | preserves engagement state across long sessions |

Together they close the memory loop: read side + write side. You maintain nothing.

---

## Update

```bash
cd fdeops && git pull && node bin/install.js
```

Or when npm ≥ 3.0.0: `npx fdeops@latest`

---

## Usage

[USAGE.md](./USAGE.md) · [OPERATIONS.md](./OPERATIONS.md)
