---
name: testing-fieldbook
description: How to set up a sandboxed fdeops engagement and test the fde CLI, the rendered Fieldbook HTML UI, and the fdeops-ingest MCP server / Agent Plugins packaging end-to-end (including privacy/<private> leak checks, official MCP SDK handshakes, npm tarball loads, and before/after contrast against an older build).
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

### Adversarial `<private>` cases that are worth trying every time

`stripPrivate()` is a pair of regexes over the literal string `<private>`, so a security control that
looks fine on well-formed input can fail **open**. Probe at minimum: well-formed, `<PRIVATE>` mixed
case, unclosed block (runs to EOF), **nested** blocks, `<private >` with a trailing space,
`<private attr="1">` with any attribute, a stray `</private>` with no opener, markers inline on a
`decision:`/`next:` line, secret inside an HTML comment, and two blocks on one line. Historically
nested/attribute/trailing-space/stray-closer variants leaked straight through `readClean()` (so
`resume` printed them); they may still. Verify each against **stdout AND stderr AND the MCP tool
result AND the rendered HTML**, and separately assert **no data loss** (the content must still be
retained sealed somewhere in `.fde/` after `--apply`).

Also test the case where the block's **interior lines carry routable prefixes**:

```
<private>
decision: pay the vendor via account 12345678
risk: account 12345678 is exposed in the runbook
</private>
```

Redaction that applies only to dry-run previews will collapse these to `(private - redacted)` while
`--apply` still routes the raw input, writing them **unsealed** into `decisions.md`/`risks.md` where
`readClean()` can no longer redact them — a leak plus a confirmation-contract divergence (what the
human approved is not what was written). Always diff the preview against what actually landed on disk.

Note `.fde/.debrief-propose` deliberately keeps the intact block and the CLI tells an agent to rewrite
that file with file tools, which conflicts with `AGENTS.md` ("do not load raw private blocks into a
model via file tools"). It is gitignored and removed after apply. Treat it as a possible leak vector.

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

## Testing the MCP server + Agent Plugins packaging

`mcp/fdeops-ingest/server.js` is a stdio MCP server exposing `ingest_stage`, `ingest_list`,
`ingest_propose`, `ingest_apply`, each shelling out to `bin/fde.js`. Root `plugin.json` + `mcp.json`
are the Agent Plugins 1.0.0 manifests.

**Use the official SDK, not a hand-rolled client** — a homemade probe can accidentally match the
server's own framing bugs:

```bash
mkdir -p /tmp/sdk-scratch && cd /tmp/sdk-scratch && npm i @modelcontextprotocol/sdk   # NEVER inside the repo
```

Require it from `/tmp/sdk-scratch/node_modules/@modelcontextprotocol/sdk/dist/cjs/client/{index,stdio}.js`.
Gotchas that will cost you time:

- `StdioClientTransport` filters the child env through `getDefaultEnvironment()`, so `PLUGIN_ROOT`,
  `PLUGIN_DATA` and `FDEOPS_ENGAGEMENTS_ROOT` **must** be passed explicitly in the transport `env`.
  That also matches what the spec requires of a real client.
- Act like a conformant client: read `mcp.json` yourself, expand `${PLUGIN_ROOT}`/`${PLUGIN_DATA}` in
  `args`, and set `cwd` to the plugin root (the spec default when `mcp.json` has no `cwd`).
- The negotiated protocol version is not exposed on the transport object; a successful `initialize`
  against the server's `PROTOCOL_VERSION` (`2024-11-05`) is the evidence instead.
- The server needs a **bound engagement**; otherwise every tool returns `status: 2`
  `no engagement - run: fde resume --init <name>`. Bind first, and pass `FDEOPS_ENGAGEMENT`
  (`<root>/<client>/.fde`) plus `FDEOPS_ENGAGEMENTS_ROOT` in the transport env.
- MCP tool output is CLI text wrapped in JSON **inside** `result.content[0].text` — `JSON.parse` that
  string and read `payload.stdout`, don't regex the outer blob or you will capture escaped `\n`.

Framing edge cases worth covering on a raw pipe (spec: newline-delimited, no embedded newlines):
several messages in one write, a message split mid-object across two writes, blank lines, a
`Content-Length`-framed message followed by a newline-framed one in the same buffer, a garbage
non-JSON line (must be skipped without crashing), and a very large payload. Assert **stdout hygiene**:
every non-empty stdout line must be valid JSON-RPC, since one stray log line corrupts the stream.

`bin/fde.js` caps ingest at `DEBRIEF_MAX_BYTES` (256 KiB), so a 2 MB payload is *correctly* refused with
a structured tool error — that is not truncation. Prove the transport separately with a ~250 KiB payload
containing many embedded newlines and check the staged file is byte-complete on disk.

Packaging is the case most likely to be silently broken — always load from the **tarball**, not the checkout:

```bash
npm pack --pack-destination /tmp/ap-pack && tar xzf /tmp/ap-pack/fdeops-*.tgz -C /tmp/ap-pack/extracted
```

Then point `PLUGIN_ROOT` at `/tmp/ap-pack/extracted/package` and handshake. Check `plugin.json`,
`mcp.json`, `mcp/fdeops-ingest/server.js`, **`mcp/fdeops-ingest/package.json`** (server.js requires it
for its version, so a missing file crashes on spawn), `skills/fde/SKILL.md`, and no `node_modules`.
Also run one real tool call so you prove the tarball's own `bin/fde.js` resolves.

Validate the manifests by hand against the schemas, reading the expected constants **out of the schema
files** rather than hardcoding them:

```bash
curl -sO https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
curl -sO https://agent-plugins.org/schemas/1.0.0/mcp.schema.json
```

Both are `additionalProperties: false`; `mcp.json` may hold only `$schema` + `mcpServers`; a stdio server
requires `type` + `command`, `command` must be a single token, `args` must not be absolute, `env` must not
declare the reserved `PLUGIN_ROOT`/`PLUGIN_DATA`, and `cwd` must be plugin-relative.

To prove a transport fix actually matters, run the same official-SDK probe against a base worktree
(`git worktree add /tmp/ap-old <base-sha>`). The pre-fix LSP/`Content-Length`-output server never
completes a newline-framed handshake and **times out** — wrap it in `timeout 10` and treat exit 124 as
the expected "before" result. The base worktree has no root `mcp.json`, so point the probe directly at
`/tmp/ap-old/mcp/fdeops-ingest/server.js`; the transport, not the manifest, is what is under test.

To confirm a guard test really guards, revert the fix in a **throwaway clone** (never the worktree),
run `node --test test/fde-cli.test.js`, check exactly the expected tests fail, then restore and verify
`git status --porcelain` is empty.

## Privacy: two-surface rule and the sealed-block sidecar

Privacy has **two independent surfaces** and a fix can pass one while regressing the other. Always check both:

1. the **model-facing preview** — `debrief --smart` / `debrief --dry-run` stdout+stderr and the
   `ingest_propose` MCP tool result, plus the agent-facing `.fde/.debrief-propose` file;
2. the **read surfaces after apply** — `resume`, `resume --full`, `triage`, `prep`, `status --all`,
   `receipts`, `garden`, `doctor`, `scan`, and both rendered HTML files.

If the code has both a `splitPrivate()` (returns `{clean, blocks}`, used for routing/proposal) and a
`stripPrivate()` (wraps it and additionally does things like
`.replace(/<!--[\s\S]*?-->/g,'')`), then **anything only `stripPrivate()` removes will leak in the
preview** while looking clean in `resume`/dashboard. HTML comments are the concrete case that has
regressed this way. Diff the two functions and test every transform that exists in only one of them.

Always pair a leak check with a **data-retention** check — redaction that deletes the content is also a
bug. After `--apply`, the block must still exist verbatim inside `<private>…</private>` in
`.fde/context.md` while every surface above reports 0 hits, and the apply summary should say
`… , 1 sealed private note`. A missing "sealed private note" count in that summary is the tell for
silent data loss.

When sealed blocks are held in a `.debrief-private` sidecar, attack the **half-states**, not just the
happy path: delete the sidecar between propose and apply, corrupt it, and make it a symlink. A symlink
should be refused fail-closed (target untouched), but check whether `.debrief-propose` and a stale
`.debrief-private.lock` are still left behind — if they are, the next `--apply` can succeed and silently
drop the note. Also verify the sidecar is mode `0600`, gitignored, untracked, and produces no
`doctor`/`triage`/`status` dirty-state noise.

Tag-scanner cases that should each be checked explicitly: mixed case `<PRIVATE>`, attributes
(`<private data-x="1">`), trailing space `<private >`, unclosed (seals to EOF), nested (seals to the
outermost close), a tag split across lines, `<private/>`, deep nesting (500 levels — assert it does not
hang), routable prefixes such as `decision:`/`next:`/`[signal:red]` *inside* a block (must not route),
and `<privateer>`-style names that must **not** seal. A stray unmatched `</private>` keeping later text
public is a deliberate design choice — confirm intent with the lead instead of filing it as a leak.

### Unclosed blocks can permanently poison `context.md` — always count tags

An unclosed `<private>` is returned by the scanner *verbatim*, so persisting it can leave a dangling
opener in `.fde/context.md`. Everything appended afterwards (later `## Debrief`, `## Session end`
capture, `preserve`) is then swallowed and rendered `(private - redacted)` **forever** — data loss with
no leak, so leak-only greps miss it entirely. After any apply that sealed a block, assert:

```bash
P=$ROOT/<client>/.fde/context.md
echo "opens=$(grep -o '<private\b[^>]*>' $P|wc -l) closes=$(grep -o '</private\b[^>]*>' $P|wc -l)"  # must match
printf '\n## Session end\n- POISON-CANARY\n' >> $P
node $F resume --full | grep -c POISON-CANARY   # must be 1
```

Normalization that appends a closer based on a **suffix test** ("does the block end in `</private>`?")
is not enough: one note can hold N unclosed openers in a single block and needs N closers. Test
**multiple** unclosed openers (2 and 5), unclosed-inside-unclosed, and a stray closer first (the count
must not go negative). Separately assert that already-closed blocks — including `</private >`,
`</PRIVATE>` and attributed closers — do **not** gain a duplicate closer. Drive the same unclosed input
through `ingest_stage` over MCP as well as a file, and through an agent-rewritten `.debrief-propose`.

**The dashboard is not a valid poisoning canary.** It never renders `## Session end` content at all —
verify against a no-private control engagement before concluding the dashboard "lost" a note.
`resume --full` and `prep` are the correct canary surfaces.

### Never assert "content is visible" without a control — surfaces are selective

Most "the note disappeared!" results are the harness picking a surface that never renders that content.
Measured behavior worth knowing before you file a bug:

| content | renders on | does NOT render on |
|---|---|---|
| `decisions.md` / `risks.md` log bullets | `prep`, dashboard LOG rows | `resume --full`, `fde log`, `triage`, `status --all` |
| `context.md` `## Current state` bullets | `resume --full` | `prep` |
| any `context.md` section | dashboard shows **only the first bullet** | later bullets in the same section |
| `## Session end` / appended `## Debrief` | `resume --full` | dashboard |

So write visibility checks **differentially** against a control engagement built identically but without
the construct under test, and fail only on surfaces where the control renders the needle:

```bash
rendersOn() { ... }              # collect surfaces showing $needle
hidden = rendersOn(control) - rendersOn(test)   # non-empty => real bug
```

Also assert the control renders the needle *somewhere* — otherwise the test is vacuous. Append canaries
into `## Current state` (a rendered section), not blindly to the end of the file. The strongest evidence
is a **before/after contrast**: `git worktree add /tmp/old <pre-fix-sha>` and run the identical scenario
on both builds; the pre-fix build must reproduce the hiding, the new one must not.

### Read-path vs write-path scoping (`splitPrivate(md, opts)`)

`splitPrivate()` is used for BOTH persisted-memory reads (`stripPrivate`/`readClean`) and fresh untrusted
input (`writeProposal`/`routeDebriefInput`). Sealing behavior that is right for untrusted input is wrong
for stored memory: sealing a dangling `<!--` to EOF on the read path means one stray `<!--` already in
`decisions.md` (easily landed via `fde log`, which only does `stripControlChars`) hides every later note
from every read surface. Test both directions independently — stored-memory dangling `<!--` must NOT hide
later notes, while a dangling `<!--` in fresh input MUST still seal so its tail never reaches
preview/routing/MCP results. Terminated comments must be stripped on both paths.

### Receipt-based sealed-block accounting (`.debrief-seal`)

Apply-time fail-closed checks that key off **marker text** (`(private - redacted)` present in the propose
file) false-positive on real notes that legitimately contain that string. The sturdier design writes a
receipt (`.debrief-seal` = `blocks.length`) at propose time and refuses when
`expected !== null && sealed.length < expected`, falling back to the marker heuristic only when there is
no receipt. Things to test beyond plain sidecar loss:

- notes whose real content contains the literal `(private - redacted)` and no private block → must apply
  cleanly, receipt `0`, no sidecar created
- receipt **and** sidecar both deleted → must still refuse via the marker fallback
- receipt says `2` but only 1 block survives in the sidecar → must refuse (catches *partial* loss)
- receipt zeroed / non-numeric / negative / absurdly high, sidecar intact → must never
  apply-and-drop; either apply keeping the note, or refuse
- **stale receipt** from an abandoned propose, then a new propose with no private content → receipt must
  be reset to `0` and the stale sidecar removed, not reused (otherwise a phantom refusal forever)
- receipt removed after a successful apply; present in `MEMORY_EPHEMERAL` + the memory `.gitignore`;
  never in `git status`, never tracked, and no manual-tamper/dirty-state noise in `doctor`/`triage`/`status`

Run every sidecar/receipt variant through **both** `debrief --apply` and `ingest apply` — they are
separate code paths. Assert three things per case: nonzero exit with an explicit `refused:` message,
memory files byte-identical to before (checksum), and zero secret occurrences in the output.

### Sidecar file modes

A secret file must never exist world-readable even momentarily, so test under a **permissive umask**
(`umask 0000`), not the default: `( umask 0000; node $F debrief --smart notes.md )`, then assert
`.debrief-private` is `600`. To catch a temp-file window, poll the `.fde` dir on a tight
`setInterval(..., 0)` for any `debrief-private*` entry whose mode has `& 0o077` set while the write
runs; use a payload large enough to widen the window but **under** `DEBRIEF_MAX_BYTES` (256 KiB) or the
propose is refused and the test goes vacuous. When an `opts.mode` option is added to a shared
`atomicWriteFile`, also assert it did **not** tighten unrelated callers — `.owner`, `.last-write`,
`.debrief-propose` and the memory `*.md` files should all stay `644` — and that no `.tmp` files leak.

Always include a **control** assertion: the secret must really be present in the raw `.inbox/` staged
file or source markdown. Without it a passing privacy test may just be vacuous. Likewise, render the
dashboard *before* grepping it — asserting against a 0-byte HTML file silently "passes".

## Recording tips

If no terminal emulator is installed, Dolphin's built-in terminal panel works: launch Dolphin from the
taskbar, press **F4**, and maximize with
`wmctrl -r "Home — Dolphin" -b add,maximized_vert,maximized_horz`. Put the demo in a shell script and
run `clear; bash /tmp/<demo>.sh` so the output is self-explanatory on screen, then `zoom` into the panel
region for a legible screenshot.

The app under test is a CLI, so run the commands in a real terminal (`konsole --workdir <dir>`,
maximized with `wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz`) and switch to Chrome for
the HTML. Increase Konsole font with `ctrl+shift+equal` a few times before recording. Verify
`export` lines actually took effect (`echo $VAR`) — the first keystrokes sent to a freshly focused
Konsole window are sometimes dropped.

## Testing `fde demo` (the adoption showcase)

`fde demo` wipes and rebuilds `$FDEOPS_ENGAGEMENTS_ROOT/.demo`, runs 10 real CLI steps as
subprocesses with its own root/registry, and seeds a `<private>` block on purpose. It is fast
(~0.4 s), so a 60 s claim has huge margin — time it anyway with `date +%s.%N` since `/usr/bin/time`
is **not installed** in this sandbox.

Isolation rests on dot-prefix skipping (`bin/fde.js` resume-`existing:`, status and dashboard
portfolio walks all `continue` on names starting with `.`). Test it with a **decoy real engagement**
in the same root, and assert both directions: `.demo` absent *and* the decoy present (a positive
control), plus decoy + `.registry` byte-identical via `find … | xargs md5sum | md5sum` before/after
both the demo and `--clean`.

Environment matrix that has caught real bugs: spaced `HOME` **and** spaced
`FDEOPS_ENGAGEMENTS_ROOT` (any path scraped from stdout with a `\S+` regex truncates at the space —
assert the printed path actually `-f` exists), `FDEOPS_ENGAGEMENT` exported to a real engagement,
overridden root (assert nothing lands under the default HOME root), piped output (0 ANSI), `NO_COLOR`
on a forced TTY via `script -qc` (control: escapes *do* appear without it), read-only HOME, inside
and outside a git repo (assert the surrounding repo gains no commits/dirt), and the
`node bin/install.js demo` passthrough (assert the installer banner is absent).

Raw `git -C .fde log -p` inside the demo **does** contain the seeded secret — the sealed block is
committed like any engagement's. That is expected; assert instead that no `fde` command surfaces it.

## Testing the installer's ownership guard (`bin/install.js`)

Run every case as `HOME=$(mktemp -d) node bin/install.js` — `os.homedir()` honours `$HOME`, so
`~/.claude` is disposable. Assert on the **contents** of the user's files (`md5sum`), not installer
chatter.

The guard has two independent halves and they fail differently:
- `isManaged()` (the `.fdeops-managed` marker) gates **deletion** of legacy dirs — this is the robust half.
- `wasInstalledByUs()` gates **overwrite** via the "adopt" path. It must be anchored on the shipped
  frontmatter (`^description: Engagement fieldbook for Forward Deployed Engineers`), not a bare
  `/fdeops/i` substring — a loose fingerprint lets any prose mentioning fdeops authorize
  overwriting a user's dir. Probe the whole shape matrix, since only some should adopt: genuine
  frontmatter (adopt), the phrase in the **body** only (do not), no frontmatter at all (do not),
  the phrase **mid-value** rather than at the start (do not), a different phrase (do not), and a
  case-variant (adopts, if the regex is `/i`).

Highest-value probe: make `~/.claude/skills/fde` a **symlink** into a dir outside `~/.claude` and
put a sentinel in the target. `copyDir()` is `mkdirSync` + `copyFileSync`, so without an `lstat`
guard the adopt path (and `--force`) writes **through** the link and destroys user data outside
`~/.claude`, planting `.fdeops-managed` there too. Once a guard exists, test every symlink shape —
they take different code paths: link to a **directory**, link to a **regular file**, a **dangling**
link (only `lstat` sees it; `existsSync` is false), a link whose target is **inside**
`~/.claude/skills`, and a **legacy-named** link (that one goes through `removeLegacySkills`, not
`installSkillDirs`). Each must hold **with and without `--force`** — `--force` is permission to take
over a location, not to follow it elsewhere. Close with containment assertions rather than trusting
the skip message:

```bash
find "$HOME" -name .fdeops-managed -not -path '*/.claude/*' | wc -l          # expect 0
find "$HOME" -path '*references/*.md' -not -path '*/.claude/*' | wc -l       # expect 0
```

**Permission failures and partial writes.** A `chmod 500` skill dir must produce a human message
(`permission denied at <path>`), no stack-trace frames, a non-zero exit, and the *rest* of the
install must still land — assert `~/.claude/hooks` exists afterwards, since the round-4 bug aborted
midway. Test the read-only **parent** (`~/.claude/skills` itself) as a separate case.

Beware a false-negative harness here: `chmod 500` on a `references/` dir that already contains all
the shipped files does **not** fail, because `copyFileSync` rewrites *existing* files (mode 644)
without needing directory write permission. To force a genuine mid-copy failure you must make
`copyDir` **create** an entry: delete one reference file *and* make the dir read-only. Then check
whether `SKILL.md` (copied before the nested dir) was already replaced — with no staging+rename it
will be, leaving a loadable-but-inconsistent skill whose `SKILL.md` points at a missing reference.
That is acceptable only if it is reported, exits non-zero, and the retained marker lets a re-run
fully repair the tree (`diff -rq skills/fde <dest> --exclude=.fdeops-managed`) — assert all three.

## Auditing a docs-vs-code "claims gate" in `bin/check.js`

Don't trust a gate because the well-formed tamper fails it. Tamper in a throwaway copy
(`cp -r` the worktree) so the branch stays clean, apply one mutation at a time, and revert between.
Bypasses found in practice, all worth re-testing after any gate change:

- **Table-cell regex anchoring.** The routing parser required the Reference cell to *begin* with
  `` `references/… ``; a row with prose before the path is silently unparsed. A routed+undocumented
  method then passes CI. The tell is a **count mismatch in the OK line itself** ("37 documented,
  36 routed") — if the gate's own success message is internally inconsistent, the parse is broken,
  and production content already exercises the bug.
- **`Set` de-duplication** hides duplicated rows (`.size` unchanged).
- **One-directional subset checks** (`routed ⊆ documented`) let docs advertise a method that is not
  routed at all.
- **First-match count regexes** (`body.match(/(\d+)\s+methods/)`) can be satisfied by an earlier
  sentence while the real headline claim stays wrong. Use `matchAll` and check every occurrence.
- **Any row shape the selector cannot read is a silent skip unless it is a hard failure.** After a
  parser is tightened to require e.g. a backticked `` `references/<name>.md` ``, the *next* bypass is
  the same claim written another legal way — a markdown link (`[x](../skills/fde/references/x.md)`)
  instead of backticks. The row is skipped, so a routed+undocumented method passes. A gate that
  hard-fails an unreadable method cell but silently skips an unreadable *reference* cell is only
  half fail-closed. Test both cells.
- **Link targets are usually never validated, only link text.** Two mutations that typically pass:
  a documented row pointing at a reference file that does not exist (docs ship a 404), and a row
  whose link text and target disagree (`[land](.../close.md)`). The set reconciliation compares
  names, not destinations.
- **`\bname\b` presence checks can be satisfied by a *different* method's name**, because `-` is a
  word boundary: `\bingest\b` matches inside `ingest-connect`, `\bbuild\b` inside
  `incremental-build`, `\baudit\b` inside `assumption-audit`. So a method can disappear from the
  overview doc while the gate still says every method is listed. Enumerate the affected pairs
  programmatically (for each method, does any *other* method name match `\bm\b`?) rather than
  guessing, and isolate the mutation surgically — delete only the standalone token and assert the
  masking sibling is still present, or you will delete the sibling too and get a misleading FAIL.
  Fix shape: match a delimited token, `(?<![\w-])name(?![\w-])`.
- **Rows the candidate selector never even considers.** If candidate routing rows are selected on
  the presence of `references/<name>.md`, then a row naming a method with **no reference at all**,
  or a row **split across two physical lines** (line-based parser), is neither routed nor required
  to be documented — it escapes silently. Hardening the *shape* of recognised rows cannot fix this;
  only a **row-count assertion** can: count table rows in the routing section and require that
  number to equal `routed.size`, so any row with a method-shaped cell but no readable reference is
  a hard error. Test both shapes after any selector change.
- **Distinguish "fails closed" from "fails with a useful message".** Malformed documented-link
  targets (`#fragment`, a directory, a trailing slash after `.md`, a different relative prefix, an
  absolute path, wrong casing) all correctly exit 1 — but *indirectly*, because the row stops being
  recognised as documented and the count/set checks fire instead. The author sees "36 are
  documented", not "your link is malformed". Safe, but record it as a diagnostics gap.
- **A count-claim regex only governs the shape it matches.** `N methods` checks miss a reworded
  headline (`36 field methods` → caught only because *no* claim parses) and miss counts spelled out
  in words (`thirty-six methods` → silently allowed alongside a correct digit claim).

When isolating "is method X detected", make sure an *unrelated* gate isn't producing the failure —
e.g. a missing `references/<name>.md` file fails first and masks the claims gate. Copy an existing
reference file into place so only the gate under test can fail.

**Always verify the mutation actually applied before believing a PASS.** A gate "bypass" is far more
often a broken mutation. Two traps that produced false passes here: a method whose routing row
appears **twice** (`review`, `ship`, `status`, `ingest`… do), so deleting "the" row leaves it still
routed — check `grep -c` first and pick a single-occurrence method; and inserting a row *before* a
section anchor like `**Overlays` when the intent was *after* it (the section is split on that
string, so "before" keeps the row inside the routing table). Print a one-line proof of the mutated
state next to each verdict. Also reset with `git reset --hard && git clean -fd`, not
`git checkout -- .`: a mutation using `git mv` stages a rename that `checkout -- .` will not undo,
silently contaminating every later case.

A corollary: if the line that prints the mutation proof itself errors (e.g. a quoting/f-string
bug in the harness), the case is **not** a result — the proof printed a traceback, not evidence.
Re-derive that case with a separately verified mutation before recording any verdict.

## Cross-branch merge checks

Clone `--shared` into `/tmp`, reset to `origin/Main`, then merge each branch. Note that this repo
uses **diff3** conflict style: a naive union resolution must drop the `|||||||`-to-`=======` base
section too, or the file keeps a stray marker and `npm run check` fails as *your* artifact, not the
product's. Verify a resolution with `node --check <file>` before running the suite. Branches that
both append tests to the end of `test/fde-cli.test.js` conflict textually with no semantic overlap.

**Never conclude "all N branches merge green" from a passing `npm run check` alone.** If a conflict
resolution is left uncommitted (e.g. the commit is rejected for a missing `-m`), git refuses the
*next* merge and the tree silently contains only a subset — while still passing every check. Prove
membership explicitly, then prove each PR's payload is present by content:

```bash
for p in pr-a pr-b pr-c pr-d; do
  echo "$p ancestor: $(git merge-base --is-ancestor $p HEAD && echo YES || echo NO)"
done
git status --porcelain | wc -l      # must be 0 before you trust any result
```

Finish with a runtime pass on the merged tree, not just the suite: the argv-filtering of one branch
can swallow another's subcommand (`node bin/install.js demo` must still reach the demo), and the
privacy control should be re-asserted (secret 0 in rendered HTML, 1 on disk).

## Known non-bugs

- `fde doctor` exits 1 whenever it reports hygiene issues.
- The `[@…]` owner tag comes from the local git email, so it renders as the devin bot.
- `fde log contact` entries appear twice in the Fieldbook LOG panel (written to both
  `stakeholders.md ## Signal history` and `.fde/.signal-ledger`, read without de-duplication).
- `dashboard --open` cannot be verified in this sandbox: the `~/.local/bin/google-chrome` shim
  URI-encodes its argument, so the plain path handed to `xdg-open` becomes `%2Ftmp%2F…` and Chrome
  lands on `about:blank`. Open the `file:///…` URL manually instead and mark `--open` untested.
- That same shim is **not a launcher**: it only `curl`s a CDP port, so once the browser is closed it
  cannot start one (`Failed to connect to localhost port 29229`). Relaunch the real binary directly,
  e.g. `/opt/.devin/chrome/chrome/linux-*/chrome-linux64/chrome --remote-debugging-port=29229
  --user-data-dir=/tmp/<x> "file:///…"`, then focus and maximize with `wmctrl -a <title>` +
  `wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz`. Avoid `ctrl+w` while testing the
  Fieldbook — it closes the last tab and kills the whole window.
- Sandbox restarts can wipe `/tmp`, destroying harnesses and reports mid-run while leaving the git
  worktrees intact. Keep harnesses regenerable from the report, and re-verify artifact paths still
  exist before citing them.
- Fieldbook panels such as `TRUST PROFILE` are collapsed `<details>` elements, so the
  `(private - redacted)` marker is not on screen until you click the `<summary>`. Click it rather
  than reading the DOM, and prove non-vacuity on screen with in-page search: secret `0/0` **and**
  marker `1/1`.
- `debrief --smart` takes a **file path**, not inline text. Passing notes as a positional string fails
  with `cannot read <text>` — write the notes to a file first.
- `fde receipts <term>` echoes the search term back in its "no record of …" message, so grepping its
  output for the secret you searched for yields a false positive. Search a **neutral** term instead.
- Harness trap: `grep -c` **exits 1 when the count is 0**, so `cnt(){ grep -c X f || echo 0; }` emits
  `"0\n0"` and makes every genuinely-passing leak assertion print as FAIL. Use
  `n=$(grep -c X f); echo ${n:-0}` instead. Suspect your harness first when a large block of privacy
  assertions "fails" with a want/got that look identical.
- An unterminated `<!--` seals to EOF just like an unclosed `<private>`, so a stray `<!--` mid-note
  silently drops the rest of that note from routing. Intended fail-safe; note it, don't file it.
- Notes containing the literal text `(private - redacted)` with no sidecar trigger the fail-closed
  apply refusal. Intended, but a confusing false positive worth flagging.
- `StdioClientTransport` filters the environment, so `PLUGIN_ROOT`, `PLUGIN_DATA`,
  `FDEOPS_ENGAGEMENTS_ROOT` and `FDEOPS_ENGAGEMENT` must be passed explicitly in its `env`. It also does
  not expose the negotiated protocol version — a successful `initialize` is the practical evidence.

## Devin Secrets Needed

None — the CLI never reaches the network and requires no credentials.
