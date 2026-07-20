# Minimal Field Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the smallest set of field-facing integrity and privacy gaps without changing FDEOps workflows or memory format.

**Architecture:** Keep hooks as compatibility resolvers, but pass their resolved engagement explicitly to the deterministic CLI for all reads and writes. Reuse the existing redaction, lock, atomic-write, and memory-Git primitives rather than introducing a storage abstraction.

**Tech Stack:** Node.js 18+, `node:test`, Bash hooks, dependency-free filesystem and Git CLI operations.

---

### Task 1: Close privacy and secret-routing gaps

**Files:**
- Modify: `bin/fde.js:558-575`
- Modify: `bin/fde.js:1169-1209`
- Test: `test/fde-cli.test.js`

**Step 1: Write the failing signal-ledger privacy test**

Create an engagement, append a signal ledger entry containing a unique `<private>` canary, run `prep` and `dashboard`, and assert the canary is absent from stdout and generated HTML.

**Step 2: Run the focused test and verify RED**

Run: `node --test --test-name-pattern="signal ledger private" test/fde-cli.test.js`

Expected: FAIL because `parseSignalHistoryEntries()` uses `readEng()` for `.signal-ledger`.

**Step 3: Implement the minimal redaction fix**

Change the ledger read in `parseSignalHistoryEntries()` from `readEng(eng, SIGNAL_LEDGER)` to `readClean(eng, SIGNAL_LEDGER)`.

**Step 4: Run the focused test and verify GREEN**

Run the same focused command. Expected: PASS.

**Step 5: Write the failing `next:` secret test**

Debrief a `next:` line containing an OpenAI-shaped canary key. Assert stderr reports the skip and `context.md` does not contain the canary.

**Step 6: Run the focused test and verify RED**

Run: `node --test --test-name-pattern="next action secret" test/fde-cli.test.js`

Expected: FAIL because `next:` branches before `findSecretHit()`.

**Step 7: Implement the minimal routing fix**

Apply `findSecretHit()` before the `next:` branch, reusing the existing skip message and `--force` behavior.

**Step 8: Verify focused and full tests**

Run:

```bash
node --test --test-name-pattern="signal ledger private|next action secret" test/fde-cli.test.js
npm test
```

Expected: all pass.

**Step 9: Commit**

Commit only `bin/fde.js` and `test/fde-cli.test.js` as Subash Natarajan.

---

### Task 2: Recover abandoned locks and preserve complete dashboards

**Files:**
- Modify: `bin/fde.js:273-320`
- Modify: `bin/fde.js:1831-1837`
- Test: `test/fde-cli.test.js`

**Step 1: Write the failing abandoned-lock test**

Create an old `decisions.md.lock`, run `fde log decision`, and assert the write succeeds and removes the lock.

**Step 2: Verify RED**

Run: `node --test --test-name-pattern="abandoned lock" test/fde-cli.test.js`

Expected: FAIL after the current five-second lock timeout.

**Step 3: Implement conservative stale-lock recovery**

When lock acquisition sees `EEXIST`, inspect the lock mtime. If older than 30 seconds, unlink it once and retry. Preserve existing behavior for fresh locks and all other errors.

**Step 4: Verify stale and active lock behavior**

Add/retain a fresh-lock test that expects failure with the existing retry message. Run both focused tests and confirm PASS.

**Step 5: Write the failing atomic-dashboard test**

Use source-level structural validation in `bin/check.js` only if process-level failure injection is impractical; otherwise inject a rename failure and assert the old fieldbook remains byte-for-byte unchanged.

**Step 6: Verify RED**

Expected: FAIL because dashboard currently uses direct `writeFileSync`.

**Step 7: Reuse `atomicWriteFile()`**

Replace the direct dashboard write with `atomicWriteFile(outPath, html)`. Keep the existing output, symlink refusal, and error formatting.

**Step 8: Verify focused and full tests**

Run:

```bash
node --test --test-name-pattern="abandoned lock|fresh lock|dashboard" test/fde-cli.test.js
npm run check
```

Expected: all checks pass without warnings.

**Step 9: Commit**

Commit the lock and dashboard hardening as Subash Natarajan.

---

### Task 3: Route hook writes through the CLI

**Files:**
- Modify: `bin/fde.js:1323-1348`
- Modify: `bin/fde.js:1851-1903`
- Modify: `hooks/session-start`
- Modify: `hooks/session-stop`
- Modify: `hooks/pre-compact`
- Modify: `bin/check.js`
- Test: `test/fde-cli.test.js`

**Step 1: Write failing hook-contract tests**

In isolated HOME/workspace sandboxes:

- prove session-stop writes through `fde capture` and commits memory;
- prove pre-compact preserves the same redacted block once per UTC day;
- prove triage and context use the hook-resolved engagement when project and global pointers differ.

**Step 2: Verify RED**

Run: `node --test --test-name-pattern="session-stop CLI capture|pre-compact CLI preserve|hook resolved triage" test/fde-cli.test.js`

Expected: FAIL because hooks currently append directly and do not bind delegated CLI calls.

**Step 3: Add the internal `preserve` command**

Move the current pre-compact extraction into `cmdPreserve()`:

- resolve for write;
- exit zero if no engagement/context;
- deduplicate by the existing daily marker;
- use `readClean()` for decisions and risks;
- append through `lockedAppendFile(..., { soft: true })`;
- commit only `context.md`;
- swallow failures to preserve hook lifecycle.

Add `preserve` to CLI dispatch and label it as hook-internal in help text.

**Step 4: Delegate session-stop**

Retain existing resolver compatibility. Once `ENG_DIR` is known, locate the packaged CLI and run:

```bash
FDEOPS_ENGAGEMENT="$ENG_DIR" node "$FDE_CLI" capture
FDEOPS_ENGAGEMENT="$ENG_DIR" node "$FDE_CLI" dashboard
```

Remove direct `context.md` appends and duplicated workspace-state collection.

**Step 5: Delegate pre-compact**

Retain resolver compatibility, locate the CLI, and run:

```bash
FDEOPS_ENGAGEMENT="$ENG_DIR" node "$FDE_CLI" preserve
```

Remove the raw append and duplicated redaction/extraction.

**Step 6: Bind session-start triage**

Pass `FDEOPS_ENGAGEMENT="$ENG_DIR"` to the existing CLI triage invocation so context and triage cannot come from different engagements.

**Step 7: Update static hook checks**

Change `bin/check.js` invariants to require CLI delegation and reject raw `>> "$CONTEXT_FILE"`/`cat >> "$CONTEXT_FILE"` mutation paths.

**Step 8: Verify focused and full checks**

Run:

```bash
bash -n hooks/session-start hooks/session-stop hooks/pre-compact
node --test --test-name-pattern="session-stop CLI capture|pre-compact CLI preserve|hook resolved triage" test/fde-cli.test.js
npm run check
```

Expected: all checks pass without warnings.

**Step 9: Commit**

Commit the hook consolidation as Subash Natarajan.

---

### Task 4: Final compatibility verification

**Files:**
- Modify only if verification exposes a defect.

**Step 1: Verify the clean upgrade path**

Create a v3.9.10-style engagement fixture with no new files, then exercise `resume`, `log`, `debrief`, `prep`, `doctor`, `status`, `dashboard`, `capture`, and `preserve`.

**Step 2: Run all deterministic checks**

```bash
npm run check
bash -n hooks/session-start hooks/session-stop hooks/pre-compact
git diff --check
git status --short
```

**Step 3: Review scope and metadata**

Confirm:

- no dependency or schema changes;
- no generated fieldbook or engagement data in the repository;
- no author/committer identity other than `Subash Natarajan <suboss87@gmail.com>`;
- no “Cursor” attribution, trailers, or commit text;
- all commits remain independently revertible.

**Step 4: Run independent code review**

Use a code-review agent against the branch diff. Fix only correctness, compatibility, privacy, or test-quality findings within this design.

**Step 5: Final commit if review required changes**

Commit review fixes as Subash Natarajan after rerunning `npm run check`.
