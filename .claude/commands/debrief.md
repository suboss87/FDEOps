---
description: After a meeting. Notes into the record.
---

Load `@fde` (`skills/fde/SKILL.md`). Situation: **after a meeting**.

If `fde resume` shows NO ENGAGEMENT: ask "What should we call this client?" once, then **you** run `fde resume --init`. Never tell the human to type the CLI. If they already pasted notes, bind first, then debrief.

Run `fde debrief --smart` (fallback: `npx --yes fdeops debrief --smart`). `--smart` is a gate, not a brain - it proposes routing; you still judge.

Rewrite the propose output: add type prefixes where the record needs them. Strip noise; keep their words for quotes and decisions.

Present the routing in plain language: what lands where in `.fde/`, what changed, what is still open. One screen, not a transcript dump.

Only run `fde debrief --apply` (fallback: `npx --yes fdeops debrief --apply`) after the human confirms. Never auto-apply.

Read `references/debrief.md` for prefix rules, file targets, and digest beats.

Done when: the human confirmed the routing and `--apply` wrote the agreed `.fde/` updates.

Not for TypeScript errors, unit tests, refactors, or git commits - those stay in the host agent.
