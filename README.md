# FDEOps

**Forward deployed engineering skills for AI coding agents.**

Skills encode the workflows, quality gates, and judgment Forward Deployed Engineers use on someone else's site. Packaged so an AI coding agent follows them consistently — and writes a dated record you can defend. The host agent still writes the TypeScript.

[![npm version](https://img.shields.io/npm/v/fdeops.svg)](https://www.npmjs.com/package/fdeops)
[![CI](https://github.com/suboss87/fdeops/actions/workflows/validate.yml/badge.svg)](https://github.com/suboss87/fdeops/actions)
[![skills.sh](https://skills.sh/b/suboss87/fdeops)](https://skills.sh/suboss87/fdeops)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

<p align="center"><img alt="A real fdeops session: messy kickoff notes routed into dated memory after you confirm, then a cold session that already knows the client, a grounded sponsor-meeting brief, and dated receipts" src="media/session.gif" width="900" /></p>

```text
  LAND              DISCOVER           PLAN              SHIP               PROVE              CLOSE
 ┌────────┐      ┌────────┐      ┌────────┐      ┌────────┐      ┌────────┐      ┌────────┐
 │  Brief │ ───▶ │ Reality│ ───▶ │ Sequence│───▶ │  Live  │ ───▶ │ Signed │ ───▶ │  They  │
 │  Trust │      │ Terrain│      │  Align │      │  slice │      │   off  │      │   run  │
 └────────┘      └────────┘      └────────┘      └────────┘      └────────┘      └────────┘
  /brief           /discover          /plan             /ship              /got              /close
```

---

## Commands

The embed, left to right. Each command loads `@fde` and runs that stage. One skill; you never pick a method.

| What you're doing | Command | Principle |
|-------------------|---------|-----------|
| Land the embed | `/brief` | Brief and trust before code |
| Find the real problem | `/discover` | Brief is a hypothesis |
| Plan the sequence | `/plan` | Backwards from done |
| Ship a slice | `/ship` | Pre-flight, then live |
| Prove what they got | `/got` | Promised → measured → accepted |
| Close the embed | `/close` | They can run it without you |
| After a meeting | `/debrief` | Proposed updates. You confirm. |
| Walk-in tomorrow | `/prep` | From the record, nothing invented |

Also: `/quiet` (sponsor went silent) · `/agreed` (scope dispute) · `/status` (Friday readout).

`@fde` plus English activates the same skill automatically. Ordinary TypeScript, unit tests, and git commits stay in the host agent.

---

## Quick Start

**30-second setup.** Pick one. Both copy `@fde`. Installing both leaves you with the skill twice.

**Fastest path — any agent, one command:**

```bash
npx skills add suboss87/fdeops --skill fde
```

Claude Code (hooks before you type; slash commands on the map above):

```text
/plugin marketplace add suboss87/fdeops
/plugin install fdeops@fdeops
```

**Then one chat.** Name the client. The AI coding agent binds. You never type the CLI.

```text
@fde this is Acme
```

Paste kickoff notes in the same thread. `@fde` routes; you confirm judgment. Same folder every time: `~/fde-engagements/<client>/.fde/`. Workflow: [docs/USAGE.md](docs/USAGE.md).

<details>
<summary>Terminal bind · other hosts · env</summary>

Fallback if the agent cannot bind:

```bash
npx fdeops resume --init acme   # ~/fde-engagements/acme + bind this checkout
npx fdeops resume               # where we are
```

- **Adapters** (Cursor rules, Gemini, Copilot): `npx fdeops adapters .` — [adapters/](adapters/README.md)
- **Local LLMs:** load `skills/fde/SKILL.md` — [guide](adapters/LOCAL-LLM.md)
- **Air-gapped:** `git clone https://github.com/suboss87/fdeops.git && cd fdeops && node bin/install.js`
- **No install:** `npx fdeops demo` · `npx fdeops scan` (heuristic recon, not findings)
- **Requires:** Node.js >= 18
- **Override:** `FDEOPS_ENGAGEMENT` — [docs/install.md](docs/install.md)

</details>

---

## Why this exists

### 1. The brief is wrong

The most common failure on an embed is building the portal they asked for. Ops has been running a spreadsheet for two years. `/brief` then `/discover` — who in their company would have to agree it worked?

### 2. They went quiet

A sponsor who stops answering is not a Jira gap. It is a trust color. `/quiet` — process vs trust, then a dated signal in the record.

### 3. When did we agree?

Arguments from memory lose. `/agreed` searches dated receipts. No hit is a gap, not proof.

### 4. What did they get?

A number only you agree with is claimed, not delivered. `/got` reads promised → measured → accepted out loud.

---

## See it

```bash
npx fdeops demo
```

Real commands on a fake client. Nothing of yours is read. Lives in `~/fde-engagements/.demo/`. Remove with `npx fdeops demo --clean`. Re-record the session gif: [`media/record-session.sh`](media/record-session.sh).

Two things a chat window cannot do: **nothing is written until you confirm**, and `<private>` lands sealed as `(private - redacted)`.

---

## All methods

The commands above are entry points. One `@fde` skill routes; you never pick a method by name. **31 methods**, six stages. Each is thinking + artifact + checkpoint — not a tip sheet. Full detail: [docs/skills-reference.md](docs/skills-reference.md).

### Land

| Method | What it does | Use when |
|--------|--------------|----------|
| [land](skills/fde/references/land.md) | Interrogate the brief, map stakeholders, define success | New client, first meeting, just got the brief |
| [audit](skills/fde/references/audit.md) | Verify claims, find the load-bearing wall | Taking over, previous consultant left |
| [stakeholder-radar](skills/fde/references/stakeholder-radar.md) | Who decides, who blocks, who escalates | Need to know who matters |
| [trust-engineering](skills/fde/references/trust-engineering.md) | Observer → trusted; navigate AI policy | Need access or credibility |
| [scope-defense](skills/fde/references/scope-defense.md) | Scope receipts; the accumulation conversation | "Also can you…", timeline unchanged |

### Discover

| Method | What it does | Use when |
|--------|--------------|----------|
| [discover](skills/fde/references/discover.md) | Repo + workaround + the real problem | Brief feels wrong, shadow processes |
| [assumption-audit](skills/fde/references/assumption-audit.md) | Untested assumptions by blast radius | Brief feels too neat |
| [use-case-scoring](skills/fde/references/use-case-scoring.md) | Value × urgency × alignment / complexity | Everything is P0 |
| [sketch](skills/fde/references/sketch.md) | Kill the killer assumption in a day | Need to de-risk a direction |

### Plan

| Method | What it does | Use when |
|--------|--------------|----------|
| [plan](skills/fde/references/plan.md) | Backwards from done, PR-sized | What order, what is done |
| [business-case](skills/fde/references/business-case.md) | Cost of nothing → investment → return | Defend budget or timeline |
| [options-analysis](skills/fde/references/options-analysis.md) | Three genuine options | "What should we do?" |
| [initiative-triage](skills/fde/references/initiative-triage.md) | Pick three from twenty urgents | Everything is urgent |

### Ship

| Method | What it does | Use when |
|--------|--------------|----------|
| [incremental-build](skills/fde/references/incremental-build.md) | Vertical slices, visible every 2–3 days | Large feature on their codebase |
| [blast-radius](skills/fde/references/blast-radius.md) | Impact from contained → irreversible | Touching shared infrastructure |
| [rescue](skills/fde/references/rescue.md) | Production fire or trust fire | Down, or they went quiet |
| [ship](skills/fde/references/ship.md) | Intent vs diff, pre-flight, rollback | Going live |
| [review](skills/fde/references/review.md) | Did we only build what we agreed | Before merge, scope creep |
| [rollback-drill](skills/fde/references/rollback-drill.md) | Test the escape route before 2am | "We can always revert" |

### Prove

| Method | What it does | Use when |
|--------|--------------|----------|
| [status](skills/fde/references/status.md) | Promised → measured → accepted | Friday, sponsor update |
| [demo-prep](skills/fde/references/demo-prep.md) | One number, five hard questions | Demo or exec walkthrough |
| [debrief](skills/fde/references/debrief.md) | Meeting notes into the record | Just left a meeting |
| [exec-narrative](skills/fde/references/exec-narrative.md) | Board / sponsor's boss | Justify continued investment |
| [dashboard](skills/fde/references/dashboard.md) | Portfolio, trust-ordered | All my customers |
| [ingest](skills/fde/references/ingest.md) | Pull text you confirm | Transcript, Notion, Slack |
| [ingest-connect](skills/fde/references/ingest-connect.md) | Wire a source MCP | Connect Granola |

### Close

| Method | What it does | Use when |
|--------|--------------|----------|
| [close](skills/fde/references/close.md) | Handoff that survives you | Wrapping up |
| [handoff-engineering](skills/fde/references/handoff-engineering.md) | Runbook, confidence scoring | They must operate without you |
| [multi-customer-ops](skills/fde/references/multi-customer-ops.md) | Switch without bleed | 2+ clients |
| [pattern-extract](skills/fde/references/pattern-extract.md) | If you did it twice, encode it | It will apply again |
| [red-team](skills/fde/references/red-team.md) | Stress-test before they do | "Poke holes in this" |

Overlays (on signal, not on request): [ai](skills/fde/references/ai.md) · [artifacts](skills/fde/references/artifacts.md) · [fintech](skills/fde/references/fintech.md) · [healthcare](skills/fde/references/healthcare.md) · [gov](skills/fde/references/gov.md) · [eval-pack](skills/fde/references/eval-pack.md)

Optional pull: you add the source MCP; we **pull** on request. [mcp/recipes/](mcp/recipes/)

---

## How it works

```
┌─────────────────────────────────────────┐
│  @fde  (one skill)                      │
│  Commands load it. English loads it.    │
│  You confirm. Then .fde/ is written.    │
└─────────────────────────────────────────┘
         │
         ▼
  references/<method>.md     fde CLI (local)
  one file, then stop        dating, gates, redaction
```

- **You** describe the situation (`@fde` or a slash command). First chat: you name the client; the AI coding agent binds.
- **Hooks (Claude Code)** load where you left off. Elsewhere, say `@fde`.
- **Local CLI** — writes, receipts, status. Zero model tokens. The AI coding agent runs it. [docs/USAGE.md](docs/USAGE.md)

`CLAUDE.md` is how the *code* works. The fieldbook is how the *engagement* works. The record lives at `~/fde-engagements/<client>/.fde/` — not inside any vendor.

**Words used here, once:** *engagement* - one client's body of work, one folder. *Fieldbook* - that folder (`.fde/`), the record itself. *Brief vs reality* - what they said the problem was, and what it turned out to be. *Terrain* - their systems and org as you actually found them. *Trust signal* - green / amber / red on one relationship. *Receipts* - the dated line proving something was agreed. *Vault* - the Obsidian copy `fde vault` generates to read it all in one window.

Change hosts, install `@fde` on the new one, bind if needed, keep talking.

---

## Engagement memory (`.fde/`)

One folder per client. Plain markdown. Grep it, copy it, defend it.

| File | Holds |
|------|-------|
| `context.md` | Where you are |
| `brief.md` / `success.md` | What they asked; what “done” is and who signs |
| `reality.md` / `terrain.md` | The real problem; the map |
| `stakeholders.md` | `[signal:green\|amber\|red]` |
| `trust-profile.md` | Sacred data, AI policy, approval chain |
| `decisions.md` / `risks.md` / `delivery.md` | Dated choices; live risks; what shipped and how it rolls back |

Schema: [docs/schema.md](docs/schema.md).

Local HTML fieldbook: `@fde` dashboard, or `npx fdeops dashboard` (`--all` for the portfolio).

<p align="center"><img width="1336" height="624" alt="fdeops Fieldbook in the browser" src="https://github.com/user-attachments/assets/5683614c-7730-4a3a-860d-185053a377eb" /></p>

---

## Who this is for

| You are | What this is |
|---------|----------------|
| **Forward Deployed Engineer** | Client work that has to survive Monday morning |
| **Consultant / contractor on site** | The engagement stops resetting every morning |
| **Solutions architect** | Politics and architecture in the same record |
| **Agency, 3–5 clients** | One `.fde/` each — they stop blurring |
| **Fractional CTO on client work** | System of record for the embed, and the billable trail |

---

## Your data stays yours

- **Local only.** `git` + files. No network, no telemetry, no account. Air-gapped is fine.
- **Plain markdown.** No database.
- **No new data path.** The model sees client code only when you point the AI coding agent at it. `<private>` is redacted from CLI, dashboard, and hooks — do not open raw private blocks with file tools.
- **Nothing unreviewed.** Draft → you confirm. `fde debrief --dry-run` shows routing first.
- **Know the sync surface.** `~/fde-engagements` is in `$HOME`. iCloud/Dropbox is an NDA incident waiting. `resume --init` warns. [PRIVACY.md](PRIVACY.md) before the first NDA.

[PRIVACY.md](PRIVACY.md) · [SECURITY.md](SECURITY.md)

---

## Principles

- **The artifact is the memory** — producing the work and recording it are one action
- **Methods, not autonomy** — the kit says what to check; judgment stays yours
- **Brief is a hypothesis** — discover before building the wrong thing
- **Evidence on every claim** — these files get defended in the room
- **One customer, one folder** — context never bleeds

---

## Updating

Re-run the Quick Start install, or from a clone: `git pull && node bin/install.js`

---

## Contributing

**[Subash Natarajan](https://www.linkedin.com/in/subashn/)**. [Issues](https://github.com/suboss87/fdeops/issues) · [CONTRIBUTING.md](CONTRIBUTING.md)

Methods should be specific (actionable steps), verifiable (an artifact in `.fde/`), and minimal. The `fde` CLI stays local-only.

**What we won't build:** SaaS sync; Slack/Notion/Granola **push** inside the CLI; CRM as core; hardware capture; generic code-craft packs. You may **pull** via *your* MCP.

[FDE Methodology](FDE-METHODOLOGY.md) · [SECURITY.md](SECURITY.md) · [PRIVACY.md](PRIVACY.md) · [Repo layout](docs/REPO_LAYOUT.md) · [Skills matrix](docs/skills.md)

## License

MIT.
