# FDEOps

**Forward deployed engineering skills for AI coding agents.**

<a name="why-use-it"></a>

You're on a customer site. The AI coding agent writes code in their repo. This kit is the work around that code: the brief, who can say yes, proof on their staging then live, whether they signed off, whether they can run it after you leave.

Notes stay on your laptop, in a separate record for each client. Review the agent's proposed changes before saving them.

Keep the coding pack you already use. FDEOps adds the client brief, decisions, and evidence around that work.

[Quick start](#quick-start) · [Daily fieldbook](#your-daily-fieldbook) · [30 skills](#all-30-skills) · [Documentation](docs/README.md)

<img width="960" height="640" alt="FDEOps: client delivery from the first meeting to handover" src="https://github.com/user-attachments/assets/2bcb8739-55ee-445d-8a1a-8b38433b7b58" />

---

## Quick Start

**Try it in a local checkout.** Requires Node.js 18+ and Git:

```bash
npx fdeops scan
```

It prints what to look at on day one and the questions to ask. The scan reads local files without changing them. `npx` may download the package.

**Then install the skill:**

```bash
npx skills add suboss87/fdeops --skill fde
```

One chat. Name the client:

```text
@fde this is client01
```

That creates `~/fde-engagements/client01/.fde/` on your laptop. Paste kickoff notes in the same thread. `@fde` picks what to check. You still decide. After a meeting you review what changed, new asks, open questions, and next actions. Correct the proposal, then confirm the update.

Open the engagement fieldbook:

```bash
npx fdeops dashboard --open
```

Read-only HTML of the record - promised, measured, accepted, and evidence. Regenerate after you change memory. Day to day: [docs/USAGE.md](docs/USAGE.md).

<details>
<summary><b>Claude Code</b></summary>

```text
/plugin marketplace add suboss87/fdeops
/plugin install fdeops@fdeops
```

The plugin adds session hooks and the slash commands below. Skill-only installation does not add hooks. See the [installation guide](docs/install.md) for setup details.

</details>

<details>
<summary><b>Cursor</b></summary>

After installing the skill, add the FDEOps instructions to the **client workspace** you have open:

```bash
npx fdeops adapters .
```

See [adapters/](adapters/README.md).

</details>

<details>
<summary><b>Codex, other agents, and offline setup</b></summary>

Use the skill installation above in a supported host. If the agent cannot create and bind the client folder, run this from the client workspace:

```bash
npx fdeops resume --init client01
```

For offline use, transfer an existing checkout to a machine with Node.js and Git, then run `node bin/install.js` from that checkout. Host adapters, local models, and advanced options are covered in [docs/install.md](docs/install.md).

</details>


<a name="what-a-working-day-looks-like"></a>

## Your daily fieldbook

See what needs your attention before you open another client thread: an open risk, missing evidence, a result waiting for acceptance, or the next action.

![Dark FDEOps fieldbook showing next actions and delivery gaps across fictional clients](media/fieldbook-preview.png)

```bash
npx fdeops dashboard --all --open
```

Open a client, inspect its record, and copy an action into your agent to continue. The dashboard is a read-only snapshot; repeat the command after updating your records to refresh it.

**Want to see the whole loop first?** `npx fdeops demo` runs fictional notes through review and prints a sample fieldbook path to open. It writes and resets its own folder under `~/fde-engagements/.demo/`, needs no AI model, and can be removed with `npx fdeops demo --clean`.

⭐ If FDEOps makes your client work easier, star the repo.

---

<a name="from-the-first-meeting-to-handover"></a>

## Commands

Describe the situation to `@fde`. It selects the relevant skill. The Claude Code plugin also provides these stage commands; other hosts use the same method through `@fde`.

| What you're doing | Command | Stage |
|-------------------|---------|-------|
| First days. Get the brief. Name who signs. | `/brief` | Land |
| Check the brief is the real job. | `/discover` | Discover |
| Sequence from done, not from the ticket. | `/plan` | Plan |
| Prove it on their staging, then go live. | `/ship` | Ship |
| What you promised, measured, and who accepted. | `/outcome` | Outcome |
| Hand it over. They run it without you. | `/close` | Close |

Claude Code shortcuts for the moments between stages: `/debrief` (notes into the record), `/prep` (one page before you walk in), `/trust` (process gap, or they stopped trusting you), `/receipts` (find what was recorded and where it came from), `/readout` (Friday page for the sponsor; not a seventh stage).

You can also just say it: “Prep me for the sponsor meeting,” “What did we agree about scope?” or “Help me hand this over.”

---

## All 30 Skills

Thirty situations, grouped by stage. Each skill gives the agent steps to follow, a record or report to produce, and a checkpoint with you. You describe the work; `@fde` finds the skill.

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
| [dashboard](skills/fde/references/dashboard.md) | Open the fieldbook | This customer, or all of them |
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

<a name="use-the-cli-directly"></a>

## How Skills Work

One `@fde`. One file per situation. One folder per client.

Tell the agent what is happening. It reads the client record, opens the relevant skill, and works through the situation with you. After a meeting, it proposes the decisions, open questions, and next action. You correct what it misunderstood and confirm the update.

A request stays a request until agreed. A staging result stays separate from production. Recording a result does not mean the customer accepted it.

At the next session, FDEOps supplies a short summary instead of the whole history. Older detail stays on disk; `recall` finds relevant records when needed. The default summary is capped at 16 KiB, which limits FDEOps output rather than everything your agent loads.

Before a sponsor meeting, `npx fdeops defend` separates recorded acceptance from claims and missing evidence. For a successor, `npx fdeops handoff --out successor.md` creates a portable summary with risks and sources.

For free-form notes, start with `@fde`. The CLI's `debrief --smart` recognizes common phrases; it can miss details that your agent needs to help interpret. [Follow the notes → review → apply walkthrough](docs/USAGE.md#new-here-5-minutes).

---

## Engagement memory (`.fde/`)

One folder per client. Plain markdown. Grep it, copy it, take it into a meeting.

| File | Holds |
|------|-------|
| `context.md` | Where you are |
| `brief.md` / `success.md` | What they asked; what “done” is and who signs |
| `reality.md` / `terrain.md` | The real problem; the map |
| `stakeholders.md` | `[signal:green\|amber\|red]` - worst active signal wins; empty is **new**, not green |
| `trust-profile.md` | Sacred data, AI policy, approval chain |
| `decisions.md` / `risks.md` / `delivery.md` | Dated choices; live risks; what shipped, evidence, rollback, acceptance |

Schema: [docs/schema.md](docs/schema.md). Fieldbook: `npx fdeops dashboard --open` (bound) or `--all --open` (portfolio).

---

## Who this is for

Forward deployed engineers, independent consultants, and small agencies working with customer teams. You need to carry the brief, decisions, delivery evidence, and handover across meetings, repositories, and sometimes several clients.

If your work has no client commitments or operating handover to track, a simpler project note may be enough.

<a name="your-records-your-control"></a>

## Your data stays yours

The CLI works with local files and Git, without network calls or telemetry. Client records remain readable Markdown if you stop using FDEOps.

Your AI host may send the material it reads to its configured model. CLI context and smart proposals mask common email, phone, SSN-shaped, and credential patterns locally; this is not complete PII detection. FDEOps redacts `<private>` blocks from CLI, dashboard, and hook outputs; do not load those raw blocks through the agent's file tools. Review reports before sharing client information.

You review proposed decisions. Enabled session hooks can save where the session left off automatically; direct CLI write commands update records when you run them.

The CLI and dashboard need no model. AI-assisted local use needs an agent with file and command access. Our small local-model tests produced wrong or incomplete answers, so check the [verification results](docs/verification.md) before relying on one for client work.

[Privacy](PRIVACY.md) · [Security](SECURITY.md)

## Principles

- **Who signs** - name who can accept the work.
- **Brief vs real job** - check what happens on the floor, not only the slide.
- **Back from done** - agree how you will test success before planning the build.
- **Their staging, then live** - prove the change and agree the release and rollback.
- **Promised, measured, accepted** - keep each separate, with its evidence.
- **They run it** - hand over the knowledge and ownership, not just the code.
- **The kit says what to check. You still decide.**

---

<a name="find-your-way-around"></a>

## Project Structure

| You want to… | Start here |
|---|---|
| Install or use FDEOps | [docs/](docs/README.md) |
| Understand or change a workflow | [skills/fde/](skills/fde/SKILL.md) and its `references/` |
| Work on the CLI or fieldbook | [bin/](bin/) and [test/](test/) |
| Walk through a client engagement | [examples/](examples/) |
| Check what has been tested | [evals/](evals/) and [verification](docs/verification.md) |

[Full repository map](docs/REPO_LAYOUT.md).

---

<a name="contribute"></a>

## Contributing

**[Subash Natarajan](https://www.linkedin.com/in/subashn/)**. [Issues](https://github.com/suboss87/fdeops/issues) · [Discussions](https://github.com/suboss87/fdeops/discussions) · [CONTRIBUTING.md](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md)

Skills should be **specific** (actionable steps), **verifiable** (an artifact in `.fde/`), and **minimal**. The `fde` CLI stays local-only.

## License

MIT - use these skills on client work.
