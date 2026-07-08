# Brief (stated problem)

**Stated problem:** "Referral intake is drowning - 11 days average from fax to scheduled appointment. We want an AI triage assistant that reads incoming referrals and routes them." (Sam Whitfield, COO, kickoff 2026-06-30)
**Timeline:** 8-week pilot. One specialty (cardiology), one clinic first.
**Named decision-maker:** Sam Whitfield (COO) for the pilot; Dr. Anand Mehta (Medical Director) holds clinical veto - confirmed 2026-07-01.
**Gaps in the brief (questions to answer):**

- Referrals arrive as faxed PDFs full of PHI. What is allowed to touch an AI model? Policy conversation before any code. → partially answered, see trust-profile.md
- Renata Fischer (staff architect) proposed a referral-triage rebuild in 2025 - deck exists, project not funded. Why not, and who said no? → open. This is the landmine.
- "Route them" to whom? Scheduling rules live in three heads and an Epic worklist. No written spec.
- The 11-day average: measured how? Get the source query before repeating the number.

**Hypothesis (falsifiable):** most of the 11 days is not reading or triage - it is the back-and-forth on incomplete referrals. If true, an AI reader just produces faster rejections. Test with the intake timestamp pull, week 2.
