# Field report - wave 2, run C: full lifecycle at speed, then red-team the tool

**Revision tested:** `field-gates` @ `a1d1ec1b59cf6d4c32d100d083703b132c2b4ac8`, `package.json` version **3.16.1**
**Date:** 2026-08-28 · **Slug:** lifecycle-redteam
**Clients (fictional):** Aldergate Capital (payments lender, real codebase `suboss87/Invoice3-v3`), Meridian Rail (state transit, gov overlay)
**Sandbox:** `HOME=$SB/home`, `FDEOPS_ENGAGEMENTS_ROOT=$SB/engagements`, `$SB=/home/ubuntu/sb42`
**Install path actually used:** git clone + `node bin/fde.js` (the advertised `npx skills add` path ships no CLI - see §7)
**Field log:** real-time, attached (`field-log.md`)

---

## Verdict

**I would take the method to a client on Monday. I would not yet run `fde vault --redacted` on a shared screen, and I would not type `--help` in a client's engagement.**

The lifecycle is genuinely good: land → discover → plan → ship → prove → close held up under a compressed six-week embed with a second client cutting across it, and the record it produced is the thing I would actually reach for in a sponsor meeting. Nothing lost data. Nothing corrupted. The `<private>` boundary held against a planted sentinel across every output surface I could find.

What would make me stop trusting it in front of a paying client is a short list - four items - and all four are fixable without touching the architecture:

1. `--help` executes the verb on ~14 of 20 verbs, and two of those verbs **write to the engagement's memory git**.
2. `vault --redacted` is not redacted in the sense the flag name promises - it strips `<private>` and ships everything else verbatim, including the note where I wrote down that my sponsor was underestimating her own timeline.
3. `FDEOPS_ENGAGEMENT` silently overrides the workspace bind, and logging a stakeholder from client B while bound to client A still writes into A with no warning (wave 1 finding, unchanged in 3.16.1).
4. `fde tidy --apply` reports "applied: bless retrospectives/" and commits nothing - the close artifact never enters the tamper-evident ledger.

That is short enough to fix. None of it is architectural. But (1) and (2) are the two an FDE hits *in front of the client*, which is why they are top of the list.

---

## Part 1 - the lifecycle

### Routing: did `@fde` pick the right reference unprompted?

Yes, consistently. Entering with situations rather than filenames ("day 1, read-only clone, no commit rights", "sponsor added scope with no time", "sponsor has gone cold and is cc'ing her boss", "Gustav says the telemetry is CUI") routed to `land.md`, `earn-trust.md`, `hold-scope.md`, `rescue.md`, `gov.md` without being told. `SKILL.md` is a real router, not a table of contents. **This is the headline positive of the run.** The one place it did not route on its own was the fintech overlay - I had to say the word "payments" before `fintech.md` came in; the money-moving nature of the codebase was visible in `fde scan` output (`invoices.py`, approval flow) but did not trigger the overlay.

### Land - thin access

`fde scan` on Invoice3-v3 (full output in the field log) surfaced the extraction chain as an AI component and flagged 6 "temporary" archaeology sites in a single pass, from a cold clone, with no network. That is a real day-1 artifact. **Client verdict: edit first** - I would not paste the raw block into a sponsor email, but I would walk Emeka through it line by line.

`land.md` made me write `brief.md` + `success.md` *before* touching code and made me record trust level 0 (observer, read-only) explicitly. Without it I would have started reading code immediately and had nothing dated to point at later.

### Earn-trust - the ladder

Logged four rungs as decisions/contacts: observer (read-only clone, day 1) → characterisation tests on their code, no behaviour change → a small PR-shaped diff on a branch → Emeka merges it into their integration branch and grants feature-branch commit rights. `earn-trust.md` is the reference that changed my behaviour most concretely: it told me to make the first ask *small and reversible*, which is exactly why slice 1 was characterisation tests rather than the dedupe fix I wanted to write. **Send/edit/never: the ladder log is internal - never send, but it is the thing I would cite in an accumulation conversation.**

### Discover - the brief was wrong

Brief said "invoice processing failures reach finance silently; we need monitoring." Reality, from Emeka's walkthrough: the extraction chain is LandingAI → Gemini → **regex fallback**, and every fallback is a `print()` nobody reads in prod. It is not a monitoring gap; it is a silent-degradation gap - the system reports success with wrong numbers. A GBP 48,200 invoice went through the regex fallback with a wrong total and got APPROVE; finance caught it by luck.

`discover.md` forced the "what they asked for / what's actually true / evidence" split, which is what produced that distinction. `debrief --smart` on my raw notes routed the 48.2k incident to `context.md` rather than `risks.md` - it is documented as "a gate, not a brain", and it behaves that way, but **a tired FDE who applies the proposal blind buries their biggest risk in context.md.** Friction; workaround is to edit the propose file (documented).

### Fintech overlay + ship

`fintech.md` asked the three questions that shaped the slice: *what moves money, what fails silently, what is not idempotent.* Answer: upload has no idempotency at all - double-click creates two invoice records, both approvable. That is a double-pay exposure sitting in production, and it was not in the brief.

Shipped on branch `fde/aldergate-upload-idempotency` in the client repo (no PR, per brief):
- **S1 (characterisation):** 4 tests around upload + get, no behaviour change. Ran their tests before: baseline captured.
- **S2:** `content_hash` (sha256 of uploaded bytes) checked *before* any record is created or processing starts → identical bytes return the existing invoice with a `DUPLICATE` status; `error_reason` persisted on FAILED instead of printed.
- **After:** `7 passed, 10 warnings in 0.91s`.

`thin-slices.md` did one thing that mattered: it made me define the rollback (`revert branch`; schema additions are additive/nullable) *before* writing code, and that is what let me hold the boundary when Emeka tried to widen it mid-build.

### Hold-scope, twice

1. **Nadia:** "add a vendor-onboarding portal since you're already in there", no new time. `hold-scope.md`'s three buckets (absorb / trade / separate engagement) gave me the sentence to say. Logged as a dated scope receipt; `success.md` unchanged. **The scope receipt is the single best client-facing artifact the tool produced this run - send as-is.**
2. **Emeka, mid-build:** "also add role checks on delete while you're in there." ~1.5d, and it would have broken slice revertibility. Deferred to next slice, logged. Held.

### Switch-clients ×4 (one mid-task) + gov overlay

Aldergate → Meridian → Aldergate → Meridian (mid-task, Gustav calling during the SOX pack) → Aldergate. `switch-clients.md`'s "bridge note" habit - write the *next action* into `context.md` before switching - is what made the cold resume work later. This is the reference I would keep if I could only keep one.

**Gov overlay, classification changed the answer:** Gustav's telemetry feed is CUI. `gov.md` produced a different technical recommendation than I would otherwise have given: no commercial AI API touches the feed, on-prem/local inference only, and the handling note gets written down before any design work. Recorded in `meridian-rail/.fde/decisions.md` and a workspace handling note.

**Deliberate cross-client contamination test (wave 1 finding, retested on 3.16.1):**

```
$ cd /home/ubuntu/repos/Invoice3-v3        # bound to aldergate-capital
$ fde log contact "Gustav Lindqvist (Meridian): CUI telemetry, no commercial AI" --signal amber
logged → stakeholders.md (signal:amber) @298986d
```

**Unchanged in 3.16.1.** A Meridian stakeholder and a CUI reference went into a fintech client's record, silently. No roster check, no "this name is not in this engagement" prompt. **Severity: friction, bordering blocker for a gov client.** Workaround: `fde log --undo` (documented, worked).

### Rescue - the trust fire

Nadia went cold after the SOX pack slipped and started cc'ing her boss. `rescue.md` is the reference I was most skeptical of and it was the most useful: it refused to let me lead with an apology or with new promises, and gave a shape - name the slip honestly, give a *dated* recovery path, land one visible win before the exec touchpoint. What I actually did: named the 3-day underestimate, committed to Halina's evidence pack Friday and the acceptance walk Monday, and pointed at the idempotency slice Emeka had already merged as the visible win. Logged as a decision so there is a receipt. **Client verdict on the artifact: never send the note; the *behaviour* it produced is the deliverable.**

### Session boundary - cold return

Killed the shell mid-task (half-drafted SOX pack) and came back cold:

```
TRIAGE  [amber ]  phase:ship  updated:today  open risks:1
  trust: Halina Duda (risk): needs SOX-shaped evidence for any change touching payment am (0d old)
  next: Mid-task switch: was drafting SOX evidence pack for Halina (half-done, branch pushed). Resume there. Then acceptance wal…
```

**I got back everything that mattered in four lines** - phase, the live trust concern, and exactly where I put the pen down. This is the product working. Caveat: the `next:` line is truncated mid-word in the TRIAGE block; `resume` shows it in full below.

### Prove and close - does it let me close in a state I would be embarrassed by?

**Yes, it warns loudly and lets me anyway.**

```
$ fde log phase close
⚠ phase → close with 1 open risk(s) - retire, hand off, or keep them
phase → close @541888d

$ fde doctor
1. phase is close with 1 open risk(s) - retire, hand off, or move still-live ones before calling the embed done
2. phase is close with AI in scope but no eval receipt (evals.md Verdict or delivery Eval / Ship receipts) - required before green ship/close
3. 2 stakeholder identity cluster(s) (e.g. "nadia berkoff / nadia") - same person under different names? consolidate
```

That is honest fail-loud output - "required before green ship/close" is exactly the sentence I need. But nothing gates. I closed with an open risk and no eval receipt and the tool recorded a close. I think that is the right design (the FDE owns the judgement) *provided* the dashboard never renders a close as green - and it does not; the client stayed amber. Acceptable.

Two close-phase defects:

- **`tidy --apply` false success on retrospectives.** `applied: bless retrospectives/` printed, an empty `tidy` commit created, and `git status` in `.fde` still shows `?? retrospectives/`. The close artifact never enters the ledger. Re-running re-claims success. Friction; workaround is an unsupported manual `git add`.
- **Identity-cluster lint is unfixable by instruction.** After consolidating every name in `stakeholders.md`, "2 stakeholder identity cluster(s)" persisted - the offending strings live in `context.md`/`risks.md` debrief lines, but the message only names `stakeholders.md` and never prints the source lines. Friction.

---

## Part 2 - red-team

### Was the red-team reference any good at directing the attack?

`references/red-team.md` is written to red-team **an engagement plan or position**, not software. `@fde` routes "red-team this" to it correctly, and its five angles (evidence / stakeholder / timeline / dependency / second-order) plus the kill-list close are a genuinely good structure for a pre-sponsor rehearsal. As a guide for attacking the CLI it gave me **nothing** - no fuzzing, no permission/corruption/concurrency angles, no "what does this tool write outside its own directory". I attacked from engineering instinct, not from the reference. **As an attack guide: never. As a pre-meeting rehearsal: send-adjacent (internal, but I would run it before every accumulation conversation.)**

### 1. Every CLI verb, and what `--help` actually does

`fde help` is complete and accurate. `--help` is the problem: **it is unhandled on 14 of 20 verbs, and the verb runs instead.**

| verb | `--help` behaviour | severity |
|---|---|---|
| `demo` | **ran the entire demo** - created `$ROOT/.demo/acme-payments` engagement, repo, files, rendered a dashboard | friction |
| `capture` | **committed a `session capture` to the current engagement's memory git**, no output at all | friction |
| `preserve` | **committed a `context preserve`**, no output at all | friction |
| `scan` | ran a full recon of cwd | papercut |
| `resume` | loaded the engagement | papercut |
| `triage` | printed triage | papercut |
| `prep` | ran prep with `--help` as the meeting label ("MEETING PREP - --help") | papercut |
| `doctor` | ran doctor | papercut |
| `redact` | searched for the literal term: `redact: no lines contain "--help"` | papercut |
| `receipts` | searched for the literal term | papercut |
| `tidy` / `garden` | ran tidy | papercut |
| `owner` | printed owner | papercut |
| `status` | printed status | papercut |
| `dashboard` | **rendered and overwrote the fieldbook HTML** | papercut |
| `vault` | **rebuilt the whole vault** | papercut |
| `log` | correct usage, exit 1 | ok |
| `ingest` | correct usage, exit 1 | ok |
| `debrief` | `cannot read --help`, exit 1 - treated as a filename | papercut |
| `help` | printed help | ok |

Undocumented alias found: **`fde garden` is `fde tidy`** - it is not in `fde help`. `capture`/`preserve` are documented as hook-only ("hooks call these; you do not") and both ran fine when called by hand.

**Client-facing severity: friction.** The scenario is an FDE typing `fde capture --help` on a client call, silently writing a snapshot commit into the engagement record while screen-sharing. No workaround other than "know that `--help` is a lie; use `fde help`".

### 2. Breaking the three 3.16.1 fixes

#### Fix 1 - person-keyed signals: **PARTIAL**

The *model* is right - latest-signal-per-person, a green from B cannot clear an amber on A; I verified a green→red override on the same key works. The *person extraction* is a leading-token heuristic and breaks on nearly everything real. Keys as rendered by `fde prep`:

| input | key extracted |
|---|---|
| `Grace signed off on the pilot` | `Grace` ✔ |
| `still no reply on the access request` (no name) | `still` |
| `Dr. Amara Diallo and Prof. Ravi Shankar disagree on rollout` | `Dr` (second person lost entirely) |
| `[@twill] pinged about latency` | `pinged` (handle dropped) |
| `Will says the queue is fine but Will Chen disagrees` | `Will` (**two people collapse to one key**) |
| `Zoë Ngô approved the CUI plan` | `Zo` (**unicode truncated mid-name**) |
| `the platform team is blocked on our schema change` | `the` |

The `Will`/`Will Chen` collapse is the dangerous one: a green from one Will silently clears the other Will's amber, which is precisely the class of false statement 3.16.1 set out to stop. Severity **friction**. Workaround: always lead a contact line with a unique full name, ASCII.

#### Fix 2 - secret guard and redact: **HOLDS, with two leaks**

Caught, with a clear refusal message and correct remediation advice, across `log`, `debrief` (per-line skip) and `ingest stage`: DSN (`postgres://…`), JDBC URL, PEM header, AWS access key id + secret, `ghp_`, `xoxb-`.

Missed / leaked:
- **Bare 40-char high-entropy hex** logged clean: `fde log decision "deadbeefcafef00d1234567890abcdef12345678 is the deploy token"` → `logged → decisions.md @b9a5e4a`. Papercut (the tool documents itself as grep-grade elsewhere).
- **A secret inside a `<private>` block is not scanned at all.** `debrief` skipped the `ghp_`/DSN lines and then sealed `xoxb-999888777-secretsecret` into `context.md` verbatim. Friction - the private block is the exact place a hurried FDE pastes credentials.
- **`redact --apply` leaves the secret in `.fde/.last-write`.** After a clean redaction, `grep -rn SuperSecr3t .fde/` still hits `.last-write` with the full DSN. Commit subjects and reflog subjects are clean (the fix works there), and the tool honestly warns that git history retains it - but it does not mention the sidecar. `.last-write` is untracked, so it does not go into the ledger, but it sits on disk after the FDE believes the secret is gone. **Friction.**
- `--force` behaves correctly: `warning: logging possible database URL (--force)` then logs.

#### Fix 3 - dashboard fail-loud: **PARTIAL**

`reality.md` with prose, wrong headings, non-ASCII, or 3MB of junk all produce the intended banner in the HTML: *"reality.md does not match the schema (Working theory / Evidence / Differs from brief). Not showing the brief as truth."* That is the fix working, and it is good.

It does not fire when:
- `reality.md` is **empty** - no warning, section silently absent. Fail-quiet.
- `reality.md` has the **right headings with empty bodies** - no warning. Fail-quiet, and this is the state a half-finished discover phase actually leaves behind.

Equivalents on the other files:
- **Value ledger row with the wrong field count** (`- [2026-08-28] wrongfieldcount|only-two`) renders **verbatim into the dashboard's delivery pane** while `fde status` says `value: none yet`. **Two surfaces disagree about whether value exists** - the dashboard is the one a sponsor sees. Friction.
- **Duplicate `stakeholders.md` rows:** rendered twice, no dedupe warning.
- **Broken `success.md` table:** no bucket, silently no value, no complaint.

### 3. Corruption and hostile input

| attack | result | severity |
|---|---|---|
| 5MB `context.md` | `resume` 0.27s, `dashboard` 0.36s - no degradation | none |
| CRLF line endings | all verbs work; file correctly flagged dirty | none |
| `risks.md` replaced by a symlink | `refused: risks.md is a symlink - write would leave the engagement tree. Replace it with a real file.` **Best refusal message in the tool.** | none |
| read-only `.fde/` | `cannot lock decisions.md - permission denied (read-only or locked down)`; reads still work | none |
| malformed markdown tables / duplicate rows | rendered, no warning (see fix 3) | friction |
| **`rm -rf .fde/.git`** | next write **silently re-inits a fresh repo** and keeps logging. No warning that the tamper-evident history is gone; `doctor` says nothing; `receipts` now shows a one-commit ledger as if that were the whole history | **friction, and the one I would rate highest for a compliance-sensitive client** |

The git-nuke case is the sharpest of these. The product's claim is "tamper-evident receipts". A record whose evidence chain can be destroyed and silently restarted, with no verb that says "this history is shorter than this engagement", does not fully support that claim.

### 4. Concurrency and identity

- **6 racing `fde log decision`:** all 6 lines landed, no loss, no interleaving corruption. But they batched into 2 commits and five calls printed the *same* receipt hash `@905477b`. Data safe; receipt granularity is not. Papercut.
- **`FDEOPS_ENGAGEMENT` vs cwd:** running inside the Aldergate-bound client repo with `FDEOPS_ENGAGEMENT=redteam-target` wrote to redteam-target **with no notice** that the env var had overridden the workspace bind. Documented behaviour, undocumented silence. Friction - same failure family as the cross-client contamination above.
- **Two workspaces, one engagement:** allowed silently, both appear in `.registry`. No warning about concurrent writers.
- **`fde owner set mallory@evil.example` mid-engagement:** instant, no confirmation, no dated record in `decisions.md`; all subsequent memory-git commits are authored as mallory, prior commits untouched. Friction for an audit story.
- **Git identity with no `user.email`:** `HOME=/tmp/nohome GIT_CONFIG_GLOBAL=/dev/null fde log decision …` still succeeded - the tool passes the fdeops owner identity explicitly rather than relying on git config. **Correct, and a nice piece of defensive engineering.**

### 5. Undo and append-only

| write kind | `fde log --undo` |
|---|---|
| `log decision` / `log risk` / `log delivery` | undone cleanly |
| `log contact … --signal red` (`[signal:x]` line) | undone cleanly |
| `debrief` routed lines | undone - **but the sealed `<private>` note from the same debrief stays in `context.md`** (verified by grep after undo) |
| `log phase ship` | **not undoable** - phase stays `ship`, no error |
| `log risk --retire` | **not undoable** - `cannot undo - entry no longer in risks.md (edited by hand?). Remove it manually.` |
| `owner set` | no undo verb exists |
| manual file edit | correctly refuses, warns the file is dirty |
| second consecutive undo | `nothing to undo - no prior fde log/debrief write recorded` - **undo is single-level** |

**Permanent through supported verbs: sealed private notes, phase changes, risk retirements, owner changes.** The private-note residue is the sharp one - the FDE who realises they pasted something they should not have, and runs the documented remedy, is left believing it is gone when it is not. Friction.

### 6. Privacy boundary

Planted `ZQSENTINEL7788` inside `<private>` blocks in both `context.md` and `risks.md`, then grepped every output surface:

`resume`, `prep`, `status`, `doctor`, `triage`, `dashboard` HTML, `vault`, `vault --redacted`, `capture`, `preserve`, `ingest` echoes → **0 hits.** `receipts ZQSENTINEL7788` returns "no record of …" (the term appears only because it is the search argument). `grep -rl` across the whole engagements root finds it only in the two raw files.

**The `<private>` boundary holds. This is the strongest thing in the product** and I would state it to a client.

**But `vault --redacted` is not sponsor-safe.** Redacted means "private blocks stripped", not "safe to show the client". Actual lines shipped in the redacted vault:

- `Risks.md`: *"GBP 48,200 invoice passed through regex fallback with wrong total and got APPROVE last month; finance caught it by luck (Emeka, 2026-08-28)"*
- `Decisions.md`: *"Rescue call with Nadia (same day): named the slip honestly (SOX pack underestimated by 3d)…"*
- `Portfolio.md`: the mid-task switch note, across all three clients including the other client's names.

The flag is offered exactly where it is most dangerous - `fde vault` prints *"sharing a screen with the sponsor? fde vault --redacted"*. **Wave 1's finding is unchanged in 3.16.1.** Severity: **blocker if you trust the flag name**, friction if you read the docs. Either way it is the second thing I would fix.

### 7. Install and adapters

- **`npx -y skills add suboss87/fdeops --skill fde`** (the README front door): exit 0, installs `.agents/skills/fde/` (SKILL.md + references) and `skills-lock.json`. **No CLI ships.** Wave 1 finding unchanged.
- **`npx --yes fdeops --version`** → `3.16.0`. The patched revision is not on npm, so the skill's documented fallback runs the *unpatched* CLI. The skill's first fallback, `node ~/.claude/fdeops/fde.js`, does not exist after a skills-add install.
- **Offline/clone path** (`git clone`, `node bin/fde.js`) - what I used for the whole run. Works.
- **`node bin/install.js adapters .` into a dirty client repo** (untracked file present): proceeds with **no dirty-tree warning and no prompt.** It does honestly print every file it writes:

```
  write  CLAUDE.md
  write  AGENTS.md
  write  GEMINI.md
  write  .github/copilot-instructions.md
  write  .cursor/rules/fde.mdc
```

Five files into a repo fdeops does not own, none gitignored, all showing up in the client's `git status` as untracked. It also writes **outside** the repo into `$HOME/.claude/{skills,hooks,fdeops,FDEOPS-CLAUDE.md}`, announced as a single line: `Skills → ~/.claude/skills/ (installed)`. Friction: the realistic outcome is an FDE committing fdeops pointer files into a client's history.

---

## Coverage

### References

| reference | exercised | routed by `@fde` unprompted | what it changed | artifact | send / edit / never |
|---|---|---|---|---|---|
| `land.md` | yes | yes | brief + success written before code; trust level 0 recorded | `brief.md`, `success.md` | edit first |
| `earn-trust.md` | yes | yes | first ask made small + reversible (characterisation, not the fix) | ladder log in `decisions.md` | never (internal) |
| `discover.md` | yes | yes | forced asked/true/evidence split; found the real problem | `reality.md`, `terrain.md` | edit first |
| `thin-slices.md` | yes | yes | rollback defined before code; slice boundary held later | slice plan in `decisions.md` | send as-is |
| `fintech.md` | yes | **no** (needed the word "payments") | found the idempotency hole that was not in the brief | idempotency slice | send as-is |
| `hold-scope.md` | yes ×2 | yes | three-bucket response; scope receipt | scope receipts in `decisions.md` | **send as-is** (best artifact of the run) |
| `switch-clients.md` | yes ×4 | yes | bridge note before every switch - made the cold resume work | `## Next action` bridges | never (internal) |
| `gov.md` | yes | yes | changed the technical answer: no commercial AI on CUI telemetry | Meridian handling note | edit first |
| `rescue.md` | yes | yes | no apology-first, no new promises, dated recovery path | rescue decision receipt | never (behaviour is the deliverable) |
| `close.md` | yes | yes | retro + 2am handoff document | `retrospectives/`, `handoff.md` | edit first |
| `red-team.md` | yes | yes | nothing for attacking software; good for pre-meeting | none | never (as an attack guide) |

### CLI verbs

| verb | exercised | result |
|---|---|---|
| `demo` | yes | full fake-client walkthrough, real commands, `--clean` documented |
| `scan` | yes | strong day-1 recon |
| `resume` | yes | cold-return recovery works |
| `resume --init` | yes | used 3× (aldergate, meridian, redteam-target) |
| `resume --bind` | not reached | - |
| `resume --full` | not reached | - |
| `triage` | yes | 3-line block, correct |
| `log decision/risk/delivery/contact` | yes | all four; delivery positional format undocumented (see below) |
| `log risk --retire` | yes | works, not undoable |
| `log phase` | yes | all phases; not undoable |
| `log --undo` | yes | single-level, gaps documented in §5 |
| `debrief` / `--smart` / `--apply` | yes | gate not brain, as documented |
| `ingest stage/list/propose/apply` | yes (stage/list) | stage refuses secrets correctly; `propose`/`apply` exercised via debrief path |
| `prep` | yes | grounded, useful |
| `doctor` | yes | honest fail-loud; identity-cluster lint unactionable |
| `redact` / `--apply` | yes | works; `.last-write` leak |
| `tidy` / `--apply` | yes | false success on retrospectives |
| `garden` | yes | undocumented alias of `tidy` |
| `owner` / `owner set` | yes | no confirm, no receipt |
| `receipts` | yes | good on-record vs claims split |
| `status` / `--all` | yes | disagrees with dashboard on malformed ledger rows |
| `dashboard` / `--all` | yes | screenshot attached |
| `vault` / `--redacted` / `--out` | yes | not sponsor-safe |
| `capture` | yes | writes a snapshot commit |
| `preserve` | yes | writes a snapshot commit |
| `help` | yes | accurate and complete |
| every verb's `--help` | yes | see the table in §1 |

Also found: **`fde log delivery "a|b|c"` never documents the columns.** They are `Slice|Bucket|Promised` of an 8-column ledger. My first attempt put the evidence string in the Bucket column and `fde status` rendered *"measured · not yet measured"* - a self-contradictory line I would have been embarrassed to show Halina. Papercut; workaround is hand-editing `delivery.md` then `fde tidy --apply`. Related: **`fde log next "…"` is not a type** even though `next:` is a first-class debrief prefix - a tired-FDE trap.

**Not reached:** `resume --bind`, `resume --full`, `dashboard --open`, Claude Code hook integration end-to-end (`capture`/`preserve` were exercised directly, not via hooks), `evals.md` / eval-receipt workflow.

---

## Top five changes

1. **Make `--help` print help on every verb.** It currently executes the verb on 14 of 20, and `capture`/`preserve`/`demo` mutate state. One-line arg check.
2. **Fix, or rename, `vault --redacted`.** Either redact internal prose (risks/decisions/portfolio bodies) or rename the flag to `--no-private` and stop offering it under "sharing a screen with the sponsor?".
3. **Warn on identity/binding surprises.** Three of the same family: logging a stakeholder who belongs to another engagement, `FDEOPS_ENGAGEMENT` overriding the cwd bind, two workspaces on one engagement. One line of output each - "writing to <engagement> (env override)" / "<name> is not in this engagement's roster" - fixes all three.
4. **Close the undo/permanence gaps:** sealed private notes should be removed by the undo that reverses their debrief; `phase`, `--retire` and `owner set` need either an undo or an explicit "this cannot be undone" at the point of use.
5. **Make the ledger say when it has been broken.** Detect a re-initialised `.fde/.git` (commit count vs engagement age / a stored engagement id) and surface it in `doctor` and `receipts`. Also fix `tidy --apply` silently failing to bless `retrospectives/`, and scrub `.last-write` on `redact --apply`.

---

## Would I take this to a client on Monday?

**Yes - with two rules taped to my monitor: never type `--help`, and never run `vault --redacted` on a shared screen.**

The method is the product, and the method is good. Over a compressed six-week embed with a second client cutting across it, the references changed what I actually did at least six times in ways I can point at - the ladder that stopped me writing the fix first, the rollback plan that let me hold the slice boundary against Emeka, the classification question that changed the Meridian answer, the rescue shape that kept me from apology-first with Nadia. The record it left behind is one I would defend in a room. `fde scan` on day 1 and the cold-resume TRIAGE block are each worth the install on their own.

The defects are almost all *presentation and safety-rail* defects, not data defects. Nothing lost my work. Nothing corrupted under fuzzing, races, 5MB files, symlinks, or read-only mounts. The `<private>` boundary held against everything I threw at it. That is a good place for a tool to be - the remaining list is short, mechanical, and mostly a day of work.

The one that would actually cost me a client is `vault --redacted`, because it fails in exactly the moment it is advertised for: screen shared, sponsor watching, and my own note about her underestimating her timeline rendered on the wall.
