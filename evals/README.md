# Evaluations

These checks help contributors verify behavior. They use fictional records and do not establish customer outcomes or universal model reliability. See [verification and limits](../docs/verification.md) for observed results.

| Check | Run or read |
|---|---|
| Regression and installation checks | `npm run check` (tests in `test/`) |
| Bounded engagement context | `node evals/context-budget/check.js` |
| Skill routing and real CLI smoke | `npm run test:skill-routing` |
| Agent judgment across delivery scenarios | [Delivery protocol and fixtures](delivery/README.md) |
| Source trust and attributed lessons | [F15-F19 fresh-session cases](delivery/README.md#source-trust-and-attributed-learning-f15-f19) |
| Local-model tool use | [Setup and known limitations](../docs/verification.md#local-model-results); runner in `local-model/` |
| Filesystem and hook edge cases | [Contributor testing notes](testing-fieldbook.md) |

Keep reusable fixtures, evaluation code, and reviewed results here. Keep temporary transcripts, developer conversations, screenshots from debugging, and one-off work reports outside Git. Preserve failed outcomes and limitations when summarizing results; a clean repository is not evidence that every check passed.
