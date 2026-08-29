# small-prs - one small PR on someone else's codebase

**Enter when:** the change is bigger than one PR, it touches more than one file or system, or the customer needs to see something real every 2-3 days.

**Read first:** `decisions.md` (the plan), `terrain.md` (the danger zones), `context.md`. This is how you write code on a repo you do not own. `/ship` is go-live. This is the PR you take there.

One PR = one thing a user can do, with a test, that you can revert on its own. Not "all the APIs, then all the UI." Not a 2,000-line dump.

Five 200-line PRs get through their review. One giant PR gets rejected. On someone else's codebase, small and visible beats clever and large.

## Method (you do this work)

**1. One user action per PR. Never a layer.**

```
BAD (layers):
  PR 1: Build all database models
  PR 2: Build all API endpoints
  PR 3: Build all UI components
  PR 4: Wire everything together (and pray)

GOOD (one user action each):
  PR 1: User can create a payment (schema + endpoint + minimal UI) - testable
  PR 2: User can view payment status (query + endpoint + UI) - testable
  PR 3: Payment retry on failure (logic + endpoint + UI feedback) - testable
  PR 4: Admin can void a payment (auth + logic + UI) - testable
```

Each PR is independently revertible.

**2. Before you start this PR:**

- [ ] It is in `decisions.md` with acceptance criteria (happy + unhappy path)
- [ ] Blast radius declared: which files, which systems, which users affected
- [ ] Rollback named: "revert this PR" or something more specific
- [ ] No dependency on an unmerged PR (if dependent, state it and merge in order)
- [ ] `Kill if` is written - the observation that stops this PR

**3. The loop.** For each PR, in this order:

```
Read existing code in the area (search before creating)
  → Characterise what is already there (their tests, their runner)
    → Implement the smallest path that works
      → Prove it on their staging (below)
        → Cleanup pass (dedupe, simplify - behaviour unchanged)
          → Self-review against acceptance criteria
            → Commit with a message the client's team can read
              → Update decisions.md + delivery.md
```

**Prove it on their staging.** A green check on your laptop is not delivery. Before this PR is done:

- Run **their** test command, typecheck, or smallest proving path. Write the command and the result in `delivery.md`.
- If the signer in `success.md` cannot reject this on a screen they already use, it is not proven.
- Staging they operate beats a local demo. If you have no staging: `unknown - ask:` who owns an environment, then stop pretending it shipped.
- Model in the path: `eval-pack` until `evals.md` says SHIP. Do not skip because "it looked right in chat."

The proof is whatever this client already believes, plus one new receipt they can replay.

**4. Size.** Each PR targets:

| Metric | Target | Why |
|--------|--------|-----|
| Lines changed | 100-300 | Reviewable in one sitting |
| Time to implement | 30-90 minutes | Testable before context decays |
| Files touched | 1-5 | Blast radius stays containable |
| Tests added | ≥1 per new behaviour | Proves this PR; guards against regression |

Larger than 300 lines → split first. "It's all connected" means the design needs work, not a bigger PR.

**5. Show it.** Every 2-3 PRs, something the customer can see:

- A working endpoint they can hit
- A UI change they can click
- A metric that moved
- A risk that was retired

Technical progress invisible to stakeholders is trust decay. `delivery.md` gets updated after every visible PR.

**6. The scope trap.** Mid-PR discoveries - "this module also needs updating," "I should refactor this while I'm here":

- If it's in `decisions.md`: do it as a separate PR.
- If it's NOT in `decisions.md`: log it as a scope receipt (see `hold-scope.md`), don't touch it.
- Ugly code outside this PR stays ugly. That is discipline, not laziness.

## Artifact

**`decisions.md`** - each PR: what was implemented, what was tested, what was deferred, `Kill if`.

**`delivery.md`** - each visible PR in business language: what someone can do now that they could not before.

## Checkpoint

After each PR: tests pass (state the command and result), acceptance criteria met, blast radius as declared, `Kill if` still false. After every 2-3 PRs: stakeholder visibility confirmed - what did they see, and what's their signal?

## Worked example

Acme, payment retry. Plan Now has three PRs, not "the payments rewrite."

PR 1 is *user sees retry status on a failed payment* - schema + endpoint + the existing ops screen, 180 lines, their `pytest -k payments` green, revert is the PR. `Kill if:` the signer cannot reject it on the screen they already use. Ugly retry-queue code two files over stays ugly. `decisions.md` logs the PR; `delivery.md` says ops can see a retry without opening the spreadsheet.

Marco sees it on staging they operate. That is the proof. Local green was not.

## Principles

- One user action per PR. Layers are untestable until assembled.
- 100-300 lines. Larger means split first.
- Every PR is independently revertible. If it isn't, the design is coupled.
- Visible progress every 2-3 PRs. Technical progress alone is trust decay.
- The ugly code outside this PR stays ugly. That's discipline, not laziness.
