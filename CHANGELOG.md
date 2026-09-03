# Changelog

## 3.22.0 - 2026-09-03

Skip is loud. The CLI now catches the two things a stranger's first week showed it missing: the signer vanishing into a note, and code moving while the ledger stayed silent. Same six stages. Same 30 skills.

- `debrief --smart`: "Priya signs off" becomes `signer: Priya` - fills **Stakeholder who signs off** in `success.md` and logs the contact. A second, different signer is kept beside the first, never overwritten. New `signer:` prefix in the vocabulary.
- `doctor` (ship/close): commits in the bound client repo newer than the last dated `delivery.md` line → "code moved, ledger did not." Registry + git, local only.
- `doctor`: open, owned risks mid-ship no longer fail; the gate is close.
- Triage: a quoted risk is labelled `top risk:`, not `trust:`.
- Examples: all three pass `fde doctor` (schema `reality.md`, value bucket, operating map, **Accepted by** column, full names in signal history). `npm run check` runs doctor on every example so they cannot rot.
- `@fde` and `ship`: a coding pack may write the function; `@fde` owns done. Before-receipt captured before you change anything; open PRs checked; no this-turn receipt is a failed test.
- README: keep the coding pack you already use, install this next to it. `npx fdeops scan` is the first thing on the page.

## 3.21.0 - 2026-09-01

Same public map as 3.20: Commands, then All 30 Skills, then How Skills Work. Hero is hallway English. Six skills got harder field gates. Same six stages. Same 30 skills.

- README hero: the client work around the code that still gets you fired if you skip it. Catalog and project tree stay on the front door.
- Discover: data estate always; the pipe; their words in `terrain.md`. Parts of the problem before scan (no solutions).
- Test-assumptions: kind FACT / CONVENTION / UNKNOWN before blast radius.
- Three-options: assemble from surviving blocks, not three speeds of the same plan.
- POC: write pass/fail lines before you build.
- Ship: run their command in this turn or you cannot write that it passed. Monday-shaped staging. No unsupervised loop on their production.
- Review: their PR comments are to check, not to obey.
- Readout: old path still live = claimed. Runbook: named operator runs Tuesday's job from the 2am doc, hands off. Eval-pack: side effect without a named human on their side is NO-SHIP.

## 3.20.0 - 2026-08-29

The public map is a skill catalog. Lifecycle, then catalog, then how it works.

- README Commands: one command per stage, skills load automatically.
- README catalog: 30 skills, not prompts. How Skills Work is route, evidence, confirm.
- Public docs say skills, not methods. Slash commands and file ids unchanged.

## 3.19.0 - 2026-08-29

The public map is consulting language on FDE stages. Same 30 skills. Same slash commands.

- Work names sit on the command table: Engage, Diagnose, Align, Deliver, Realize, Transfer. Stages stay Land → Close.
- Skill titles match: Deliver the increment, Validate the solution, Hold scope, Transfer operations.
- Same six stages at any scale, greenfield or brownfield, any industry (overlays). Done is not claimed until they can reject it on staging they operate.

## 3.18.0 - 2026-08-29

Public names match the work: verb + object, six stages ending in Outcome.

- Stage `prove` is now `outcome`. `fde log phase prove` still works. Catalog, slash commands, and skill titles use the same labels (`Interrogate the brief`, `Validate the bet`, `Build one change they can see`).
- `/outcome` is the stage name in commands and the CLI. Display is Outcome, not Prove.

## 3.17.0 - 2026-08-29

Ship is one method. Write or update on their repo, prove it on staging they operate, then go live with a rollback you have run. No extra method.

- `/ship` names brownfield or greenfield once, then the same loop: one change they can see, on their staging, undoable, then the go-live gates.
- `thin-slices` / `small-prs` are gone. That craft lives in `ship.md`. Catalog is 30 skills.
- A same-day throwaway that kills an assumption stays `poc`. Outcome stays promised → measured → accepted.

## 3.16.1 - 2026-08-28

The CLI no longer volunteers a false statement to a sponsor. Signals key on the person, redact does not reprint the secret in `git log`, and the dashboard fails loud when `reality.md` is not the schema.

- Trust signals key on the person in the bullet, not `words[0]`. `INCIDENT:` / `recovery` no longer become phantom stakeholders that pin the engagement RED.
- `fde redact --apply` commit subject is `redact N line(s)` - never the search term. `log` also refuses `postgresql://user:pass@host` and `api_key=` assignments.
- Dashboard fails loud when `reality.md` is not the schema. It will not label the inherited brief as "what's actually true".
- `debrief --smart` prints the `decision:` / `risk:` / `delivery:` / `contact:` / `next:` vocabulary. Preview gate unchanged.
- `fde log delivery "slice | bucket | …"` writes a value-ledger row. `fde log risk --retire <text>` moves matching open risks. `fde tidy --apply` can bless hand-written dirty files.
- `status` and `dashboard` print doctor issues. README check allows the GitHub poster `<img>` (`user-attachments`).
- Command map and slash descriptions use plain verbs (`Ship to their production`, `Prep before the meeting`). Craft words stay in the method, not the button.
- Discover frames Situation / Complication / Question / Answer-space before any scan (same spine as readout, aimed at the floor). Plan copies the kill observation onto each Now slice as `Kill if`.

## 3.16.0 - 2026-08-28

Skill and command names are the job, in the language of the embed. You can read the filename and know what it is: `who-decides`, `hold-scope`, `thin-slices`, `readout`. Slash tells match how you ask: `/trust` `/receipts` `/readout`. CLI verbs stay (`fde status`, `fde receipts`).

## 3.15.2 - 2026-08-28

`/got` is now `/outcome`. Why is the product reason: agents forget the client; this is the record you take on site. Commands carry the tells. How Skills Work is the router. Project Structure lists every reference and slash command. Em dashes removed from copy.

**Ground loop.** `@fde` stays from discovery to signed outcome: POC, slice, on-site proof, eval when a model judges, promised → measured → accepted. A throwaway typo in an unbound repo can skip; a client slice cannot.

## 3.15.1 - 2026-08-28

Public copy uses the standard skill-pack words: **skills**, Commands, Quick Start, All 31 Skills, How Skills Work, Why FDEOps. `@fde` is still the one skill a host loads; the 31 remain references it routes to. No invented glossary on the front door.

Public tree: `.agents/` (the contributor `testing-fieldbook` skill) is gone from git, so a bare `npx skills add` only sees `skills/fde`. Attack notes live in `evals/testing-fieldbook.md`. Methodology moved to `docs/methodology.md`.

## 3.15.0 - 2026-08-28

Production front door: command map, 30-second install, method catalog (Use when), then why it exists. README is text - no gif. Stages are LAND → CLOSE everywhere. Unused SDLC archive and staged mock media removed. Leftover `build` phase name aliases to `ship`. Coding stays in the host agent.

## 3.14.1 - 2026-08-28

### Changed
- **Front-door map is the embed** - LAND → DISCOVER → PLAN → SHIP → PROVE → CLOSE, with `/brief` `/discover` `/plan` `/ship` `/got` `/close` under the boxes. Commands table is the job, left to right.

## 3.14.0 - 2026-08-28

### Changed
- **Command map on the front door** - four situations as a map, then slash commands as method cards. `/prep` and `/status` added. The 31 methods stay in a details block.

## 3.13.2 - 2026-08-28

### Changed
- **Category line** - Forward deployed engineering skills for AI coding agents.
- **One skill, tighter router** - `@fde` is the brain; slash commands are the menu; methods stay references. The human never picks a skill.

## 3.13.1 - 2026-08-28

Slash commands for the four situations, and the nickname “four days” is gone from the front door.

### Added
- **Claude Code slash commands** - `/brief` `/quiet` `/agreed` `/got` `/debrief` load `@fde`. Same skill; a menu, not a second method pack.

### Changed
- **README week table** names the situation, the chat, and the slash command. “Why this exists” is four numbered problems, not land→build→close.
- **Plugin** declares `skills` + `commands` in `.claude-plugin/plugin.json`.
- **Dropped the “four days” nickname** on the public surface. The product is still those four situations; we just say them.

## 3.13.0 - 2026-08-28

Four-day front: the skill is the engagement record, not a land-to-close operating system.

### Changed
- **Four days first** - the brief is wrong, they went quiet, when did we agree, what did they get. `@fde` leads with those moments; the six-domain router stays behind them.
- **First chat binds** - name the client (`@fde this is Acme`); the agent runs `fde resume --init`. The FDE never types the CLI. Terminal `--init` remains the fallback.
- **Generic SDLC left the router** - `build`, `debug`, `observability`, `qa-live`, `security-audit`, and `test-on-legacy` live in `skills/fde/archive/sdlc/`. Routed count is 31 methods + 5 overlays. Coding, tests, and commits stay in the host agent.
- **Friday status leads with the value ledger** - promised → measured → accepted, then trust. A number nobody signed is claimed, not delivered.
- **README** teaches the job, then a 30-second install (plugin or `npx skills add --skill fde`). Method catalog is a details block.

## 3.12.0 - 2026-08-27

Vocabulary: standard words on the outside, so nothing has to be learned before it works.

### Changed
- **The skill fires on client work, not on a password.** The frontmatter `description` - the only text a host reads before loading a skill - triggered on `@fde` plus a list of our own nouns ("hygiene", "receipts"), so an FDE who simply talked about their client got no memory. It now names the intents in the standard `Use when …` form: mentioning a client or sponsor, debriefing a meeting, asking what was agreed, prepping a readout, opening a session in a client workspace. `@fde` remains, as one trigger among several rather than the gate.
- **`fde tidy` is the verb; `fde garden` still works.** "Garden" was a metaphor only we used. Nothing is removed - the old name routes to the same code, and the alias is covered by a test.
- **`capture` and `preserve` left the human help.** Only hooks call them; listing them invited an FDE to run a snapshot by hand.
- **"Engagement memory for AI coding agents"** replaces "second brain" in the npm, plugin and marketplace descriptions - the phrase someone would actually search, and an accurate one.

### Added
- **One glossary.** The six words that carry the method (fieldbook, brief vs reality, terrain, trust signal, receipts, vault) are defined once in the README instead of being met scattered and guessed. A gate keeps it in place, and a second gate keeps the description triggering on intent.

## 3.11.1 - 2026-08-27

Adoption: one skill, and the CLI is never missing.

### Fixed
- **A skill-only install had no hands.** `npx skills add` copies the method but not the CLI, and the router's only fallback was `~/.claude/fdeops/fde.js` - absent on Cursor/Codex/anything that is not a Claude Code install - so the agent dropped to writing `.fde/` by hand and lost the dating, gates and `<private>` redaction the CLI enforces. It now reaches for `npx --yes fdeops <verb>` before any manual path; "CLI unavailable" means no Node or no network, not "not installed".
- **The advertised install pulled a contributor skill.** A bare `npx skills add suboss87/fdeops` also installs `testing-fieldbook`, which is for people working on this repo. The documented command is `--skill fde`, and a gate keeps it that way.

## 3.11.0 - 2026-08-27

One window over every client, without a second memory to maintain.

### Added
- **`fde vault`** - a derived Obsidian vault of the whole portfolio: a `Portfolio` page across all clients, a page per engagement (phase, trust, next action, timeline, people), a `Questions` page (gone quiet, value nobody accepted, stale signals, no next action), plus frontmatter and `[[wikilinks]]` so search and graph view work in a stock Obsidian with no plugins. Obsidian ignores dot-paths, so `~/fde-engagements` as a vault shows nothing - the record lives inside `.fde/`.
- **`fde vault --redacted`** - the same vault with the political layer removed (`stakeholders.md`, `trust-profile.md`, people pages, trust signals, contact notes, `[signal:x]`/`[@owner]` tokens), on top of the `<private>` redaction every output already does. The first version of a fieldbook that is safe on a shared screen.

### Notes
- The vault is **derived and disposable**: `.fde/` stays the only source of truth, the folder is deleted and rebuilt on every run, it is gitignored, and nothing in it is ever parsed back. Authoritative `.fde/` files gain no frontmatter and no wikilinks - they stay plain markdown a client can read.
- It refuses to build over `$HOME`, the engagements root, anything inside a `.fde/`, a symlink, or any directory it did not write itself (proved by its `.fdeops-vault` stamp). `--out <dir>` for anywhere else.

## 3.10.4 - 2026-08-20

The same refusal in the automatic paths: hooks no longer capture one client's session into another.

### Fixed
- **The `hooks/` layer honored the refusal only in `bin/fde.js`.** With an unresolvable `FDEOPS_ENGAGEMENT`, `session-start` injected the registry-bound client's context, `session-stop` ran `capture`/`dashboard` and `pre-compact` ran `preserve` against it - unattended, so worse than the manual case 3.10.3 fixed. All three now exit without touching memory, and they accept the same bare-slug / engagement-folder forms as the CLI.
- **A relative `FDEOPS_ENGAGEMENT` is refused.** `FDEOPS_ENGAGEMENT=..` resolved against whatever directory the agent started in and initialised memory outside the engagements root. Absolute path, `~` path, or bare slug only.
- **A fifo (or any non-regular file) in a memory slot no longer hangs the CLI.** `doctor`, `resume` and `triage` blocked forever on open; reads now skip anything that is not a regular file, and `doctor` still reports it.
- **A value that slugifies to nothing no longer names an engagement.** `slugify()` defaults to the literal `engagement`, so `FDEOPS_ENGAGEMENT='???'` resolved onto a client slugged `engagement` - exit 0, no warning, reads and writes both.
- **Every non-regular memory file is refused on the write side too, and the remaining unguarded reads are closed** (`stakeholders.md` via `stakeholdersMemoryHealth()`, `.registry`, the append target): a fifo in a slot hung `doctor`/`resume`/`triage`/`log` forever.
- **An unbindable `.registry` explains itself once, whatever its shape,** and no longer leaves a stale `.registry.lock` (the refusal used to `process.exit()` from inside the lock).
- **A whitespace-only `FDEOPS_ENGAGEMENT` refuses too** - an empty expansion (`export FDEOPS_ENGAGEMENT="$CLIENT"`) read as unset and filed the note under the workspace binding.
- **`fde resume --init` fails loudly when it cannot bind.** An unwritable `.registry` left the workspace silently unbound with exit 0, so every later command said `NO ENGAGEMENT` for no stated reason.

## 3.10.3 - 2026-08-20

Stability pass: an override that cannot be honored now refuses instead of filing the note under another client.

### Fixed
- **`FDEOPS_ENGAGEMENT` no longer falls through.** A typo'd or stale value silently resolved via the registry, so `fde log` appended to whichever engagement the workspace was bound to. Every verb now refuses, names the value, and says where it looked.
- **`FDEOPS_ENGAGEMENT` accepts a bare slug and the engagement folder.** Pointing at `~/fde-engagements/<client>` used to create a second, git-less memory beside the real `.fde/` - same client, split record.
- **Unparseable `.registry` lines are reported, not parsed into nonsense.** A line without a space produced a workspace path missing its last character, so valid bindings vanished behind `NO ENGAGEMENT`. Re-binding rewrites the file without the junk.
- **`doctor` flags a memory file that is a directory or a symlink** - both read as empty and reject every append, and doctor used to call that healthy.

### Changed
- The recorded session may live in `README.md` or `docs/USAGE.md`; the gate now enforces reachable-and-reproducible instead of front-door-only (the README lost its embed in 3.10.2, which left `npm run check` red on `Main`).

## 3.10.2 - 2026-08-13

Launch README: honest cold start (hooks vs `@fde`), denser front door.

### Changed
- Week table states Claude Code auto-loads; Cursor/Codex need `@fde` / `resume`. Fieldbook is on disk either way.
- README tightened: followable, not a tutorial. Method matrix stays behind details.

## 3.10.1 - 2026-08-13

Launch usability: pull is optional and CLI-first; MCP sink can bind an engagement without env.

### Added
- **Slack pull recipe** - read a thread as text; never post or sync.
- **`engagement` argument** on ingest MCP tools - pass the `.fde/` path from `fde resume --bind` when the MCP process is not in a bound workspace.

### Changed
- Daily path is paste/debrief; connect wires a **source** MCP only. `fde ingest` in the open workspace is the sink.
- README week table and "won't build" line no longer contradict (pull via your MCP ≠ we ship connectors).

## 3.10.0 - 2026-08-04

Everything published since 3.9.20: the installer can no longer touch skills it did not create, `<private>` holds under adversarial input, a first run costs nothing, and the front door shows a real session.

### Added
- **`fdeops demo`** - the whole land→close loop on a fake client in one command, then `fdeops demo --clean`. Nothing of yours is touched.
- **Agent Plugins 1.0.0 conformance** - root `plugin.json` + `mcp.json` alongside the existing `.claude-plugin/`, so non-Claude hosts can load the same skill.
- **Worked examples on 12 field methods** (one Acme thread across land→close), a gaming check per success metric, "measured ≠ accepted" gating on the value ledger enforced by `doctor`, and pre-wire/pre-mortem in `stakeholder-radar`.
- **`media/session.gif` + `media/session.cast`** - a recorded real session in the README, reproducible via `media/record-session.sh`.
- **`SECURITY.md`** with a reporting channel that does not depend on a repo setting.

### Fixed
- **Installer only removes or overwrites skill directories it created** (#8) - verified by a marker, no writing through symlinks, no partial install reporting success.
- **`<private>` never reaches a model** - redacted from debrief/ingest dry-run previews, HTML comments stripped before routing, apply refuses when the sealed sidecar is gone, an unclosed marker cannot swallow later notes, and MCP results carry no sealed text.
- **MCP ingest server speaks newline-delimited stdio**, as the transport requires - it could not have worked with any client before.
- **A typo'd or flag-only `fdeops` command no longer installs** - `fdeops dmeo` exits 1 with a suggestion; `--help`/`--version` answer and touch nothing.
- **Each logged contact renders once** in the fieldbook LOG, with its trust signal; `doctor` reports unbalanced `<private>` markers.
- **`media/record-session.sh` is reproducible** - `doctor`'s expected non-zero exit no longer aborts it, `--session` stays in a throwaway workspace, and a missing `gifsicle` is not fatal.

### Changed
- Advertised method count is gated against `skills/fde/references/`, so docs cannot drift (37 methods + 5 overlays).
- Launch hygiene: drop `docs/plans/` and the Devin `.agents/` testing skill from the public tree.

### Fixed
- **mcp.json server-path gate** uses the `${PLUGIN_ROOT}` arg (joining all args was blind on empty args and wrong with extra flags).

## 3.9.20 - 2026-07-31

Ingest connect UX - wire any source MCP in plain language; recipes + capability check.

### Added
- **`@fde` connect flow** - "connect Granola/Notion / a new MCP" / "what can you pull?" → `references/ingest-connect.md` (config snippet, host save/reload, verify; no silent install).
- **`mcp/recipes/`** - file, granola-shaped, notion-shaped recipes into the ingest sink.
- **Capability check** before pull - list available sink/source tools; never pretend a source exists.

### Changed
- README / USAGE clarify: FDEOps is the sink; sources are user MCPs; connect once then pull in natural language.

## 3.9.19 - 2026-07-29

Ingest sink - pull large artifacts from user-configured source MCPs; same confirm loop as debrief.

### Added
- **`fde ingest` CLI** - `stage`, `list`, `propose`, `apply` verbs. Raw pulls land in `<engagement>/.inbox/`; apply routes dated facts into `.fde/` (wraps debrief `--smart` / `--apply`). Optional `via:<source>` provenance.
- **`mcp/fdeops-ingest`** - thin stdio MCP mirroring ingest verbs. Source MCPs (Granola, Gmail, Notion, custom) stay user-configured outside fdeops.
- **Skill + docs** - `@fde` routing for "make sure we're up to date" / pull-from-source; `references/ingest.md` method card; cross-links in debrief, USAGE, schema, PRIVACY, README.

### Changed
- Explicit non-goals restated: no bundled OAuth/connectors, no ambient sync, no unreviewed writes to `.fde/`.

## 3.9.18 - 2026-07-29

Failure-path + stakeholder identity hygiene - Veric-style depth without the platform.

### Added
- **`fde doctor` operating map** - from `plan` onward, empty `terrain.md` ## Operating map (exception-led) is a hygiene fail (break → who notices → workaround). Discover may still be empty; land only seeds.
- **`fde doctor` stakeholder identity clusters** - flags Denise vs Denise Chen style name forks so trust keys don't split.

### Changed
- Discover / stakeholder-radar / templates note doctor enforcement and one-name-per-person.

## 3.9.17 - 2026-07-23

Dogfood round: honest `--smart` contract + fix duplicate `## Next action` trap. Session digest: share thinking via `.fde/`, not transcript sync.

### Fixed
- **Duplicate `## Next action`** - triage/status/dashboard read the last non-empty section (template empty + agent-appended second heading no longer reports `next: (none set)`). `fde doctor` flags duplicates. `next:` / `setNextAction` collapses to one section.

### Changed
- **`--smart` honesty** - skill + debrief reference + USAGE state clearly: CLI is prefix/keyword gate + writer; the agent rewrites `.debrief-propose` with type prefixes. Editing the propose file means rewriting lines with prefixes, not annotating.
- **Session digest (On exit / before PR)** - memory contract captures TL;DR, decisions & why, pivot, scope/verification, gotchas into existing `.fde/` files; review/build gates require it before merge. Explicitly not agent-transcript sync into the product repo.

## 3.9.16 - 2026-07-21

Intent vs diff gate - scope-creep detector fitted into ship/review (not a new skill).

### Added
- **Intent vs diff** on ship (before pre-blast): KEEP / JUSTIFY / SPLIT / DROP every path against the stated slice; SPLIT/DROP still in tree = fix-first; receipt in `delivery.md`.
- **Review Stage 1** uses the same verdict table; JUSTIFY needs a written sentence or it fails.
- Router phrases for “diff grew / scope creep in the PR” → review (+ ship if going live). Distinct from stakeholder `scope-defense`.

### Changed
- Build review gate names intent vs diff explicitly; skills-reference ship/review rows updated.

## 3.9.15 - 2026-07-21

Input hygiene from the ugly edge-case round.

### Fixed
- **ANSI / control-char smuggling** - strip C0/C1 (except tab/LF/CR) on write and on readClean so triage/prep/status cannot paint fake trust colors.
- **Binary debrief** - refuse mostly-nonprintable notes on file *and* stdin (null bytes or control/noise density).
- **`.fde` as a file** - resolve refuses loudly (no fake green TRIAGE); ENOTDIR messages point at repair.

## 3.9.14 - 2026-07-21

Field validation follow-ups: shout when the memory ledger dies silently; tighten receipts/debrief/garden.

### Fixed
- **Silent ledger death** - corrupt `.fde/.git` is a loud `fde doctor` issue (UNVERSIONED + repair hint); `fde garden` stops claiming reversibility and refuses `--apply` while broken.
- **Receipts dirty caveat** - ON RECORD hits in hand-edited files are marked dirty.
- **Smart debrief** - preview lines capped; `Decided:` routes to decisions.md.
- **Garden risk dedupe** - proposes and applies consolidating identical open-risk echoes into `## Retired`.

## 3.9.13 - 2026-07-21

Audit → eval → deploy loop hardened in method + doctor (no schema break).

### Added
- **Exception-led operating map** in `terrain.md` + land/discover method (exceptions, workarounds, who holds knowledge).
- **Engagement eval pack** - optional `evals.md`, `references/eval-pack.md`, AI overlay + ship gate (non-AI stays `n/a`).
- **Value + receipts gates** on ship/close - cost-save / risk-mitigation / revenue-uplift + audit/eval receipts.
- **`fde doctor`** warns on ship/close missing value bucket; warns for missing eval receipt only when AI is in scope.

### Changed
- `success.md` / `delivery.md` templates: primary value bucket + Ship receipts; ledger gains Bucket column.

## 3.9.12 - 2026-07-21

Honest privacy wording for `<private>` tags.

### Changed
- Document `<private>` as CLI/dashboard/hook redaction plus an operational rule: do not open raw private blocks with file tools or paste them into prompts.
- Remove overclaims that tags never enter model context by themselves.

## 3.9.11 - 2026-07-20

Minimal field hardening for integrity and privacy without schema or workflow changes.

### Fixed
- Private signal-ledger content is redacted before prep and dashboard extraction.
- Secret detection now applies to `next:` debrief entries.
- Dashboard output replaces the existing fieldbook atomically.
- Hooks delegate capture and preserve through the explicitly resolved engagement.
- Mutation hooks prefer PATH `fde`, then plugin copies - same discovery order as session-start.
- Preserve keeps daily deduplication atomic and commits only local memory changes.
- Session capture derives its date and time from one consistent local timestamp.

### Added
- Focused regressions for privacy, locking, atomic replacement, hook delegation (including PATH fallback), upgrade-shaped fixtures, deduplication, and timestamps.

## 3.9.10 - 2026-07-20

Skill routing clarity + switch-tools docs + cheap skill eval pack.

### Added
- **Switch coding agents** - README / install / adapters state plainly: fieldbook stays on disk; install `@fde` + bind; Claude hooks are fullest; elsewhere load on demand.
- **`evals/skill-routing/`** - contract check + live CLI smoke for happy `@fde` verbs (`npm run test:skill-routing`).

### Changed
- **Skill description** - when to use + explicit *do not use for ordinary code edits, tests, refactors, or git commits*.
- **`fde redact`** documented in the skill CLI routing table.
- **Trust signal** - if the human already named the color, that is the confirm.

## 3.9.9 - 2026-07-19

Proactive fieldbook hygiene at high-value moments only.

### Added
- **TRIAGE `hygiene:` line** - session-start / `fde triage` / `fde resume` surface doctor issues when the fieldbook has real work and gaps. Silent when clean or brand-new (day-1 templates).
- **Phase → ship/close warn** - stderr if open risks still live.
- **`@fde clean up the fieldbook`** - skill routes to `fde doctor`; nothing auto-rewrites.

### Changed
- **Doctor** skips day-1 empty-template nagging (phase unset / empty success / empty next action with no dated work).

## 3.9.8 - 2026-07-17

Launch funnel hardenings from the v3.9.7 field run.

### Fixed
- **First-run git identity noise** - memory commits pass `-c user.name` / `-c user.email` (and set local repo identity) so clean laptops with `user.useConfigOnly` never print "Please tell me who you are."

### Added
- **`fde redact <term> [--apply]`** - preview/remove buried lines (secrets noticed hours later). Undo stays last-write-only; redact commits the scrub to the ledger.
- **`fde doctor`** - warns when phase is `ship`/`close` with open risks, and when open risks look like duplicate echoes.

## 3.9.7 - 2026-07-17

Defensible memory: stop laundering manual edits into the next write's commit.

### Fixed
- **Tamper laundering** - `commitMemory` stages only the files for that write (`opts.files`). Hand-edits to past records stay dirty, are warned on write, and surface in `triage` / `status` / `resume`. Init remains a full-tree commit.
- **Memory warn on green** - unreadable / corrupt stakeholders still print when trust resolves green from the signal ledger.
- **Receipts header** - `ON RECORD (dated - defensible):` (was `AGREED`, which mislabeled DECLINED entries).

### Changed
- **`bin/fde.js` split** - `bin/lib/memory.js` (scoped git commits), `bin/lib/trust.js` (signals / triage), `bin/lib/render.js` (dashboard). CLI entry stays command routing.
- **`examples/fieldbook.html`** - untracked (generated; regenerate with `fde dashboard`).

## 3.9.6 - 2026-07-17

Adoption contract in code: human speaks natural language; agent runs the CLI.

### Changed
- **`@fde` skill** - explicit Human surface vs agent plumbing; never ask the FDE to type `fde …`; route walk-in prep to `fde prep`; prefer `fde debrief --smart` → confirm → `--apply`.
- **`references/debrief.md`** - smart path first; agent owns the CLI.
- **Session-start pointer + Cursor adapter** - same contract.
- **README** - week as what you say; CLI reframed as under-the-hood map.

## 3.9.5 - 2026-07-17

Token discipline: SessionStart matches progressive-disclosure L1.

### Changed
- **`hooks/session-start`** no longer `cat`s the full `SKILL.md` (~24KB) into every session. Injects a one-line `@fde` pointer + TRIAGE + bounded `context.md` only. Skill body loads when `@fde` triggers.
- check.js asserts the lean inject; CLI test covers the hook output.

## 3.9.4 - 2026-07-17

Revert packaging-only 3.9.3 (week-loop README / Next: line / skills-add elevate). Restore 3.9.2 docs and skill wording.

## 3.9.3 - 2026-07-17

Yanked from product surface - packaging clarity experiment; superseded by 3.9.4.

## 3.9.2 - 2026-07-17

Field judgment hardenings blended into existing methods - no new skills, no imported skill names.

### Added
- **Brief interrogation** in `land` / `discover` - one Q + GUESS + confidence when the brief is thin; never invent stakeholders to fill gaps.
- **Anti-invention gates** in `@fde` - when not to invent, over-route, grill, or ship on vibes.
- **Pre-blast challenge** in `ship` / `red-team` - CLAIM → CHALLENGE → VERDICT before irreversible client moves.

## 3.9.1 - 2026-07-14

Field-sim closeout: prep and smart debrief match how FDEs actually write memory (logs, not only tables).

### Fixed
- **`fde prep` reads log-shaped memory** - stakeholders from Signal history / ledger when the table is empty; risks from dated bullets as well as the table.
- **`fde debrief --smart`** - infers `[signal:amber|green|red]` from contact language; person lines like “Randy opened the sheet…” route as contacts; open questions → risks; `next:` / “Next action:” updates `## Next action`.
- Worst-of trust still holds when smart apply lands Denise amber + Randy green in one pass.

## 3.9.0 - 2026-07-14

Defensible memory + frictionless debrief loop. Still a field kit - not a coworker shell. Zero telemetry; CLI stays offline.

### Added
- **Versioned `.fde/`** - `git init` inside engagement memory; every log/debrief/capture/phase/garden write auto-commits. Tamper-evident receipts (`@hash` on writes). No new dependencies.
- **Owner attribution** - `.owner` + `[@author]` on dated entries; `fde owner` / `fde owner set`.
- **`fde triage`** - same TRIAGE block as `fde resume`; session-start hook and Cursor adapter load it on entry.
- **`fde doctor`** - deterministic lint (stale signals, unset phase, empty success, missing next action).
- **`fde debrief --smart` / `--apply`** - heuristic propose from messy notes → review → confirm. Prefix router unchanged for air-gap.
- **`fde prep [label]`** - grounded walk-in brief from existing `.fde/` only (no invention).
- **`fde garden [--apply]`** - contract: no new facts, no deleted substance, git-reversible; mechanical archive of 60d+ session-end blocks.
- **`docs/field-reports/`** - attack-our-own-tool notes shipped in-repo.

### Fixed
- Session-start now injects TRIAGE (not only raw `context.md`), matching `fde resume`.

## 3.8.3 - 2026-07-14

Real field-use fixes: trust colors that cannot lie at 5pm, Monday resume that earns its keep, honest phase.

### Fixed
- **Worst-of-stakeholder trust** - latest `[signal:x]` is kept per person, then the worst active color wins. A green about Randy no longer clears Denise’s sponsor amber/red.
- **`fde resume` leads with TRIAGE** - trust, phase, open risks, next action, then engagement memory.
- **Phase is honest** - template defaults to `unset` (not fake `land`); `fde log phase <land|discover|plan|build|ship|close>` advances it.

## 3.8.2 - 2026-07-14

Filesystem last-mile hardenings from brutal edge-case report v2.

### Fixed
- **Human fs errors** - permission denied / disk full / lock failures print one line and exit 1; no Node stack dumps on the field path.
- **Atomic `resume --init`** - new engagements build in a staging dir and rename into place; partial failures clean up instead of leaving a half-built tree.
- **Symlink write guard** - `lstat` refuses appends/writes when a memory file is a symlink (would escape the engagement tree).

## 3.8.1 - 2026-07-14

Field edge-case follow-ups from live multi-client / hostile-handoff review.

### Fixed
- **Secret hygiene** - `fde log` / routed `fde debrief` lines that look like credentials (AKIA…, `ghp_…`, PEM keys, etc.) are refused; pass `--force` only if intentional. `fde log --undo` removes the last CLI write.
- **Corrupt memory ≠ green** - binary or unparseable `stakeholders.md` (or invalid `**Trust:**` value) surfaces as amber with `memory unreadable - verify`, not a healthy green.
- **Status reason** - non-green rows prefer the triggering signal / memory warning over a random latest risk line.

## 3.8.0 - 2026-07-14

Trust + hygiene cut for the field kit (second brain), not an OS.

### Fixed
- **Unknown commands exit 1** - typos in scripts/hooks no longer look like success (`fde help` still exits 0).
- **Basename match is read-only** - `log` / `debrief` / `capture` require a workspace bind, `FDEOPS_ENGAGEMENT`, pointer, or in-repo `.fde/`. A folder that merely shares a client name cannot write into that client's memory.
- **Memory write locking** - exclusive `.lock` + atomic rename on append/rewrite paths so parallel agent sessions (or hook + CLI) do not interleave the same markdown file.
- **Signal ledger** - CLI `[signal:x]` lines also append to `.signal-ledger` so trust colors survive an agent rewrite that drops `## Signal history`.

### Docs
- Dropped leftover “writes itself” / “never cross-contaminated” claims; clarified bind-before-write and Windows Git Bash need for bash hooks.

## 3.7.8 - 2026-07-13

- Adapters install places the skill pointer files reference.
- Stakeholder signal tokens land under `## Signal history` regardless of writer/token position.
