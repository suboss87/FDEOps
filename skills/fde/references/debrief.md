# debrief - Capture the meeting

**Enter when:** the FDE just left a meeting/call and dumps raw notes, a transcript, or "they said…". Highest-frequency moment in FDE life. Capture within the hour.

**Large transcripts or emails** sitting in Granola/Gmail/Notion → prefer **`fde ingest stage`** first (via source MCPs the FDE configured), then the same propose → confirm → **`fde ingest apply`** path. See `references/ingest.md`. Pasted short notes stay on this debrief verb.

**Read first:** the bounded `fde resume` packet for the bound client. Use `fde recall` for the specific prior decision, action, or delivery result needed to reconcile this update. Do not reload the whole engagement.

**Who runs the CLI:** you (the agent). Never tell the FDE to type `fde debrief …`.

## Honest contract (read once)

- The `fde` CLI is **local, deterministic, no AI**. `--smart` is a **gate + writer**, not a brain.
- It keeps lines that already have `decision:` / `risk:` / `delivery:` / `contact:` / `next:` / `signer:` prefixes, plus a thin keyword pass (e.g. "we agreed", person+verb lines, "open question", "X signs off").
- `signer: Priya` fills **Stakeholder who signs off** in `success.md` and logs Priya as a contact. The CLI proposes it when a sentence says someone signs off / approves / has final say. If the notes name who can say yes and the proposal does not carry a `signer:` line, add one - that is the most expensive sentence in the meeting.
- Heuristics can miss facts **and mislabel prefixed lines**. You interpret every candidate against the sanitized source, not just unprefixed lines. Split distinct decisions, requests, actions, and results; keep uncertainty. The user reviews meaning, never prefix syntax.
- `.debrief-propose` is raw lines only (no routing annotations). "Edit if mis-routed" means **rewrite the line with the right prefix**, not leave a comment in the file.

## Method (you do this work)

### Preferred path - smart debrief (messy notes)

1. Save the FDE's notes to a temp `.md` file in the workspace (or pipe stdin).
2. Run `fde debrief --smart <notes.md>` (or `npx fdeops debrief --smart …`).
3. Run `fde debrief --review` before opening an existing proposal so legacy identifiers are masked. Open the proposal only after review succeeds. Never open a proposal containing manually inserted raw private blocks. Prepare the pending proposal using **Prepare one update** below. Read only the sanitized `.debrief-propose`, never the sealed private sidecars or raw private source. Preserve privacy markers, source metadata, and complete identifier aliases such as `[[email:...]]`. The CLI restores known aliases locally on apply. Never read `.privacy/` or try to recover an identity with file tools. If an alias is truncated, retrieve a narrower excerpt; never guess or edit the token.
4. Run `fde debrief --review` after editing. Treat the CLI REVIEW and routing output as your validation, not a second presentation to the user. Resolve errors and replay warnings before asking for confirmation.
5. Show **one** concise review in chat: name the client, then the consequential changes in plain English. Include decisions, requests still unagreed, actions, reported delivery, signer or contact changes, and unresolved conflicts when present. Show the previous value only where it changes the meaning. Omit empty categories and CLI routing details; do not impose a fixed four-row card that hides other changes. If the proposal is too large to show faithfully, split the review into explicit batches; never approve hidden changes.
6. Ask **Save this update?** This confirms the engineer's record, not customer acceptance. On confirmation, apply precisely that proposal with `fde debrief --apply`. A material correction requires a revised review and renewed confirmation. On rejection, leave the proposal pending and do not apply.
7. Verify the changed facts through bounded `fde resume` / targeted `fde recall`. If a fieldbook is part of the current task, regenerate it using the existing command and destination after the confirmed save; do not make the user run it. End with a brief saved/not-saved result and the next action, not another full summary.

### Prepare one update (shared with ingest)

Do this work yourself before the human review:

- **Check meaning, not keywords.** “We settled on delaying the rewrite” is a decision; “Mara will request access” is an action, even if the heuristic calls it a contact. A wish or suggestion remains a request, not agreement. Do not infer authority, approval, a calendar date from an unanchored relative date, or production value from staging.
- **Keep facts traceable.** Preserve supplied source locators on each consequential fact, using `[source: ...]`. If only a local file or staged item exists, cite that actual locator as a note source, not a customer receipt. Do not invent a meeting date or speaker. A source label is not authenticated approval.
- **Reconcile only what changed.** Compare affected facts with the current record using targeted retrieval. Leave unchanged sourced statements out of an accidental re-import. Preserve earlier history; record changed or conflicting claims explicitly. If everything is already recorded, say so and leave the pending proposal unapplied. If it blocks a later capture, explain that no new facts were saved and ask permission to replace that pending review; use `--replace-proposal` with the new notes only after that authorization. Do not delete proposal files or private sidecars manually. Do not use `--allow-replay` without explicit approval of an intentional repeat.
- **Protect the current next action.** A late meeting note does not automatically supersede a newer action. Keep older actions as dated context unless their current priority is established; show a conflict when it needs a decision. Use exactly one physical `next:` line for the current action. If multiple current actions are explicitly agreed, include them on that same line separated by semicolons; the CLI retains only the last `next:` line. Keep other dated commitments in context. Do not silently discard other commitments.
- **Keep memory useful.** Retain consequential facts and indispensable context; remove chatter and repetition from the proposal, not from the source. Preserve the raw input outside `.fde/` (staged material stays in `.inbox/`). Never remove privacy placeholders or modify sealed sidecars. Ask only about a consequential ambiguity that cannot remain explicitly unknown.
- **Structure the result.** Use `decision:` / `risk:` / `delivery:` / `contact:` / `next:` / `signer:`. Preserve `ask:` / `scope:` as explicitly proposed context when appropriate. Prepare the seven-field delivery row yourself for a reported result (see below); unknown fields stay `pending`. The human should not have to fill out a ledger to capture a meeting.

Before showing the review, check that every consequential fact in the sanitized source is represented, already recorded, or explicitly unresolved. Check classified lines as carefully as unclassified ones. Nothing is saved simply because this preparation is complete.

### Fallback - you structure, then route

If `--smart` is unavailable or you already have clean prefixes:

1. Extract into buckets - **only what was actually said**:
   - **Decisions** - agreed, by whom, in their words where possible
   - **Action items** - owner + due; unowned → `owner: unknown - ask`
   - **Stakeholder signals** - tone shifts with evidence → green/amber/red
   - **Risks** - new / confirmed / retired
   - **Open questions** - what to chase next
2. Format lines as `decision:` / `risk:` / `delivery:` / `contact:` / `next:` / `signer:` (contacts may end with `[signal:green|amber|red]`).
3. Follow **Prepare one update** and show the same single plain-English review as the preferred path. Include every consequential change and ask **Save this update?**.
4. On confirm, pipe to `fde debrief` (or write a file and run it).

Ask at most one focused question at a time when ambiguity would change the record. Otherwise preserve the unknown and include it in the review. Never treat silence as confirmation.

## Artifact

- Smart apply / debrief CLI writes the dated routes into the right `.fde/` files.
- `next:` updates the existing `## Next action` in `context.md` (collapses duplicates). Do not append a second `## Next action` heading by hand.
- If you must write directly: decisions → `decisions.md`; signals → `stakeholders.md` Signal history; risks → `risks.md`; next actions → fill under the template `## Next action` in `context.md`. Prefer the CLI.

## Checkpoint

Use the single pre-save review above. After saving, report verification and the next action briefly; do not ask for a second approval or repeat the review.

## Principles

- Capture within the hour or lose the nuance.
- Verbatim quote outranks paraphrase; hesitation outranks quote.
- Signals move on evidence, never on vibe alone.
- A meeting with no decisions and no actions - say so; that is a finding.

## Delivery rows and repeated updates

For a measured or promised slice, use a reviewed structured line:

```text
delivery: Replay|risk-mitigation|zero duplicates|zero duplicates on staging|pending|[source: transcript:42]|pending
```

The seven fields are Slice, Bucket, Promised, Measured, Accepted by, Evidence, Rollback. Keep unknowns `pending`; never infer approval. This lands in the value ledger during the same confirmed apply. A `delivery:` line without pipes stays a narrative note. Incorrect field counts refuse the write rather than shifting the meaning of cells.

A sourced statement already in the record triggers a replay warning. Before applying, compare newer facts and the current next action. Remove repeated statements from the proposal if this is an accidental re-import. Only after the engineer explicitly confirms an intentional repeat, apply with `fde debrief --apply --allow-replay`. This does not silently deduplicate history and does not authenticate sources.
