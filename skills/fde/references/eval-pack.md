# eval-pack - Gate the model before it acts

**Enter when:** the work touches AI/LLM/agents/RAG, or they need to POC a model, or ship/close is blocked because there is no evidence the non-deterministic path is safe. Activate alongside `ai.md`, `poc`, or `ship` - not instead of them.

**Read first:** `trust-profile.md` (AI policy + HITL), `terrain.md` (operating map), `delivery.md`. Create or extend `evals.md`.

Non-AI engagements skip this pack entirely.

## Why this exists

Intelligence without evidence is token-maxing with a nicer name. An FDE earns trust by showing: golden cases, failure modes, and a human gate before action.

## Method (you do this work)

**1. Scope the judgement surface.** One sentence: which step uses model judgement, and what must never be autonomous.

**2. Build a golden set (minimum 5-20 for a slice; prefer 50-100 before broad scale).** For each case:
- input (sanitized - no `<private>` raw values)
- expected outcome or expert-approved acceptance note
- pass rule (exact / contains / short rubric)
- source: real historical example / expert label / staged fixture

**3. Score pass/fail, not vibes.** Run the suite. Record count pass / fail. Failures get a failure-mode tag (missing data, wrong record, format drift, hallucination, retrieval miss, unsafe action, other).

**4. Human-in-the-loop gate.** Name which outcomes require human approve before side effects. Judgement that has a side effect (write, send, transfer, ticket, deploy, pay, page) is **NO-SHIP** without a named human on their side in the loop. Do not write "none - allowed under policy" to bless lights-out write-access. Staging may run a supervised loop with a kill switch, a cost cap, and a golden set from **their** failures. Production stays gated until they have a written policy, a named owner, and dated eval receipts on real traffic.

**5. Ship rule.** Until `evals.md` shows Verdict **SHIP** with a dated run (critical fails = 0) and HITL filled, AI-touching ship stays **fix-first**. Eval fails do not sit in a backlog - they reopen plan (descope, move the judgement, or kill the path). Log a one-line eval receipt in `delivery.md` → `## Ship receipts`. No "probably fine."

## Artifact - `evals.md`

Create on first AI-touching slice (not at `resume --init`). Use the stub in `templates/.fde/evals.md`. Every claim needs a source. Missing evidence → leave the cell `unknown - ask:`, never invent scores.

## Checkpoint

Present to the FDE: suite size, pass rate, top failure mode, HITL gate, Verdict SHIP/NO-SHIP. If they want to ship without a run: say no, and offer the smallest suite that would unblock.

## Principles

- No golden set, no AI ship.
- Pass/fail beats “looks good.”
- Failure modes are the product - the happy path is table stakes.
- HITL is a gate, not a slide. Side effects without a named human on their side are NO-SHIP.
- Non-AI work does not need this file.
