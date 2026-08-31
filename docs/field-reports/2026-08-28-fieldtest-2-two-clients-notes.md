# Field test 2 - two clients, one week, run out of meeting notes

FDEOps 3.16.0 · use case 2, slug `two-clients-notes` · 2026-08-28

## The embed

One FDE, two concurrent clients in the same week, all engagement state driven from messy meeting notes.

- **Harbour Labs** (repo: `suboss87/SeedCamp2.0`, a Python AI video-generation pipeline). Three stakeholders who each think they are the sponsor: Tom Ferrar (founder, idea firehose), Lena Voss (head of product, actually decides), Ade Okoro (only backend engineer, resents everything). Ask: "AI in the product", no use case. Deliverable: a defensible shortlist of 3 from 8 candidate AI use cases, plus one shipped slice.
- **Ardent Group** (repo: `suboss87/Siel`, a TypeScript/React marketing site with an Express server). Claire Mensah (director, inherited sponsor, cooling all week), Rob Iles (agency PM who commits scope in meetings I am not in), Sam (analyst, spreadsheets). Ask: site refresh. Deliverable: hold scope (French dropped, blog migration never agreed), one shipped slice.

Both engagements sandboxed under `FDEOPS_ENGAGEMENTS_ROOT=$HOME/fde-test-engagements`. Installed the advertised way in each client workspace: `npx skills add suboss87/fdeops --skill fde`. All CLI calls made by the agent, none by the "human".

## What I ran

The week interleaved, in order:

1. `npx skills add suboss87/fdeops --skill fde` in both client checkouts. Skill files landed under `.agents/skills/fde/`; **no `fde` binary appeared on PATH**, so every CLI call was `npx --yes fdeops <verb>` (~2-4s of npx overhead each time).
2. `fde resume` in each workspace → "NO ENGAGEMENT for this workspace", instructed the agent (correctly, not the human) to ask for the client name, then `fde resume --init harbour-labs` / `--init ardent-group`.
3. **Cross-contamination probe:** from the *Ardent* workspace, logged a Harbour contact (`fde log contact "Lena Voss" ...`). It wrote into Ardent's `stakeholders.md`. Silently. No client name in the success output. Cleanup: manual edit + commit in Ardent's `.fde` git repo; the append-only `.signal-ledger` retains the wrong-client entry forever.
4. **Six messy note sets** through `fde debrief --smart` → review `.debrief-propose` → `fde debrief --apply`: unprefixed kickoff prose, a Slack thread paste, a forwarded email with quoted history, a speaker-labelled transcript with filler, a whiteboard-photo transcription, and a hallway debrief containing a pasted Slack API key. Ran the preview on all, compared preview vs landed for the transcript.
5. `fde redact <key> --apply` after the API key landed in `context.md`.
6. Harbour: 8 use cases mined from the actual SeedCamp2.0 modules, scored per `references/score-use-cases.md` (5 dimensions), shortlist of 3 recorded in `reality.md`; confirmed #8 (dry-run cost quotes) buildable and shipped it: `estimate_batch_cost()` in `app/services/cost_tracker.py` + 3 tests. Real runs: baseline `139 passed`, focused `13 passed`, `ruff` and `black --check` clean.
7. Ardent: extracted `escapeHtml` into `server/sanitize.ts` + 4 characterisation tests (`npx tsx --test`: 4 pass), typecheck and ESLint clean after an npm-registry fight unrelated to FDEOps.
8. **Scope dispute:** `fde receipts french` → dated decision with Claire's verbatim words. **Missing receipt:** `fde receipts "analytics dashboard"` (agreed verbally, never logged) → reported as a gap, not silence.
9. Trust drift logged as it happened via `fde log contact` signals: Claire amber→red, Lena →green ally. `fde status --all` aggregates worst-first.
10. Friday readouts per `references/readout.md` (SCQA) appended to each `delivery.md`.
11. `fde dashboard` (current-client only) then `fde dashboard --all` (portfolio); `fde vault` and `fde vault --redacted`; grepped both vaults and the dashboard HTML for planted secrets.
12. Monday cold start: fresh `fde resume` in each workspace, judged against "could I walk into the sponsor meeting".

Full command-by-command log with real output: `~/field-log.md` (attached to the session).

## What worked

- **The debrief gate (preview → apply) is the right shape.** `--smart` never wrote anything without showing `.debrief-propose` first, and `--apply` landed exactly what the reviewed file said - preview vs landed matched byte-for-byte on the transcript test. On the ground that meant zero surprise writes across six note sets. Evidence: diff of `.debrief-propose` against the post-apply `context.md` sections, in the field log.
- **Receipts settle disputes.** Rob claimed week-2 French was agreed. `fde receipts french` returned `decisions.md:15 - [2026-08-28] second language (French) dropped from this phase, English only - Claire Mensah: "we are dropping the second l…"`. Dated, verbatim, one command. This is the single highest-value moment of the week - I answered a scope dispute in under ten seconds with the client's own words.
- **Missing receipts fail honestly.** Asking for the never-logged verbal agreement returned a "no dated record" style gap, not a confident nothing. The tool distinguishes "not agreed" from "not logged", which is exactly the distinction a sponsor fight needs.
- **The method made me stop work - twice.** This was a probe question and the answer is yes, concretely: the kill-list rule in the readout reference forced "team-page refresh held (Tuesday, your call); French deferred" into the Ardent readout, and the risk entry for Rob's blog-migration commitment generated the next action "raise the blog-migration claim with Claire directly before it hardens into an expectation" - which surfaced in `resume`, `status --all`, and the dashboard queue. Without the tool I would have deferred that conversation; the record nagging me on every resume is what makes it happen Monday.
- **Trust drift earned its keep at the portfolio level.** Individually I knew Claire was cooling - I wrote the signals. But `fde status --all` sorting *worst-first* and the dashboard flag row ("ardent-group 1 high risk open", RED) meant that on Friday, with my head in Harbour's scoring, Ardent's decline was the first line I saw. That reordering is information I did not already have in working memory.
- **Structural redaction actually holds.** Planted a `<private>` block ("competing offer", budget ceiling) in `trust-profile.md`: it renders as `(private - redacted)` in the dashboard HTML and *both* vaults - even the full one. The planted API key, post-`fde redact`, appears nowhere in dashboard or vaults. The redacted vault additionally drops Stakeholders, People pages, trust profile, the trust column and Questions. Verified by grep, not by docs.
- **Scoring changed the answer, not just decorated it.** Tom's circled favourites (script rewrite, auto-regenerate) both lost: auto-regenerate died on `who-runs-it` (Ade's "who runs it", underlined twice) and script rewrite on time-to-value. The formula promoted dry-run cost quotes (#8), which nobody in the room had championed - and it was buildable in an afternoon against `dry_run.py`/`cost_tracker.py`, verified by shipping it. Without the method I would have built Tom's favourite to keep the founder warm.
- **The Monday triage header.** Five lines - trust signal, next action, hygiene - and cold-me knew Ardent was RED and what to do first. `TRIAGE [RED] ... trust: Friday: Claire declined the readout meeting ... next: raise the blog-migration claim ...`.

## What did not work

- **Cross-client contamination - blocker.** Expected: logging a Harbour contact from the Ardent workspace warns or refuses. Happened: it wrote Lena Voss into *Ardent's* `stakeholders.md` silently; the success output never names the engagement it wrote to. Real output showed no client identifier at all. Worse: the append-only `.signal-ledger` means the wrong-client trust entry is permanent short of history surgery. Workaround: manual edit + commit (which `fde doctor` flagged as "memory dirty" until committed - that part is good). For a tool whose core scenario is multi-client, every write should echo the engagement name, and a mismatch between workspace binding and mentioned stakeholders should at least warn.
- **`--smart` routing punts on real note formats - friction.** Expected: the "smart" debrief routes at least some content to decisions/risks/stakeholders. Happened: unprefixed prose, the email forward, the Slack paste, the transcript and the whiteboard note routed almost entirely to `context.md`. The reference is honest that it is a heuristic gate and the agent must rewrite with prefixes - and I did, for every set. Cost, honestly measured: rewriting six note sets took roughly as long as hand-editing the target files would have. The net time saved this week came from receipts/status/readout *reading* the record, not from debrief *writing* it. Workaround: agent rewrites `.debrief-propose` lines with `decision:`/`risk:`/`contact:` prefixes before apply.
- **`fde redact` put the secret in its own commit message - blocker-adjacent.** Expected: redaction removes the key and warns about history. Happened: it removed the working-tree line and printed the history warning, but the redact commit's subject contained the key verbatim - so the "fix" added a *new* copy in history. Real behaviour, observed in `git log` of the memory repo. Workaround: none within the tool; rotate the credential (which you must do anyway) and treat redact as tidying, not security.
- **Debrief stamps logging time, not meeting time - friction.** All six note sets across a fictional "week" landed as `2026-08-28 12:0x`. Expected some way to say "this meeting was Tuesday". Consequence: the chronology a scope dispute depends on ("we dropped it in the Tuesday call") exists only because I wrote weekday words into the note text. A `--date` flag on debrief would fix it.
- **`resume` prints the least-curated file - friction.** Cold start shows the triage header (excellent) and then dumps raw `context.md`: blank template headers (`**Engagement:**` / `**Customer:**` empty - nothing in the flow ever fills them), an empty "Current state", and stubs like "Slack #ai-project thread paste (Day 2)" that tell cold-me nothing. The curated material (scored shortlist in `reality.md`, SCQA readout in `delivery.md`) is never surfaced. Six notes in, the *derived* views are readable; `context.md` is exactly the pile of dated bullets the brief warned about - and resume prints it anyway.
- **Shared-screen view cannot save you from yourself - friction, arguably by design.** The redacted vault strips everything structurally marked, but my `risks.md` line "Rob told Claire's boss we'd deliver… dispute waiting to happen" and the hostile-Q prep including "Should this project exist?" survive verbatim into the client-safe build. They are in risk/delivery files, so the tool cannot know. Nothing warns that redacted ≠ safe. One sentence in the vault output ("redacted removes marked material only - reread risks/delivery before sharing") would prevent a real embarrassment.
- **Dashboard scope surprise + no subcommand help - papercut.** Bare `fde dashboard` renders only the current workspace's engagement; the portfolio needs `--all`, found by guessing. `fde dashboard --help` does not print help - it renders the dashboard again.
- **`fde status` never learned I shipped - papercut.** After two real, tested slices logged via delivery, status still says `value: none yet` and `phase:unset`. The value ledger correctly waits for sponsor acceptance, but "none yet" next to a week of shipped work reads wrong in a portfolio view; "claimed, unaccepted" would be truthful and fairer.
- **Delivery write warning is ambiguous - papercut.** "WARNING: You have unstaged changes in your git repo" - which repo, the client's or `.fde`? It was the client's; the memory write succeeded anyway. Name the repo in the warning.

## What this is actually like

Expert voice, having run embeds without any of this: **it is a method, with paperwork bolted where the method runs out.**

Where it earns its keep is exactly the two-client problem this test was built around: the record survives the context switch when my head does not. Receipts won a scope dispute in ten seconds. Worst-first portfolio triage put the cooling sponsor on top while I was buried in the other client's scoring. The kill-list and next-action machinery genuinely made me *hold* scope instead of merely documenting that I lost it. Those are behaviours, not files.

Where it is theatre: the "smart" debrief. It is a gate and a stenographer, and the semantic work of turning a real meeting note into decisions/risks/contacts falls entirely on the agent. That is a defensible design - deterministic core, judgment in the agent - but the flag name oversells it, and a human FDE without a capable agent gets markdown homework. Similarly, the readout is a reference document the agent follows; the CLI's contribution to Friday is one status line. Honest division of labour, but know what you are buying.

The trust ledger is the most double-edged piece. It caught Claire's slide and forced the Monday conversation - real value. It also silently accepted another client's stakeholder into the wrong ledger, permanently. In front of a sponsor, the second failure erases a month of the first kind of value.

Would I take it into a real client next Monday? **Yes, with caveats:** every debrief output gets agent review before apply (non-negotiable), no secrets anywhere near notes (redact is tidying, not security), reread risks/delivery before any shared screen, and double-check the workspace before every log command because the tool will not.

## The five things I would change first

1. **Echo the engagement name on every write, and warn on cross-client signals.** Every `fde log`/`debrief --apply` success line should start with the bound client name; if a contact/signal names a stakeholder unknown to this engagement but present in a sibling, warn before writing. This turns the silent contamination blocker into a caught typo.
2. **Add `--date` (or per-line `[date:…]`) to debrief.** Meeting time ≠ logging time; disputes are about meeting time. Without it, the dated record that receipts depend on is subtly wrong for anyone who batches notes.
3. **Make redact history-safe in its own output.** Never put the redacted term in the commit subject (use a hash or "redact 1 term"), and print the exact `git filter-repo` line for the memory repo plus "rotate the credential now" as the first line, not a footnote.
4. **Fix `resume` for the cold start.** Fill the context header at init (engagement, customer, dates), and have resume surface the curated record - latest readout, open decisions, scored shortlist - instead of dumping raw `context.md` debrief stubs.
5. **Warn that `--redacted` is structural, not semantic.** One line in the vault/dashboard output: redaction removes `<private>`/trust/stakeholder material only; prose in risks/delivery ships as written - reread before sharing. Cheap, prevents the worst sponsor-facing failure mode.

## Evidence

- `~/field-log.md` - real-time command log, every command with actual output, friction, and time-to-understand (attached to the session).
- `~/fieldbook.tgz` - the complete `.fde/` fieldbook for both engagements (`tar czf ~/fieldbook.tgz -C $FDEOPS_ENGAGEMENTS_ROOT .`), including memory git history showing the contamination cleanup and the redact commit (attached).
- `~/screenshots/ss_f1c2c475.png` - `fde dashboard --all` portfolio rendered in Chrome (attached).
- Client work (real code, real test runs, in the client checkouts, not committed here per the brief): Harbour `estimate_batch_cost` + 3 tests (`139 passed` baseline, `13 passed` focused, ruff/black clean); Ardent `server/sanitize.ts` extraction + 4 characterisation tests (`4 passed`, tsc and ESLint clean).
