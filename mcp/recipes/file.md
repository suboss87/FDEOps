# Recipe: local file / paste (no source MCP)

**Use when:** you already have a transcript, `.eml`, or export on disk — or you paste into chat.

## Setup

None beyond the FDEOps sink (`fde` CLI and optionally `fdeops-ingest` MCP).

## Pull phrase

```text
@fde stage this transcript into the fieldbook and propose updates
```

(or attach / point at a path)

## Agent steps

1. Bind engagement.
2. `fde ingest stage --source file --title "<short>" <path>` (or stdin).
3. `fde ingest propose <id>` → rewrite prefixes → show FDE → on confirm `fde ingest apply`.

## mcp.json

Not required for the source. Optional sink only — see [../fdeops-ingest/README.md](../fdeops-ingest/README.md).
