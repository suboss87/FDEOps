# Testing the fdeops CLI

Contributor notes for adversarially testing `bin/fde.js`, engagement resolution, `bin/check.js` session gates, the hooks, and the `<private>` redaction boundary. Sandboxed so no user-owned engagement data is touched. Local-only, no network, no credentials.

This is not an installable skill. The public tree ships one skill: `skills/fde/`.

## Sandbox harness (use for every case)

```bash
H=$(mktemp -d); ROOT="$H/fde-engagements"
HOME="$H" FDEOPS_ENGAGEMENTS_ROOT="$ROOT" node bin/fde.js resume --init client-a
```

Rules learned the hard way:

- **Create decoy fixtures FIRST.** The absence of a directory proves nothing. Always make a
  second engagement (`client-b`) plus a `realclient` decoy and a `.registry` binding, then compare
  sorted `sha256sum` manifests of every non-target engagement before/after. A case passes only if
  every engagement the operator did not name is byte-identical.
- `fde doctor` **exits 1 by design** when it finds hygiene issues. Never treat nonzero doctor as a
  test failure by itself.
- Strip ANSI before grepping output; colored prompts/markers silently break naive greps.
- `npm run check` runs gates **and** tests; `npm test` alone runs only tests.
- Regression floor: v3.10.3 → 97/97; v3.10.4 → **103/103**, then **107/107** once the non-regular
  and slug guards landed. `npm run check` exit 0. Check the current floor rather than assuming.
- **Wrap every single CLI/hook invocation in `timeout 15` regardless.** Non-regular-file shapes have
  repeatedly re-introduced blocking reads/writes; without `timeout` the whole matrix stalls instead
  of reporting exit 124, and a regression here is invisible.

## Engagement resolution — the part most likely to be wrong

`resolveEngagement()` in `bin/fde.js` tries, in order: the env var
(`FDEOPS_ENGAGEMENT`, then legacy `FDEOS_ENGAGEMENT`) → registry bind → project `CLAUDE.md` line →
`~/.claude/FDEOPS-CLAUDE.md` pointer → folder-name match → in-repo `.fde/`.

When testing "an unhonorable env var must refuse rather than file under another client":

- Arm **all five** fallback strategies simultaneously, otherwise a refusal proves nothing.
- Use a slug that genuinely cannot resolve (e.g. `client-zzz`). A *valid* bare slug like `client-a`
  resolves under `FDEOPS_ENGAGEMENTS_ROOT` by design and is not a fall-through.
- Cover writes (`log …`, `debrief --apply`, `capture`, `preserve`, `owner set`) **and** reads
  (`resume`, `triage`, `prep`, `receipts`, `status`, `dashboard`) — and assert the other client's
  text never appears in stdout, not just that exit is nonzero.
- Since v3.10.4 the env value is **classified up front**: absolute → path forms only; bare slug →
  `<root>/<slug>/.fde` only; anything relative (contains a separator or starts with `.`) → refused
  with `must be an absolute path or a bare engagement slug`. Verify `..`, `../..`, `./x`, `a/b`, `.`
  all refuse in **both** the CLI and the hooks.
- **Absolute out-of-root paths are still accepted by design** (the in-repo `.fde/` strategy needs
  it). So judge *relative/traversal* escapes as bugs and absolute ones as documented — but note
  `~/..` expands to an absolute path and therefore survives the relative check, and pointing it at
  any existing directory will **create a brand-new memory tree there** (`.git`, `.owner`,
  `context.md`, `decisions.md`). Worth flagging as traversal-in-disguise.
- **`slugify()` in `bin/fde.js` ends `|| 'engagement'`**, so values that slugify to empty (`???`,
  `---`, `!!!`, `@@@@`) once resolved the CLI onto an engagement literally slugged `engagement` — a
  client nobody named — while the bash hooks refused via `[ -n "$slug" ]`. The resolver now refuses
  any value with no `[a-z0-9]` (`"…" which is not an engagement name`, exit 2) *before* the default
  applies; `slugify()` itself is unchanged, so **any new caller that slugifies untrusted input can
  reopen this**. Always test these four values with a `<root>/engagement/` fixture created first, or
  the bug is invisible — and assert both the write side and the read side (`resume` leaking that
  engagement's content is the same bug).
- `FDEOPS_ENGAGEMENTS_ROOT` is **not forced absolute** (`bin/fde.js` ~line 40), so a relative root is
  resolved against cwd. Test `FDEOPS_ENGAGEMENTS_ROOT=..` with a valid bare slug.
- Empty/whitespace-only env values skip the env branch entirely and fall through to the registry.
  That is unset-like behaviour, not a misroute — but confirm it each time.
- `env.replace(/^~/, HOME)` runs **before** `.trim()`, so `" ~/path"` does not expand. Test both.
- `resume --init` bypasses resolution and always creates at `<root>/slugify(name)/.fde` — this is
  what makes the "no memory outside `<root>/<slug>/.fde`" invariant checkable via `find`.

### The hooks re-implement resolution in bash — test them separately

`hooks/session-start`, `hooks/session-stop`, `hooks/pre-compact` each have their **own**
`resolve_engagement_dir`. **A fix in `bin/fde.js` does not fix the hooks, and vice versa** — always
run all three hooks with a bound workspace plus a hostile env value and sha-compare the bound
client. `session-stop` runs `capture` + `dashboard` and `pre-compact` runs `preserve` — both are
writes, so a misroute there is silent and unattended.

Since v3.10.4 each hook accepts only absolute paths (`<p>/.fde` then `<p>`) or bare slugs under
`FDEOPS_ENGAGEMENTS_ROOT`, and `exit 0`s **before** the registry fallback when the env var is set but
unresolved. Test both directions:

- Refusal: arm registry + project `CLAUDE.md` + global pointer + in-repo `.fde` + folder-name match
  all at once, set a bogus slug, assert hash-identical decoys, no dashboard HTML, no leaked context.
  Repeat with legacy `FDEOS_ENGAGEMENT`, and run an **unset control** so you know the fall-through
  was genuinely reachable.
- No regression in normal auto-capture: absolute `.fde`, absolute engagement folder (must reuse the
  existing `.fde`, never create `.fde/.fde`), bare slug, mixed case/spaces (`Client A`), uppercase,
  `~/...`, whitespace-padded, and trailing-slash forms must all still resolve and write.

## Registry (`<root>/.registry`)

Format is `<absolute workspace path> <slug>`, split on the **last** space, so workspace paths may
contain spaces. Worth attacking: CRLF, duplicate lines, slug containing a space, a line pointing at
a deleted engagement, lines with no space, relative workspace paths, 40k-line files (~50 ms is
normal), and `.registry` as a directory, symlink or **fifo**. Expect exactly **one** warning per
process naming the file. `resume --init` rewrites the file (self-heal) — assert valid bindings for
*other* workspaces survive verbatim.

`resume --init` bind-failure behaviour is **mode-dependent**, so test several modes:

- The "could not bind" branch prints `ENGAGEMENT READY`, a stderr reason naming the registry, an
  `export FDEOPS_ENGAGEMENT=…` workaround, and exits 1. Registry symlink/dir/fifo now all reach it
  because the registry write runs `{ soft: true }` inside the lock (error codes `ESYMLINK` vs
  `EIRREGULAR`) instead of `process.exit()`-ing from inside `withFileLock` — which used to skip the
  message *and* leave a stray lock. Regression checks per mode: exit 1, `ENGAGEMENT READY`, the
  registry named, the workaround offered, `find <root> -name '.registry.lock*'` empty, and for the
  symlink case that the **target file is sha-identical** (nothing written through the link).
- A **workspace directory whose name contains a newline** serialises as two lines and can never read
  back — the way to exercise the read-back verification itself rather than the write failure.
- A **read-only `.registry` file** (chmod 444) still binds successfully and exits 0 — `atomicWriteFile`
  renames over it, and rename only needs the *directory* writable. Verify by grepping the registry
  content rather than trusting the exit code; chmod 555 the **root** to actually block it.

## Non-regular files in memory slots (fifo / socket / dir / symlink)

`collectDoctorIssues()` lstats `decisions/risks/delivery/stakeholders/context.md` before the `fresh`
early-return, and since v3.10.4 `readEng()` lstats before reading, so most shapes are reported as
`<f> is not a regular file` / `<f> is a symlink` without printing the target body.

**`readEng()` is not the only reader — always test all four shapes in all five slots, reads *and*
writes, each under `timeout`.** Historically three separate unguarded call sites each hung on a fifo
and each needed its own lstat; assume a fourth exists until proven otherwise:

- `bin/lib/trust.js` `stakeholdersMemoryHealth()` read `stakeholders.md` directly → hung
  `doctor`/`resume`/`triage` with **no finding reported** (so "clean output" is not evidence).
- `readRegistry()` (`bin/fde.js`) read `.registry` directly → hung `resume --init`.
- The **write** path appended without a guard → a fifo in the written slot hung. `refuseSymlinkWrite()`
  now refuses *any* non-regular target: `refused: <f> is not a regular file - remove it and re-run;
  every write is refused while it is there.` (exit 1), with the distinct symlink message
  `refused: <f> is a symlink - write would leave the engagement tree.` Assert the symlink target is
  sha-identical afterwards — refusal messages alone do not prove there was no write-through.

To find *which* call blocks, preload an `fs` tracer instead of guessing — the last line printed
before the timeout is the culprit, and it needs no repo edits:

```js
// /tmp/trace-fs.js
const fs = require('fs')
for (const fn of ['readFileSync','appendFileSync','writeFileSync','openSync']) {
  const o = fs[fn]
  fs[fn] = function (p, ...r) { process.stderr.write(`[fs.${fn}] ${p}\n`); return o.call(this, p, ...r) }
}
```

```bash
timeout 12 node --require /tmp/trace-fs.js bin/fde.js doctor 2>&1 | tail
```

To decide whether a hang is node or `git`, re-run with a curated PATH that omits `git` — but note a
missing `git` changes the code path entirely, so confirm by logging the git argv with a wrapper
script on PATH rather than concluding from the exit code alone.

## `bin/check.js` recorded-session gate

The gif embed may live in **README.md OR docs/USAGE.md**, and the recorder link must be in a host
that *embeds* the gif. Mutation-test on a throwaway `tar`-copy of the repo (exclude `.git` and
`node_modules`), restoring between cases: remove the embed from one host (should stay green), from
both (should fail), `rm`/truncate the gif below 50 KB, `rm` the cast, `rm` the recorder, and drop
the recorder link from the embedding host. All must fail closed. Since v3.10.4 the success line names
the **actual** host (`OK: recorded session in docs/USAGE.md …`).

## Privacy boundary (`<private>`)

Seed a sealed block into `context.md`, `stakeholders.md`, and `decisions.md`, then assert the needle
(and shorter fragments of it) is absent from `resume`, `resume --full`, `triage`, `prep`, `receipts`,
`status`, `status --all`, `doctor`, `capture`, and the `dashboard` HTML at
`<root>/fieldbook-current.html`, while `(private - redacted)` appears where expected. Always grep the
`.fde` files as a **control** to prove the needle really is on disk — otherwise the zeros are
meaningless. Do not paste raw private blocks into model-facing output.

## Baseline contrast

To prove a resolution fix actually closes a misroute, test the parent commit, not `Main` — `Main`
may already contain the merge:

```bash
git worktree add /tmp/pre-wt <fix-commit>^
```
