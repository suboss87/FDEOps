# FDEOps

**Your AI coding agent forgets your client every morning. fdeops remembers.**

[![npm version](https://img.shields.io/npm/v/fdeops)](https://www.npmjs.com/package/fdeops)
[![CI](https://github.com/suboss87/fdeops/actions/workflows/validate.yml/badge.svg)](https://github.com/suboss87/fdeops/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

CLI + one `@fde` skill + hooks over a local `.fde/` fieldbook - one folder per client. The **second brain for Forward Deployed Engineers** - engineers embedded at a client, from first meeting to final handoff. Works the same for consultants, agency developers, solutions architects, and fractional CTOs.

```
  land      discover      plan      build      ship      close
    |           |           |         |          |         |
    +-----------+-----------+---------+----------+---------+
          the fieldbook (.fde/) - one per engagement
             written as a side effect of the work
```

**Glossary:** **fieldbook** = the `.fde/` folder · **TRIAGE** = trust + phase + next from memory · **receipts** = dated search of what you logged · **hooks** = auto load/capture at session start/end.

Describe your situation - `@fde` routes to the right method and writes the matching `.fde/` artifact. Phase methods (land → close) live in the skill; the CLI owns scan, memory, and receipts. You still confirm judgment - the fieldbook does not maintain itself without you.

---

## The week

What you actually run most days - the habit that compounds the fieldbook:

| When | What you do | Why it matters |
|------|-------------|----------------|
| **Monday** | Open your AI coding agent → TRIAGE loads (trust, phase, next) | Start where last week left off - no re-paste |
| **After a meeting** | `fde debrief --smart notes.txt` → review → `--apply` | Messy notes become dated decisions, risks, contacts |
| **Before a walk-in** | `fde prep "Denise sync"` | Walk in with memory, not a blank chat |
| **Scope fight** | `fde receipts descope` (+ memory git hash) | Answer "when did we agree?" from the record |
| **Friday** | `fde status` → sponsor update from the real record | Status from evidence, not memory theater |

Same engagement folder every time (`~/fde-engagements/<client>/.fde/`). Git versions it. Your AI coding agent reads it on every session.

---

## Quickstart

**1. Install** (pick one)

```bash
npx skills add suboss87/fdeops          # Cursor, Codex, and skills-compatible agents
```

```text
/plugin marketplace add suboss87/fdeops # Claude Code
/plugin install fdeops@fdeops
```

**2. Bind** - once, inside the client workspace:

```bash
npx fdeops resume --init garvey   # creates ~/fde-engagements/garvey engagement + binds workspace
```

**Verify:**

```bash
npx fdeops resume                 # should print TRIAGE (trust, phase, next) for garvey
```

**3. Work**

```text
@fde I just got the brief. New client, payments platform, they want it live before their Q3 audit.
```

`@fde` routes and writes `.fde/` artifacts - you confirm judgment. Use `npx fdeops …` until you want a short command: `npm i -g fdeops` (optional). Full workflow: [docs/USAGE.md](docs/USAGE.md).

<details>
<summary><strong>Other install paths</strong> · scan · env</summary>

- **Cursor / Codex / Copilot / Gemini CLI:** `npx fdeops adapters .` - [adapters/](adapters/README.md)
- **Local LLMs (Ollama, LM Studio, llama.cpp):** load `skills/fde/SKILL.md` as the system prompt - [guide](adapters/LOCAL-LLM.md)
- **Manual / air-gapped:** `git clone https://github.com/suboss87/fdeops.git && cd fdeops && node bin/install.js`
- **Try without install:** `npx fdeops scan` - day-1 recon (heuristic leads, not findings)
- **Requires:** [Node.js](https://nodejs.org) >= 18 for the CLI and adapters
- **Advanced:** `FDEOPS_ENGAGEMENT` overrides the workspace registry. Full matrix: [docs/install.md](docs/install.md)

</details>

---

## How it works

Three pieces on top of the fieldbook:

- **Session start** - a hook loads where you left off into your AI coding agent's context
- **Session end** - a hook captures what happened back into the fieldbook
- **`@fde`** - routes your situation to a field method; you confirm before memory sticks
- **CLI** - deterministic, offline (`scan`, `debrief`, `prep`, `receipts`, `status`)

fdeops complements repo memory: CLAUDE.md holds how the *code* works; the fieldbook holds how the *engagement* works.

Works with **Claude Code** · **Cursor** · **Copilot** · **Gemini CLI** · **Ollama** · **LM Studio** - any model that reads markdown.

<details>
<summary><strong>Phase verbs</strong> (land → close)</summary>

| Verb | When |
|------|------|
| **land** | First days at a new client - interrogate the brief, map stakeholders, define success |
| **discover** | The brief feels wrong - find the real problem, with evidence from the repo |
| **plan** | Scope agreed - sequence it backwards from success, in PR-sized slices |
| **build** | Ready to write code - declare blast radius, log deliveries as you ship |
| **ship** | Going to production - pre-flight, canary, tested rollback |
| **close** | Engagement ending - handoff doc, retrospective, receipts that survive you |

Overlays for regulated domains (AI, fintech, healthcare, government) activate on signal. Full matrix: [docs/skills.md](docs/skills.md).

</details>

---

## Engagement memory (`.fde/`)

The **fieldbook** - one folder per client, plain markdown you can read, grep, and take with you:

| File | Holds |
|------|-------|
| `context.md` | Where you are - loaded first every session |
| `brief.md` / `success.md` | What they asked for; what "done" means and who signs it off |
| `reality.md` / `terrain.md` | The real problem; the codebase map |
| `stakeholders.md` | Champions, resistance, `[signal:green\|amber\|red]` trust tokens |
| `trust-profile.md` | Sacred data, AI policy, approval chain |
| `decisions.md` / `risks.md` / `delivery.md` | Choices with dates; live risk register; what shipped and its rollback |

Every entry is dated and sourced, so you can defend it in front of skeptical stakeholders. Schema: [docs/schema.md](docs/schema.md).

---

## The CLI

Commands that match **The week** (skill adds judgment on top):

```bash
fde resume                        # TRIAGE + load this workspace's engagement
fde resume --init <client>        # create + bind + git-version .fde/
fde debrief --smart notes.md      # propose routing → --apply to confirm
fde prep "Denise sync"            # walk-in brief from existing memory
fde receipts <term>               # dated search (gap ≠ proof of absence)
fde status                        # sponsor-ready triage (--all for portfolio)
fde scan                          # day-1 recon + ASK ON DAY 1 (works via npx)
```

<details>
<summary><strong>More commands</strong></summary>

```bash
fde triage                        # TRIAGE only (hooks / Cursor entry)
fde debrief notes.md              # prefix router: decision: / risk: / delivery: / contact:
fde doctor                        # lint: stale signals, unset phase, gaps
fde log decision "…"
fde log contact "…" --signal amber
fde dashboard                     # FieldBook HTML (--all for every client)
```

Optional: `export FDEOPS_ENGAGEMENTS_ROOT=~/path/to/engagements` to isolate from `~/fde-engagements`.

Each `.fde/` is a local git repo (no remote, no telemetry) - dated entries carry an author tag; every write commits so receipts are tamper-evident. Worst-of `[signal:...]` per stakeholder drives trust; signals older than 21 days show as stale.

</details>

<p align="center"><img src="media/terminal-demo.svg" alt="fde CLI - status, scan, dashboard" width="720"/></p>

`fde dashboard` (FieldBook) renders the **current** engagement by default. Pass `--all` for every client sorted by trust:

<p align="center"><img width="1336" height="624" alt="fde dashboard FieldBook" src="https://github.com/user-attachments/assets/5683614c-7730-4a3a-860d-185053a377eb" /></p>

---

## Who this is for

| You are... | What fdeops does for you |
|----------|-------------------|
| **Forward Deployed Engineer** | The role this was built for - the full lifecycle, first meeting to final handoff |
| **Consultant or contractor at a client site** | Remembers the engagement so you stop re-explaining it |
| **Solutions architect / engineer** | Methods for the politics as well as the architecture |
| **Agency developer running 3-5 clients** | One `.fde/` per client - details stop blurring |
| **Fractional CTO doing client work** | The fieldbook is your second brain - and your audit trail for billable work |

---

## Your data stays yours

- **Local only.** Pure `git` + file reads - no network calls, no telemetry, no account. Works air-gapped.
- **Plain markdown.** No database, no lock-in.
- **No new data path.** The AI sees client code only when *you* point your agent at it; `<private>`-tagged data never enters the model's context.
- **Nothing enters the record unreviewed.** The model drafts, you confirm (`fde debrief --dry-run` shows the routing first); the hooks record only git facts. Your fieldbook stays yours to defend.
- **Know your sync surface.** `~/fde-engagements` lives in your home directory - your backup and cloud-sync setup now covers client notes. `fde resume --init` warns if the folder sits in a synced path. Read [PRIVACY.md](PRIVACY.md) before your first NDA'd engagement.

Details: [PRIVACY.md](PRIVACY.md) · [SECURITY.md](SECURITY.md)

---

## Principles

- **The artifact is the memory** - producing work and recording it are one action
- **Methods, not autonomy** - each skill tells you what to check; the judgment, the trust, and the consequences stay yours
- **Brief is a hypothesis** - discover before building the wrong thing
- **Evidence on every claim** - these files get defended in front of skeptical clients
- **One customer, one folder** - context never bleeds

---

## Updating

```bash
# Plugin / skills install: re-run the install command from Quickstart
# From a git clone:
cd fdeops && git pull && node bin/install.js
```

---

## Contributing

Built and maintained by **[Subash Natarajan](https://www.linkedin.com/in/subashn/)**. Share your feedback via [Issues](https://github.com/suboss87/fdeops/issues) - see [CONTRIBUTING.md](CONTRIBUTING.md).

[FDE Methodology](FDE-METHODOLOGY.md) - [ATTRIBUTION.md](ATTRIBUTION.md) - [SECURITY.md](SECURITY.md) - [PRIVACY.md](PRIVACY.md) - [Repo layout](docs/REPO_LAYOUT.md) - [Skills matrix](docs/skills.md) - MIT
