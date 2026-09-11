# Three messy client projects: adversarial simulation

Date: 2026-09-10. Source: Main bee1e5c, FDEOps 3.27.1.

## Verdict

FDEOps provides useful client boundaries, small startup context and reusable delivery records. It is not yet safe to treat its Accepted value section as a current, reconciled statement of customer acceptance. Its daily path still asks the agent to maintain information in more than one form.

Fix these gaps within the existing architecture. A rewrite, more skills or a larger dashboard would not address the observed problems.

## What we actually ran

Three independent agent sessions acted as fictional FDEs, using the current router, relevant methods and actual local CLI. They completed 60 scenario checks across 91 CLI calls: finance 35, healthcare 32, manufacturing 24. These counts include deliberate attacks and diagnostics; they are not the cost of a normal day or a statistical sample of users.

Each used isolated homes, workspaces and client folders. Each followed setup, inherited context/discovery, messy notes, agent correction, REVIEW, explicitly fictional engineer confirmation, apply, delivery assessment, sponsor readout and successor handoff. Customer systems, real host installations, external MCP services and local-model reasoning were not exercised. No production deployment or successful customer acceptance was invented. All three correctly ended with unresolved production gates.

| Project | Messy situation | Main finding |
|---|---|---|
| Financial migration | Staging performance sold as production readiness; departing sponsor; failed rollback; scope dispute | A staging-only assertion by the former signer appears as Accepted value against a production promise. Replaying an old confirmed update also duplicates records and regresses the next action. |
| Healthcare rollout | Synthetic-only permission; blocked access; slide approver mistaken for clinical authority; later measurement retraction | Wrong-scope approval and an explicitly retracted earlier assertion remain in Accepted value. The agent kept production blocked, but the summary did not reconcile the records. |
| Manufacturing takeover | Three months of notes; similarly named clients; contradictory decisions; missing night-shift recovery knowledge | The existing handoff.md recovery procedure is absent from both portable handoff and targeted recall. Undated inherited risks appear in TRIAGE but disappear from risk summaries. |

## Changes worth making, in order

### 1. Make current acceptance defensible

Preserve historical assertions, but distinguish their scope from the current goal. A name and source are insufficient to establish authority for this outcome. Staging approval must not imply production approval; a changed signer must trigger review rather than automatically invalidate history.

Provide an explicit way to reference and retract or supersede a prior ledger entry. Keep both events, but exclude the withdrawn assertion from current accepted totals. Ambiguous same-name entries should be flagged for review, not silently merged. Show unresolved authority/scope conflicts alongside the result on CLI and dashboard.

Acceptance check: a later explicit withdrawal cannot leave the earlier result presented as currently accepted; slide-only approval cannot satisfy a clinical outcome. Delegated authority and legitimate historical approval remain representable.

### 2. Finish the single reviewed update path

Both finance and healthcare recorded a delivery observation through debrief, but it landed in Running value prose and required another write to reach the summarized ledger. REVIEW should clearly distinguish a narrative observation from a proposed structured ledger row, with missing measurement, evidence and approval left unknown. One confirmation should be enough to save the reviewed update accurately.

Reject invalid delivery field counts before writing or show named fields for confirmation. Two agents initially omitted the bucket and shifted the remaining fields. Those input mistakes were not counted as correct-format acceptance bugs, but silent column shifting is preventable usability debt.

Warn when re-importing the same source event would duplicate records or replace a newer next action. Do not silently discard repeated wording: it can represent a different event.

### 3. Make maintained knowledge discoverable

Include bounded, redacted operational handoff content in successor export and targeted retrieval. Inventory method-owned artifacts so maintaining an operations procedure does not put it outside the product's search surface.

Use consistent risk interpretation across TRIAGE, resume and handoff. Unsupported nonempty risk notes must not become '(none recorded)'. Align the takeover method's 'Read it all' instruction with the router's bounded resume and targeted recall contract.

Acceptance check: the successor retrieves SERIAL_RESET_RECOVERY and its owner from the maintained handoff file; undated inherited risks are shown consistently or explicitly identified as unparsed.

### 4. Remove wording ceremony from readiness

Two independently supplied measurable success criteria failed the binary gate. In healthcare, adding only 'Test:' removed the warning. In finance, changing 'reconcile' to 'matches' removed it. A growing list of favored verbs is not a sound solution. Offer clear input, observable result and threshold fields, while treating free-text recognition as a lint heuristic with an accurate explanation.

Document one obvious re-preview command after proposal editing. Finance verified passing the edited proposal file works; bare --smart caused confusion in both finance and manufacturing. This is discoverability friction, not failed apply protection.

## Lead verification

The lead independently reproduced:

- Wrong-scope approval inside Accepted value and the persistence of an earlier explicitly retracted assertion.
- The healthcare readiness warning disappearing after adding only 'Test:'.
- A recovery procedure absent from handoff and recall despite existing in handoff.md.
- The inherited risk present in TRIAGE and absent from the handoff summary.
- An additional history edge: 250 sourced earlier rollout approvals followed by a withdrawal. receipts returned 16,384 bytes and omitted the withdrawal; recall included it. Truncation was disclosed, but recent contradictory evidence should receive space before repetitive old entries.

## What held up

Client isolation and invalid-binding refusal worked in the exercised cases. Synthetic private markers stayed out of inspected outputs and generated dashboards. Manufacturing's roughly 1.43 MB context produced a 13,213-byte default packet and a 4,096-byte reduced packet. Targeted recall retained conflicting decisions. Immediate repeated apply refused a missing proposal, and handoff export refused overwrite.

The agent methods prevented invented production success and preserved permission/access blockers. These are useful foundations, not proof of superiority or measured human time savings.

## Limits and evidence

The three dashboards were generated and their HTML inspected; these runs did not establish fresh browser UX coverage. A lead browser launch did not complete and was stopped. Prior browser checks are documented separately in daily-use.md. No application source changed, so the full regression suite was not rerun for this audit. Existing test success is not evidence that these newly exposed gaps are fixed.

Per-scenario reports, replay scripts and command traces are preserved with the local audit evidence. Read the reports before replay: some scripts deliberately append records or refuse existing export paths; use a fresh fixture directory. The next engineering pass should convert the confirmed failures into regression checks, repair the four areas above, and rerun these same scenarios before expanding scope.

## Repair verification: 3.28.0

The audit above describes the 3.27.1 baseline. The repair build at 0055b47 was then independently exercised by all three original agents:

- Finance: ten CLI calls; one reviewed apply created the structured ledger row. A repeated sourced update refused and left decisions, risks, delivery and the newer next action byte-identical. Staging/pending results stayed outside accepted production value.
- Healthcare: fifteen assertions across eight CLI calls passed. Explicit scope and withdrawal conflicts moved out of accepted value with their reasons and history retained. The original natural acceptance criterion was recognized. A structured update reached the ledger with approval still pending. Private content was absent from ten inspected outputs/exports.
- Manufacturing: thirteen assertions passed for operational retrieval/export, inherited risk consistency, context caps, client boundaries, and the repaired review privacy behavior.

Separate review caught additional edge cases before release: negative production evidence, generic promises hiding production goals, revoked credentials mistaken for withdrawn approval, proposal links/special files, private-only replay membership and substring false matches. Their reproductions are now regression tests.

Real Chromium checked the changed acceptance display at desktop and 390px mobile width. Conflicted rows showed their reasons; an unaffected recovery result retained Acceptance recorded. The outcome action opened a client-specific review prompt. No page-width overflow, console errors or external requests were observed. The mobile ledger retains its existing horizontal table scroll.

Scope and withdrawal detection remains conservative explicit-language lint, not general reasoning about authority. Same-slice conflicts require human clarification; history is not automatically deleted or merged. Exact sourced replay protection is not semantic deduplication. Existing local-model, host integration and human-benefit limits remain unchanged. These repairs improve the tested daily workflows; they do not prove every user will adopt the product.

Final integrated macOS gate: `npm run check` passed all 293 tests with zero failures and zero skips. The earlier full run caught preview/state-label regressions, now repaired; malformed legacy fixtures were corrected to canonical fields without weakening their concurrency or doctor assertions.


## Discovery guidance review: 2026-09-11

Two independent reviewers and the lead walked the revised land/discover method through fictional variations of these scenarios. This was a text-level method review, not a new CLI replay, live host evaluation, or customer trial. The excerpts below are expected proposed records, subject to human confirmation.

| Scenario input | Expected record and next action |
|---|---|
| Finance: unverified £120,000 cost estimate, five-minute staging result, production data promised in two weeks, Operations nominated | `brief.md` attributes the estimate without claiming savings; `reality.md` separates staging capability from missing production proof; `success.md` keeps operator agreement pending. Ask who owns data delivery and verify a dated sample checkpoint before committing the test schedule. |
| Healthcare: on-prem required, patient data/model use unauthorized, sponsor nominates an unconfirmed team, data promised without a starting date | Treat on-prem as a constraint. Keep impact, signer, operator agreement, and calendar commitment unknown where unsupported. Verify a permitted sample and its owner; the delivery promise does not grant access or model permission. Authorized document review can continue. |
| Manufacturing: staging POC passed, Friday auto-release requested, withdrawn permission, recovery procedure recorded but night-shift rollback untested | Existing recovery instructions are reusable evidence, not proof of successful recovery. Keep the production gap and permission conflict explicit. Check the recorded operator's agreement and ability to perform recovery; propose an authorized drill, without inventing a date, new build requirement, or production approval. |

Review corrections removed an unsupported equation between missing ownership and unavailable access, allowed an assumption entry to be created or updated, and made unconfirmed operator agreement explicit. Guidance stays in two existing references; no record schema, automatic doctor gate, CLI behavior, or routing change was introduced. These walkthroughs support clarity in the exercised cases, not guaranteed model adherence or measured time savings.
