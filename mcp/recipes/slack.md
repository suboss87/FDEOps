# Recipe: Slack (pull only)

**Use when:** useful context lives in a Slack thread or channel. FDEOps does **not** ship a Slack server, does **not** post messages, and does **not** sync channels.

You add whatever Slack MCP your host already supports. We only accept **text you pulled**, then the same confirm loop as a debrief.

## Setup (once)

1. Enable a **Slack MCP** (official or community) with read access to the threads you need.
2. Reload MCP / restart the host.
3. Test: `@fde what can you pull?` — Slack fetch tools should appear. The FDEOps **CLI** (`fde ingest`) is the sink if this workspace is bound; you do not need `fdeops-ingest` MCP for daily use.

### Example mcp.json shape (illustrative)

Replace the Slack server with whatever that MCP actually documents. Do not invent a package name.

```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "YOUR-SLACK-MCP-PACKAGE"],
      "env": {
        "SLACK_BOT_TOKEN": "from-your-secrets"
      }
    }
  }
}
```

Optional sink MCP (only if you are not running `fde ingest` from this workspace): see [../fdeops-ingest/README.md](../fdeops-ingest/README.md). Pass `engagement` as the path to this client's `.fde/` (from `fde resume --bind`).

**No Slack MCP?** Copy the thread to a file or paste into chat → [file.md](./file.md) or `@fde debrief`.

## Pull phrase

```text
@fde pull yesterday's #acme-launch thread into the fieldbook
```

## Agent steps

1. Capability check — Slack **read** tools present? If not → this recipe, then stop.
2. Fetch the thread/channel as **text** (ask which channel/thread if ambiguous).
3. `fde ingest stage --source slack --title "<short>"` (CLI in this bound workspace).
4. Propose → FDE confirms → apply. Extract decisions/risks/asks — do not dump the thread into `.fde/`.

## Never

- Post, reply, or react in Slack from FDEOps.
- Background-sync a channel.
- Auto-apply.

## Common fails

| Symptom | Fix |
|---------|-----|
| No Slack tools | Source MCP not loaded — they save + reload; we cannot silent-install |
| Missing channel | Token/scopes cannot read that workspace — their Slack admin, not FDEOps |
| Huge dump | Stage full text in `.inbox/`; apply only short dated facts |
| Wrong client | Bind this workspace (`fde resume`) before staging |
