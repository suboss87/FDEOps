# Field report — defensible memory (2026-07-14)

We attacked our own tool (multi-client bind, secret paste, corrupt stakeholders, symlink escape, non-atomic init) and compared notes with a source read of Rowboat's knowledge layer.

## What broke before 3.9
- Receipts were dated markdown, not tamper-evident — a dispute at a regulated client wants a commit hash, not "trust me, it was in the file."
- Monday TRIAGE lived in `fde resume` but session-start hooks only injected `context.md` — the promise depended on model obedience.
- `fde debrief` required prefixed lines — messy meeting notes became `context.md` sludge unless the human babysat formatting.

## What we stole (and refused)
- **Stole:** git-version the memory directory (Rowboat `version_history.ts` pattern), gardener *contract*, meeting-prep grounding, field-reports-as-repo-content.
- **Refused:** Electron coworker shell, Gmail/Slack ambient sync, PostHog, background agents writing into the record. fdeops compounds as fast as the FDE debriefs — make debrief cheap, keep the NDA moat.

## Verification bar
- `fde log` / `debrief` print `@<hash>`; `cd ~/fde-engagements/<client>/.fde && git log` shows the trail.
- Hook / Cursor entry surfaces TRIAGE without re-explaining Denise.
- `fde debrief --smart` → edit propose → `--apply` is the loop; nothing unreviewed lands when using smart path.
