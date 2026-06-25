# handoff-engineering - making yourself replaceable is the goal

**Enter when:** the engagement is entering its final phase, the customer team needs to operate without the FDE, a new FDE is taking over, or the sponsor asks "what happens when you leave?"

**Read first:** `delivery.md`, `terrain.md`, `reality.md`, `decisions.md`, `context.md`, `stakeholders.md`. The handoff is built from the full engagement record. Load `trust-profile.md` for operational boundaries.

The mark of a great FDE engagement is that the team can operate without you. A handoff that requires a callback in six weeks means the engagement didn't end - it paused. Handoff engineering is deliberate: it's designed, tested, and verified before the last day.

## Method (you do this work)

**1. The handoff inventory.** Everything the team needs to operate, categorised:

| Category | What to hand off | Test: can they do it alone? |
|----------|-----------------|---------------------------|
| **Code knowledge** | Architecture decisions (`decisions.md`), why the code is shaped the way it is | Team member can explain the three most important design decisions |
| **Operational** | Deploy, rollback, incident response, monitoring | Team member runs the deploy and rollback procedure independently |
| **Tribal** | The things only you know - the workaround, the contact, the context | Written in `handoff.md` and reviewed with the person who'll carry it |
| **Political** | Stakeholder dynamics, approval chains, who to call when | Documented in `stakeholders.md` with signal history |
| **Data/AI** | Model versions, retraining triggers, drift monitoring, fallback paths | Owner named for each AI component; kill switch documented |

**2. The 2am document.** Written for the person woken up on a Saturday night with zero context:

```markdown
# Operations runbook - <system name>

## The 3 things that will break (and the fix for each)

### 1. <most likely failure>
Symptom: <what they'll see>
Cause: <most likely why>
Fix: <exact steps, copy-pasteable commands>
Who to call if this doesn't fix it: <name, contact>

### 2. <second most likely failure>
...

### 3. <third most likely failure>
...

## Deploy
Command: <exact command>
Time: <how long it takes>
Verify: <how to confirm it worked>
Rollback: <exact command and expected time>

## Alerts
| Alert | Means | Do this |
|-------|-------|---------|
| <alert name> | <plain English> | <action or link to detailed runbook> |

## Contacts
| Who | When to call | How |
|-----|-------------|-----|
| <name> | <scenario> | <phone/slack/email> |
```

**3. The knowledge transfer sessions.** Not a document dump - three structured sessions:

| Session | Focus | Attendees | Duration | Output |
|---------|-------|-----------|----------|--------|
| **Architecture walkthrough** | Why, not what. The decisions, the trade-offs, the things that almost went wrong. | Full team | 60–90 min | Recording + Q&A log |
| **Operational drill** | Deploy, rollback, incident response. They do it, you watch. | On-call team | 60 min | Drill report with confidence level |
| **Edge-case handover** | The things that aren't in any document. The workarounds, the fragile spots, the "ask Sarah because she's the only one who knows." | Team lead + 1 | 30 min | Additions to `handoff.md` |

**4. The confidence check.** After the knowledge transfer, score the team's readiness:

| Area | Confidence (1–5) | Evidence |
|------|------------------|----------|
| Daily operations | | Can they deploy and rollback without help? |
| Incident response | | Did they complete the drill within acceptable time? |
| Architecture decisions | | Can they explain why the system is built this way? |
| AI components (if any) | | Do they know how to monitor, retrain, and disable? |
| Stakeholder management | | Do they know who to update and how? |

**Average below 3.5 → the handoff is not complete.** Extend if possible; if not, document the gaps and name the risk.

**5. The successor brief.** If a new FDE is taking over, write a brief that gets them operational in one hour:

```markdown
# Successor brief - <engagement name>

## In 30 seconds
<The real problem, the solution, where it stands>

## Read these files first
1. context.md - current state
2. reality.md - the real problem (not the brief)
3. decisions.md - what was decided and why
4. stakeholders.md - who matters and their current signal
5. risks.md - what's dangerous right now

## The three things I wish I'd known on day one
1. <thing>
2. <thing>
3. <thing>

## The one thing that will bite you
<specific warning>
```

**6. The clean exit.** Before the last day:

- [ ] All access returned or transferred (repos, environments, admin panels)
- [ ] No personal credentials left in the system (API keys, tokens, SSH keys)
- [ ] `.fde/` folder handed to the successor or archived with the team
- [ ] Final status sent to sponsor (see `status.md`)
- [ ] Retrospective completed (see `close.md`)
- [ ] Patterns extracted (see `pattern-extract.md`)

## Artifact

**`handoff.md`** - the 2am document + the operational inventory. The most important file the engagement produces after the code itself.

**`context.md`** - final update: engagement status, handoff confidence, named gaps.

## Checkpoint

The acid test: "Can the team run this system for 30 days without calling you?" If yes → handoff complete. If no → name exactly what's missing, and either fix it or document the risk for the sponsor.

## The permanent crutch anti-pattern

Warning signs you've become a dependency instead of a deliverer:
- The team defers decisions until you're in the room
- "Can you just stay one more month?" (translation: the handoff hasn't started)
- You're the only person who's run the deploy or the rollback
- The sponsor introduces you as "part of the team" in month 4
- The customer calls you within a week of "close"

If you see 2+: accelerate the handoff immediately. The longer you stay past usefulness, the harder it is for the team to believe they can operate alone. A great FDE engagement ends with the team forgetting they needed you.

## Principles

- The goal of every engagement is to make yourself replaceable.
- The 2am document is the real handoff - everything else supports it.
- Knowledge transfer is three sessions, not a doc dump.
- A confidence score below 3.5 means the handoff isn't done.
- The successor brief gets the next FDE operational in one hour or it's too long.
- Clean exit: no personal credentials left behind, ever.
- If you're still indispensable after close, the engagement failed on the most important criterion.
