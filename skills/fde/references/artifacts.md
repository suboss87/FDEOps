# artifacts overlay - client-facing documents from engagement memory

**Activate when you hear:** deck, slides, presentation, PDF, report, document, governance framework, compliance pack, architecture diagram, decision record, research brief, board paper, executive summary, SOC2 evidence, audit report, assessment document. Loads **alongside** the active phase, never instead of it.

**Read first:** the `.fde/` memory files that contain the source data for the artifact. Every document generated here is built from the engagement record - never from memory, never invented.

FDEs produce code. They also produce documents. The sponsor's boss doesn't read PRs - they read decks. The compliance team doesn't read commits - they read evidence packs. The board doesn't read sprint retrospectives - they read executive summaries. This overlay converts `.fde/` memory into professional client-facing artifacts.

## The rule: source from memory, never fabricate

Every claim in a generated document must trace to a `.fde/` artifact:
- Numbers → `delivery.md` or `business-case.md`
- Risks → `risks.md`
- Decisions → `decisions.md`
- Technical facts → `terrain.md` or `reality.md`
- Stakeholder context → `stakeholders.md`

If the memory doesn't support a claim, it's not in the document. Professional documents with fabricated numbers are worse than no document - they get quoted in board meetings and become liabilities.

## Artifact types and templates

### 1. Executive deck (slides outline)

**Source:** `delivery.md`, `success.md`, `business-case.md`
**When:** sponsor needs to present upward, quarterly review, board update

```markdown
# [Engagement name] - Executive Update
## Slide 1: Headline
One sentence: what changed and what it's worth.
Source: delivery.md "business value" line

## Slide 2: Progress
- Delivered: [list from delivery.md]
- In progress: [from decisions.md current tasks]
- Blocked: [from risks.md active blockers]

## Slide 3: Value realized
[Quantified from delivery.md - time saved, cost reduced, revenue enabled]
vs. investment: [from business-case.md]

## Slide 4: What's next
[From decisions.md - next phase, ask, timeline]

## Slide 5: Risks & mitigations
[Top 3 from risks.md with status]
```

The FDE generates the content structured for slides. The client's design team (or AI slide tool) formats it. fdeops produces the substance, not the PowerPoint file.

### 2. Governance framework

**Source:** `stakeholders.md`, `decisions.md`, `success.md`
**When:** enterprise engagement needs operating model clarity

```markdown
# Governance Framework - [Project/Programme name]

## Decision rights (RACI)
| Decision type | Responsible | Accountable | Consulted | Informed |
|--------------|------------|-------------|-----------|----------|
| Architecture choices | FDE | Tech lead | Security, Ops | Sponsor |
| Scope changes | Product owner | Sponsor | FDE, Tech lead | Team |
| Production deploys | FDE + Ops | Tech lead | Security | Sponsor |
| Budget/timeline changes | Sponsor | Exec sponsor | FDE, Finance | Team |

## Escalation path
Level 1: [named person] - operational decisions, <2 day impact
Level 2: [named person] - scope/timeline decisions, <2 week impact
Level 3: [named person] - strategic decisions, programme-level

## Review cadence
- Weekly: delivery standup (15 min, [attendees])
- Bi-weekly: steering committee (30 min, [attendees])
- Monthly: executive review (45 min, [attendees])
- Quarterly: programme board (90 min, [attendees])

## Change control
[From decisions.md - how scope changes are raised, assessed, approved]
```

### 3. Technical assessment report

**Source:** `terrain.md`, `reality.md`, `risks.md`
**When:** discovery complete, need to present findings formally

```markdown
# Technical Assessment - [System/Domain name]
Date: [date] | Assessor: [FDE name] | Classification: [confidentiality]

## Executive summary
[3 sentences: current state, key finding, recommendation]

## Current state
[From terrain.md: stack, age, architecture, data flow]

## Findings
| # | Finding | Severity | Evidence | Recommendation |
|---|---------|----------|----------|---------------|
| 1 | [from reality.md] | Critical/High/Medium/Low | [source] | [action] |

## Risk register
[From risks.md - top risks with likelihood × impact scoring]

## Recommendations (prioritized)
1. [Immediate - do this week]
2. [Short-term - do this phase]
3. [Medium-term - plan for next phase]

## Appendix: raw data
[References to terrain.md scans, churn data, test coverage]
```

### 4. Architecture Decision Record (ADR)

**Source:** `decisions.md`
**When:** a significant architecture choice needs formal documentation

```markdown
# ADR-[number]: [Decision title]
Date: [date] | Status: Accepted | Deciders: [names]

## Context
[From reality.md - the problem or requirement driving this decision]

## Decision
[The chosen approach - from decisions.md]

## Alternatives considered
| Option | Pros | Cons | Why not |
|--------|------|------|---------|
| [A] | | | |
| [B] | | | |
| [Chosen] | | | Selected because: |

## Consequences
- Positive: [what this enables]
- Negative: [what this costs or constrains]
- Risks: [from risks.md]

## Review trigger
[When to revisit: "if volume exceeds X", "if requirement Y changes"]
```

### 5. Compliance evidence pack

**Source:** `trust-profile.md`, `delivery.md`, `decisions.md`
**When:** SOC2, ISO27001, or other audit evidence needed

```markdown
# Compliance Evidence - [Control/Requirement]
Framework: [SOC2 / ISO27001 / HIPAA / PCI-DSS]
Control: [control ID and description]
Date: [evidence date range]

## Control implementation
[How the control is implemented - from trust-profile.md and build decisions]

## Evidence
- [Artifact 1]: [what it proves] - location: [path/link]
- [Artifact 2]: [what it proves] - location: [path/link]
- [Test result]: [date, outcome]

## Gaps
[Any gaps between control requirement and current implementation - from risks.md]

## Remediation plan
[If gaps exist - timeline, owner, acceptance criteria]
```

### 6. Value realization report

**Source:** `delivery.md`, `business-case.md`, `success.md`
**When:** proving ROI for renewal, extension, or programme continuation

```markdown
# Value Realization - [Engagement/Phase name]
Period: [date range] | Prepared for: [sponsor name]

## Investment
[From business-case.md: cost of engagement, infrastructure, licenses]

## Value delivered
| Metric | Baseline | Current | Change | Business value |
|--------|----------|---------|--------|---------------|
| [from delivery.md] | | | | $ or % |

## ROI calculation
Investment: [total cost]
Return: [total quantified value]
ROI: [return / investment] - payback period: [months]

## Qualitative outcomes
[From delivery.md: capabilities built, risks reduced, team upskilled]

## Recommendation
[Continue / Expand / Transition to BAU - with evidence]
```

### 7. Research brief

**Source:** `decisions.md`, `terrain.md`
**When:** vendor evaluation, technology comparison, or options analysis needs formal documentation

```markdown
# Research Brief - [Topic]
Date: [date] | Audience: [who needs this]

## Question
[The specific decision this research informs]

## Methodology
[How options were evaluated: criteria, weighting, test approach]

## Findings
| Option | [Criterion 1] | [Criterion 2] | [Criterion 3] | Score |
|--------|--------------|--------------|--------------|-------|
| [A] | | | | |
| [B] | | | | |

## Recommendation
[Which option, why, with confidence level and caveats]

## Risks of recommendation
[What could go wrong with the chosen path]
```

## Generation rules

1. **Always cite the source file.** Every section header should note which `.fde/` file it draws from.
2. **Dates and numbers from the record.** Never round, estimate, or approximate without flagging it: "[estimated]".
3. **Classification.** Mark documents with their sensitivity: Internal, Confidential, Restricted. Default to Confidential for client-facing artifacts.
4. **Version control.** Generated artifacts go to `.fde/artifacts/` with date-stamped filenames. Previous versions stay - don't overwrite.
5. **Format guidance, not final format.** fdeops generates structured markdown content. The client's tools (Google Slides, PowerPoint, Confluence, Notion) apply formatting. Don't waste time on visual design - substance first.

## Writes

Generated artifacts to `.fde/artifacts/[type]-[date].md`. Log the generation in `delivery.md` - "Produced [artifact type] for [audience] on [date]."

## Principles

- Every claim traces to a `.fde/` source file. No fabrication.
- Substance over format. Generate content, not design.
- Date-stamp and version. Never overwrite previous artifacts.
- The sponsor's boss reads decks, not code. Produce what they consume.
- A governance framework without named people is fiction.
- Compliance evidence is only evidence if it's dated, sourced, and testable.
