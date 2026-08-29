# ai overlay - intelligence that degrades instead of failing

**Activate when you hear:** AI, ML, machine learning, model, LLM, GPT, inference, embeddings, RAG, agents, fine-tuning, prompt engineering, training data, model drift, hallucination, vector database, neural network, generative AI. Loads **alongside** the active phase, never instead of it.

**Read first:** `trust-profile.md` always - AI policy and data classification before any action. `terrain.md` when reviewing existing AI components.

AI systems fail differently from traditional software: they **degrade silently** instead of throwing exceptions. A model that hallucinates returns a 200 OK with confident nonsense. A drifted model passes every unit test while making worse decisions. The monitoring, testing, and governance patterns for AI are fundamentally different.

## The first conversation

> "Is there an existing AI/ML policy? Who approves production use of AI? What data can leave the network?"

Get these answers before any AI code is written:
- **Model hosting:** cloud API (OpenAI, Anthropic, Google) or self-hosted? Cloud = data leaves the network. Self-hosted = infra cost and maintenance.
- **Data classification:** what data touches the model? PII in prompts = a compliance conversation before a technical one.
- **Human-in-the-loop requirements:** which decisions require human review before action? In regulated industries, autonomous AI decisions may be prohibited.
- **Budget/cost model:** AI inference costs scale with usage. What's the expected volume? What's the cost ceiling?

Record in `trust-profile.md` under `## AI policy`.

## Model selection - choosing the right tool

Never start with the most powerful model. Start with the cheapest that meets the quality bar.

**The evaluation ladder:**
1. **Can rules solve it?** If yes, no model needed. Rules are debuggable, testable, and free.
2. **Can a small/fast model solve it?** (GPT-4o-mini, Claude Haiku, local models) - try this first. Cheaper, faster, easier to self-host.
3. **Does it need a frontier model?** (GPT-4o, Claude Sonnet/Opus, Gemini Pro) - only when the quality gap is measurable and justified.
4. **Does it need fine-tuning?** Only when: you have 500+ high-quality examples, the base model fails consistently on your domain, and the cost of inference at scale justifies the training cost.

**Evaluation method (before choosing):**
- Build a test set: 50-100 representative inputs with expected outputs.
- Run every candidate model against the test set.
- Score: accuracy, latency, cost per call, failure modes.
- The cheapest model that scores above the quality threshold wins.

Write model selection rationale to `decisions.md`. Include: models tested, test set size, scores, cost comparison.

## Engagement eval pack (before AI ships)

When any slice touches a model, embeddings, RAG, or an agent: create or update `.fde/evals.md` **before** ship. Full skill: `references/eval-pack.md`. This is the engagement-local test set - not unit tests.

**Minimum pack (do not grow until the minimum exists):**
1. **Component + quality bar** - one sentence each; kill switch / fallback named.
2. **Golden cases** - 5-20 representative inputs with expected outputs and a pass rule. Prefer real production-shaped data (sanitized).
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
- **Chunk size wrong.** Too small = lost context. Too large = noise drowns signal. Start at 500-1000 tokens with 100-token overlap.
- **No citation/grounding.** If the model can't point to where it found the answer, you can't verify it. Always require source attribution.
- **Stale index.** Documents update, embeddings don't. Define the refresh cadence. Real-time for critical data, daily for reference docs.
- **Retrieval miss.** The right document exists but wasn't retrieved. Test with known-answer queries where the answer IS in the corpus - if retrieval misses these, the embedding model or chunking strategy needs work.

## Agent and agentic systems

When the AI takes actions (not just generates text):

**Safety principles:**
- **Least privilege.** An agent gets the minimum permissions needed. Never give an agent admin access "for convenience."
- **Confirmation gates.** Any destructive or irreversible action requires human confirmation. Delete, send, transfer, publish = confirm before execute.
- **Observability of reasoning.** Log the agent's chain of thought, tool calls, and decisions. When it does something wrong, you need to see why.
- **Deterministic fallbacks.** When the agent fails or is uncertain, it falls back to a known-safe behavior (queue for human review, return a safe default, do nothing). "The agent got confused and did something unexpected" is never acceptable in production.
- **Cost caps.** Agents in loops can burn through API budgets. Hard-cap per request, per user, per hour. Alert at 50% of cap.

## AI governance - responsible deployment

**Before production:**
- **Bias testing.** Run the model on demographic-varied inputs. If outputs differ by protected characteristic, it doesn't ship.
- **Explainability.** Can you explain to a non-technical stakeholder why the model made a specific decision? If not, it's a black box - some jurisdictions and industries prohibit this.
- **Model card.** Document: what the model does, what data it was trained/tuned on, known limitations, failure modes, who owns it. One page. Required before production.
- **Kill switch.** Every AI component must be disable-able without taking down the feature it powers. The fallback path (rule-based, human-routed, or gracefully degraded) must work when the AI is off.

**In production:**
- **Drift monitoring.** Compare production outputs weekly against the baseline quality. Models don't break - they slowly get worse as the world changes around them.
- **Feedback collection.** Thumbs up/down, corrections, escalations. This is your retraining signal AND your quality metric.
- **Cost monitoring.** Track: tokens consumed, calls made, cost per user, cost per feature. AI costs surprise everyone at scale.
- **Incident response.** When the AI produces harmful/wrong output: disable (kill switch), investigate (logged reasoning), fix (prompt/model/data), restore. Define this BEFORE it happens.

## Writes

`trust-profile.md` - AI policy, data classification, model hosting, human-in-the-loop requirements. `evals.md` - golden cases, failure modes, SHIP/NO-SHIP, HITL. `decisions.md` - model selection rationale, architecture choices. `risks.md` - bias findings, drift observations, cost projections. `delivery.md` - AI component inventory with kill switches + eval receipt on ship.

## Principles

- AI degrades silently. Monitor outputs, not just uptime.
- Start with the cheapest model that meets the quality bar.
- No golden set, no AI ship (`evals.md` Verdict SHIP).
- Every AI component needs a kill switch and a fallback path.
- Log reasoning, not just results. Debug AI from its decisions.
- Drift is inevitable. Define the detection method before shipping.
- Cost at scale ≠ cost at pilot. Model the 10× number before committing.
- Bias testing is a pre-production gate, not a post-launch audit.
