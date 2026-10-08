# build - Implement a verifiable increment

Build the smallest complete change that demonstrates the agreed customer outcome through the real entry point.

**Use when:** agreed behavior needs implementation in a new or existing repository. Use [debug](debug.md) for broken behavior and [integrate](integrate.md) for a system boundary.

Follow [task context](task-context.md). Supplied permitted context or an existing engagement record can provide the contract; do not initialize `.fde/` merely to write code.

## Understand the repository and outcome

Inspect repository instructions, working tree, relevant callers, examples, and test commands. Preserve unrelated edits. Follow its branch policy and choose checkout isolation according to overlapping work. Identify the dependencies and interfaces the change touches. Before changing an untested legacy path, use targeted characterization checks to capture undocumented behavior callers rely on; separate that behavior from the intended change.

State the observable outcome, constraints, and acceptance checks, reusing agreed criteria for routine fixes. Surface unresolved consequential product choices while continuing independent investigation; do not invent acceptance.

## Build one complete slice

Choose a coherent path through the real entry point, including its necessary storage, error handling, and interface behavior. Name the failure that would stop expansion and the recovery path for stateful changes.

Use existing services, fixtures, validation, and repository conventions before adding alternatives. Limit cleanup to making the changed path understandable. For dependency changes, inspect the package source, requested version, lockfile changes, and install-script policy before executing package code. Use the approved package manager and bootstrap controls; do not blanket-enable scripts or include unrelated upgrades.

## When the slice includes a user interface

Start from the user's main task and the existing design system: reuse components, spacing, typography, and interaction conventions. Make the primary action, current state, and next step clear; use realistic content to expose hierarchy and layout problems before polishing. Resolve consequential flow choices with the user, without turning routine implementation into a design workshop.

Cover applicable loading, empty, error, success, and permission states. Keep controls labelled, keyboard-operable, and usable on the intended screen sizes; check focus, contrast, long content, and overflow. Exercise the implemented journey in a browser, including its persisted result, using [QA](qa.md). A screenshot alone does not prove interaction or accessibility; disclose unavailable checks. Non-UI work skips this section.

## Demonstrate the behavior

Add or update automated coverage when meaningful and feasible, including the relevant failure path. Check that existing tests actually exercise the change. Derive expected results from the agreed behavior or an independent fixture, not by repeating the implementation in the assertion; a passing test must be capable of detecting a wrong result. Explain manual-only coverage and its limits. Run focused checks, then required repository checks; use [QA](qa.md) for the affected journey when appropriate and [eval-pack](eval-pack.md) for uncertain model behavior. Record evidence and unrun checks with [verification](verification.md).

Inspect the final diff against the agreed outcome. Update affected existing documentation and examples when public behavior, interfaces, configuration, or operating steps change. Exercise relevant commands or state what could not run. For substantial or risky work, use [review](review.md) with a separate reviewer when available; label a self-check honestly. Reverify affected behavior after repairs.

*Fictional example:* Northstar needs failed imports to be recoverable. A useful first slice takes one failed import through the existing retry action to a persisted result, including the retry's failure behavior. A new button alone does not demonstrate recovery.

## Completion

Return implemented behavior, relevant paths, evidence, limitations, and any decision needed. The change is ready when agreed checks have applicable evidence and the work is reviewable. Passing tests does not establish deployment or customer acceptance. Commit, open a PR, merge, or publish only when the requested workflow authorizes it.

For substantial work, maintain a [recoverable checkpoint](verification.md#recoverable-checkpoint) in the existing task record as slices finish or work pauses. When coordinated through `@fde`, record implementation and verification in existing decisions/delivery records under their write rules. Standalone work can return the receipt directly or use the repository's task record.
