# debrief - capture the meeting before it evaporates

**Enter when:** the FDE just left a meeting/call and dumps raw notes, a transcript, or "they said…". Highest-frequency moment in FDE life. Capture within the hour.

**Read first:** `context.md`, `stakeholders.md` (signals against what's known).

**Who runs the CLI:** you (the agent). Never tell the FDE to type `fde debrief …`.

## Honest contract (read once)

- The `fde` CLI is **local, deterministic, no AI**. `--smart` is a **gate + writer**, not a brain.
- It keeps lines that already have `decision:` / `risk:` / `delivery:` / `contact:` / `next:` prefixes, plus a thin keyword pass (e.g. "we agreed", person+verb lines, "open question").
- Real messy notes without prefixes often route **0 useful lines** — everything else lands as a context dump. That is expected. **You are the router:** rewrite `.debrief-propose` with type prefixes, then `--apply`.
- `.debrief-propose` is raw lines only (no routing annotations). "Edit if mis-routed" means **rewrite the line with the right prefix**, not leave a comment in the file.

## Method (you do this work)

### Preferred path - smart debrief (messy notes)

1. Save the FDE's notes to a temp `.md` file in the workspace (or pipe stdin).
2. Run `fde debrief --smart <notes.md>` (or `npx fdeops debrief --smart …`).
3. Open `.debrief-propose`. If lines lack type prefixes, **rewrite them** before showing the FDE, e.g.:
   - `decision: agreed chargebacks stay phase 2 — Priya`
   - `risk: legal may reopen scope if we slip the SOW date`
   - `contact: Priya pushed hard on Friday deck [signal:amber]`
   - `next: send one-pager before Thursday 9am`
   - unprefixed lines stay context color only
4. Show the **proposed** routing in plain language (what would become decisions, risks, contacts, next).
5. On FDE confirm → run `fde debrief --apply`.
6. On reject → stop; ask what to change; do not apply.

No invented names or quotes. If the propose looks wrong, fix prefixes with judgment then re-apply or use the fallback path.

### Fallback - you structure, then route

If `--smart` is unavailable or you already have clean prefixes:

1. Extract into buckets - **only what was actually said**:
   - **Decisions** - agreed, by whom, in their words where possible
   - **Action items** - owner + due; unowned → `owner: unknown - ask`
   - **Stakeholder signals** - tone shifts with evidence → green/amber/red
   - **Risks** - new / confirmed / retired
   - **Open questions** - what to chase next
2. Format lines as `decision:` / `risk:` / `delivery:` / `contact:` / `next:` (contacts may end with `[signal:green|amber|red]`).
3. Show that structured version to the FDE for confirmation.
4. Pipe to `fde debrief` (or write a file and run it).

One clarifying question max if the dump is ambiguous - then write. Never stall capture on completeness.

## Artifact

- Smart apply / debrief CLI writes the dated routes into the right `.fde/` files.
- `next:` updates the existing `## Next action` in `context.md` (collapses duplicates). Do not append a second `## Next action` heading by hand.
- If you must write directly: decisions → `decisions.md`; signals → `stakeholders.md` Signal history; risks → `risks.md`; next actions → fill under the template `## Next action` in `context.md`. Prefer the CLI.

## Checkpoint

Read back the 2-3 most consequential captures in one breath - so the FDE can correct on the spot. Then stop. No summary theatre.

## Principles

- Capture within the hour or lose the nuance.
- Verbatim quote outranks paraphrase; hesitation outranks quote.
- Signals move on evidence, never on vibe alone.
- A meeting with no decisions and no actions - say so; that is a finding.
