---
description: What did they get? — promised, measured, accepted
---

Load `@fde` (`skills/fde/SKILL.md`). Situation: **what did they get?**

If `fde resume` shows NO ENGAGEMENT: ask "What should we call this client?" once, then **you** run `fde resume --init`. Never tell the human to type the CLI.

Say: "A number nobody signed is claimed, not delivered."

Run `fde status` (fallback: `npx --yes fdeops status`). Read the ledger out loud in order: **promised → measured → accepted**.

Call out gaps: promised but not measured, measured but not accepted, accepted without a named signer. Do not smooth over missing acceptance.

Read `references/status.md` and follow it for how to present the ledger and what to offer next.

Do not invent metrics or sign-off. Numbers without a source in `.fde/` stay `unknown - ask: <question>`.

Done when: the human hears the three-beat ledger and agrees what is actually delivered vs still claimed.

Not for TypeScript errors, unit tests, refactors, or git commits — those stay in the host agent.
