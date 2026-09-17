const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const cli = path.resolve(__dirname, '../bin/fde.js')
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fde-inbox-boundary-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const env = { ...process.env, HOME: dir, USERPROFILE: dir, FDEOPS_ENGAGEMENT: '', FDEOS_ENGAGEMENT: '', FDEOPS_ENGAGEMENTS_ROOT: path.join(dir, 'clients') }
  const run = (args, input) => spawnSync(process.execPath, [cli, ...args], { cwd: dir, env, input, encoding: 'utf8', timeout: 5000 })
  assert.equal(run(['resume', '--init', 'atlas']).status, 0)
  const box = path.join(dir, 'clients/atlas/.inbox'), proposal = path.join(dir, 'clients/atlas/.fde/.debrief-propose')
  fs.mkdirSync(box)
  return { dir, run, box, proposal }
}
function refused(result) {
  assert.equal(result.error, undefined)
  assert.notEqual(result.status, 0)
  assert.doesNotMatch(result.stdout + result.stderr, /OTHER_CLIENT_SECRET/)
}
test('inbox IDs reject traversal and keep other client notes out of proposals', t => {
  const f = fixture(t), other = path.join(f.dir, 'clients/beta/.inbox')
  fs.mkdirSync(other, { recursive: true })
  fs.writeFileSync(path.join(other, 'notes.md'), 'decision: OTHER_CLIENT_SECRET\n')
  for (const id of ['../../beta/.inbox/notes.md', '..\\..\\beta\\.inbox\\notes.md', path.join(other, 'notes.md')]) {
    refused(f.run(['ingest', 'propose', id]))
    assert.equal(fs.existsSync(f.proposal), false)
  }
})
test('inbox directory links refuse list, propose, and stage', t => {
  const f = fixture(t), other = path.join(f.dir, 'outside')
  fs.mkdirSync(other); fs.writeFileSync(path.join(other, 'notes.md'), 'decision: OTHER_CLIENT_SECRET\n')
  fs.rmdirSync(f.box); fs.symlinkSync(other, f.box)
  for (const args of [['list'], ['propose', 'notes.md'], ['stage']]) refused(f.run(['ingest', ...args], 'decision: harmless\n'))
  assert.deepEqual(fs.readdirSync(other), ['notes.md'])
})
test('list and propose refuse linked, nonregular, and oversized entries without reading them', t => {
  const f = fixture(t), outside = path.join(f.dir, 'outside.md'), item = path.join(f.box, 'notes.md')
  fs.writeFileSync(outside, '---\ntitle: OTHER_CLIENT_SECRET\n---\ndecision: OTHER_CLIENT_SECRET\n')
  const cases = [() => fs.symlinkSync(outside, item), () => fs.linkSync(outside, item), () => fs.mkdirSync(item), () => fs.writeFileSync(item, 'x'.repeat(256 * 1024 + 1))]
  if (process.platform !== 'win32') cases.push(() => assert.equal(spawnSync('mkfifo', [item]).status, 0))
  for (const create of cases) {
    create()
    refused(f.run(['ingest', 'list']))
    refused(f.run(['ingest', 'propose', 'notes.md']))
    assert.equal(fs.existsSync(f.proposal), false)
    fs.rmSync(item, { recursive: true })
  }
})
test('private metadata stays out of list, previews, and prepared proposals', t => {
  const f = fixture(t)
  fs.writeFileSync(path.join(f.box, 'notes.md'), '---\nsource: <private>OTHER_CLIENT_SECRET</private>\n<private>\ntitle: OTHER_CLIENT_SECRET\nstaged: OTHER_CLIENT_SECRET\n</private>\n---\ndecision: Public delivery note\n')
  for (const args of [['ingest', 'list'], ['ingest', 'propose', 'notes.md']]) {
    const result = f.run(args)
    assert.equal(result.status, 0, result.stderr)
    assert.doesNotMatch(result.stdout + result.stderr, /OTHER_CLIENT_SECRET/)
  }
  assert.doesNotMatch(fs.readFileSync(f.proposal, 'utf8'), /OTHER_CLIENT_SECRET/)
  assert.match(fs.readFileSync(f.proposal, 'utf8'), /Public delivery note/)
})
test('ordinary staged files remain selectable by full filename, extensionless name, and unique ID', t => {
  const f = fixture(t)
  fs.writeFileSync(path.join(f.box, 'unique-notes.md'), 'decision: Public delivery note\n')
  assert.equal(f.run(['ingest', 'list']).status, 0)
  for (const id of ['unique-notes.md', 'unique-notes', 'unique']) {
    const result = f.run(['ingest', 'propose', id])
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Public delivery note/)
  }
})

for (const opener of ['<private>', '<!--']) {
  test(`privacy boundaries cannot cross the inbox metadata separator: ${opener}`, t => {
    const f = fixture(t)
    fs.writeFileSync(path.join(f.box, 'notes.md'), '---\nsource: manual\n' + opener + '\ntitle: Internal\n---\ndecision: OTHER_CLIENT_SECRET\n' + (opener === '<private>' ? '</private>' : '-->') + '\ndecision: Public note\n')
    for (const args of [['ingest', 'list'], ['ingest', 'propose', 'notes.md']]) refused(f.run(args))
    assert.equal(fs.existsSync(f.proposal), false)
  })
}
