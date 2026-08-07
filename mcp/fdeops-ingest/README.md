# fdeops-ingest MCP

Thin stdio MCP server for the FDEOps **ingest sink** only: **stage → propose → apply**.

This package shells out to the local `fde` CLI. It never calls SaaS APIs. Source MCPs (Granola, Gmail, Notion, etc.) are **separate** — you add those in your own `mcp.json`.

## Tools

| Tool | CLI equivalent |
|------|----------------|
| `ingest_stage` | `fde ingest stage [--source NAME] [--title TEXT]` (content on stdin) |
| `ingest_list` | `fde ingest list` |
| `ingest_propose` | `fde ingest propose <id>` |
| `ingest_apply` | `fde ingest apply` |

Each tool returns `{ stdout, stderr, status }` from the CLI.

## Requirements

- Node.js ≥ 18
- `fde` CLI on PATH, or run from a checkout (auto-resolves `../../bin/fde.js`)

## Configure in Cursor / Claude

**Agent Plugins clients: nothing to configure.** fdeops ships a root [`mcp.json`](../../mcp.json) declaring this server as `stdio` with a `${PLUGIN_ROOT}`-relative path, so a client that supports [Agent Plugins 1.0.0](https://agent-plugins.org/specification) wires it on install - no absolute paths to edit.

Everywhere else, add to your MCP config (`~/.cursor/mcp.json`, Claude Desktop config, etc.):

```json
{
  "mcpServers": {
    "fdeops-ingest": {
      "command": "node",
      "args": [
        "/absolute/path/to/fdeops/mcp/fdeops-ingest/server.js"
      ],
      "env": {
        "FDEOPS_ENGAGEMENT": "/Users/you/fde-engagements/acme/.fde"
      }
    }
  }
}
```

Or after `npm link` in this directory:

```json
{
  "mcpServers": {
    "fdeops-ingest": {
      "command": "fdeops-ingest-mcp",
      "env": {
        "FDEOPS_ENGAGEMENT": "/Users/you/fde-engagements/acme/.fde"
      }
    }
  }
}
```

### Environment

| Variable | Purpose |
|----------|---------|
| `FDEOPS_ENGAGEMENT` | Bind to a specific engagement (path to `.fde/`) |
| `FDEOPS_ENGAGEMENTS_ROOT` | Override engagements root (default `~/fde-engagements`) |
| `FDEOPS_FDE` | Override `fde` binary (default: repo `bin/fde.js`, else `fde` on PATH) |
| `HOME` | Passed through for engagement resolution |

## Daily loop (with separate source MCPs)

1. **Fetch** — Use your source MCP (e.g. Granola, Gmail) to pull raw text. FDEOps does not bundle these.
2. **Stage** — `ingest_stage` with `content`, `source` (e.g. `"granola"`), optional `title`.
3. **List** — `ingest_list` to see staged items in `.inbox/`.
4. **Propose** — `ingest_propose` with the staged `id`; agent reviews `.debrief-propose`.
5. **Confirm** — FDE approves the proposal in chat.
6. **Apply** — `ingest_apply` writes dated facts into `.fde/` with provenance.

Raw artifacts stay in `.inbox/`; the system of record (`.fde/`) stays thin and reviewed.

## Architecture

```
[Granola MCP] ──┐
[Gmail MCP]   ──┼──► agent ──► fdeops-ingest MCP ──► fde CLI ──► .inbox/ → .fde/
[manual paste]──┘         (this package)
```

Sources are pluggable and user-configured. This MCP owns the sink only.

## Zero dependencies

Hand-rolled MCP over stdio (Content-Length framed JSON-RPC). No `@modelcontextprotocol/sdk` required at runtime.
