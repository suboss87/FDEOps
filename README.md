# FDEOps

**Forward deployed engineering skills for your AI coding agent.**

<a name="why-use-it"></a>

Work through a customer project from the first conversation to a system their team can run. FDEOps helps your agent clarify the problem, compare solutions, write and test code, connect customer systems, and prepare delivery and handover evidence.

A **skill** is a set of instructions your AI coding agent follows. FDEOps includes **35 task skills + one coordinator, `fde`**. Use any skill directly, or ask `fde` to select the relevant skills as a customer project progresses.

Use it for a single integration, a small client project, or work within a larger enterprise team. You bring the customer context, repository tools and access. FDEOps supplies the working method; you and the responsible teams make the decisions.

[Get started](#quick-start) · [Choose a task](#task-skills) · [Keep a customer record](#keep-a-customer-record) · [Documentation](docs/README.md)

<img width="1000" height="586" alt="fdeops-flow" src="https://github.com/user-attachments/assets/12bbec6a-d0b3-4d03-81aa-4b842731a044" />

## Quick start

**Use customer-approved data and AI tools.** The CLI runs locally, but your AI agent may send what it reads to its provider. Masking is partial and does not protect direct file reads or pasted text. If approval is unclear, start with synthetic data. Anonymised customer material still needs permission. See [safe setup and limits](SECURITY.md#before-customer-work).

Use FDEOps with an AI coding agent that supports skills. Start with one task, or let `fde` coordinate a customer project.

Try the fictional engagement first with `npx fdeops demo` (requires Node.js 18+ and Git; may download the package). It creates or resets a separate `.demo` workspace and does not need customer data.

### Work on a customer project

Run this in the terminal where your coding agent runs, then select your agent in the installer:

```bash
npx skills add suboss87/fdeops --skill fde
```

This installation method uses Node.js (which includes `npx`) and Git. If either is missing, ask your agent to help with setup. The FDEOps CLI requires Node.js 18 or later. See [installation options](docs/install.md) for your agent.

Then select `fde` in your agent and start a conversation. In agents that support `@fde`, use:

```text
@fde this is client01. Their support team reads incoming requests,
checks internal documents, then assigns each request to another team.
Help me prepare for the first meeting. Here is the brief: …
```

`fde` asks for the information needed next and uses the relevant instructions. As work progresses, it can help you investigate delays, compare approaches, implement a change, test it, and prepare a customer update. You do not have to choose a skill at each step.

For an ongoing project, naming the customer starts a local record at `~/fde-engagements/client01/.fde/`. It keeps the brief, decisions, evidence and next actions together. Review proposed agreements and corrections before saving them. [How customer records work](#keep-a-customer-record).

### Use just one task

For example, install only `discover`:

```bash
npx skills add suboss87/fdeops --skill discover
```

Then ask your agent:

```text
Use FDEOps discover with these meeting notes. Show how the team handles
an incoming request today, where time goes, and what we still need to ask.
[Paste notes you are permitted to share.]
```

The agent works from your notes and returns its findings. You do not need to create a customer record for this task. Each task skill includes the instructions it needs and works without installing `fde` or another skill pack.

**Want every task available by name?** Install the full pack using the [installation guide](docs/install.md#individual-skills-and-the-full-pack). Installing `fde` alone gives the coordinator all the underlying instructions; it does not add the 35 separate names to your agent's skill menu.

Skill invocation differs between agents. Ask for the FDEOps skill by name or select it in your agent's skill picker. For Claude Code plugin installs, use `/fdeops:fde` or `/fdeops:discover`. See [host setup and name conflicts](docs/install.md#individual-skills-and-the-full-pack).

## Choose a skill

<a name="task-skills"></a>

Use the skill that matches the work in front of you. All skills are individually installable; the [complete catalog](docs/skills-reference.md) lists the input and result for each one.

| You need to… | Start with |
|---|---|
| Clarify a new customer request | `brief` or `discover` |
| Understand who can approve the change | `who-decides` |
| Decide what to build and what to leave out | `options`, `scope` or `plan` |
| Implement or connect customer systems | `build` or `integrate` |
| Find a failure or test the result | `debug`, `review`, `evaluate` or `qa` |
| Prepare an authorized release | `ship` |
| Review meeting notes or report progress | `debrief` or `readout` |
| Prepare the team to run the system | `runbook` or `handoff` |

These examples are starting points, not a required sequence. The catalog also covers inherited projects, business cases, incidents, recovery, source connections and multiple customer records. `fde` uses the same instructions and loads additional detail only when needed.

**Which mode should I choose?** Use an individual skill for a specific task. Use `fde` when you want help selecting the next task or maintaining a continuing customer record. You can also ask it for a one-off result without creating records. Installing a skill makes it available independently; it does not remove its real input requirements. For example, `dashboard` needs records to display, while `debrief` can review pasted notes without saving anything.

<a name="how-skills-work"></a>

## Keep a customer record

An **engagement** is your ongoing project with a customer. Its record lives in a separate folder on your machine, outside the customer's application code:

```text
~/fde-engagements/client01/.fde/
```

The files are readable Markdown. They track what the customer asked for, who can decide, what success means, what changed, and the evidence behind each result. You can inspect, copy or keep them if you stop using FDEOps.

After a meeting, paste permitted notes into the same agent conversation. It proposes the new requests, decisions, unresolved questions and next actions. Correct anything it misunderstood, then confirm the update.

A request is not automatically an agreement. A passing test is not a production deployment. A measured improvement is not customer acceptance. FDEOps keeps those distinctions in the record.

At the next session, the coordinator retrieves a short summary rather than loading the full history. The default summary is capped at 16 KiB; older evidence is retrieved when needed. This cap applies to FDEOps output, not everything your agent loads.

If your agent cannot start the record, run this in your terminal from the workspace where you work on that customer:

```bash
npx fdeops resume --init client01
```

This links that workspace to the customer's record. [Daily use and meeting walkthrough](docs/USAGE.md) · [Record format](docs/schema.md).

<a name="what-a-working-day-looks-like"></a>

## Your daily fieldbook

The fieldbook is a read-only browser view of your customer records. It shows next actions, open risks, missing evidence and results waiting for acceptance.

![FDEOps fieldbook showing next actions and delivery gaps across fictional customers](media/fieldbook-preview.png)

Run this in your terminal to view all your customers:

```bash
npx fdeops dashboard --all --open
```

Open a customer's record and copy an action into your agent to continue. Run the command again after updates to refresh the view.

**Try a fictional example first:** `npx fdeops demo` runs sample meeting notes through review and produces a fieldbook without using an AI model. It creates or resets its demo folder under `~/fde-engagements/.demo/`. Remove that example with `npx fdeops demo --clean`.

## Fit it to the project

Start with the work in front of you:

| Project | How to use FDEOps |
|---|---|
| Small fix or analysis | Give a task skill the relevant notes or code. Get the result and its verification; no customer record is required. |
| Customer integration or ongoing delivery | Use `fde` to connect discovery, implementation, tests and updates in one continuing record. |
| Enterprise engagement | Work within the customer’s existing access, change-control and operating processes. Record who can approve each decision and what evidence they require. |

The pack includes implementation, integration, debugging and QA instructions. It uses the repository's existing tools. It does not supply customer credentials, infrastructure, specialist approvals or production authority.

Optional setup:

- **Personal preferences:** `npx fdeops setup` records how you work and what to mask before sharing context.
- **Repository reconnaissance:** `npx fdeops scan` reads local files and returns an initial assessment and questions. It does not change the repository.
- **Other agent hosts:** [Adapters](adapters/README.md) add a pointer to the coordinator in your workspace.
- **External sources:** [Connection recipes](mcp/recipes/) explain how to pull permitted material from tools you already use.

Use the [installation guide](docs/install.md) for the full pack, Claude Code hooks, offline setup and upgrading from earlier versions.

<a name="your-records-your-control"></a>

## Your data stays yours

The CLI reads local files and Git, with no network calls or telemetry. Installation through `npx` may download packages. Your AI host may send material it reads to its configured model.

FDEOps masks common sensitive patterns and excludes `<private>` blocks from CLI, dashboard and hook outputs. This is not complete sensitive-data detection. Do not ask the agent to read private blocks directly, and use only material allowed by the customer's AI policy.

You review proposed decisions. Enabled session hooks can save mechanical session progress automatically; direct CLI write commands update records when you run them.

[Privacy](PRIVACY.md) · [Security](SECURITY.md) · [What has been tested and its limits](docs/verification.md)

## Who this is for

Forward deployed engineers, consultants and small delivery teams working with customers across meetings, codebases and operating environments. The pack supports the engineering and customer work together. Its checks help expose missing evidence; they do not replace professional judgment or prove every deployment safe.

## Find your way around

| You want to… | Start here |
|---|---|
| Install or upgrade | [Installation](docs/install.md) |
| Work through your first customer project | [Usage](docs/USAGE.md) and [examples](examples/) |
| Explore the instructions | [Skill reference](docs/skills-reference.md) |
| Understand the repository | [Repository layout](docs/REPO_LAYOUT.md) |
| Check the test evidence | [Verification](docs/verification.md) |
| Improve the pack | [Contributing](CONTRIBUTING.md) |

Built by [Subash Natarajan](https://www.linkedin.com/in/subashn/). [Issues](https://github.com/suboss87/fdeops/issues) · [Discussions](https://github.com/suboss87/fdeops/discussions)

## License

MIT. Use FDEOps in your customer work. See [LICENSE](LICENSE).
