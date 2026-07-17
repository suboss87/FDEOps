# fdeops

**Your AI coding agent forgets your client every morning. fdeops remembers.**

Local-first engagement fieldbook for Forward Deployed Engineers — memory under `.fde/` + one `@fde` router. Not an OS. Not a coworker.

---

## How it works

### The week

| When | What you do |
|------|-------------|
| **Monday** | Open agent → TRIAGE loads (trust, phase, next) |
| **After a meeting** | `fde debrief --smart notes.txt` → review → `--apply` |
| **Before a walk-in** | `fde prep "Denise sync"` |
| **Scope fight** | `fde receipts descope` (+ memory git hash) |
| **Friday** | `fde status` → sponsor update from the real record |

Same engagement folder every time. Git versions `.fde/`. Your AI coding agent reads it on every session.

<details>
<summary><strong>All methods (land → close)</strong> — below the fold</summary>

| Method | When |
|--------|------|
| `land` | First day — bind people, success, risks |
| `discover` | Map systems before you change them |
| `prep` | Start of week — week's focus from memory |
| `status` | Mid-engagement health check |
| `triage` | Something broke — decide in 60s |
| `debrief` | End of week — compound into memory |
| `garden` | Memory hygiene — archive stale / promote truth |
| `doctor` | Is `.fde/` healthy? |
| `ship` | Before the blast — challenge, then go |
| `red-team` | Adversarial pass before ship |
| `close` | Engagement ends — archive + handoff |

Full method map: [`docs/skills.md`](docs/skills.md)

</details>

---

## Quickstart

```bash
npx skills add suboss87/fdeops          # @fde skill (any agent that supports skills)
# or Claude: /plugin marketplace add suboss87/fdeops
npx fdeops resume --init haulline       # bind this workspace → ~/fde-engagements/haulline
```

Then work as usual — `@fde` routes; the CLI owns scan, memory, receipts.

**CLI-only path** (npm global):

```bash
npm install -g fdeops
fdeops install --global
mkdir -p ~/fde-engagements && cd ~/fde-engagements
fdeops init acme
cd acme && git init && git add . && git commit -m "init engagement"
```

| Flag | When |
|------|------|
| `--global` | Install once for your user |
| `--here` | This engagement only |
| *(default)* | Project + user, Claude Code |

<details>
<summary>Cursor · uninstall · upgrades · path override</summary>

```bash
fdeops install --cursor --global   # Cursor project rules
fdeops uninstall                   # remove installed copies
fdeops upgrade                     # pull latest from npm
```

Multiple engagements: `export FDEOPS_ENGAGEMENT=~/fde-engagements/acme`

Full install notes: [`docs/install.md`](docs/install.md)

</details>

---

## Engagement memory

Everything lives under `.fde/` in the engagement folder:

| Path | What |
|------|------|
| `.fde/people.md` | Who matters, trust, notes |
| `.fde/log.md` | Running notes (append-only) |
| `.fde/context.md` | Stack, constraints, systems |
| `.fde/signals.md` | Verified facts + open questions |
| `.fde/decisions.md` | Choices and why |
| `.fde/risks.md` | Risks and owners |
| `.fde/meta.json` | Phase, checksums, lock |

Writes are **bound** (engagement required), **locked** (one writer), **atomic**, and **refused** when they look like secrets. Corrupt or incomplete state fails closed — never "green" by accident.

Commit `.fde/` like code. That's the whole compounding loop.

---

## Without fdeops vs with fdeops

| Without | With |
|---------|------|
| Context dies when the chat ends | `@fde prep` resurfaces last week's risks |
| "We're fine" until the blast | Trust + signals force the hard conversation |
| Notes scatter across Notion/Slack | One local fieldbook, git-versioned |
| Agent invents stakeholders | Bind-required writes — no engagement, no write |

---

## Who this is for

FDEs, solutions engineers, and anyone dropped into a customer codebase who has to earn trust, ship under ambiguity, and not lose the thread between Mondays.

Not for: generic chatbots, multi-tenant SaaS dashboards, or "AI coworker" shells.

---

## Principles

1. **Local-first** — memory on your disk, not a vendor cloud
2. **Compounding** — debrief is the product; chat is disposable
3. **Refuse bad writes** — secrets, symlinks, unbound paths
4. **Honest status** — corrupt ≠ green; worst stakeholder trust wins
5. **Thin packaging** — one skill (`@fde`), many methods — not a skill tree

---

## Docs

| Doc | |
|-----|--|
| [Install](docs/install.md) | Global, Cursor, upgrades |
| [Usage](docs/USAGE.md) | Methods in depth |
| [Skills](docs/skills.md) | `@fde` method reference |
| [CHANGELOG](CHANGELOG.md) | What changed |

```bash
npm test
node bin/check.js
```

---

## License

MIT
