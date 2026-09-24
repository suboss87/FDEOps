# debug - Find and repair the cause

A useful repair explains the customer's failure and shows why the changed path now behaves correctly.

**Use when:** a failure, regression, incident symptom, or misleading output needs investigation, whether or not it can yet be reproduced.

Follow [task context](task-context.md); permitted supplied evidence is enough without `.fde/`. During an incident, follow authorized containment procedures before diagnosis. Investigation authority does not authorize production writes.

## Establish what failed

Capture expected and observed behavior, the trigger or input, revision, environment, and last known working state. Keep useful errors and timestamps, without secrets or raw private data. Label unverified reports as reports.

Inspect the affected path, callers, relevant changes, and existing tests. Reproduce with the smallest representative case in a permitted environment when practical. If reproduction is unavailable, state the gap and use traces or other safe observations to distinguish causes. Keep investigating without promoting a hypothesis to a finding. Ask for the smallest permitted observation that distinguishes the remaining causes; an operator-run check or approved excerpt may be enough without granting the agent additional access.

## Test the explanation

Keep a short hypothesis list with a predicted observation and a discriminating check for each. Trace values and control flow across the actual boundary. Change one relevant variable at a time so the result tells you something.

After two unsuccessful repair cycles, reassess the evidence and approach. That is a signal to reconsider, not proof that a hypothesis is false. Continue useful investigation and identify any missing decision or access.

## Repair and verify the affected path

Fix the cause at the appropriate layer, preserving evidence of the original failure. Consider other callers, stale data, retries, concurrency, and permissions; leave unrelated cleanup out.

Add a regression check when it can meaningfully reproduce the bug. Show failure before and success after when practical, and disclose when the before-state could not be checked. Exercise the original journey and run affected adjacent and required checks using [verification](verification.md). Review the diff; use [review](review.md) for substantial or risky fixes.

*Fictional example:* Northstar's imports sometimes duplicate orders. A lost-response trace suggests a retry after a committed write. If staging cannot reproduce it, report the supported hypothesis and missing evidence rather than calling a longer timeout a root-cause fix.

## Completion

Return the cause and evidence, repair, original journey or reproducer result, adjacent checks, and unresolved uncertainty. A disappearing symptom without discriminating evidence establishes a mitigation, not a demonstrated root cause.

In an engagement, put the incident/fix receipt in the appropriate existing record under its write rules; standalone work can return it directly. Release or rollback needs the existing operational authority and [ship](ship.md) or recovery procedure.
