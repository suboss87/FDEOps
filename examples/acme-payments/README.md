# Worked example: acme-payments (fictional)

Copy the **structure**, not the company names. These files show what a real week-1 → week-2 arc looks like in `.fde/`.

Follow [README § The basic workflow](../../README.md#the-basic-workflow) while you read.

## Setup (your machine)

```bash
cd fdeops && node bin/install.js
node bin/install.js init acme-payments
export FDEOPS_ENGAGEMENT=~/fde-engagements/acme-payments/.fde
```

Open your workspace for this embed. Type `@fde`.

> Files below live under `~/fde-engagements/acme-payments/.fde/` after `init`.  
> This folder in the repo is a **reference copy** for readers.

---

## Timeline

### Day 1 - Land

**You:** `@fde First workshop tomorrow. Brief: EU payment API returns 500. CTO on the invite, no ops lead named.`

**AI coding agent should:** route land - surface brief gaps, start `stakeholders.md`, do not start coding.

| File | What gets written |
|------|-------------------|
| [brief.md](./.fde/brief.md) | Stated problem + gaps |
| [stakeholders.md](./.fde/stakeholders.md) | Who is on the invite vs who decides |
| [context.md](./.fde/context.md) | Phase: land, next: workshop |

---

### Day 5 - Discover

**You:** `@fde Workshop done. Ops says engineers fix API but finance still reprocesses EU rows in Excel every night.`

**AI coding agent should:** route discover - update `reality.md`; brief hypothesis was wrong.

| File | What gets written |
|------|-------------------|
| [reality.md](./.fde/reality.md) | Real spec = spreadsheet ingest, not “fix API” |
| [success.md](./.fde/success.md) | Redefine done: automated ingest + audit trail |

---

### Day 10 - Build & ship slice

**You:** `@fde Ship thinnest path by Friday. Legacy `payments-eu` module, no tests in repo.`

**AI coding agent should:** route engineering - characterise, small PR, `decisions.md` + `delivery.md`.

| File | What gets written |
|------|-------------------|
| [terrain.md](./.fde/terrain.md) | Module map, test gap |
| [decisions.md](./.fde/decisions.md) | Slice scope + review outcome |
| [delivery.md](./.fde/delivery.md) | What shipped, demo date |

---

## When this example does not apply

- **No code access yet** - stop after Day 1 files; skip terrain/delivery until access exists.
- **Regulated data** - add `trust-profile.md` before any codegen (see healthcare overlay in skills).
