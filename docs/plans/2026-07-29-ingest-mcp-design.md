# Ingest MCP — design (approved)

**Outcome:** FDEs pull large artifacts (transcripts, emails) from *any* source MCP they configure. FDEOps only owns the sink: **stage → propose → confirm → apply**. Nothing writes `.fde/` unreviewed. No ambient sync.

## Ground loop

1. FDE: “Make sure Acme is up to date — pull what’s relevant.”
2. `@fde` binds engagement; asks if ambiguous (*which meeting?*) or proposes: *I’ll stage today’s Granola + last Denise email.*
3. Source MCP(s) fetch raw text (Granola, Gmail, Notion, custom — **user-configured, not bundled**).
4. FDEOps ingest MCP / `fde ingest stage` writes raw into `<engagement>/.inbox/` (outside memory git).
5. Propose via existing debrief `--smart` path; agent prefixes; FDE confirms.
6. `fde ingest apply` (= `fde debrief --apply`) writes short dated facts into `.fde/` with `via:<source>` provenance where useful.
7. Raw stays in `.inbox/`; SoR stays thin.

## Non-goals

- Auto-poll / background vacuum of inbox or Slack
- Bundled Granola/Gmail OAuth inside core `fde` CLI
- MCP tools that mutate `.fde/` without confirm
- Ambient SaaS sync (still refused)

## Paths

| Path | Role |
|------|------|
| `~/fde-engagements/<slug>/.inbox/` | Staging (raw pulls). Not the memory ledger. |
| `~/fde-engagements/<slug>/.fde/` | System of record (unchanged contract) |
| `.fde/.debrief-propose` | Propose file (existing) |

## CLI

```
fde ingest stage [--source NAME] [--title TEXT] [file|-]
fde ingest list
fde ingest propose <id-or-filename>   # → debrief --smart on staged body (+ provenance line)
fde ingest apply                      # → debrief --apply
```

## MCP (thin sink)

Package: `mcp/fdeops-ingest` — stdio MCP wrapping the CLI. Tools mirror verbs. Source MCPs are whoever the FDE adds in Cursor/Claude.

## Privacy

- Core CLI remains local / no SaaS calls.
- Source MCP credentials stay with that MCP; FDEOps never stores them.
- Staging is NDA surface like `.fde/` (same home tree).
