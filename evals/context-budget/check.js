#!/usr/bin/env node
'use strict'
// Synthetic output-size/retrieval checks, not a model quality or time-saved claim.
const assert = require('node:assert/strict')
const { boundedSections, recallSections } = require('../../bin/lib/context')
const history = '# Context\n' + 'historical-note '.repeat(70000)
const started = performance.now()
const bounded = boundedSections(['Current goal: preserve retry idempotency.', history])
assert.ok(Buffer.byteLength(bounded) <= 16384)
assert.ok(bounded.includes('preserve retry idempotency'))
const docs = [
  { file: 'decisions.md', text: '- [2026-01-01] retry: do not duplicate payments\n' + 'unrelated\n'.repeat(10000) + '- [2026-09-10] retry: UI proposal superseded; keep CSV' },
  { file: 'success.md', text: 'Retry requires staging evidence and customer review.' },
]
const result = recallSections(docs, 'retry')
assert.equal(result.total, 3)
const recalled = boundedSections(result.sections, 4096)
assert.ok(recalled.includes('do not duplicate payments'))
assert.ok(recalled.includes('superseded'))
assert.ok(recalled.includes('customer review'))
assert.ok(Buffer.byteLength(recalled) <= 4096)
console.log(JSON.stringify({
  fixture: 'synthetic long line and 10000 unrelated decision lines',
  originalBytes: Buffer.byteLength(history), resumeBytes: Buffer.byteLength(bounded),
  matchingRecords: result.total, retrievedRecords: result.sections.length,
  recallBytes: Buffer.byteLength(recalled), elapsedMs: Math.round(performance.now() - started),
  interpretation: 'Output size and literal retrieval only; not token counts, live agent accuracy, or human time saved.',
}, null, 2))
