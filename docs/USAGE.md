# fdeops usage guide

**What it is:** the engagement layer for **you** (human FDE) + your **AI coding agent** - `@fde` routes skills; `.fde/` holds client-scoped memory on your machine.

**Terminology:** [README § Who this is for](../README.md#who-this-is-for) - **"agent" = AI software, not a human.**

**Start here:** [README](../README.md) - Quick Start → Commands → All 30 Skills.

<p align="center"><img alt="A recorded fdeops session: kickoff notes routed into dated memory after you confirm" src="../media/session.gif" width="900" /></p>

Re-record: [`media/record-session.sh`](../media/record-session.sh).

The examples below use `fde` as the short CLI form. Use `npx fdeops` in its place if the CLI is not on your PATH; for example, `fde prep "sponsor sync"` becomes `npx fdeops prep "sponsor sync"`. See [installation options](install.md).

---

## New here? (5 minutes)

Start with a fictional engagement so you can inspect the result before using customer information. Requires Node.js 18+ and Git; `npx` can download the package on first use.

### Minute 1: run the example

```bash
npx fdeops demo
```

The demo uses fictional Acme payments notes in `~/fde-engagements/.demo/` and runs the actual CLI commands. It resets its own sandbox on each run. It does not require an agent or an AI account.

### Minutes 2-3: inspect what became a record

In the output, find REVIEW: stated asks, proposed scope, named signer, next action, and missing measurement/evidence/approval. Then inspect the applied decisions, meeting brief, and receipt about dropping the rewrite. A fictional PR#42 supplies a measured result; customer acceptance remains pending. The demo applies its fictional notes automatically to illustrate the loop. On your real engagement, review the agent's proposed interpretation before confirming it.

The example's success criteria are illustrative, not actual customer results. Notice the distinction between a target, a measurement, and customer acceptance.

### Minute 4: open the fieldbook

Search by client or sponsor and filter by attention flags. On mobile, open **Clients** to switch engagements; the report keeps the selected client in view. Prompt buttons copy instructions for your agent. The dashboard is a local snapshot: rerun `fde dashboard` after changing engagement records.

Open the HTML path printed at the end. Find Acme's next action, recent decisions, risks, and available success criteria. The page is a local snapshot of the records generated during the demo.

To remove only the fictional demo later:

```bash
npx fdeops demo --clean
```

### Minute 5: try your own request

Install the skill if you have not already:

```bash
npx skills add suboss87/fdeops --skill fde
```

With your customer workspace open, send your agent:

```text
@fde this is client01. Our operations team manually reconciles orders.
They asked for an AI agent by Friday. Inspect the existing workflow first.
Help me identify the smallest useful delivery, the unknowns that affect it,
and how the customer will decide whether it worked.
```

Replace this fictional request with your actual situation. The first useful result is a reviewed problem statement, evidence and unknowns, a bounded next step, and a success criterion with an acceptance owner. An unknown baseline should stay unknown; a requested deadline is not proof that the scope is feasible.

For more depth, follow the fictional [Garvey Payments engagement](../examples/garvey-payments/) from Day 1 to Day 10.

You do not pick a skill. **`@fde` routes the AI and loads the relevant reference.**

---

## A daily routine

| Moment | What to ask | What to check |
|---|---|---|
| Start of day | `@fde Where did we leave off with this client?` | Correct customer, current state, next action |
| Before a call | `@fde Prep me for the sponsor meeting.` | Open questions, decisions, stakeholder context |
| After a call | `@fde Debrief: <raw notes>` | Proposed changes match what was actually said |
| Before building | `@fde Plan the smallest useful increment from the agreed success criteria.` | Scope, evidence, dependencies, acceptance owner |
| Before a readout | `@fde Separate promised, measured, and accepted results, with sources.` | No unsupported outcome or approval claims |

## Use the fieldbook every day

Run these from a bound customer workspace:

```bash
npx fdeops dashboard --open         # current customer
npx fdeops dashboard --all --open   # portfolio
```

If your browser does not open automatically, open the HTML path printed by the command. No web server or account is required.

- Review attention cues for missing next actions and gaps in the available record. These are reminders to investigate, not conclusions about the customer.
- Open an engagement to review its context, decisions, risks, and value ledger. A measured result and an accepted result are different states.
- Use search to find an engagement or recorded detail.
- Copy a meeting-prep, debrief, or readout prompt into your agent to do the follow-up work. Copying a prompt does not execute it or change records.
- After applying notes or editing memory, run the dashboard command again and reload the page. It is a **read-only snapshot**, not a live editor. Check the generation date before relying on it.

The HTML contains redacted engagement information, which can still be customer-confidential. Review it before sharing or presenting your screen. `.fde/` remains the source of truth.

---

## What to type (in the AI chat only)

| You are… | Example message to the **AI coding agent** |
|----------|---------------------------------------------|
| Starting | `@fde this is client01` then `@fde First meeting tomorrow. Brief says: …` |
| Unsure of real problem | `@fde Workshop done. Ops says they use a spreadsheet nightly.` |
| Just out of a meeting | `@fde Debrief: <paste your raw notes>` |
| Ready to code | `@fde` One change they can see by Friday in module X. Going live after Marco signs staging. |
| Production broken | `@fde API 500 since 2pm deploy.` |
| Sponsor went quiet | `@fde VP stopped replying; still building old scope.` |
| Handing off | `@fde Engagement ends Friday. Need handoff doc.` |
| Two clients | `@fde This is for Project B - sponsor issue on payments.` |

**You** type these. The **AI** routes the situation, investigates, and drafts. Review proposed judgments before recording them; obtain the customer approvals required before shipping.

---

## Debrief: meeting notes → memory

The highest-frequency moment in client work: you walk out of a meeting with raw notes. Two ways in:

**Via the agent:** paste the notes to `@fde`. It removes the manual work of writing `decision:` / `risk:` / `delivery:` / `contact:` prefixes yourself (adding `[signal:green|amber|red]` on contact lines when the notes carry trust information) - it does not remove your review. It shows you the structured version first and only pipes it to `fde debrief` after you confirm.

**Directly (zero tokens):** write the prefixes yourself and run:

```bash
fde debrief meeting-notes.md            # or pipe on stdin: pbpaste | fde debrief
fde debrief meeting-notes.md --dry-run  # preview the routing, write nothing
```

Routing is deterministic: `decision:` lines → `decisions.md`, `risk:` → `risks.md`, `delivery:` → `delivery.md`, `contact:` → `stakeholders.md` - each dated. Markdown dressing is tolerated (`- decision:`, `* contact:`, `**Risk:**` all route). Every unprefixed line lands as a dated debrief block in `context.md`, so nothing is lost. Use `--dry-run` the first few times to watch where lines go before trusting it.

Not sure which client a workspace writes to? `fde resume --bind` shows the binding and what actually resolves. Re-running `fde resume --init <other-client>` in a workspace **replaces** its binding (and says so) - a workspace writes to exactly one client, never two.

---

## Ingest: pull large artifacts → same confirm loop

When a transcript or email is too large to paste, or lives in Granola/Slack/Notion:

**Daily without MCP:** paste to `@fde` or `fde ingest stage` a file. That is the complete product.

**Optional pull:** `@fde I want to connect Granola` (or Slack / Notion). You add **that** source MCP; FDEOps does not bundle it and does not push back. Then `@fde pull today's client01 transcript`. The agent fetches text and runs `fde ingest` in this bound workspace (stage → propose → you confirm → apply).

**Directly (zero tokens, you already have the file):**

```bash
fde ingest stage --source granola --title "Sponsor sync 2026-07-29" transcript.txt
fde ingest list
fde ingest propose <id-or-filename>   # → .debrief-propose (same as debrief --smart)
fde ingest apply                      # after you review - same as debrief --apply
```

Raw stays in `~/fde-engagements/<client>/.inbox/`; dated facts land in `.fde/` with optional `via:<source>` provenance. Optional MCP wrapper: `mcp/fdeops-ingest` (stdio tools mirror the verbs). Method detail: [skills/fde/references/ingest.md](../skills/fde/references/ingest.md).

---

## Trust signals

Log stakeholder temperature as structured tokens, not vibes:

```bash
fde log contact "Denise gone quiet since the demo" --signal amber
```

That writes a `[signal:amber]` token into `stakeholders.md`. Trust is the **worst active `[signal:]` across people** (latest token per person) in `fde status` and `fde dashboard`; a green on one person does not clear amber or red on another. A signal older than 21 days shows as **stale** - a prompt to check in, not a verdict. With no tokens, the engagement reads **new**, not green.

---

## Local CLI (setup, air-gap, scripts)

**You do not need these for daily work.** Chat with `@fde`; the agent runs them. Use the terminal for one-time setup, air-gapped machines, or automation.

**Humans - once / occasional** (prefer chat: `@fde this is client01`):

```bash
npx fdeops resume --init <client>   # fallback: create + bind this workspace from the terminal
npx fdeops resume                   # check "where we are"
npx fdeops scan                     # try day-1 recon with no install
npx fdeops dashboard                # optional local HTML view of the fieldbook
```

**What you say → what the agent runs** (you never have to type the right-hand side):

| You say | Agent runs |
|---------|------------|
| Debrief these notes | `fde debrief --smart …` → REVIEW (asks / proposed scope / decisions / risks / signer / next action / delivery gaps) → four-row chat card → **Save this update?** (you accepted the record, not that the customer approved every ask) → `--apply` |
| Make sure we're up to date / pull from Granola or email | Capability check → source MCP fetch → `fde ingest stage` → propose → confirm → apply |
| Connect Granola / Notion / a new MCP / what can you pull | Guided `mcp.json` + [mcp/recipes/](../mcp/recipes/); save/reload in host; test stage only |
| Prep me for the sponsor meeting | `fde prep "…"` |
| When did we agree to drop that? | `fde receipts …` |
| Draft the sponsor update | `fde status` (+ judgment in chat) |
| Log that the sponsor went quiet | `fde log contact "…" --signal amber` |
| Wrap the session / share the thinking / before the PR | Session digest into `.fde/` (TL;DR, decisions & why) - not transcript sync |

**Full command list** (power users / scripts):

```bash
fde triage                        # short status (also injected by session hooks)
fde debrief notes.md              # if notes already use decision: / risk: / … prefixes
fde debrief --smart notes.md      # REVIEW first, then file routing; chat card; confirm once → --apply
fde ingest stage [--source NAME] [--title TEXT] [file|-]  # raw pull → .inbox/
fde ingest list                   # staged items
fde ingest propose <id>           # → .debrief-propose (same smart path)
fde ingest apply                  # after confirm - same as debrief --apply
fde doctor                        # check the fieldbook for gaps
fde prep "sponsor sync"           # walk-in brief from existing memory
fde log decision "…"
fde log contact "…" --signal amber
fde receipts "descope"            # dated lines (ON RECORD)
fde dashboard --all               # every client, sorted by trust
fde status [--all]                # value ledger, then trust
fde vault [--redacted] [--out D]  # derived Obsidian vault of the whole portfolio (disposable)
fde tidy [--apply]                # propose safe consolidations (fde garden still works)
fde demo                          # the whole loop on a fake client (--clean removes it)
```

Optional: `export FDEOPS_ENGAGEMENTS_ROOT=~/path/to/engagements` to isolate from `~/fde-engagements`.

Each `.fde/` is a local git repo (no remote, no telemetry). Writes stage only the files for that command - hand-edits to other records stay dirty until you review them.

---

Before applying, read the proposed interpretation rather than treating keyword routing as a decision. Ask/scope lines remain context; they do not become shipped work. A named signer records who has authority, not whether they accepted a result. Explicit source markers such as `[source: meeting 2026-09-10]` are retained from your input; the intake date is not proof of agreement.

From `plan` onward, `fde doctor` flags success definitions without both an observable acceptance check and a named customer-side signer. Put the check on `**Done when:**` or `**Acceptance check:**`, for example:

```markdown
**Done when:** Replay a failed settlement in staging; its alert arrives within 15 minutes.
**Stakeholder who signs off:** Priya Shah [source: meeting 2026-09-10]
```

A boolean check also works: `Given a revoked token, the request rejects every attempt.` “Improve performance by 30%” alone does not specify a reproducible check. Doctor also labels dated decisions without source references as CLAIM. It reports gaps; it does not invent tests, grant approval, or block you from editing the record.

## Where files live

```text
~/fde-engagements/<client-name>/
  .fde/
    context.md      ← AI loads first each session (+ dated debrief blocks)
    brief.md        ← what they said (hypothesis)
    reality.md      ← what is actually true
    stakeholders.md ← contacts + [signal:…] tokens
    …
  .inbox/           ← raw staged pulls (ingest); not the memory ledger
```

The workspace registry (written by `fde resume --init`) tells the AI and the hooks which engagement this workspace belongs to - no environment variable needed. (Advanced override: [install.md § FDEOPS_ENGAGEMENT](./install.md#fdeops_engagement-single-folder-override).)

---

## Multiple engagements

```bash
cd ~/work/client-a && fde resume --init client-a
cd ~/work/client-b && fde resume --init client-b
```

One folder per client, one binding per workspace. Never merge contexts. `fde status` prints the value ledger (promised → measured → accepted), then trust; `fde dashboard --all` renders the portfolio into one offline HTML fieldbook; without `--all`, it shows the bound engagement.

---

## One window over every client (Obsidian)

```bash
fde vault              # → ~/fde-vault, then: Obsidian → Open folder as vault
fde vault --redacted   # → ~/fde-vault-redacted; review before sharing
```

Obsidian ignores any path starting with `.`, so pointing it at `~/fde-engagements` shows nothing - every record lives inside `.fde/`. `fde vault` therefore writes a **derived** vault: a `Portfolio` page across all clients, one page per engagement (phase, trust, next action, timeline, people), a `Questions` page (gone quiet, value nobody accepted, stale signals), plus frontmatter and `[[wikilinks]]` so search and graph view work with no plugins installed.

The rules that keep it from becoming a second memory:

- `.fde/` stays the only source of truth. The vault is **never** read back.
- It is **disposable** - every run deletes and rebuilds it, so anything typed there is lost. Log to the fieldbook instead (`@fde`, or `fde log`).
- It is gitignored, and it refuses to build over `$HOME`, your engagements root, a `.fde/` folder, a symlink, or any directory it did not write itself.
- `--redacted` drops `stakeholders.md`, `trust-profile.md`, people pages, trust signals and contact notes - on top of the `<private>` redaction every FDEOps output already does.

---

## What fdeops does not do

The skills guide investigation and delivery; they do not make business decisions or establish customer approval for you. Concretely, fdeops does not:

- Replace **you** in meetings or politics
- Grant repo access or stakeholder buy-in
- Replace legal/compliance review (overlays are judgment aids only)
- Run on client infrastructure or shared git by default

---

## More

- [install.md](./install.md) - install matrix
- [OPERATIONS.md](./OPERATIONS.md) - operating rules
- [schema.md](./schema.md) - `.fde/` files
- [skills.md](./skills.md) - the skills matrix + overlays
- [skills-reference.md](./skills-reference.md) - the 30 skills

## Working context that stays small

`fde resume` returns at most 16 KiB of UTF-8 output by default, including its current-goal and risk excerpts. `fde recall "retry approval"` searches the active client's sanitized records and returns bounded matching lines with file references. It does not search other clients or send data to a model.

Use `--max-bytes 4096` with either command for a smaller allowance (supported range: 4096-65536). These are byte ceilings, not exact token counts: models tokenize differently. The coding host's instructions, conversation and other tool output still consume its context window.

Truncation is explicit. A partial excerpt is not evidence that omitted constraints do not exist. Refine the query and verify source dates, conflicting decisions and approval scope before acting. References identify lines in the redacted view; private-block removal can change their position relative to the raw file. `fde resume --full` deliberately bypasses the output bound and can be large. Existing `receipts` remains available for a full literal record search.

Measure the synthetic long-history behavior with `node evals/context-budget/check.js`. This reports bytes and matching records; it does not claim improved model accuracy or time saved.
