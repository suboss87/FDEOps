# Contributing

**fdeops is authored and maintained by [Subash Natarajan](https://github.com/suboss87).**

This repository reflects one operator’s field kit - open-sourced for other FDEs to use, not a multi-maintainer framework with delegated merge rights.

---

## How to help

| Channel | Use for |
|---------|---------|
| [GitHub Issues](https://github.com/suboss87/fdeops/issues) | Bugs, gaps (“situation X isn’t covered”), anonymized patterns that worked |
| [Discussions](https://github.com/suboss87/fdeops/discussions) | Questions about fit on an engagement type, workflow ideas, show-and-tell |

Participation is covered by the [Code of Conduct](CODE_OF_CONDUCT.md). **Do not** open PRs or issues with client-identifying data, `.fde/` exports, or screenshots containing real names.

---

## Pull requests

Skill and doc changes are **reviewed and merged by the maintainer only**. If you have a concrete improvement:

1. Open an issue first - one paragraph on the on-site situation.
2. Wait for alignment before spending time on a large PR.

Skills should be **specific** (actionable steps), **verifiable** (an artifact in `.fde/`), and **minimal**. The `fde` CLI stays local-only.

Adversarial CLI notes (resolution, hooks, `<private>`, non-regular files) live in [`evals/testing-fieldbook.md`](evals/testing-fieldbook.md). That file is not a skill - do not add a second `SKILL.md`.

**What we won't build:** SaaS sync; Slack/Notion/Granola **push** inside the CLI; CRM as core; hardware capture; generic code-craft packs. You may **pull** via *your* MCP.

---

## Engagement stories

Share anonymized patterns via issues (not PRs to README):

*Engagement type - what happened - which `.fde/` file mattered (e.g. `reality.md`, `trust-profile.md`).*

The maintainer may add vetted stories to the README when appropriate.

---

## Releasing (maintainer)

Publishing is a tag, so the bytes on npm always map to a commit:

```bash
# 1. bump the four version manifests + CHANGELOG in a PR, merge it
# 2. from merged Main:
git pull && git tag v3.11.0 && git push origin v3.11.0
```

`.github/workflows/release.yml` then runs `npm run check`, refuses a tag that
disagrees with `package.json` or a version already on the registry, publishes
with provenance, and confirms the registry serves it. It needs one repository
secret, `NPM_TOKEN` (an npm **Automation** token - granular, read+write, scoped
to `fdeops`; automation tokens bypass 2FA, which is why CI can use one).

The four manifests that must agree: `package.json`, `plugin.json`,
`.claude-plugin/plugin.json`, `mcp/fdeops-ingest/package.json` - `npm run check`
enforces this.

---

## Security

Never commit `.fde/` or engagement exports. See [SECURITY.md](SECURITY.md).

---

## License

MIT. By contributing text you agree your contribution is licensed under MIT and may be edited by the maintainer.
