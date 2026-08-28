# Security

fdeops stores **engagement-sensitive** material on your machine. Treat `.fde/` like confidential work papers.

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

Anything that breaks the guarantees fdeops makes: `<private>` content reaching a model, a dashboard, a hook, an MCP response, or a structured memory file; engagement memory leaking between clients; the installer or CLI destroying or exfiltrating data; a write applied without human confirmation; the CLI reaching the network.

### Out of scope

Whatever an AI vendor does with what you send it (see **AI providers** above); a machine that is already compromised; a `.fde/` you have deliberately committed to a shared repository; anything requiring the ability to write files as your own user.
