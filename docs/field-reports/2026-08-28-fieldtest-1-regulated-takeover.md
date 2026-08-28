# Field test 1 - FDEOps on a regulated-fintech takeover

**Date:** 2026-08-28 · **Use case:** regulated-takeover · **FDEOps:** 3.16.0 (npm) · **Tester:** AI coding agent + FDE-expert voice

## The embed

Northwind Payments, mid-size AP/invoice processing under a financial-services compliance regime. Previous consultancy left mid-engagement with a half-finished "agentic validation" path in production behind a fail-open flag. Client codebase: `suboss87/Invoice3-AWS` (FastAPI + SQLAlchemy backend, LangGraph agents on Bedrock Nova, React frontend, real pytest suite). The inherited brief said "automate invoice data entry end to end with AI, cut AP headcount". The AP lead's version - the true one - was "the pain is chasing POs that don't match, ~2h/day". Asked to deliver: take over honestly, land one defensible improvement, prove it, and leave a record Marcus's platform team could run without me. Marcus withheld production credentials the whole run; Dana went silent for four days mid-run; compliance (Ravi) wanted after-the-fact explainability.

## What I ran

Entered cold via the README, installed the advertised way, sandboxed with `FDEOPS_ENGAGEMENTS_ROOT=$HOME/fde-test-engagements`. The real sequence:

```
npx -y skills add suboss87/fdeops --skill fde        # advertised install - worked
npx --yes fdeops resume                              # "NO ENGAGEMENT ... fde resume --init <client-name>"
npx --yes fdeops resume --init northwind-payments
npx --yes fdeops scan                                # day-1 recon on Invoice3-AWS
npx --yes fdeops log phase discover
npx --yes fdeops debrief --smart /tmp/kickoff-notes.txt   # messy, prefix-free notes
npx --yes fdeops debrief --apply
# spike: real code importing their deterministic_validator, run against their data shapes
DATABASE_URL=sqlite:///./spike.db ./venv/bin/python ~/northwind-spike/po_mismatch_triage.py
# slice: characterise fail-open classifier, add CLASSIFIER_FAIL_MODE=closed, prove it
DATABASE_URL=sqlite:///./test_invoice3.db ./venv/bin/python -m pytest tests -q   # 107 passed, 1 skipped
# eval before ship
DATABASE_URL=sqlite:///./eval_invoice3.db ./venv/bin/python -m evals.run_eval --mock
npx --yes fdeops log contact "Dana silent for 4 days after Tuesday demo..." --signal red
npx --yes fdeops receipts "vendor portal"
npx --yes fdeops log risk "...postgresql://invoice3:Sup3rS3cretPW9@..."   # secret-paste probe
npx --yes fdeops redact "Sup3rS3cretPW9" && ... --apply
npx --yes fdeops vault --redacted                    # private-block probe
npx --yes fdeops dashboard                           # rendered, opened in Chrome, screenshotted
npx --yes fdeops status / prep handover / doctor / log phase close
```

The engineering was real: the client suite ran before and after the slice (107 passed both times), the new gate has nine passing tests (`backend/tests/test_classifier_gate.py`), the spike imports their `_amount_match` and runs, and the eval harness produced `evals/results/20260828-121518.json` with `FALSE-APPROVES 0 (ceiling: 0)`.

## What worked

**Takeover routing exists and is different from a fresh land.** The skill routes "taking over, previous consultant left → audit", which produced `audit.md` (verified vs assumed claims, load-bearing modules, highest current risk, first three actions) instead of a greenfield brief. On the ground that mattered: the audit discipline is what surfaced that the previous crew's AgentCore runtime in `archive/` was never stable while Dana thought it was live. Evidence: `.fde/audit.md`, decision log entry "Route as takeover (audit), not fresh land".

**The brief-vs-reality artifact caught the wrong brief - with help.** `reality.md` forces "stated brief" against "observed reality" with evidence. Writing it made me check commit churn: `invoices.py` 12 commits/90d, `agentic_validation_service.py` 9 - the repo itself agreed with Priya that matching, not keying, is the hot path. Without the artifact I would have started on extraction. The method carried this; `fde scan` alone did not (see below).

**The trust signal actually drives the Friday state.** `fde log contact "Dana silent for 4 days..." --signal red` flipped the `resume`/`doctor` triage banner to `[RED ]` immediately and surfaced the quote plus my next action. Evidence:

```
TRIAGE  [RED   ]  phase:discover  updated:today  open risks:4
  trust: Dana silent for 4 days after Tuesday demo. No reply to eval-receipt ema...
  next: Re-engage Dana (red signal, 4 days silent): send the month-end number dr...
```

One banner instead of archaeology. This is the single most useful thing in the tool.

**Receipts answered the vendor-portal ambush in one command.** Dana in writing: "did we ever agree to drop the vendor portal?"

```
$ npx --yes fdeops receipts "vendor portal"
ON RECORD (dated - defensible):
  decisions.md:13  - [2026-08-28] "Vendor portal is parked - out of scope for this
  phase (Dana, kickoff 2026-08-28, after dispute with Marcus)."
```

Dated, attributed, quotable in a reply email. Caveat: the receipt is only as good as the routing was on the day the note was taken (see debrief below).

**Private blocks are properly excluded from shared-screen surfaces.** Put a sensitive stakeholder note in `<private>...</private>`, ran `fde vault --redacted`: zero occurrences in the vault; also zero in the dashboard HTML (the greps I ran against both outputs). The source stays in `.fde/`. This worked exactly as advertised.

**The value ledger discipline changed my behaviour.** `fde status` prints value before trust, and the promised → measured → **accepted by** schema forced me to record the slice as `claimed - Priya confirmed operationally; Dana (signer) silent 4 days` instead of closing green on arithmetic nobody signed. I would not have made that distinction unprompted, and it is exactly the distinction a sponsor dispute turns on.

**The secret guard exists and is well-worded - for known formats.**

```
$ npx --yes fdeops log risk "test: AKIAIOSFODNN7EXAMPLE key seen in CI logs"
refused: log text looks like a AWS access key id.
Do not log credentials into engagement memory. Redact first, or pass --force...
```

Exit 1, actionable remediation in the message. See the coverage gap below.

**The dashboard is sponsor-presentable.** `fde dashboard` rendered a Today queue (red-signal next action first), a client page with trust state, people with signals, five dated risks, and the decision/receipt log - 0 tokens, pure render. I would put the client page in front of Dana, with one exception (the Why-panel bug below).

## What did not work

**1. Dashboard "Why" panel silently equates brief with reality - severity: blocker (for a sponsor screen).**
Expected: "What they asked for" = the inherited brief; "What's actually true" = the reality.md finding (PO-mismatch triage).
Actual: both lines rendered the same inherited-brief text:

```
What they asked for: Automate invoice data entry end to end with AI, cut AP headcount." ...
What's actually true: Automate invoice data entry end to end with AI, cut AP headcount.
```

My `reality.md` was free-form prose rather than the template's `**Working theory:**` fields, and the renderer silently fell back to the brief instead of leaving the slot empty or flagging it. On a shared screen this asserts the exact thing the engagement exists to correct. Reassuring but not true - the worst failure class. Workaround: rewrite `reality.md` to the template schema; but a silent wrong default on a sponsor-facing surface needs to fail loud.

**2. Secret detection missed the most common paste - severity: blocker (regulated client).**
Expected: a connection string with an embedded password to be refused like the AWS key was.
Actual: `fde log risk "...postgresql://invoice3:Sup3rS3cretPW9@northwind-staging...:5432/invoice3..."` was accepted and committed (`logged → risks.md @6acedc9`) with no warning. `fde redact --apply` then removed the whole line (taking my rotation reminder with it) and honestly warned "history may still contain it" - verified: `git show 6acedc9:risks.md` still contains the password. For a fintech client the ledger's git history now holds a credential and the tamper-evidence story conflicts with the only fix (history rewrite). Workaround: re-log a sanitized risk by hand; treat `.fde/` as secret-bearing until rotated.

**3. The eval gate is prose, not a gate - severity: friction.**
Expected: something in the tool to block or at least flag a ship while `evals.md` lacks a SHIP verdict (the skill says AI-touching ship "stays fix-first" until then).
Actual: `fde doctor` checked hygiene (caught my missing `## Next action`, exit 1 as designed) but never looked at `evals.md`; nothing distinguishes an empty eval pack from a green one. The gate held in this run only because the agent obeyed the method text. I built and ran the real harness - `pass@1 11/20 | FALSE-APPROVES 0 (ceiling: 0) | false-denies 24` in mock mode (the mock LLM rejects everything, so all 8 clean cases false-deny) - and wrote the honest verdict: SHIP for the deterministic slice only, NO-SHIP for autonomy expansion pending a real-Bedrock rerun that Marcus's credential freeze blocks. The tool recorded that; it did not enforce it.

**4. Smart debrief misroutes unprefixed 6pm notes - severity: friction.**
Expected: `debrief --smart` on genuinely messy notes to roughly sort decisions/risks/contacts.
Actual: it put the Marcus-credentials line in `delivery.md` and dumped nearly everything else into `context.md`. I had to rewrite `.debrief-propose` by hand with explicit `decision:`/`risk:`/`contact:` prefixes before `--apply`. The confirm-before-apply flow made this safe, but "smart" is doing very little; the receipts feature (which later saved the vendor-portal question) only worked because I fixed the routing manually.

**5. Scan noise on a real repo - severity: friction.**
`fde scan` counted secrets findings from vendored packages under `backend/venv`, inflated test counts with env files, reported "no test neighbor" for code that has tests, and found the archived AgentCore code as the AI surface while missing the live Bedrock path in `invoices.py`. I verified three claims against the code; the useful ones (framework, entry points, churn) held, the headline ones (secrets, AI surface) needed manual re-derivation. An engineer trusting the scan on day 1 would brief the client wrongly.

**6. The value ledger row is hand-authored - severity: papercut.**
"Every ship gets a value ledger row", but `fde log delivery` appends prose bullets to "Running value"; the actual ledger table in `delivery.md` had to be written by hand after grepping templates to find its schema. `fde status` then rendered it beautifully - the plumbing between `log delivery` and the ledger is just missing.

**7. Assorted papercuts.** `fde` not on PATH after the advertised skill install (the documented `npx --yes fdeops` fallback works, but the skill promises the human never types commands and the agent's first act is discovering the binary is not there); `fde dashboard --help` re-renders the dashboard instead of printing help; every write warns verbosely about uncommitted manual edits (correct, but noisy when the method itself tells you to hand-edit artifacts like `evals.md`).

## What this is actually like

Expert voice, bluntly: **this is a method with a tool attached, and the method is the good part.** The artifacts that forced behaviour - `audit.md` on a takeover, `reality.md` against the brief, the eval pack before an AI ship, the promised/measured/accepted-by ledger - each changed what I actually did at least once, and I can name the moment for each. That is rare; most engagement tooling is paperwork that describes work already done.

Where it earns its keep: the Friday state (`resume`/triage banner), dated receipts, trust signals, and the shared-screen redaction story. Those are the things a real embed loses first, and FDEOps genuinely keeps them.

Where it is theatre: everything that claims to be automatic. "Smart" debrief routing, scan's AI-surface detection, the eval "gate", the secret guard's coverage - all of them are the agent's judgment wearing the tool's clothes. When the tool did carry me, it was deterministic (git, grep, render). When it pretended to be clever, I had to check it, and twice (dashboard Why panel, scan) it was confidently wrong in a way that would have embarrassed me in front of the sponsor.

Would I take it into a real client next Monday? **Yes, with caveats.** Caveats: treat `.fde/` as secret-bearing (history retains pastes); never share a dashboard without eyeballing the Why panel; assume debrief routing needs review; and know that every "gate" is advisory. For a regulated client I would also want the attribution story fixed before Ravi sees the audit trail - git-config identity with no signing and no remote is an engineering log, not evidence.

## The five things I would change first

1. **Fail loud on sponsor-facing fallbacks.** If `reality.md` (or any artifact) doesn't match the expected schema, the dashboard must render "not recorded" - never substitute the brief for reality. One wrong default on that screen costs the engagement's credibility.
2. **Add connection-string and high-entropy detection to the log guard.** `user:password@host` URLs and long random tokens are the pastes that actually happen; the AWS-key regex catches the rare case and misses the common one. Also: `redact --apply` should offer a line-rewrite (mask the token, keep the note) instead of deleting the whole line.
3. **Make the eval gate a check.** `fde doctor` (or a `fde ship` pre-flight) should fail when phase is ship/close, `delivery.md` has an AI-touching slice, and `evals.md` has no dated SHIP verdict with critical-fails 0. The method already states the rule; enforce it where the record is.
4. **Wire `fde log delivery` to the value ledger.** Prompt for promised / measured / accepted-by (defaulting accepted-by to `claimed`) and write the table row. The ledger is the single best sponsor artifact in the system and it currently depends on the agent knowing an undocumented table schema.
5. **Scope `fde scan` to tracked files and the live dependency graph.** Exclude venv/node_modules from secrets and test counts; derive the AI surface from imports actually reachable from entry points, not string matches in archived code. A day-1 recon that inflates findings teaches the engineer to ignore it by day 2.

## Evidence

- Field log (real-time): `~/field-log.md` (attached to the session)
- Fieldbook tarball: `~/fieldbook.tgz` (`tar czf ~/fieldbook.tgz -C $FDEOPS_ENGAGEMENTS_ROOT .`)
- Dashboard screenshots (Chrome render): Today queue and client page (attached)
- Client-side work (branch `devin/1787919180-classifier-fail-mode` on Invoice3-AWS): `backend/app/api/invoices.py` gate + `backend/tests/test_classifier_gate.py` (9 tests), suite 107 passed / 1 skipped before and after
- Eval run artifact: `backend/evals/results/20260828-121518.json` - `pass@1 11/20 | FALSE-APPROVES 0 (ceiling: 0)`
- Spike: `~/northwind-spike/po_mismatch_triage.py` (imports the client's `deterministic_validator`)
