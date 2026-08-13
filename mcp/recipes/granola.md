# Recipe: Granola-shaped meeting transcripts

**Use when:** meeting notes live in Granola (or a similar notes MCP). FDEOps does not ship a Granola server — you add whichever MCP/export path you trust.

Daily path if the notes are already in chat or on disk: paste to `@fde debrief` or [file.md](./file.md). This recipe is only for **pull**.

## Setup (once)

1. Enable a **Granola (or notes) MCP** in Cursor/Claude per that product’s docs.
2. Reload MCP / restart the host.
3. Test: `@fde what can you pull?` — notes-source tools should appear.

The sink is **`fde ingest` in this bound workspace.** You do not need `fdeops-ingest` MCP for daily pull.

### Example mcp.json shape (illustrative)

Replace command/args with whatever the real Granola MCP documents. FDEOps only needs *some* tool that returns transcript text.

```json
{
  "mcpServers": {
    "granola": {
      "command": "npx",
      "args": ["-y", "YOUR-GRANOLA-MCP-PACKAGE"],
      "env": {
        "GRANOLA_API_KEY": "from-your-secrets"
      }
    }
  }
}
```

**No Granola MCP available?** Export transcript to a file → [file.md](./file.md).

## Pull phrase

```text
@fde pull today's Acme Granola into the fieldbook
```

## Agent steps

1. Capability check — notes-source tools present?
2. Fetch transcript text (ask which meeting if ambiguous).
3. `fde ingest stage --source granola --title "<short>"` then propose → confirm → apply.
4. Extract decisions/risks/next — do not dump the raw transcript into `.fde/`.

## Common fails

| Symptom | Fix |
|---------|-----|
| No Granola tools | Source MCP not loaded — they save + reload |
| Wrong meeting | One clarifying question, then fetch |
| Wrong engagement | `fde resume` in this workspace before staging |
