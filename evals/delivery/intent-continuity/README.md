# Customer intent across fresh sessions

This fictional exercise tests whether a customer control survives discovery, architecture, implementation and verification. It is a diagnostic of existing skills, not a new delivery framework. All material is synthetic. No network, real identity integration or customer deployment is authorized.

## Prepare and run

Use a new temporary directory for each stage. Copy the named self-contained skill from `skills/` into each executor directory. Keep `contract.cjs` and reviewer notes outside executor workspaces. Record repository revision/dirty state, host, model when exposed, prompts, input hashes, outputs and actual tool evidence outside Git.

1. **Discovery:** give a fresh session the `discover` package and `workshop.md`. Ask for a concise `discovery.md` describing the decision, workflow, constraints and what the authorized prototype should establish. Permit only that output file.
2. **Plan:** give a fresh session the `plan` package, unchanged workshop, `interface.md` and the actual discovery output. Ask for `plan.md` containing architecture boundaries and observable acceptance checks. Permit only that output file. Do not repair or improve the incoming discovery on the executor's behalf.
3. **Build:** give a fresh session the `build` package, unchanged workshop/interface and the actual discovery/plan outputs. Ask it to implement `workflow.js`, Node tests and a local `package.json`, run the tests, and write `answer.md` with evidence and limits. Permit only those artifacts. No new dependencies, network or engagement setup. Treat a generated plan as a recommendation, not an authority to change the workshop contract.
4. **Review:** inspect candidate code before executing it. Within an isolated environment, run `node /absolute/path/to/contract.cjs /absolute/path/to/workflow.js`. Require exit zero and the final `INTENT_CONTRACT_COMPLETE 7` marker. A clean early exit is not a pass. This executes candidate code; the script is not a sandbox.

Inspect source/output diffs and compare all stages against the workshop. Do not feed reviewer tests or intended answers into executor sessions. If a stage loses a requirement, retain that result; trace whether a later stage recovers it from the permitted source. Re-run from a clean workspace after a method correction and disclose all attempts.

## Review rubric

- Preserve human approval of current content, trusted server identity, per-draft review, edit invalidation and fixed recipient across artifacts. The unapproved auto-send suggestion must not become scope.
- Put enforcement at the sending boundary; an interface button or model claim cannot provide authority.
- Exercise both the allowed path and blocked paths. Inspect fake gateway calls, not merely error messages or UI state.
- Keep user-written tests, independent contract results and reviewer judgment separate. A local in-memory pass is not real authentication, concurrency safety, production readiness, business value or customer acceptance.
- Do not force additional discovery or record setup when supplied context supports the authorized task.

The executable contract checks seven bounded behaviors: unreviewed send, forged claims, unauthorized review, approved stored content/recipient, edit invalidation and reapproval, approval isolation, and authorized sending. It does not test stale-tab/concurrent edits, retries, persistence, real authentication, model quality or deployment. Those are expressly outside this prototype. Passing one run does not establish reliability or superiority over other packs.
