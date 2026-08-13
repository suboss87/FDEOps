# FDEOps MCP packages

FDEOps MCP servers follow a **pluggable source model**: core owns the **sink**, sources are **user-added**.

## Sink vs sources

| Role | Owner | Examples |
|------|-------|----------|
| **Source** | FDE configures separately | Granola, Slack, Notion, Gmail, file |
| **Sink** | FDEOps (`fdeops-ingest`) | stage → propose → apply into engagement memory |

Source MCPs fetch raw text from SaaS APIs using credentials the FDE manages. The ingest MCP never stores OAuth tokens or calls external services — it only shells out to the local `fde` CLI.

## Ground loop

```
Source MCP(s)          fdeops-ingest MCP           fde CLI
     │                        │                      │
     │  raw transcript/email  │                      │
     └───────────────────────►│  ingest_stage        │
                              ├─────────────────────►│  .inbox/
                              │  ingest_list         │
                              │  ingest_propose      ├─► .debrief-propose
                              │  (FDE confirms)      │
                              │  ingest_apply        ├─► .fde/
```

1. Agent pulls from whichever source MCPs are configured.
2. Agent stages raw content via `ingest_stage` (with `source` provenance).
3. Agent proposes routing via `ingest_propose`; FDE confirms.
4. Agent applies via `ingest_apply` — nothing writes `.fde/` unreviewed.

## Packages

| Package | Path | Purpose |
|---------|------|---------|
| `fdeops-ingest-mcp` | [`fdeops-ingest/`](./fdeops-ingest/) | Ingest sink (stage, list, propose, apply) |

## Recipes (copy-paste connect)

See [`recipes/`](./recipes/) for file, Granola-shaped, and Notion-shaped setup. In chat: `@fde I want to connect Granola` → skill `ingest-connect` walks the FDE through config + reload + verify.

## Adding a source MCP

Source MCPs are **not** bundled in fdeops. To add Granola, Gmail, or another provider:

1. Install or configure that provider's MCP in your Cursor/Claude `mcp.json`.
2. Configure `fdeops-ingest` separately (see [`fdeops-ingest/README.md`](./fdeops-ingest/README.md)).
3. In your daily workflow, the agent uses source tools to fetch, then ingest tools to stage and commit.

FDEOps credentials stay local to the CLI; source MCP credentials stay with that MCP.

**Non-goals:** no bundled OAuth/connectors, no ambient sync, no unreviewed writes to `.fde/`. Method: [`skills/fde/references/ingest.md`](../skills/fde/references/ingest.md).
