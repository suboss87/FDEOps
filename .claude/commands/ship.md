---
description: Ship to their production. Go live with a rollback you have run.
---

Load `@fde` (`skills/fde/SKILL.md`). Stage: **ship**.

If `fde resume` shows NO ENGAGEMENT: ask "What should we call this client?" once, then **you** run `fde resume --init`. Never tell the human to type the CLI.

Run `fde resume` (fallback: `npx --yes fdeops resume`). Read `references/ship.md` and follow it. Pre-flight, who needs to know, rollback.

Host agent writes the code. You log what shipped and whether it was accepted.

Confirm before any write to `.fde/`. Do not ship on “probably fine.”

Done when: go-live checks are on the record, or the human has named what still blocks live.

Not for a one-line typo in an unbound file. A client slice, POC, eval, or go-live stays on `@fde`.
