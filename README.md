# FDEOps

**The local engagement OS for AI coding agents.**

FDEOps helps a Forward Deployed Engineer or consultant carry a client engagement from a messy brief to a defensible handover. One `@fde` entry guides the work. A local CLI keeps the record in Markdown; an offline fieldbook shows what needs attention.

| When client work goes wrong | What FDEOps helps you keep straight |
|---|---|
| The brief describes the wrong problem | What was requested, what you observed, and which assumptions remain untested |
| Nobody can say who signs | The acceptance owner, approval scope, and unresolved authority |
| A good number becomes a success claim | What was promised, measured, and accepted, with its source |
| You switch clients, agents, or engineers | Decisions, constraints, evidence, and one next action in each client's record |

You make the judgments and obtain customer approval. The record helps you explain them later.

<img width="1536" height="1024" alt="fdeops" src="https://github.com/user-attachments/assets/2bcb8739-55ee-445d-8a1a-8b38433b7b58" />

## Quick Start

Requires Node.js 18+, Git, and an AI coding agent for the guided workflow. `npx` may download packages; the FDEOps CLI operates locally.

```bash
npx skills add suboss87/fdeops --skill fde
```

Open the client workspace and tell your agent:

```text
@fde this is client01
```

The agent creates `~/fde-engagements/client01/.fde/` and binds the workspace to it. If the host cannot run setup, use `npx fdeops resume --init client01` to create the engagement and binding.

**Try the record before using client data:** `npx fdeops demo` runs a fictional notes-to-fieldbook workflow without a model. It writes under `~/fde-engagements/.demo/` and resets that sandbox each run. Remove it with `npx fdeops demo --clean`. For repository reconnaissance without writing engagement records, use `npx fdeops scan`.

<details>
<summary>Host installation and offline use</summary>

Claude Code plugin:

```text
/plugin marketplace add suboss87/fdeops
/plugin install fdeops@fdeops
```

The plugin registers session hooks and slash commands. Skill-only installations do not register those hooks. For Cursor, Codex, Gemini, or Copilot, install the skill and run `npx fdeops adapters .` in the client workspace; this writes instruction pointers.

Clone installation:

```bash
git clone https://github.com/suboss87/fdeops.git
cd fdeops
node bin/install.js
```

Offline machines need an already-transferred checkout, Node.js, and Git. Advanced override: `FDEOPS_ENGAGEMENT`. See [installation](docs/install.md) and [host adapters](adapters/README.md).

</details>

## Commands

One command per stage. Skills load automatically. Describe the situation to `@fde`; the Claude Code plugin also provides these slash commands.

| Stage | Command | Result to review |
|---|---|---|
| Land | `/brief` | The brief, unknowns, and who can accept the work |
| Discover | `/discover` | The actual workflow and evidence behind the problem |
| Plan | `/plan` | A small deliverable, constraints, and acceptance criteria |
| Ship | `/ship` | Proof on their staging, release approval, and rollback |
| Outcome | `/outcome` | Promised, measured, accepted, and supporting evidence |
| Close | `/close` | Runbook, operating owner, and handover gaps |

Daily requests: `/debrief`, `/prep`, `/receipts`, `/readout`, and `/trust`. Revisit earlier stages when evidence changes; a new incident does not require restarting discovery.

## One loop you can defend

Paste messy notes after a meeting:

```text
@fde Debrief: Mara agreed to CSV upload. Devon asked for ERP sync,
but Mara has not approved it. The staging replay took 5 minutes;
we have no comparable production baseline. Ask Mara for staging access.
```

1. **Review:** the agent separates decisions, requests, unknowns, measurements, and next actions. Check the source and any conflicts with existing records.
2. **Apply:** confirm the proposed interpretation. An ERP request stays a request; a staging result stays a staging result. Saving the record does not mean the customer approved either.
3. **Defend:** ask `@fde What did we agree about ERP, and what evidence supports the result?` Review the supplied source, superseded decisions, and missing evidence before using the answer in a sponsor update.

The CLI supports this loop with `debrief --smart`, reviewed `--apply`, `recall`, `receipts`, and `defend`. `fde handoff --out successor.md` creates a new portable, redacted packet. See the [walkthrough](docs/USAGE.md) for examples. Direct CLI write commands execute when invoked; enabled session hooks automatically capture mechanical session state. Agent judgments still need review.

## Your daily fieldbook

![FDEOps dark dashboard showing next actions and attention gaps across three fictional clients](media/fieldbook-preview.png)

*Fictional client records in the built-in dark theme. The report works offline.*

```bash
npx fdeops dashboard --open         # this client
npx fdeops dashboard --all --open   # all clients
```

Filter what needs attention, open a client, and copy **Continue next action**, **Debrief notes**, or **Review outcome** into your agent. The fieldbook is a read-only snapshot: work happens in your agent or CLI, then you regenerate the report. Review confidential information before sharing it with a sponsor or incoming engineer.

## How Skills Work

One entry, one source of methodology, one record per client:

```text
@fde + your situation → one relevant skill → reviewed work → .fde/ → fieldbook
```

**All 30 skills:** Not prompts to choose from. Each reference contains steps, an artifact, and a checkpoint. The [skills guide](docs/skills.md) has three short checklists for day zero, discovery to a small ship, and POC to production. The [full reference](docs/skills-reference.md) covers all stages and overlays.

Optional external sources use MCP connections configured in your agent host. Pull material on request, review its interpretation, then apply it. The CLI does not connect to those services. See [source recipes](mcp/recipes/).

## Engagement memory (`.fde/`)

| Record | What it preserves |
|---|---|
| `context.md` | Current state and next action |
| `brief.md`, `reality.md`, `terrain.md` | Request, observed problem, and system constraints |
| `success.md`, `stakeholders.md`, `trust-profile.md` | Acceptance criteria, people, data policy, and authority |
| `decisions.md`, `risks.md`, `delivery.md` | Choices, unresolved risks, measurements, evidence, and recorded acceptance |

Markdown stays on your machine when you change hosts. Bounded `resume` and topic-based `recall` reduce what enters the active context; omitted history still needs retrieval. See the [record schema](docs/schema.md) and [verification results](docs/verification.md). Passing software tests does not establish reliable judgment from every model.

## Who this is for

FDEs, independent consultants, and solo agencies working inside customer systems. Sponsors and incoming engineers can review the resulting records and reports without learning the skill catalog. FDEOps supports delivery decisions; it does not replace customer authority or operate their infrastructure for you.

## Principles

- Verify the brief before building; keep unknowns explicit.
- Name who can accept which outcome.
- Keep promised, measured, and accepted results separate.
- Prove a small change where the client will operate it, with a tested recovery path.
- Leave a record another engineer can understand and challenge.
- Keep each client separate and confirm the active binding before writing.

## Your data stays yours

The CLI uses local files and Git, with no network or telemetry. Your AI host may send the material it reads to its configured model. CLI, hook, and fieldbook outputs redact `<private>` blocks; do not paste or load raw private blocks with file tools. Follow customer storage policy and review reports before sharing.

[Privacy](PRIVACY.md) · [Security](SECURITY.md)

## Project Structure

Methodology lives in `skills/fde/`; deterministic commands and shared helpers in `bin/`; host entry points in `adapters/` and `hooks/`. `templates/`, `test/`, `evals/`, and `examples/` support the same workflow. The [repository map and documentation index](docs/REPO_LAYOUT.md) explain where to start and where changes belong.

## Contributing

Maintained by **[Subash Natarajan](https://www.linkedin.com/in/subashn/)**. Share an anonymized failure case, a reproducible bug, or a focused improvement through [Issues](https://github.com/suboss87/fdeops/issues) or [Discussions](https://github.com/suboss87/fdeops/discussions).

[Contribution guide](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md)

## License

MIT - use FDEOps on client work. Preserve applicable license notices when redistributing.
