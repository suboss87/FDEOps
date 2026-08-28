# Field report: deep-engineering-localllm (wave 2, run B)

- **Date:** 2026-08-28
- **FDEOps revision tested:** branch `field-gates`, commit `a1d1ec1`, `package.json` version **3.16.1** (`npm run check`: 130/130 pass on this commit)
- **Client (fictional):** Kessler Freight Systems - Ingrid Halvorsen (EM/sponsor), Bo Tran + Sunita Rao (ops, no AI tooling), Dermot Fahey (dispatch supervisor)
- **Client codebase (real):** `suboss87/picoclaw` (Go, 393 .go files, 150 test files, 1052 commits; engagement branch `kessler/cron-stall-visibility`)
- **Constraint:** no cloud model. Local model only: Ollama 0.33.1 + qwen2.5:1.5b (986 MB), on this box.
- **Sandbox:** `HOME=$SB/home`, `FDEOPS_ENGAGEMENTS_ROOT=$SB/engagements`, engagement slug `kessler-freight`.

**The question:** on someone else's codebase, with no cloud model and an ops team that will never use
an agent, does FDEOps produce engineering artifacts that survive contact with the people who inherit them?

**The answer:** mostly yes - and the parts that survive are exactly the parts that don't need a model.
The method (audit → what-breaks → thin slices → two-stage review → rollback drill → runbook → close)
produced artifacts Bo and Sunita can genuinely run, and `.fde/` receipts answered a six-weeks-later
audit question honestly. What does *not* survive: the local-model adapter as documented (two broken
commands, and a 1.5B model routes wrongly and invents evidence), the eval gate (a NO-SHIP verdict
ships clean through `fde doctor`), and the rescue reference when the failure is silent rather than
loud. Every claim below is backed by a command in `field-log.md` with its actual output.

---

## 1. Cold install (README front door)

`npx -y skills add suboss87/fdeops --skill fde` → exit 0, installs **skill only** at
`./.agents/skills/fde` (SKILL.md + 37 references). No CLI. The SKILL.md fallback
`npx --yes fdeops --version` returns **3.16.0** - the published package, not the 3.16.1 under test.
Path used for the run: `node <checkout>/bin/fde.js` from the `field-gates` checkout.

Cross-finding: `adapters/GEMINI.md` (byte-identical body to AGENTS.md) points at
`~/.claude/skills/fde/SKILL.md`, which does **not exist** after the README cold install. Adapters
assume `install.js`; the front door doesn't run it.

## 2. Local model (adapters/LOCAL-LLM.md) - first ever exercise

Mechanically the local-first claim holds: everything ran with zero network calls to a model provider.
The doc does not:

- Step 1 says `npx fdeops init my-client` - **no such verb** (prints help). Real verb: `fde resume --init <slug>`.
- The Ollama example `ollama run my-fde-model --system "$(cat SKILL.md)"` fails on Ollama 0.33.1:
  `Error: unknown flag: --system`. Workaround: `/api/chat` with a system message.
- Routing probes at 1.5B: implicit takeover phrasing → **wrong route** ("Land first, then discover");
  explicit word "takeover" → correct (`references/audit.md`). Asked to *do* the audit with only
  SKILL.md in context, the model hallucinated generic PM steps; with SKILL.md **and** audit.md in the
  system prompt it produced the correct artifact skeleton but invented facts ("backups not enabled" - 
  never told it that). **Structure transfers at 1.5B; evidence discipline does not.** The adapter
  never says you must also feed the routed reference file to the model - that's the biggest doc gap.

Verdict: adapter = **edit first** (fix the two commands, add "load the routed reference", and a
warning that sub-3B models must not be trusted with routing or evidence).

## 3. Takeover, terrain, what-breaks

Routed via SKILL.md decision table: inherited work + no docs → **audit** (the local model got there
too, once "takeover" was explicit). Baseline first: plain `go build ./...` **fails** out of the box
(`pattern workspace: no matching files found`); `make generate` first, then build clean, `go test ./...`
50 packages ok. That gotcha went straight into the runbook.

- `fde scan` day-1 recon: stack counts fine; HOTSPOTS honestly empty ("no commits in the last 90
  days" - true, last commit 2026-03-12); TEMPORARY archaeology ~50% noise (flags picoclaw's
  `ErrTemporary` error-sentinel code as excuse comments); AI COMPONENTS and PREVIOUS ATTEMPTS
  (real reverts) genuinely useful. Verdict: **edit first**.
- audit.md/terrain.md/reality.md written from `git log` evidence (churn leaders:
  `pkg/agent/loop.go` 122 commits, `pkg/config/config.go` 120, both main authors departed).
- what-breaks on `pkg/cron` before touching it: break → who notices (Dermot, days late) → workaround
  (manual re-run) → evidence (job history). The reference made me answer "who notices" - which is
  what surfaced that *nobody* notices silent failures, and that became the whole engagement. Output
  is real, not template-fill, **because the evidence column forces git/test citations**. Verdict:
  audit + what-breaks = **send after edits** (they're internal-voice, need sponsor framing).

## 4. Plan vs thin-slices

Different jobs: plan.md is sequencing + politics + a kill list; thin-slices.md is per-slice execution
discipline. Real overlap ~30%: both restate vertical slicing, blast radius, acceptance criteria, and
plan.md's Now/Accepts/Touches block *is* a thin-slice spec. They don't conflict, they duplicate.
Verdict: keep both, dedupe the shared prose. Artifacts = **send after edits**.

## 5. The real slice, review, ship, rollback

Shipped on `kessler/cron-stall-visibility`: `consecutiveFailures` tracking + `StallThreshold=3` +
`stalledJobs` in `Status()` in `pkg/cron/service.go` (+2 tests, 94 insertions). Full suite green
before and after (50 pkgs, 0 fail, real output).

- **review.md two-stage claim HOLDS:** stage 1 (intent) passed; stage 2 (mechanics) caught a real bug
  stage 1 could not - `Status()` returned a nil `[]string`, which serializes to JSON `null` instead
  of `[]`. Fixed, re-tested. That is a genuine catch on my own change.
- ship.md: readiness gate + intent-vs-diff executable without prod; assumes a deploy exists - 
  branch-only engagements need interpretation. **Edit first.**
- rollback.md: actually drilled - `git revert --no-edit HEAD HEAD~1`, rebuild, `go test -count=1
  ./pkg/cron/` → PASS, ~2s of test time. Gotcha the reference doesn't warn about: the first run said
  `(cached)` - Go's test cache almost handed me a fake rollback receipt. **Edit first** (add a
  cache-busting note per ecosystem).

## 6. The AI question - and the gate that isn't

Eval pack: 20 golden cases shaped from picoclaw's actual cron log formats, labels ok/retry/escalate;
harness (`harness.py`) drives qwen2.5:1.5b at temp 0. Real run: **total=20 pass=13 fail=7
false_approves=7** - every false approve was an escalate-class error (auth expiry, DNS, permission
denied, dup key, 0-byte output) downgraded to "retry". Verdict written to `.fde/evals.md`:
**NO-SHIP, dated 2026-08-28**. Ingrid's decision logged: classifier parked, rules-only routing stays.

Gate test on 3.16.1 (`fde doctor`, phase=ship, AI in scope):
- **Empty eval pack: caught.** "AI in scope but no eval receipt", exit 1.
- **NO-SHIP verdict with a dated run: ships clean.** `hasEvalReceipt` (bin/fde.js ~line 2486)
  accepts `Last run: YYYY-MM-DD` regardless of verdict; even a single golden-row ending `| pass |`
  satisfies it.
- **The 3.16.1 eval gate checks "an eval happened", not "the eval said SHIP".** Wave 1 said the
  gate was prose; in 3.16.1 half of it became code - the wrong half. A NO-SHIP pack passes doctor.

## 7. The quiet failure (rescue.md)

Scenario: dispatch-sync exits ok, processes nothing, Dermot notices two days late. rescue.md's
opening move - `git log --since="6 hours ago"`, "something always changed" - is empty and wrong for
this class: nothing changed. Modes are A technical fire / B trust fire / C wrong brief / D pivot;
**there is no silent-degradation mode**. Steps that landed: observe-first, instrument before
touching. Live receipts logged during the drill. The honest kicker, proven with a real Go test
(`TestSilentSuccessIsInvisible`): after 5 no-op "ok" runs, `lastStatus=ok consecutiveFailures=0
stalledJobs=[]` - **our own shipped slice does not catch success-shaped silence.** Logged as an open
risk, handed off with a named owner, and the watermark slice pulled forward as sprint-1 priority.
Verdict on rescue.md: handles "on fire" well, "silent" poorly - **edit first**.

## 8. Replaceable: runbook, close, encode-pattern

- runbook.md's "2am document" skeleton judged for Bo + Sunita: every step is a shell command or file
  read, **no hidden agent dependency** - and the reference's examples kept me honest when a first
  draft nearly said "ask @fde for the stalled list". Skeleton = **send as-is**.
- close.md is the strongest reference in the set: the close gate forced a downgrade - the value row
  is measured but has no customer-side "Accepted by" name/date, so it closes as **claimed**, not
  accepted. The reference names this trap explicitly. **Send as-is.**
  Caveat: `fde log phase close` with 3 open risks **warns but does not block** - advisory only.
- encode-pattern: extracted "silent-success watermark" (trigger/steps/mechanism/edge case/evidence).
  Genuinely reusable at the next client, not a diary entry - the template's required sections force
  transferability. **Send as-is** (internally).

## 9. Handover under audit (receipts)

Ingrid, six weeks later: "why is the stall threshold 3?" - `fde receipts "stall threshold"` /
`"StallThreshold"`: **no record**, and the tool says so exactly right: "a gap in the record, not
proof of absence: if it WAS agreed, log it now, dated today." `fde receipts stalled`: 8 dated hits - 
the feature history (what shipped, review verdicts, nil-slice fix, open risk) is fully answerable.
Receipts replay only what you logged; the constant's rationale wasn't logged at decision time, so I
logged it late, explicitly dated. Search is literal substring (no stemming - "stall threshold"
misses "StallThreshold"). Output = **send as-is** - it is honest about its gaps.

## 10. Debrief volume, ingest, connect

Five messy real-shaped notes (standup, Slack paste with code, whiteboard photo description,
filler-word voicenote, no-punctuation rush note):
- Before knowing prefixes: **0/9 lines structural, 9/9 → context.md.** Lossless but unrouted.
- `--smart` teaches the prefix vocabulary but treats a whole note as ONE line (295-char rush note →
  risks.md as a single blob; the voicenote's clear decision stayed in context). It never splits.
- After rewriting with prefixes: **8/10 structural.** The vocabulary works; extraction is on the human.
- `fde ingest` on the repo's own `docs/troubleshooting.md`: mechanically clean (stage → propose →
  confirm) but meeting-note-shaped - it flooded context.md with 36 doc lines. Wrong tool for docs.
- **Bug (reproduced): after `fde debrief --apply` of that 36-line dump, `fde log --undo` removed a
  line from a PREVIOUS debrief** (a stakeholder contact), not the just-applied flood. Recovered only
  via the memory git (`git revert`). A non-git-fluent FDE silently loses a contact AND keeps the flood.
- connect.md: read; honest contract (host-configured MCPs, no stored tokens); no MCP host here, so
  partially exercised.

## 11. Doctor to zero, tidy, capture/preserve, hooks

Reached **OK - no structural issues, exit 0** at phase close (wave 1 could not). How: supported verbs
got most of the way - `fde log delivery "a|b|c|d|e|f|g"` fills all 7 ledger cells including
Accepted-by (undocumented; help says `a|b|c`), `fde log risk --retire` ×5, `fde log phase`. But
success done-definition, reality schema, and terrain operating-map rows are **hand-edit only**;
`fde tidy --apply` then blesses them (real commit). Zero is reachable, and the hand-edit + bless path
is honest - but the help never tells you which files are hand-edit-only.

`fde capture`/`fde preserve`: exit 0, zero stdout, real memory-git commits. Session boundary held:
fresh env + `fde resume` reloaded triage, next action, last debrief. Hooks read (no host to run
them): session-stop drains stdin, refuses relative engagement paths, no network.

## 12. Attacking the three 3.16.1 fixes

### Person-keyed signals - **HOLDS (partial break in subject extraction)**
Green logged for "Ingrid Halvorsen" did **not** clear a red keyed to another form; status stayed RED
("a green from B cannot clear an amber/red on A"). Correct, conservative. Breaking variant:
**lowercase names mis-key - "ingrid h - quiet since Friday…" was keyed to person "Friday"** (dashboard
People panel: Ingrid Halvorsen / Friday / Halvorsen as three people), and doctor's
ambiguous-stakeholder detector did not cluster Ingrid Halvorsen / ingrid h / I. Halvorsen. Fails
safe (extra RED), but attributes trust to a weekday.

### Secret guard + redact - **HOLDS (one format gap)**
Refused with exit 1 and recovery hints: AKIA… AWS key, Bearer JWT, `password=…`, and a `ghp_…` token
inside a debrief file (line skipped, rest routed). `fde redact` preview/apply removed lines,
committed, and warned "git history still holds prior commits - rotate the real secret". Breaking
variant: **`sk-proj-…` (current OpenAI project-key format) passes the guard** in both `fde log` and
the delivery ledger - the regex `\bsk-[A-Za-z0-9]{20,}` is defeated by the hyphen in `proj-`. Prose
credentials also pass (fair; regex can't catch prose). Related: `fde log --undo` is single-shot and
(see §10) can target the wrong commit - undo is the weakest recovery verb.

### Dashboard fail-loud - **HOLDS**
With reality.md mangled to non-schema text and context.md deleted, the render is loud and honest:
"next action not set", phase "?", trust "at risk", and the Why panel prints verbatim "UNREADABLE - 
reality.md does not match the schema … Not showing the brief as truth." Nothing invented; CLI stdout
carried hygiene triage. Broken-state and healthy-state screenshots taken.

Would I show `fde dashboard` to Ingrid? The healthy render, yes - person-keyed trust, a decision log
that reads like an audit trail, zero-token deterministic render. Fix the lowercase-name keying first
if notes contain informal names.

## Coverage

### References (assigned)

| Reference | Exercised | Routed by SKILL.md unprompted | Verdict as client deliverable |
|---|---|---|---|
| audit.md | yes | yes (takeover → audit) | edit first |
| terrain.md (operating map) | yes | yes | edit first |
| what-breaks.md | yes | yes (high-churn risk) | edit first |
| plan.md | yes | yes | edit first (30% dup with thin-slices) |
| thin-slices.md | yes | yes | edit first |
| review.md | yes | yes | send as-is (stage 2 caught a real bug) |
| ship.md | yes | yes | edit first (assumes prod) |
| rollback.md | yes | yes | edit first (test-cache trap) |
| ai.md | yes | yes (AI in scope) | edit first |
| eval-pack.md | yes | yes | edit first (gate not enforced) |
| rescue.md | yes | yes | edit first (no silent mode) |
| runbook.md | yes | yes (handoff) | send as-is (skeleton) |
| close.md | yes | yes | send as-is |
| encode-pattern.md | yes | brief-directed | send as-is (internal) |
| connect.md | partial (no MCP host) | brief-directed | n/a |
| adapters/LOCAL-LLM.md | yes | n/a | never (as-is: 2 broken commands) |
| adapters/GEMINI.md | read + path check | n/a | edit first (dangling path) |

### CLI verbs / flags (assigned or used)

| Verb / flag | Exercised | Result |
|---|---|---|
| `npx skills add` cold install | yes | skill-only, no CLI |
| `fde resume` / `--init` | yes | works; `fde init` is not a verb |
| `fde scan` | yes | useful; TEMPORARY ~50% noise; hotspots honestly empty |
| `fde log decision/risk/contact/next/delivery` | yes | works; secret guard on all paths |
| `fde log risk --retire` | yes (×5) | works, committed |
| `fde log delivery` value ledger | yes | 7-cell row undocumented but works |
| `fde log phase` | yes | close with open risks warns, doesn't block |
| `fde log --undo` | yes | single-shot; targeted wrong commit once (bug) |
| `fde debrief` / `--smart` / `--apply` | yes | routes whole notes, never splits |
| `fde ingest stage/propose/confirm` | yes | clean mechanics, floods context.md on docs |
| `fde receipts` | yes | honest gaps; literal substring only |
| `fde doctor` | yes | reached exit-0 zero; NO-SHIP eval passes gate |
| `fde tidy --apply` | yes | blesses hand-edits, real commit |
| `fde redact` / `--apply` | yes | works, honest history warning |
| `fde dashboard` | yes | fail-loud holds; 0 tokens |
| `fde capture` / `fde preserve` | yes | silent, real commits |
| `fde --version` | yes | not a verb; prints help, exit 1 |
| session hooks (start/stop/pre-compact) | read only | no agent host on box |

## Top five changes I'd ask the maintainer for

1. **Make the eval gate real:** `fde doctor` at phase ship/close must fail on `Verdict: NO-SHIP` (and
   on fail-rows), not accept any dated run as a receipt.
2. **Fix LOCAL-LLM.md:** replace `npx fdeops init` with `fde resume --init`, replace the broken
   `--system` Ollama flag with the `/api/chat` pattern, and state that the routed reference file must
   be loaded into the model - plus a floor on model size for routing.
3. **Fix `fde log --undo`:** make it a proper stack over the memory git and make it target the actual
   last write (the misfire after `debrief --apply` loses data for non-git users).
4. **Secret guard:** cover `sk-proj-`/hyphenated modern key formats (`\bsk-[A-Za-z0-9-]{20,}` class).
5. **Rescue reference:** add a silent-degradation mode (nothing changed, nothing errored, output
   stopped) - observe-first, watermark/throughput instrumentation, who-notices inversion.

## Bottom line

Would I run the next takeover with FDEOps? Yes - for the method and the receipts. The references made
me do real things in the right order (baseline before touching, who-notices before changing, two-stage
review that caught a real JSON bug, a rollback I actually timed, a close that refused to call claimed
value accepted). The `.fde` memory answered an audit question six weeks later without inventing
anything. What I would not do is trust the tool's gates to stop a bad ship (they don't), hand the
LOCAL-LLM doc to anyone as-is, or let a small local model near routing or evidence. The artifacts that
survive contact with Bo and Sunita are the ones written by the discipline, not by the model - which,
for a tool whose pitch is judgment-stays-yours, is the right failure mode. The runbook survives; the
adapter doesn't.
