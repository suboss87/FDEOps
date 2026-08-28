# Recipe: local file / paste (no source MCP)

**Use when:** you already have a transcript, `.eml`, or export on disk - or you paste into chat. This is the default FDE path.

## Setup

None. Bound workspace + `fde ingest` (or `@fde debrief` for short notes).

## Pull phrase

```text
@fde stage this transcript into the fieldbook and propose updates
```

(or attach / point at a path, or paste and say debrief)

## Agent steps

1. Bind engagement (`fde resume`).
2. Short paste → debrief verb. Long file → `fde ingest stage --source file --title "<short>" <path>`.
3. Propose → rewrite prefixes → show FDE → on confirm apply.

## mcp.json

Not required.
