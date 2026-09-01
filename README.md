# FDEOps

**Forward deployed engineering skills for AI coding agents.**

You're on a customer site. The AI coding agent writes code in their repo. This kit is the work around that code: the brief, who can say yes, proof on their staging then live, whether they signed off, whether they can run it after you leave.

Notes stay on your laptop. Their repo stays theirs. You confirm before anything is written down.

<img width="1536" height="1024" alt="fdeops" src="https://github.com/user-attachments/assets/2bcb8739-55ee-445d-8a1a-8b38433b7b58" />

---

## Quick Start

**Try it first, nothing installed.** In any repo:

```bash
npx fdeops scan
```

Two minutes. It prints what to look at on day one and the questions to ask. Local only, nothing written.

**Then install the skill:**

```bash
npx skills add suboss87/fdeops --skill fde
```

One chat. Name the client:

```text
@fde this is client01
```

That creates `~/fde-engagements/client01/.fde/` on your laptop. Paste kickoff notes in the same thread. `@fde` picks what to check. You still decide.

Day to day: [docs/USAGE.md](docs/USAGE.md).

<details>
<summary><b>Claude Code</b></summary>

```text
/plugin marketplace add suboss87/fdeops
/plugin install fdeops@fdeops
```

Hooks resume where you left off. Slash commands match the table below.

</details>

<details>
<summary><b>Cursor</b></summary>

After the skill install, in the **client repo** you have open (pointer, not a second pack):

```bash
npx fdeops adapters .
```

See [adapters/](adapters/README.md).

</details>

<details>
<summary><b>Air-gap, PATH, override</b></summary>

```bash
git clone https://github.com/suboss87/fdeops.git && node bin/install.js
```

If the agent cannot create the folder:

```bash
npx fdeops resume --init client01   # ~/fde-engagements/client01
```

Requires Node.js >= 18. Override: `FDEOPS_ENGAGEMENT`. See [docs/install.md](docs/install.md). Try the loop: `npx fdeops demo`.

</details>

---

## Commands

One command per stage. Skills load automatically.

Six stages, same order every job: Land, Discover, Plan, Ship, Outcome, Close.

| What you're doing | Command | Stage |
|-------------------|---------|-------|
| First days. Get the brief. Name who signs. | `/brief` | Land |
| Check the brief is the real job. | `/discover` | Discover |
| Sequence from done, not from the ticket. | `/plan` | Plan |
| Prove it on their staging, then go live. | `/ship` | Ship |
| What you promised, measured, and who accepted. | `/outcome` | Outcome |
| Hand it over. They run it without you. | `/close` | Close |

Same `@fde`, when you need them: `/debrief` (notes into the record), `/prep` (one page before you walk in), `/trust` (process gap, or they stopped trusting you), `/receipts` (a dated line, or it did not happen), `/readout` (Friday page for the sponsor; not a seventh stage).

You can also just say it: naming a client, a POC, changing their checkout, going live, asking what was agreed. A typo in a repo that is not a client job can skip this. A named client, a POC, or go-live cannot.

---

## All 30 Skills

Thirty situations, grouped by stage. Not prompts - each one has steps, a file it writes, and a checkpoint with you. Type English or a slash command. `@fde` opens the matching skill. You never pick one by name.

Full detail: [docs/skills-reference.md](docs/skills-reference.md).

### Land

| Skill | What it does | Use when |
|--------|--------------|----------|
| [land](skills/fde/references/land.md) | Interrogate the brief | New client, first meeting, just got the brief |
| [audit](skills/fde/references/audit.md) | Verify inherited claims | Taking over, previous consultant left |
| [who-decides](skills/fde/references/who-decides.md) | Map decision rights | Need to know who matters |
| [earn-trust](skills/fde/references/earn-trust.md) | Earn access | Need access or credibility |
| [hold-scope](skills/fde/references/hold-scope.md) | Hold scope | "Also can you…", timeline unchanged |

### Discover

| Skill | What it does | Use when |
|--------|--------------|----------|
| [discover](skills/fde/references/discover.md) | Frame the problem | Brief feels wrong, shadow processes |
| [test-assumptions](skills/fde/references/test-assumptions.md) | Test assumptions | Brief feels too neat |
| [score-use-cases](skills/fde/references/score-use-cases.md) | Score use cases | Everything is P0 |
| [poc](skills/fde/references/poc.md) | Validate the solution | POC, spike, need to de-risk |

### Plan

| Skill | What it does | Use when |
|--------|--------------|----------|
| [plan](skills/fde/references/plan.md) | Sequence the work | What order, what is done |
| [business-case](skills/fde/references/business-case.md) | Build the business case | Defend budget or timeline |
| [three-options](skills/fde/references/three-options.md) | Generate options | "What should we do?" |
| [pick-three](skills/fde/references/pick-three.md) | Prioritize three | Everything is urgent |

### Ship

| Skill | What it does | Use when |
|--------|--------------|----------|
| [ship](skills/fde/references/ship.md) | Deliver the increment | Building, updating, or going live |
| [what-breaks](skills/fde/references/what-breaks.md) | Assess impact | Touching shared infrastructure |
| [rescue](skills/fde/references/rescue.md) | Resolve the incident | Down, or they went quiet |
| [review](skills/fde/references/review.md) | Review the change | Before merge, scope creep |
| [rollback](skills/fde/references/rollback.md) | Rehearse rollback | "We can always revert" |

### Outcome

| Skill | What it does | Use when |
|--------|--------------|----------|
| [readout](skills/fde/references/readout.md) | Report the outcome | Friday, sponsor update |
| [demo-prep](skills/fde/references/demo-prep.md) | Prepare the demo | Demo or exec walkthrough |
| [debrief](skills/fde/references/debrief.md) | Capture the meeting | Just left a meeting |
| [board-memo](skills/fde/references/board-memo.md) | Brief the board | Justify continued investment |
| [dashboard](skills/fde/references/dashboard.md) | View the portfolio | All my customers |
| [ingest](skills/fde/references/ingest.md) | Ingest sources | Transcript, Notion, Slack |
| [connect](skills/fde/references/connect.md) | Connect a source | Connect Granola |

### Close

| Skill | What it does | Use when |
|--------|--------------|----------|
| [close](skills/fde/references/close.md) | Transfer operations | Wrapping up |
| [runbook](skills/fde/references/runbook.md) | Write the runbook | They must operate without you |
| [switch-clients](skills/fde/references/switch-clients.md) | Switch engagements | 2+ clients |
| [encode-pattern](skills/fde/references/encode-pattern.md) | Encode the pattern | It will apply again |
| [red-team](skills/fde/references/red-team.md) | Challenge the plan | "Poke holes in this" |

Overlays (on signal, not on request): [ai](skills/fde/references/ai.md) · [artifacts](skills/fde/references/artifacts.md) · [fintech](skills/fde/references/fintech.md) · [healthcare](skills/fde/references/healthcare.md) · [gov](skills/fde/references/gov.md). AI companion (not a sixth overlay): [eval-pack](skills/fde/references/eval-pack.md).

Optional pull: you add the source MCP; we **pull** on request. [mcp/recipes/](mcp/recipes/)

---

## How Skills Work

One `@fde`. One file per situation. One folder per client.

```
  "@fde this is client01"      creates ~/fde-engagements/client01/.fde/
  /brief  or  English          the AI coding agent loads skills/fde/SKILL.md
           │  routes. you never pick a skill by name
           ▼
  references/<one>.md          one skill, then stop
           │
           ▼
  fde CLI (local)              dates, gates, redacts. no network
           │  after you confirm
           ▼
  ~/fde-engagements/client01/.fde/
```

**A dated line, or it did not happen.** Promised → measured → accepted. If it is not in `.fde/`, it is not on the record.

**Confirm, then it is written.** The CLI stays on your laptop: git and files, no network. The AI coding agent runs the command. You say yes. Then it is in the folder.

**The record is on your laptop.** Change hosts, install `@fde` on the new one, keep talking. The notes are not inside any vendor.

One skill hosts load: `skills/fde/SKILL.md`. It opens one file in `skills/fde/references/` and stops. Slash commands live in `.claude/commands/`. The local CLI is `bin/fde.js` (git + files, no network). Layout: [docs/REPO_LAYOUT.md](docs/REPO_LAYOUT.md).

---

## Engagement memory (`.fde/`)

One folder per client. Plain markdown. Grep it, copy it, take it into a meeting.

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

You sit with a customer's team. An AI coding agent writes in their repo. You need a record of the brief, who can say yes, what went live, and whether they signed off.

If you ship your own company's product from HQ, with no customer team that has to run it after you leave, you do not need this kit.

---

## Your data stays yours

The **CLI** is local: git + files, no network, no telemetry. The **host model** sees `.fde/` the agent loads (usually a bounded `context.md`) and any client code you open. It must not see `<private>` blocks - redacted from CLI, dashboard, and hooks; do not paste them or open them with file tools. Nothing is written until you confirm. `~/fde-engagements` is in `$HOME`; iCloud/Dropbox is an NDA incident waiting.

[PRIVACY.md](PRIVACY.md) · [SECURITY.md](SECURITY.md)

---

## Why FDEOps?

AI coding agents are built for a repo, not for a client. Left alone they skip who signs, whether the brief is true, and whether anyone accepted the number. Monday they start from the ticket again.

This is the kit you take on site. `@fde` runs the client work around the code. A local command dates every decision. The notes are markdown on your laptop. You confirm; then it is on the record.

---

## Principles

- **Who signs** - name them in the first days
- **Brief vs real job** - check the floor, not only the slide
- **Back from done** - sequence from signed-off, not from the ticket
- **Their staging then live** - prove it where they operate, then go live
- **Promised, measured, accepted** - a number nobody signed is claimed, not delivered
- **They run it** - if they cannot operate it without you, you are not done
- **A dated line, or it did not happen** - these files get defended in the room
- **One customer, one folder** - context never bleeds
- **The kit says what to check. You still decide.**

---

## Project Structure

```
fdeops/
├── skills/fde/                            # the one skill hosts load
│   ├── SKILL.md                           #   router
│   └── references/                        #   30 skills + overlays (you never pick)
│       ├── land.md                        #   Land
│       ├── audit.md
│       ├── who-decides.md
│       ├── earn-trust.md
│       ├── hold-scope.md
│       ├── discover.md                    #   Discover
│       ├── test-assumptions.md
│       ├── score-use-cases.md
│       ├── poc.md
│       ├── plan.md                        #   Plan
│       ├── business-case.md
│       ├── three-options.md
│       ├── pick-three.md
│       ├── ship.md                        #   Ship
│       ├── what-breaks.md
│       ├── rescue.md
│       ├── review.md
│       ├── rollback.md
│       ├── readout.md                      #   Outcome
│       ├── demo-prep.md
│       ├── debrief.md
│       ├── board-memo.md
│       ├── dashboard.md
│       ├── ingest.md
│       ├── connect.md
│       ├── close.md                       #   Close
│       ├── runbook.md
│       ├── switch-clients.md
│       ├── encode-pattern.md
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
│   ├── trust.md
│   ├── receipts.md
│   ├── debrief.md
│   ├── prep.md
│   └── readout.md
├── .claude-plugin/                        # Claude Code marketplace
├── bin/                                   # local CLI: git + files, no network
├── hooks/                                 # session-start / session-stop / pre-compact
├── adapters/                              # Cursor, Gemini, Copilot, Codex pointers
├── templates/.fde/                        # memory files created on first client
├── examples/                              # fictional walkthroughs
├── mcp/                                   # optional ingest + source recipes
├── evals/                                 # routing checks
└── docs/                                  # usage, schema, install
```

---

## Contributing

**[Subash Natarajan](https://www.linkedin.com/in/subashn/)**. [Issues](https://github.com/suboss87/fdeops/issues) · [Discussions](https://github.com/suboss87/fdeops/discussions) · [CONTRIBUTING.md](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md)

Skills should be **specific** (actionable steps), **verifiable** (an artifact in `.fde/`), and **minimal**. The `fde` CLI stays local-only.

## License

MIT - use these skills on client work.
