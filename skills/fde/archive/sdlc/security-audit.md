# security-audit - find the holes before someone else does

**Enter when:** the engagement touches auth, payments, user data, or external integrations; the customer mentions compliance (SOC2, PCI, HIPAA); a new API endpoint is being shipped; or the FDE is asked "is this secure?"

**Read first:** `trust-profile.md` (data classification, AI policy, compliance requirements), `terrain.md`, `context.md`. Load the relevant regulated overlay (fintech/healthcare/gov) if the signal is present.

On an FDE engagement, security mistakes are twice as dangerous: you break someone else's system, with their users' data, under their compliance obligations. The FDE who finds the vulnerability before production earns trust that lasts the entire engagement.

## Method (you do this work)

**1. Threat model in five minutes.** Not a ceremony - five questions before looking at code:

| Question | What it reveals |
|----------|----------------|
| Where does untrusted data enter? | HTTP requests, file uploads, webhooks, LLM outputs, message queues |
| What's worth stealing? | Credentials, PII, payment data, API keys, session tokens |
| What's worth breaking? | Auth system, payment flow, admin actions, data integrity |
| Who's the attacker? | External (internet), internal (employee), adjacent (other tenant), automated (bot) |
| What's the worst realistic outcome? | Data breach, financial loss, regulatory fine, reputation damage |

Write the answers before scanning code. The threat model tells you where to look; code scanning without a threat model is reading every room in a building instead of checking the doors.

**2. The STRIDE pass.** For each trust boundary (where data crosses from untrusted to trusted):

| Threat | Check | Common FDE finding |
|--------|-------|-------------------|
| **Spoofing** | Can someone impersonate a user/service? | Missing auth on internal endpoints ("it's behind the VPN" is not auth) |
| **Tampering** | Can data be altered in transit or at rest? | Unparameterised SQL, unsigned webhooks, client-side validation as sole gate |
| **Repudiation** | Can an action be denied later? | No audit log on admin actions, no timestamp on state changes |
| **Information disclosure** | Can data leak? | Stack traces in production errors, PII in logs, verbose error messages |
| **Denial of service** | Can it be overwhelmed? | No rate limiting on auth endpoints, unbounded file uploads, no pagination |
| **Elevation of privilege** | Can a user gain access they shouldn't? | IDOR (changing user ID in URL), missing role checks on endpoints |

**3. The automated scan.** Run these - they catch what manual review misses:

```bash
# Secrets in code (repeat --include per extension)
grep -rnE "(api[_-]?key|secret|password|token|private[_-]?key)\s*[:=]\s*['\"][^'\"]{8,}" \
  --include="*.js" --include="*.ts" --include="*.py" --include="*.env" \
  --include="*.yaml" --include="*.json" . | grep -vE "example|template|test|mock" | head -20

# Dependency vulnerabilities
npm audit 2>/dev/null || pip audit 2>/dev/null || echo "no package audit available"

# SQL injection patterns
grep -rnE "(SELECT|INSERT|UPDATE|DELETE).*\+.*\"|f['\"].*{.*}.*SELECT" \
  --include="*.js" --include="*.ts" --include="*.py" . | head -10

# Dangerous patterns
grep -rnE "eval\(|innerHTML\s*=|document\.write\(|exec\(|__import__" \
  --include="*.js" --include="*.ts" --include="*.py" . | head -10
```

**4. The AI security check.** If the system uses AI/LLM components:

| Check | Finding if yes |
|-------|---------------|
| Is model output used in SQL, shell commands, or HTML without sanitisation? | Injection via prompt - treat model output as untrusted input |
| Is the system prompt relied on as a security boundary? | Prompt injection bypasses it - enforce permissions in code |
| Are secrets or cross-tenant data in the context window? | Data leakage via prompt extraction |
| Are tool/agent permissions scoped? | Excessive agency - model can take actions it shouldn't |
| Are token/rate/recursion limits set? | Unbounded consumption or infinite loops |

**5. Classify findings by severity and action:**

| Severity | Criteria | Action |
|----------|----------|--------|
| **Critical** | Exploitable now, real data at risk | Stop other work. Fix before next merge. |
| **High** | Exploitable with effort, or compliance violation | Fix this phase. Track in `risks.md`. |
| **Medium** | Defense-in-depth gap, no immediate exploit | Log it. Fix when the module is next touched. |
| **Low** | Best practice gap, no exploit path | Note for the handoff document. |

**6. Present findings as protection, not criticism.**

The internal team built this system under constraints. Frame findings as shared wins:

> "Found three endpoints without rate limiting - adding that now prevents the bot attack that hit [company in their industry] last quarter. Here's the fix."

Not: "Your auth is broken." Even if it is.

## Artifact

**`risks.md`** - each finding with severity, evidence, remediation, and status:
```markdown
## Security finding: <title> - <severity>
Where: <file:line or endpoint>
Evidence: <what you found>
Risk: <what an attacker could do>
Remediation: <specific fix>
Status: fixed / in-progress / logged-for-handoff
```

**`trust-profile.md`** - update if new sensitive data paths, AI components, or compliance requirements were discovered.

## Checkpoint

Summary to the FDE: findings by severity count, the one critical/high finding that needs immediate attention (if any), and the overall security posture in one sentence. If no critical findings: "No exploitable issues found in this pass - next audit at <trigger>."

## Principles

- Threat model first, scan second. Know where to look before looking everywhere.
- Treat model output as untrusted input - always.
- Frame findings as protection, not criticism. The team built under constraints.
- Secrets in code outrank every other finding. Check first.
- A security audit with no findings either found nothing or didn't look hard enough - state which.
