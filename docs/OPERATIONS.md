# fdeops operations guide

## One line

**You (human FDE)** bring judgment on site; **your AI coding agent** loads fdeops skills and `.fde/` memory on your laptop-under your control.

**Agent = AI software only.** See [README § Who this is for](../README.md#who-this-is-for).

## Golden rules

1. **fdeops runs on your machine** - not on servers or CI you do not operate.
2. **Default notes path:** `~/fde-engagements/<name>/.fde/` via `node bin/install.js init <name>` (or `npx fdeops init` when npm ≥ 3.0.0).
3. **Set `FDEOPS_ENGAGEMENT`** so every session finds the right engagement.
4. **Only `@fde`** - routing is automatic.
5. **Notes are confidential** - same care as work papers; never commit raw `.fde/` to shared git.

## First hour

```bash
node bin/install.js
node bin/install.js init <engagement-name>
```

Set `FDEOPS_ENGAGEMENT=~/fde-engagements/<engagement-name>/.fde`.

Work in your normal workspace. In the **AI chat**, type `@fde` with what is happening **now**.

## Multiple engagements

| Engagement | Memory | Work (examples) |
|------------|--------|-----------------|
| Project A | `~/fde-engagements/project-a/.fde/` | repo, VPN, or paired env |
| Project B | `~/fde-engagements/project-b/.fde/` | separate workspace |

Portfolio: tell `@fde` “show my portfolio” - it reads every engagement folder separately and generates the dashboard.

## Edge cases

| Situation | Action |
|-----------|--------|
| No code access yet | Land + discover; fill `brief.md`, `stakeholders.md` |
| Extra files forbidden in workspace | Notes only under `~/fde-engagements/` |
| Allowed `CLAUDE.md` in workspace | One line `FDEOPS_ENGAGEMENT=...` - no fdeops install in that environment |
| Taking over from someone else | Tell `@fde` you're taking over - it runs the audit method and writes ground truth into your `.fde/` |
| Trust problem vs outage | Say which in the `@fde` message |

## Maintainer

```bash
npm run check
```

[USAGE.md](./USAGE.md) · [schema.md](./schema.md)
