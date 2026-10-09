# eval-pack - Evaluate the model's allowed behavior

**Enter when:** AI, LLM, RAG, or agent behavior needs evidence before an experiment, release, or material expansion. Non-AI work skips this method.

Use [task context](task-context.md). Supplied permitted context and an evaluation report are sufficient without `.fde/`. In a coordinated engagement, use the existing trust/terrain context and keep the report in `evals.md`; read only privacy-safe views.

## Method

1. **Define the evaluated surface.** Name the model judgment, inputs, outputs, downstream actions, environment, and relevant failure impact. Separate model quality from deterministic tool authorization and application checks. Document the actual allowed action boundary and its source; missing authority remains unknown. When diagnosing quality failures, connect each observed failure to a permitted trace, expected behavior, and a code, human, or model check in the existing report; label anticipated risks separately.
2. **Choose cases by risk and coverage.** Use permitted historical examples, expert-labeled cases, or clearly marked synthetic fixtures. Cover relevant segments, boundary conditions, known failure modes, and critical harms. Record input, expected outcome/rubric, provenance, and critical-failure rule per case. Keep evaluation cases separate from tuning where possible; no fixed case count proves safety. State whether sampling seeks failure coverage or estimates usage frequency. Include random exploration where permitted; targeted or synthetic case results alone do not estimate production failure rates.
3. **Agree the pass rule before the run.** Define quality thresholds, critical failures, coverage expectations, and acceptable uncertainty for this use. Use deterministic checks where possible and inspect subjective labels or judge reliability. Validate new or changed code evaluators against independently expected passing, failing, and boundary cases. Check judgment proxies against expert labels: a citation ID found in retrieved sources does not prove that the answer is supported. Propose missing criteria for agreement; do not manufacture acceptance from the observed scores.
4. **Run the actual evaluated path.** Record model/provider version, prompts/configuration, retrieval corpus or tools, application revision, environment, fixtures, and run date. Repeat where variability matters. Report totals, per-segment results, critical failures, and limitations using [verification](verification.md). A model-only run does not prove the agent's tool boundary works.
5. **Verify action authority and controls.** Human approval is required where the user's policy or task requires it. Already agreed bounded automation may run within its documented actions, identities, environments, and limits; do not require fresh approval for every authorized action. Check enforcement outside the model, least privilege, input/output validation, cost/rate limits, stop conditions, observability, and recovery as applicable. Unknown or exceeded authority blocks those actions. Evaluation success never grants new authority.
6. **Make a scoped verdict.** Report **SHIP** only when agreed criteria pass, critical failures are zero, applicable authority/control checks pass, and material coverage gaps are resolved or the release is explicitly narrowed by the responsible decision-maker. Otherwise report **NO-SHIP** with the smallest corrective step: fix, gather evidence, descope, or reconsider the judgment surface. A SHIP verdict is technical evidence for the stated scope, not permission to deploy.

## When evaluating permissioned retrieval

Enforce document access using the requesting identity before content reaches the model; check caches and citations as well as retrieval. Test cross-tenant queries and access revoked after indexing or caching. Source text is untrusted evidence, never an instruction that can authorize a tool call or change policy. Include poisoned passages and unanswerable questions: return an explicit lack of evidence rather than inventing an answer or exposing inaccessible content. Distinguish retrieval failures from unsupported generation in the evaluation report.

## When a model judges subjective quality

Inspect representative traces and define the consequential failure categories before choosing a judge prompt. Calibrate the judge against permitted expert-labelled cases, keeping a held-out set out of prompt tuning. Report false passes and false failures by relevant segment, including critical cases; agreement averages can hide unsafe approvals. Resolve material label disagreements with the responsible domain reviewer rather than treating the judge's confidence as truth.

If labels, coverage, or calibration are insufficient, state what remains unverified and narrow or block the verdict accordingly. Recheck calibration when the rubric, judge, or evaluated population changes. Deterministic checks do not need a second model judge.

## Deliverable and acceptance

Return the suite/source, thresholds, counts and segments, top failure modes, control evidence, human-review gate or bounded automation authority, limitations, and dated verdict. Record unknown values honestly. Reevaluate after changes that affect model behavior, retrieval, tool permissions, or data conditions; cite why unchanged evidence remains applicable rather than implying a rerun.

When coordinated, append a concise eval receipt to delivery records. For release use [ship](ship.md). For ongoing use define the drift signals, sample policy permitted by data handling rules, owner, and conditions that suspend or narrow automation. Do not store secrets, raw `<private>` data, or hidden chain-of-thought in reports.

## Principles

- Thresholds and authority come from the agreed contract, never from a convenient observed result.
- Critical failures block the evaluated release scope; disclose coverage and uncertainty.
- Bound automation with enforceable controls, and require human review where the policy requires it.
