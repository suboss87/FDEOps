# fdeops Engagement Schema v1

Open layout for engagement memory. **Default path:** `~/fde-engagements/<name>/.fde/` (create with `node bin/install.js init <name>` from repo, or `npx fdeops@latest init` when npm ≥ 3.0.0). Private to the engineer - not in shared git by default.

Optional: `./.fde/` in a workspace only if the engagement allows it and it is gitignored.

## Core files (start here)

| File | Purpose | Written by |
|------|---------|------------|
| `context.md` | Compact state; loaded every session | every phase + the `session-stop` hook (auto-capture) |
| `brief.md` | Stated problem (hypothesis) | land |
| `success.md` | Definition of done + out of scope | land |
| `stakeholders.md` | Champions, resistance, trust signals | land (updated continuously) |
| `trust-profile.md` | Sacred data, AI policy (`<private>` tags) | land, overlays |

## Discovery and delivery

| File | Purpose | Written by |
|------|---------|------------|
| `reality.md` | Actual problem vs brief | discover |
| `terrain.md` | Codebase map, hotspots, test gaps | discover, audit |
| `decisions.md` | Plan + technical choices + reviews | plan, build, review |
| `risks.md` | Live risk register | plan, build, rescue |
| `delivery.md` | Shipped value (business-visible) | build, ship, close |

## Incidents and handoff

| File | Purpose | Written by |
|------|---------|------------|
| `chaos-log.md` | Incidents, root cause | rescue, debug |
| `handoff.md` | Team takeover knowledge | close |
| `patterns.md` | Reusable patterns | close |
| `audit.md` | Mid-engagement: real vs assumed | audit |
| `retrospectives/YYYY-MM-DD-name.md` | Per engagement close | close |

## Optional

| File | Purpose |
|------|---------|
| `business-case.md` | Scored use case, pitch | sketch |
| `prototype-log.md` | Prototype learnings | sketch |

## Rules

1. **`<private>...</private>`** - never sent to the AI or subagents.
2. Phases load files **on demand**, not the whole directory.
3. **Do not** mix two customers in one `.fde/`.
4. **Deliverable = memory:** `init` creates only the core files; phase artifacts (`audit.md`, `chaos-log.md`, `handoff.md`, …) are created by their phases when they run - formats live in [skills/fde/references/](../skills/fde/references/).
5. Every claim carries its evidence: `(ops lead, Day 5)` · `(churn: 47/90d)` · `(stated, unverified)`.

Scaffold: `node bin/install.js init <engagement-name>` (or `npx fdeops@latest init` when npm ≥ 3.0.0).
