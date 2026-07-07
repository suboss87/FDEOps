# Brief (stated problem)

**Stated problem:** "Dispatch has no visibility. Build us an ops dashboard - live board of every load, every truck, every delay." (Diana Okafor, VP Ops, kickoff 2026-06-08)
**Timeline:** 6 weeks to a usable dashboard. Demo cadence: weekly, Thursdays.
**Named decision-maker:** Diana Okafor (VP Ops, sponsor). Budget sign-off sits with the CFO (not met).
**Gaps in the brief (questions to answer):**

- Why does dispatch say they HAVE visibility? Marcus's team runs the floor today somehow. → answered 2026-06-12, see reality.md
- Previous attempt: 2023 "ops-api" rewrite abandoned mid-migration (fde scan 2026-06-10, reverts visible in git). Who ran it, who is still here? → Priya Raman ran it; still here, platform team
- No out-of-scope section in the brief. Scope creep is pre-authorized. → confirmed: 3 additions in 13 days, see decisions.md
- Where does the board data come from, and does anyone trust it?

**Hypothesis (falsifiable):** the dashboard ask is a proxy - the real gap is that dispatch state lives somewhere the database cannot see. → confirmed 2026-06-12, see reality.md.
