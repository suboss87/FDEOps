# Verification and limits

FDEOps has automated regression tests and focused workflow checks. Passing them does not certify every agent, model, or client engagement. The CLI and fieldbook run locally without a model; AI hosts and source connectors have their own permissions and network behavior.

## Automated checks

The 2026-09-11 maintenance update passed 293 tests, with no failures or skips, plus skill-routing checks and live CLI smoke. GitHub validation passed before merge.

```bash
npm run check
npm run test:skill-routing
node evals/context-budget/check.js
```

Coverage includes private-output redaction, client binding, pending reviews, sourced replay warnings, acceptance conflicts, installer paths, export protection, and concurrent CLI writes. Multi-file commands are not database transactions, and external editors do not participate in CLI locks.

The context fixture reduces 1,120,010 bytes of history to a 16,384-byte response and retrieves three targeted records among 10,000 unrelated lines. This verifies a byte ceiling and retrieval in that fixture, not a fixed token count, model accuracy, or percentage of tokens saved.

## Identifier masking

A two-session Codex/GPT-6-Astra diagnostic prepared a masked meeting review, waited for explicit confirmation, applied it, and retrieved the saved action with the same aliases. External checks found the original email and phone restored in local records, no stored aliases, and no raw fixture identifiers or private marker in either model trace. This is one scripted case, not comprehensive PII or host certification.

The masking regression suite checks stable aliases, original-record preservation, confirmed proposal restoration, sourced replay, masked stderr/MCP responses, truncation boundaries, context size, and missing/corrupt/linked private state. Raw file access, upstream source tools, and unrecognized identifiers remain outside this boundary. See [privacy details](../PRIVACY.md#default-identifier-masking).

## Agent workflow

A scripted diagnostic on 2026-09-11 used Codex CLI 0.153.4 with GPT-6-Astra at medium reasoning and the current repository executable. Fresh sessions exercised messy-note review, rejection and correction, confirmed save, record-only recall and handoff, and replay of the original notes after a correction. A separate session checked a second client workspace.

The agent recovered the decision and action from ordinary prose, preserved both correction sources, kept requests unagreed and staging results unaccepted, and retained the current next action. Record hashes stayed unchanged before confirmation and during the older-note replay. Private test content was absent from the five update-workflow traces. The second workspace returned its own signer and next action without reading the first client's record.

An additional agent reviewed the review/save/return traces. This is one scripted longitudinal scenario and one read-only client switch, not independent human usability evidence or repeated statistical reliability. Two early runs resolved a stale global CLI and exposed the synthetic private marker. They were excluded from current-version validation; they do not establish a regression in the current executable. Use the intended executable when reproducing tests.

## Fieldbook and MCP

Browser checks on the 2026-09-10 release exercised dark desktop and 390px mobile views, client switching, search, action prompts, clipboard fallback, and empty states. The tested fictional journeys had no page overflow, console errors, or external requests. The fieldbook is a generated report; regenerate it after record changes.

Automated stdio MCP tests exercise initialization, tool listing, staging, proposing, and explicit apply, including privacy and client boundaries. This does not certify a user's Slack, Notion, Granola, or other source connection. Test each configured connector separately.

## Local models

Read-only trials used Ollama 0.33.1 and already-installed Qwen3 models on a 16 GiB Mac with CPU inference:

- **Qwen3 1.7B:** missed a recorded next action, invented a scope record, and gave a partially correct acceptance answer with an unsupported trust assessment. [Recorded results](../evals/local-model/results/2026-09-10-qwen3-1.7b.json).
- **Qwen3 4B:** the first attempt exceeded a 180-second deadline. Three capped reruns produced planning text without completed tool calls. [Recorded results](../evals/local-model/results/2026-09-10-qwen3-4b.json).

These establish connectivity, not reliable client-work judgment. The adapter exposes three read-only tools; it does not test full skill routing or writes. With an already-installed model:

```bash
FDEOPS_TEST_OLLAMA=http://127.0.0.1:11434 node evals/local-model/check.js qwen3:1.7b
```

An expected tool call is not proof of a correct answer. Review answers and citations against the fixtures. Token totals include repeated prompts and are not comparative efficiency measurements.

## What remains unproven

Independent users' maintenance time, repeated benefit, and continued use have not been demonstrated. Neither have universal host compatibility or superiority over other workflows. The [delivery evaluation protocol](../evals/delivery/README.md) describes repeated, blinded comparisons for testing those claims.
