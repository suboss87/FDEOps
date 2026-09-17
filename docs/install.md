# Installing fdeops

fdeops installs on **your laptop** - where **your AI coding agent** runs. Not on client servers, CI, or environments you do not own.

**Terminology:** **You** = human FDE. **Agent** = AI coding software (e.g. Claude Code), never a person. See [README § Who this is for](../README.md#who-this-is-for).

**Use customer-approved data and AI tools.** The CLI runs locally, but your AI agent may send what it reads to its provider. Masking is partial and does not protect direct file reads or pasted text. If approval is unclear, start with synthetic data. Anonymised customer material still needs permission.

**Try with fictional data:** `npx fdeops demo` runs a synthetic engagement in a separate `.demo` workspace. It creates or resets that demo only. `npx` may download the package; the CLI itself does not use the network. Requires Node.js 18+ and Git.

---

## Quick Start (the whole setup)

Install the routing skill in a host supported by the skills installer:

```bash
npx skills add suboss87/fdeops --skill fde
```

Then one chat - name the client. That creates `~/fde-engagements/<client>/.fde/`. You never type the CLI:

```text
@fde this is client01
```

Claude Code (hooks before you type; task skills and engagement shortcuts):

```text
/plugin marketplace add suboss87/fdeops
/plugin install fdeops@fdeops
```

Terminal fallback (if the agent cannot bind), inside a workspace:

```bash
npx fdeops resume --init <client-name>
```

The plugin install alone does **not** put a bare `fde` command on your shell PATH. `npx fdeops <command>` can fetch the CLI when Node.js and network access are available; run `npm i -g fdeops` once if you want the short `fde` form used in the rest of these docs.

`fde resume --init` creates `~/fde-engagements/<client-name>/.fde/` and **binds this workspace to it in the workspace registry**. Enabled Claude Code session hooks read that binding to load context and capture mechanical session state. Skill-only and adapter installs do not register these hooks; use `@fde` or the CLI on demand in those hosts.

Type `@fde` in the AI chat and start working.

---

## Who needs which install

| Situation | Install |
|-----------|---------|
| Claude Code | `/plugin install fdeops@fdeops`  - skill, slash commands, hooks. CLI via `npx fdeops …`. `node bin/install.js` only if you want a disk copy under `~/.claude/` |
| Cursor / other agents | `npx skills add suboss87/fdeops --skill fde`, then `npx fdeops adapters <client-workspace>` |
| Offline machine | Transfer an existing checkout, enter its directory, then run `node bin/install.js`; Node.js and Git must already be available |
| Bind (any host, after the skill exists) | Chat: `@fde this is client01`. Terminal fallback: `npx fdeops resume --init <name>` |
| Quick trial, no install | `npx fdeops scan` (uses **fdeops v3.0.0 or later from npm**) |

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

The CLI works without a model. AI-assisted use requires a local model and an agent host with file and CLI tool access; a system prompt alone is insufficient. Setup and verification limits: [`adapters/LOCAL-LLM.md`](../adapters/LOCAL-LLM.md).

---

## Other AI tools (Cursor, Codex, Gemini CLI, Copilot)

**Switching tools:** the fieldbook stays at `~/fde-engagements/<client>/.fde/`. Install `@fde` on the new tool, open a bound workspace (`fde resume --init <client>` once if needed), then `@fde` / `fde resume`. Same client record. Session start/stop hooks are Claude Code-first; other tools get the same brain and CLI, usually on demand.

The coordinator uses the same canonical methods in every tool. Drop the right adapter into the **client workspace** (the repo you open in the tool - not only the engagement folder):

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

fdeops is packaged as an [Agent Plugins 1.0.0](https://agent-plugins.org/specification) plugin: the repository root is the plugin root, with `plugin.json`, the `fde` coordinator and task skills under `skills/`, and the ingest MCP sink declared in `mcp.json`. A client that supports the format loads all three from a checkout or the npm tarball with no per-client wiring and no absolute paths.

The format covers packaging only - it defines no install mechanism, permissions, or trust model, so nothing above changes. Claude Code keeps using `.claude-plugin/` and the hooks; other tools keep using the adapters.

---

## The memory hooks

`node bin/install.js` copies three hooks to `~/.claude/hooks/` (registered automatically by the Claude Code plugin; for other tools, register per that tool's hook documentation):

| Hook | When | What it does |
|------|------|--------------|
| `fdeops-session-start` | session start | resolves the engagement via the workspace registry; injects TRIAGE + a bounded view of `context.md` + a one-line `@fde` pointer (not the full skill body) |
| `fdeops-session-stop` | session end | appends a deterministic "where we left off" (branch, changes, updated artifacts) to `context.md` |
| `fdeops-pre-compact` | before compaction | preserves engagement state across long sessions |

Once registered in the host, the hooks honor the workspace registry written by `fde resume --init`. Binding selects the client; binding alone does not enable hooks. You still confirm judgment; the fieldbook is not self-maintaining without you.

**Windows:** the CLI and `hooks/run-hook.cmd` work on Windows. The session hooks themselves are `#!/bin/bash` scripts - on Windows you need Git Bash (or another bash) available for Claude Code hooks to run. The `fde` CLI (Node) does not require bash.

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
export FDEOPS_ENGAGEMENT=<client-name>          # a bare slug works too
export FDEOPS_ENGAGEMENT=~/fde-engagements/<client-name>   # so does the folder
```

It must be an absolute path (`~` is expanded) or a bare slug - a relative path like `..` would resolve against whatever directory the agent started in.

When set, it takes precedence over the registry. If it points at nothing, every verb **refuses and names the value** rather than falling back to the registry - an override that silently resolved elsewhere would file this client's note in another client's memory. A `~/.claude/FDEOPS-CLAUDE.md` pointer file and a project `CLAUDE.md` line are equivalent overrides; the resolution order is env var → workspace registry → pointer file → workspace-name match (read-only) → in-repo `.fde/`.

The session hooks (`session-start`, `session-stop`, `pre-compact`) honor the same rule: with a value they cannot resolve they exit without reading or writing any engagement, so an automatic capture never lands in a client you did not name.

**Writes** (`fde log`, `fde debrief`, `fde capture`) require env, registry bind, pointer, or in-repo `.fde/`. A folder-name match alone is not enough - that stops an unbound checkout named like a client from appending into the wrong memory.

---

## Update

```bash
cd fdeops && git pull && node bin/install.js
```

For a command using the latest published version: `npx fdeops@latest scan`. Running bare `npx fdeops@latest` invokes the disk installer. If you installed globally, update with `npm install -g fdeops@latest`.

### Upgrading to 5.0: plain task names

Task skills now use `discover`, `build`, `review`, and the other names in the [catalog](../README.md#task-skills). The coordinator remains `fde`. Existing customer records and CLI commands are unchanged. Update prompts or selective-install commands that used a prefixed name such as `fde-discover`.

For installations made by `node bin/install.js` or bare `npx fdeops`, the installer:

1. Installs the new task directory first.
2. Moves the old managed `fde-<task>` directory to `~/.claude/fdeops/skill-backups/` only after that replacement succeeds.
3. Prints the backup's exact path. The complete old directory, including personal edits and extra files, is preserved. Review those edits before applying them to the new version.

An existing unowned `discover`, `build`, or other task directory is preserved. The installer reports the conflict and exits nonzero; the old FDEOps task remains available. Resolve the conflict before retrying, or use the namespaced Claude Code plugin instead.

If you used another installer, old prefixed skills may be unmarked or symlinked. Update through that installer, verify the new task works, and then remove or move only the old FDEOps entry using that tool's supported process. The FDEOps disk installer does not infer ownership of these entries or remove them for you.

### What the installer will not touch

The disk installer marks its skill directories with `.fdeops-managed`. It preserves unowned directories by default. Managed current skills receive updated shipped files; save your customizations separately before updating. Renamed task directories receive the complete backup described above.

`node bin/install.js --force` explicitly permits replacing files at a conflicting destination. It does not follow symlinks or bypass filesystem permissions, and it does not authorize removal of unmarked old prefixed tasks. An incomplete installation is reported with a nonzero exit code.

---

## Usage

[USAGE.md](./USAGE.md) · [OPERATIONS.md](./OPERATIONS.md)

## Individual skills and the full pack

Install one task, such as integration:

```bash
npx skills add suboss87/fdeops --skill integrate
```

Substitute a name from the [task catalog](../README.md#task-skills). Each task includes its required references and does not require the coordinator. Tasks that draft or analyze can use supplied context. Record operations need actual records; staging and saving need a selected customer.

Install `fde` alone when you want the agent to choose the relevant instructions for a customer project. Its references cover the complete engagement; separate task installations are needed only if you want those tasks available as individual skill entries.

For the full pack in Claude Code:

```text
/plugin marketplace add suboss87/fdeops
/plugin install fdeops@fdeops
```

The plugin includes all 35 task skills, the `fde` coordinator and session hooks. Invoke `/fdeops:fde` for a project or `/fdeops:integrate` for a task. Plugin namespaces let FDEOps coexist with another pack's `review` or `build`. Personal or project skills use `/integrate`; they may override same-named host skills. See [Claude Code's naming rules](https://code.claude.com/docs/en/skills#resolve-skills-that-share-a-name). Other hosts use their own skill picker and invocation syntax; select the FDEOps entry if names overlap.

For other supported hosts, run the skills installer interactively and select the entries you need. For a local Claude Code disk installation, run `node bin/install.js` from a reviewed checkout; see the collision and upgrade behavior above. Skill-only installs do not register session hooks.

Skills supply instructions, not customer dependencies, credentials, production access or a browser. Use your repository's tools and report unavailable checks as unrun. Verified local behavior does not establish compatibility with every host or customer environment.
