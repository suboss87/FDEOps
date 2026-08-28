# Skill routing pack

Cheap eval for `@fde` (inspired by “don’t ship skills without evals”).

| Layer | What it proves |
|-------|----------------|
| `node evals/skill-routing/check.js` | Happy prompts still have a documented `fde …` route in `SKILL.md` |
| Live trial (you + agent) | Negatives don’t pull engagement methods; happies run the right CLI |

CLI unit tests (`npm test`) remain the product bar. This only grades the skill.

## Run

```bash
node evals/skill-routing/check.js          # SKILL.md contract
node evals/skill-routing/live-smoke.js     # real fde happy-path CLI smoke
npm run test:skill-routing                 # both
```

Latest automated + agent trial notes: [RESULTS.md](RESULTS.md).

## Live trial (15-20 min)

1. Bind a throwaway engagement in a scratch repo.
2. Paste each HAPPY prompt with `@fde` - agent should run the listed CLI (or equivalent), not hand you the command.
3. Paste each NEG prompt **without** forcing `@fde` - agent should code, not load `land.md` / run `fde doctor`.
4. Note fails in an issue or beside the case id. Fix SKILL.md, re-run.

Do **not** block merges on LLM-as-judge. Re-run the live pack when you change the routing table or CLI verbs.
