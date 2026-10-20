# Contributing

**fdeops is authored and maintained by [Subash Natarajan](https://github.com/suboss87).**

Help make client delivery easier to understand, verify, and hand over. The maintainer reviews and merges contributions; focused improvements from the community are welcome.

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

Skills should be **specific** (actionable steps), **verifiable** (a concrete artifact and evidence; confirmed `.fde/` updates when bound), and **minimal**. The `fde` CLI stays local-only.

Adversarial CLI notes (resolution, hooks, `<private>`, non-regular files) live in [`evals/testing-fieldbook.md`](evals/testing-fieldbook.md). That file is not a skill. Public skill entry points are generated from the canonical catalog.

**What we won't build:** SaaS sync; Slack/Notion/Granola **push** inside the CLI; CRM as core; hardware capture; unrelated general-purpose skill catalogs. You may **pull** via *your* MCP.

---

## Engagement stories

Share anonymized patterns via issues (not PRs to README):

*Engagement type - what happened - which `.fde/` file mattered (e.g. `reality.md`, `trust-profile.md`).*

The maintainer may add vetted stories to the README when appropriate.

---

## Local development and verification

Requires Node.js 18+ and Git. The core CLI has no package dependencies to install.

```bash
git clone https://github.com/suboss87/fdeops.git
cd fdeops
node bin/fde.js help
npm run check
```

`npm run check` runs structural/install checks and the Node regression suite. For a focused fix, first run the relevant file with `node --test test/<name>.test.js`, then run the full gate before opening a PR. Routing changes also need `npm run test:skill-routing`; live host/model evaluations have separate requirements documented in [evals/](evals/).

Keep changes in the existing [repository structure](docs/REPO_LAYOUT.md). Methodology belongs in `skills/fde/`; adapters point at it. Add a regression for a behavior bug, use fictional fixtures, and explain the user-visible result and commands you ran in your PR. Passing structural tests does not demonstrate host integration or customer acceptance: report untested paths explicitly.

The maintainer reviews and squash-merges releases. Do not add automatic AI-tool co-author trailers to commits. Preserve applicable license notices and contributor attribution.

## Releasing (maintainer)

The release workflow publishes to npm when a version tag is pushed, or when manually dispatched. Publishing is a separate maintainer action after review and passing checks.

1. Update `package.json`, `plugin.json`, `.claude-plugin/plugin.json`, and `mcp/fdeops-ingest/package.json` together, with `CHANGELOG.md`.
2. Run `npm run check` and review the release diff.
3. Merge the reviewed change to `Main`; tag that commit as `v<package-version>` and push the tag when ready to publish.

[The workflow](.github/workflows/release.yml) checks version agreement, runs the gate, refuses an already-published version, publishes with provenance through npm trusted publishing, and checks the registry result. The package's trusted publisher on npmjs.com must name this repository and `release.yml`; no long-lived npm token is stored.

---

## Security

Never commit `.fde/` or engagement exports. See [SECURITY.md](SECURITY.md).

---

## License

MIT. By contributing text you agree your contribution is licensed under MIT and may be edited by the maintainer.

### Task skill packaging

Author methods once under `skills/fde/references/`. Add or refine task entry metadata in `bin/skill-catalog.js`, then run `npm run generate:skills` to refresh task packages and the public catalog. Commit canonical changes and regenerated task directories under `skills/` together. `npm run check` verifies reference closure and freshness; isolated installation must work without sibling skills. Keep examples fictional and local evaluation traces outside Git.

Generation records ownership in each task package. Write mode removes obsolete owned output; check mode reports drift without writing. Unknown additions or modified obsolete files are preserved and reported for review. Do not hand-edit generated files or their ownership metadata.

Task UI metadata lives in `bin/skill-ui.js`; generated `agents/openai.yaml` files provide display text and starting prompts for Codex. They do not grant tools or change who can invoke a task. Keep the coordinator metadata in `skills/fde/agents/openai.yaml` consistent with its role.

### Writing a skill

Start with the situation that calls for the skill and the result the reader needs. Describe decisions and actions, not an idealised role. Use plain verbs and examples only where they resolve ambiguity.

- Keep the trigger specific enough to select this task over its neighbours. Missing evidence may change the next action; it should not hide a useful diagnostic skill.
- Use headings that help someone resume the work. A fixed sequence or hard gate needs a concrete reason.
- Keep shared authority and data rules in task context. Put task-specific failure handling in the method.
- Add a companion only when a reusable template, checklist or executable tool earns a separate file. Keep every required reference inside the installed package.
- State what completion establishes and what remains unproven. Use fictional examples; never turn a sample result into a performance claim.

Review a change in both modes: invoked directly with supplied context, and selected by `fde` during an engagement. Check that neither path repeats setup, invents authority or loses evidence.
