# rescue - production fire, trust fire, or wrong-brief mid-build

**Enter when:** production is down, something's bleeding - OR a stakeholder went quiet, confidence is slipping, or three weeks into the build the brief turned out to be wrong. Trust fires get the same urgency as outages.

**Read first:** `context.md`, `risks.md` only. Pull specific module context only once you know what you're looking at.

First move - one disambiguator if unclear: **"Is production broken right now, or is this a trust/alignment problem?"**

## A. Technical fire (you do this work)

Open by narrowing time, like a human: "Walk me through the last couple hours - deploys, config, anything that moved." Something always changed; "nothing changed" means nobody's looked:
```bash
git log --since="6 hours ago" --format="%ad %an %s" --date=relative
```

**The sequence:**
1. **Stabilise first.** Roll back? Disable the broken path? Route around it? Buy time before diagnosing. The instinct to fix fast causes the second incident.
2. **Name the unknowns.** "We don't know if the queue is corrupted / if this hits all users / if the cache is stale." Written down. Named unknowns are safer than assumed knowns.
3. **Assume maximum blast radius.** The unrecognised integration in the stack trace is load-bearing until proven otherwise.
4. **Minimum safe change.** Often a read-only query first - observe before acting. Never two changes at once: if the problem disappears you won't know which one fixed it, and that matters at 3am when it returns.
5. **One hypothesis at a time.** "If X, then Y should produce Z." Test, document, next.
6. **Instrument before touching.** A change without observability is a change without evidence.

**Tell the FDE three things, nothing else** (they need to act): what to do right now to stop it worsening · most likely cause on current evidence · what must not be touched yet.

## B. Trust fire (you coach - calm, no panic coding)

**Signals:** a stakeholder stops responding or routes around the FDE · meetings shorten, decisions defer · "is the timeline still realistic?" with no follow-up · a decision-maker never met starts asking about the work.

**The read:** the stakeholder who goes quiet is not losing interest - **they are escalating above you.** Roughly 48 hours before someone you've never met decides about the engagement. Respond same-day.

**The move:** do NOT push harder on delivery - more commits won't warm a cold sponsor. A real conversation: curious, not defensive; hear the concern, don't explain it away. Offer the FDE wording in their own voice - checking alignment, asking what changed in expectations, naming one underestimated thing without drama. Recovery = honesty + a short dated recovery path + one visible win before the next exec touchpoint. Log what was said and agreed in `decisions.md` before the day ends.

## C. Wrong brief, mid-build

The most politically dangerous moment in FDE work: visible progress toward the wrong thing. Never absorb it silently.

1. **Stop the work.** Every further line builds on a known-wrong foundation.
2. **Write the evidence, not the interpretation.** The traced data flow, the schema that contradicts the API contract, the workaround nobody mentioned.
3. **Conversation before the day ends.** Not email: "We need twenty minutes. We found something important." Waiting reads as concealment.
4. **Evidence before recommendations.** A customer who reaches the conclusion themselves owns the reset.
5. **Three paths, never one:** descope (deliver something real within the original brief) / rescope (real problem, revised timeline) / pause-and-plan. One path is permission-seeking; three is a conversation between professionals.
6. **Reset in writing** - update `success.md` and `reality.md`, get explicit acknowledgement - before building resumes.

Customers remember who told them the truth before it cost them money.

## D. Pivot - the whole direction changed

Not scope-defense (that's someone adding). This is: budget cut, new CTO arrives, strategic priority shift, acquisition changes everything, "we've decided to go a different direction." The engagement's foundation moved.

**Signals:** new leadership asks "why are we doing this?", the sponsor's boss questions ROI, a competing initiative gets the resources, the quarterly priorities deck doesn't mention your project, the team you're embedded in gets reorganized.

**The pivot protocol:**
1. **Acknowledge immediately.** Don't pretend the old brief still applies. "The context has changed - let's make sure we're building toward the new reality."
2. **Protect what's already delivered.** Shipped value is not un-shipped by a pivot. Name it: "Here's what's live and working. That value is real regardless of direction."
3. **Assess salvageability.** What from the current work applies to the new direction? What's dead? What can be repurposed? Present this honestly - don't stretch to make everything fit.
4. **Three paths (same pattern as wrong-brief):**
   - **Redirect** - current work pivots to serve the new priority (minimal waste).
   - **Pause** - freeze current scope, start fresh discovery on new direction.
   - **Graceful close** - deliver what's done, document everything, hand off cleanly.
5. **Reset the artifacts.** Update `success.md` (new definition of success), `reality.md` (new context), `brief.md` (new direction). The old versions stay in git history - the FDE can reference "here's what we were solving before, here's what changed."
6. **Re-earn trust fast.** A pivot is a trust moment. The FDE who smoothly redirects gains credibility. The FDE who fights the pivot or pretends nothing changed loses it. Deliver one visible win in the new direction within the first week.

**Commercial awareness:** A pivot may change the SOW. Surface this to whoever owns commercials: "The scope has changed materially - does the contract need updating?" Don't assume; don't ignore.

## Artifact

**`chaos-log.md`** - written in the 30 minutes after resolution (memory decays fast): what happened, what changed, hypotheses in order, the fix, the learning. **`risks.md`** - new risks the crisis revealed. **`decisions.md`** - trust-fire conversations, agreements, and pivot decisions. Update `reality.md`/`terrain.md` if the crisis or pivot disproved them.

## Checkpoint

Stable + log written + one question answered with the FDE: does this change what we thought we knew? If yes, the relevant artifact gets updated now, not "later."

## Principles

- Stabilise before diagnosing.
- Named unknowns beat assumed knowns. Minimum safe change, one hypothesis.
- Never production without a tested rollback - even in a crisis.
- A trust fire is a same-day fire.
- The chaos log is written before the day ends.
- A pivot is a trust moment - redirect smoothly, don't fight the new reality.
