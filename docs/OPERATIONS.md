# fdeops operations guide

## One line

**You (human FDE)** bring judgment on site; **your AI coding agent** loads fdeops skills and `.fde/` memory on your laptop-under your control.

**Agent = AI software only.** See [README § Who this is for](../README.md#who-this-is-for).

## Golden rules

1. **fdeops runs on your machine** - not on servers or CI you do not operate.
2. **Default notes path:** `~/fde-engagements/<name>/.fde/`, created by `fde resume --init <name>`.
3. **Bind each workspace once** with `fde resume --init <name>` - the registry then resolves the right engagement for every session and hook automatically. (`FDEOPS_ENGAGEMENT` remains as an advanced override: [install.md](./install.md#advanced-fdeops_engagement-override).)
4. **Only `@fde`** - routing is automatic.
5. **Notes are confidential** - same care as work papers; never commit raw `.fde/` to shared git.

## First hour

Install from the [README Quick Start](../README.md#quick-start) (plugin or `npx skills add suboss87/fdeops --skill fde`). Then in chat:

```text
@fde this is Acme
```

That creates `~/fde-engagements/acme/.fde/` and binds this workspace. Terminal fallback: `npx fdeops resume --init <engagement-name>`. Air-gap disk copy: `node bin/install.js`.

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
| Extra files forbidden in workspace | Notes only under `~/fde-engagements/` - the registry binding lives outside the workspace, so nothing is added to their tree |
| Can't run `fde resume --init` in an environment | Set `FDEOPS_ENGAGEMENT=...` (env var or one line in an allowed `CLAUDE.md`) as the override |
| Taking over from someone else | Tell `@fde` you're taking over - it runs audit and writes ground truth into your `.fde/` |
| Trust problem vs outage | Say which in the `@fde` message |

## Maintainer

```bash
npm run check
```

[USAGE.md](./USAGE.md) · [schema.md](./schema.md)
