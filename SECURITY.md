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

Skills guide **AI coding agent** behavior. What you send to an AI vendor is governed by **that vendor’s** policy. `<private>` content in `trust-profile.md` must never enter prompts - see [docs/schema.md](docs/schema.md).

## Report issues

https://github.com/suboss87/fdeops/security/advisories/new
