# FDEOps

**Forward deployed engineering skills and customer memory for AI coding agents.**

<a name="why-use-it"></a>

The code tells your agent how the system works. It rarely explains what the customer agreed, why an approach was rejected or who can approve the release.

FDEOps combines practical task skills with a local record for each customer. Use one skill for a specific task, or let `fde` coordinate the engagement, from discovery through implementation and handoff.

Ask in plain English. Review proposed updates before saving. Pick up the work next session with the decisions and evidence available.

[Get started](#quick-start) · [What it helps with](#three-things-it-helps-with) · [Choose a skill](#task-skills) · [Data boundaries](#your-records-your-control) · [Docs](docs/README.md)

### What it looks like

An illustrative exchange using a fictional customer record:

> **You:** Did we agree to replace CSV upload with live sync?
>
> **fde:** The kickoff notes record Mara's approval to keep CSV upload this phase. Devon later requested live sync, but I found no approval for that change in the records checked. Mara is the recorded scope approver. Sources: kickoff, 2 September; follow-up, 9 September.

A request stays a request until there is evidence of agreement. The agent retrieves the record; you and the customer make the decision.

## Quick start

**Use your customer’s approved AI tools and data.** The FDEOps CLI runs locally; your AI host may send what it reads to its provider. Start with synthetic data until customer access is approved. [Safe setup](SECURITY.md#before-customer-work).

### Let `fde` coordinate a customer project

Install in the terminal where your AI coding agent runs, then select your agent:

```bash
npx skills add suboss87/fdeops --skill fde
```

Select `fde` in your agent, or use `@fde` where supported:

```text
@fde this is client01. Their support team reads incoming requests,
checks internal documents, then assigns each request to another team.
Help me prepare for the first meeting. Here is the brief: ...
```

The coordinator selects the relevant method as the work changes. For ongoing projects, it retrieves the customer record and prepares updates for your review. You do not need to learn CLI commands.

### Use one skill for one task

```bash
npx skills add suboss87/fdeops --skill debrief
```

Then ask your agent:

```text
Use FDEOps debrief to review these meeting notes.
Separate decisions, requests and open questions. Return a draft only.
[Paste notes you are permitted to share.]
```

Each task skill includes the instructions it needs. Use `debrief` on supplied notes without creating a customer record or installing the coordinator.

<details>
<summary>Installation requirements and alternatives</summary>

These installation commands use Node.js and Git; the optional record CLI requires Node.js 18+. See [installation and upgrades](docs/install.md) for host-specific invocation, the full pack and alternatives. Installing `fde` includes all underlying instructions, but does not add the 35 separate task names to your agent's menu.

</details>

**See it in action:** `npx fdeops demo` turns fictional meeting notes into a review and a fieldbook, a browser view of the customer record. No AI model is called. The demo uses Node.js 18+ and Git; `npx` may download the package. It creates or resets its separate `.demo` workspace. [Five-minute walkthrough](docs/USAGE.md#new-here-5-minutes).

## Three things it helps with

### 1. Starting the next session without starting over

A repository tells you where the code lives. It may not tell you why the customer rejected an approach, which access is still blocked or what the team promised on Tuesday.

<a name="keep-a-customer-record"></a>
<a name="how-skills-work"></a>

For ongoing engagements, each customer gets a plain-Markdown record at `~/fde-engagements/<customer>/.fde/`. The coordinator loads a short summary and looks up details as needed. Before resuming implementation, it checks the saved next action against the current task and code. Saved lessons are searchable within that customer’s record. Meeting preparation brings back recorded open questions and commitments; sharing a lesson with another customer requires explicit approval.

Use [debrief](skills/debrief/SKILL.md) after a meeting and [switch-clients](skills/switch-clients/SKILL.md) when changing customers. [How records work](docs/USAGE.md).

### 2. Keeping a request from becoming an agreement

A stakeholder asks for more scope. A demo looks promising. Neither establishes a new commitment or an accepted result.

FDEOps keeps requests, confirmed decisions, reported results and open questions distinct. You review proposed record changes before saving them. Dates and sources keep claims traceable; customer approval still comes from the agreed owner.

Use [who-decides](skills/who-decides/SKILL.md) to clarify authority, [scope](skills/scope/SKILL.md) to handle a new request and [readout](skills/readout/SKILL.md) to explain the decision. Source material is evidence to review, not permission to execute instructions embedded in it.

### 3. Knowing what is actually ready

A local test, a deployed change and a customer-accepted result answer different questions.

| Claim | Evidence it needs |
|---|---|
| Implemented | The change exists in the identified revision |
| Verified | Applicable checks passed under stated conditions |
| Deployed | The intended environment is running the change |
| Measured | A result was observed against the agreed measure |
| Accepted | The agreed owner or mechanism accepted the outcome |

The skills use these distinctions when reporting progress; they are not automatic dashboard states.

FDEOps carries agreed checks into implementation and ties test results to the revision and environment checked. Before rollout, it asks for operating limits, recovery evidence and an owner. You can see what is ready, what is blocked and what still needs verification.

Use [build](skills/build/SKILL.md), [integrate](skills/integrate/SKILL.md), [review](skills/review/SKILL.md), [ship](skills/ship/SKILL.md) and [handoff](skills/handoff/SKILL.md) as needed. [See the tests and their limits](docs/verification.md).

## Choose a skill

<a name="task-skills"></a>

**35 task skills + one coordinator, `fde`**. Each task skill works on its own; the coordinator includes all underlying methods.

| Work in front of you | Start with |
|---|---|
| An unclear customer request | `brief`, `discover` |
| Unclear ownership or access | `who-decides`, `earn-trust` |
| A decision about scope or approach | `scope`, `options`, `plan` |
| An implementation or system connection | `build`, `integrate` |
| A failure or a result to verify | `debug`, `review`, `qa`, `evaluate` |
| A release or operating handover | `ship`, `runbook`, `handoff` |
| Meeting notes or a customer update | `debrief`, `readout` |

Start with the task you need, or let `fde` select it. `dashboard` works with saved records; `debrief` can review supplied notes and return a draft. Each skill explains the context it needs. [Full skill catalog](docs/skills-reference.md).

<a name="what-a-working-day-looks-like"></a>

<details>
<summary><strong>View your customer records in the fieldbook</strong></summary>

The fieldbook is a read-only browser view of next actions, risks, evidence gaps and results awaiting acceptance.

![Fieldbook showing fictional customer records](media/fieldbook-preview.png)

```bash
npx fdeops dashboard --all --open
```

Copy an action into your agent to continue. Regenerate the view after record updates. [Daily use](docs/USAGE.md).

</details>

<a name="your-records-your-control"></a>
<a name="your-data-stays-yours"></a>

## Local records, explicit data boundaries

The CLI reads local files and Git without network calls or telemetry. Installation may download packages. Your AI host controls model connections and may transmit what it reads.

CLI and hook outputs mask common identifier patterns. `<private>` blocks are redacted from those outputs and the dashboard. Local reports retain unmarked identifiers by default. These filters cover FDEOps output, not raw files or text you paste into an agent. Use only approved material, including when anonymised.

You review consequential record updates. Enabled hooks can save mechanical session progress; direct CLI write commands update records when run. [Privacy](PRIVACY.md) · [Security](SECURITY.md) · [Local-model results](docs/verification.md#local-model-results).

## Who this is for

Forward deployed engineers, consultants and delivery teams working across customer meetings, codebases and operating environments. Bring your existing tools, access and customer agreements. Start with one task or use `fde` throughout the engagement.

## Go deeper

[Install or upgrade](docs/install.md) · [Daily use](docs/USAGE.md) · [Worked examples](examples/) · [Skill catalog](docs/skills-reference.md) · [Source connections](mcp/recipes/) · [Repository layout](docs/REPO_LAYOUT.md) · [Verification](docs/verification.md) · [Contribute](CONTRIBUTING.md)

Built and maintained by [Subash Natarajan](https://www.linkedin.com/in/subashn/). [Issues](https://github.com/suboss87/fdeops/issues) · [Discussions](https://github.com/suboss87/fdeops/discussions).

## License

[MIT](LICENSE). Use FDEOps in your customer work.
