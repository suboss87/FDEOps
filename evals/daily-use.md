# Daily-use simulations

Date: 2026-09-10. Baseline: Main `680f320` (3.27.0).

Two independent agent sessions exercised the real CLI using fictional clients and isolated homes/workspaces. A lead session exercised the generated dashboard in Chromium. These are software and workflow simulations, not five independent human users or a live trial across every supported agent host.

The quality bar is less work reconstructing context, clearer customer acceptance, and less administration. Repeat use and time saved still require independent users. No claim of best-in-class superiority follows from these results.

## Reproduced failures and repairs

| Situation | Baseline behavior | Repair |
|---|---|---|
| A decision and risk are applied while the risk record is locked | Decision is appended before failure; retry duplicates it | Acquire record locks before writing; restore records after caught write failures |
| New notes arrive while a review is pending | Pending review is silently replaced | Preserve the review; require explicit replacement |
| Large notes contain 5,000 decisions | REVIEW and routing output exceed 750 KB | Bound preview output and identify omitted content; keep the full proposal on disk |
| Ordinary prose contains requests the simple phrase recognizer misses | REVIEW says they were “not stated” | Say “not detected” and ask for review; explain the agent/CLI distinction |
| Sponsor readout or handoff during discovery lacks a signer and usable success test | Those gaps are omitted because phase-specific doctor checks have not started | Include readiness checks regardless of phase |
| A delivery result is prose rather than a structured value-ledger row | An empty summary can look like no claim exists | State that the summary covers structured rows and direct the reader to other delivery notes |
| Dashboard output is accidentally aimed at `success.md` | HTML replaces the client record | Refuse exports into `.fde/` or `.git/`, including aliases through symlinked directories |
| A portfolio uses a custom output path | Refresh instruction creates a different report | Tell the user to repeat the original command with its original options, then reload |

## Passing journeys

- Create and bind Alpha and Beta independently; rebinding explicitly selects a client.
- Stage Alpha's proposal, switch to Beta, and attempt apply: Alpha's notes do not enter Beta's records. Switching back exposes Alpha's own proposal.
- Applying again after a completed apply refuses because no proposal remains.
- Unknown signer and vague success fail the readiness check.
- Handoff creates a portable Markdown file; exporting to the same destination again refuses to overwrite it.
- Portfolio generation includes both clients without a model.
- At 390px, opening Clients and switching to Beta selects Beta and collapses the client rail; copied prompts explicitly name Beta.
- Denied clipboard access opens a selectable prompt dialog rather than losing the action.
- At 1440px, reload preserves the selected client and saved theme. Both viewport checks had no page-width overflow.
- Browser network inspection showed only local report reads; no external requests or console errors in the exercised journey.

Search filters the client list and overview; it does not silently switch the open client. The current heading and copied prompt retain that client's identity.

## Maintenance effort observed

Using the CLI directly required one setup call, two calls plus review for a daily update, one dashboard regeneration, and one handoff export. Switching one shared workspace to another client requires a bind call; separate bound workspaces avoid that repeated step.

These are observed command counts, not human time measurements. The agent may run those commands for the user. Free-form notes still need interpretation and review; the CLI does not understand arbitrary prose as a model would.

## Deliberate limits

- Re-submitting already-applied notes is a new update and may duplicate records. Identical wording can describe a new event, so the CLI does not silently discard it. Review before saving again.
- Caught write errors and cooperating writer contention are tested. Power loss or killing the process between multi-file writes is not claimed to be atomic. Uncoordinated manual file edits are not transactional writes.
- Large previews are excerpts. Review the saved proposal locally or split notes into smaller reviews before applying; do not interpret a truncated preview as full review.
- A source string is not authenticated customer approval. Prose outside the structured ledger is not automatically classified.
- The dashboard remains a read-only snapshot; it cannot observe later filesystem changes by itself.
- These sessions used the repository CLI directly. They did not install every third-party host, call customer services, or re-certify local-model reasoning. Existing host and local-model limits remain in [verification](../docs/verification.md).

## Reproduce

Run `npm run check` for the full gate. Focused regressions live in `test/provenance.test.js`, `test/fieldbook-daily.test.js`, and `test/debrief-reliability.test.js`. Existing privacy, MCP, installer, concurrency, and context-budget regressions remain part of the full suite.

For a manual browser check, generate two fictional clients in an isolated `FDEOPS_ENGAGEMENTS_ROOT`, run `dashboard --all --out <temporary-path>`, and exercise client selection, search/reset, denied clipboard access, theme persistence, and regeneration at desktop and mobile sizes.
