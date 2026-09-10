# FDEOps

**Forward deployed engineering skills for AI coding agents.**

Your agent writes code. FDEOps helps you deliver the client work around it: understand the problem, agree what done means, prove the result, and hand it over.

<a name="who-this-is-for"></a>

An open-source kit for FDEs, independent consultants, and small agencies working across client projects. Use it with your coding agent. Keep a separate record for each client on your own laptop.

[Install](#quick-start) · [See the dashboard](#your-daily-fieldbook) · [Documentation](docs/README.md)

<img width="960" height="640" alt="FDEOps: forward deployed engineering from the first client meeting to handover" src="https://github.com/user-attachments/assets/2bcb8739-55ee-445d-8a1a-8b38433b7b58" />

## Why use it?

- **Pick up where you left off.** The brief, decisions, risks, and next action travel with the client record, across sessions and agents.
- **Know what you can stand behind.** Keep what was promised, what was measured, and what the customer accepted separate, with evidence for each result.
- **See what needs you today.** An offline dashboard shows the next step and missing evidence, measurement, or approval across your clients.

## Quick Start

Requires Node.js 18+, Git, and an AI coding agent that supports skills. Install the FDEOps skill:

```bash
npx skills add suboss87/fdeops --skill fde
```

Open a client workspace and tell your agent:

```text
@fde this is client01
```

The agent creates `~/fde-engagements/client01/.fde/` on your laptop and links the workspace to that client. Paste the brief or meeting notes into the same conversation. `@fde` works through the situation with you; you review the proposed record before it is applied.

**Claude Code plugin or another host?** Follow the [installation guide](docs/install.md). It explains hooks, adapters, offline setup, and the CLI fallback if your agent cannot run setup. Skill-only installation does not add automatic session hooks.

**Try it without an AI model:**

```bash
npx fdeops demo
```

The demo runs fictional notes through review, applies them in a sandbox, and prints a fieldbook path to open. It writes and resets only its demo folder under `~/fde-engagements/.demo/`. Remove the demo with `npx fdeops demo --clean`. `npx` may download packages; the FDEOps CLI itself works locally.

⭐ **If FDEOps makes your client work easier, star the repo.**

## What a working day looks like

You come out of a meeting with this:

```text
@fde Mara wants CSV upload first. Devon asked for ERP sync,
but Mara has not approved that scope. The staging replay took
five minutes; production has not been measured. Ask Mara for
staging access before Friday. Source: kickoff meeting, 10 September.
```

The agent shows you what changed, what was only requested, what is still unknown, and what happens next. You correct it and confirm the update. A request does not become agreed scope. A staging result does not become a production result. Naming a signer does not mean they accepted the work.

Tomorrow, `@fde` resumes from that record. Before a sponsor meeting, ask what was promised, what was measured, and where the proof is. When someone takes over, give them the handoff packet.

[Walk through notes → REVIEW → apply → evidence](docs/USAGE.md#new-here-5-minutes).

## Your daily fieldbook

![Dark FDEOps fieldbook with one recommended action per client and the gaps behind it](media/fieldbook-preview.png)

```bash
npx fdeops dashboard --open         # current client
npx fdeops dashboard --all --open   # all clients
```

Open a client, inspect its record, and copy an action into your agent to continue the work. The dashboard is a read-only snapshot. After updating the record, run the command again to refresh it. The screenshot uses fictional clients.

<a name="how-skills-work"></a>

## From the first meeting to handover

Describe the situation to `@fde`; it selects the relevant workflow. You do not need to learn a catalog of skills.

| Stage | What you work through |
|---|---|
| Land | Understand the brief and name who can accept the work |
| Discover | Check the actual workflow, constraints, and source of the problem |
| Plan | Agree a small deliverable and an observable test for “done” |
| Ship | Prove it on their staging, review release approval, and test recovery |
| Outcome | Compare promised and measured results; record customer acceptance |
| Close | Transfer the runbook, evidence, open risks, and operating ownership |

The Claude Code plugin also provides `/brief`, `/discover`, `/plan`, `/ship`, `/outcome`, and `/close`. Daily plugin shortcuts are `/debrief`, `/prep`, `/trust`, `/receipts`, and `/readout`. Other hosts use the same `@fde` entry and methodology.

Each skill gives the agent steps to follow, a record to produce, and a checkpoint with you. There are 30 routed skills, plus industry overlays. Start with the [three delivery checklists](docs/skills.md#three-delivery-checklists); use the [full reference](docs/skills-reference.md) when you need the detail.

## Use the CLI directly

The CLI does the file work without calling a model. Commands that change records write when you run them; `debrief --smart` stages a proposal for review before `--apply`.

| You need to… | Run |
|---|---|
| Resume a client | `npx fdeops resume` |
| Review messy notes | `npx fdeops debrief --smart notes.md` |
| Apply the reviewed proposal | `npx fdeops debrief --apply` |
| Find a source | `npx fdeops recall "retry decision"` |
| Prepare a sponsor readout | `npx fdeops defend` |
| Check readiness to plan or build | `npx fdeops doctor --ready` |
| Export a successor packet | `npx fdeops handoff --out successor.md` |

[All commands and examples](docs/USAGE.md).

For free-form notes, start with `@fde` so your agent can help interpret them. The CLI's `--smart` option recognizes common phrases; review its proposal because it can miss requests or next actions in ordinary prose.

## Your records, your control

Each client has its own `.fde/` folder of Markdown files. The brief, success criteria, decisions, risks, and delivery ledger stay readable outside FDEOps. The CLI uses local files and Git, with no network calls or telemetry. Optional [MCP sources](mcp/recipes/) are connected through your agent host, then pulled and reviewed on request.

Default session context is capped at **16 KiB**, including constraints and selected records. Older detail stays on disk and can be retrieved with `recall`. This limits FDEOps output, not everything your agent puts into its context window.

Your AI host may send what it reads to its configured model. FDEOps redacts `<private>` blocks from its CLI, hook, and dashboard outputs; do not paste or load raw private blocks through file tools. Enabled session hooks can record mechanical session state automatically. Review reports before sharing client information.

The CLI and dashboard need no model. The tested small local models produced wrong or incomplete answers; read the results before relying on one for client work. [Verification and limits](docs/verification.md) · [Privacy](PRIVACY.md) · [Security](SECURITY.md).

## Find your way around

| You want to… | Start here |
|---|---|
| Install or use FDEOps | [Documentation](docs/README.md) |
| Understand or change a workflow | [The `@fde` skill](skills/fde/SKILL.md) and its `references/` |
| Work on the CLI or dashboard | [`bin/`](bin/), shared helpers in `bin/lib/`, regressions in [`test/`](test/) |
| Explore sample client records | [`examples/`](examples/) |
| Check measured behavior and known gaps | [`evals/`](evals/) and [verification](docs/verification.md) |
| Understand every folder | [Repository map](docs/REPO_LAYOUT.md) |

## Contribute

Share an anonymized failure case, a reproducible bug, or a focused improvement through [Issues](https://github.com/suboss87/FDEOps/issues) or [Discussions](https://github.com/suboss87/FDEOps/discussions). Read the [contribution guide](CONTRIBUTING.md) before changing a workflow or command.

Built and maintained by **[Subash Natarajan](https://github.com/suboss87)**. MIT licensed; preserve applicable notices when redistributing.
