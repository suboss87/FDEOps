# Ingest source recipes

FDEOps does **not** bundle Granola / Slack / Notion OAuth and does **not** push to those tools.

**Daily (no MCP):** paste notes to `@fde debrief`, or drop a file ([file.md](./file.md)).

**Pull (optional):** you add a **source** MCP. The agent fetches text, then runs `fde ingest` in this bound workspace (stage → propose → you confirm → apply). The `fdeops-ingest` MCP is optional - only if you are not using the CLI from a bound workspace.

| Recipe | When |
|--------|------|
| [file.md](./file.md) | Transcript / export already on disk, or paste |
| [granola.md](./granola.md) | Meeting transcripts via a notes MCP (or export) |
| [slack.md](./slack.md) | Pull a thread/channel as text - never post |
| [notion.md](./notion.md) | Read a Notion page (or export markdown) |

**Natural language:** `@fde I want to connect Granola` (or Slack / Notion) → `skills/fde/references/connect.md`.
