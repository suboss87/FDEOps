# FDEOps

**Forward deployed engineering skills for AI coding agents.**

Skills encode the workflows, quality gates, and judgment Forward Deployed Engineers use on someone else's site. Packaged so an AI coding agent follows them, and writes a dated client record you can defend. The host agent still writes the TypeScript. The kit is everything around the code that makes an embed defensible.

```text
  LAND              DISCOVER           PLAN              SHIP               PROVE              CLOSE
 ┌────────┐      ┌────────┐      ┌────────┐      ┌────────┐      ┌────────┐      ┌────────┐
 │  Brief │ ───▶ │ Reality│ ───▶ │ Sequence│───▶ │  Live  │ ───▶ │ Signed │ ───▶ │  They  │
 │  Trust │      │ Terrain│      │  Align │      │  slice │      │   off  │      │   run  │
 └────────┘      └────────┘      └────────┘      └────────┘      └────────┘      └────────┘
  /brief           /discover          /plan             /ship            /outcome           /close
```

---

## Commands

Each command loads the same `@fde` skill. You never pick from 31 names.

| What you're doing | Command | Key principle |
|-------------------|---------|-----------|
| Land the embed | `/brief` | Who signs done |
| Find the real problem | `/discover` | Brief is a hypothesis |
| Plan the sequence | `/plan` | Backwards from done |
| Ship a slice | `/ship` | Live with a rollback |
| Prove the outcome | `/outcome` | Promised, measured, accepted |
| Close the embed | `/close` | They run it without you |

Four tells the map does not cover:

| What you're doing | Command | Key principle |
|-------------------|---------|-----------|
| Sponsor went silent | `/quiet` | Process or trust |
| Scope dispute | `/agreed` | Dated receipts, or a gap |
| After a meeting | `/debrief` | Notes into the record |
| Walk-in / Friday | `/prep` `/status` | One page, then the ledger |

Skills also activate on English: naming a client, debriefing a meeting, or asking what was agreed. Ordinary TypeScript, unit tests, and git commits stay in the host agent.

---

## Quick Start

```bash
npx skills add suboss87/fdeops --skill fde
```

Then one chat. Name the client. The AI coding agent binds.

```text
@fde this is Acme
```

Paste kickoff notes in the same thread. `@fde` routes; you confirm judgment. Same folder every time: `~/fde-engagements/<client>/.fde/`. Workflow: [docs/USAGE.md](docs/USAGE.md).

<details>
<summary><b>Claude Code (recommended)</b></summary>

```text
/plugin marketplace add suboss87/fdeops
/plugin install fdeops@fdeops
```

Hooks load where you left off. Slash commands match the map above.

</details>

<details>
<summary><b>Cursor</b></summary>

```bash
npx skills add suboss87/fdeops --skill fde
```

Or `npx fdeops adapters .`. See [adapters/](adapters/README.md).

</details>

<details>
<summary><b>Other agents</b></summary>

```bash
npx skills add suboss87/fdeops --skill fde
```

Gemini, Copilot, Codex, local LLMs: [adapters/](adapters/README.md). Air-gapped: `git clone https://github.com/suboss87/fdeops.git && node bin/install.js`.

Fallback if the agent cannot bind:

```bash
npx fdeops resume --init acme   # ~/fde-engagements/acme + bind this checkout
```

Requires Node.js >= 18. Override: `FDEOPS_ENGAGEMENT`. See [docs/install.md](docs/install.md). Try the loop: `npx fdeops demo`.

</details>

---

## All 31 Skills

The commands above are the entry points. Under the hood, `@fde` activates these 31 skills, each a structured workflow with steps, an artifact, and a checkpoint. You never pick one by name. Full detail: [docs/skills-reference.md](docs/skills-reference.md).

### Land - Brief and trust

| Skill | What It Does | Use When |
|--------|--------------|----------|
| [land](skills/fde/references/land.md) | Interrogate the brief, map stakeholders, define success | New client, first meeting, just got the brief |
| [audit](skills/fde/references/audit.md) | Verify claims, find the load-bearing wall | Taking over, previous consultant left |
| [stakeholder-radar](skills/fde/references/stakeholder-radar.md) | Who decides, who blocks, who escalates | Need to know who matters |
| [trust-engineering](skills/fde/references/trust-engineering.md) | Observer → trusted; navigate AI policy | Need access or credibility |
| [scope-defense](skills/fde/references/scope-defense.md) | Scope receipts; the accumulation conversation | "Also can you…", timeline unchanged |

### Discover - Find the real problem

| Skill | What It Does | Use When |
|--------|--------------|----------|
| [discover](skills/fde/references/discover.md) | Repo + workaround + the real problem | Brief feels wrong, shadow processes |
| [assumption-audit](skills/fde/references/assumption-audit.md) | Untested assumptions by blast radius | Brief feels too neat |
| [use-case-scoring](skills/fde/references/use-case-scoring.md) | Value × urgency × alignment / complexity | Everything is P0 |
| [sketch](skills/fde/references/sketch.md) | Kill the killer assumption in a day | Need to de-risk a direction |

### Plan - Sequence the work

| Skill | What It Does | Use When |
|--------|--------------|----------|
| [plan](skills/fde/references/plan.md) | Backwards from done, PR-sized | What order, what is done |
| [business-case](skills/fde/references/business-case.md) | Cost of nothing → investment → return | Defend budget or timeline |
| [options-analysis](skills/fde/references/options-analysis.md) | Three genuine options | "What should we do?" |
| [initiative-triage](skills/fde/references/initiative-triage.md) | Pick three from twenty urgents | Everything is urgent |

### Ship - Go live

| Skill | What It Does | Use When |
|--------|--------------|----------|
| [incremental-build](skills/fde/references/incremental-build.md) | Vertical slices, visible every 2-3 days | Large feature on their codebase |
| [blast-radius](skills/fde/references/blast-radius.md) | Impact from contained → irreversible | Touching shared infrastructure |
| [rescue](skills/fde/references/rescue.md) | Production fire or trust fire | Down, or they went quiet |
| [ship](skills/fde/references/ship.md) | Intent vs diff, pre-flight, rollback | Going live |
| [review](skills/fde/references/review.md) | Did we only build what we agreed | Before merge, scope creep |
| [rollback-drill](skills/fde/references/rollback-drill.md) | Test the escape route before 2am | "We can always revert" |

### Prove - Outcome

| Skill | What It Does | Use When |
|--------|--------------|----------|
| [status](skills/fde/references/status.md) | Promised → measured → accepted | Friday, sponsor update |
| [demo-prep](skills/fde/references/demo-prep.md) | One number, five hard questions | Demo or exec walkthrough |
| [debrief](skills/fde/references/debrief.md) | Meeting notes into the record | Just left a meeting |
| [exec-narrative](skills/fde/references/exec-narrative.md) | Board / sponsor's boss | Justify continued investment |
| [dashboard](skills/fde/references/dashboard.md) | Portfolio, trust-ordered | All my customers |
| [ingest](skills/fde/references/ingest.md) | Pull text you confirm | Transcript, Notion, Slack |
| [ingest-connect](skills/fde/references/ingest-connect.md) | Wire a source MCP | Connect Granola |

### Close - They run it

| Skill | What It Does | Use When |
|--------|--------------|----------|
| [close](skills/fde/references/close.md) | Handoff that survives you | Wrapping up |
| [handoff-engineering](skills/fde/references/handoff-engineering.md) | Runbook, confidence scoring | They must operate without you |
| [multi-customer-ops](skills/fde/references/multi-customer-ops.md) | Switch without bleed | 2+ clients |
| [pattern-extract](skills/fde/references/pattern-extract.md) | If you did it twice, encode it | It will apply again |
| [red-team](skills/fde/references/red-team.md) | Stress-test before they do | "Poke holes in this" |

Overlays (on signal, not on request): [ai](skills/fde/references/ai.md) · [artifacts](skills/fde/references/artifacts.md) · [fintech](skills/fde/references/fintech.md) · [healthcare](skills/fde/references/healthcare.md) · [gov](skills/fde/references/gov.md) · [eval-pack](skills/fde/references/eval-pack.md)

Optional pull: you add the source MCP; we **pull** on request. [mcp/recipes/](mcp/recipes/)

---

## How Skills Work

One skill. One reference file per situation. One folder per client.

```
  /brief   or   "@fde this is Acme"
           │
           ▼
  skills/fde/SKILL.md          hosts load this one file
           │  routes. you never pick a skill by name
           ▼
  references/land.md           one workflow, then stop
           │
           ▼
  fde CLI (local)              dates, gates, redacts. no network
           │  after you confirm
           ▼
  ~/fde-engagements/<client>/.fde/
```

- **Process, not prose.** Each reference is a workflow with an artifact and a checkpoint, not a tip sheet.
- **You confirm.** Nothing is written until you say so.
- **Progressive disclosure.** `SKILL.md` is the entry point. One `references/*.md` loads when routed.
- **Local CLI.** Writes and status cost zero model tokens. The AI coding agent runs it.

Change hosts, install `@fde` on the new one, bind if needed, keep talking. The record is not inside any vendor.

---

## Project Structure

```
fdeops/
├── skills/fde/                            # the one skill hosts load
│   ├── SKILL.md                           #   router
│   └── references/                        #   31 skills + overlays (you never pick)
│       ├── land.md                        #   Land
│       ├── audit.md
│       ├── stakeholder-radar.md
│       ├── trust-engineering.md
│       ├── scope-defense.md
│       ├── discover.md                    #   Discover
│       ├── assumption-audit.md
│       ├── use-case-scoring.md
│       ├── sketch.md
│       ├── plan.md                        #   Plan
│       ├── business-case.md
│       ├── options-analysis.md
│       ├── initiative-triage.md
│       ├── incremental-build.md           #   Ship
│       ├── blast-radius.md
│       ├── rescue.md
│       ├── ship.md
│       ├── review.md
│       ├── rollback-drill.md
│       ├── status.md                      #   Prove
│       ├── demo-prep.md
│       ├── debrief.md
│       ├── exec-narrative.md
│       ├── dashboard.md
│       ├── ingest.md
│       ├── ingest-connect.md
│       ├── close.md                       #   Close
│       ├── handoff-engineering.md
│       ├── multi-customer-ops.md
│       ├── pattern-extract.md
│       ├── red-team.md
│       ├── ai.md                          #   overlays (on signal)
│       ├── artifacts.md
│       ├── eval-pack.md
│       ├── fintech.md
│       ├── healthcare.md
│       └── gov.md
├── .claude/commands/                      # slash commands (each loads @fde)
│   ├── brief.md
│   ├── discover.md
│   ├── plan.md
│   ├── ship.md
│   ├── outcome.md
│   ├── close.md
│   ├── quiet.md
│   ├── agreed.md
│   ├── debrief.md
│   ├── prep.md
│   └── status.md
├── .claude-plugin/                        # Claude Code marketplace
├── bin/                                   # local CLI: git + files, no network
├── hooks/                                 # session-start / session-stop / pre-compact
├── adapters/                              # Cursor, Gemini, Copilot, Codex pointers
├── templates/.fde/                        # memory files created on bind
├── examples/                              # fictional walkthroughs
├── mcp/                                   # optional ingest + source recipes
├── evals/                                 # routing checks
└── docs/                                  # usage, schema, install
```

---

## Why FDEOps?

AI coding agents are built for a repo, not for a client. They forget the sponsor, the promise, who can say yes, and whether anyone accepted the number. Monday morning they start from the ticket again.

FDEOps is the engagement record those agents load first. One `@fde` skill routes the work. A local CLI dates every decision. `.fde/` is markdown on your laptop. You confirm; then it is on the record. Coding skill packs cover specs, tests, and review. This kit covers the embed around that code.

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

Schema: [docs/schema.md](docs/schema.md). Local HTML: `npx fdeops dashboard`.

---

## Who this is for

You embed with a customer and an AI coding agent. The record has to survive Monday, a sponsor change, and the readout. One `.fde/` per client so they do not blur.

If you only write code in your own repo, this is the wrong pack. Use a coding skill pack for specs, tests, and review. Use this when the work is on someone else's site.

---

## Your data stays yours

Local only - `git` + files, no network, no telemetry. Plain markdown. The model sees client code only when you point the AI coding agent at it. `<private>` is redacted from CLI, dashboard, and hooks. Nothing is written until you confirm. `~/fde-engagements` is in `$HOME`; iCloud/Dropbox is an NDA incident waiting.

[PRIVACY.md](PRIVACY.md) · [SECURITY.md](SECURITY.md)

---

## Principles

- **The artifact is the memory** - producing the work and recording it are one action
- **Skills, not autonomy** - the kit says what to check; judgment stays yours
- **Brief is a hypothesis** - discover before building the wrong thing
- **Evidence on every claim** - these files get defended in the room
- **One customer, one folder** - context never bleeds

---

## Contributing

**[Subash Natarajan](https://www.linkedin.com/in/subashn/)**. [Issues](https://github.com/suboss87/fdeops/issues) · [Discussions](https://github.com/suboss87/fdeops/discussions) · [CONTRIBUTING.md](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md)

Skills should be **specific** (actionable steps), **verifiable** (an artifact in `.fde/`), and **minimal**. The `fde` CLI stays local-only.

## License

MIT - use these skills on client work.
