# FDEOps

**Your AI coding agent forgets your client every morning. FDEOps remembers.**

[![npm version](https://img.shields.io/npm/v/fdeops.svg)](https://www.npmjs.com/package/fdeops)
[![CI](https://github.com/suboss87/fdeops/actions/workflows/validate.yml/badge.svg)](https://github.com/suboss87/fdeops/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

Skill packs teach your AI coding agent how to *build*. None of them remember who the client is, what you promised, or who agreed it was delivered. FDEOps adds that layer: a private fieldbook per engagement (`.fde/`), a field methodology from land to close, and one `@fde` skill that routes it.

Built for Forward Deployed Engineers and anyone embedded in client work - consultants, agency developers, solutions architects, fractional CTOs. Feels like a second brain; behaves like a defensible record: dated, sourced, on your laptop.

```
  land      discover      plan      build      ship      close
    |           |           |         |          |         |
    +-----------+-----------+---------+----------+---------+
          the fieldbook (.fde/) - one per engagement
             written as a side effect of the work
```

---

## A real session

Kickoff notes go in messy. You confirm what enters the record. A cold session the next morning already knows the client, the sponsor brief is grounded in dated facts, and the receipts survive the argument. Real CLI output - only the typing pace is staged, and you can [re-record it yourself](media/record-session.sh).

<p align="center"><img alt="A real fdeops session: messy kickoff notes routed into dated memory after you confirm, then a cold session that already knows the client, a grounded sponsor-meeting brief, and dated receipts" src="media/session.gif" width="900" /></p>

Nothing to install to see it on a fake client: `npx fdeops demo`.

---

## Quickstart

**1. Install** on your machine - never in the customer's repo.

```text
/plugin marketplace add suboss87/fdeops
/plugin install fdeops@fdeops
```

```bash
npx skills add suboss87/fdeops --skill fde   # Cursor, Codex, skills-compatible hosts
```

That is one skill, not a catalogue - `@fde` routes the whole method. The CLI needs no install either: the skill reaches for `npx fdeops` when `fde` is not on the PATH. (Drop `--skill fde` and you also get `testing-fieldbook`, which is for people contributing to this repo, not for field work.)

Claude Code additionally gets session hooks, so context arrives before you type. Everywhere else it is the same fieldbook, loaded when you ask.

**2. Bind once** in the client workspace:

```bash
npx fdeops resume --init garvey   # ~/fde-engagements/garvey + bind this checkout
npx fdeops resume                 # where we are
```

**3. Work** in plain language:

```text
@fde New client. Payments platform. They want it live before the Q3 audit.
```

**It is working if** `npx fdeops resume` prints this client's phase, trust signal, and next action - and prints the same thing tomorrow, from a new session, with no explaining. Full workflow: [docs/USAGE.md](docs/USAGE.md).

<details>
<summary>Other install paths · scan · env</summary>

- **Adapters:** `npx fdeops adapters .` - [adapters/](adapters/README.md)
- **Local LLMs:** load `skills/fde/SKILL.md` - [guide](adapters/LOCAL-LLM.md)
- **Air-gapped:** `git clone https://github.com/suboss87/fdeops.git && cd fdeops && node bin/install.js`
- **No install:** `npx fdeops demo` · `npx fdeops scan` (heuristic recon, not findings)
- **Requires:** Node.js >= 18
- **Override:** `FDEOPS_ENGAGEMENT` - [docs/install.md](docs/install.md)

</details>

---

## The week

`@fde` plus English. No cheat sheet.

| When | What you say | What you get |
|------|--------------|--------------|
| **Start of week** | `@fde` - or just open Claude Code | Fieldbook on disk either way. **Claude Code** injects trust, phase, next before you type. **Cursor / Codex / others:** say `@fde` or `resume` - nothing auto-loads. |
| **After a meeting** | `@fde` debrief these notes *(paste or attach)* | Proposed updates. You review, then confirm. |
| **Optional: pull** | `@fde` connect Granola *(once)* · `@fde` pull today's Acme transcript | You add that source MCP. We **pull** on request - no push, no sync. [mcp/recipes/](mcp/recipes/) |
| **Before a stakeholder meeting** | `@fde` prep me for tomorrow with the sponsor | Brief from what you already logged. |
| **Scope dispute** | `@fde` when did we agree to drop that? | Dated answers, or a clear gap. |
| **End of week** | `@fde` draft the sponsor update from the record | Status grounded in what happened. |

Same folder every time: `~/fde-engagements/<client>/.fde/`.

---

## How it works

- **You** describe the situation with `@fde`, in plain language.
- **The AI coding agent** routes to a method, does the work, and drafts the memory.
- **The CLI** (`bin/fde.js`) does every write, receipt, and status check - git and file reads only, no network, no model tokens. You do not live in the CLI; your agent runs it. [docs/USAGE.md](docs/USAGE.md)
- **You confirm.** Nothing enters the record unreviewed; `fde debrief --dry-run` shows the routing first.

`CLAUDE.md` is how the *code* works. The fieldbook is how the *engagement* works. It lives at `~/fde-engagements/<client>/.fde/`, not inside any vendor - change hosts, install `@fde` on the new one, keep talking.

### What works where

Honest boundaries, so nothing here needs a footnote:

| | Claude Code | Cursor · Codex · Copilot · Gemini · local LLMs |
|---|---|---|
| Fieldbook, methods, CLI, dashboard | yes | yes |
| Context loaded before you type | session hooks | you say `@fde` / `resume` |
| Snapshot on session end | session hooks | `@fde` capture, or `fde capture` |
| Pull from Granola / Slack / Notion | you add that source MCP; FDEOps only ingests | same |

FDEOps is the sink, never the source: no push, no sync, no third-party tokens in `.fde/`. [mcp/recipes/](mcp/recipes/)

<details>
<summary>Phase verbs (land → close)</summary>

| Verb | When |
|------|------|
| **land** | First days - brief, stakeholders, success |
| **discover** | The brief is wrong - evidence from the repo |
| **plan** | Sequence backwards from done, PR-sized |
| **build** | Blast radius, log what shipped |
| **ship** | Pre-flight, canary, rollback |
| **close** | Handoff, retro, receipts that survive you |

Overlays (AI, fintech, healthcare, gov) fire on signal. [docs/skills.md](docs/skills.md)

</details>

---

## Engagement memory (`.fde/`)

One folder per client. Plain markdown, so you can grep it, diff it, copy it into a readout, and defend it in a room.

| File | Holds |
|------|-------|
| `context.md` | Where you are |
| `brief.md` / `success.md` | What they asked; what "done" is and who signs |
| `reality.md` / `terrain.md` | The real problem; the map |
| `stakeholders.md` | `[signal:green\|amber\|red]` |
| `trust-profile.md` | Sacred data, AI policy, approval chain |
| `decisions.md` / `risks.md` / `delivery.md` | Dated choices; live risks; what shipped and how it rolls back |

A day-one fieldbook ships **empty** - headings and allowed values, no invented rows - so anything you read in it is something that actually happened. Schema: [docs/schema.md](docs/schema.md).

---

## The field methods

You never pick one. You describe the situation and `@fde` routes. **37 methods** across six domains, each a method - thinking, artifact, checkpoint - not a tip sheet. [docs/skills.md](docs/skills.md) · [docs/skills-reference.md](docs/skills-reference.md)

<details>
<summary>All 37 methods</summary>

| Domain | Methods |
|--------|---------|
| **1. Embed & Trust** | [land](skills/fde/references/land.md) · [audit](skills/fde/references/audit.md) · [stakeholder-radar](skills/fde/references/stakeholder-radar.md) · [trust-engineering](skills/fde/references/trust-engineering.md) · [scope-defense](skills/fde/references/scope-defense.md) |
| **2. Discover & Diagnose** | [discover](skills/fde/references/discover.md) · [assumption-audit](skills/fde/references/assumption-audit.md) · [use-case-scoring](skills/fde/references/use-case-scoring.md) · [sketch](skills/fde/references/sketch.md) |
| **3. Plan & Align** | [plan](skills/fde/references/plan.md) · [business-case](skills/fde/references/business-case.md) · [options-analysis](skills/fde/references/options-analysis.md) · [initiative-triage](skills/fde/references/initiative-triage.md) |
| **4. Build & Guard** | [build](skills/fde/references/build.md) · [incremental-build](skills/fde/references/incremental-build.md) · [test-on-legacy](skills/fde/references/test-on-legacy.md) · [blast-radius](skills/fde/references/blast-radius.md) · [debug](skills/fde/references/debug.md) · [rescue](skills/fde/references/rescue.md) · [security-audit](skills/fde/references/security-audit.md) · [observability](skills/fde/references/observability.md) |
| **5. Ship & Verify** | [ship](skills/fde/references/ship.md) · [review](skills/fde/references/review.md) · [rollback-drill](skills/fde/references/rollback-drill.md) · [qa-live](skills/fde/references/qa-live.md) |
| **6. Operate & Close** | [status](skills/fde/references/status.md) · [demo-prep](skills/fde/references/demo-prep.md) · [debrief](skills/fde/references/debrief.md) · [exec-narrative](skills/fde/references/exec-narrative.md) · [dashboard](skills/fde/references/dashboard.md) · [multi-customer-ops](skills/fde/references/multi-customer-ops.md) · [close](skills/fde/references/close.md) · [handoff-engineering](skills/fde/references/handoff-engineering.md) · [pattern-extract](skills/fde/references/pattern-extract.md) · [red-team](skills/fde/references/red-team.md) · [ingest](skills/fde/references/ingest.md) · [ingest-connect](skills/fde/references/ingest-connect.md) |

Overlays: [ai](skills/fde/references/ai.md) · [artifacts](skills/fde/references/artifacts.md) · [fintech](skills/fde/references/fintech.md) · [healthcare](skills/fde/references/healthcare.md) · [gov](skills/fde/references/gov.md)

</details>

---

## Fieldbook UI

`@fde` dashboard, or `npx fdeops dashboard` (`--all` for the portfolio): one local HTML file - trust, phase, next action, and the record behind them. Generated on demand, no server.

<p align="center"><img width="1336" height="624" alt="The fdeops Fieldbook dashboard: engagements with trust signal, phase and next action" src="https://github.com/user-attachments/assets/5683614c-7730-4a3a-860d-185053a377eb" /></p>

---

## Who this is for

| You are | What this is |
|---------|----------------|
| **Forward Deployed Engineer** | The job this was built for - first meeting through handoff |
| **Consultant / contractor on site** | The engagement stops resetting every morning |
| **Solutions architect** | Politics and architecture in the same record |
| **Agency, 3-5 clients** | One `.fde/` each - they stop blurring |
| **Fractional CTO on client work** | System of record for the embed, and the billable trail |

---

## Your data stays yours

- **Local only.** `git` + files. No network, no telemetry, no account. Air-gapped is fine.
- **Plain markdown.** No database, no lock-in, nothing to export.
- **No new data path.** The model sees client code only when you point the AI coding agent at it. `<private>` blocks are redacted from CLI, dashboard, and hook output - do not open raw private blocks with file tools.
- **Know the sync surface.** `~/fde-engagements` lives in `$HOME`. iCloud or Dropbox is an NDA incident waiting; `resume --init` warns you.

[PRIVACY.md](PRIVACY.md) before the first NDA · [SECURITY.md](SECURITY.md)

---

## Principles

- **The artifact is the memory** - producing the work and recording it are one action
- **Methods, not autonomy** - the kit says what to check; judgment stays yours
- **Brief is a hypothesis** - discover before building the wrong thing
- **Evidence on every claim** - these files get defended in the room
- **One customer, one folder** - context never bleeds

---

## Updating

Re-run the Quickstart install, or from a clone: `git pull && node bin/install.js`

---

## Contributing

**[Subash Natarajan](https://www.linkedin.com/in/subashn/)**. [Issues](https://github.com/suboss87/fdeops/issues) · [CONTRIBUTING.md](CONTRIBUTING.md)

Thanks to builders whose craft sharpened the thinking, among them [Andrej Karpathy](https://karpathy.ai/)'s engineering guidelines and the [agentic engineering workflow](https://github.com/pawel-cell/micky-podcast-agentic-engineering) notes from David Ondrej / Michael Shimeles.

**What we won't build:** SaaS sync; Slack/Notion/Granola connectors or **push** inside the CLI; CRM as core; hardware capture; generic code-craft packs (TDD and review live elsewhere). You may **pull** via *your* MCP. The `fde` CLI stays local-only.

[FDE Methodology](FDE-METHODOLOGY.md) · [SECURITY.md](SECURITY.md) · [PRIVACY.md](PRIVACY.md) · [Repo layout](docs/REPO_LAYOUT.md) · [Skills matrix](docs/skills.md) · MIT
