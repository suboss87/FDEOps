# fintech overlay - money moves, failures are silent

**Activate when you hear:** payments, transfers, settlements, reconciliation · PCI-DSS, PSD2, SOX, open banking, SWIFT · banking, lending, insurance, trading, crypto · "we handle money" in any form. Loads **alongside** the active phase, never instead of it.

**Read first:** `trust-profile.md` always - data classification and AI policy before any action. `terrain.md` only when reviewing transaction/cardholder code.

Financial systems carry a failure class others don't: **silent money loss.** A bug that processes a payment twice or drops a transaction is regulatory breach + customer harm + potential criminal liability, not a defect ticket.

## The first conversation

> "Does this system store, process, or transmit cardholder data? What's the current PCI-DSS compliance level?"

Cardholder data = PAN, CVV, PIN, expiry. PAN never stored post-authorisation without explicit business case + encryption + masking (last 4 only). **Full PANs in logs, analytics events, or error messages is the first finding and outranks everything else.** Tag all cardholder scope in `trust-profile.md` under `<private>`.

## Idempotency - the most common silent failure

Same operation twice must equal once. Retries, network failures, double-clicks all duplicate requests; without idempotency that's double charges and phantom credits. On any code that creates transactions, verify:
- An idempotency key on every write operation
- Key checked **before** processing, not after
- Retries reuse the same key, never a new one

Missing from a payment flow → flag before production. "We'll add it later" has caused real customer harm in every fintech that said it.

## Transaction integrity

Atomic or nothing. A transfer that debits A and fails before crediting B is a financial error that may require regulatory reporting, not a technical error. Verify: DB-level transactions wrap the operations · compensating transactions exist · **the reconciliation path can catch a discrepancy at midnight.**

## Fraud and reporting - surface early

> "What fraud signals does this system monitor, and what happens when a transaction is flagged?"

Immaturity markers: no velocity checks, no geographic anomaly detection, a review queue nobody actions, a manual override bypassing all controls. The engagement needn't build fraud detection - it must know what exposure the gaps leave. Same for regulatory reporting (CTR/SAR thresholds): manual reporting that relies on memory is a compliance risk; verify changes don't break automated reporting.

## AI in financial systems

Regulators commonly require **explainability** for automated decisions (credit, fraud, account actions). Before any AI-driven decision ships: explainability requirement for this jurisdiction confirmed · right-to-explanation satisfiable · decisions logged with input features. Some institutions prohibit AI final decisions on regulated activities - check `trust-profile.md` first.

## Writes

`trust-profile.md` - cardholder scope, PCI level, AI policy, reporting obligations. `risks.md` - idempotency gaps, integrity issues, fraud-control gaps, compliance exposure.

## Principles

- Idempotency is not optional.
- Full PANs in logs = immediate flag.
- Atomic or nothing; partial transaction states are financial errors.
- If midnight reconciliation can't catch it, there is no financial integrity.
- AI on regulated decisions needs explainability and an audit trail before build.
