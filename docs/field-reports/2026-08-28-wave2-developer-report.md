# FDEOps wave 2 - developer report

**Tested:** `field-gates` @ `a1d1ec1`, `package.json` 3.16.1 (`npm run check`: 130/130, exit 0).
**Method:** three independent FDEs, three engagements on three real client repos, entered cold from the
README, coverage-matrix driven so that all 37 references, every CLI verb, and every adapter had a named
owner. ~510 commands with captured stdout across the three runs, plus a 9-item verification of #71's own
test plan and independent reproduction by me of every finding I call a blocker below. No FDEOps source
was modified during testing; workarounds are recorded as findings, not fixes.

| Run | Engagement | Client repo | Own report |
|---|---|---|---|
| A | commercial half: exec, board, money, PHI (healthcare) | `suboss87/CA` | `2026-08-28-exec-commercial-health.md` |
| B | inherited Go codebase, local model only, handover to a non-AI ops team | `suboss87/picoclaw` | `2026-08-28-deep-engineering-localllm.md` |
| C | full lifecycle land→close (fintech + gov), then a deliberate red-team of the tool | `suboss87/Invoice3-v3` | `2026-08-28-lifecycle-redteam.md` |

Wave 1 (v3.16.0, four runs) is in PR #70. This report supersedes it where they disagree.

---

## Verdict

All three would take it to a client on Monday. All three taped a rule to the monitor first.

The method is the product and it is genuinely strong: `@fde` routed to the right reference unprompted in
**48 of 51** exercised cases (misses: `fintech` needed the word "payments"; `encode-pattern` and the
adapters needed naming). References changed what the FDE actually *did* - not just what they wrote down - 
at least six times per run: `review.md` stage 2 caught a real `nil []string` → JSON `null` bug in run B's
own change that stage 1 had passed; `what-breaks.md`'s who-notices column reframed run B's entire
engagement; `score-use-cases` demoted the sponsor's pet chatbot to 10/375 and gave run A a number to hold
the line with; `red-team.md` found two EXPOSED gaps in run A's own board memo. The
**business-case → board-memo → red-team chain, never previously tested, is the strongest thing in the
kit.** The data layer is also now solid: run C attacked it with 6 racing writes, a 5MB `context.md`,
symlinks, CRLF, read-only mounts and missing git identity and found **zero data-loss defects**, and the
`<private>` sentinel appeared in **0** of 12 output surfaces.

What stops it being unconditionally shippable is a consistent, narrow class: **the tool states things to
the FDE and the sponsor that are not true, and the gates it advertises do not gate.** 3.16.1 fixed three
instances of exactly that. It did not fix the class, and wave 2 found five more.

---

## The pattern: 3.16.1 fixed the instances, not the classes

Verification of #71's test plan: **4 PASS / 5 PARTIAL / 0 FAIL** (comment on #71 has the full log).

| Fix | Reported case | Class |
|---|---|---|
| Person-keyed signals | **fixed** - Marcus Hale resolves across bullets, RED clears | **open** - a bullet naming nobody still mints a stakeholder |
| Redact commit subject | **fixed** - subject is `redact 1 line(s)` | **open** - `.fde/.last-write` retains the secret verbatim after `--apply` (run C) |
| Dashboard fail-loud | **fixed** - half-filled `reality.md` prints `UNREADABLE …` | **open** - empty, or right-headings-with-empty-bodies, warns nothing |

Signal extraction, reproduced by me on `a1d1ec1`:

```
$ fde log contact "batch failed again, nobody owns it [signal:red]"
$ fde prep
  [green] Marcus Hale · recovery confirmed by Marcus Hale, batch green two nights
  [red]   batch       · batch failed again, nobody owns it
```

A stakeholder named `batch` still pins the engagement RED. Across the three runs the keys minted were
`batch`, `still`, `Friday`, `Dr`, `pinged`, `Zo` (from `Zoë Ngô`), `the` (a team line), and a
first-name-only line created a **second** entry for a person already in the table. Two people sharing a
first name (`Will` and `Will Chen`) collapse to one key - so **one Will's green clears the other's amber**.
A two-person bullet resolves the first and **silently drops the second**. Also: `doctor`'s
identity-cluster lint does not cluster `Ingrid Halvorsen` / `ingrid h` / `I. Halvorsen`, and when it does
fire it never names the offending strings, so it is unactionable.

The fix is not a better regex. If no roster stakeholder resolves, **refuse the signal or attach it to the
engagement** rather than minting a person, and warn on multi-person bullets instead of taking the first.

---

## Defects, ranked

Severity is "in front of a paying client". Items marked **(reproduced)** I ran myself on `a1d1ec1`.

### Blockers

**1. `receipts` says "nothing was ever logged" about an entry that is on disk. (reproduced)**
Same class as the wave-1 bugs - the tool volunteers a false statement, and this one lands in the middle of
an audit conversation. An unclosed `<private>` seals everything after it, including entries added later.
`doctor` knows; `receipts` does not caveat:

```
$ fde receipts "payer benchmarking"
no record of "payer benchmarking" - nothing was ever logged about it. A gap in the record, not proof of absence…

$ grep -n "payer benchmarking" .fde/decisions.md
16:- [2026-08-28] [@ubuntu] we will keep payer benchmarking out of scope for phase one

$ fde doctor
  2. decisions.md has 1 unclosed <private> - everything after it is sealed, including notes added later
```

`receipts` must warn when a file it searched has a sealed tail. It should also search `business-case.md`,
which run A found it skips, and it matches literal substrings only - no stemming, so "idempotent" misses
"idempotency".

**2. `--help` executes the verb. 14 of 20 verbs. (reproduced)**
`capture --help` and `preserve --help` **silently commit** to the memory git; `demo --help` builds the demo
engagement; `dashboard --help` and `vault --help` overwrite artifacts; `log delivery --help` commits the
literal string `--help` as a value-ledger entry:

```
$ fde capture --help
$ git -C .fde log --oneline
7522214 session capture

$ fde log delivery --help
logged → delivery.md @daeaac5
- [2026-08-28] [@ubuntu] --help
```

An FDE types `--help` while screen-sharing. This mutates the client record on camera, and the fix is an
afternoon.

**3. `vault --redacted` is not sponsor-safe, and the CLI suggests it is.** Wave-1 finding, unchanged.
`<private>` is stripped correctly; everything else ships verbatim, including run C's "£48,200 incident"
and the note about the rescue call with the sponsor, and run A's dashboard calling the CMO a "resistor".
Either redact internal prose or **rename it `--no-private` and stop advertising it for sponsor screens**.
Note the contrast: run A's `vault --redacted` grepped clean of PHI, so the flag is *nearly* the right
idea; it is the naming and the risks/decisions prose that make it dangerous.

**4. The gates are attendance-taking, not judgment.** The single highest-value change in this report.
Run B built a real 20-case eval pack from the client's log shapes, ran it, got 7 false approves and wrote
`Verdict: NO-SHIP` dated today - then shipped and closed with `doctor` clean, because `hasEvalReceipt`
accepts any dated run or one `| pass |` row regardless of verdict. `close` with 3 open risks warns and
proceeds. `phase` never blocks. If FDEOps' pitch is that it stops an FDE from telling a sponsor something
untrue, **`doctor` at ship/close must fail on `NO-SHIP` and on open risks**, and the exit code has to mean
something.

### High

**5. The secret guard misses the current OpenAI key format. (reproduced)** Both runs A and B found it
independently. `sk-[A-Za-z0-9]{20,}` is defeated by the hyphen in `proj-`:

```
$ fde log decision "old key sk-abcd1234EFGH5678ijkl9012MNOP3456"
refused: log text looks like a OpenAI-style key.

$ fde log decision "rotate OPENAI key sk-proj-abcd1234EFGH5678ijkl9012MNOP3456qrst"
logged → decisions.md @b38a7d4
```

Same for `sk-ant-`. Also open: a bare 40-char high-entropy string logs clean; a secret inside a
`<private>` block passes `debrief` unscanned; and `.fde/.last-write` keeps the secret after
`redact --apply`. The delivery-ledger path is not covered by the guard tests at all.

**6. `ingest` is PHI-blind.** Run A staged a note containing a patient name, DOB, MRN and SSN into
`.inbox` with no warning, in an engagement the healthcare overlay had already flagged, and `propose`
routed the raw PHI lines toward `context.md`. The overlay knows it is a HIPAA engagement; the ingest path
does not ask it. At minimum warn on SSN/MRN/DOB shapes when the engagement is healthcare-flagged.

**7. `log --undo` can delete the wrong write.** After run B applied a 36-line debrief, `--undo` removed a
stakeholder line **from a previous debrief**. It is single-level, it leaves sealed private notes behind,
and `phase`, `risk --retire` and `owner set` cannot be undone at all - with no upfront warning that they
are permanent. For an FDE who is not git-fluent this is silent data loss; run B recovered only by
`git revert` inside `.fde/.git`.

**8. `adapters/LOCAL-LLM.md` does not work as written** - the never-tested adapter. Step 1's verb
`npx fdeops init` does not exist; the documented `ollama run --system` flag does not exist on Ollama
0.33.1; and the doc never says the routed reference must be loaded into the model, which is the whole
mechanism. Run B got a working loop via `fde resume --init` + `/api/chat`, then found the deeper problem:
a 1.5B model routed implicit takeover phrasing to "Land first" and **fabricated audit evidence with
perfect headings**. If you keep this adapter, state a minimum model size and tell people the model may
invent evidence. `GEMINI.md` is byte-identical to `AGENTS.md` and points at `~/.claude/skills/fde/SKILL.md`,
which does not exist after the README's own install.

### Friction

- **Cross-engagement writes are silent.** Run C logged a Meridian Rail stakeholder into Aldergate's
  `stakeholders.md` @`298986d` with no warning; `FDEOPS_ENGAGEMENT` silently overrides the cwd bind; run A
  hit the same thing from an unbound cwd resolving to the registry's current engagement. Two clients, one
  laptop, and gov/PHI separation obligations - this needs to print the engagement name on every write.
- **`.fde/.git` deletion is silent.** The next write re-inits a fresh repo; `doctor` and `receipts` say
  nothing. A tamper-evident ledger must notice its own history being destroyed.
- **`tidy --apply` false success.** Prints `applied: bless retrospectives/`, makes an empty commit, file
  stays untracked, and repeat runs re-claim success.
- **Delivery ledger format is undocumented.** `help` says `a|b|c`; the parser wants 7 cells. A 3-field row
  writes blank columns, and misuse rendered `measured · not yet measured` in `status` while the dashboard
  showed the row verbatim - two surfaces disagreeing about the same file. Both runs found this only by
  reading `bin/fde.js`.
- **`doctor`'s `reality.md`/`terrain.md` error text does not match the parser.** Run A followed the error
  exactly, wrote `## Working theory`, and stayed UNREADABLE - the parser wants bold-inline
  `**Working theory:**` and literally `Differs from brief how:`, and `terrain.md`'s empty template heading
  shadows a filled one below.
- **`--smart` still is not.** With the vocabulary now printed: 0/9 structural on run B's unprefixed notes,
  4/8 on mine, 4/9 on run C - and it never splits a multi-fact note, so a 295-char rush note became one
  `risks.md` blob and a clear decision inside a voicenote stayed in `context.md`. It is a preview gate, and
  a good one; consider not calling it `--smart`.
- **`scan` noise persists** - run B measured ~50% false positives in the TEMPORARY section (it flags the
  `ErrTemporary` sentinel's own definition). Still worth running on day 1, per all three FDEs.
- **`ingest` on docs floods `context.md`** - 36 bullet lines from repo documentation. It is a
  meeting-note tool; say so.
- **Adapters write 5 files into a client repo** (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`,
  `.github/copilot-instructions.md`, `.cursor/rules/fde.mdc`) plus `$HOME/.claude/*`, with no dirty-tree
  warning. `AGENTS.md` says FDEOps installs on the FDE's machine, never customer infrastructure.
- **The README front door still ships no CLI.** `npx skills add suboss87/fdeops --skill fde` installs
  skill files only; the `npx fdeops` fallback resolves published **3.16.0**, i.e. not the patched build;
  the skill's own fallback path `~/.claude/fdeops/fde.js` does not exist after `skills add`.
  `fde --version` prints the help twice and exits 1.

### Papercuts

`ingest` on a directory returns raw `cannot read bulk (EISDIR)`; proposing a second ingest item silently
discards the first un-applied proposal; `garden` is an undocumented alias of `tidy`; unknown flags on
`owner` are silently ignored; `dashboard` exit code stays 0 while rendering a broken state.

---

## Coverage

**References: 37/37 assigned, 36 exercised.** `ai.md` and `eval-pack.md` were skipped by run A (honest
skip: the BAA gate held, so no AI feature shipped) but were fully exercised by run B. `connect.md` was
exercised as a capability check by A and read-only by B - no MCP host on either box. Per-reference
artifacts and send / edit-first / never verdicts are in the three run reports.

Client-deliverable verdicts, aggregated: **send as-is** - `three-options`, `business-case`, `readout`,
`review`, `runbook`, `close`, `encode-pattern`, `thin-slices`, `hold-scope`, `fintech`, `ingest`,
`connect`. **Edit first** - most of the rest. **Never** - `who-decides`, `earn-trust`, `red-team`,
`healthcare` trust-profile, `dashboard`, `switch-clients`, `rescue`. That last group is the useful signal:
**seven references produce artifacts that are actively unsafe to show the client**, and nothing in the
tool marks them as internal-only. A `<private>`-by-default convention for those, or an explicit
internal/external tag per artifact, would remove a whole category of accident.

Two references are worth a second look on content, not tooling: `red-team.md` is written for red-teaming
*plans*, so it gave run C nothing for attacking software (the five-angles/kill-list part is excellent for
pre-meeting prep); and `rescue.md` has no silent-degradation mode - its opening move
`git log --since='6 hours ago'` is empty and irrelevant for a job that stopped producing output two days
ago, and half the checklist presumes visible breakage. `plan.md` and `thin-slices.md` overlap ~30%.

**CLI:** every verb exercised. Not reached: `resume --bind`, `resume --full`, `dashboard --open`,
hook-driven `capture`/`preserve` (exercised directly; no agent host on the boxes), `ingest propose/apply`
as a path distinct from `debrief --apply`.

**Adapters:** Claude, AGENTS, Cursor, Copilot, Gemini, LOCAL-LLM all exercised. LOCAL-LLM driven with a
real local model (Ollama `qwen2.5:1.5b`) for the first time - see defect 8.

---

## The eight changes, in order

1. Make the gates real: `doctor` fails at ship/close on `Verdict: NO-SHIP` and on open risks. Exit codes
   that mean something.
2. `--help` prints help on every verb. Nothing mutates the record behind a help flag.
3. `receipts` caveats a sealed tail instead of asserting nothing was logged; also search
   `business-case.md`.
4. Fix or rename `vault --redacted`.
5. Stop minting stakeholders: no roster match → refuse the signal or attach it to the engagement; warn on
   multi-person bullets; make the identity lint name the offending strings.
6. Secret guard: hyphenated modern key formats (`sk-proj-`, `sk-ant-`), high-entropy bare strings, inside
   `<private>`, the delivery-ledger path, and scrub `.last-write` on `redact --apply`. Add PHI/PII shapes
   (SSN/MRN/DOB) to `ingest` and `log` when the engagement is healthcare-flagged.
7. Rebuild `log --undo` as a stack over the memory git that targets the actual last write; state upfront
   which verbs cannot be undone.
8. Print the engagement name on every write, and warn on identity surprises: env override, unbound cwd,
   stakeholder not in this engagement's roster, two workspaces on one engagement, re-inited `.fde/.git`.

Then documentation, which is cheap and currently costs users real time: the delivery-ledger 7-cell
format, `doctor`'s `reality.md`/`terrain.md` error text matching the parser, and a README install path
that actually yields a runnable `fde` on the patched version.

---

## Is it ready for a paying client?

For the engineering half and the commercial half both - yes, with the rules the three FDEs wrote down
themselves: never type `--help`, never screen-share `vault --redacted`, run `doctor` before any `receipts`
demo in front of a stakeholder, sweep for PHI before `ingest`, and read every gate as advice. That is a
short list of mechanical, non-architectural defects in front of a method that is better than what most
consultancies run on. Fix the eight above and the rules come off the monitor - at which point the honest
claim is not "a fieldbook for FDEs" but the only tool that makes an FDE's record defensible in front of
an auditor.

One caveat on this report: three of these engagements were fictional clients on real code. Everything
about the tool is real and reproducible; the human dynamics were played, not lived.
