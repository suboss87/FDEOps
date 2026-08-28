# Field report — exec-commercial-health (wave 2, run A)

**Date:** 2026-08-28 · **Revision tested:** branch `field-gates`, commit `a1d1ec1b59cf6d4c32d100d083703b132c2b4ac8`, version 3.16.1 · **Client repo:** `suboss87/CA` @ `1874ee18` (`new-main`; default branch is empty) · **Engagement:** Brightwell Health Partners (fictional; 9-clinic provider group, PHI in scope)

**The question:** can an FDE run the *commercial* half of an engagement — stakeholders, prioritisation, compliance, economics, board memo, scope control — out of this tool?

**Verdict: yes, with edits.** The commercial chain (who-decides → pick-three → three-options → business-case → board-memo → red-team → readout) is the strongest part of the kit — stronger than the engineering half. Every commercial artifact I produced was traceable to a dated, person-attributed record, and `fde receipts`/`fde prep` let me answer Kwame and Terrence from evidence in seconds. What stops "yes, unconditionally": a PHI-blind ingest path, an `sk-proj-` hole in the secret guard, a receipts surface that can confidently say "no record" while the record sits sealed behind an unclosed `<private>`, and a handful of tired-FDE traps (`fde log delivery --help` logs the string `--help`).

## Install path

- Cold install `npx skills add suboss87/fdeops --skill fde`: installs the skill + references under `~/.claude/skills/fde/` but **no CLI on PATH** (wave-1 finding still true). It prints where the CLI lives; I used the cloned checkout: `node <checkout>/bin/fde.js` aliased to `fde`, sandboxed with `HOME=$SB/home`, `FDEOPS_ENGAGEMENTS_ROOT=$SB/engagements`.
- `fde --version` prints the full help twice, not a version. Version only visible in package.json.

## Routing (`@fde`)

Headline: **routing worked unprompted for every phase of the run.** SKILL.md's routing table has explicit, unambiguous rows for every situation this engagement produced — landing, who-decides, assumptions, pick-three, three-options, POC, healthcare overlay, business case, board memo ("sponsor's boss needs a summary"), red-team ("poke holes"), demo-prep, ingest, connect, hold-scope, readout, artifacts. I never had to hand-pick a reference the brief hadn't already named, and for the ones it did name, the table would have routed there anyway.

## The commercial chain (the assigned headline)

**business-case → board-memo → red-team** works as a chain because each stage reads the previous stage's file:

- business-case.md forced cost-of-doing-nothing first (17.7 h/wk measured, $214k FY25 leakage — both client-sourced, dated, receipts-retrievable: `fde receipts 214k` → `decisions.md:75 [2026-08-28] [@ubuntu] …Kwame's FY25 missed-renewal memo…`).
- board-memo.md forced SCQA + pyramid + pre-wired hostile questions, sourced only from the record.
- red-team.md, run on my own memo, found two EXPOSED gaps I had genuinely missed: Dr. Beck absent from the memo entirely (one board question away from embarrassment), and Marisol as an unmitigated single point of failure. It also caught the memo saying "shipped" before the CA branch existed. This is the first reference in the kit that made me *worse-off not to run*.

Provenance answer for Kwame: **the tool helps if the FDE has discipline.** Numbers logged via `fde log`/`debrief` get dated `[@who]` lines and receipts finds them. But `business-case.md` itself is not in the receipts search set (neither AGREEMENTS nor CLAIMS in bin/fde.js) — a figure that lives only there has no receipt. Log the source first, then cite it in the case.

## What worked (evidence in field-log.md, commands + stdout)

| Item | Evidence |
|---|---|
| Person-keyed trust signals | Beck red ("went quiet") never cleared by Marisol/Renata greens; status/prep always showed worst-active; misspelled "Terence Vaughn" +green created a ghost person but did NOT clear real Terrence's amber; doctor flags the identity cluster |
| Evidence answer to "what does your AI tool send to a vendor" | grep of bin/ = zero network primitives; `strace -f -e trace=connect,sendto fde status` = 0 network syscalls; memory git = 0 remotes. Local-only claim verified, not quoted |
| Triage demoted the chatbot | scored 10/375 (alignment-only); displacement conversation with Renata recorded; she kept the three |
| POC killed/confirmed in a day | rule engine + regex register: 5/5 fields on templated payer docs, 1–2/5 on non-template → CONFIRMED Option B (deterministic first pass, HITL) |
| Real slice shipped in CA | branch `devin/1787923599-renewal-register`: `backend/rules/renewalRegister.ts` + test, 3/3 pass (`npx tsx backend/rules/renewalRegister.test.ts`), `npm run check` clean before/after |
| Ingest honesty | stage→propose→apply never writes `.fde/` unconfirmed; oversized 10.8MB refused with limit stated; applied facts receipts-retrievable |
| Redacted vault | grep for patient name/SSN/MRN/trust-notes/red-team → zero hits; closest thing to sponsor-safe in the kit |
| Fail-loud on corruption | binary garbage in a 2nd client's stakeholders.md → "memory unreadable - verify (binary data in stakeholders.md)" on triage/status/dashboard; dirty-tree warnings; no invented green |
| Scope pressure | hold-scope's "let me place it" + scope receipt: Renata's chatbot-small deferred with displacement cost on record; Beck's PHI-through-model ask refused under healthcare overlay with alternative + escalation path |

## What did not work

| # | Finding | Severity |
|---|---|---|
| 1 | **Ingest is PHI-blind.** A file with patient name/DOB/MRN/SSN staged into `.inbox/` with no warning; propose routed raw PHI lines toward context.md. The secret guard knows AWS keys, not PHI. In a HIPAA engagement this is the sharpest gap in the kit. | high |
| 2 | **Secret guard misses modern OpenAI keys.** `sk-proj-…` logged without refusal — pattern is `/sk-[A-Za-z0-9]{20,}/`; the hyphen in `proj-` defeats it (same for `sk-ant-`). DB URLs are caught; `fde redact --apply` cleans up and honestly warns history retains it. | high |
| 3 | **Unclosed `<private>` seals the ledger tail and receipts stays confident.** Logging a sentence that *mentions* `<private>` sealed everything after it; `fde receipts 214k` then answered "no record … nothing was ever logged" while the record sat on disk. `fde doctor`/status flag it — but receipts itself volunteers the false negative with no caveat. Same class as the wave-1 bugs. | high |
| 4 | `fde log delivery --help` logs the literal string `--help` as a delivery entry (committed). Any unrecognized flag after `fde log <type>` is swallowed as content. | med |
| 5 | Value ledger only counts pipe-separated rows; prose `fde log delivery` lands as a bullet `fde status` ignores ("value: none yet"). Undocumented — found in source. | med |
| 6 | Doctor's reality.md error names headings but the parser requires bold-inline `**Working theory:**` labels (third must be literally "Differs from brief how:"); terrain.md template ships an empty `## Operating map` heading and a second filled heading below is invisible (first-heading wins). Two debugging loops a 6pm FDE loses. | med |
| 7 | Running `fde` inside an engagement folder that is not a bound workspace silently resolved to a *different* client (the registry's current). Wrong-client surface. | med |
| 8 | `fde ingest stage <dir>` → raw `cannot read bulk (EISDIR)`; `.debrief-propose` is one shared file so proposing item B silently discards item A's un-applied proposal. | low |
| 9 | Cold install ships no CLI; `fde --version` prints help twice; unknown flags on `fde owner` silently ignored. | low |

## The three 3.16.1 fixes under attack

| Fix | Verdict | Evidence |
|---|---|---|
| Person-keyed signals | **HOLDS** | case-insensitive keying correct; misspelling makes a ghost person, never clears the real person's amber; hygiene flags the cluster |
| Secret guard + redact | **PARTIAL** | db-URL refused; `fde redact --apply` works and warns about history; **broken by `sk-proj-`/`sk-ant-` keys** (finding #2) |
| Dashboard/status fail-loud | **HOLDS, with one adjacent gap** | corruption → loud "memory unreadable", dirty warnings, no fabricated state; but `fde receipts` still answers confidently over a sealed ledger tail (finding #3) — loud in doctor/status, silent in receipts |

## Dashboard: would I show it to the sponsor?

**No.** Grep of the rendered HTML: no PHI, no `<private>` content, no red-team material — the redaction works. But it labels Renata's colleagues ("Dr. Amara Beck — resistor", "believes chatbot is the headline", trust "at risk"). It is the FDE's cockpit, and it is a good one. For the sponsor I would show the redacted vault (which excludes stakeholders/trust-profile/red-team/board-memo — verified by grep) or the exec-update artifact.

## Reference coverage & client-deliverable verdicts

| Reference | Exercised | What it changed | Artifact | Verdict |
|---|---|---|---|---|
| land | yes | interrogated the brief instead of inheriting it | brief.md, success.md | edit first |
| who-decides | yes | separated sponsor/veto/user/gatekeeper; pre-wire discipline | stakeholders.md | never (internal) |
| test-assumptions | yes | killed 3 CRITICAL brief claims with file:line evidence on day 1 | assumptions.md, reality.md | edit first (reality summary) |
| pick-three | yes | hard 3-slot cap forced the displacement talk with Renata | decisions.md triage | edit first |
| score-use-cases | yes | formula demoted the chatbot (10/375); gave me the number to hold the line with | scored table in reality.md | edit first |
| three-options | yes | forced a genuine conservative option I'd have skipped | decisions.md options A/B/C | send as-is |
| poc | yes | one-day kill/confirm against real CA code | POC decision + notes | edit first |
| healthcare | yes | "unclear AI policy = prohibited" set the whole compliance posture | trust-profile.md | never (internal) |
| business-case | yes | cost-of-doing-nothing first; drivers + sensitivity; client-sourced numbers only | business-case.md | send as-is |
| board-memo | yes | SCQA + pyramid + pre-wired hostile Qs | board-memo.md | edit first (post red-team edits) |
| red-team | yes | found 2 EXPOSED gaps I missed; changed the memo | red-team.md | never (internal, by design) |
| demo-prep | yes | "ran clean twice today" gate; sacred-data sweep | demo plan in decisions.md | edit first |
| ingest | yes | stage→propose→apply; found PHI blindness | applied week-1 facts | n/a (process) |
| connect | yes | honest capability check; no fake sources | recipe walkthrough | n/a (process) |
| artifacts | yes | every claim traced to a memory file | exec-update.md | edit first |
| readout | yes | SCQA, bad-news-first, claimed-vs-accepted ledger discipline | Status block in delivery.md | send as-is |
| hold-scope | yes | "let me place it" + scope receipts | 2 scope decisions on record | edit first (receipt to sponsor) |
| dashboard | yes | portfolio triage; fail-loud verified | fieldbook-current.html | never (FDE cockpit) |
| earn-trust | partial | signal ledger used throughout (Beck/Terrence arcs) | stakeholders.md signals | n/a |
| ai / eval-pack | not reached | no AI feature shipped (BAA gate) — honest skip | — | — |

## CLI coverage

`resume`/`--init`/`--bind`, `scan`, `log phase|decision|risk|contact|delivery(+ledger)`, `debrief`, `status`/`--all`, `receipts` (7+ disputes), `doctor`, `prep` ×2, `owner`, `ingest stage|list|propose|apply`, `dashboard`, `vault --redacted`, `redact --apply`, `triage`, `--version` (broken), bogus flags. Adapters: cursor.fde.mdc + copilot-instructions.md read and followed (both are true pointers to SKILL.md; both mandate agent-runs-CLI; cursor's `fde triage` entry verb exists and matches).

## Top five changes I would ask the maintainer for

1. PHI/PII heuristics (SSN, MRN, DOB patterns) on `ingest stage`/`propose` and `log`, at least as a warning, when the engagement is healthcare-flagged.
2. Fix the OpenAI key pattern (`sk-[A-Za-z0-9-]{20,}` or explicit `sk-proj-`/`sk-ant-` forms).
3. `fde receipts` must warn when a searched file has a sealed tail (unclosed `<private>`) instead of asserting "nothing was ever logged".
4. Reject unknown flags on `fde log` instead of logging them; print version for `--version`.
5. Make doctor's reality/terrain errors match what the parser actually accepts (bold-inline labels; first-heading-wins).

## Would I take it to a client on Monday?

Yes — for the commercial half, which is the question this run was asked. The method references are the best consulting playbook I have used in tool form, and the record they leave behind survives a hostile CFO analyst. I would go in with three private rules: never let raw client documents near `ingest` without my own PHI sweep, never trust the secret guard with model-vendor keys, and run `fde doctor` before every `receipts` demo in front of a stakeholder.
