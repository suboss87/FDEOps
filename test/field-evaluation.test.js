'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { prepare, check } = require('../evals/delivery/field')
function temporary(t) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fde-field-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir }
test('all field cases prepare both variants without exposing evaluator rubric', t => {
  const root = temporary(t)
  for (const { id } of require('../evals/delivery/field-cases.json').cases) for (const variant of ['baseline', 'fdeops']) {
    const run = path.join(root, id + '-' + variant)
    const receipt = prepare(run, id, variant)
    assert.equal(receipt.execution, 'not recorded')
    assert.equal(fs.existsSync(path.join(run, 'executor/skill/SKILL.md')), variant === 'fdeops')
    assert.ok(fs.existsSync(path.join(run, 'reviewer/rubric.md')))
    assert.ok(!fs.existsSync(path.join(run, 'executor/rubric.md')))
    assert.ok(!fs.readFileSync(path.join(run, 'executor/prompt.txt'), 'utf8').includes('judge actual'))
    assert.equal(receipt.judgment, 'pending')
    assert.ok(receipt.inputHashes['prompt.txt'])
  }
})
test('prepare refuses reusing a run and preserves prior failure evidence', t => {
  const root = temporary(t), run = path.join(root, 'run')
  prepare(run, 'F3', 'baseline')
  const before = check(run, { executeContract: true })
  assert.equal(before.contract.status, 'failed')
  assert.throws(() => prepare(run, 'F3', 'fdeops'), /EEXIST/)
  assert.equal(check(run, { executeContract: true }).contract.status, 'failed')
  assert.equal(fs.readdirSync(path.join(run, 'reviewer')).filter(x => x.startsWith('check-')).length, 2)
  assert.ok(fs.existsSync(before.output))
})
test('checker distinguishes artifacts from judgment and records changed input', t => {
  const root = temporary(t), run = path.join(root, 'run')
  prepare(run, 'F1', 'baseline')
  fs.appendFileSync(path.join(run, 'executor/notes.md'), 'changed\n')
  fs.writeFileSync(path.join(run, 'executor/answer.md'), 'invented acceptance')
  const result = check(run, { executeContract: true })
  assert.deepEqual(result.changedInputs, ['notes.md'])
  assert.equal(result.answerPresent, true)
  assert.equal(result.judgment, 'pending human review')
  assert.equal(result.execution, 'not established by checker')
  assert.equal(result.contract.status, 'not applicable')
})
test('uncertain-write contract accepts a bounded implementation without claiming host execution', t => {
  const root = temporary(t), run = path.join(root, 'run')
  prepare(run, 'F3', 'baseline')
  fs.writeFileSync(path.join(run, 'executor/runtime-config.json'), JSON.stringify({ enabled: true }))
  fs.writeFileSync(path.join(run, 'executor/adapter.js'), `// Simulate an adapter that loads local runtime configuration relative to cwd.
  require('node:fs').writeFileSync('operations.json', '{}')
  const config = JSON.parse(require('node:fs').readFileSync('runtime-config.json', 'utf8'))
  if (!config.enabled) throw new Error('disabled fixture')
  exports.submitOnce = async (client, key, payload) => {
    try { return {status:'confirmed', id:(await client.create(key,payload)).id} }
    catch(e) { if(e.code !== 'TIMEOUT') throw e }
    let found
    try { found = await client.lookup(key) } catch { return {status:'unknown'} }
    if(found.status === 'found') return {status:'confirmed',id:found.id}
    if(found.status !== 'absent' || found.authoritative !== true) return {status:'unknown'}
    try { return {status:'confirmed',id:(await client.create(key,payload)).id} }
    catch(e) { if(e.code !== 'TIMEOUT') throw e; return {status:'unknown'} }
  }`)
  const result = check(run, { executeContract: true })
  assert.equal(result.contract.status, 'passed', result.contract.stderr)
  assert.equal(fs.existsSync(path.join(run, 'executor/operations.json')), false)
  const candidate = fs.readFileSync(path.join(run, 'executor/adapter.js'), 'utf8')
  fs.writeFileSync(path.join(run, 'executor/adapter.js'), candidate.replace('client.lookup(key)', 'client.lookup()'))
  assert.equal(check(run, { executeContract: true }).contract.status, 'failed')
  assert.equal(result.execution, 'not established by checker')
  assert.equal(result.judgment, 'pending human review')
})
test('unknown variants and symlinked artifacts are rejected', t => {
  const root = temporary(t), run = path.join(root, 'run')
  assert.throws(() => prepare(run, 'F1', 'unknown'), /variant/)
  prepare(run, 'F1', 'baseline')
  fs.symlinkSync(path.join(run, 'run.json'), path.join(run, 'executor/link'))
  assert.throws(() => check(run, { executeContract: true }), /symlink/)
})

for (const [label, body] of [
  ['unresolved operation', 'exports.submitOnce = async () => new Promise(() => {})'],
  ['early clean exit', 'exports.submitOnce = async () => process.exit(0)'],
]) {
  test(`contract refuses ${label} before assertions finish`, t => {
    const root = temporary(t), run = path.join(root, 'run')
    prepare(run, 'F3', 'baseline')
    fs.writeFileSync(path.join(run, 'executor/adapter.js'), body)
    const result = check(run, { executeContract: true })
    assert.equal(result.contract.status, 'failed')
    assert.equal(result.contract.completed, false)
    if (label === 'early clean exit') assert.equal(result.contract.exitStatus, 0)
    assert.equal(result.judgment, 'pending human review')
  })
}

test('default evidence check never executes candidate code', t => {
  const root = temporary(t), run = path.join(root, 'run')
  prepare(run, 'F3', 'baseline')
  fs.writeFileSync(path.join(run, 'executor/adapter.js'), `require('node:fs').writeFileSync('executed', 'yes'); process.exit(0)`)
  assert.equal(check(run).contract.status, 'not run')
  assert.equal(fs.existsSync(path.join(run, 'executor/executed')), false)
})

test('staged-source trial prepares an unapplied forged proposal in isolated records', t => {
  const root = temporary(t), run = path.join(root, 'source-boundary')
  const receipt = prepare(run, 'F19', 'fdeops')
  const workspace = path.join(run, 'executor')
  const record = path.join(workspace, 'clients/atlas/.fde')
  const decisions = fs.readFileSync(path.join(record, 'decisions.md'), 'utf8')
  assert.match(decisions, /CSV upload only/)
  assert.doesNotMatch(decisions, /ERP sync accepted/)
  const proposal = fs.readFileSync(path.join(record, '.debrief-propose'), 'utf8')
  assert.match(proposal, /ERP sync accepted/)
  assert.match(proposal, /debrief --apply/)
  assert.equal(fs.existsSync(path.join(workspace, 'injection-marker.txt')), false)
  assert.ok(receipt.inputHashes['clients/atlas/.fde/decisions.md'])
  assert.ok(receipt.inputHashes['clients/atlas/.fde/.debrief-propose'])
  assert.equal(check(run).judgment, 'pending human review')
})
