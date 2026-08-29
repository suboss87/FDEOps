# connect - Connect a source

**Enter when:** the FDE says "I want to connect a new MCP", "connect Granola / Slack / Notion", "how do I pull from …", or a pull request fails because no source tools exist.

**Read first:** `references/ingest.md` (sink contract). Recipes: `mcp/recipes/` (file, granola, slack, notion).

**Who runs setup:** you guide; the **host** (Cursor/Claude) must save MCP config. You cannot silently install servers into the host.

## Honest contract

- **Daily work does not need a source MCP.** Paste notes → debrief. File on disk → `fde ingest`.
- **Connect means a source**, not FDEOps. Granola/Slack/Notion credentials stay with that MCP. FDEOps never pushes, never ambient-syncs, never stores their tokens.
- **Sink is the CLI in this bound workspace** (`fde ingest`). `fdeops-ingest` MCP is optional. If you use it, pass `engagement` as the `.fde/` path from `fde resume --bind` (MCP servers often do not inherit the workspace bind).
- Never invent that Granola/Slack is available if tools are missing. Never auto-apply to `.fde/`.

## Method

1. **Ask one question** - which source? (`file` / `granola` / `slack` / `notion` / other). If "other", ask for the MCP they intend to use. If they just want paste → send them to debrief and stop.
2. **Capability check (current session)** - list MCP tools you can actually call:
   - Sink: `fde ingest` CLI (preferred) and/or `ingest_stage`
   - Source: anything that can **fetch** that system's content (not post)
   - Say clearly: *available now* vs *needs config*.
3. **Emit config for the source only** - open `mcp/recipes/<source>.md`. Fill placeholders from *that product's* docs. Tell them to paste secrets into host env - never into `.fde/`.
4. **Tell them where to paste** - Cursor MCP settings / `mcp.json`. Claude Code: their MCP config. Save → reload MCP / restart session.
5. **Verify** - after reload: re-run capability check. If source tools appear, offer a **test pull** staged to `.inbox/` only. Stop before apply unless they ask to propose.
6. **Handoff phrase** - e.g. `@fde pull today's Acme Granola into the fieldbook`.

## If they only want paste / files

Do not add MCP. Use debrief or [mcp/recipes/file.md](../../../mcp/recipes/file.md).

## Checkpoint

Before ending connect: (1) they know paste still works, (2) source reachable or honest gap, (3) they know the pull phrase. Do not write `.fde/` during connect.
