# Security

fdeops stores **engagement-sensitive** material on your machine. Treat `.fde/` like confidential work papers.

## Before customer work

**Use customer-approved data and AI tools.** The CLI runs locally, but your AI agent may send what it reads to its provider. Masking is partial and does not protect direct file reads or pasted text. If approval is unclear, start with synthetic data. Anonymised customer material still needs permission.

- Use an approved AI host, model provider and deployment configuration. A local CLI does not make the model local.
- Restrict host file access and connectors to the authorised engagement. Enforce outbound access and external-write permissions in the host or infrastructure; skills are not a sandbox.
- Keep credentials in approved secret storage. Keep `.fde/`, `.inbox/`, exports and the reversible `.privacy/` dictionary out of shared repositories and unapproved sync or backups. These files are not encrypted by FDEOps.
- Review prepared outputs before sharing. Names, business details and identifying context may remain even after masking. Reports can include multiple customers unless you select the current one.
- Start with `npx fdeops demo` to inspect fictional inputs and outputs before introducing permitted customer material.

FDEOps does not certify regulatory compliance, enforce provider retention settings, or prevent an agent from reading files outside its prepared context. Customer security review and host controls remain necessary. See [privacy behaviour](PRIVACY.md) and [verification limits](docs/verification.md).

## Never commit engagement data

- Default: `~/fde-engagements/<name>/.fde/` - outside shared repositories.
- In-workspace `.fde/` only with explicit approval and `.gitignore`.
- No real client names, credentials, or `<private>` blocks in issues or PRs.

If `.fde/` was committed: treat as a data incident - purge history, notify per your contract.

## Install boundary

Install and `fdeops init` on **your** environment only. Do not require clients or platform teams to run fdeops on their infrastructure.

## AI providers

Skills guide **AI coding agent** behavior. What you send to an AI vendor is governed by **that vendor’s** policy. `<private>` content is redacted from CLI/dashboard/hook outputs; do not paste raw private blocks into prompts - see [docs/schema.md](docs/schema.md).

## Reporting a vulnerability

**Email `suboss87@gmail.com` with `[fdeops security]` in the subject.** This channel works today and is the one to use if anything else fails.

If the repository's private reporting is enabled, [GitHub Security Advisories](https://github.com/suboss87/fdeops/security/advisories/new) is equally fine - it keeps the thread and the fix in one place. That page 403s when private reporting is off, so it is a second option, never the only one.

Please include: affected version (the `version` in `package.json`, or the commit), the exact commands, what you expected versus what happened, and the impact. Reduced test cases help more than write-ups.

**Never include real client material** - no client names, credentials, or `<private>` content. Redact, or describe the shape of the data instead.

What to expect: acknowledgement within 5 days, an assessment with a fix or a reasoned decline within 30, credit in the release notes unless you prefer otherwise. This is a solo-maintained MIT project, not a funded program - there is no bounty, and those are targets rather than guarantees.

### In scope

Leaks through FDEOps-controlled preparation: protected `<private>` content appearing in prepared CLI, dashboard, hook or ingest MCP outputs, or being copied into public fields of structured records; engagement memory leaking between clients; the installer or CLI destroying or exfiltrating data; a write applied without human confirmation; the CLI reaching the network.

### Out of scope

Whatever an AI vendor does with what you send it (see **AI providers** above); a machine that is already compromised; a `.fde/` you have deliberately committed to a shared repository; anything requiring the ability to write files as your own user.
