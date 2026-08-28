# test-on-legacy - making changes safe on code that has no tests

**Enter when:** the codebase has little or no test coverage, you need to change code where tests are absent or misleading, or `terrain.md` flagged high-churn modules with no test neighbours.

**Read first:** `terrain.md` (the churn heat map), `decisions.md` (the current slice), `context.md`. This skill is the safety net for building on someone else's untested codebase.

Legacy code without tests is a minefield. You can't refactor it because you don't know what it does. You can't add features because you don't know what you'll break. The way through: characterise what exists, wrap the change, prove it works - in that order.

## Method (you do this work)

**1. Characterisation tests first.** Before changing anything, write tests that describe what the code *actually does right now* - including the parts that seem wrong:

```
The code truncates names at 50 characters.
  → That seems like a bug, but it might be a contract another system depends on.
  → Write a test: "truncates names at 50 characters" - that's the characterisation.
  → NOW you can change the code and know exactly what you've broken.
```

Characterisation tests answer: "What does this code do?" not "What should this code do?" They're the honest documentation that the README isn't.

**How to write them:**
1. Pick the function/module you're about to change.
2. Call it with representative inputs (from production if possible, from logs, from the team's knowledge).
3. Record what comes back - that's your expected output.
4. Turn that into an assertion.

```
# The pattern:
result = function_under_test(real_input)
assert result == whatever_it_actually_returned  # characterisation, not specification
```

**2. The Strangler Fig pattern - wrap, don't rewrite.**

Never rewrite legacy code in place. Instead:

```
Step 1: New interface wraps the old code (calls through to it)
  → All existing callers work exactly as before
  → Your characterisation tests pass

Step 2: New implementation behind the new interface
  → Old code still there, still callable
  → Feature flag or config switches between old and new

Step 3: Gradually migrate callers to the new path
  → Each migration is a small, testable change
  → Old path remains as fallback

Step 4: Remove old code only when:
  → No callers remain
  → New path has been stable for N days
  → Team agrees it's safe
```

**3. The test pyramid for legacy engagement work:**

| Level | What to write | How many | Why |
|-------|-------------|---------|-----|
| **Characterisation** | What the code does now | 3–5 per module you're changing | Safety net before any change |
| **Unit** | Your new code's behaviour | 1 per new function/method | Proves your addition works |
| **Integration** | The seam between old and new | 1–2 per boundary | Proves old and new cooperate |
| **Smoke** | The critical user path end-to-end | 1 per feature | Proves the user can still do the thing |

**4. Spot the lying tests.** Worse than no tests are tests that pass but verify nothing:

```
# This test passes and proves nothing:
def test_process_payment():
    result = process_payment(mock_everything())
    assert result is not None  # what does "not None" prove?

# This test is actually testing something:
def test_process_payment_deducts_from_balance():
    account = create_account(balance=100)
    process_payment(account, amount=30)
    assert account.balance == 70
```

When you find a lying test: note it in `terrain.md`. Don't fix it unless it's in your slice - but name it, because the next person needs to know.

**5. The "safe to change" checklist.** Before modifying any legacy code:

- [ ] Characterisation tests written for the module being changed
- [ ] All characterisation tests pass before your change
- [ ] Your change is wrapped (Strangler Fig), not a rewrite-in-place
- [ ] New tests cover your new behaviour
- [ ] All tests (characterisation + new) pass after your change
- [ ] The diff shows only what you intended to change

## Artifact

**`terrain.md`** - update test-gap assessment: which modules now have characterisation tests, which still don't, which tests are lying.

**`decisions.md`** - log: "Added characterisation tests for <module> before changing <feature>. Coverage state: <before/after>."

## Checkpoint

Before merging any change to legacy code: characterisation tests existed before the change (state which), new tests cover the new behaviour, all pass. If characterisation tests were skipped: that's a finding - state why (time pressure? inaccessible code?) and log the risk.

## Principles

- Characterise before changing. What the code does > what it should do.
- Wrap, don't rewrite. The Strangler Fig is the safest pattern on legacy code.
- A lying test is worse than no test. Name it when you find it.
- The ugly behaviour in the characterisation test might be someone else's contract. Don't "fix" it without asking.
- Test coverage on legacy code is insurance - buy it before you need it, not after.
