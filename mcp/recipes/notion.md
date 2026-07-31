# Recipe: Notion docs / meeting notes

**Use when:** useful engagement notes live in Notion. FDEOps does not ship a Notion server — use a Notion MCP (or export markdown).

## Setup (once)

1. Enable a **Notion MCP** (official or community) with a token that can read the pages you need.
2. Add **fdeops-ingest** sink — [../fdeops-ingest/README.md](../fdeops-ingest/README.md).
3. Reload MCP / restart host.
4. Test: `@fde what can you pull?`

### Example mcp.json shape (illustrative)

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "YOUR-NOTION-MCP-PACKAGE"],
      "env": {
        "NOTION_TOKEN": "from-your-secrets"
      }
    },
    "fdeops-ingest": {
      "command": "node",
      "args": ["/absolute/path/to/fdeops/mcp/fdeops-ingest/server.js"],
      "env": {
        "FDEOPS_ENGAGEMENT": "/Users/you/fde-engagements/acme/.fde"
      }
    }
  }
}
```

**No Notion MCP?** Export page to markdown → [file.md](./file.md).

## Pull phrase

```text
@fde pull the Acme discovery notes Notion page into the fieldbook
```

## Agent steps

1. Capability check — Notion tools present?
2. Fetch page/block text via Notion MCP (ask which page if ambiguous).
3. Stage with `--source notion`.
4. Propose → confirm → apply.

## Common fails

| Symptom | Fix |
|---------|-----|
| 401 / forbidden | Token lacks access to that workspace/page |
| Huge page dump | Stage full text in `.inbox/`; propose only short dated facts |
| Wrong engagement | Bind / `FDEOPS_ENGAGEMENT` |
