# Working with customer records

Read this only when retrieving, updating or handing over a bound engagement record. Standalone tasks use supplied permitted context and their selected method. Apply [task context](task-context.md) before record access or writes.

## Entry (every session)

For record-backed work only:

1. Before client reads, run `fde setup --show` and verify `fde privacy` support. If setup is unconfigured or the user requests preferences, follow `record-setup.md`. Setup does not authorize sharing customer data.
2. Use a fresh `fde resume` packet for this turn/task. Reuse a current session-hook packet only when its visible `ENGAGEMENT:` matches the binding and its freshness is certain. Refresh after binding, masking or record changes, or when the user asks where things stand. Do not reuse an earlier turn's packet or repeat the same entry solely because another method loaded.
3. Read policy, signer, goals, risks and current work. Retrieve omitted or disputed evidence, saved lessons and dated retrospectives with `fde recall <topic>`; never replace this with raw or recursive record reads. Resume defaults to 16 KiB (4 KiB in compact setup); `--max-bytes 4096` reduces it, and `--full` is for explicitly needed complete context.
4. For interrupted implementation, inspect the saved checkpoint and follow `verification.md#recoverable-checkpoint` before acting. A checkpoint is a dated claim, not a fresh test or permission to execute. For a returning or closed engagement, apply the reopening check in `land.md` before relying on historical access, owners or deployment evidence.
5. Give a brief playback and load the relevant method from the coordinator. `hygiene:` means offer `fde doctor`; never auto-rewrite.

The CLI uses local files and Git, without network calls. Install it on the FDE's own machine, never customer infrastructure. The AI host's permissions and provider policy remain separate.

## Record commands

| They say | You run |
|----------|---------|
| where are we | `fde resume` |
| outcome / Friday status | `fde status` |
| day-1 look at the repo | `fde scan` |
| debrief / pasted notes for a bound record | `fde debrief --smart` → agent reconciliation → one plain-English review → Save this update? → `--apply`. `--smart` is a gate, not a brain. `debrief.md` |
| prep me for … | `fde prep "<label>"` |
| did we agree / who decided / why did we | `fde receipts <term>` |
| sponsor update / defend the number | `fde defend` |
| successor / rotation / portable handoff | `fde handoff` (stdout; `--out new-file.md` only after export requested) |
| they went quiet | Review evidence with `rescue.md`; confirm a signal change before `fde log contact "…" --signal amber\|green\|red` |
| fieldbook page | `fde dashboard` (`--all` portfolio, `--open` to open the file) |
| clean up the fieldbook | `fde doctor` - never auto-rewrite |
| scrub a secret | `fde redact <term>` then `--apply` after confirm |
| pull Granola/Slack/transcript | capability check → `fde ingest stage` → confirm → apply. Never auto-apply. `ingest.md` |
| connect an MCP | `connect.md` |
| Obsidian / one window | `fde vault` (`--redacted` for a shared screen) |

## The memory contract

- Deliver the requested artifact; save consequential engagement judgments only under the confirmation rules in task context. No supplied source means a decision or measurement remains CLAIM. ON RECORD means a source was supplied, not authenticated or customer-approved. Never invent people, meetings, numbers or acceptance.
- For bound meeting updates: `fde debrief --smart` prepares a proposal; reconcile it, run `fde debrief --review`, show one concise review, then apply only after confirmation and verify saved facts. Standalone meeting analysis uses the review-only path in `debrief.md`.
- Keep one customer per folder. Never drop `## Signal history` or `## Retired` when editing. Preserve existing decisions and scope when updating progress.
- Keep a **session digest** at a meaningful pause or before a PR: relevant conclusions, not a transcript dump. Confirm consequential judgments before writing. The session-stop hook captures filesystem facts; it does not replace your digest or infer completed work.

| Digest beat | Destination |
|-------------|-------------|
| TL;DR, gotchas, pivot | `context.md` |
| Key decisions & why | `decisions.md`, when there are decisions |
| Scope and verification | `delivery.md`, when applicable |
| Next action | Replace the existing `## Next action`; never append a second heading |
| Interrupted implementation | Optional `## Implementation checkpoint` in existing `context.md`, summarized from the existing task record under `verification.md` |

### Keep open work visible

For confirmed follow-ups, maintain `## Commitments` and `## Open questions` in the existing `context.md`. Use unchecked bullets for unresolved items and check them only after confirmed resolution. A commitment says who owes what to whom; include a source and `due: YYYY-MM-DD` or `review: YYYY-MM-DD` only when agreed. Preserve unresolved `unknown - ask:` questions here when they affect the next decision. Do not infer a promise from a suggestion. `resume` and `prep` surface these entries with sources; dates prompt a status check, not an invented escalation. For a meeting, select relevant entries and use targeted recall for supporting evidence. Users describe the follow-up naturally; maintain the record for them.

### Answer from the record

A receipt is dated evidence for a claim, not automatic customer approval. For agreement questions, distinguish proposed work, an agreed decision, a later withdrawal and acceptance of a delivered result. Attribute the decision and rationale only when recorded; the person who wrote a note is not necessarily the decision-maker. If the search finds no agreement evidence, say “I found no recorded agreement in the material checked,” show relevant claims as claims, and name who can clarify only when their authority is known. Do not invent a rationale or treat absence as “never agreed.”

For meeting preparation, use `fde prep` as the starting packet, then select unresolved questions and commitments relevant to the meeting's purpose and participants. Include the recorded owner, due/review date and source where available; mark missing fields unknown. Retrieve supporting or conflicting context with targeted recall. Do not turn every old unknown into an agenda item, infer an overdue date, or hide a material blocker merely because its wording does not match the meeting label.
