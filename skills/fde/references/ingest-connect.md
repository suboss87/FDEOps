# ingest-connect - wire a source MCP in plain language

**Enter when:** the FDE says "I want to connect a new MCP", "connect Granola / Notion / Drive", "how do I pull from …", or a pull request fails because no source tools exist.

**Read first:** `references/ingest.md` (sink contract). Recipe pack: `mcp/recipes/` in the fdeops install (file, granola, notion).

**Who runs setup:** you guide; the **host** (Cursor/Claude) must save MCP config. You cannot silently install servers into the host.

## Honest contract

- FDEOps = **sink** (`fdeops-ingest` / `fde ingest`). Sources = **whatever MCP the FDE adds**.
- You produce a ready config snippet + steps. They save + reload. Then you verify with a capability check + optional test stage.
- Never invent that Granola/Notion is available if tools are missing. Never ambient sync. Never auto-apply to `.fde/`.

## Method

1. **Ask one question** — which source? (`file` / `granola` / `notion` / other name). If "other", ask for the MCP package or docs URL they intend to use.
2. **Capability check (current session)** — list MCP tools you can actually call:
   - Sink present? (`ingest_stage` / `ingest_list` / or `fde ingest` CLI)
   - Source present? (anything that can fetch that system's content)
   - Say clearly: *available now* vs *needs config*.
3. **Emit config** — open the matching recipe under `mcp/recipes/<source>.md`. Fill absolute paths:
   - path to `mcp/fdeops-ingest/server.js` (from this fdeops install)
   - `FDEOPS_ENGAGEMENT` → this client's `…/<slug>/.fde`
   - placeholders for source API keys (tell them to paste secrets into host env — do not commit keys into the fieldbook)
4. **Tell them where to paste** — Cursor: MCP settings / `~/.cursor/mcp.json` (or project MCP). Claude Code: MCP config per their docs. One sentence: save → reload MCP / restart session.
5. **Verify** — after they confirm reload: re-run capability check. If source tools appear, offer a **test pull** into `.inbox/` only (stage + show list). Stop before apply unless they ask to propose.
6. **Handoff phrase** — give them the daily line, e.g. `@fde pull today's Acme Granola into the fieldbook`.

## If they only want the sink

Still wire `fdeops-ingest` (or rely on CLI). File drops work with [mcp/recipes/file.md](../../../mcp/recipes/file.md) without any source MCP.

## Checkpoint

Before ending connect: (1) sink reachable, (2) source reachable or honest gap, (3) they know the pull phrase. Do not write `.fde/` during connect.
