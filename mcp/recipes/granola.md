# Recipe: Granola-shaped meeting transcripts

**Use when:** meeting notes live in Granola (or a similar notes MCP). FDEOps does not ship a Granola server — you add whichever MCP/export path you trust.

## Setup (once)

1. Install / enable a **Granola (or notes) MCP** in Cursor/Claude per that product’s docs.
2. Add the FDEOps **sink** MCP (`fdeops-ingest`) — [../fdeops-ingest/README.md](../fdeops-ingest/README.md).
3. Reload MCP / restart the agent host.
4. Test: `@fde what can you pull?` — agent should see both sink tools and the notes source tools.

### Example mcp.json shape (illustrative)

Replace `granola-mcp` command/args with whatever the real server documents. FDEOps only needs *some* tool that returns transcript text.

```json
{
  "mcpServers": {
    "granola": {
      "command": "npx",
      "args": ["-y", "YOUR-GRANOLA-MCP-PACKAGE"],
      "env": {
        "GRANOLA_API_KEY": "from-your-secrets"
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

**No Granola MCP available?** Export transcript to a file → follow [file.md](./file.md).

## Pull phrase

```text
@fde pull today's Acme Granola into the fieldbook
```

## Agent steps

1. Capability check — if no notes/Granola tools, run connect flow (`ingest-connect.md`).
2. Fetch transcript via source MCP (or ask which meeting).
3. `ingest_stage` / `fde ingest stage --source granola --title "…"`.
4. Propose → confirm → apply. Never auto-apply.

## Common fails

| Symptom | Fix |
|---------|-----|
| Agent says it can’t reach Granola | MCP not saved / host not reloaded / wrong env key |
| Wrong client inbox | Set `FDEOPS_ENGAGEMENT` or bind workspace (`fde resume --init`) |
| Empty propose | Agent must rewrite `.debrief-propose` with type prefixes |
