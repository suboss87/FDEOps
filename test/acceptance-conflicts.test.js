const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

function fixture(t, rows, goal = 'Production rollout') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fde-acceptance-'))
  const eng = path.join(root, '.fde'); fs.mkdirSync(eng)
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.writeFileSync(path.join(eng, 'success.md'), `# Success\n**Done when:** ${goal}\n**Stakeholder who signs off:** Dr Anika Rao\n`)
  fs.writeFileSync(path.join(eng, 'delivery.md'), '# Delivery\n## Value ledger\n| Date | Slice | Bucket | Promised | Measured | Accepted by | Evidence | Rollback |\n|---|---|---|---|---|---|---|---|\n' + rows.map(r => '| ' + r.join(' | ') + ' |').join('\n'))
  const run = (...args) => spawnSync(process.execPath, [path.join(__dirname, '../bin/fde.js'), ...args], { cwd: root, env: { ...process.env, HOME: root, FDEOPS_ENGAGEMENT: eng, FDEOPS_ENGAGEMENTS_ROOT: root }, encoding: 'utf8' })
  const report = run('defend'); assert.equal(report.status, 0, report.stderr)
  return { root, eng, run, report: report.stdout, accepted: report.stdout.split('## Accepted value')[1].split('## CLAIMS')[0] }
}
const row = (slice, accepted, measured = '5 minutes', promised = '5 minutes in production', date = '2026-09-08') => [date, slice, 'cost-save', promised, measured, accepted, 'evidence/run.md', 'disable']

test('finance staging-only and healthcare slide-only assertions require scope review', t => {
  const f = fixture(t, [row('Finance', 'Ravi Shah accepted staging only on 2026-09-01', '5 minutes on 100 staging rows'), row('Clinical', 'Leo approves slide design only')])
  assert.doesNotMatch(f.accepted, /Finance:|Clinical:/)
  assert.match(f.report, /scope.*review/i)
})

test('same-slice withdrawal flags earlier acceptance for review without deleting history', t => {
  const f = fixture(t, [row('Pilot', 'Dr Anika Rao 2026-09-08'), row('Pilot', 'not accepted; Dr Anika Rao retracts approval 2026-09-09', 'withdrawn: timer excluded callback work', undefined, '2026-09-09'), row('Unrelated', 'Mara Chen 2026-09-09')])
  assert.doesNotMatch(f.accepted, /Pilot:/)
  assert.match(f.accepted, /Unrelated:/)
  assert.match(f.report, /conflicting withdrawal.*review/i)
  assert.match(f.report, /Dr Anika Rao 2026-09-08/)
  assert.match(f.report, /timer excluded callback work/)
  const status = f.run('status'); assert.match(status.stdout, /conflicting withdrawal.*review/i)
})

test('legacy approval, delegated names and a staging-only goal remain accepted', t => {
  const f = fixture(t, [row('Legacy', 'Mara Chen'), row('Delegated', 'Leo Chen, delegated by Dr Anika Rao'), row('Staging', 'Ravi Shah accepted staging only', '5 minutes staging', '5 minutes staging')], 'Staging validation only')
  assert.match(f.accepted, /Legacy:/)
  assert.match(f.accepted, /Delegated:/)
  assert.match(f.accepted, /Staging:/)
})

const { reconcileValueRows, valueState } = require('../bin/lib/value-ledger')
test('withdrawal words inside artifact paths and negated statements do not create conflicts', () => {
  const accepted = { slice: 'Pilot', promised: '5 minutes', measured: '5 minutes', accepted: 'Mara Chen', evidence: 'evidence/withdrawn.md', state: 'accepted' }
  const reaffirmation = { ...accepted, evidence: 'PR #42', accepted: 'Mara Chen; approval was not withdrawn' }
  const rows = reconcileValueRows([accepted, reaffirmation])
  assert.equal(rows[0].state, 'accepted')
  assert.equal(rows[0].acceptanceIssue, undefined)
})
test('explicitly retracted measurements cannot be accepted even without another ledger row', () => {
  assert.equal(valueState({ measured: 'withdrawn: timer omitted callback work', accepted: 'Mara Chen', evidence: 'PR #42' }), 'claimed')
})
test('ordinary approvals by a different signer are preserved rather than guessed revoked', () => {
  const rows = reconcileValueRows([{ slice: 'Historical pilot', measured: '5 minutes', accepted: 'Ravi Shah', evidence: 'PR #42', state: 'accepted' }], '**Stakeholder who signs off:** Elena Morris')
  assert.equal(rows[0].state, 'accepted')
})
