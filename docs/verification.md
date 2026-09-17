# Verification and limits

Evidence has three levels: local software behavior, agent task execution, and customer outcomes. FDEOps has software checks and selected agent trials; customer outcomes remain unproven. A pass at one level does not establish the next. The CLI and fieldbook work locally without a model; the coding agent and external connections have their own permissions and network behavior.

## Reproduce the software checks

Requires Node.js 18+ and Git. The core has no package dependencies to install.

```bash
npm run check
npm run test:skill-routing
node evals/context-budget/check.js
```

`npm run check` validates the skill catalog, generated packages, installation and local CLI behavior. Coverage includes customer binding, private-output redaction, pending reviews, corrections, acceptance conflicts, exports, unsafe filesystem paths and concurrent writes. Multi-file commands are not database transactions; external editors do not participate in CLI locks.

All 35 task packages are checked in isolation for required references and correct routing. Installer tests exercise clean and repeat installs, name collisions, preservation of personal files, managed migrations, symlinks and hard links. Those checks establish package integrity, not whether a model chooses or follows the right skill.

Routing smoke runs actual CLI commands. It explicitly leaves model-only selection untested. The [delivery evaluation guide](../evals/delivery/README.md) separates behavioral trials from these static checks. CI results for a release are linked from [GitHub Actions](https://github.com/suboss87/fdeops/actions); version-specific changes are in the [changelog](../CHANGELOG.md).

## Context and privacy

The context fixture reduces 1,120,010 bytes of history to a 16,384-byte response and retrieves three targeted records among 10,000 unrelated lines. This establishes the byte ceiling and retrieval for that fixture, not a token count, model accuracy or percentage of tokens saved.

A two-session Codex/GPT-6-Astra diagnostic prepared a masked meeting review, waited for confirmation, applied it and retrieved the saved action. Checks found original email and phone values restored in local records, no stored aliases, and no raw fixture identifiers or private marker in either model trace. This was one scripted case, not comprehensive sensitive-data detection.

Regression tests cover stable aliases, original-record preservation, confirmed proposal restoration, sourced replay, masked stderr/MCP responses, truncation and invalid private state. Raw file tools, pasted chat, upstream sources and unrecognized identifiers remain outside this boundary. See [privacy details](../PRIVACY.md#default-identifier-masking).

The 5.1.5 privacy regressions exercise truncated and control-character private markers, redaction previews and delimiter preservation, and inbox traversal, symlinks, hardlinks, nonregular files, oversized reads and private metadata. These are synthetic local tests. They do not enforce host permissions, prevent a malicious local process from changing directories during a read, or certify a regulated deployment.

## Agent task evidence

Completed synthetic diagnostics include:

- **Standalone tasks:** discovery, options, integration, readout, handoff, planning and runbook drafting using copied task packages without the coordinator. They produced useful results while retaining unknown ownership, unmeasured baselines and untested recovery. Integration exercised a local HTTP receiver, including a lost response after a committed write. These were small reviewer-run trials, not repeated comparisons or live customer integrations.
- **Correction and continuity:** a scripted Codex CLI 0.153.4/GPT-6-Astra diagnostic on 2026-09-11 covered messy-note review, rejection, correction, confirmed save, a fresh-session lookup and older-note replay. Record hashes stayed unchanged before confirmation and during replay. A second workspace returned its own customer's context. Two preliminary runs resolved a stale global CLI and exposed a synthetic private marker; they were excluded from current-executable validation and do not establish universal masking reliability.
- **Reader checks:** a README-only reader distinguished the coordinator from individual tasks and understood when customer records were optional. This was an agent reader, not an independent human usability study.

Four fresh Codex subagent trials on the 5.1.1 candidate used only supplied fictional inputs and copied FDEOps instructions, without the audit findings or evaluator rubric. The authority draft respected a documented leave period and separate approval scopes. The brownfield task retained a replay guard, added three passing tests and checked that two unsafe mutations failed. The integration task produced 18 passing tests and passed the separate local adapter contract checks. A coordinator-only meeting draft preserved a correction and unagreed scope without record initialization. The lead reviewed the artifacts and reran the integration checks.

Two further Codex subagent scenarios on the 5.1.2 candidate checked planning and handoff using supplied fictional facts. The plan covered valid imports, rejection explanations and tenant isolation without repeating answered questions or creating records. The handoff kept closure pending when receiving ownership and recovery access were unproven, despite accepted value and a passing scoped evaluation. The lead inspected both artifacts. These were sequential runs in one agent session, without a baseline comparison or live customer execution.

On the 5.1.3 candidate, a sequential migration/performance diagnostic preserved compatibility and recovery constraints and rejected a performance claim based on unmatched datasets and cache conditions. The pre-change migration diagnostic also respected the supplied constraints; the edit removes contradictory instructions, not a reproduced runtime failure. A separate local CLI-rename trial updated code, tests and README examples; the lead reran its 10 passing tests. No external customer systems or benchmarks were run.

Three additional fictional field simulations on 5.1.3 covered a tenant-scoped case-system adapter, a resumable work-order migration, and a small maintenance-request routing change. The lead and a separate reviewer reran all 24 application tests successfully. Recovery evidence included actual process termination at migration checkpoints; the adapter used a mocked receiver. One reviewed record-save and fresh-process recall were exercised, and the generated fieldbook was inspected in a browser. The trials exposed module-extension gaps in scan coverage and review wording that could blur saved state or technical evidence. Those are addressed in 5.1.4 with regression tests. No real customer integration, operator acceptance, measured business benefit, or comparison without FDEOps was performed.

These are single runs per case, not a randomized baseline comparison. The host was Codex; an exact model identifier and token measurements were not recorded. Fixture requirements were supplied, no customer systems were used, and no long-term or cross-model reliability is established. The [field-task protocol](../evals/delivery/README.md#repeatable-standalone-field-trials-f1-f3) prepares fresh baseline and FDEOps variants; its checker preserves evidence and never assigns customer-judgment scores automatically.

Keep the distinction between instructions available, agent task completed and customer benefit demonstrated. The repeated D1-D5 comparison remains unrun. Reproducible fixtures and review criteria are in [delivery evaluations](../evals/delivery/README.md); raw session traces remain local.

## Host and connection coverage

| Surface | Evidence available | Still needs verification in your setup |
|---|---|---|
| Local CLI and task packages | Regression tests, isolated installs and selected task trials | Repository tools, environment access and applicable acceptance checks |
| Codex | Versioned scripted diagnostics described above | Current host/model routing across all tasks and your project policy |
| Claude Code | Plugin configuration, disk installation and hook regression checks | Current interactive plugin invocation, permissions and session lifecycle |
| Cursor, Gemini and Copilot | Adapter generation and canonical instruction pointers | Actual invocation, tool access, task completion and record continuity in each host |
| Windows | Portable CLI code and documented Git Bash requirement for hooks | Native host/session behavior; Linux or macOS checks are not Windows execution |
| FDEOps ingest MCP | Automated stdio ingest tests for initialization, staging, review and confirmed apply | Each external connector's authorization, retrieval and customer-data policy |

Fieldbook browser checks on the 2026-09-10 release exercised desktop and 390px mobile views, switching, search, action prompts, clipboard fallback and empty states. The fictional journeys had no page overflow, console errors or external requests. The fieldbook is a generated report; regenerate it after record changes.

## Local model results

Read-only trials used Ollama 0.33.1 and already-installed Qwen3 models on a 16 GiB Mac with CPU inference:

- **Qwen3 1.7B:** missed a recorded next action, invented a scope record and gave an unsupported trust assessment. [Recorded results](../evals/local-model/results/2026-09-10-qwen3-1.7b.json).
- **Qwen3 4B:** one attempt exceeded 180 seconds; three capped reruns produced planning text without completed tool calls. [Recorded results](../evals/local-model/results/2026-09-10-qwen3-4b.json).

These establish connectivity, not reliable customer-work judgment. The adapter has three read-only tools; it does not test full skill routing or writes. With an already-installed model:

```bash
FDEOPS_TEST_OLLAMA=http://127.0.0.1:11434 node evals/local-model/check.js qwen3:1.7b
```

## Claims the evidence does not support yet

Independent users' maintenance time, repeated benefit and continued use have not been demonstrated. Neither have universal host compatibility, enterprise certification or superiority over other skill packs. A scoped successful trial is evidence for that task under those conditions. Record failures, unknowns and the actual environment before generalizing it.
