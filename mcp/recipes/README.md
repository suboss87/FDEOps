# Ingest source recipes

FDEOps does **not** bundle Granola / Notion / Drive OAuth. These recipes show how an FDE wires a **source MCP** (or file drop) into the FDEOps **sink**.

**Contract every source must satisfy:** fetch text → `fde ingest stage` (or MCP `ingest_stage`) with `{ source, title, content }` → propose → FDE confirms → apply.

| Recipe | When |
|--------|------|
| [file.md](./file.md) | Local transcript / export already on disk (no source MCP) |
| [granola.md](./granola.md) | Meeting transcripts via a Granola-shaped MCP (or export) |
| [notion.md](./notion.md) | Notion pages / meeting notes via a Notion MCP |

Also wire the sink once: [fdeops-ingest/README.md](../fdeops-ingest/README.md).

**Natural language:** `@fde I want to connect Granola` → agent follows `skills/fde/references/ingest-connect.md` and this recipe.
