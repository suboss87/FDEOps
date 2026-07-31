# ingest - pull large artifacts into the fieldbook loop

**Enter when:** the FDE wants to catch the engagement up from external sources — "make sure Acme is up to date," "pull what's relevant," "grab today's Granola and Denise's last email." Raw transcripts and long emails that are too big to paste usefully.

**Connect / capability (different entry):** "connect a new MCP", "connect Granola/Notion", "what can you pull?" → `references/ingest-connect.md` first. Recipes: `mcp/recipes/` (file, granola, notion).

**Read first:** `context.md` (what's already logged, what's stale). Bind the engagement before staging anything.

**Who runs the CLI:** you (the agent). Never tell the FDE to type `fde ingest …`. Never auto-apply. Never background-sync or poll sources on your own.

## Honest contract (read once)

- FDEOps owns the **sink only**: stage raw pulls → propose → confirm → apply. Nothing writes `.fde/` unreviewed.
- **Source MCPs are the FDE's.** Granola, Gmail, Notion, custom — whatever they configured in Cursor/Claude. fdeops does not bundle OAuth, connectors, or ambient sync.
- The core `fde` CLI stays local (git + file reads). Source credentials live with that MCP; fdeops never stores them.
- After apply, raw stays in `.inbox/`; the system of record (`.fde/`) stays thin dated facts.

## Capability check (before every pull)

List what you can actually call **this session**:

1. **Sink** — `ingest_stage` / `fde ingest` available?
2. **Sources** — which fetch tools exist (Granola-shaped, Notion, Drive, file-only)?
3. Tell the FDE in one line: *I can pull from X; Y is not connected.* If they asked to pull Y and it is missing → switch to `ingest-connect.md`. Never pretend a source exists.

## Ground loop (you do this work)

1. **Bind** the engagement (`fde resume` / registry). If multiple meetings or threads could apply, ask **one** clarifying question — which meeting, which thread, which date range.
2. **Capability check** (above). Then **fetch** via available source MCP(s). You pull; the CLI does not reach the network.
3. **Stage** — `fde ingest stage [--source NAME] [--title TEXT] [file|-]` writes raw text into `<engagement>/.inbox/` (outside the memory git ledger).
4. **List** (optional) — `fde ingest list` shows staged items when you need an id or filename.
5. **Propose** — `fde ingest propose <id-or-filename>` runs the debrief `--smart` path on the staged body (+ provenance line). Opens `.debrief-propose`.
6. **Rewrite prefixes** — same as debrief: lines without `decision:` / `risk:` / `delivery:` / `contact:` / `next:` need **you** to rewrite before showing the FDE. `--smart` is a gate, not a brain.
7. **Show** the proposed routing in plain language. Wait for confirm.
8. **Apply** — on FDE confirm only → `fde ingest apply` (= `fde debrief --apply`). On reject → stop; ask what to change.

No invented names, meetings, or quotes. If the propose looks wrong, fix prefixes with judgment, then re-show before apply.

## Paths

| Path | Role |
|------|------|
| `~/fde-engagements/<slug>/.inbox/` | Staging for raw pulls. Not the memory ledger. NDA surface — same home tree as `.fde/`. |
| `~/fde-engagements/<slug>/.fde/` | System of record (unchanged contract). |
| `.fde/.debrief-propose` | Propose file (shared with debrief). |

## CLI verbs

```bash
fde ingest stage [--source NAME] [--title TEXT] [file|-]
fde ingest list
fde ingest propose <id-or-filename>
fde ingest apply
```

## Provenance

When a staged fact came from a named source, carry `via:<source>` on the applied line where useful (e.g. `via:granola`, `via:gmail`). Helps receipts and sponsor disputes later — not mandatory on every context line.

## MCP sink + recipes

Optional `mcp/fdeops-ingest` wraps the same verbs over stdio. Source MCPs remain separate — the FDE adds whichever fetch tools they trust. Setup coach: `ingest-connect.md`. Copy-paste recipes: `mcp/recipes/`.

## Checkpoint

Before apply, read back the 2–3 most consequential captures in one breath — same as debrief. Confirm which sources you staged and what would land in the record. Then stop.

## Principles

- Pull on request, not on a schedule. No auto-poll, no vacuum of inbox or Slack.
- Staging is not memory. Only `--apply` after confirm writes `.fde/`.
- Large artifact → ingest stage first; pasted short notes → debrief verb directly (`references/debrief.md`).
