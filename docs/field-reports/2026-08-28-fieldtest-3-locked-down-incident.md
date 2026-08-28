# Field test 3: locked-down site, non-Claude agent, live incident

**Date:** 2026-08-28 · **FDEOps:** v3.16.0 · **Agent:** generic file-loading agent (not Claude Code, no plugin) · **Client codebase:** suboss87/ClearFrame (real, cloned, tests run)

## The embed

Meridian Civic: public-sector-adjacent, locked-down engineering environment. No new SaaS, no cloud AI without a review board. Cast: Oye Bakare (delivery lead, burned by consultants), Helen Cross (security lead, reads answers carefully), Deb Whitfield (service owner: the Tuesday clearance batch must not fail), two ops engineers who do not use AI tools and inherit everything.

Asked to deliver: install FDEOps defensibly, prove where data goes, do real engineering on ClearFrame (their tests, their runner), survive a mid-window batch incident, hold scope, and hand over a record the last consultancy never left. Sandbox: `FDEOPS_ENGAGEMENTS_ROOT=$HOME/fde-test-engagements`.

## What I ran

Cold start, README only. Real sequence (every command actually run; full log attached to the session):

```
npx skills add suboss87/fdeops --skill fde        # advertised path, in the client workspace
which fde; npx fdeops --version                    # -> no CLI; npx downloads fdeops@3.16.0
git clone https://github.com/suboss87/fdeops.git && node bin/install.js   # offline path
node bin/install.js adapters ~/meridian/clearframe # non-Claude adapters into client repo
strace -f -e trace=network node ~/.claude/fdeops/fde.js scan
unshare -rn node ~/.claude/fdeops/fde.js scan      # no-network namespace
fde resume / fde resume --init meridian-civic
fde scan                                           # day-1 recon, ground-truthed against git
make test                                          # ClearFrame's runner: 22/22 -> pin tests -> change -> 24/24
fde debrief --smart kickoff-notes.md / --apply
# incident: commit block_at: severe -> make demo: ValueError -> fde triage ->
# git log --since="6 hours ago" (rescue.md move) -> fde log decision -> git revert edd6e29 -> green
fde log contact --signal red|amber|green, fde log delivery|risk, fde receipts scope
bash ~/.claude/hooks/fdeops-session-stop / fdeops-session-start
sed a typo into stakeholders.md -> fde status      # tamper detection
fde log decision "test: api_key=sk-..."            # secret-guard probe
fde doctor (repeatedly), fde dashboard -> Chrome screenshot
```

## What worked

- **The local-only claim is provable, not just claimed.** `strace -f -e trace=network` on `fde scan` showed only AF_UNIX socketpairs (Node internals), zero AF_INET connects; in a network-disabled namespace (where `curl` exits 6) every CLI verb ran identically. Mattered because Helen's approval hinged on evidence, not README prose. Evidence: strace trace retained; `unshare -rn ... fde scan` exit 0.
- **Skill routing holds on a non-blessed host.** After `npx skills add`, my generic agent picked up `.agents/skills/fde/SKILL.md` and the adapter rules as workspace rules; the human never picked a skill or typed a CLI command all week, including `fde resume --init` after the NO ENGAGEMENT message ("Ask the human the client name... Do not tell them to type that command" — it speaks to the agent). That is the product's core promise and it held.
- **rescue.md is genuinely good at 2am.** The narrow-recent-changes move (`git log --since="6 hours ago"`) found the culprit commit (`edd6e29`, `block_at: severe` — `ValueError: 'severe' is not a valid Severity`) in one command; stabilise-first got the batch green in ~90 seconds of tool time. Recording the incident live cost four one-line `fde log` calls, each returning instantly with a git hash. Without the tool: shell history and no dates.
- **Tamper evidence works, unprompted.** After I hand-wrote `chaos-log.md`, the very next `fde log` printed "⚠ memory has uncommitted manual edits (not part of this write): chaos-log.md — they will NOT be auto-committed". Same when an "engineer" sed-fixed a typo in `stakeholders.md`: named the file, refused to absorb it. Recovery to clean was plain `git add && git commit` inside `.fde/` — no source reading needed.
- **Receipts beat a spreadsheet, modestly but really.** Two post-incident "small" asks from Oye: `fde log decision` with impact/placement, then `fde receipts scope` answered "what did we agree and when" with dated, attributed, hash-backed lines in the same ledger as the incident. A spreadsheet has whatever I remembered to type.
- **Session boundaries restore real state.** `fdeops-session-stop` committed a session capture; `session-start` in a fresh shell printed the agent contract + full TRIAGE + `context.md`. A cold agent lands with phase, trust, dirty files, and next action.
- **Recon was factually accurate where checked.** `fde scan` claims (README 15 commits/90d, `client.py` no test neighbor, "PREVIOUS ATTEMPTS" commit `fbc0fa9`) all verified against `git log`. The "facts only — interpretation is the FDE's job" banner is honest framing.

## What did not work

- **[friction] Advertised install ships no CLI.** Expected: the README front door (`npx skills add suboss87/fdeops --skill fde`) yields the working setup. Actual: skill markdown only; `which fde` → nothing; the first `npx fdeops --version` live-downloaded the package from npm ("package was not found and will be installed") — a network fetch to declare on a locked-down site. Instead: used the offline path (`git clone` + `node bin/install.js`), which put the CLI at `~/.claude/fdeops/fde.js` and printed exactly where everything went.
- **[friction] Adapters write into the client's working tree with no warning.** `node bin/install.js adapters .` dropped CLAUDE.md, AGENTS.md, GEMINI.md, copilot-instructions, and a Cursor rule into Meridian's repo, untracked, no `.gitignore` offer. One careless `git add .` by an ops engineer and my tooling is in their history. Instead: manually kept them out of every client commit all week.
- **[friction] Trust signal stuck RED after recovery — alarming and not true.** Deb's latest signal is green ("batch green two consecutive runs") yet `fde status` shows the engagement RED on the day-old INCIDENT line. Cause: per-person keying by exact name spelling ("INCIDENT: Deb Whitfield calls" / "Deb called back" / "Deb Whitfield:" forked into different "people"); the rule lives in an HTML comment inside `stakeholders.md`, and the CLI never warned at write time. `fde doctor` did detect the "deb / deb whitfield" cluster (credit), but after consolidating every bare "Deb" in every `.md` file the warning *still* fires and RED persists — unfixable from the documented surface without reading source, which a user shouldn't do. This is the screen the sponsor sees.
- **[friction] The CLI cannot write its own prescribed artifacts.** rescue.md names `chaos-log.md` as THE incident artifact; runbook.md prescribes `handoff.md`. `fde log` has no chaos/handoff verb, so both are hand-written files that sit uncommitted, tripping the dirty warning until someone git-commits inside `.fde/`. There is also no `fde` verb to bless a manual edit or retire a logged risk: I annotated risks `[closed ...]` and doctor still counts 3 open at close.
- **[friction] Secret guard advertised, doesn't fire.** `--help` mentions `--force to allow secret-like text`, but `fde log decision "test: api_key=sk-abc123..."` and an `AWS_SECRET_ACCESS_KEY=`/`password:` line both logged silently. I nearly told Helen "the CLI warns on secrets" — corrected her audit answer to "discipline, not tooling".
- **[friction] `--smart` debrief routed everything to context.** Six kickoff lines, zero contacts/risks/decisions detected; I rewrote `.debrief-propose` with `decision:`/`risk:`/`contact:` prefixes (vocabulary printed nowhere — learned by dry-run experiment) and `--apply` then routed correctly. The gate design is fine; the undocumented prefix vocabulary is the gap.
- **[papercut] `fde scan` outside a repo.** Run from `$HOME` it greps everything and flags fdeops' own source as "TEMPORARY ARCHAEOLOGY". No cwd sanity check.
- **[papercut] Recon noise unsafe to show a client raw.** Hotspots led by README.md and two `.mp4` sample videos flagged "⚠ NO TEST NEIGHBOR" (meaningless for a video file); "ASK ON DAY 1: What breaks when README.md changes" would embarrass me in front of Oye. Fine as my input, needs trimming as an artifact.
- **[papercut] Triage nags during a fire.** `fde triage` mid-incident led with an AMBER hygiene nag ("success.md has no stated done-definition"). At a real 2am I would have skipped triage; the `fde log` one-liners I would have kept.

## What this is actually like

Expert voice, having run many embeds: this is a **method with a real ledger behind it**, not paperwork — but the polish gradient is steep. The references (`rescue.md`, `hold-scope.md`, `runbook.md`) are the best part: they changed my actual behaviour under pressure (narrow recent changes, stabilise first, place-don't-refuse scope asks, exception-led handover). The memory git is quietly excellent: every entry dated, attributed, hashed, tamper-evident — that is precisely what a burned client like Oye is paying for, and it is what let me write Helen's audit answer and Deb's post-incident account from the record instead of memory.

Where it is theatre: the trust/status surface. A recovered incident showing RED because of name-spelling forks is worse than no dashboard — it is confidently wrong in front of the sponsor. Doctor's close checks that cannot be satisfied from the documented surface turn hygiene into noise. And the install story (advertised path has no CLI, adapters litter the client repo, everything lands in `~/.claude/` for a non-Claude agent) makes the first hour on a locked-down site harder than it should be for a tool whose pitch is defensibility.

Would I take it to a real client next Monday? **Yes, with caveats:** offline install only; adapters gitignored by hand before anyone commits; dashboard/status kept internal until the signal-identity bug is fixed; and I budget for hand-maintaining chaos-log/handoff in git myself. The incident loop, receipts, and handover discipline earn their keep on day one.

## The five things I would change first

1. **Fix per-person signal identity.** Key signal history by an explicit stakeholder id (or fuzzy-match names at write time and warn), so a recovery green clears an incident red. This is the single most sponsor-visible defect.
2. **Ship the CLI through the advertised path.** `npx skills add ... --skill fde` should install (or clearly point to) the CLI, and the README front door should say which paths touch the network — the locked-down audience is exactly who reads it.
3. **Add verbs for the prescribed artifacts and their lifecycle:** `fde log chaos`, `fde log handoff` (or `fde commit` to bless hand-written `.fde` files), and a way to retire a logged risk that `fde doctor` respects.
4. **Make adapters client-repo-safe:** warn before writing into a working tree, offer a `.gitignore` entry, and use an agent-neutral home (not `~/.claude/`) when the host is not Claude.
5. **Make the secret guard real and print the debrief prefix vocabulary** in `.debrief-propose`'s header and `--help` — both are one-line fixes that remove "reassuring but untrue" moments.

## Evidence

Attached to the session (not committed to this branch, per ground rules):

- `field-log.md` — real-time log, every command with actual output and friction notes.
- `fieldbook.tgz` — the full `meridian-civic/.fde/` record: memory git history (incident triage/decision/delivery/risk hashes `210f833`, `eecf956`, `7fe6f44`; engineering receipt `2100d20`), `chaos-log.md`, `handoff.md`, `helen-audit-answer.md`.
- Dashboard screenshot rendered in Chrome — the screen showing the stuck-RED engagement and "INCIDENT" fragment listed under People; judged **not** sponsor-ready as-is.
- ClearFrame work lives in the local clone: pinned tests in `backend/tests/test_reason_audit_tags.py` (22/22 before, 24/24 after), policy-id audit tag in `decision.py`, incident revert of `edd6e29`.
