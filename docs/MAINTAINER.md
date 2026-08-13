# Maintainer notes (Subash Natarajan)

## GitHub contributors: maintainer only

GitHub adds bots when commits are **authored** by them or include:

```text
Co-authored-by: Cursor <cursoragent@cursor.com>
Co-authored-by: Devin AI <158243242+devin-ai-integration[bot]@users.noreply.github.com>
```

Squash-merge PRs as the maintainer (`suboss87`), not as the agent. Do not merge with Devin/Cursor as commit author.

### Prevent (every machine you commit from)

1. **Cursor:** disable “add co-author to commits” in Settings.
2. **Hook:**

```bash
cp scripts/git-hooks/commit-msg .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg
```

### Verify repo is clean

```bash
# Local Main - must print 0
git log Main --format='%an %ae %B' | grep -ciE 'devin-ai-integration|cursoragent|Co-authored-by:.*(Cursor|Devin)'

# Contributors API - should list only suboss87
gh api repos/suboss87/fdeops/contributors --jq '.[].login'
```

### If a bot still appears on Insights → Contributors

After a history rewrite + force-push, GitHub may show **“Crunching the latest data…”** for hours. Orphaned old SHAs (e.g. pre-rewrite tips) can linger on GitHub servers until garbage collection.

**Already done on `main`:** co-author trailers stripped from all reachable commits; force-pushed.

**If still visible after 72 hours** (hard refresh, incognito):

1. Confirm verify commands above return **0** / **suboss87 only**.
2. Open [GitHub Support](https://support.github.com/contact) → **Account and profile** or **Repositories** → ask to **recalculate the contributors graph** for `suboss87/fdeops` and remove leftover bot accounts from rewritten-away commits.

**Do not** accept new commits authored by Cursor Agent or Devin, or with their co-author trailers.

---

## Publish to npm (required for `npx fdeops@latest`)

Publish after every release so `npx fdeops` serves the current version (see `version` in package.json).

```bash
cd fdeops
npm run check
npm whoami                    # must be suboss87
npm view fdeops version        # note current
npm publish --access public
npm view fdeops version        # must match package.json
```

If publish fails with 401: `npm login` on the maintainer machine, then retry.

---

## Internal docs

Never link `docs/internal/` (especially `PMF_360_REVIEW.md`) from public README or marketplace.

---

## Pre-push

```bash
npm run check
```
