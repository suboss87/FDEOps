const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { sourceReference } = require('../bin/lib/provenance')
const { valueState } = require('../bin/lib/value-ledger')
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fde-source-'))
  const eng = path.join(root, '.fde'); fs.mkdirSync(eng)
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const run = args => spawnSync(process.execPath, [path.join(__dirname, '../bin/fde.js'), ...args], { cwd: root, env: { ...process.env, HOME: root, FDEOPS_ENGAGEMENT: eng, FDEOPS_ENGAGEMENTS_ROOT: root }, encoding: 'utf8' })
  return { root, eng, run }
}
test('explicit source syntax excludes automatic dates and placeholders', () => {
  for (const text of ['[2026-09-10] approved by Mara', 'staging run', '[source: pending]', '[source: none]']) assert.equal(sourceReference(text), '')
  for (const text of ['[source: meeting 2026-09-10]', 'PR #42', 'https://example.test/proof', 'evidence/replay.json', 'email 2026-09-10']) assert.ok(sourceReference(text), text)
})
test('legacy and explicit acceptance both remain claimed without source-backed evidence', () => {
  for (const extra of [{}, { acceptanceStatus: 'accepted' }]) {
    const row = { measured: '5 min', accepted: 'Mara Chen', ...extra }
    for (const evidence of ['', 'staging run', 'pending']) assert.equal(valueState({ ...row, evidence }), 'claimed')
    assert.equal(valueState({ ...row, evidence: 'PR #42' }), 'accepted')
  }
})
test('receipts separate unsourced decisions from sourced records without implying approval', t => {
  const f = fixture(t)
  fs.writeFileSync(path.join(f.eng, 'decisions.md'), '# Decisions\n- [2026-09-10] retry approved [approved: Mara 2026-09-10]\n- [2026-09-10] retry declined [source: meeting 2026-09-09]\n<private>retry SECRET_SOURCE https://secret.test</private>')
  const r = f.run(['receipts', 'retry']); assert.equal(r.status, 0, r.stderr)
  const claim = r.stdout.indexOf('CLAIMS')
  assert.ok(claim > 0); assert.ok(r.stdout.indexOf('retry approved') > claim)
  assert.ok(r.stdout.indexOf('retry declined') < claim)
  assert.match(r.stdout, /not.*approval|not.*acceptance/i)
  assert.doesNotMatch(r.stdout, /SECRET_SOURCE|secret.test/)
})
test('handoff and defend are bounded redacted snapshots, never approval inference', t => {
  const f = fixture(t)
  fs.writeFileSync(path.join(f.eng, 'success.md'), '# Success\n**Stakeholder who signs off:** Mara Chen\n**Done when:** replay input returns the expected output.\n<private>SECRET_HANDOFF</private>')
  fs.writeFileSync(path.join(f.eng, 'decisions.md'), '# Decisions\n- [2026-09-10] retry approved\n- [2026-09-10] retry declined [source: meeting 2026-09-09]\n')
  fs.writeFileSync(path.join(f.eng, 'delivery.md'), '# Delivery\n## Value ledger\n| Slice | Promised | Measured | Accepted by | Evidence |\n|---|---|---|---|---|\n| replay | 5 min | 4 min | Mara | PR #42 |\n| speed | 5 min | 3 min | Mara | none |\n')
  fs.writeFileSync(path.join(f.eng, 'context.md'), '# Context\n## Next action\nAsk Mara to review replay.\n## History\n' + 'fat raw notes '.repeat(100000))
  const before = fs.readdirSync(f.eng).map(p => [p, fs.readFileSync(path.join(f.eng, p), 'utf8')])
  for (const cmd of ['handoff', 'defend']) {
    const r = f.run([cmd, '--max-bytes', '4096']); assert.equal(r.status, 0, r.stderr)
    assert.ok(Buffer.byteLength(r.stdout) <= 4096); assert.doesNotMatch(r.stdout, /SECRET_HANDOFF|fat raw notes/)
    assert.match(r.stdout, /Mara Chen|Signer:/); assert.match(r.stdout, /CLAIMS/)
    assert.match(r.stdout, /source supplied, not automatic approval/)
  }
  assert.deepEqual(fs.readdirSync(f.eng).map(p => [p, fs.readFileSync(path.join(f.eng, p), 'utf8')]), before)
})
test('handoff export is explicit, new-file-only and cannot replace private records through links', t => {
  const f = fixture(t)
  fs.writeFileSync(path.join(f.eng, 'success.md'), '# Success\n')
  const dest = path.join(f.root, 'handoff.md')
  assert.equal(f.run(['handoff', '--out', dest]).status, 0)
  const content = fs.readFileSync(dest, 'utf8')
  assert.notEqual(f.run(['handoff', '--out', dest]).status, 0)
  assert.equal(fs.readFileSync(dest, 'utf8'), content)
  fs.symlinkSync(dest, path.join(f.root, 'alias.md'))
  assert.notEqual(f.run(['handoff', '--out', path.join(f.root, 'alias.md')]).status, 0)
  fs.symlinkSync(f.eng, path.join(f.root, 'records'))
  assert.notEqual(f.run(['handoff', '--out', path.join(f.root, 'records', 'new.md')]).status, 0)
  assert.equal(fs.existsSync(path.join(f.eng, 'new.md')), false)
})
