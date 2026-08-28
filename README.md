# FDEOps

**The AI coding agent forgets the client. fdeops is the countersigned record — promised, measured, accepted.**

[![npm version](https://img.shields.io/npm/v/fdeops.svg)](https://www.npmjs.com/package/fdeops)
[![CI](https://github.com/suboss87/fdeops/actions/workflows/validate.yml/badge.svg)](https://github.com/suboss87/fdeops/actions)
[![skills.sh](https://skills.sh/b/suboss87/fdeops)](https://skills.sh/suboss87/fdeops)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

One `@fde` skill. Say what is happening: the brief is wrong, they went quiet, when did we agree, what did they get. The host agent still writes the TypeScript. This skill is the engagement record.

---

## The week

What you are doing. `@fde` plus English — no cheat sheet. Claude Code also gets slash commands that load the same skill.

| What you're doing | Command | Principle |
|-------------------|---------|-----------|
| **The brief is wrong** | `@fde this is Acme. Brief says they want a portal.` · `/brief` | Real problem before more code |
| **They went quiet** | `@fde the sponsor went quiet` · `/quiet` | Process gap vs trust problem |
| **When did we agree?** | `@fde when did we agree to drop that?` · `/agreed` | Dated receipts, or a gap |
| **What did they get?** | `@fde what did they get this week` · `/got` | Promised → measured → accepted |
| **After a meeting** | `@fde` debrief these notes *(paste)* · `/debrief` | Proposed updates. You confirm. |
| **Optional: pull** | `@fde` connect Granola · `@fde` pull today's transcript | You add that source MCP. We **pull** on request. [mcp/recipes/](mcp/recipes/) |

First chat: you name the client; the AI coding agent binds. Same folder every time: `~/fde-engagements/<client>/.fde/`.

---

## Quickstart

**30-second setup.** Pick one — both copies `@fde` twice.

Claude Code (hooks before you type; slash commands `/brief` `/quiet` `/agreed` `/got` `/debrief`):

```text
/plugin marketplace add suboss87/fdeops
/plugin install fdeops@fdeops
```

Cursor, Codex, and any host that speaks the skills CLI:

```bash
npx skills add suboss87/fdeops --skill fde
```

**Then one chat.** Name the client. The AI coding agent binds the engagement; you never type the CLI.

```text
@fde this is Acme
```

Paste kickoff notes in the same thread. `@fde` routes; you confirm judgment. Workflow: [docs/USAGE.md](docs/USAGE.md).

Claude Code auto-loads the fieldbook at session start. Elsewhere, say `@fde`. Tomorrow the file is still there.

<details>
<summary>Terminal bind · other hosts · env</summary>

Fallback if the agent cannot bind — creates the engagement under `~/fde-engagements` and points this checkout at it:

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

The most common failure on an embed is building the portal they asked for. Ops has been running a spreadsheet for two years. `/brief` — one question: who in their company would have to agree it worked?

### 2. They went quiet

A sponsor who stops answering is not a Jira gap. It is a trust color. `/quiet` — process vs trust, then a dated signal in the record.

### 3. When did we agree?

Arguments from memory lose. `/agreed` searches dated receipts. No hit is a gap, not proof.

### 4. What did they get?

A number only you agree with is claimed, not delivered. `/got` reads promised → measured → accepted out loud.

Ordinary TypeScript, unit tests, and git commits stay in the host agent. Do not ask `@fde` to review a unit test.

---

## See it

```bash
npx fdeops demo
```

Real commands on a fake client: messy notes → you confirm → cold reload → prep → receipts → fieldbook page. Nothing of yours is read. Lives in `~/fde-engagements/.demo/`. Remove with `npx fdeops demo --clean`.

One recorded session — kickoff notes, next morning, “when did we agree?” weeks later. CLI output; typing pace is staged. Re-record: [`media/record-session.sh`](media/record-session.sh).

<p align="center"><img alt="A real fdeops session: messy kickoff notes routed into dated memory after you confirm, then a cold session that already knows the client, a grounded sponsor-meeting brief, and dated receipts" src="media/session.gif" width="900" /></p>

Two things a chat window cannot do: **nothing is written until you confirm**, and `<private>` lands sealed as `(private - redacted)` — never in `resume`, `prep`, `receipts`, or the dashboard.

---

## How it works

- **You** describe the situation with `@fde` (or `/brief` `/quiet` `/agreed` `/got` `/debrief` on Claude Code). First chat: you name the client; the AI coding agent runs the bind.
- **Hooks (Claude Code)** load where you left off and snapshot on the way out. Other hosts: same CLI and files; you call `@fde`.
- **Local CLI** — writes, receipts, status. Zero model tokens. The AI coding agent runs it; you do not live in the CLI. Friday, `fde status` prints promised → measured → accepted. [docs/USAGE.md](docs/USAGE.md)
- **Pull (optional)** — FDEOps is the sink. Paste is the daily path. A source MCP you add (Granola, Slack, Notion, …) can fetch text; `@fde connect …` walks config. No push, no sync, no tokens in `.fde/`. [mcp/recipes/](mcp/recipes/)

`CLAUDE.md` is how the *code* works. The fieldbook is how the *engagement* works. The record lives at `~/fde-engagements/<client>/.fde/` — not inside any vendor.

**Words used here, once:** *engagement* - one client's body of work, one folder. *Fieldbook* - that folder (`.fde/`), the record itself. *Brief vs reality* - what they said the problem was, and what it turned out to be. *Terrain* - their systems and org as you actually found them. *Trust signal* - green / amber / red on one relationship. *Receipts* - the dated line proving something was agreed. *Vault* - the Obsidian copy `fde vault` generates to read it all in one window.

### Switch coding agents anytime

Change hosts, install `@fde` on the new one, bind if needed, keep talking. The client record does not move.

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

---

## Fieldbook UI

Local HTML: trust, phase, next, the record. `@fde` dashboard, or `npx fdeops dashboard` (`--all` for the portfolio).

<p align="center"><img width="1336" height="624" alt="fdeops Fieldbook in the browser" src="https://github.com/user-attachments/assets/5683614c-7730-4a3a-860d-185053a377eb" /></p>

---

## Who this is for

| You are | What this is |
|---------|----------------|
| **Forward Deployed Engineer** | The job this was built for — client work that has to survive Monday morning |
| **Consultant / contractor on site** | The engagement stops resetting every morning |
| **Solutions architect** | Politics and architecture in the same record |
| **Agency, 3–5 clients** | One `.fde/` each — they stop blurring |
| **Fractional CTO on client work** | System of record for the embed, and the billable trail |

Ordinary TypeScript, unit tests, and git commits stay in the host agent.

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

Re-run the Quickstart install, or from a clone: `git pull && node bin/install.js`

---

## Contributing

**[Subash Natarajan](https://www.linkedin.com/in/subashn/)**. [Issues](https://github.com/suboss87/fdeops/issues) · [CONTRIBUTING.md](CONTRIBUTING.md)

**What we won't build:** SaaS sync; Slack/Notion/Granola connectors or **push** inside the CLI; CRM as core; hardware capture; generic code-craft packs. You may **pull** via *your* MCP. The `fde` CLI stays local-only.

[FDE Methodology](FDE-METHODOLOGY.md) · [SECURITY.md](SECURITY.md) · [PRIVACY.md](PRIVACY.md) · [Repo layout](docs/REPO_LAYOUT.md) · [Skills matrix](docs/skills.md) · MIT

---

<details>
<summary>31 field methods (you never pick one)</summary>

You describe the situation; `@fde` routes. **31 methods**, six domains — each a method (thinking, artifact, checkpoint), not a tip sheet. [docs/skills.md](docs/skills.md) · [docs/skills-reference.md](docs/skills-reference.md)

| Domain | Methods |
|--------|---------|
| **1. Embed & Trust** | [land](skills/fde/references/land.md) · [audit](skills/fde/references/audit.md) · [stakeholder-radar](skills/fde/references/stakeholder-radar.md) · [trust-engineering](skills/fde/references/trust-engineering.md) · [scope-defense](skills/fde/references/scope-defense.md) |
| **2. Discover & Diagnose** | [discover](skills/fde/references/discover.md) · [assumption-audit](skills/fde/references/assumption-audit.md) · [use-case-scoring](skills/fde/references/use-case-scoring.md) · [sketch](skills/fde/references/sketch.md) |
| **3. Plan & Align** | [plan](skills/fde/references/plan.md) · [business-case](skills/fde/references/business-case.md) · [options-analysis](skills/fde/references/options-analysis.md) · [initiative-triage](skills/fde/references/initiative-triage.md) |
| **4. Build & Guard** | [incremental-build](skills/fde/references/incremental-build.md) · [blast-radius](skills/fde/references/blast-radius.md) · [rescue](skills/fde/references/rescue.md) |
| **5. Ship & Verify** | [ship](skills/fde/references/ship.md) · [review](skills/fde/references/review.md) · [rollback-drill](skills/fde/references/rollback-drill.md) |
| **6. Operate & Close** | [status](skills/fde/references/status.md) · [demo-prep](skills/fde/references/demo-prep.md) · [debrief](skills/fde/references/debrief.md) · [exec-narrative](skills/fde/references/exec-narrative.md) · [dashboard](skills/fde/references/dashboard.md) · [multi-customer-ops](skills/fde/references/multi-customer-ops.md) · [close](skills/fde/references/close.md) · [handoff-engineering](skills/fde/references/handoff-engineering.md) · [pattern-extract](skills/fde/references/pattern-extract.md) · [red-team](skills/fde/references/red-team.md) · [ingest](skills/fde/references/ingest.md) · [ingest-connect](skills/fde/references/ingest-connect.md) |

Overlays: [ai](skills/fde/references/ai.md) · [artifacts](skills/fde/references/artifacts.md) · [fintech](skills/fde/references/fintech.md) · [healthcare](skills/fde/references/healthcare.md) · [gov](skills/fde/references/gov.md)

</details>
