# Recipe: Notion docs / meeting notes

**Use when:** useful engagement notes live in Notion. FDEOps does not ship a Notion server - use a Notion MCP (or export markdown). We do not write back to Notion.

## Setup (once)

1. Enable a **Notion MCP** (official or community) with a token that can **read** the pages you need.
2. Reload MCP / restart host.
3. Test: `@fde what can you pull?`

The sink is **`fde ingest` in this bound workspace.** `fdeops-ingest` MCP is optional.

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

1. Capability check - Notion read tools present?
2. Fetch page/block text (ask which page if ambiguous).
3. `fde ingest stage --source notion --title "<short>"` → propose → confirm → apply.

## Never

- Create or edit Notion pages from FDEOps.
- Ambient-sync a database.

## Common fails

| Symptom | Fix |
|---------|-----|
| 401 / forbidden | Token lacks access to that workspace/page |
| Huge page dump | Stage full text in `.inbox/`; apply only short dated facts |
| Wrong engagement | Bind this workspace before staging |
