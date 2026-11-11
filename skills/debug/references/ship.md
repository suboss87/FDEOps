# ship - Deliver and release with evidence

**Enter when:** an implemented increment needs a delivery checkpoint, deployment, or wider rollout. Use [build](build.md) for implementation; an untested business or technical assumption needs an experiment before a release claim.

Start from [task context](task-context.md). Standalone work uses supplied permitted context and a release receipt; it does not require `.fde/` initialization. In engagement mode, use privacy-safe views of confirmed context, decisions, terrain, success, delivery, applicable trust constraints, and AI evaluation evidence. Never load raw `<private>` blocks into a model. The `fde` CLI remains local-only; deployment uses the customer's authorized tools, never a new network capability inside `fde`.

## Establish the delivery contract

Identify the exact outcome, acceptance check, scope, affected users/systems, target environment, recovery mechanism, and who or what is authorized to accept and release it. Reuse confirmed authority and checks for routine work. Do not invent missing signers, permissions, measurements, or acceptance.

For an initialized engagement, run `fde doctor --ready` before a new delivery plan or material scope change. Missing acceptance criteria or a named customer-side signer blocks the affected implementation or release commitment, not a provisional plan or independent preparation. A passing doctor validates record structure, not connectivity, release readiness, or customer acceptance. Standalone work evaluates the supplied contract directly.

A customer delivery checkpoint must let the agreed decision-maker replay and reject the acceptance check through an interface they operate. Prefer their staging; otherwise use an agreed representative environment and disclose its owner and limitations. Local green proves only the local run. Routine fixes may share an agreed checkpoint; no fixed number of changes forces a ceremony.

## Prepare a reviewable increment

1. Inspect repository instructions, working tree, overlapping work, and the complete intended release diff. Include working-tree changes when testing an uncommitted candidate. Preserve unrelated work; separate unintended behavior before release.
2. Identify applicable before-state evidence and the changed outcome. Name dependencies, stop conditions, and irreversible effects. Existing applicable evidence may be reused with attribution, never represented as a fresh run.
3. Complete [verification](verification.md) and [review](review.md), proportional to the change and repository requirements. A self-check is not an independent review. Record command, revision, environment, date, result, and unrun checks. Exercise relevant operating exceptions and fallback paths, not just the happy path.
4. For AI behavior, obtain a scoped [eval verdict](eval-pack.md) for the candidate and applicable controls. A permitted bounded automation workflow remains permitted within its documented limits. A missing evaluation, failed critical case, or unknown action authority prevents release of that path; non-AI changes record eval as not applicable.

## Release gate

Before deployment, establish these facts from existing evidence or a necessary check. Missing material evidence blocks the dependent release step; continue independent preparation. Do not ask again for approval already provided within the same scope.

| Dimension | Required evidence |
|-----------|-------------------|
| Candidate | Exact revision/artifact, intended diff, dependencies, applicable required checks passing; no skipped failure presented as green |
| Target and access | Service/account/region, environment, authorized deployment identity and mechanism, secret provisioning without revealing values |
| Acceptance | Replayable check and agreed decision-maker/mechanism; record actual acceptance separately from readiness |
| Data and policy | Permitted data, applicable security/residency/change-window requirements, necessary approvals already recorded or obtained |
| Recovery | Applicable tested rollback, restore, compensation, or roll-forward within agreed recovery-time/data-loss limits; explicit authority for irreversible effects |
| Operations | Named release/recovery owner, runbook appropriate to risk, health and business signals, stop thresholds, observation coverage; applicable [failure-signal delivery evidence](verification.md#operator-response) for paths whose readiness depends on operator response |
| AI, when applicable | Current applicable SHIP eval evidence, critical failures zero, enforced action boundary and required human review or documented bounded automation |

Check migration compatibility, old/new version coexistence, delayed jobs, caches, and already-emitted side effects where relevant. A code revert does not undo data loss or external writes. Reuse drill evidence only when the mechanism and relevant conditions are unchanged, explaining applicability. If recovery is only a plan, exercise it in a permitted representative environment before release.

Use the repository's existing secret scanning and security checks; avoid diagnostic commands that print credential matches. Retain sanitized references to results. Resolve material evidence gaps or obtain an explicit, authorized narrowing of the release; do not average critical blockers into a readiness score.

For a coordinated engagement, also connect the release to the agreed value bucket and baseline/target, and record a dated receipt for the affected operating path. An unmeasured result remains pending with a measurement next step; do not invent realized value to pass a gate.

## Deploy within authority

Execute only when the requested workflow authorizes deployment to this target and the applicable gates are met. Otherwise leave a concrete release candidate, exact deployment/recovery instructions, evidence, and the remaining authorization for review. A permission to implement or test is not permission to publish.

Use the customer's established pipeline and rollout mechanism. Select canary, staged exposure, blue/green, or direct rollout according to actual risk and platform capabilities; do not impose a universal cohort sequence. Define advance/abort thresholds and observation window before starting. Capture an applicable pre-rollout operating baseline with its source, environment, load/cohort and window when assessing change. Compare like conditions; keep absolute safety limits even when the baseline is poor. If no comparable baseline exists, name the gap and measurement plan: improvement is unproven, while release depends on the agreed acceptance and safety evidence, not an invented universal baseline gate. If another operator must execute, record their handoff and report deployment pending until there is evidence it happened.

During rollout inspect health, errors, key user behavior, and side-effect integrity. Halt expansion on breached thresholds or critical harm and apply authorized containment/recovery. Do not continue merely because the deploy command exited successfully.

## Verify operation and hand off

Run permitted smoke and acceptance checks against the deployed candidate. Record deployment identity/time, observed signals, sample/window, failures, recovery actions, and remaining gaps. Define the pulse: metric, cadence, threshold, owner, and response. For AI, include permitted output sampling and drift/action-boundary monitoring.

Before wider exposure, verify expected load/cost, data pipeline behavior, ownership, support, and applicable governance for the proposed audience. Choose expansion conditions from evidence; a successful pilot does not establish readiness for an arbitrary larger scale. Measure adoption against the eligible users, expected workflow frequency, and agreed observation window; investigate misses without guessing their cause. Report two rates with their denominators pinned in `success.md`: activation (users who completed the workflow at least once ÷ eligible users) and fallback (work that went back to the old path ÷ eligible work). Before blaming training, ask three incentive questions: did anyone's scorecard change; who keeps the time saved; who carries the blame when the system errs. A no on all three predicts low use regardless of quality.

## Receipt and completion

Keep these claims separate: implemented, verified, deployed, measured outcome, and accepted. Include the candidate, target, command/pipeline, applicable checks and unrun checks, review source, evaluation where needed, authority source, recovery evidence, observation, and next owner/action. Attribute acceptance to its actual source and scope. A staging measurement is not production value, and a commit is not deployment.

In engagement mode, write confirmed implementation/decisions and delivery receipts under the existing record rules. Standalone work returns the same receipt or uses the repository's permitted release record. If substantial work remains, retain a [recoverable checkpoint](verification.md#recoverable-checkpoint) there. Committing, pushing, opening a PR, publishing, and notifying others are actions governed by the user's workflow, not mandatory steps imposed by this method.

## Worked example

A freight team agrees that dispatchers can retry a failed export once without creating a duplicate shipment. The change uses the existing queue and ops screen. The developer records a failing duplicate-delivery case, implements idempotency, and passes the relevant checks on a named candidate. QA observes both the retry status and the single downstream record on permitted staging fixtures. A separate reviewer examines the queue race; the receipt names that review and the revision.

The export service has an approved staged-release workflow. Its owner reuses a recent recovery drill because the queue format and recovery mechanism are unchanged, recording that applicability. Deployment stops if duplicate records appear or the agreed error threshold is crossed. The authorized rollout completes, production smoke checks pass, and the dispatcher accepts the specified retry behavior with a dated source. The operating-cost benefit remains pending until the agreed measurement window closes. Implementation, deployment, acceptance, and measured value have different evidence. In the existing engagement, `decisions.md` records the agreed behavior and `delivery.md` holds the release receipt; standalone work returns those facts directly.

## Principles

- Release the reviewed candidate with applicable evidence and documented authority.
- Test recovery against the effects that actually persist beyond a code revert.
- Keep missing evidence visible and distinguish local, staging, and production claims.
- Expansion follows observed acceptance and operating limits; fixed ceremonies cannot replace them.
