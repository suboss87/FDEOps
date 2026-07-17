# FDEOps

**Your AI coding agent forgets your client every morning. fdeops remembers.**

[![npm version](https://img.shields.io/npm/v/fdeops)](https://www.npmjs.com/package/fdeops)
[![CI](https://github.com/suboss87/fdeops/actions/workflows/validate.yml/badge.svg)](https://github.com/suboss87/fdeops/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

One `@fde` skill over a local client notebook (the **fieldbook** under `.fde/`) - one folder per client. The **second brain for Forward Deployed Engineers** - engineers embedded at a client, from first meeting to final handoff. Works the same for consultants, agency developers, solutions architects, and fractional CTOs.

```
  land      discover      plan      build      ship      close
    |           |           |         |          |         |
    +-----------+-----------+---------+----------+---------+
          the fieldbook (.fde/) - one per engagement
             written as a side effect of the work
```

**You talk in plain language with `@fde`.** The agent (and an optional CLI) handles the boring memory work. You still confirm anything that goes into the record.

---

## The week

Day to day you only need `@fde` and normal English. No command cheat sheet.

| When | What you say | What you get |
|------|--------------|--------------|
| **Start of week** | Open your AI coding agent (nothing to paste) | It already knows where you left off - trust, phase, what's next |
| **After a meeting** | `@fde` debrief these notes *(paste or attach them)* | Proposed updates to the record - you review, then confirm |
| **Before a stakeholder meeting** | `@fde` prep me for tomorrow's meeting with the sponsor | A short brief from what you already logged - not a blank chat |
| **Someone disputes scope** | `@fde` when did we agree to drop that feature? | Dated answers from the record (or a clear gap if nothing was logged) |
| **End of week** | `@fde` draft the sponsor update from the record | Status grounded in what actually happened |

Same client folder every time (`~/fde-engagements/<client>/.fde/`). Your AI coding agent reads it on every session. Optional terminal tools live under [Under the hood](#under-the-hood-optional).

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

**2. Bind once** - inside the client workspace (setup only; not a daily habit):

```bash
npx fdeops resume --init garvey   # creates ~/fde-engagements/garvey engagement + binds workspace
```

**Check it worked:**

```bash
npx fdeops resume                 # prints a short "where we are" for this client
```

**3. Work** - talk normally:

```text
@fde I just got the brief. New client, payments platform, they want it live before their Q3 audit.
```

`@fde` routes and updates the fieldbook - you confirm judgment. Full workflow: [docs/USAGE.md](docs/USAGE.md).

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

- **You** describe the situation with `@fde` (or plain language once the skill is loaded)
- **Session start / end** - small hooks load where you left off and capture what changed (no re-paste)
- **Under the hood** - a local CLI does memory writes, search, and status with no model tokens; you do not need to learn it for daily use

fdeops complements repo memory: CLAUDE.md holds how the *code* works; the fieldbook holds how the *client engagement* works.

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

## Under the hood (optional)

**You do not need to learn these for daily work.** Chat with `@fde`; the agent runs the local tools. The list below is for setup, air-gap, or if you prefer the terminal.

**Humans only need (once / occasional):**

```bash
npx fdeops resume --init <client>   # one-time: create + bind this workspace
npx fdeops resume                   # check "where we are"
npx fdeops scan                     # try day-1 recon with no install
npx fdeops dashboard                # optional local HTML view of the fieldbook
```

**What you say → what the agent runs** (you never have to type the right-hand side):

| You say | Agent runs |
|---------|------------|
| Debrief these notes | `fde debrief --smart …` → you confirm → `--apply` |
| Prep me for the sponsor meeting | `fde prep "…"` |
| When did we agree to drop that? | `fde receipts …` |
| Draft the sponsor update | `fde status` (+ judgment in chat) |
| Log that the sponsor went quiet | `fde log contact "…" --signal amber` |

<details>
<summary><strong>Full command list</strong> (power users / scripts)</summary>

```bash
fde triage                        # short status (also injected by session hooks)
fde debrief notes.md              # if notes already use decision: / risk: / … prefixes
fde doctor                        # check the fieldbook for gaps
fde log decision "…"
fde log contact "…" --signal amber
fde dashboard --all               # every client, sorted by trust
```

Optional: `export FDEOPS_ENGAGEMENTS_ROOT=~/path/to/engagements` to isolate from `~/fde-engagements`.

Each `.fde/` is a local git repo (no remote, no telemetry). More detail: [docs/USAGE.md](docs/USAGE.md).

</details>

<p align="center"><img src="media/terminal-demo.svg" alt="fde CLI - status, scan, dashboard" width="720"/></p>

Optional FieldBook view (`fde dashboard`) - current engagement by default:

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
