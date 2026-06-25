# scope-defense - holding the line without losing the relationship

**Enter when:** "also can you…" mid-build, a stakeholder adds requirements without adjusting timeline, the FDE feels scope creeping but can't name it, or `success.md` no longer matches what's being asked.

**Read first:** `success.md` (the agreed boundary), `decisions.md`, `context.md`. Load `stakeholders.md` to know who's asking and their signal.

Scope creep is the leading cause of FDE engagement failure - not technical complexity, not timeline pressure. It's silent: no single request feels unreasonable, but twenty reasonable requests add three months. The skill is saying "that's phase two" without the customer hearing "no."

## Method (you do this work)

**1. Detect before it compounds.** Three patterns that signal creep before it's named:

| Pattern | What it sounds like | What's actually happening |
|---------|--------------------|--------------------------| 
| **The friendly addition** | "While you're in there, could you also…" | Adjacent work getting absorbed without timeline adjustment |
| **The evolved requirement** | "Oh, what I actually meant was…" | The original scope was never clear enough - `success.md` needs updating |
| **The stakeholder swap** | A new person starts requesting features the original sponsor didn't | Power shifted; the real scope is being rewritten informally |

**2. The scope receipt.** Every request gets logged with its origin and cost - not as bureaucracy, but as evidence for the conversation that's coming:

```markdown
## Scope change - <date>
Requested by: <who>
Request: <what, in their words>
Impact: <hours/days added, what gets pushed>
Status: absorbed / deferred to phase 2 / needs conversation
```

Log via `fde log decision "scope change: <summary> - requested by <who>, impact: <estimate>"` or direct append to `decisions.md`.

**3. The three-bucket response.** Never say "no" - say "here's where it fits":

| Bucket | What you say | When to use |
|--------|-------------|-------------|
| **This phase** | "That fits - I'll add it to the current plan. Timeline stays the same." | The request is small and genuinely within the agreed scope |
| **Next phase** | "That's real - let me capture it properly so it doesn't get lost. It's phase-two work because <reason>." | The request is valid but adds to the timeline |
| **Separate engagement** | "That's a different problem - it deserves its own brief and its own timeline." | The request is a new project wearing a small-ask costume |

**The key phrase: "Let me place it."** Not "that's out of scope" (adversarial) or "sure" (absorbed). "Let me place it" signals you're taking it seriously while buying time to assess the real cost.

**4. The accumulation conversation.** When the scope receipts show a pattern - typically 3–5 absorbed changes - the FDE needs a conversation with the sponsor:

Frame it as **protection, not complaint:**
> "We've absorbed five changes since the original agreement. Each one made sense individually. Together, they've added roughly two weeks. I want to make sure the timeline expectation still matches - should we adjust the delivery date, or reprioritise to keep the original date?"

Evidence-based: point to `decisions.md` scope receipts with dates and requesters. The sponsor who sees the pattern is an ally; the sponsor who discovers the delay at the end is a problem.

**5. The commercial boundary.** In paid engagements, scope creep silently moves billing and liability:

- If the engagement is time-and-materials: scope creep is the client's money, but flag it - they deserve to know what they're buying.
- If the engagement is fixed-price: every absorbed scope change is a gift the FDE's company didn't agree to. Surface it to whoever owns the commercials.
- If the engagement has a success fee: scope changes that move the success criteria affect compensation. Log it.

## Artifact

**`decisions.md`** - scope receipts, dated and attributed. The running record the accumulation conversation references.

**`success.md`** - updated ONLY when a scope change is explicitly agreed. Never silently expanded. Each update: what changed, who agreed, date.

## Checkpoint

Weekly check: count the scope receipts since last conversation. Three or more unaddressed → recommend the accumulation conversation to the FDE. Zero → "scope holding, `success.md` current."

## Principles

- "Let me place it" is the phrase. Not "no," not "sure."
- Every scope change gets a receipt. The receipt is the evidence.
- Three unaddressed scope changes → accumulation conversation.
- Scope creep kills engagements that technical failure couldn't.
- `success.md` is a contract - update it explicitly or defend it.
- The FDE who absorbs everything is liked for three weeks and blamed for three months.
