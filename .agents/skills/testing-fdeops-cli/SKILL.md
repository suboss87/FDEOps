---
name: testing-fdeops-cli
description: Test the fdeops CLI tool end-to-end. Use when verifying CLI commands, dashboard rendering, adapter installation, or memory system changes.
---

# Testing fdeops CLI - End-to-End

## Overview

fdeops is a local-only CLI tool (Node.js >= 18) with zero network dependencies. Testing requires no credentials, no remote services, no API keys. Everything runs locally.

## Test Environment Setup

1. The repo is at `/home/ubuntu/fdeops-squashed` (or wherever the local clone lives)
2. CLI entry point: `node bin/fde.js <command>`
3. Install entry point: `node bin/install.js <subcommand>`
4. Engagements live at `~/fde-engagements/<name>/.fde/`
5. Dashboard renders to `~/fde-engagements/fieldbook.html`

## Clean Slate

Before testing, remove any prior test engagement:
```bash
rm -rf ~/fde-engagements/acme-robotics  # or whatever test name you use
```

## CLI Commands to Test

| Command | What it does | Key assertion |
|---------|-------------|---------------|
| `node bin/install.js init <name>` | Creates engagement memory | 12 files in `.fde/`, ENGAGEMENT.md pointer |
| `node bin/fde.js scan` | Repo reconnaissance | Shows "FDE RECON" header, "local only" note, STACK/HOTSPOTS sections |
| `node bin/fde.js resume` | Loads engagement context | Requires `FDEOPS_ENGAGEMENT` env var pointing to `.fde/` dir |
| `node bin/fde.js log <type> <text>` | Appends to memory | Types: decision, risk, delivery, contact. Adds `[YYYY-MM-DD]` prefix |
| `node bin/fde.js receipts <term>` | Searches memory | Returns file:line with matching content |
| `node bin/fde.js status` | Portfolio triage | Shows all engagements sorted red > amber > green |
| `node bin/fde.js dashboard` | Renders HTML fieldbook | Creates fieldbook.html, shows engagement count and color breakdown |
| `node bin/install.js adapters <dir>` | Installs cross-platform pointers | Creates AGENTS.md, GEMINI.md, CLAUDE.md, .cursor/rules/fde.mdc, .github/copilot-instructions.md |

## Environment Variable

All commands that operate on a specific engagement require:
```bash
export FDEOPS_ENGAGEMENT=~/fde-engagements/<name>/.fde
```

Or pass inline: `FDEOPS_ENGAGEMENT=~/fde-engagements/<name>/.fde node bin/fde.js resume`

## Validators

Run all 37 internal checks:
```bash
node bin/check.js
```
Expected: 37 "OK:" lines, 0 "FAIL:" lines, exit code 0.

## Dashboard Browser Testing

After `node bin/fde.js dashboard`, open `~/fde-engagements/fieldbook.html` in Chrome:
- Verify card rendering with color-coded status (red/amber/green)
- Test search box filters by engagement name AND memory content
- Expand engagement detail sections to verify full memory renders
- Check privacy redaction: trust-profile private data shows "(private - redacted from dashboard)"

## Common Issues

- `fde scan` requires being run FROM a git repo directory (it reads git log)
- `fde status` reads ALL engagements under `~/fde-engagements/` - existing test data will appear
- `fde log` appends (never overwrites) - running tests multiple times adds duplicate entries
- Dashboard renders ALL engagements, not just the one pointed to by FDEOPS_ENGAGEMENT

## Devin Secrets Needed

None. fdeops is fully local with zero network dependencies.
