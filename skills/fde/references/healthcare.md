# healthcare overlay - PHI ends licences

**Activate when you hear:** patient records, EHR/EMR, clinical data · HIPAA, HITECH, HL7, FHIR · hospital, clinic, payer, pharma · "we handle patient data," even informally. Loads **alongside** the active phase.

**Read first:** `trust-profile.md` always - PHI classification and AI policy before any action. `terrain.md` only when reviewing patient-data code.

A PHI breach can end an operating licence; an audit-trail gap can invalidate a clinical trial; a model trained on patient data without consent can trigger federal investigation.

## The first conversation

> "Walk me through what patient data this system touches, stores, transmits - and who has access."

PHI is broader than names: IPs, device identifiers, sub-state geography, and dates (other than year) can all qualify in context. When in doubt, treat as PHI. Tag everything in `trust-profile.md` under `<private>` - **PHI never enters AI context in plaintext: not prompts, not test fixtures, not dev logs.**

## AI policy before a single line

> "Does your organisation have a policy on AI tools accessing patient data? Is there a BAA covering the tools we're using?"

Unclear answer = treat as prohibited until confirmed. Asking costs zero; guessing wrong is catastrophic.

## Audit trails - non-negotiable

Every action on PHI logged: who, what, when, from where (HIPAA Security Rule). On any PHI-touching code verify: identity+timestamp+action logged · logs immutable to application code · audit logs separate from app logs · retention ≥ 6 years. **No audit trail + a request to build a PHI feature → the audit trail gets built first.**

## Break-glass

Clinical systems need emergency override (a clinician must reach a record even when auth fails). Every break-glass event must **alert and trigger review**, not just log; verify it can't be silently disabled.

## Minimisation, consent, encryption

- Store the minimum PHI for the purpose; if de-identified data answers the question, use it. De-identification = HIPAA Safe Harbor's 18 identifiers - a legal definition, not a judgment call.
- Data collected for one purpose can't serve another without consent - **including model training.** A model trained on records without explicit consent is immediate legal exposure.
- Minimums: TLS 1.2+ in transit (1.3 preferred), AES-256 at rest, keys managed separately. Check `trust-profile.md` for stricter local rules.

## Writes

`trust-profile.md` - PHI scope, AI policy, consent coverage, BAA status. `risks.md` - compliance gaps with severity and remediation path.

## Principles

- PHI never enters AI context in plaintext.
- Audit trails before features.
- Unclear AI policy = prohibited until confirmed.
- De-identification is a legal definition (18 identifiers).
- Break-glass must alert, not just log.
