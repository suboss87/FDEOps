# fdeops

**Your AI coding agent forgets your client every morning. fdeops remembers.**

[![npm version](https://img.shields.io/npm/v/fdeops)](https://www.npmjs.com/package/fdeops)
[![CI](https://github.com/suboss87/fdeops/actions/workflows/validate.yml/badge.svg)](https://github.com/suboss87/fdeops/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

Built for **Forward Deployed Engineers**. Works for anyone embedded in client work - consultants, agency developers, solutions architects, fractional CTOs.

---

## The problem

You're embedded at a client. Every morning you open your AI coding agent and it has no idea what happened yesterday - so you re-paste last week's context, re-explain the stakeholders, re-state the scope change from Tuesday.

Your agent has memory now, but it's scoped to a **repo**. Client work isn't shaped like a repo:

- One engagement spans four repos, a dozen stakeholders, and decisions made in meetings your agent never saw
- Scope shifts get absorbed silently - five "small" additions later, the timeline slips and nobody remembers agreeing to any of them
- A sponsor will one day ask *"when did we agree to that?"* - and there is no record
- A stakeholder goes quiet in week 3 - you notice in week 6

The context that decides whether an engagement succeeds lives in rooms, chats, and hallway decisions. Nothing writes it down where your tools can use it.

## How fdeops solves it

fdeops adds the missing layer: **memory scoped to the client, not the repo** - plain markdown files at `~/fde-engagements/<client>/.fde/`, written as a side effect of doing the work.

- **Session start** - a hook loads where you left off. Your agent opens with: *"Last session you were on the ingest retry - CTO demo is Friday, Diana's signal went amber."* Zero re-pasting.
- **After every meeting** - paste your raw notes; `fde debrief` routes decisions, risks, deliveries, and stakeholder signals to the right files, dated, deterministically. The meeting is in the record before it evaporates.
- **Session end** - a hook snapshots the state. Tomorrow starts where today ended.
- **When the scope dispute lands** - `fde receipts "reconciliation"` answers with dates, from your own files. And when there's no record: *"if it was agreed, it was never logged. That is itself the answer."* For billable work, a dated, local audit trail is not a nice-to-have.
- **On top of the memory** - one `@fde` skill routes your agent to field methods for every phase of the engagement: landing, discovery, planning, building, shipping, closing.

It works *with* your agent's native repo memory - CLAUDE.md still holds how the code works; the fieldbook holds how the *engagement* works.

## Without fdeops vs with fdeops

| | **Without fdeops** | **With fdeops** |
|---|-------------------|----------------|
| **Monday morning** | Re-paste last week's context, explain the stakeholders again | Agent opens with "last session you were on the ingest retry - CTO demo is Friday" |
| **After a meeting** | Notes rot in a scratch file | `fde debrief` routes decisions, risks, and signals into the record, dated |
| **Scope creep** | Five "small" additions absorbed silently, timeline slips | Receipts timestamped - you walk into the sponsor meeting with evidence |
| **Quiet stakeholder** | You notice three weeks too late | `[signal:amber]` logged the day it happened; portfolio triage surfaces it |
| **Multiple clients** | Wrong client name in a status update, details blur | One folder per client, never cross-contaminated |
| **The sponsor meeting** | "We completed the API endpoint" | "Manual reconciliation dropped from 3 FTEs to 0.5 - here's the rollback if it turns" |

---

## See it work in 30 seconds

The memory pays off over an engagement. This part you can test right now - no install, no config, no account, on any repo you're allowed to read:

```bash
npx fdeops scan
```

`scan` is day-1 recon of an unfamiliar codebase: pure `git` and file reads, no AI, no network. It maps the terrain - what changes most, what has no tests, where the last attempt failed - and ends with the questions the brief never mentions:

```text
FDE RECON - acme-payments-api
============================================================
HOTSPOTS (churn 90d × test coverage) - handle with care:
   31 commits/90d  src/billing/invoice.ts  ⚠ NO TEST NEIGHBOR

"TEMPORARY" ARCHAEOLOGY (permanent code with an excuse):
  src/sync/replay.ts:88  // HACK: double-retry, remove after Q3 migration

PREVIOUS ATTEMPTS (ask who ran these, and what happened):
  git: 9f31c2a revert: roll back invoice rewrite (#482)

ASK ON DAY 1
  1. invoice.ts changes 31×/quarter with no test neighbor - who owns billing, and what broke last time?
  2. The invoice rewrite was reverted (#482) - who ran it, and why did it turn back?
------------------------------------------------------------
Facts only - interpretation is the FDE's (or @fde's) job.
```

*(sample output, trimmed - your repo produces your findings)*

If the scan is useful on day 1, the memory is what makes day 30 start like day 1.

<p align="center"><img src="media/terminal-demo.svg" alt="fde CLI - status, scan, dashboard" width="720"/></p>

---

## Quickstart

Three steps. No environment variables.

**1. Install** (Claude Code)

```text
/plugin marketplace add suboss87/fdeops
/plugin install fdeops@fdeops
```

**2. Bind your client workspace** - the one setup command:

```bash
fde resume --init acme        # run once, inside the client's workspace
```

fdeops' `--init` creates the engagement memory at `~/fde-engagements/acme/.fde/` (12 plain-markdown files, private to your machine) and binds this workspace to it. That's the whole setup - the hooks read the binding from the workspace registry, so auto-load at session start and auto-capture at session end just work.

**3. Work**

```text
@fde I just got the brief. New client, payments platform, 3-week timeline.
```

Describe what's happening; the agent routes to the right method, does the work, and the memory writes itself. Full workflow: [docs/USAGE.md](docs/USAGE.md).

<details>
<summary><strong>Other install paths</strong> - Cursor, Codex, Copilot, Gemini CLI, local LLMs, air-gapped</summary>

- **Cursor / Codex / Copilot / Gemini CLI:** `npx fdeops adapters .` drops a thin pointer file for your tool at the same `@fde` skill. Details: [adapters/](adapters/README.md)
- **Local LLMs (Ollama, LM Studio, llama.cpp):** load `skills/fde/SKILL.md` as the system prompt - [guide](adapters/LOCAL-LLM.md)
- **Skills CLI:** `npx skills add suboss87/fdeops`
- **Manual / air-gapped:** `git clone https://github.com/suboss87/fdeops.git && cd fdeops && node bin/install.js`
- **Requires:** [Node.js](https://nodejs.org) >= 18 for the CLI and adapters. The Claude Code plugin install does not need Node separately.
- **Advanced:** the `FDEOPS_ENGAGEMENT` env var overrides the workspace registry - only for unusual setups (shared machines, one workspace serving several clients). You do not need it. Full matrix: [docs/install.md](docs/install.md)

</details>

---

## How it works

1. **Describe** your situation - "new client", "just out of a meeting", "production is down", "need a board update"
2. **Route** - the `@fde` skill picks the right field method across six domains
3. **Confirm and execute** - the agent states its understanding, probes only where it matters, generates a spec before building, then runs the method and writes the artifact
4. **Compound** - the artifact IS the memory; the next session starts where this one ended

| Verb | When | What you get |
|------|------|--------------|
| **land** | First days at a new client | Brief interrogated, stakeholders mapped, success defined before code |
| **discover** | The brief feels wrong | The real problem, with evidence from the repo and the workarounds |
| **plan** | Scope agreed, needs sequencing | Backwards-from-success plan in PR-sized slices |
| **build** | Ready to write code | Blast radius declared, legacy characterised, delivery logged as you ship |
| **ship** | Going to production | Pre-flight, canary, tested rollback |
| **close** | Engagement ending | Handoff doc, retrospective, receipts that survive you |

Each verb heads a family of field methods; overlays for regulated domains (AI, fintech, healthcare, government, exec artifacts) activate automatically on signal. Full matrix: [docs/skills.md](docs/skills.md).

<p align="center"><img width="794" height="571" alt="FieldBook" src="https://github.com/user-attachments/assets/349a223e-0c5e-4300-a8fe-9e3bb042cbbe" />

Works with **Claude Code** - **Cursor** - **Copilot** - **Devin** - **Gemini CLI** - **Ollama** - **LM Studio** - any model that reads a markdown file

---

## Engagement memory (`.fde/`)

Your **fieldbook** - one per client, private to you, plain markdown:

| File | Role | Written by |
|------|------|-----------|
| `context.md` | Where you are; loaded first every session | every phase + session-stop hook + `fde debrief` |
| `brief.md` | What they said - hypothesis until discover | land |
| `success.md` | Done, measured, signed-off by whom | land |
| `reality.md` | The real problem, with evidence | discover / audit |
| `terrain.md` | Codebase map: hotspots, test gaps, AI components, data estate | discover / audit |
| `stakeholders.md` | Champions, resistance, `[signal:green\|amber\|red]` trust tokens | land, `fde log contact`, `fde debrief` |
| `trust-profile.md` | Sacred data, AI policy, approval chain | land + overlays |
| `decisions.md` | Plan + choices + integration contracts + sizing | plan / build / review / `fde debrief` |
| `risks.md` | Live risk register | all phases + `fde debrief` |
| `delivery.md` | What shipped, business value, rollback, adoption metrics | build / ship / `fde debrief` |

Every claim is tagged with its source and date so you can defend it in front of skeptical stakeholders. Schema details: [docs/schema.md](docs/schema.md).

---

## The CLI

Deterministic, offline, zero tokens - the skill adds judgment on top:

```bash
fde scan                          # day-1 recon + ASK ON DAY 1 questions (works via npx, no install)
fde resume                        # load this workspace's engagement (bounded view)
fde resume --init <client>        # THE setup step: create + bind an engagement
fde debrief notes.md              # route meeting notes into memory (also reads stdin)
fde log decision "descope agreed with Dana"
fde log contact "Diana gone quiet" --signal amber
fde receipts <term>               # "what did we agree?" - with dates
fde status                        # portfolio triage across all clients (red > amber > green)
fde dashboard                     # render every engagement into one offline HTML fieldbook
```

`fde debrief` routes lines prefixed `decision:` / `risk:` / `delivery:` / `contact:` to the matching `.fde` file with dates; everything else lands as a dated debrief block in `context.md`. `--signal` writes a `[signal:...]` token - the latest dated token drives the trust column in `status` and `dashboard`, and signals older than 21 days show as stale.

---

## Who this is for

| You are... | What fdeops does for you |
|----------|-------------------|
| **Forward Deployed Engineer** | The role this was built for: the full lifecycle from first meeting to final handoff. |
| **Consultant or contractor at a client site** | Every session, you re-explain context. fdeops remembers for you. |
| **Solutions architect or solutions engineer** | You navigate politics AND architecture. fdeops has methods for both. |
| **Agency developer running 3-5 clients** | Client details blur together. One `.fde/` per client, never cross-contaminated. |
| **Fractional CTO / technical founder doing client work** | You ARE the team. The fieldbook is your second brain - and your audit trail. |

---

## Your data stays yours

- **Local only.** The CLI is `git` + file reads. No network calls, no telemetry, no account. Works fully offline and air-gapped.
- **Plain markdown.** The fieldbook is files you can read, grep, and take with you. No database, no lock-in.
- **No new data path.** The AI only sees client code when *you* point your agent at it - fdeops adds nothing. `<private>`-tagged data never enters the model's context.
- **Receipts for billable work.** Dated decisions, deliveries, and signals in your own files - evidence you can stand behind when the engagement is questioned.

Details: [PRIVACY.md](PRIVACY.md) · [SECURITY.md](SECURITY.md)

---

## Principles

- **The artifact is the memory** - producing work and recording it are one action
- **Trust before production** - earn the right to touch their systems
- **Brief is a hypothesis** - discover before building the wrong thing
- **Evidence on every claim** - these files get defended in front of skeptical clients
- **Map before moving** - unknown terrain gets characterisation tests
- **Thin slices** - ship learning, not theatre
- **One customer, one folder** - context never bleeds

---

## Updating

```bash
cd fdeops && git pull && node bin/install.js
```

---

## Contributing

Built and maintained by **[Subash Natarajan](https://www.linkedin.com/in/subashn/)**. Share your feedback via [Issues](https://github.com/suboss87/fdeops/issues) - see [CONTRIBUTING.md](CONTRIBUTING.md).

[FDE Methodology](FDE-METHODOLOGY.md) - [ATTRIBUTION.md](ATTRIBUTION.md) - [SECURITY.md](SECURITY.md) - [PRIVACY.md](PRIVACY.md) - [Repo layout](docs/REPO_LAYOUT.md) - [Skills matrix](docs/skills.md) - MIT
