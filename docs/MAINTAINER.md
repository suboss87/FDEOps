# Maintainer notes (Subash Natarajan)

## GitHub contributors: remove `cursoragent`

GitHub adds **cursoragent** when commits include:

```text
Co-authored-by: Cursor <cursoragent@cursor.com>
```

### Prevent (every machine you commit from)

1. **Cursor:** disable “add co-author to commits” in Settings.
2. **Hook:**

```bash
cp scripts/git-hooks/commit-msg .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg
```

### Verify repo is clean

```bash
# Local main - must print 0
git log main --format='%B' | grep -ci 'co-authored-by:.*cursor'

# GitHub main (last 100) - must print 0
gh api 'repos/suboss87/fdeops/commits?sha=main&per_page=100' \
  --jq '[.[] | select(.commit.message | test("Co-authored-by: Cursor"; "i"))] | length'

# Contributors API - should list only suboss87
gh api repos/suboss87/fdeops/contributors --jq '.[].login'
```

### If `cursoragent` still appears on Insights → Contributors

After a history rewrite + force-push, GitHub may show **“Crunching the latest data…”** for hours. Orphaned old SHAs (e.g. pre-rewrite tips) can linger on GitHub servers until garbage collection.

**Already done on `main`:** co-author trailers stripped from all reachable commits; force-pushed.

**If still visible after 72 hours** (hard refresh, incognito):

1. Confirm verify commands above return **0** / **suboss87 only**.
2. Open [GitHub Support](https://support.github.com/contact) → **Account and profile** or **Repositories** → ask to **recalculate the contributors graph** for `suboss87/fdeops` and remove **cursoragent** (bot co-author from rewritten-away commits no longer on `main`).

**Do not** accept new commits from Cursor Agent with co-author trailers.

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
