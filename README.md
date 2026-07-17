# FDEOps

**Your AI coding agent forgets your client every morning. fdeops remembers.**

[![npm version](https://img.shields.io/npm/v/fdeops)](https://www.npmjs.com/package/fdeops)
[![CI](https://github.com/suboss87/fdeops/actions/workflows/validate.yml/badge.svg)](https://github.com/suboss87/fdeops/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

CLI + one `@fde` skill + hooks over a local `.fde/` fieldbook - one folder per client. Second brain for Forward Deployed Engineers (and consultants, solutions architects, fractional CTOs doing the same work).

---

## The week

| When | What you do |
|------|-------------|
| **Monday** | Open agent → TRIAGE loads (trust, phase, next) |
| **After a meeting** | `fde debrief --smart notes.txt` → review → `--apply` |
| **Before a walk-in** | `fde prep "Denise sync"` |
| **Scope fight** | `fde receipts descope` (+ memory git hash) |
| **Friday** | `fde status` → sponsor update from the real record |

Same engagement folder every time. Git versions `.fde/`. Your AI coding agent reads it on every session.

---

## Quickstart

**1. Install**

```bash
npx skills add suboss87/fdeops
```

Claude Code plugin instead:

```text
/plugin marketplace add suboss87/fdeops
/plugin install fdeops@fdeops
```

**2. Bind** - once, inside the client workspace:

```bash
npx fdeops resume --init garvey   # creates ~/fde-engagements/garvey engagement + binds workspace
```

**3. Work**

```text
@fde I just got the brief. New client, payments platform, they want it live before their Q3 audit.
```

Describe the situation; `@fde` routes and writes `.fde/` artifacts - you confirm judgment. Full workflow: [docs/USAGE.md](docs/USAGE.md).

<details>
<summary><strong>Other install paths</strong> · PATH · try-before-install · env</summary>

- **Bare `fde` on PATH:** `npm i -g fdeops` (`npx fdeops …` works with nothing installed)
- **Cursor / Codex / Copilot / Gemini CLI:** `npx fdeops adapters .` - [adapters/](adapters/README.md)
- **Local LLMs:** load `skills/fde/SKILL.md` as system prompt - [guide](adapters/LOCAL-LLM.md)
- **Manual / air-gapped:** `git clone https://github.com/suboss87/fdeops.git && cd fdeops && node bin/install.js`
- **Try without install:** `npx fdeops scan` - day-1 recon (heuristic leads, not findings)
- **Requires:** [Node.js](https://nodejs.org) >= 18 for CLI/adapters
- **Advanced:** `FDEOPS_ENGAGEMENT` overrides the workspace registry. Full matrix: [docs/install.md](docs/install.md)

</details>

---

## Why

Repo memory is scoped to a **repo**. Client work spans repos, stakeholders, and meetings your agent never saw. fdeops adds memory scoped to the **client** - plain markdown at `~/fde-engagements/<client>/.fde/`. Local only, no network, no telemetry.

---

## How it works

Three pieces on top of the fieldbook:

- **Session start** - a hook loads where you left off into your AI coding agent's context
- **Session end** - a hook captures what happened back into the fieldbook
- **`@fde`** - one skill that routes your situation to a field method and writes the matching `.fde/` artifact
- **CLI** - deterministic, offline (`scan`, `debrief`, `prep`, `receipts`, `status`) - judgment stays in the skill

fdeops complements repo memory: CLAUDE.md holds how the *code* works; the fieldbook holds how the *engagement* works.

Works with **Claude Code** · **Cursor** · **Copilot** · **Gemini CLI** · **Ollama** · **LM Studio** - any model that reads markdown.

<details>
<summary><strong>Lifecycle methods</strong> (land → close)</summary>

```
  land      discover      plan      build      ship      close
    |           |           |         |          |         |
    +-----------+-----------+---------+----------+---------+
          the fieldbook (.fde/) - one per engagement
```

| Verb | When |
|------|------|
| **land** | First days - interrogate the brief, map stakeholders, define success |
| **discover** | Brief feels wrong - find the real problem with repo evidence |
| **plan** | Scope agreed - sequence backwards from success, PR-sized slices |
| **build** | Ready to write code - blast radius, log deliveries as you ship |
| **ship** | Production - pre-flight, canary, tested rollback |
| **close** | Engagement ending - handoff, retrospective, receipts that survive you |

Overlays (AI, fintech, healthcare, government) activate on signal. Full matrix: [docs/skills.md](docs/skills.md).

</details>

---

## Engagement memory (`.fde/`)

One folder per client, plain markdown you can read, grep, and take with you. Each `.fde/` is a local git repo - writes commit so receipts are tamper-evident; you confirm before messy notes land (`debrief --smart` → `--apply`).

| File | Holds |
|------|-------|
| `context.md` | Where you are - loaded first every session |
| `brief.md` / `success.md` | What they asked for; what "done" means and who signs off |
| `reality.md` / `terrain.md` | The real problem; the codebase map |
| `stakeholders.md` | Champions, resistance, `[signal:green\|amber\|red]` trust tokens |
| `trust-profile.md` | Sacred data, AI policy, approval chain |
| `decisions.md` / `risks.md` / `delivery.md` | Choices with dates; live risks; what shipped + rollback |

Schema: [docs/schema.md](docs/schema.md).

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

</details>

<p align="center"><img width="1336" height="624" alt="fde dashboard FieldBook" src="https://github.com/user-attachments/assets/5683614c-7730-4a3a-860d-185053a377eb" /></p>

---

## Who this is for

| You are... | What fdeops does for you |
|----------|-------------------|
| **Forward Deployed Engineer** | Full lifecycle, first meeting to final handoff |
| **Consultant or contractor at a client site** | Remembers the engagement so you stop re-explaining it |
| **Solutions architect / engineer** | Methods for the politics as well as the architecture |
| **Agency developer running 3-5 clients** | One `.fde/` per client - details stop blurring |
| **Fractional CTO doing client work** | Second brain + audit trail for billable work |

---

## Your data stays yours

- **Local only.** Pure `git` + file reads - no network, no telemetry, no account. Works air-gapped.
- **Plain markdown.** No database, no lock-in.
- **No new data path.** The AI sees client code only when *you* point your agent at it; `<private>`-tagged data never enters the model's context.
- **Nothing enters the record unreviewed.** The model drafts, you confirm; hooks record only git facts.
- **Know your sync surface.** `~/fde-engagements` is in your home directory - backups/cloud sync cover client notes. `fde resume --init` warns if that path is synced. Read [PRIVACY.md](PRIVACY.md) before an NDA'd engagement.

Details: [PRIVACY.md](PRIVACY.md) · [SECURITY.md](SECURITY.md)

---

## Principles

- **The artifact is the memory** - producing work and recording it are one action
- **Methods, not autonomy** - judgment, trust, and consequences stay yours
- **Brief is a hypothesis** - discover before building the wrong thing
- **Evidence on every claim** - these files get defended in front of skeptical clients
- **One customer, one folder** - context never bleeds

---

## Updating

```bash
cd fdeops && git pull && node bin/install.js
```

---

## Contributing

Built and maintained by **[Subash Natarajan](https://www.linkedin.com/in/subashn/)**. Feedback via [Issues](https://github.com/suboss87/fdeops/issues) - see [CONTRIBUTING.md](CONTRIBUTING.md).

[FDE Methodology](FDE-METHODOLOGY.md) · [ATTRIBUTION.md](ATTRIBUTION.md) · [SECURITY.md](SECURITY.md) · [PRIVACY.md](PRIVACY.md) · [Repo layout](docs/REPO_LAYOUT.md) · [Skills matrix](docs/skills.md) · MIT
