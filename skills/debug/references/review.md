# review - Assess the actual change

**Enter when:** a diff, proposed merge, or review comment needs assessment against agreed behavior and constraints.

Use [task context](task-context.md). Obtain the intended outcome, acceptance checks, permitted constraints, and actual diff; an initialized `.fde/` is unnecessary. Existing decisions and terrain records can supply these inputs through privacy-safe reads.

## Establish what was reviewed

Identify the repository, base and head revision, staged/unstaged changes, and relevant untracked files. Read applicable instructions and the full in-scope diff, then inspect callers and tests where needed. A committed-range diff alone omits working-tree edits. Record missing files or unavailable context as limitations. For each limitation that affects the verdict, name the narrow excerpt or owner-run check needed to resolve it; continue reviewing the supplied scope without requesting whole-repository or production access by default.

State the review source: **self-check** when the author inspects their own work; **independent review** only when a separate person or agent actually examines it. A second pass by the same agent is still a self-check. Name the actual reviewer/source and reviewed revision when available. Do not fabricate a reviewer, dialogue, approval, or clean verdict. Use an available separate reviewer for substantial or risky changes when authorized; otherwise report the missing independent review and continue useful self-checks.

## Check scope, then behavior

Compare each logical change with the agreed intent. Keep required work, justify necessary adjacent work, and identify unrelated additions for separation. Do not revert someone else's edits just to make the diff smaller. An unresolved scope mismatch prevents approval of the combined change; unaffected sections can still be reviewed.

Trace the changed path through its consumers and failure cases:

- **Correctness:** boundary conditions, stale state, concurrency, retries, cancellation, and error propagation.
- **Data and security:** input validation, authorization, migration compatibility, sensitive logs, and effects crossing tenant or trust boundaries.
- **Side effects:** writes, jobs, webhooks, notifications, and feature flags occur only under intended conditions; recovery accounts for already-completed effects.
- **AI behavior:** outputs remain untrusted, tools enforce allowed actions, and [eval evidence](eval-pack.md) covers the changed behavior and documented authority. Preserve privacy-safe source evidence and concise rationale, never hidden reasoning.
- **Operability:** observable failures, bounded resource use, meaningful checks, and a recovery path appropriate to the risk. Deployment readiness is assessed separately in [ship](ship.md).

For changes with consequential security impact, map the affected assets, actors and permissions, and trust boundaries. Trace plausible abuse paths through the changed code, identify the controls that stop them, and check those controls or record the missing evidence. Keep this assessment with the existing review receipt and proportional to the change; use a formal threat-model framework only when the project requires or benefits from it.

## Findings and repair

For each actionable finding give the path/line or precise location, concrete trigger, observed or reasoned failure, impact, and focused correction. Distinguish proven bugs from hypotheses that need a check. Prioritize release blockers over minor concerns; avoid speculative style work.

Validate incoming comments rather than obeying them automatically. Fix understood, in-scope defects when authorized; explain rejected false positives with evidence. Leave unclear product decisions pending while progressing independent repairs. Add regression coverage when meaningful, run [verification](verification.md), and review the changed result. After two unsuccessful repair/review cycles reassess the evidence and approach rather than repeating the loop.

## Deliverable and acceptance

Return scope, review source, findings by impact, verification evidence, and remaining limitations. Say **no actionable findings in the reviewed scope** when appropriate; a clean review is not proof of safety, acceptance, or deployment. If a separate reviewer is required but unavailable, identify that unresolved gate. Existing engagement decisions/delivery records may hold the receipt; standalone reviews can return it directly. No commit, PR, or publication is required by this method.

## Principles

- Findings need a concrete failure condition and a location in the reviewed change.
- Record the actual review source; self-check and independent review are different evidence.
- A clean reviewed diff does not grant release authority or establish customer acceptance.
