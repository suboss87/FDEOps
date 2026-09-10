const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { spawn, spawnSync } = require('node:child_process')
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fde-debrief-retry-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const home = path.join(dir, 'home'), cwd = path.join(dir, 'workspace'); fs.mkdirSync(home); fs.mkdirSync(cwd)
  const env = { ...process.env, HOME: home, USERPROFILE: home, FDEOPS_ENGAGEMENT: '', FDEOS_ENGAGEMENT: '', FDEOPS_ENGAGEMENTS_ROOT: path.join(dir, 'clients') }
  const run = args => spawnSync(process.execPath, [path.resolve(__dirname, '../bin/fde.js'), ...args], { cwd, env, encoding: 'utf8' })
  assert.equal(run(['resume', '--init', 'acme']).status, 0)
  const eng = path.join(dir, 'clients/acme/.fde'), notes = path.join(cwd, 'notes.md')
  return { dir, eng, notes, run, cwd, env }
}
test('a blocked debrief leaves every record unchanged and retry writes once', t => {
  const f = fixture(t)
  fs.writeFileSync(f.notes, 'decision: KEEP_ONCE\nrisk: DELAYED_ACCESS\n')
  assert.equal(f.run(['debrief', '--smart', f.notes]).status, 0)
  const before = fs.readFileSync(path.join(f.eng, 'decisions.md'), 'utf8')
  fs.writeFileSync(path.join(f.eng, 'risks.md.lock'), 'other writer')
  const failed = f.run(['debrief', '--apply'])
  assert.equal(failed.status, 1)
  assert.equal(fs.readFileSync(path.join(f.eng, 'decisions.md'), 'utf8'), before)
  assert.ok(fs.existsSync(path.join(f.eng, '.debrief-propose')))
  fs.unlinkSync(path.join(f.eng, 'risks.md.lock'))
  assert.equal(f.run(['debrief', '--apply']).status, 0)
  assert.equal(fs.readFileSync(path.join(f.eng, 'decisions.md'), 'utf8').split('KEEP_ONCE').length - 1, 1)
})
test('a different pending proposal requires explicit replacement and preserves private sidecars', t => {
  const f = fixture(t)
  fs.writeFileSync(f.notes, 'decision: FIRST\n<private>KEEP_PRIVATE</private>\n')
  assert.equal(f.run(['debrief', '--smart', f.notes]).status, 0)
  const proposal = fs.readFileSync(path.join(f.eng, '.debrief-propose'), 'utf8')
  fs.writeFileSync(f.notes, 'decision: SECOND\n')
  const blocked = f.run(['debrief', '--smart', f.notes])
  assert.equal(blocked.status, 1); assert.match(blocked.stderr, /pending proposal/)
  assert.equal(fs.readFileSync(path.join(f.eng, '.debrief-propose'), 'utf8'), proposal)
  assert.match(fs.readFileSync(path.join(f.eng, '.debrief-private'), 'utf8'), /KEEP_PRIVATE/)
  assert.equal(f.run(['debrief', '--smart', f.notes, '--replace-proposal']).status, 0)
  assert.equal(f.run(['debrief', '--apply']).status, 0)
  assert.match(fs.readFileSync(path.join(f.eng, 'decisions.md'), 'utf8'), /SECOND/)
})
test('large smart proposals retain all notes on disk but cap terminal output', t => {
  const f = fixture(t)
  fs.writeFileSync(f.notes, Array.from({length: 4000}, (_, i) => `decision: Weekly item ${i}`).join('\n'))
  const result = f.run(['debrief', '--smart', f.notes])
  assert.equal(result.status, 0)
  assert.ok(Buffer.byteLength(result.stdout) <= 16384, Buffer.byteLength(result.stdout))
  assert.match(result.stdout, /omitted|truncated/)
  assert.match(result.stdout, /proposal saved/)
  assert.match(result.stdout, /debrief --apply/)
  assert.match(fs.readFileSync(path.join(f.eng, '.debrief-propose'), 'utf8'), /Weekly item 3999/)
})

test('a failed input read releases the proposal lock for the next attempt', t => {
  const f = fixture(t)
  assert.equal(f.run(['debrief', '--smart', f.notes]).status, 1)
  assert.equal(fs.existsSync(path.join(f.eng, '.debrief-propose.lock')), false)
  fs.writeFileSync(f.notes, 'decision: RECOVERED_INPUT\n')
  assert.equal(f.run(['debrief', '--smart', f.notes]).status, 0)
})

test('an ordinary mid-write error restores prior records and retry is safe', t => {
  const f = fixture(t)
  fs.writeFileSync(f.notes, 'decision: ROLLBACK_ME\nrisk: WRITE_FAILS\n')
  assert.equal(f.run(['debrief', '--smart', f.notes]).status, 0)
  const before = fs.readFileSync(path.join(f.eng, 'decisions.md'), 'utf8')
  const shim = path.join(f.dir, 'fail-write.cjs')
  fs.writeFileSync(shim, `const fs = require('fs'); const append = fs.appendFileSync; let failed = false;
fs.appendFileSync = function(file, ...args) {
  if (!failed && String(file).endsWith('/risks.md')) { failed = true; throw Object.assign(new Error('simulated disk full'), { code: 'ENOSPC' }); }
  return append.call(fs, file, ...args);
};`)
  const result = spawnSync(process.execPath, ['--require', shim, path.resolve(__dirname, '../bin/fde.js'), 'debrief', '--apply'], {
    cwd: f.dir, env: { ...process.env, HOME: path.join(f.dir, 'home'), FDEOPS_ENGAGEMENT: f.eng, FDEOPS_ENGAGEMENTS_ROOT: path.join(f.dir, 'clients') }, encoding: 'utf8',
  })
  assert.equal(result.status, 1); assert.match(result.stderr, /no record changes kept/)
  assert.equal(fs.readFileSync(path.join(f.eng, 'decisions.md'), 'utf8'), before)
  assert.ok(fs.existsSync(path.join(f.eng, '.debrief-propose')))
  assert.equal(f.run(['debrief', '--apply']).status, 0)
  assert.equal(fs.readFileSync(path.join(f.eng, 'decisions.md'), 'utf8').split('ROLLBACK_ME').length - 1, 1)
})

test('two agents applying the same proposal write it only once', async t => {
  const f = fixture(t)
  fs.writeFileSync(f.notes, 'decision: CONCURRENT_ONCE\nrisk: SHARED_RISK\n')
  assert.equal(f.run(['debrief', '--smart', f.notes]).status, 0)
  const apply = () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.resolve(__dirname, '../bin/fde.js'), 'debrief', '--apply'], { cwd: f.cwd, env: f.env })
    let stderr = ''; child.stderr.on('data', b => { stderr += b }); child.stdout.resume()
    child.on('error', reject); child.on('close', status => resolve({ status, stderr }))
  })
  const results = await Promise.all([apply(), apply()])
  assert.deepEqual(results.map(r => r.status).sort(), [0, 1])
  assert.match(results.find(r => r.status === 1).stderr, /nothing to apply/)
  assert.equal(fs.readFileSync(path.join(f.eng, 'decisions.md'), 'utf8').split('CONCURRENT_ONCE').length - 1, 1)
})

test('failed explicit replacement preserves the old proposal and its sealed private note', t => {
  const f = fixture(t)
  fs.writeFileSync(f.notes, 'decision: FIRST_REVIEW\n<private>FIRST_SECRET</private>\n')
  assert.equal(f.run(['debrief', '--smart', f.notes]).status, 0)
  const files = ['.debrief-propose', '.debrief-private', '.debrief-seal']
  const before = files.map(file => fs.readFileSync(path.join(f.eng, file), 'utf8'))
  fs.writeFileSync(f.notes, 'decision: NEW_REVIEW\n<private>DIFFERENT_SECRET</private>\n')
  const shim = path.join(f.dir, 'fail-proposal.cjs')
  fs.writeFileSync(shim, `const fs = require('fs'); const rename = fs.renameSync; let failed = false;
fs.renameSync = function(from, to) {
  if (!failed && String(to).endsWith('/.debrief-seal')) { failed = true; throw Object.assign(new Error('simulated disk full'), { code: 'ENOSPC' }); }
  return rename.call(fs, from, to);
};`)
  const result = spawnSync(process.execPath, ['--require', shim, path.resolve(__dirname, '../bin/fde.js'), 'debrief', '--smart', f.notes, '--replace-proposal'], { cwd: f.cwd, env: f.env, encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.deepEqual(files.map(file => fs.readFileSync(path.join(f.eng, file), 'utf8')), before)
  assert.equal(f.run(['debrief', '--apply']).status, 0)
  assert.match(fs.readFileSync(path.join(f.eng, 'context.md'), 'utf8'), /FIRST_SECRET/)
  assert.doesNotMatch(fs.readFileSync(path.join(f.eng, 'context.md'), 'utf8'), /DIFFERENT_SECRET/)
})

test('combined smart apply, dry-run and ingest previews remain bounded', t => {
  const f = fixture(t)
  fs.writeFileSync(f.notes, Array.from({ length: 2500 }, (_, i) => `Background note ${i}: someone discussed the system.`).join('\n'))
  for (const args of [['debrief', '--smart', f.notes, '--apply'], ['debrief', '--dry-run', f.notes]]) {
    const result = f.run(args)
    assert.equal(result.status, 0, result.stderr)
    assert.ok(Buffer.byteLength(result.stdout + result.stderr) <= 16384)
    assert.match(result.stdout, /omitted/)
  }
  assert.equal(f.run(['ingest', 'stage', f.notes, '--source', 'manual', '--title', 'large-notes']).status, 0)
  const inbox = path.join(path.dirname(f.eng), '.inbox')
  const id = fs.readdirSync(inbox).find(file => file.endsWith('.md'))
  const result = f.run(['ingest', 'propose', id])
  assert.equal(result.status, 0, result.stderr)
  assert.ok(Buffer.byteLength(result.stdout + result.stderr) <= 16384)
  assert.match(result.stdout, /omitted/)
  assert.match(result.stdout, /ingest apply/)
})
