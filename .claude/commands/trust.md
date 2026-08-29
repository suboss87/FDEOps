---
description: Diagnose a quiet sponsor. Process gap, or they stopped trusting you.
---

Load `@fde` (`skills/fde/SKILL.md`). Situation: **they went quiet**.

If `fde resume` shows NO ENGAGEMENT: ask "What should we call this client?" once, then **you** run `fde resume --init`. Never tell the human to type the CLI.

Say: "Is this a process gap, or a trust problem?"

Run `fde resume` (fallback: `npx --yes fdeops resume`) for recent signal history and open threads.

Log the contact with `fde log contact "<who and what happened>" --signal amber|red|green` (fallback: `npx --yes fdeops log contact "…" --signal …`). Pick the signal from what they said - do not guess.

If this is a trust fire (ghosting, blocked access, sponsor disengaged): read `references/rescue.md` and follow it. If it is a process gap, name the missing step and the smallest unblock.

Playback the signal and next move. Confirm before any write to `.fde/`.

Done when: the contact is logged with a signal and you have a rescue or process next step the human agrees to.

Not for TypeScript errors, unit tests, refactors, or git commits - those stay in the host agent.
