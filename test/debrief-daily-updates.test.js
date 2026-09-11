const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { spawnSync } = require('node:child_process')
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fde-daily-updates-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const home = path.join(root, 'home'); fs.mkdirSync(home)
  const env = { ...process.env, HOME: home, USERPROFILE: home, FDEOPS_ENGAGEMENT: '', FDEOS_ENGAGEMENT: '', FDEOPS_ENGAGEMENTS_ROOT: path.join(root, 'clients') }
  const run = (args, input) => spawnSync(process.execPath, [path.resolve(__dirname, '../bin/fde.js'), ...args], { cwd: root, env, input, encoding: 'utf8', timeout: 15000 })
  assert.equal(run(['resume', '--init', 'bank']).status, 0)
  return { run, eng: path.join(root, 'clients/bank/.fde') }
}
test('one reviewed delivery writes the ledger with unknown acceptance preserved', t => {
  const f = fixture(t)
  const notes = 'delivery: Replay|risk-mitigation|zero duplicates|zero duplicates on staging|pending|[source: transcript:42]|pending\n'
  assert.equal(f.run(['debrief', '--smart'], notes).status, 0)
  assert.match(f.run(['debrief', '--review']).stdout, /Value ledger/)
  assert.equal(f.run(['debrief', '--apply']).status, 0)
  assert.match(fs.readFileSync(path.join(f.eng, 'delivery.md'), 'utf8'), /\| Replay \| risk-mitigation \|/)
  const readout = f.run(['defend']).stdout
  assert.match(readout, /Replay: promised zero duplicates/)
  assert.match(readout, /accepted by pending/)
  assert.equal(f.run(['debrief', '--smart'], notes).status, 0)
  assert.match(f.run(['debrief', '--review']).stdout, /already recorded/)
})
test('invalid delivery columns fail before changing records', t => {
  const f = fixture(t); const before = fs.readFileSync(path.join(f.eng, 'delivery.md'), 'utf8')
  assert.notEqual(f.run(['log', 'delivery', 'slice|promise|measured']).status, 0)
  assert.equal(fs.readFileSync(path.join(f.eng, 'delivery.md'), 'utf8'), before)
  assert.notEqual(f.run(['debrief'], 'decision: must not land\ndelivery: slice|promise|measured\n').status, 0)
  assert.doesNotMatch(fs.readFileSync(path.join(f.eng, 'decisions.md'), 'utf8'), /must not land/)
})
test('review is read-only and source replay protects newer next action', t => {
  const f = fixture(t); const notes = 'decision: Freeze scope [source: transcript:42]\nnext: Ask old question\n'
  f.run(['debrief', '--smart'], notes); assert.equal(f.run(['debrief', '--apply']).status, 0)
  assert.equal(f.run(['debrief'], 'next: Current agreed task\n').status, 0)
  assert.equal(f.run(['debrief', '--smart'], notes).status, 0)
  const proposed = fs.readFileSync(path.join(f.eng, '.debrief-propose'), 'utf8')
  assert.match(f.run(['debrief', '--review']).stdout, /already recorded/)
  assert.equal(fs.readFileSync(path.join(f.eng, '.debrief-propose'), 'utf8'), proposed)
  assert.notEqual(f.run(['debrief', '--apply']).status, 0)
  assert.match(fs.readFileSync(path.join(f.eng, 'context.md'), 'utf8'), /Current agreed task/)
  assert.equal(f.run(['debrief', '--apply', '--allow-replay']).status, 0)
})

test('pending review refuses raw private lines added during editing', t => {
  const f = fixture(t)
  f.run(['debrief', '--smart'], 'next: Public task\n')
  fs.appendFileSync(path.join(f.eng, '.debrief-propose'), '<private>\nrisk: PRIVATE_REVIEW_SENTINEL\n</private>\n')
  const result = f.run(['debrief', '--review'])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /do not open it with an agent/)
  assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_REVIEW_SENTINEL/)
})

test('review refuses symlink and nonregular proposal files', t => {
  const f = fixture(t); const proposal = path.join(f.eng, '.debrief-propose')
  const other = path.join(f.eng, 'other.txt'); fs.writeFileSync(other, 'risk: OTHER_CLIENT_SENTINEL\n')
  fs.symlinkSync(other, proposal)
  let result = f.run(['debrief', '--review'])
  assert.notEqual(result.status, 0); assert.doesNotMatch(result.stdout, /OTHER_CLIENT_SENTINEL/)
  fs.unlinkSync(proposal); fs.mkdirSync(proposal)
  result = f.run(['debrief', '--review']); assert.notEqual(result.status, 0)
})
test('review ignores private membership and compares whole statements without writing owner', t => {
  const f = fixture(t); const proposal = path.join(f.eng, '.debrief-propose')
  fs.writeFileSync(path.join(f.eng, 'decisions.md'), '# Decisions\n<private>Freeze scope [source: transcript:42]</private>\n- [2026-09-10] Do not Freeze scope [source: transcript:42]\n')
  fs.writeFileSync(proposal, 'decision: Freeze scope [source: transcript:42]\nsigner: Mara Chen\n')
  fs.rmSync(path.join(f.eng, '.owner'), { force: true })
  const result = f.run(['debrief', '--review'])
  assert.equal(result.status, 0)
  assert.doesNotMatch(result.stdout, /already recorded/)
  assert.equal(fs.existsSync(path.join(f.eng, '.owner')), false)
})

test('review refuses a FIFO without blocking', { skip: process.platform === 'win32' }, t => {
  const f = fixture(t); const proposal = path.join(f.eng, '.debrief-propose')
  assert.equal(spawnSync('mkfifo', [proposal]).status, 0)
  const result = f.run(['debrief', '--review'])
  assert.equal(result.error, undefined)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /not a regular file/)
})
