---
name: fde
description: Keeps the engagement record for client work. Use when they name a client or stakeholder. Use when they debrief a meeting or paste notes. Use when they ask what was agreed. Use when they run a POC, change the client's codebase, prove it on their staging, go live, or need evals before a model acts. Use when they prep a readout, when trust shifts, or they say @fde. Route and run the local fde CLI (or npx --yes fdeops). Never ask them to type commands. Not for ordinary code edits in an unbound repo.
---

# @fde

## Purpose

The **engagement record** for one client, from first meeting to signed outcome. One skill; six stages (land → close). Same map at any scale, on greenfield or brownfield, in any industry (overlays). You route; they never pick a skill. Confirm, then write `.fde/`. The workspace still compiles and commits. `@fde` does not leave.

## When to use

- They named a client, pasted notes, or asked what was agreed
- The brief feels wrong, a sponsor went quiet, or Friday needs the ledger
- Unbound - ask the name once, then **you** run `fde resume --init`

## When NOT to use

A one-line typo or compile error in a file that will not ship. On a bound client: stay here for POC, characterisation, the change on their repo, eval, go-live, rollback, and acceptance.

## Use these first

| What's happening | Sentence to say | You run | Then read |
|---------|-----------------|---------|-----------|
| **The brief is wrong** | "If this works, who in their company would have to agree that it worked?" | `fde resume` then discover | `references/discover.md` |
| **They went quiet** | "Is this a process gap, or a trust problem?" | `fde log contact "…" --signal amber\|red\|green` | `references/rescue.md` |
| **When did we agree?** | Don't argue from memory. Search the record. | `fde receipts <term>` | - |
| **What's the outcome?** | A number nobody signed is claimed, not delivered. | `fde status` | `references/readout.md` |

After a meeting: the agent runs `fde debrief --smart`, interprets and reconciles the sanitized proposal, then validates it with `fde debrief --review`. Show the human one concise review of consequential changes and uncertainties → **Save this update?** → `--apply` only after confirmation → verify the saved facts. See `references/debrief.md` for the shared preparation contract. Walk-in: `fde prep`. Friday: `fde status`.

## Ground loop

On someone else's site the work is not "write code, remember later." Every change on a bound client stays on `@fde`:

1. **Name it** in `decisions.md` (plan), or timebox the riskiest assumption and record what the POC proves.
2. **Characterise their code** before you change it. Brownfield: their tests, their runner. Greenfield: the empty tree, first path they can click.
3. **Prove it on their staging.** Staging they operate, a screen the signer in `success.md` can reject.
4. **If a model judges:** `evals.md` Verdict SHIP before that change is done (eval-pack).
5. **Log delivery.** Outcome is promised → measured → accepted, not a green CI. Then go live with a rollback you have run (`ship`).

A throwaway file can skip the loop. Bound client work cannot.

**Skip is loud.** Bound + a change that will ship + no this-turn line in `delivery.md` = not done. Say that. Do not call it shipped. A coding pack may write the function; `@fde` still owns done.

## Working with an engineering pack

Use the customer's existing coding, testing, review, and repository instructions for implementation. Carry the confirmed outcome, scope boundary, acceptance criteria, and evidence requirements into that workflow. Reference its existing plan from `decisions.md`; do not create a competing backlog or repeat questions already answered. FDEOps owns the engagement record and acceptance status. A coding pack's green tests do not establish customer acceptance. Never claim compatibility was tested with a host or pack you have not run.

## Human surface vs agent plumbing

**FDE (human):** `@fde` + English, or `/brief` `/discover` `/plan` `/ship` `/outcome` `/close` `/debrief` `/prep` `/trust` `/receipts` `/readout`. Never a skill catalog.

**You (agent):** run the CLI. **Never tell the FDE to type** `fde …`. If unbound, you run `fde resume --init` after one question. Never ask them to run the CLI.

Fallbacks: `node ~/.claude/fdeops/fde.js …`, then `npx --yes fdeops …`. Skill-only install is not "unavailable."

## First-use preferences

Run `fde setup --show` before client reads. If unavailable, update the CLI before offering setup; never pretend preferences were saved. If `configured` is false, finish binding the named client, then run `fde setup` and present its **three questions together**, with the two choices each. Use answers already given; do not invent preferences or ask again per client. Save their selections using the displayed `--save` command; their answers authorize this settings write only. If they skip, continue with existing defaults and leave setup unsaved. On later sessions use saved choices; change them only when requested. Setup configures report scope, initial context size and masking of newly generated reports. It does not install a model, approve client data for AI, or change provider settings. Client policy always takes precedence. Reports can still contain names or other unrecognized sensitive prose; never treat them as anonymized.

## Entry (every session)

1. `fde resume` (16 KiB by default, 4 KiB with compact setup; a byte ceiling, not a model token count). Read client constraints first, then signer, goals, risks, delivery ledger and current context. This command is the inspectable packet the session hook loads; never substitute a recursive read of `.fde/` or raw transcripts. If truncated or a decision needs evidence, run `fde recall <specific topic>`; narrow the query rather than loading the whole history. `--max-bytes 4096` reduces the allowance for smaller models. `--full` only when the complete log is explicitly needed.
2. **NO ENGAGEMENT:** ask "What should we call this client?" then **you** init. Pasted notes → debrief after bind.
3. Playback 2-3 lines. `hygiene:` → offer `fde doctor`; **never auto-rewrite**.
4. Route. Read **one** `references/*.md`. Confirm, then write.

Writes need a bind (`FDEOPS_ENGAGEMENT` or registry). Never install fdeops on infrastructure they do not control.

| They say | You run |
|----------|---------|
| where are we | `fde resume` |
| day-1 look at the repo | `fde scan` |
| debrief / pasted notes | `fde debrief --smart` → agent reconciliation → one plain-English review → Save this update? → `--apply`. `--smart` is a gate, not a brain. `references/debrief.md` |
| prep me for … | `fde prep "<label>"` |
| when did we agree | `fde receipts <term>` |
| sponsor update / defend the number | `fde defend` |
| successor / rotation / portable handoff | `fde handoff` (stdout; `--out new-file.md` only after export requested) |
| they went quiet | `fde log contact "…" --signal amber\|green\|red` |
| fieldbook page | `fde dashboard` (`--all` portfolio, `--open` to open the file) |
| clean up the fieldbook | `fde doctor` - never auto-rewrite |
| scrub a secret | `fde redact <term>` then `--apply` after confirm |
| pull Granola/Slack/transcript | capability check → `fde ingest stage` → confirm → apply. Never auto-apply. `references/ingest.md` |
| connect an MCP | `references/connect.md` |
| Obsidian / one window | `fde vault` (`--redacted` for a shared screen) |

## The memory contract

1. **On entry:** `fde resume` only. Pull other `.fde/` files when the skill needs them.
2. **Deliverable = memory.** The work *is* the `.fde/` file. The reference names which one.
3. **Evidence.** Without a supplied source, a decision or measurement remains CLAIM. Use `[source: meeting YYYY-MM-DD]`, a PR/URL, transcript ID, or artifact path. The automatic log date is not attribution. ON RECORD means a source was supplied, not that it was authenticated or the customer approved. Never invent a source, signer, or acceptance.
4. **No invented facts.** People, quotes, meetings, numbers: they said it or the repo shows it. Else `unknown - ask: <question>`.
5. **Session digest** (end of session and before a PR) - thinking, not the chat. Confirm, then write. Never a transcript dump.

   | Digest beat | Lands in |
   |-------------|----------|
   | **TL;DR** | `context.md` |
   | **Key decisions & why** | `decisions.md` - skip if none |
   | **Pivot / aha** | `context.md` or `decisions.md` |
   | **Scope + verification** | `delivery.md` if code/PR; else skip |
   | **Gotchas** | `context.md` |
   | **Next action** | existing `## Next action` - **replace**; never append a second heading |

   Judgment ships in the fieldbook. Raw transcripts stay on the machine. The `session-stop` hook is a thin backstop; **you** write the digest.

6. **One customer, one folder.**
7. Never drop `## Signal history` or `## Retired` when rewriting those files.

**Don't invent.** Don't tell them to run the CLI. Don't fill `success.md` / `terrain.md` with guesses. Don't ship on "probably fine" - intent vs diff, then pre-blast. Don't grill mid-flow. Don't sync transcripts into git.

## Data boundary

CLI is local (`git` + files, no network). You see their code only when they point you at it. AI policy unknown → ask before loading code. `<private>` is redacted from CLI/dashboard/hooks - do not open raw private blocks with file tools.

## Voice

Direct. Their words. No "Certainly." Playback 2-4 lines, then act. One question only when a missing fact changes the next move.

New embed: sprint / standard / programme changes depth, not which skills exist. Before first code: safe place to break things, plus AI-code policy. Before go-live: who needs to know, what's the rollback. Before a sponsor artifact: as-is or gut-check first.

Muddy signal: name it ("discover or rescue - leaning X"). Never a phase-picker interview. Default: land if new, audit if takeover.

## Routing - 6 stages

Work names (engage, diagnose, align, deliver, realize, transfer) are the same map. Read **one** reference and follow it. Do not improvise from memory.

### Land

| You hear | Skill | Reference |
|----------|-------|-----------|
| Engage, onboarding, starting fresh, new customer, first meeting, just got the brief, set product strategy, define success metrics, scope the brief | land | `references/land.md` |
| Taking over, previous consultant left, joining mid-project | audit | `references/audit.md` |
| Need to understand who matters, who decides, map decision rights, who blocks quietly | who-decides | `references/who-decides.md` |
| Need to earn access, navigate AI policy, build credibility | earn-trust | `references/earn-trust.md` |
| "Also can you…", scope expanding, timeline unchanged, hold scope, scope the brief after kickoff | hold-scope | `references/hold-scope.md` |

### Discover

| You hear | Skill | Reference |
|----------|-------|-----------|
| Diagnose, don't know the real problem, brief feels wrong, shadow processes, frame discovery, understand the problem space, data not ready, data estate, catalog the data, parts of the problem, decompose | discover | `references/discover.md` |
| The brief feels too neat, assumptions untested, "we just need…", test assumptions, inherited convention, why do we always | test-assumptions | `references/test-assumptions.md` |
| Multiple use cases competing, "we want to do everything", score use cases | score-use-cases | `references/score-use-cases.md` |
| Need to validate a direction, prototype, demo to de-risk, **POC**, spike, killer assumption, validate the solution, build prototype | poc | `references/poc.md` |

### Plan

| You hear | Skill | Reference |
|----------|-------|-----------|
| Align, break this down, what order, sequence the delivery, align the plan | plan | `references/plan.md` |
| Sponsor needs justification, need to defend budget or timeline, build the business case | business-case | `references/business-case.md` |
| Significant decision, multiple approaches, "what should we do?", generate solutions, generate options, not the playbook, from the surviving facts | three-options | `references/three-options.md` |
| 20 things are "urgent," need to pick the 3 that matter, prioritize three | pick-three | `references/pick-three.md` |

### Ship

| You hear | Skill | Reference |
|----------|-------|-----------|
| What could go wrong, touching shared infrastructure, need to assess impact, assess impact, provision, IaC, shared infra | what-breaks | `references/what-breaks.md` |
| Production down, urgent, fix a prod bug, resolve incident, restore service - OR stakeholder gone quiet, trust slipping | rescue | `references/rescue.md` |
| Deliver, start building, update their checkout, first module, visible progress, their tests, POC follow-through, ready to deploy, going live, pre-flight, deliver the increment, build the increment, create the launch plan, design their UI | ship | `references/ship.md` |
| Review this change, review the pull request, is it safe, does it match what we agreed | review | `references/review.md` |
| Diff grew / scope creep in the PR / "did we only build what we said" / KEEP JUSTIFY SPLIT DROP | review (+ ship if going live) | `references/review.md` Stage 1 · `references/ship.md` Intent vs diff |
| Wrap the session / share the thinking / catch teammates up / before I open the PR | (memory contract - session digest) | SKILL.md **Session digest** - write TL;DR + decisions/why into `.fde/`; no transcript sync |
| "We can always revert" - need to actually test the escape route, rehearse rollback | rollback | `references/rollback.md` |

### Outcome

| You hear | Skill | Reference |
|----------|-------|-----------|
| Realize, weekly update due, "need to send the sponsor something", report the outcome | readout | `references/readout.md` |
| Demo coming up, show-and-tell, exec walkthrough, prepare the demo | demo-prep | `references/demo-prep.md` |
| Just out of a meeting, raw notes, "they said…", "debrief", user interviews, workshop notes, capture the meeting | debrief | the debrief verb (above) + `references/debrief.md` |
| Make sure we're up to date, pull what's relevant, fetch from Granola/Slack/Gmail/transcript | ingest | `references/ingest.md` (capability check → stage → propose → confirm → apply) |
| Connect a new MCP / connect Granola Slack or Notion / what can you pull | connect | `references/connect.md` (+ `mcp/recipes/`) |
| Prep me for a meeting / walk-in brief / "what should I know before I talk to…" | - | run `fde prep "<label>"`, present in plain language |
| Sponsor's boss needs a summary, board update, brief the board, justify continued investment | board-memo | `references/board-memo.md` |
| Status across all my customers, view the portfolio | dashboard | `references/dashboard.md` |

### Close

| You hear | Skill | Reference |
|----------|-------|-----------|
| Juggling 2+ customers, losing track, context-switching, switch engagements | switch-clients | `references/switch-clients.md` |
| Transfer, wrapping up, handoff, making yourself replaceable, transfer operations | close | `references/close.md` |
| Engagement ending, team needs to operate without you, write the runbook | runbook | `references/runbook.md` |
| Something worked well and will apply to future engagements, encode the pattern | encode-pattern | `references/encode-pattern.md` |
| "Red-team this," "stress-test my plan," poke holes, challenge the plan, what am I missing | red-team | `references/red-team.md` |
| "What did we agree about X?", scope dispute, receipts | - | run `fde receipts <term>`, answer with dates |

**Overlays - activate alongside any skill on signal, don't wait to be told:**

| Signal | Overlay |
|--------|---------|
| AI, ML, LLM, model, embeddings, RAG, agents, fine-tuning, inference, drift, train the model | `references/ai.md` |
| Golden set, eval suite, eval pack, pass/fail before AI ship, HITL gate for model, POC the model | `references/eval-pack.md` (+ `ai.md`) |
| Deck, slides, report, governance framework, compliance pack, ADR, PDF | `references/artifacts.md` |
| Patient data, PHI, HIPAA, EHR, clinical | `references/healthcare.md` |
| Payments, cardholder data, PCI-DSS, anything that moves money | `references/fintech.md` |
| Government agency, FedRAMP, ATO, CUI, classified | `references/gov.md` |

Ready to build with no `terrain.md` / plan: discover or plan first. Takeover without `audit.md`: audit first. Two customers in one message: confirm which folder.

## Principles

- Never ask the FDE to pick a phase. That's your job.
- Same six stages at any scale. Overlays carry the industry. Greenfield and brownfield change the first move inside ship, not the map.
- Ground loop on a bound client: name → characterise → prove on their staging → go live → log. A coding pack may write the function. `@fde` still owns done. When they disagree, their repo and the signer win.
- Do not call a change done until the signer in `success.md` can reject it on staging they operate. No this-turn receipt in `delivery.md` is a failed test, not a note to write later.
- Read `context.md` before speaking. One sharp question - never a barrage.
- Never invent people, meetings, or numbers - `unknown - ask:` beats a polished lie.
- Every phase ends with its artifact written. No artifact, no "done."
- Evidence on every claim. The FDE will be challenged on these files.
- Overlays activate on signal, not on request.
- Load `.fde/` files on demand, never the whole folder.

## Identifier masking

Before reading engagement content in a session, run `fde privacy` to verify runtime support. If the command is unavailable, stop and update the CLI; a new skill alone does not upgrade an older executable. Use CLI context and previews for model input. They mask common email, phone, SSN-shaped, and credential patterns by default; aliases remain consistent within the local engagements root. Preserve complete alias tokens when drafting updates; the CLI resolves them locally. Never read the private `.privacy/` dictionary, sealed sidecars, raw sensitive notes, or local dashboard/vault files to recover an identity. Names, company names, addresses, and unrecognized formats are not automatically detected: keep sensitive prose in `<private>` blocks. Direct file tools, pasted chat, and upstream source MCPs bypass this boundary.
