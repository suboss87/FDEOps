---
description: The brief is wrong — find who must agree before more code
---

Load `@fde` (`skills/fde/SKILL.md`). Situation: **the brief is wrong**.

If `fde resume` shows NO ENGAGEMENT: ask "What should we call this client?" once, then **you** run `fde resume --init`. Never tell the human to type the CLI.

Say: "If this works, who in their company would have to agree that it worked?"

Run `fde resume` (fallback: `npx --yes fdeops resume`) to load bounded context. Read `references/discover.md` and follow it — shadow processes, real problem, not the slide deck.

Playback 2–3 lines: who decides, what you think the real problem is, and the next move. Confirm before any write to `.fde/`.

Do not invent stakeholders or quotes. Missing names → `unknown - ask: <question>`.

Done when: you have named the acceptance owner and a discover next step the human agrees to.

Not for TypeScript errors, unit tests, refactors, or git commits — those stay in the host agent.
