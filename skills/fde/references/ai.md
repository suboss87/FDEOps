# ai overlay - intelligence that degrades instead of failing

**Activate when you hear:** AI, ML, machine learning, model, LLM, GPT, inference, embeddings, RAG, agents, fine-tuning, prompt engineering, training data, model drift, hallucination, vector database, neural network, generative AI. Loads **alongside** the active phase, never instead of it.

**Read first:** apply [task context](task-context.md). Use permitted AI-policy and data-classification evidence from the supplied brief or existing `trust-profile.md`; use `terrain.md` when reviewing existing AI components. Missing records do not block standalone work.

AI systems fail differently from traditional software: they **degrade silently** instead of throwing exceptions. A model that hallucinates returns a 200 OK with confident nonsense. A drifted model passes every unit test while making worse decisions. The monitoring, testing, and governance patterns for AI are fundamentally different.

## The first conversation

> "Is there an existing AI/ML policy? Who approves production use of AI? What data can leave the network?"

Resolve the following before the action that depends on them: customer-data use, a paid model call or production release. Reuse supplied answers. While approval is pending, an authorized local prototype can use synthetic inputs and stubbed model responses; label what that does not verify.
- **Model hosting:** cloud API (OpenAI, Anthropic, Google) or self-hosted? Cloud = data leaves the network. Self-hosted = infra cost and maintenance.
- **Data classification:** what data touches the model? PII in prompts = a compliance conversation before a technical one.
- **Human-in-the-loop requirements:** which decisions require human review before action? In regulated industries, autonomous AI decisions may be prohibited.
- **Budget/cost model:** AI inference costs scale with usage. What's the expected volume? What's the cost ceiling?

For a bound engagement, record confirmed policy in `trust-profile.md` under `## AI policy`; otherwise retain the supplied constraints with the task.

## Model selection - choosing the right tool

Compare plausible approaches against the task’s quality, latency, privacy, and operating constraints. Optimize total cost per successful outcome, including retries, review, failures, and maintenance; call price alone can select the more expensive system.

**Candidate approaches (test the plausible ones, not a mandatory ladder):**
1. **Can rules solve it?** If yes, no model needed. Include their implementation and maintenance cost.
2. **Can a small/fast model solve it?** Include one when suitable for the task and hosting constraints; measure quality and total cost.
3. **Would a more capable model improve the outcome?** It may reduce retries, supervision, or implementation complexity enough to justify its price. Verify current model availability and capabilities in official documentation.
4. **Does it need fine-tuning?** Consider it when representative data and a held-out evaluation support a persistent domain gap. Compare against prompt/retrieval changes; justify dataset coverage and training, serving, and maintenance costs rather than assuming a fixed example count suffices.

**Evaluation method (before choosing):**
- Build a representative test set with expected outcomes and critical failure cases. Size it to diversity, consequence, and uncertainty; a small pilot set cannot establish rare-failure safety.
- Run a bounded shortlist against the same held-out cases; record model/version and settings.
- Score: task success, critical failures, latency, total cost per successful outcome, and failure modes, including repeated runs when variability matters.
- Select the approach that meets the agreed constraints with the best measured tradeoff. Record uncertainty and what would trigger re-evaluation.

Write model selection rationale to `decisions.md`. Include: models tested, test set size, scores, cost comparison.

## Engagement eval pack (before AI ships)

Before releasing model, embedding, RAG or agent behavior, use [eval-pack](eval-pack.md) with evidence proportional to the intended use and risk. Reuse the project’s existing evaluation artifact; in a bound engagement, link or update `.fde/evals.md`. Standalone work does not require a customer record. A synthetic demo result does not establish production readiness.

**Minimum pack (do not grow until the minimum exists):**
1. **Component + quality bar** - one sentence each; kill switch / fallback named.
2. **Golden cases** - representative inputs with expected outputs and a pass rule. 5-20 can seed a pilot, not certify readiness; expand for risk and coverage. Prefer real production-shaped data (sanitized).
3. **Failure modes** - at least the silent ones: hallucination/ungrounded, retrieval miss (if RAG), drift, cost runaway.
4. **Pass/fail** - dated run; Verdict **SHIP** or **NO-SHIP**; critical fails must be 0.
5. **HITL gate** - which decisions need human review before action (align with `trust-profile.md`). Empty when policy requires review → NO-SHIP.

**When to write:** plan seeds the pack; poc/ship grows goldens; ship requires Verdict SHIP and a receipt in `delivery.md` → `## Ship receipts`. Non-AI work skips this file entirely.

## RAG architecture (retrieval-augmented generation)

When the AI needs to answer questions about the client's data:

**The stack:**
1. **Ingest** - documents → chunked → embedded → stored in vector DB
2. **Retrieve** - user query → embedded → similarity search → top-K chunks returned
3. **Generate** - chunks + query → LLM → answer with citations

**Common failure modes:**
- **Chunk size wrong.** Too small = lost context. Too large = noise drowns signal. Choose boundaries from document structure and answer needs; tune size, overlap, and top-K against retrieval and answer-quality evals, latency, and context limits.
- **No citation/grounding.** If the model can't point to where it found the answer, you can't verify it. Always require source attribution.
- **Stale index.** Documents update, embeddings don't. Define refresh and deletion handling from source update patterns and acceptable staleness; test them.
- **Retrieval miss.** The right document exists but wasn't retrieved. Test with known-answer queries where the answer IS in the corpus - if retrieval misses these, the embedding model or chunking strategy needs work.

## Agent and agentic systems

When the AI takes actions (not just generates text):

**Safety principles:**
- **Least privilege.** An agent gets the minimum permissions needed. Never give an agent admin access "for convenience."
- **Confirmation gates.** Any destructive or irreversible action requires human confirmation. Delete, send, transfer, publish = confirm before execute.
- **Observable execution.** Record tool/action summaries, versions, timing, cost, outcomes, validation results, and concise decision rationale. Do not request or store hidden chain-of-thought. Minimize and redact logged inputs/outputs; apply the client’s access, retention, and data policies. Never log raw `<private>` content or secrets.
- **Deterministic fallbacks.** When the agent fails or is uncertain, it falls back to a known-safe behavior (queue for human review, return a safe default, do nothing). "The agent got confused and did something unexpected" is never acceptable in production.
- **Cost caps.** Agents in loops can burn through API budgets. Set request and aggregate budgets with bounded retries and stopping conditions. Choose alert thresholds early enough for the owner to act.

## AI governance - responsible deployment

**Before production:**
- **Bias testing.** Run the model on demographic-varied inputs. Define relevant groups, harms, and acceptable disparity with the responsible owner; investigate material differences and block unresolved critical harm. Aggregate accuracy alone is insufficient.
- **Explainability.** Can you explain to a non-technical stakeholder why the model made a specific decision? If not, it's a black box - some jurisdictions and industries prohibit this.
- **Model card.** Document: what the model does, what data it was trained/tuned on, known limitations, failure modes, who owns it. One page. Required before production.
- **Kill switch.** Every AI component must be disable-able without taking down the feature it powers. The fallback path (rule-based, human-routed, or gracefully degraded) must work when the AI is off.

**In production:**
- **Drift monitoring.** Compare production outputs against baseline quality on a cadence matched to traffic, drift risk, and impact. Quality can deteriorate gradually or fail abruptly after model, data, tool, or policy changes; monitor both patterns.
- **Feedback collection.** Thumbs up/down, corrections, escalations. This is your retraining signal AND your quality metric.
- **Cost monitoring.** Track: tokens consumed, calls made, cost per user, cost per feature. AI costs surprise everyone at scale.
- **Incident response.** When the AI produces harmful/wrong output: disable (kill switch), investigate (sanitized execution traces and observed outcomes), fix (prompt/model/data), restore. Define this BEFORE it happens.

## Writes

`trust-profile.md` - AI policy, data classification, model hosting, human-in-the-loop requirements. `evals.md` - golden cases, failure modes, SHIP/NO-SHIP, HITL. `decisions.md` - model selection rationale, architecture choices. `risks.md` - bias findings, drift observations, cost projections. `delivery.md` - AI component inventory with kill switches + eval receipt on ship.

## Principles

- AI degrades silently. Monitor outputs, not just uptime.
- Choose by measured quality and total cost per successful outcome, within policy and latency constraints.
- No golden set, no AI ship (`evals.md` Verdict SHIP).
- Every AI component needs a kill switch and a fallback path.
- Debug from privacy-safe observable execution and concise rationale, never hidden chain-of-thought.
- Drift is inevitable. Define the detection method before shipping.
- Cost at scale ≠ cost at pilot. Model the 10× number before committing.
- Bias testing is a pre-production gate, not a post-launch audit.
