# assumption-audit - pressure-test the brief before building on it

**Enter when:** the brief feels too neat, the customer is very confident about the solution (not the problem), someone says "we just need…" about a complex system, or discover surfaced contradictions between what was said and what the codebase shows.

**Read first:** `brief.md`, `reality.md`, `terrain.md`, `context.md`. The assumptions are hiding between what the brief says and what the code does.

Every engagement is built on assumptions. Most are invisible until they're wrong and the build is two weeks deep. The assumption audit makes them visible - and killable - before they cost time.

## Method (you do this work)

**1. Extract the assumptions.** Read `brief.md` and `reality.md` line by line. Every statement that isn't backed by evidence is an assumption. Common hiding places:

| Where assumptions hide | Example | The real question |
|----------------------|---------|-------------------|
| **The problem statement** | "The API is slow" | Slow for whom? Measured how? Since when? |
| **The proposed solution** | "We need to migrate to microservices" | Is the monolith actually the bottleneck, or is it the database? |
| **The timeline** | "This should take two weeks" | Based on what? Who estimated? Have they done this before? |
| **The stakeholder claim** | "The team is on board" | Who specifically? Have they been asked? What did the resistors say? |
| **The data claim** | "We have good data for this" | Defined how? Validated when? By whom? Sample checked? |
| **The "just"** | "We just need to add a feature" | On what system? With what dependencies? What breaks? |

**2. Classify each assumption by blast radius:**

```
CRITICAL - if wrong, the engagement fails or the approach changes fundamentally
  → Must be validated before plan starts
  
LOAD-BEARING - if wrong, significant rework or timeline change
  → Must be validated before build starts
  
CONVENIENCE - if wrong, a task changes but the approach holds
  → Validate when you get there
```

**3. Design the validation.** Each critical assumption gets one specific test - not a discussion, a test:

| Assumption | Validation method | Effort | Evidence threshold |
|-----------|-------------------|--------|-------------------|
| "The API is the bottleneck" | Instrument the three slowest endpoints, measure p95 over 24h | 2h | Latency data shows >80% of wait time in API layer |
| "The team will adopt the new tool" | Ask three team members individually: "Show me how you'd use this" | 1h | 2 of 3 can describe a use case without prompting |
| "The data is clean enough for ML" | Sample 200 records, count nulls/duplicates/format errors | 1h | <5% error rate on the fields the model needs |

**4. Run the killer test first.** The assumption with the highest blast radius AND the cheapest validation gets tested immediately. This single principle saves more engagement time than any other: if the killer assumption is wrong, you've saved weeks; if it holds, you've bought confidence.

**5. Present findings as a fact base, not a challenge.**

The customer's assumptions are often wrong, but calling them wrong is a trust withdrawal. Frame as curiosity, not contradiction:

> "The brief says the API is the bottleneck. The codebase shows 80% of latency is in the database layer - here's the evidence. Should we adjust the focus?"

Evidence first, then the question. Let them reach the conclusion.

## Artifact

**`reality.md`** - append an assumptions section:
```markdown
## Assumptions audited - <date>
| # | Assumption | Classification | Validation | Result | Impact |
|---|-----------|---------------|------------|--------|--------|
| 1 | API is the bottleneck | CRITICAL | p95 instrumentation | DISPROVED - 80% DB | Approach changes from API rewrite to query optimisation |
| 2 | Team will adopt new tool | LOAD-BEARING | 3 individual interviews | CONFIRMED - 2/3 enthusiastic | Proceed with adoption plan |
| 3 | Data clean enough for ML | CRITICAL | 200-record sample | PARTIAL - 12% null rate on key field | Data cleaning task added to plan |
```

**`decisions.md`** - if an assumption was disproved and the approach changed: what shifted, why, the evidence.

## Checkpoint

Tell the FDE: how many assumptions extracted, how many critical, which ones were tested, which changed the direction. If a critical assumption is disproved: recommend the next move (rescope, pivot, or the conversation with the sponsor) before the FDE asks.

## Principles

- Every "just" is an assumption. Every "should" is an assumption.
- Kill the riskiest, cheapest-to-test assumption first.
- Evidence first, then the question. Let the customer reach the conclusion.
- A brief with zero disproved assumptions wasn't audited - it was accepted.
- Two weeks of building on a wrong assumption costs more than two hours of testing.
