---
name: testing-fieldbook
description: How to set up a sandboxed fdeops engagement and test the fde CLI + rendered Fieldbook HTML UI end-to-end (including privacy/<private> leak checks and before/after contrast against an older build).
---

# Testing the fdeops CLI and Fieldbook UI

fdeops is a zero-dependency, local-only Node CLI (`bin/fde.js`). Nothing to install beyond Node 20.
`npm run check` runs the invariant checker plus the unit tests.

## Sandbox everything

Never write into `~/fde-engagements`. Every command respects `FDEOPS_ENGAGEMENTS_ROOT`:

```bash
export FDEOPS_ENGAGEMENTS_ROOT=/tmp/fbrun/engagements
export F=/path/to/repo/bin/fde.js
mkdir -p /tmp/fbrun/{engagements,ws-a,ws-b,nowhere}
cd /tmp/fbrun/ws-a && node $F resume --init acme-corp   # binds THIS cwd to the engagement
```

A workspace must be bound (`resume --init`) before any write command works; run each engagement's
commands from its own bound scratch directory. `/tmp/fbrun/nowhere` stays unbound and is where you
test the "NO ENGAGEMENT" path (exit code 2).

## Populating a realistic engagement quickly

`fde debrief --smart <notes-file>` writes a proposal and prints the routing; `fde debrief --apply`
commits it. Prefixed lines route deterministically:

- `Decided: …` → `decisions.md`
- `Risk: …` → `risks.md`
- `Delivered: …` → `delivery.md`
- `Next: …` → `context.md ## Next action`
- everything else → `context.md` notes

Plain prose naming a person does **not** create a stakeholder. To drive per-person trust dots and the
overall trust color, use `fde log contact "Name (Role) - note" --signal green|amber|red`. Trust is
"worst active signal wins", so one red contact makes the whole engagement render `at risk`.
`fde log phase build` sets the phase badge (rendered as "Build & Guard").

## Rendering and viewing the UI

```bash
node $F dashboard        # -> $FDEOPS_ENGAGEMENTS_ROOT/fieldbook-current.html (bound engagement only)
node $F dashboard --all  # -> $FDEOPS_ENGAGEMENTS_ROOT/fieldbook.html (portfolio)
```

Open them in Chrome as `file:///tmp/fbrun/engagements/fieldbook-current.html`. The page is a static
render of `.fde/*.md` — every rendered value should be checkable against the markdown, so diff the
card against `grep -h '^- \[' .fde/{decisions,risks,delivery,stakeholders}.md`.

`fde dashboard --open` shells out to `xdg-open <plain path>`. In Devin sandboxes
`~/.local/bin/google-chrome` is a harness shim that URI-encodes its argument, so a plain path becomes
`%2Ftmp%2F…` and Chrome opens `about:blank`. That is an environment artifact, not a product bug —
verify by navigating to the `file:///` URL manually and note `--open` as untested.

## Privacy checks (highest-severity area)

`<private> … </private>` blocks in any `.fde/*.md` must be stripped from every model-facing read
(`stripPrivate`/`readClean` in `bin/fde.js`). To test:

```bash
for f in context risks stakeholders; do
  printf '\n<private>\nBank account for payout: 12345678\n</private>\n' >> $FDEOPS_ENGAGEMENTS_ROOT/<client>/.fde/$f.md
done
node $F dashboard && node $F dashboard --all
grep -c 12345678 $FDEOPS_ENGAGEMENTS_ROOT/fieldbook*.html            # expect 0
for c in "resume" "resume --full" "triage" "prep x" "status --all" "receipts" "garden" "doctor" "scan"; do
  printf '%-16s leaks: %s\n' "$c" "$(node $F $c 2>&1 | grep -c 12345678)"
done
```

Always confirm the secret **is** present in the raw markdown first, otherwise the test passes
vacuously. In Chrome check `view-source:file:///…` with Ctrl+F (0 matches) and also search
`private - redacted`, which is the replacement marker.

`fde redact <term>` previews matching lines; `--apply` deletes them and commits the memory ledger.
`fde log --undo` removes the last CLI-written log/debrief entry.

## Before/after contrast for a CLI-only diff

For PRs that only change CLI output, build the previous version as a worktree and run both binaries
side by side in a visible terminal — this is what makes a recording convincing:

```bash
git worktree add /tmp/fde-old HEAD~1
node /tmp/fde-old/bin/fde.js resume   # old behavior
node $F resume                        # new behavior
```

## Recording tips

The app under test is a CLI, so run the commands in a real terminal (`konsole --workdir <dir>`,
maximized with `wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz`) and switch to Chrome for
the HTML. Increase Konsole font with `ctrl+shift+equal` a few times before recording. Verify
`export` lines actually took effect (`echo $VAR`) — the first keystrokes sent to a freshly focused
Konsole window are sometimes dropped.

## Known non-bugs

- `fde doctor` exits 1 whenever it reports hygiene issues.
- The `[@…]` owner tag comes from the local git email, so it renders as the devin bot.
- `fde log contact` entries appear twice in the Fieldbook LOG panel (written to both
  `stakeholders.md ## Signal history` and `.fde/.signal-ledger`, read without de-duplication).

## Devin Secrets Needed

None — the CLI never reaches the network and requires no credentials.
