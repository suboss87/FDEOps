---
description: Build one change they can see, then go live with a rollback you have run.
---

Load `@fde` (`skills/fde/SKILL.md`). Stage: **ship**.

If `fde resume` shows NO ENGAGEMENT: ask "What should we call this client?" once, then **you** run `fde resume --init`. Never tell the human to type the CLI.

Run `fde resume` (fallback: `npx --yes fdeops resume`). Read `references/ship.md` and follow it. Name brownfield or greenfield once. One change they can see, proven on their staging. Then pre-flight, who needs to know, rollback you have run.

Host agent writes the code. You log what shipped and whether it was accepted.

Confirm before any write to `.fde/`. Do not ship on “probably fine.”

Done when: the change is proven on staging they operate, and go-live checks are on the record, or the human has named what still blocks live.

Not for a one-line typo in an unbound file. Bound client work, a POC, eval, or go-live stays on `@fde`.
