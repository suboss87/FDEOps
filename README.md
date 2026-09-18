# FDEOps

**Skills for forward deployed engineers, used through your AI coding agent.**

<a name="why-use-it"></a>

FDEOps helps you turn a customer problem into a working system: clarify the goal, choose an architecture, build and integrate, then verify the result and prepare for rollout.

Use a task skill on its own, or let `fde` coordinate work across strategy, architecture and engineering. Customer memory keeps decisions, evidence and next steps available between sessions.

I built FDEOps around how I approach customer work: start with the real problem, question assumptions, understand the wider system, and test decisions against evidence. The skills bring that approach into your AI coding agent.

[Get started](#quick-start) · [What it helps with](#three-things-it-helps-with) · [Choose a skill](#task-skills) · [Data boundaries](#your-records-your-control) · [Docs](docs/README.md)

## Quick start

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

The coordinator selects the relevant method as the work changes. Customer context guides the plan, code changes and verification; the record carries it between sessions. You do not need to learn CLI commands.

### Use one skill for one task

```bash
npx skills add suboss87/fdeops --skill build
```

Then ask your agent:

```text
Use FDEOps build to add a manual-review fallback to this routing service.
Here are the agreed behavior, repository and checks: ...
```

Each task skill includes the instructions it needs. Use `build` with supplied project context without creating a customer record or installing the coordinator.

<details>
<summary>Installation requirements and alternatives</summary>

These installation commands use Node.js and Git; the optional record CLI requires Node.js 18+. See [installation and upgrades](docs/install.md) for host-specific invocation, the full pack and alternatives. Installing `fde` includes all underlying instructions, but does not add the 35 separate task names to your agent's menu.

</details>

**See it in action:** `npx fdeops demo` turns fictional meeting notes into a review and a fieldbook, a browser view of the customer record. No AI model is called. The demo uses Node.js 18+ and Git; `npx` may download the package. It creates or resets its separate `.demo` workspace. [Five-minute walkthrough](docs/USAGE.md#new-here-5-minutes).

## Three things it helps with

### 1. Strategy: decide what is worth building

Turn the customer’s request into a problem to investigate, a measure of success and a bounded scope. Identify who decides and what evidence would change the plan.

Use [discover](skills/discover/SKILL.md), [who-decides](skills/who-decides/SKILL.md) and [scope](skills/scope/SKILL.md).

### 2. Architecture: choose an approach that fits

Inspect the existing system, compare options against customer constraints and plan a small slice that tests the design. Make dependencies, tradeoffs and failure paths explicit.

Use [options](skills/options/SKILL.md), [plan](skills/plan/SKILL.md) and [integrate](skills/integrate/SKILL.md).

### 3. Engineering: build, verify and hand over

Implement the change, debug failures and test the agreed behavior. Report what passed on which revision and environment, what remains unproven and what the operating team needs before rollout.

Use [build](skills/build/SKILL.md), [debug](skills/debug/SKILL.md), [review](skills/review/SKILL.md), [ship](skills/ship/SKILL.md) and [handoff](skills/handoff/SKILL.md). A passing local test does not establish deployment or customer acceptance. [Verification and its limits](docs/verification.md).

<a name="keep-a-customer-record"></a>
<a name="how-skills-work"></a>

For ongoing work, a local Markdown record at `~/fde-engagements/<customer>/.fde/` carries decisions, evidence and next steps between sessions. The coordinator retrieves relevant context and prepares consequential updates for your review. Use [debrief](skills/debrief/SKILL.md) after meetings and [switch-clients](skills/switch-clients/SKILL.md) when changing customers. [How records work](docs/USAGE.md).

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

Try an individual skill with sample data in your AI coding agent. For customer work, including regulated or production projects, use a customer-approved setup with a local model or an approved LLM provider, and data permitted for that setup. [Setup guidance](SECURITY.md#before-customer-work).

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
