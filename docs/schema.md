# fdeops Engagement Schema v1

Open layout for engagement memory. **Default path:** `~/fde-engagements/<name>/.fde/` (create + bind with `fde resume --init <name>` from the client workspace). Private to the engineer - not in shared git by default.

Optional: `./.fde/` in a workspace only if the engagement allows it and it is gitignored.

## Core files (start here)

| File | Purpose | Written by |
|------|---------|------------|
| `context.md` | Compact state; loaded every session; dated debrief blocks | every phase + the `session-stop` hook (auto-capture) + `fde debrief` |
| `brief.md` | Stated problem (hypothesis) | land |
| `success.md` | Definition of done + out of scope | land |
| `stakeholders.md` | Champions, resistance, `[signal:green\|amber\|red]` trust tokens | land (updated continuously), `fde log contact --signal`, `fde debrief` |
| `trust-profile.md` | Sacred data, AI policy (`<private>` tags) | land, overlays |

## Discovery and delivery

| File | Purpose | Written by |
|------|---------|------------|
| `reality.md` | Actual problem vs brief | discover |
| `terrain.md` | Codebase map, hotspots, test gaps | discover, audit |
| `decisions.md` | Plan + technical choices + reviews | plan, build, review, `fde debrief` |
| `risks.md` | Live risk register | plan, build, rescue, `fde debrief` |
| `delivery.md` | Shipped value (business-visible) | build, ship, close, `fde debrief` |

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
4. **Deliverable = memory:** `--init` creates only the core files; phase artifacts (`audit.md`, `chaos-log.md`, `handoff.md`, …) are created by their phases when they run - formats live in [skills/fde/references/](../skills/fde/references/).
5. Every claim carries its evidence: `(ops lead, Day 5)` · `(churn: 47/90d)` · `(stated, unverified)`.
6. **Trust signals are tokens:** the latest dated `[signal:green|amber|red]` in `stakeholders.md` drives `fde status` / `fde dashboard`; tokens older than 21 days show as stale. Keyword matching is only the fallback when no token exists.

Scaffold: `fde resume --init <engagement-name>` (creates the folder AND binds the current workspace to it).
