# government overlay - classification first, everything second

**Activate when you hear:** federal/state agency, military, intelligence · FedRAMP, FISMA, NIST 800-53, CMMC, ITAR · ATO, SSP · CUI or classified data · contractor handling government data. Loads **alongside** the active phase.

**Read first:** `trust-profile.md` always - classification level and clearance requirements before any action.

Government runs on statutory authority, multi-year procurement, clearances, and classification regimes where one mishandled file is a federal offence. Slower by design; security stakes higher than any commercial engagement.

## The first conversation

> "What is the classification level of the data this system handles? Is there a System Security Plan I should read before we start?"

- **Unclassified** - no special handling. **CUI** - NIST 800-171 handling. **Secret/Top Secret** - clearances, air-gap, need-to-know.
- CUI or above constrains everything: which tools are allowed, where code is written, **whether AI assistance is permitted at all**, who can see what. Tag in `trust-profile.md` under `<private>` immediately. If the SSP doesn't exist, that's the first finding - a system without a security plan can't get an ATO.

## ATO - the constraint nobody warns about

> "Is this system operating under an ATO, or does this work require a new one?"

A new ATO = months to years (Security Assessment Report, POA&M, Continuous Monitoring) - the delivery timeline just changed; plan around it in week one. Existing ATO: new external connections, auth changes, new data stores, or boundary changes can trigger re-assessment.

## FedRAMP and sovereignty

Cloud services holding federal data must be FedRAMP-authorised **at the right level** (Moderate ≠ High) - verify at fedramp.gov/marketplace. **This includes AI services: most commercial AI APIs are not FedRAMP-authorised - possibly including the assistant in use. Check the policy before processing any federal data.** Residency: data, backups, DR replicas, and third-party routes stay inside the required boundary.

## Controls and clearance

NIST 800-53 baseline by impact level (CUI+ → Moderate, 325+ controls). The engagement doesn't implement them all - it knows which controls its changes touch. Common in dev work: AC-2 (account management), AU-2 (audit events), CM-7 (least functionality), SI-10 (input validation).

> "Does this work require a security clearance, at what level?"

Required and not held → adjust scope to the unclassified components; be explicit about the boundary.

## Procurement

New tools or vendors may need months of procurement. Contracting officers (CO/COR) approve scope changes - not the program manager. Identify tool additions early.

## Writes

`trust-profile.md` - classification, ATO status, AI policy, clearance, FedRAMP constraints. `risks.md` - ATO gaps, FedRAMP violations, residency risks, control gaps.

## Principles

- Classification level determines tools, process, and people. Ask first.
- ATO timelines are delivery timelines. Week one, not week ten.
- FedRAMP is a gate, not a formality - for AI tools too.
- No SSP = first finding.
