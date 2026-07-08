# fdeops usage guide

**What it is:** the engagement layer for **you** (human FDE) + your **AI coding agent** - `@fde` routes methods; `.fde/` holds client-scoped memory on your machine.

**Terminology:** [README § Who this is for](../README.md#who-this-is-for) - **"agent" = AI software, not a human.**

**Start here:** [README](../README.md) (30-second proof → engagement layer → Quickstart).

Day-to-day reference below.

---

## New here? (5 minutes)

1. Run `npx fdeops scan` in a repo - recon + the "ASK ON DAY 1" questions, zero config
2. Read **Who this is for** and **Without fdeops vs with fdeops** in the README
3. Bind a workspace: `fde resume --init <client-name>` (the one setup step)
4. Skim [examples/garvey-payments/](../examples/garvey-payments/) Day 1 → Day 10
5. In your **AI chat** (not email to a person): `@fde` + your actual situation

You do not read the phase methods. **`@fde` routes the AI and loads the right one.**

---

## What to type (in the AI chat only)

| You are… | Example message to the **AI coding agent** |
|----------|---------------------------------------------|
| Starting | `@fde New embed. First meeting tomorrow. Brief says: …` |
| Unsure of real problem | `@fde Workshop done. Ops says they use a spreadsheet nightly.` |
| Just out of a meeting | `@fde Debrief: <paste your raw notes>` |
| Ready to code | `@fde Ship smallest slice by Friday in module X.` |
| Production broken | `@fde API 500 since 2pm deploy.` |
| Sponsor went quiet | `@fde VP stopped replying; still building old scope.` |
| Handing off | `@fde Engagement ends Friday. Need handoff doc.` |
| Two clients | `@fde This is for Project B - sponsor issue on payments.` |

**You** type these. The **AI** executes routing and drafts. **You** approve what ships.

---

## Debrief: meeting notes → memory

The highest-frequency moment in client work: you walk out of a meeting with raw notes. Two ways in:

**Via the agent (adds judgment):** paste the notes to `@fde`. The agent structures them into lines prefixed `decision:` / `risk:` / `delivery:` / `contact:` (adding `[signal:green|amber|red]` on contact lines when the notes carry trust information), shows you the structured version for confirmation, then pipes it to `fde debrief`.

**Directly (zero tokens):** write the prefixes yourself and run:

```bash
fde debrief meeting-notes.md            # or pipe on stdin: pbpaste | fde debrief
fde debrief meeting-notes.md --dry-run  # preview the routing, write nothing
```

Routing is deterministic: `decision:` lines → `decisions.md`, `risk:` → `risks.md`, `delivery:` → `delivery.md`, `contact:` → `stakeholders.md` - each dated. Markdown dressing is tolerated (`- decision:`, `* contact:`, `**Risk:**` all route). Every unprefixed line lands as a dated debrief block in `context.md`, so nothing is lost. Use `--dry-run` the first few times to watch where lines go before trusting it.

Not sure which client a workspace writes to? `fde resume --bind` shows the binding and what actually resolves. Re-running `fde resume --init <other-client>` in a workspace **replaces** its binding (and says so) - a workspace writes to exactly one client, never two.

---

## Trust signals

Log stakeholder temperature as structured tokens, not vibes:

```bash
fde log contact "Denise gone quiet since the demo" --signal amber
```

That writes a `[signal:amber]` token into `stakeholders.md`. The **latest dated token per engagement drives the trust column** in `fde status` and `fde dashboard`; a signal older than 21 days shows as **stale** - a prompt to check in, not a verdict. If no tokens exist, status falls back to the older keyword heuristic.

---

## Where files live

```text
~/fde-engagements/<client-name>/.fde/
  context.md      ← AI loads first each session (+ dated debrief blocks)
  brief.md        ← what they said (hypothesis)
  reality.md      ← what is actually true
  stakeholders.md ← contacts + [signal:…] tokens
  …
```

The workspace registry (written by `fde resume --init`) tells the AI and the hooks which engagement this workspace belongs to - no environment variable needed. (Advanced override: [install.md § FDEOPS_ENGAGEMENT](./install.md#advanced-fdeops_engagement-override).)

---

## Multiple engagements

```bash
cd ~/work/client-a && fde resume --init client-a
cd ~/work/client-b && fde resume --init client-b
```

One folder per client, one binding per workspace. Never merge contexts. `fde status` triages the whole portfolio (red > amber > green); `fde dashboard` renders it into one offline HTML fieldbook.

---

## What fdeops does not do

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
- [skills-reference.md](./skills-reference.md) - the phase methods
