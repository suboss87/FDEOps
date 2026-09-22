# close - Transfer operations

**Context:** apply [task context and evidence](task-context.md) before using the named records below.

For a standalone handoff draft, use the supplied notes and project evidence; no customer record is required. The `fde handoff` CLI exports an existing record. Use it only when a record is selected, not to create one merely for a draft.

**Enter when:** the engagement is ending - the customer team must run this without the FDE.

**Read first:** for standalone work, use the supplied permitted operating notes, evidence and ownership; no engagement binding or CLI command is required. For a bound engagement, use bounded `fde handoff` or `fde resume`, then `fde recall <topic>` for relevant client patterns, earlier retrospectives, and missing evidence. Never initialize records merely to draft a handoff. Build the picture through relevant excerpts, not a full-directory load. Consult `terrain.md` only for code paths needed by the successor.

A handoff transfers the ability to operate the system, not just its files.

## Match the requested output

- **Draft a handoff:** return the operating summary, evidence and gaps from supplied context. Do not require a retrospective, initialized record or completed value measurement to produce a useful draft. Missing evidence limits readiness claims, not drafting. Follow steps 0, 3 and relevant operating details in 4, then check the draft as a lookup tool. Skip the closure-only steps and artifacts.
- **Assess readiness or close the engagement:** apply the close gates below. Reuse existing evidence and agreed acceptance rather than restarting the engagement.

Lead with what is being transferred, what the receiving team can demonstrably do, what is untested, and the next action with its owner or ownership gap. Label claims as **on record**, **proposed**, or **customer accepted** so a handoff reader can distinguish the saved history from an open recommendation and an accepted outcome. A document can be ready for review while operational handover remains incomplete.

## Method

**0. Find the operating gap.** Use supplied evidence to identify what still depends on the departing engineer. Ask “What will bite them when you’re gone?” only if the answer would change the handoff; do not repeat information already supplied.

**1. Closure only: the retrospective.** Work through, blame-free and specific:
- Did the real problem match the brief? (Compare `brief.md` vs `reality.md` - you have the receipts.)
- Which trust moments mattered?
- What did the codebase teach that `terrain.md` didn't know at the start?
- Which risk almost became real?
- AI components: did they behave in production? What failure modes did the prototype hide? Is the team equipped to maintain them?

**1b. Closure/readiness assessment only: value + receipts gate (refuse green close if any fail):**
- Primary value bucket in `success.md` matches what the sponsor funded; at least one ledger row has **Measured** (not forever-`pending`) with evidence **and a named customer-side owner in Accepted by** for that bucket - or the retrospective explicitly records “not measured; sponsor accepted pending.” A measured-but-unaccepted number closes as `claimed`; say so in the retrospective rather than closing green on arithmetic nobody signed.
- The receiving team has accepted the operating responsibilities with a source. Critical operating capabilities (such as access, failure triage, recovery and disabling an AI action) are recorded as verified, failed or untested under the receiving team's intended access. Reuse applicable accepted ownership and drill evidence; a lookup exercise or a run using only the departing FDE's credentials is insufficient. Unresolved critical gaps prevent green closure.
- Audit receipt exists for the final shipped path (exceptions/operating map walked; cite file).
- Eval receipt: **n/a if no AI**, else final scoped eval result + operating owner and required human-review or bounded-automation authority recorded; kill switch / fallback named in `handoff.md`.
- One line in the retrospective: which bucket moved, by how much, vs baseline.

**2. Closure only: the pattern.** Anything that happened here and may happen again - a compliance approach, a migration pattern, a stakeholder dynamic - is a candidate for the client's `patterns.md`. Use [encode-pattern](encode-pattern.md) to record applicability, counterexamples, and evidence. Cross-client generalizations need explicit approval and a user-chosen export destination under the applicable policy; closing an engagement does not authorize an automatic scan or export.

**3. The handoff.** Operational knowledge for the person woken at 2am, not technical documentation: the relevant observed failures, their recovery steps and any untested procedure · who holds the tribal knowledge · what each alert means · deploy and rollback in plain language. AI components additionally: model version, what normal output looks like (so drift is recognisable), fallback behaviour, who owns evaluation and corrective changes, and how to disable or contain the AI path using the supported fallback. Do not assume retraining is available or appropriate.

**4. Transformation engagements - four extra answers in `handoff.md`:**
- Who owns AI governance after the FDE leaves? (Who can pull a model from production?)
- The response trigger: an agreed signal, threshold, observation window, owner and action. For example, a critical action-boundary failure can require pausing that path and investigating. Diagnose whether the cause is data, retrieval, configuration, integration or model behavior before choosing a correction; retraining is only one possible response.
- The operating model at scale: who coordinates twenty use cases across five teams?
- Decision authority for new use cases: intake, risk assessment, approver.

## Artifact

For a draft-only request, return the handoff in the requested format with evidence gaps and readiness status. Do not create retrospective or pattern artifacts. The following record destinations apply when closing a bound engagement under its write rules.

**`retrospectives/YYYY-MM-DD-<engagement>.md`** - one file per close, retaining dated lessons for targeted recall within this client. **`patterns.md`** - client pattern candidates and evidence. **`handoff.md`** - the 2am document, including the deployed revision and the policy, access, and ownership evidence current at handoff. If the project reopens, use [land](land.md) to recheck these before dependent action; closure evidence remains historical.

## Checkpoint

**Check the handoff as a lookup tool.** Give the intended operator one realistic task, such as finding the owner and recovery steps for a failed run. Can they locate the answer and its source in the permitted handoff without your explanation? A reader finding the instructions is not proof they can execute them; verify operation separately in the agreed safe environment. Correct the passage they could not use, rather than adding a longer introduction.

If the operator is unavailable, a fresh reviewer can attempt the same lookup using only the permitted draft and task. Report this as a simulated clarity check, not operator validation, customer approval, or a green close. Claim independent review only if a separate reviewer actually performed it; identify the reviewer and evidence available. If none is available, perform a labeled self-check and report independent review as unperformed. Use one focused pass for a consequential handoff; do not add a committee or a second approval ritual.

For closure or readiness assessment, report to the FDE: did the engagement achieve `success.md` · 2-3 lessons that matter · is the pattern worth encoding · is the handoff complete or where are the gaps. Also: value bucket + audit receipt green; eval **n/a or green**. Pending Measured without sponsor acceptance = gap, not green close. Honest - a gap named now is cheaper than a callback in six weeks.

## Worked example

Acme, twelve weeks in, the FDE is rolling off.

Retrospective against the receipts: `brief.md` asked for monitoring, `reality.md` proved it was ownership - and the delta is the most useful paragraph in the file, because it is exactly the argument the next engagement will need.

The close gate bites in a useful way. The ledger shows detection at 12 minutes measured across two real incidents, but **Accepted by** is empty - Marco confirmed it in Slack, but Denise, the recorded acceptance owner, has not accepted the result. Her authority comes from the agreed acceptance record, not her finance title or the fact that she raised the original problem. So it closes as `claimed` with a one-line retrospective note and a named next step, rather than a green close on a number the agreed acceptance owner has not accepted.

`handoff.md` is written for the person woken at 2am: the observed failure modes, what the page means, how to re-run manually the way Marco does, and who holds the tribal knowledge (Raj, who built the original job - credited, because he protects it now). `patterns.md` gets *"unowned job" presents as "unmonitored job"* - it has now happened twice.

## Principles

- Done = the customer operates without you.
- No named value bucket moved (or sponsor-accepted pending) = not a green close.
- The retrospective is an investment in the next engagement, not a post-mortem.
- Encode what repeated. The same lesson learned twice is a process failure.
- Write the handoff for 2am.
