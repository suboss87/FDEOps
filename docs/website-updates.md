# Website update brief

For the designer maintaining fdeops.io. This document proposes copy and acceptance checks; it does not mean the website has been changed. Match the published package's behavior before publishing commands or screenshots from a newer checkout.

## Home page

**Heading:** One client record, from first meeting to handover.

**Description:** FDEOps helps Forward Deployed Engineers and independent experts keep client decisions, delivery evidence, acceptance, and next actions together. Work with one `@fde` skill and a local CLI. Review one client or your portfolio in a read-only dashboard.

**Primary action:** Get started → `/get-started`.

**Secondary action:** View the walkthrough → the repository's `docs/USAGE.md`.

Show a fictional engagement with an agreed target, a measured result, its evidence, and pending acceptance. Label the screenshot “Fictional example.” Include the dashboard generation date. Show how a user returns to their agent with a suggested next action; do not imply dashboard buttons can edit records or run tools.

## Getting started

Keep the default path to three steps:

1. **Install one skill:** `npx skills add suboss87/fdeops --skill fde`.
2. **Name the client in the agent:** `@fde this is client01`. The agent creates and binds the engagement. Terminal fallback from the client workspace: `npx fdeops resume --init client01`.
3. **Review the record:** after confirming a proposed update, run `npx fdeops dashboard --open`. Regenerate the report when records change.

State requirements beside the first command: Node.js 18+, Git, and a supported AI coding host. Package downloads require network access; the CLI's engagement commands operate locally.

Provide a separate “Try with fictional data” option: `npx fdeops demo`. Explain that it creates records and HTML in `~/fde-engagements/.demo/`, resets that sandbox on each run, and needs no AI account. Cleanup: `npx fdeops demo --clean`.

In host tabs:

| Host | Instructions and exact limitation |
|---|---|
| Claude Code | Show both `/plugin marketplace add suboss87/fdeops` and `/plugin install fdeops@fdeops`. The plugin registers session hooks and slash commands. |
| Codex, Cursor, Gemini, Copilot | Show skill installation and `npx fdeops adapters /path/to/client-workspace`. Adapters write local instruction pointers. Automatic Claude session hooks are not enabled by a skill-only install. |
| Offline | Transfer a checkout onto a machine with Node.js and Git, enter the checkout, then run `node bin/install.js`. A GitHub clone or `npx` download is not an offline step. |

Do not present adding a marketplace as a complete plugin installation. Link all host tabs to `docs/install.md` for current details instead of duplicating advanced setup.

## Dashboard and integrations

Use “Local report” or “Read-only dashboard.” State: “Open one client or all clients. Inspect commitments, evidence, risks, and next actions. Copy a follow-up prompt into your agent. Regenerate after updates.”

Show `npx fdeops dashboard --all --open` as the portfolio command. Do not advertise an editable workspace, live synchronization, or dashboard MCP execution: these are not current capabilities.

For integrations, state: “Configure a source MCP in your AI host. Ask the agent to pull material, review its interpretation, then apply it to the client record.” Distinguish user-configured source connections from the optional local ingest MCP wrapper. There is no bundled universal connector or automatic source sync.

## Comparison page

Organize around jobs the user needs done: client discovery, decision history, delivery evidence, explicit acceptance, multiple engagements, and handover. Describe FDEOps using links to actual commands, records, or walkthroughs.

For every alternative already listed, verify each capability against its current official documentation and date the review. Use “Not verified” when evidence is unavailable. Avoid blanket claims that other tools lack memory, that FDEOps replaces a delivery team, or that it is best in class. Explain complementary use with existing coding workflows in plain language.

## Data and approval language

Use: “Records stay in local Markdown. The CLI does not use the network. Your AI host may send the material it reads to its configured model provider. CLI, hook, and report outputs redact `<private>` blocks; do not paste or load raw private blocks into your model.”

Use: “Review proposed judgments before saving. Direct commands write when invoked; enabled session hooks capture mechanical session state automatically. Saving a note is not customer approval.”

Generated reports may still be confidential. Avoid “nothing leaves your machine” for the entire AI workflow and “nothing is written without confirmation” for every operation.

## Before publishing

- Copy each command from the rendered page and exercise it in a disposable workspace using the published version.
- Follow each host tab from installation to a bound client and readable report. Record whether hooks were actually registered and tested.
- Test desktop and a 390px mobile viewport. Tables should scroll within their container; command copy buttons must preserve complete commands.
- Check navigation, documentation links, screenshots, console errors, and the full first-use journey in a real browser.
- Keep fictional targets separate from measured customer results. Publish usage or performance claims only with supporting evidence.
