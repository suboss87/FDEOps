# FDEOps

**Forward deployed engineering skills for AI coding agents.**

Skills encode the workflows, quality gates, and judgment Forward Deployed Engineers use on someone else's site. Packaged so an AI coding agent can run the embed end-to-end: discovery, POC, their codebase (greenfield or brownfield), go-live, eval, signed outcome. The workspace still compiles and commits. `@fde` does not leave.

![Uploading fdeops.png…]()

---

## Commands

One command per stage. Skills load automatically.

Six commands map to the embed. Each one loads `@fde`, which opens the skill for that moment: a thin brief pulls land, a wrong brief pulls discover, a Friday number pulls readout. Sprint or programme. Greenfield or brownfield. Any industry. You never pick from 30 names.

| Work | Command | Stage | Principle |
|------|---------|-------|-----------|
| Engage | `/brief` | Land | Name who signs done |
| Diagnose | `/discover` | Discover | Treat the brief as a hypothesis |
| Align | `/plan` | Plan | Work backwards from done |
| Deliver | `/ship` | Ship | One visible change, then go live |
| Realize | `/outcome` | Outcome | Promised, measured, accepted |
| Transfer | `/close` | Close | They operate it without you |

Also:

| Work | Command | Principle |
|------|---------|-----------|
| Diagnose trust | `/trust` | Process gap, or they stopped trusting you |
| Find the receipt | `/receipts` | A dated line, or it did not happen |
| Capture the meeting | `/debrief` | Notes into the record |
| Prepare the meeting | `/prep` | One page from the record |
| Report the outcome | `/readout` | Promised, measured, accepted |

Skills also activate on English: naming a client, running a POC, changing their checkout, going live, asking what was agreed. A throwaway one-liner in an unbound repo can skip `@fde`. Bound client work cannot.

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

## All 30 Skills

The catalog. 30 skills spanning the embed. Not prompts - structured workflows with steps, an artifact, and a checkpoint. Type English or a slash command. `@fde` activates the right skill. You never pick one by name.

Full detail: [docs/skills-reference.md](docs/skills-reference.md).

### Land - Engage

| Skill | What it does | Use when |
|--------|--------------|----------|
| [land](skills/fde/references/land.md) | Interrogate the brief | New client, first meeting, just got the brief |
| [audit](skills/fde/references/audit.md) | Verify inherited claims | Taking over, previous consultant left |
| [who-decides](skills/fde/references/who-decides.md) | Map decision rights | Need to know who matters |
| [earn-trust](skills/fde/references/earn-trust.md) | Earn access | Need access or credibility |
| [hold-scope](skills/fde/references/hold-scope.md) | Hold scope | "Also can you…", timeline unchanged |

### Discover - Diagnose

| Skill | What it does | Use when |
|--------|--------------|----------|
| [discover](skills/fde/references/discover.md) | Frame the problem | Brief feels wrong, shadow processes |
| [test-assumptions](skills/fde/references/test-assumptions.md) | Test assumptions | Brief feels too neat |
| [score-use-cases](skills/fde/references/score-use-cases.md) | Score use cases | Everything is P0 |
| [poc](skills/fde/references/poc.md) | Validate the solution | POC, spike, need to de-risk |

### Plan - Align

| Skill | What it does | Use when |
|--------|--------------|----------|
| [plan](skills/fde/references/plan.md) | Sequence the work | What order, what is done |
| [business-case](skills/fde/references/business-case.md) | Build the business case | Defend budget or timeline |
| [three-options](skills/fde/references/three-options.md) | Generate options | "What should we do?" |
| [pick-three](skills/fde/references/pick-three.md) | Prioritize three | Everything is urgent |

### Ship - Deliver

| Skill | What it does | Use when |
|--------|--------------|----------|
| [ship](skills/fde/references/ship.md) | Deliver the increment | Building, updating, or going live |
| [what-breaks](skills/fde/references/what-breaks.md) | Assess impact | Touching shared infrastructure |
| [rescue](skills/fde/references/rescue.md) | Resolve the incident | Down, or they went quiet |
| [review](skills/fde/references/review.md) | Review the change | Before merge, scope creep |
| [rollback](skills/fde/references/rollback.md) | Rehearse rollback | "We can always revert" |

### Outcome - Realize

| Skill | What it does | Use when |
|--------|--------------|----------|
| [readout](skills/fde/references/readout.md) | Report the outcome | Friday, sponsor update |
| [demo-prep](skills/fde/references/demo-prep.md) | Prepare the demo | Demo or exec walkthrough |
| [debrief](skills/fde/references/debrief.md) | Capture the meeting | Just left a meeting |
| [board-memo](skills/fde/references/board-memo.md) | Brief the board | Justify continued investment |
| [dashboard](skills/fde/references/dashboard.md) | View the portfolio | All my customers |
| [ingest](skills/fde/references/ingest.md) | Ingest sources | Transcript, Notion, Slack |
| [connect](skills/fde/references/connect.md) | Connect a source | Connect Granola |

### Close - Transfer

| Skill | What it does | Use when |
|--------|--------------|----------|
| [close](skills/fde/references/close.md) | Transfer operations | Wrapping up |
| [runbook](skills/fde/references/runbook.md) | Write the runbook | They must operate without you |
| [switch-clients](skills/fde/references/switch-clients.md) | Switch engagements | 2+ clients |
| [encode-pattern](skills/fde/references/encode-pattern.md) | Encode the pattern | It will apply again |
| [red-team](skills/fde/references/red-team.md) | Challenge the plan | "Poke holes in this" |

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
  references/land.md           one skill, then stop
           │
           ▼
  fde CLI (local)              dates, gates, redacts. no network
           │  after you confirm
           ▼
  ~/fde-engagements/<client>/.fde/
```

**One skill routes.** Hosts load `@fde`. It reads the situation and opens one `references/*.md`. Slash commands and English both land here. You never pick a skill by name.

**Evidence, not memory.** Promised → measured → accepted. A dated line in `.fde/`, or it did not happen. Nothing is done on vibes.

**Confirm before write.** Local CLI: git and files, no network. `.fde/` on your laptop. The AI coding agent runs the command. You confirm. Then it is on the record.

**Progressive disclosure.** `SKILL.md` is the entry. One skill file loads when routed. Writes and status cost zero model tokens.

Change hosts, install `@fde` on the new one, bind if needed, keep talking. The record is not inside any vendor.

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
├── templates/.fde/                        # memory files created on bind
├── examples/                              # fictional walkthroughs
├── mcp/                                   # optional ingest + source recipes
├── evals/                                 # routing checks
└── docs/                                  # usage, schema, install
```

---

## Why FDEOps?

AI coding agents are built for a repo, not for a client. Left alone they skip who signs done, whether the brief is true, and whether anyone accepted the number. Monday morning they start from the ticket again.

FDEOps is the catalog you take on site. One `@fde` skill runs the embed from discovery to signed outcome: POC, their codebase, go-live, eval when a model judges, promised → measured → accepted. A local CLI dates every decision. `.fde/` is markdown on your laptop. You confirm; then it is on the record.

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

You embed with a customer and an AI coding agent. Take this on the ground. Discovery through signed outcome lives in `@fde`. One `.fde/` per client so they do not blur.

If you only write code in your own repo with no client record to defend, you do not need this kit.

---

## Your data stays yours

Local only - `git` + files, no network, no telemetry. Plain markdown. The model sees client code only when you point the AI coding agent at it. `<private>` is redacted from CLI, dashboard, and hooks. Nothing is written until you confirm. `~/fde-engagements` is in `$HOME`; iCloud/Dropbox is an NDA incident waiting.

[PRIVACY.md](PRIVACY.md) · [SECURITY.md](SECURITY.md)

---

## Principles

- **One map** - any scale, greenfield or brownfield, any industry. Overlays carry the vertical
- **The artifact is the memory** - producing the work and recording it are one action
- **Ground loop** - name the change, characterise their code, prove it on their staging, go live, log the outcome
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
