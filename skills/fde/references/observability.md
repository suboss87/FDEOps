# observability - if you can't see it running, you can't operate it

**Enter when:** shipping a feature to production, the customer says "we don't know when things break," a post-incident review revealed gaps in monitoring, or the handoff needs the team to operate what was built.

**Read first:** `terrain.md`, `delivery.md`, `context.md`. Load `trust-profile.md` if the data flowing through logs contains sensitive information.

Code without observability is code you can't operate. The FDE who ships a feature without telemetry creates a callback in six weeks when it breaks and nobody can tell why. Observability is built alongside the feature, not after - the same way tests are.

## Method (you do this work)

**1. Define "working" before instrumenting.** Write 2–4 questions that the person on call will ask about this feature:

```
FEATURE: payment retry logic
QUESTIONS ON-CALL WILL ASK:
1. What fraction of payments succeed on first attempt vs after retry?
2. When a payment fails permanently, why? (provider error? timeout? validation?)
3. Is the payment provider slower than usual?
4. Are retries causing duplicate charges?
→ Every signal below must help answer one of these.
```

If you can't name the questions, you're not ready to instrument - you'll log everything and learn nothing.

**2. Pick the right signal for each question:**

| Signal | Answers | When to use |
|--------|---------|-------------|
| **Structured log** | "What happened in this specific case?" | Individual request debugging, audit trails |
| **Metric** | "How often / how fast, in aggregate?" | Dashboards, alerting, trend detection |
| **Trace** | "Where did time go across services?" | Cross-service latency, bottleneck identification |

Rule of thumb: metrics tell you **that** something is wrong, traces tell you **where**, logs tell you **why**.

**3. Structured logging - events, not prose.**

```
BAD:  logger.info(`Payment ${id} failed for user ${userId} after ${n} retries`)
      → Unqueryable, inconsistent format, buried in noise

GOOD: logger.info({ event: "payment_failed", payment_id: id, user_id: userId,
        retry_count: n, error_code: "PROVIDER_TIMEOUT", duration_ms: elapsed })
      → Queryable, alertable, structured for dashboards
```

Every log line: a stable event name + machine-readable fields. Human-readable messages are for debugging sessions; structured events are for production operations.

**4. The four metrics every FDE feature needs:**

| Metric | What it measures | Alert threshold |
|--------|-----------------|-----------------|
| **Error rate** | Failures / total requests | >2x baseline for 5 minutes |
| **Latency (p95/p99)** | How long the operation takes | >2x normal for 5 minutes |
| **Throughput** | Requests per second/minute | <50% of normal for 10 minutes (demand drop = upstream problem) |
| **Business metric** | The thing the feature is supposed to improve | Direction reverses for 1 hour |

The business metric is the one most FDEs skip and the one the sponsor cares about most. "Error rate is fine" means nothing if payments processed per hour dropped.

**5. Alert design - avoid noise, ensure action:**

| Principle | How |
|-----------|-----|
| **Every alert has an owner** | If nobody is named, nobody responds |
| **Every alert has a runbook** | "Error rate spiked" → "Check these three things in this order" |
| **Severity maps to response time** | Critical: 15 min. Warning: next business day. Info: weekly review. |
| **No alert without action** | If the response is "ignore it" three times, delete the alert |

**6. AI component observability.** AI features fail differently - they degrade, they don't crash:

| What to observe | Why |
|----------------|-----|
| Model input/output pairs (sampled, privacy-respecting) | Detect drift: outputs changing without code changing |
| Latency per model call | Provider degradation is gradual, not binary |
| Fallback activation rate | If fallback fires >5%, the primary path has a problem |
| Confidence/quality score trend | A score that slowly drops = model drift |
| Token usage / cost per request | Cost creep is invisible until the bill arrives |

**7. The sacred-data boundary.** Before shipping any observability:

- Check `trust-profile.md` for `<private>` tagged data.
- PII in logs = a breach, not a debug aid. Mask, hash, or exclude.
- In healthcare: PHI in logs violates HIPAA. In fintech: PANs in logs violate PCI-DSS.
- Default: log IDs, not values. `user_id: 12345` not `user_email: jane@...`

## Artifact

**`delivery.md`** - under each shipped feature: what's observable, where to look, alert thresholds, the runbook.

**`handoff.md`** (when close approaches) - the on-call guide: "what each alert means and what to do."

**`risks.md`** - if observability gaps were found in existing code: what's unobserved and the risk it carries.

## Checkpoint

Before marking a feature shipped: the four metrics are emitting, alerts have owners and runbooks, sacred data is not in logs. If any gap: "Observability incomplete - <specific gap> - shipping without it means <specific risk>."

## Principles

- Define the questions before choosing the signals. Unquestioned telemetry is noise.
- Metrics for detection, traces for location, logs for explanation.
- Every alert has an owner and a runbook, or it's noise.
- AI features need observability for drift, not just failures.
- PII in logs is a breach. Default to IDs, not values.
