# close - handoff and pattern extraction

**Enter when:** the engagement is ending - the customer team must run this without the FDE.

**Read first:** `context.md`, `reality.md`, `success.md`, `delivery.md`, `decisions.md`. The only phase that needs the full picture. Load `terrain.md` only if the handoff needs codebase-specific guidance.

The engagement doesn't end at ship. It ends when the customer can maintain what was built without calling.

## Method (you do this work, with the FDE's answers)

**0. The opening question:** "What will bite them when you're gone?" Their answer shapes everything written below.

**1. The retrospective.** Work through, blame-free and specific:
- Did the real problem match the brief? (Compare `brief.md` vs `reality.md` - you have the receipts.)
- Which trust moments mattered?
- What did the codebase teach that `terrain.md` didn't know at the start?
- Which risk almost became real?
- AI components: did they behave in production? What failure modes did the prototype hide? Is the team equipped to maintain them?

**1b. Value + receipts close gate (refuse green close if any fail):**
- Primary value bucket in `success.md` matches what the sponsor funded; at least one ledger row has **Measured** (not forever-`pending`) with evidence **and a named customer-side owner in Accepted by** for that bucket — or the retrospective explicitly records “not measured; sponsor accepted pending.” A measured-but-unaccepted number closes as `claimed`; say so in the retrospective rather than closing green on arithmetic nobody signed.
- Audit receipt exists for the final shipped path (exceptions/operating map walked; cite file).
- Eval receipt: **n/a if no AI**, else final golden/eval result + HITL owner recorded; kill switch / fallback named in `handoff.md`.
- One line in the retrospective: which bucket moved, by how much, vs baseline.

**2. The pattern.** Anything that happened here and will happen again - a compliance approach, a migration pattern, a stakeholder dynamic - gets encoded for reuse. **If you do it twice, encode it.**

**3. The handoff.** Operational knowledge for the person woken at 2am, not technical documentation: the 3 things that will break and the fix for each · who holds the tribal knowledge · what each alert means · deploy and rollback in plain language. AI components additionally: model version, what normal output looks like (so drift is recognisable), fallback behaviour, who owns retraining, **how to disable the AI path without taking down the feature** - without this the team turns it off at the first misbehaviour and it stays off.

**4. Transformation engagements - four extra answers in `handoff.md`:**
- Who owns AI governance after the FDE leaves? (Who can pull a model from production?)
- The retraining trigger, exactly: "precision < 0.82 on validation for 3 consecutive weeks → <owner> retrains." A number, a condition, an owner - not "when performance drops."
- The operating model at scale: who coordinates twenty use cases across five teams?
- Decision authority for new use cases: intake, risk assessment, approver.

## Artifact

**`retrospectives/YYYY-MM-DD-<engagement>.md`** - one file per close (separate files make cross-engagement patterns scannable). **`patterns.md`** - reusable patterns extracted. **`handoff.md`** - the 2am document.

## Checkpoint

Direct assessment to the FDE: did the engagement achieve `success.md` · 2–3 lessons that matter · is the pattern worth encoding · is the handoff complete or where are the gaps. Also: value bucket + audit receipt green; eval **n/a or green**. Pending Measured without sponsor acceptance = gap, not green close. Honest - a gap named now is cheaper than a callback in six weeks.

## Worked example

Acme, twelve weeks in, the FDE is rolling off.

Retrospective against the receipts: `brief.md` asked for monitoring, `reality.md` proved it was ownership — and the delta is the most useful paragraph in the file, because it is exactly the argument the next engagement will need.

The close gate bites in a useful way. The ledger shows detection at 12 minutes measured across two real incidents, but **Accepted by** is empty — Marco confirmed it in Slack, Denise (finance) never did, and Denise is whose escalation started the engagement. So it closes as `claimed` with a one-line retrospective note and a named next step, rather than a green close on a number nobody with budget agreed to.

`handoff.md` is written for the person woken at 2am: the three things that break, what the page means, how to re-run manually the way Marco does, and who holds the tribal knowledge (Raj, who built the original job — credited, because he protects it now). `patterns.md` gets *"unowned job" presents as "unmonitored job"* — it has now happened twice.

## Principles

- Done = the customer operates without you.
- No named value bucket moved (or sponsor-accepted pending) = not a green close.
- The retrospective is an investment in the next engagement, not a post-mortem.
- Encode what repeated. The same lesson learned twice is a process failure.
- Write the handoff for 2am.
