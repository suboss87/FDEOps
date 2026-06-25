# fdeops usage guide

**What it is:** Engagement OS for **you** (human FDE) + your **AI coding agent** - `@fde` routes phases; `.fde/` holds memory on your machine.

**Terminology:** [README § Who this is for](../README.md#who-this-is-for) - **“agent” = AI software, not a human.**

**Start here:** [README](../README.md) (Quickstart → How it works → Without vs with).

Day-to-day reference below.

---

## New here? (5 minutes)

1. Read **Who this is for** and **Without fdeops vs with fdeops** in the README
2. Run [Quickstart](../README.md#quickstart)
3. Skim [examples/acme-payments/](../examples/acme-payments/) Day 1 → Day 10
4. In your **AI chat** (not email to a person): `@fde` + your actual situation

You do not read the phase methods. **`@fde` routes the AI and loads the right one.**

---

## What to type (in the AI chat only)

| You are… | Example message to the **AI coding agent** |
|----------|---------------------------------------------|
| Starting | `@fde New embed. First meeting tomorrow. Brief says: …` |
| Unsure of real problem | `@fde Workshop done. Ops says they use a spreadsheet nightly.` |
| Ready to code | `@fde Ship smallest slice by Friday in module X.` |
| Production broken | `@fde API 500 since 2pm deploy.` |
| Sponsor went quiet | `@fde VP stopped replying; still building old scope.` |
| Handing off | `@fde Engagement ends Friday. Need handoff doc.` |
| Two clients | `@fde This is for Project B - sponsor issue on payments.` |

**You** type these. The **AI** executes routing and drafts. **You** approve what ships.

---

## Where files live

```text
~/fde-engagements/<engagement-name>/.fde/
  context.md      ← AI loads first each session
  brief.md        ← what they said (hypothesis)
  reality.md      ← what is actually true
  stakeholders.md
  …
```

Tell the **AI** where the folder is (shell or `~/.claude/FDEOPS-CLAUDE.md`):

```text
FDEOPS_ENGAGEMENT=~/fde-engagements/<engagement-name>/.fde
```

---

## Multiple engagements

```bash
node bin/install.js init client-a    # from fdeops clone
node bin/install.js init client-b
```

One folder per client. Never merge contexts. Ask `@fde` for "status across all my projects" - it generates a portfolio dashboard.

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
- [skills-reference.md](./skills-reference.md) - the phase methods
