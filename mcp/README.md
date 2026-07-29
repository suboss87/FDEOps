# FDEOps MCP packages

FDEOps MCP servers follow a **pluggable source model**: core owns the **sink**, sources are **user-added**.

## Sink vs sources

| Role | Owner | Examples |
|------|-------|----------|
| **Source** | FDE configures separately | Granola, Gmail, Notion, custom scrapers |
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

## Adding a source MCP

Source MCPs are **not** bundled in fdeops. To add Granola, Gmail, or another provider:

1. Install or configure that provider's MCP in your Cursor/Claude `mcp.json`.
2. Configure `fdeops-ingest` separately (see [`fdeops-ingest/README.md`](./fdeops-ingest/README.md)).
3. In your daily workflow, the agent uses source tools to fetch, then ingest tools to stage and commit.

FDEOps credentials stay local to the CLI; source MCP credentials stay with that MCP.

## Design reference

See [`docs/plans/2026-07-29-ingest-mcp-design.md`](../docs/plans/2026-07-29-ingest-mcp-design.md) for the approved ingest MCP design.
