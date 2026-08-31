# Field report - three embeds, one week, v3.16.0 (2026-08-28)

Four independent runs against v3.16.0: one lead dogfood (Acme Payments, sandboxed CLI), three
full field tests by separate FDE pairs on real client codebases, plus a 17-case CLI edge matrix.
Cold entry from the README every time. No FDEOps source was changed to make anything work.

| Run | Embed | Client repo | Monday verdict |
|---|---|---|---|
| Lead dogfood | Acme Payments, AP automation | (sandbox) | yes, with the trust surface hidden |
| [Field test 1](2026-08-28-fieldtest-1-regulated-takeover.md) | Northwind, regulated takeover | Invoice3-AWS | yes with caveats |
| [Field test 2](2026-08-28-fieldtest-2-two-clients-notes.md) | Harbour + Ardent, two clients | SeedCamp2.0, Siel | yes with caveats |
| [Field test 3](2026-08-28-fieldtest-3-locked-down-incident.md) | Meridian Civic, locked down, live incident | ClearFrame | yes with caveats |

All four would take it to a client on Monday. All four would hide part of it from the sponsor.

## What actually worked

- **Receipts are the killer feature.** Every run had a "did we agree to that?" moment and every run
  won it in one command with a dated, attributed, hash-backed quote. Test 2 settled a scope dispute
  in ten seconds; test 3 answered a security lead's audit question from the record instead of memory.
  A missing receipt reports a gap rather than confident silence - that distinction is the product.
- **Worst-first triage survives the context switch.** `fde resume` / `status --all` put the cooling
  sponsor on the first line while attention was on the other client (test 2), and cold-start restore
  after a session boundary landed the agent with phase, trust, dirty files and next action (test 3).
- **The method changes engineering behaviour, not just paperwork.** `reality.md` forced a churn check
  that overturned an inherited brief and stopped work on an already-solved path (test 1). `rescue.md`
  changed incident behaviour under real pressure - culprit commit found in one command, batch green in
  ~90s (test 3). The use-case scoring formula demoted the founder's favourites and promoted the slice
  nobody championed (test 2).
- **Local-only is provable, not just claimed.** Test 3 verified it with `strace -f -e trace=network`
  (zero `AF_INET`) and a `unshare -rn` namespace where `fde scan` ran identically while `curl` exited 6.
- **Private blocks hold.** Independently grepped across `fde vault`, `vault --redacted`, dashboard HTML,
  `resume`, `prep` and `status`: the planted sentinel appears nowhere but the raw `context.md` it was
  written to, exactly as `AGENTS.md` specifies. Structural redaction is real.
- **The memory git is tamper-evident and says so.** Hand-edited files are detected unprompted, named,
  and never silently absorbed into a write.

## What did not work

Ranked by what would actually hurt in front of a client.

### 1. The trust surface is confidently wrong (blocker)

`signalSubjectKey` keys a signal to the **first word of the bullet text**, so any signal line that
does not begin with the person's name invents a stakeholder. Reproduced in the lead dogfood:

```
$ fde log contact "INCIDENT: overnight AP batch failed, Marcus Hale escalated [signal:red]"
$ fde log contact "recovery confirmed by Marcus Hale, batch green two nights running [signal:green]"
$ fde status
  [RED   ] acme  phase:ship  signal 0d old · INCIDENT: overnight AP batch failed, Marcus Hale escalated
$ fde prep
  [green] Priya Shah · ...
  [red]   INCIDENT · INCIDENT: overnight AP batch failed, Marcus Hale escalated
  [green] recovery  · recovery confirmed by Marcus Hale, batch green two nights running
```

Marcus Hale is not in the people list at all; his red and his green became two phantom stakeholders
named "INCIDENT" and "recovery", and the phantom red pins the whole engagement RED forever. Test 3
hit the same failure from the other direction (name-spelling forks) and could not clear it from the
documented surface even after `doctor`'s own identity-cluster warning. This is the most
sponsor-visible defect in the product: a recovered engagement that renders RED is worse than no
dashboard.

### 2. Secrets get into the ledger, and `redact` adds another copy (blocker)

The guard does not fire on credentials in connection strings, and `fde redact` puts the term in its
own commit subject. Reproduced end to end:

```
$ fde log risk "staging DSN pasted by Priya: postgresql://svc_ap:Wint3r-Rain-88@db-stg..."
logged → risks.md @b6b9716                      # no warning
$ fde redact "Wint3r-Rain-88" --apply
redacted 1 line(s) in risks.md @0651d70
$ git log --oneline -2
0651d70 redact Wint3r-Rain-88                   # the secret, now in a commit subject
b6b9716 log risk
```

Test 1 hit the identical DSN case; test 3 logged `api_key=sk-...` and `AWS_SECRET_ACCESS_KEY=`
silently; the edge matrix showed `--force` persisting a Slack token. `redact` is tidying, not
security, and it currently makes history worse while printing a warning about history.

### 3. The dashboard silently substitutes the brief for reality (blocker)

Test 1: because free-form `reality.md` did not match the template schema, the sponsor-facing "Why"
panel rendered the **inherited brief** under both "What they asked for" and "What's actually true" -
the one artifact whose whole purpose is that those two differ. A silent fallback on a
sponsor-facing surface is worse than an empty panel.

### 4. "Smart" debrief is a stenographer (friction, unanimous)

Three independent runs, eleven real note formats (unprefixed prose, email forward, Slack paste,
transcript, whiteboard photo notes): almost everything routed to `context.md`. Test 3's six lines
routed 0 structurally; my own zero-prefix test routed about half. Every run recovered the same way -
the agent rewrote `.debrief-propose` with explicit `decision:` / `risk:` / `contact:` prefixes, a
vocabulary printed nowhere in `--help` or the proposal header. The routing tax roughly cancels the
time the feature saves. The **preview gate** around it, though, is excellent: zero surprise writes
across all runs, byte-for-byte match between proposal and landed output.

### 5. Gates are advisory prose, so nothing is actually gated (friction)

`doctor` does fire the AI-eval check when AI is in scope - but the check depends on keyword detection
in specific files, so test 1's AI-touching ship never tripped it and the gate held only because the
agent obeyed the skill text. `close` proceeds with open risks and unaccepted value. Nothing in the
CLI blocks; `doctor` exits 1 and no verb consults it.

### 6. The CLI cannot maintain its own prescribed artifacts (friction)

`log delivery` appends prose but does not write the value-ledger row the method requires (schema had
to be grepped out of templates). There is no verb for `chaos-log.md` or `handoff.md`, and no
doctor-respected way to retire a risk - test 3's risks annotated `[closed]` still counted as open at
close. Every workaround is a hand edit, which trips the dirty-memory warning; `fde tidy` answers
`Nothing to tidy`. The record's own upkeep is off-tool.

### 7. Multi-client writes are silent about where they landed (friction)

`logged → stakeholders.md @ca118cc` never names the engagement. Test 2 wrote a Harbour stakeholder
into Ardent's record with no warning and an append-only `.signal-ledger` entry that cannot be
removed; the edge matrix showed `FDEOPS_ENGAGEMENT` silently redirecting writes the same way.

### 8. Papercuts that cost real minutes

- The advertised `npx skills add ... --skill fde` installs the skill but no CLI - `which fde` is empty
  in all four runs; everyone paid `npx --yes fdeops` (~2-4s/call) or the offline installer.
- `fde scan` counts vendored `venv`/`node_modules` as client code, secrets and missing tests, has no
  cwd guard (test 3 scanned all of `$HOME`), and derives the AI surface from string matches in
  archived code while missing the live Bedrock path.
- `--help` on a subcommand re-renders the subcommand (`fde dashboard --help` renders the dashboard).
- `debrief` stamps logging time, not meeting time - a fictional week collapsed into one timestamp.
- `vault --redacted` is structurally safe but ships risk/delivery prose verbatim ("Rob told Claire's
  boss...", "Should this project exist?") with no warning that redaction is structural, not semantic.
- Adapters write five untracked pointer files into the client's working tree, unannounced, and use
  `~/.claude/` on non-Claude hosts.
- Triage nags about `success.md` done-definitions mid-incident.

## What it is really like

It is a method with a real ledger under it, and a thin deterministic tool bolted where the method
runs out. The parts that are pure derivation - receipts, triage, memory git, redaction, local-only -
are quietly excellent and earn their keep on day one. The parts that claim to be smart are the
agent's judgment wearing the tool's clothes: debrief routing, scan's AI surface, the eval "gate",
the secret guard. That is survivable, because a capable agent is holding the pen either way. What is
not survivable is a sponsor-facing surface that is confidently wrong - the phantom-stakeholder RED
and the brief-as-reality panel are the two places the tool volunteers a false statement to a client.

Every run's caveat list was the same shape: keep the dashboard internal, treat `.fde/` as
secret-bearing, review every debrief before apply, check which engagement you are bound to.

## The update, in priority order

1. **Key signals to people, not to first words.** Resolve a signal line against the stakeholder table
   (explicit id, or fuzzy-match plus a warning at write time); never invent a subject. A recovery
   green must clear an incident red. Blocks any sponsor use of trust/dashboard.
2. **Make the record credential-safe.** Detect connection strings and high-entropy tokens in
   `log`/`debrief`; never put the term in the redact commit subject; on `--apply` lead with "rotate
   the credential now" plus the `git filter-repo` line, and offer a token mask instead of dropping
   the line.
3. **Fail loud on sponsor-facing surfaces.** If `reality.md` (or any artifact) does not match the
   schema, render "not recorded" - never substitute the brief.
4. **Teach the debrief vocabulary, or earn the name.** Print the `decision:` / `risk:` / `contact:`
   prefixes in `--help` and in the `.debrief-propose` header; add `--date`. Keep the preview gate.
5. **Turn the gates into checks.** `doctor`/pre-flight fails when an AI-touching slice ships without a
   dated SHIP verdict; `close` refuses (or requires `--force`) on open risks and unaccepted value.
6. **Give the CLI verbs for its own artifacts.** Value-ledger row from `log delivery`; `log chaos`,
   `log handoff`, risk retirement; a `commit`/`bless` for hand-written `.fde` files so `tidy` means
   something.
7. **Name the engagement on every write**, and warn when a logged stakeholder belongs to a sibling.
8. **Scope `scan` to tracked files and the live import graph**, with a cwd guard.
9. **Ship the CLI through the advertised install path**, and say in the README which paths touch the
   network.
