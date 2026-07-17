# debrief - capture the meeting before it evaporates

**Enter when:** the FDE just left a meeting/call and dumps raw notes, a transcript, or "they said…". Highest-frequency moment in FDE life. Capture within the hour.

**Read first:** `context.md`, `stakeholders.md` (signals against what's known).

**Who runs the CLI:** you (the agent). Never tell the FDE to type `fde debrief …`.

## Method (you do this work)

### Preferred path - smart debrief (messy notes)

1. Save the FDE's notes to a temp `.md` file in the workspace (or pipe stdin).
2. Run `fde debrief --smart <notes.md>` (or `npx fdeops debrief --smart …`).
3. Show the **proposed** routing in plain language (what would become decisions, risks, contacts, etc.).
4. On FDE confirm → run `fde debrief --apply`.
5. On reject → stop; ask what to change; do not apply.

No invented names or quotes. If the propose looks wrong, fix with judgment then re-propose or use the fallback path.

### Fallback - you structure, then route

If `--smart` is unavailable or the notes are already cleanly prefixed:

1. Extract into buckets - **only what was actually said**:
   - **Decisions** - agreed, by whom, in their words where possible
   - **Action items** - owner + due; unowned → `owner: unknown - ask`
   - **Stakeholder signals** - tone shifts with evidence → green/amber/red
   - **Risks** - new / confirmed / retired
   - **Open questions** - what to chase next
2. Format lines as `decision:` / `risk:` / `delivery:` / `contact:` (contacts may end with `[signal:green|amber|red]`).
3. Show that structured version to the FDE for confirmation.
4. Pipe to `fde debrief` (or write a file and run it).

One clarifying question max if the dump is ambiguous - then write. Never stall capture on completeness.

## Artifact

- Smart apply / debrief CLI writes the dated routes into the right `.fde/` files.
- If you must write directly: decisions → `decisions.md`; signals → `stakeholders.md` Signal history; risks → `risks.md`; next actions → `context.md`. Prefer the CLI.

## Checkpoint

Read back the 2-3 most consequential captures in one breath - so the FDE can correct on the spot. Then stop. No summary theatre.

## Principles

- Capture within the hour or lose the nuance.
- Verbatim quote outranks paraphrase; hesitation outranks quote.
- Signals move on evidence, never on vibe alone.
- A meeting with no decisions and no actions - say so; that is a finding.
