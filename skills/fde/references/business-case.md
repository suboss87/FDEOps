# business-case - Build the business case

**Enter when:** the sponsor needs justification for the next phase, the FDE needs to defend budget or timeline, a feature decision needs cost/benefit evidence, or poc produced a direction that needs funding.

**Read first:** `reality.md`, `success.md`, `delivery.md`, `context.md`. Load `business-case.md` from poc if it exists - extend it, don't restart.

Technical FDEs lose engagements by shipping good code without business justification. The sponsor's boss doesn't ask "is the code clean?" - they ask "what did we get for the money?" A business case translates technical work into the language that keeps the engagement alive.

## Method (you do this work)

**1. Name the cost of doing nothing.** This is the anchor. Every business case starts not with what you'll build, but with what it costs them to leave the problem unsolved:

| Cost type | How to find it | Example |
|-----------|---------------|---------|
| **Direct cost** | Ask: "What does this problem cost per month in money?" | Manual reconciliation: 3 people × 8h/week × loaded cost = $X/month |
| **Opportunity cost** | Ask: "What can't you do because of this problem?" | Can't onboard enterprise clients because the API can't handle their volume |
| **Risk cost** | Ask: "What happens if this breaks at the worst time?" | A payment processing outage during Black Friday = $X/hour in lost sales |
| **Velocity cost** | Measure: deployment frequency, lead time, change failure rate | Team ships once/month instead of once/week; each delay = N features not reaching customers |

**2. Build the driver model.** Not a spreadsheet - a logic chain the sponsor can trace:

```
Investment: <hours × rate, or fixed cost>
  → Delivers: <specific outcome from success.md>
    → Saves: <cost-of-nothing × probability of success>
      → Net: savings - investment over <time horizon>
```

Keep the drivers explicit. "We estimate $200K savings" means nothing. "3 people × 8h/week × $75/h × 52 weeks = $93.6K/year, minus $40K build cost = $53.6K net year one" is defensible.

**3. Sensitivity check - name the two drivers that swing the result:**

Every business case has 1-2 variables where a small change flips the outcome. Name them explicitly:

> "This case holds if the team actually reclaims 6+ hours/week per person. If it's only 3 hours, the payback extends from 5 months to 14 months. The validation: measure time-spent before and after pilot with 2 team members."

The sponsor who sees you've identified where the case could break trusts the case more, not less.

**4. Frame for the audience.** Different stakeholders need different lenses on the same case:

| Audience | Lead with | Avoid |
|----------|----------|-------|
| **CFO / finance** | ROI, payback period, cash flow impact | Technical architecture, feature lists |
| **CTO / engineering** | Technical debt retired, velocity improved, risk reduced | Revenue projections they can't verify |
| **CEO / founder** | Strategic enablement, competitive edge, customer impact | Detailed calculations (give the summary, offer the detail) |
| **Product** | User impact, adoption metrics, feature velocity | Cost structures that aren't their domain |

**5. The one-page format.** The business case fits one page or it isn't understood:

```markdown
## Business case: <initiative name>

**The problem costs:** <one line, quantified>
**The investment:** <hours and cost>
**The return:** <quantified, with time horizon>
**Payback:** <months>
**Sensitivity:** <the 1-2 drivers that swing it, with thresholds>
**Risks:** <what must be true for this to hold>
**Recommendation:** <proceed / proceed-with-conditions / defer>
```

## Artifact

**`business-case.md`** - the one-page case. Lives alongside `success.md` and `reality.md` as a first-class engagement artifact. Referenced by plan, status, and close.

**`decisions.md`** - log the sponsor's response: approved, modified, deferred. With the date.

## Checkpoint

Walk the FDE through: the cost of doing nothing (anchor), the investment, the return, and the one sensitivity that matters most. If the FDE says "the sponsor won't buy the ROI number" - ask what number they would believe and work backwards from there.

## Worked example

Acme phase 2 needs funding. The case starts with the cost of doing nothing, not the cost of building.

Anchor: two silent failures since March, each one day of finance reconciliation by hand plus a late close (`reality.md`, Marco's sheet). That is the number the sponsor already believes because her own team reported it.

Driver model the sponsor can trace: incidents/quarter × hours of manual reconciliation × loaded cost, plus the tail risk of a late regulatory close - stated separately, because mixing a certain small number with an uncertain large one is how a case loses credibility.

Sensitivity names the two drivers that swing it: incident frequency (2/quarter → 1/quarter and the case halves) and whether the manual re-run continues in parallel (if Marco keeps re-running every morning, the saving is theoretical). The second one is the honest weakness, so it is in the case rather than waiting to be found in the room - with the condition that makes it hold: the morning re-run stops after two clean cycles, agreed with Marco.

## Principles

- The cost of doing nothing is always the opening move. Anchor before proposing.
- Driver models with visible arithmetic beat magic spreadsheets.
- Name the sensitivity. The case that admits its weakness earns more trust.
- One page. If it doesn't fit, you don't understand it yet.
- A business case the FDE can't explain in 60 seconds won't survive the sponsor's boss.
