# qa-live - test it like a user, not like an engineer

**Enter when:** a feature is built and needs to be verified from the user's perspective, the team says "it works on my machine," a demo is coming and the feature hasn't been clicked through, or a post-deploy smoke test is needed.

**Read first:** `delivery.md` (what was built), `decisions.md` (acceptance criteria), `success.md` (what the customer expects to see), `context.md`.

Unit tests prove the code works. QA proves the *feature* works - from the user's chair, on a real browser, with real data patterns. The FDE who ships a feature that passes all tests but fails the first user click has shipped a defect.

## Method (you do this work)

**1. Write the test script from the user's story, not the code.**

Start with `success.md` and `decisions.md` acceptance criteria. For each acceptance criterion, write the human steps:

```markdown
## Test: User can retry a failed payment
Precondition: User has a failed payment in their history
Steps:
  1. Navigate to payment history
  2. Click the failed payment
  3. Click "Retry payment"
  4. Confirm the retry dialog
  5. Observe the result
Expected: Payment processes successfully, status updates to "Completed"
Also check: Error message if retry fails, loading state during processing
```

**2. The five perspectives.** Test each feature from five angles that unit tests can't reach:

| Perspective | What to test | Common FDE finding |
|------------|-------------|-------------------|
| **Happy path** | Does the main flow work end-to-end? | Works locally, fails with real data volumes |
| **Error path** | What happens when things go wrong? | Error messages are developer-facing, not user-facing |
| **Edge cases** | Empty states, max lengths, special characters, concurrent users | The empty state shows "undefined" instead of a helpful message |
| **Performance** | Is it fast enough for real use? | Works fine with 10 records, unusable with 10,000 |
| **Accessibility** | Can it be used with keyboard only? Does the screen reader make sense? | Tab order is broken, focus traps in modals |

**3. Real browser testing.** Open the actual application in a browser and click through:

```
Before each test:
  - Clear relevant caches/state
  - Use realistic test data (not "test test test")
  - Note the browser and viewport size

During each test:
  - Open DevTools console - watch for errors
  - Open DevTools network tab - watch for failed requests
  - Time the critical actions (user-perceivable latency)

After each test:
  - Screenshot the result (before/after when relevant)
  - Note any console errors even if the test "passed"
  - Note any UX friction even if technically correct
```

**4. The health score.** Rate the feature across five dimensions, 1–5:

| Dimension | 1 (broken) | 3 (acceptable) | 5 (polished) |
|-----------|-----------|----------------|--------------|
| **Functionality** | Critical path fails | Happy path works, errors unhandled | All paths work, errors graceful |
| **Performance** | >5s load time | <2s load time | <500ms load time, no layout shifts |
| **Error handling** | Crashes or shows stack trace | Shows error message | Shows actionable error with recovery option |
| **Data handling** | Corrupts or loses data | Handles normal data correctly | Handles edge cases (empty, large, special chars) |
| **User experience** | Confusing or broken layout | Functional but rough | Intuitive, consistent with the rest of the app |

**Overall health = average of five scores.** Below 3.0 → not ready to ship. 3.0–4.0 → shippable with known issues. 4.0+ → confident to demo.

**5. The bug report format.** For each issue found:

```markdown
## Bug: <one-line summary>
Severity: critical / high / medium / low
Steps to reproduce:
  1. <exact steps>
  2. <exact steps>
Expected: <what should happen>
Actual: <what happened>
Evidence: <screenshot, console error, network request>
Environment: <browser, viewport, data state>
```

**6. Re-verify after fixes.** After each bug is fixed:
- Re-run the exact reproduction steps
- Check that the fix didn't break adjacent functionality
- Update the health score
- Screenshot the fixed state

## Artifact

**`delivery.md`** - the health score and test results for each shipped feature:
```markdown
## QA: <feature name> - <date>
Health score: 4.2 / 5.0
Tests run: 8 passed, 1 failed (fixed), 1 known issue (low severity)
Bugs found: 2 (1 fixed, 1 deferred to next sprint)
Ready to demo: YES / NO
```

**`decisions.md`** - bugs deferred with rationale (why it's acceptable to ship with this known issue).

## Checkpoint

One line: "Feature tested from user perspective. Health score: <N>/5. <N> bugs found, <N> fixed, <N> deferred. Ready to demo: yes/no." If not ready: the specific blocker.

## Principles

- Test from the user's chair, not the developer's IDE.
- Real browser, real data patterns, real network conditions.
- Console errors during a "passing" test are still findings.
- Health score below 3.0 = not ready to ship, regardless of test suite.
- Every bug gets a reproduction recipe, not a description.
- A feature that passes all unit tests but fails the first click is a defect.
