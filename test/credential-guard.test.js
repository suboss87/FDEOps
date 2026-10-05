const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const cli = path.resolve(__dirname, '../bin/fde.js')
const { createMasking } = require('../bin/lib/masking')

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fde-credential-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const env = { ...process.env, HOME: dir, USERPROFILE: dir, FDEOPS_ENGAGEMENT: '', FDEOS_ENGAGEMENT: '', FDEOPS_ENGAGEMENTS_ROOT: path.join(dir, 'clients') }
  const run = (args, input) => spawnSync(process.execPath, [cli, ...args], { cwd: dir, env, input, encoding: 'utf8' })
  assert.equal(run(['resume', '--init', 'synthetic']).status, 0)
  const eng = path.join(dir, 'clients/synthetic/.fde')
  const git = (...args) => {
    const r = spawnSync('git', ['-C', eng, ...args], { env, encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    return r.stdout
  }
  return { run, eng, dir, git }
}

// Deliberately fictional values; no live credentials are used.
const inputs = [
  'sk-ant-api03-' + 'A'.repeat(24) + '_' + 'B'.repeat(24),
  'password=hunter2',
  'password=x',
  'PASSWORD = "two words"',
  "api_key='short'",
  'secret=abc',
  'password==abcdefghijk',
  'password=abc,defghijk',
  'password=abc;defghijk',
  String.raw`password="abc\"defghijk"`,
  String.raw`password='abc\'defghijk'`,
  'password="unfinished',
]
for (const [index, value] of inputs.entries()) {
  test(`credential guard refuses synthetic input ${index} before logging or committing`, t => {
    const f = fixture(t)
    const before = fs.readFileSync(path.join(f.eng, 'decisions.md'), 'utf8')
    const head = f.git('rev-parse', 'HEAD')
    const r = f.run(['log', 'decision', `Accidental paste: ${value}`])
    assert.equal(r.status, 1)
    assert.match(r.stderr, /refused:/)
    assert.ok(!(r.stdout + r.stderr).includes(value))
    assert.equal(fs.readFileSync(path.join(f.eng, 'decisions.md'), 'utf8'), before)
    assert.equal(f.git('rev-parse', 'HEAD'), head)
    assert.ok(!f.git('log', '--all', '-p').includes(value))
  })
}

for (const [index, value] of inputs.slice(0, 2).entries()) {
  test(`credential guard covers debrief and ingest for synthetic input ${index}`, t => {
    const f = fixture(t)
    const head = f.git('rev-parse', 'HEAD')
    const staged = f.run(['ingest', 'stage'], `decision: ${value}\n`)
    assert.equal(staged.status, 1)
    assert.ok(!(staged.stdout + staged.stderr).includes(value))
    const direct = f.run(['debrief'], `decision: ${value}\nnext: ${value}\nOther note ${value}\n`)
    assert.equal(direct.status, 0, direct.stderr)
    assert.match(direct.stderr, /skipped/)
    assert.match(direct.stdout, /nothing routed/)
    assert.equal(f.git('rev-parse', 'HEAD'), head)
    assert.equal(f.run(['debrief', '--smart'], `decision: ${value}\n`).status, 0)
    const applied = f.run(['debrief', '--apply'])
    assert.equal(applied.status, 0, applied.stderr)
    assert.match(applied.stderr, /skipped/)
    assert.ok(!(applied.stdout + applied.stderr).includes(value))
    assert.ok(!f.git('log', '--all', '-p').includes(value))
    for (const name of fs.readdirSync(f.eng).filter(n => n.endsWith('.md'))) {
      assert.ok(!fs.readFileSync(path.join(f.eng, name), 'utf8').includes(value))
    }
  })
}

test('ordinary password discussion and empty assignments remain loggable', t => {
  const f = fixture(t)
  for (const text of ['Document password reset', 'password=', 'password=""', "secret=''", 'password=\nDiscuss access']) {
    const r = f.run(['log', 'decision', text])
    assert.equal(r.status, 0, r.stderr)
  }
})

test('masking removes the entire supported credential including punctuation and escapes', t => {
  const f = fixture(t)
  const mask = createMasking(path.join(f.dir, 'clients'))
  for (const value of inputs) assert.match(mask.mask(value), /^\[\[credential:[a-f0-9]{16}\]\]$/)
})

test('forced writes warn and supported credentials remain masked in views', t => {
  const f = fixture(t)
  for (const value of inputs) {
    const r = f.run(['log', 'decision', `SyntheticGuardProbe ${value}`, '--force'])
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stderr, /warning: logging possible/)
    assert.ok(!(r.stdout + r.stderr).includes(value))
    const view = f.run(['recall', 'SyntheticGuardProbe'])
    assert.equal(view.status, 0, view.stderr)
    assert.ok(!(view.stdout + view.stderr).includes(value))
    assert.match(view.stdout, /\[\[credential:/)
  }
})

test('private-note apply explains plaintext storage without disclosing it', t => {
  const f = fixture(t)
  assert.equal(f.run(['debrief', '--smart'], '<private>FICTIONAL_PRIVATE_NOTE</private>\n').status, 0)
  const r = f.run(['debrief', '--apply'])
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /not encrypted/i)
  assert.match(r.stdout, /Git history/i)
  assert.ok(!r.stdout.includes('FICTIONAL_PRIVATE_NOTE'))
})
