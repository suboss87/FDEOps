---
description: Prepare the meeting. One page from the record.
---

Load `@fde` (`skills/fde/SKILL.md`). Situation: **prep for a meeting or readout**.

If `fde resume` shows NO ENGAGEMENT: ask "What should we call this client?" once, then **you** run `fde resume --init`. Never tell the human to type the CLI.

Take the meeting label from what they said - sponsor sync, steering committee, demo, etc.

Run `fde prep "<label>"` (fallback: `npx --yes fdeops prep "<label>"`). Use their exact label in quotes.

Present the output in plain language: who matters, what was promised, what shipped, open risks, suggested talking points. Lead with what they need to say, not file names.

Do not invent facts missing from `.fde/`. People, numbers, and quotes must come from the record or the repo they pointed at - else mark `unknown - ask: <question>`.

Offer one focused question only if a missing fact changes the prep.

Done when: the human has a spoken-ready prep from the record and knows what is still unknown.

Not for TypeScript errors, unit tests, refactors, or git commits - those stay in the host agent.
