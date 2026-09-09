# FDEOps

**Turn a customer request into the smallest useful delivery - and keep the evidence that it worked.**

FDEOps gives your AI coding agent a method for customer delivery: investigate the request, agree what success means, carry decisions into implementation, and prepare a handoff the customer can operate.

One `@fde` skill routes 30 field situations. A local CLI keeps dated records in a separate folder for each customer. An offline fieldbook makes those records easy to review before the next meeting.

Keep your existing coding skills. FDEOps supplies the customer context, scope, approvals, and acceptance criteria around their engineering work.

[Quick start](#quick-start) · [Daily workflow](#your-daily-workflow) · [30 skills](#all-30-skills) · [Usage guide](docs/USAGE.md) · [Install options](docs/install.md)

## What you get

| Start with | Work with your agent toward | Keep on the record |
|---|---|---|
| A customer request and an unfamiliar repository | An evidence-backed problem statement and the smallest useful increment | Brief, constraints, open questions, success criteria |
| Meeting notes and changing requirements | Reviewed decisions, owners, scope changes, and next actions | Dated customer-specific memory |
| A shipped change | A readout that distinguishes promised, measured, and accepted results | Delivery evidence, acceptance status, operating handoff |

For example: a customer asks for an AI reconciliation agent by Friday. FDEOps guides your agent to inspect the existing workflow, distinguish the requested solution from the underlying problem, and establish a baseline and acceptance owner. An existing integration may be enough. The evidence should determine the plan.

This is a workflow you carry out with your agent; the CLI does not diagnose a repository or validate customer outcomes by itself.

## Commands

One command per stage. Skills load automatically through `@fde`.

Use natural language with `@fde` in any supported host. The Claude Code plugin also provides these slash commands. The lifecycle is **Land → Discover → Plan → Ship → Outcome → Close**; your agent routes the situation to the relevant step.

| What you need | Command | Stage |
|---|---|---|
| Establish the brief and who accepts success | `/brief` | Land |
| Check the problem against the actual workflow | `/discover` | Discover |
| Sequence the smallest useful delivery from acceptance backward | `/plan` | Plan |
| Verify on customer staging and prepare the approved release | `/ship` | Ship |
| Separate promised, measured, and accepted results | `/outcome` | Outcome |
| Transfer operations and confirm the handoff | `/close` | Close |

For recurring work: `/debrief`, `/prep`, `/trust`, `/receipts`, and `/readout`. A sponsor readout is an Outcome workflow, not an additional lifecycle stage.

## Quick Start

Requires **Node.js 18+** and Git for versioned engagement memory. Install on your own machine, where you run your coding agent.

### 1. See the workflow with fictional data

```bash
npx fdeops demo
```

The demo creates a fictional Acme payments engagement, reviews and applies sample notes, retrieves a dated decision, prepares a meeting brief, and generates an HTML fieldbook. Open the file path printed at the end.

It runs real local commands in `~/fde-engagements/.demo/`. Re-running resets that demo; `npx fdeops demo --clean` removes it. Your real engagements are separate. No AI account is required for this CLI walkthrough. The first `npx` invocation may download the package; the CLI itself makes no network requests.

Want repository reconnaissance first? Run `npx fdeops scan` in a repository. It reads local files and Git state, prints findings and questions, and writes nothing.

### 2. Install the agent skill

```bash
npx skills add suboss87/fdeops --skill fde
```

In your coding agent, with the customer workspace open:

```text
@fde this is client01. The customer wants to reduce manual order
reconciliation. Inspect the relevant workflow before asking questions.
Help me define the smallest useful increment and how we will prove it worked.
```

Your agent sets up `~/fde-engagements/client01/.fde/` and binds the workspace to that engagement. It routes to the relevant skill, investigates the available context, and reviews judgment-based changes with you. Unknown baselines and approvals should remain unknown until confirmed.

If setup needs a terminal fallback, run `npx fdeops resume --init client01` from the customer workspace. This creates the engagement record and binds that workspace; running it with another client replaces the binding.

### 3. Start the daily loop

```text
@fde Debrief: <meeting notes>
@fde Prep me for the next customer meeting.
@fde Draft a readout. Separate what we promised, measured, and the customer accepted.
```

Open your engagement's fieldbook:

```bash
npx fdeops dashboard --open
```

Continue with the [five-minute walkthrough and daily guide](docs/USAGE.md).

<details>
<summary><b>Claude Code plugin</b></summary>

```text
/plugin marketplace add suboss87/fdeops
/plugin install fdeops@fdeops
```

Includes slash commands and session hooks. The plugin does not add a bare `fde` command to your shell; use `npx fdeops <command>` or install the CLI globally. [Install details](docs/install.md).

</details>

<details>
<summary><b>Cursor, Codex, Gemini CLI, and Copilot</b></summary>

After installing the skill, run this in the customer workspace to add host pointers:

```bash
npx fdeops adapters .
```

Adapters point at the same skill rather than copying its method. This command adds instruction files to the workspace; review them as you would other repository changes. Session hooks are Claude Code-first; other hosts use the skill and CLI on demand. [Adapters](adapters/README.md).

</details>

<details>
<summary><b>Install from a checkout / offline preparation</b></summary>

On a connected machine:

```bash
git clone https://github.com/suboss87/fdeops.git
cd fdeops
node bin/install.js
```

For an offline machine, transfer the checkout first, then run `node bin/install.js` there. The installer copies the skill and hooks into your local Claude directories. [Install options and overrides](docs/install.md).

</details>

## Your daily workflow

| When | In your agent | In the fieldbook |
|---|---|---|
| Start the day | `@fde Where did we leave off with this client?` | Review the next action, risks, and gaps needing attention |
| Before a meeting | `@fde Prep me for the sponsor check-in.` | Review the brief, stakeholders, and recent decisions |
| After a meeting | `@fde Debrief: <notes>` | Regenerate after reviewing and applying the changes |
| Before reporting value | `@fde Draft the customer readout with evidence and unresolved gaps.` | Check the promised → measured → accepted ledger |

`npx fdeops dashboard --all --open` shows every engagement. The fieldbook is a **read-only snapshot**, with search, engagement views, and prompts you can copy into your agent for follow-up work. It does not run the agent or edit memory. Regenerate it after changing the record; the generation date tells you how fresh it is.

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

```text
Customer request + repository + available notes
                    ↓
@fde → one relevant reference → investigation and proposed next step
                    ↓
You review judgment, scope, and commitments
                    ↓
Local CLI + customer-specific .fde/ records
                    ↓
Meeting prep · dated receipts · offline fieldbook · customer readout
```

The method lives once in [`skills/fde/SKILL.md`](skills/fde/SKILL.md) and its references. Adapters point to it. The CLI handles deterministic file operations, dates, gates, and output redaction. Your coding agent supplies interpretation; you retain responsibility for decisions and customer approval.

Agent-proposed judgments are reviewed before they enter the record. Setup, explicitly invoked CLI writes, and configured session hooks can write local files without a separate chat confirmation. [Operating rules](docs/OPERATIONS.md).

## Engagement memory (`.fde/`)

One folder per client, stored by default at `~/fde-engagements/<client>/.fde/`. Plain Markdown and local Git history keep the record portable across supported agent hosts.

| File | What it answers |
|---|---|
| `context.md` | Where are we, and what happens next? |
| `brief.md` / `success.md` | What did the customer request; what counts as success; who accepts it? |
| `reality.md` / `terrain.md` | What did investigation reveal? |
| `stakeholders.md` / `trust-profile.md` | Who is involved; what access and approval constraints apply? |
| `decisions.md` / `risks.md` | What changed, why, and what could block delivery? |
| `delivery.md` | What shipped; what evidence, rollback, and acceptance were recorded? |

Memory stores what you recorded. A dated note is evidence of that record, not independent proof that a result occurred or that a customer approved it. Keep supporting sources and explicit uncertainty with the claim.

Use `FDEOPS_ENGAGEMENTS_ROOT` to change the storage root or `FDEOPS_ENGAGEMENT` for an explicit engagement override. See [install options](docs/install.md#advanced-engagement-overrides).

[Memory schema](docs/schema.md) · [Multi-client usage](docs/USAGE.md#multiple-engagements)

## Principles

- Investigate the actual workflow before committing to a solution.
- Define a small useful increment, a success criterion, and an acceptance owner.
- Keep observations, assumptions, and customer decisions distinguishable.
- Verify the result in the customer environment and preserve its evidence.
- Separate promised, measured, and accepted outcomes.
- Hand over something the customer can operate; keep each customer's record separate.

## Who this is for

Forward deployed engineers, technical consultants, and solutions engineers working with a customer team that must accept and operate the result. Especially useful when you return across sessions or switch between several engagements.

FDEOps adds customer-delivery workflows to your existing coding tools. It does not replace code review, engineering tests, customer relationships, or your organization's release process. It does not provide hosted synchronization or a CRM.

## Your data stays yours

- **CLI:** local Git and file operations; no network requests or telemetry. Package installation can require network access.
- **Agent:** your chosen host model sees the context and code you give it. Local storage does not make a cloud-hosted model local.
- **Private notes:** `<private>` blocks are redacted from CLI, dashboard, and hook outputs. Do not open raw private blocks with agent file tools or paste them into chat.
- **Storage:** customer records live outside the customer repository by default. Keep the engagement folder out of shared Git and cloud-synced folders unless your customer policy permits them.
- **Integrations:** optional source MCPs pull on request through your host. They have their own permissions and data boundaries; the CLI does not push to external services.

[PRIVACY.md](PRIVACY.md) · [SECURITY.md](SECURITY.md)

## Quality and contributing

The repository includes deterministic CLI tests, structural checks, and skill-routing evaluations. These verify defined behaviors; they are not a claim of measured customer productivity or fully autonomous delivery.

From a checkout:

```bash
npm run check
npm run test:skill-routing
```

Live routing evaluation depends on the configured provider; inspect the output for skipped live checks. See [`evals/`](evals/) for scenarios and [`docs/REPO_LAYOUT.md`](docs/REPO_LAYOUT.md) for the code layout.

Maintained by **[Subash Natarajan](https://www.linkedin.com/in/subashn/)**. Share bugs and anonymized field situations through [Issues](https://github.com/suboss87/fdeops/issues) or [Discussions](https://github.com/suboss87/fdeops/discussions). Keep customer data out of contributions.

[CONTRIBUTING.md](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md)

## License

[MIT](LICENSE)  -  use these skills on client work.
