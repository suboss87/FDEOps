const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { spawn, spawnSync } = require('node:child_process')
const cli = path.resolve(__dirname, '../bin/fde.js')

function fixture(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fde-record-race-')))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const home = path.join(dir, 'home'), workspace = path.join(dir, 'workspace')
  fs.mkdirSync(home); fs.mkdirSync(workspace)
  const env = { ...process.env, HOME: home, USERPROFILE: home, FDEOPS_ENGAGEMENT: '', FDEOS_ENGAGEMENT: '', FDEOPS_ENGAGEMENTS_ROOT: path.join(dir, 'clients') }
  const run = args => spawnSync(process.execPath, [cli, ...args], { cwd: workspace, env, encoding: 'utf8' })
  assert.equal(run(['resume', '--init', 'acme']).status, 0)
  return { dir, workspace, env, run, eng: path.join(dir, 'clients/acme/.fde') }
}

// Pause immediately before a chosen lock acquisition. This models another
// cooperating writer finishing first, without scheduler-sensitive sleeps.
async function interleave(f, args, target, change) {
  const shim = path.join(f.dir, 'pause.cjs'), reached = path.join(f.dir, 'reached'), release = path.join(f.dir, 'release')
  fs.writeFileSync(shim, `const fs = require('node:fs'); const open = fs.openSync; let paused = false;
fs.openSync = function(file, ...args) {
  if (!paused && file === ${JSON.stringify(target + '.lock')}) {
    paused = true; fs.writeFileSync(${JSON.stringify(reached)}, 'ready');
    const until = Date.now() + 10000;
    while (!fs.existsSync(${JSON.stringify(release)})) {
      if (Date.now() > until) throw Error('test barrier timed out');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  return open.call(fs, file, ...args);
};`)
  const child = spawn(process.execPath, ['--require', shim, cli, ...args], { cwd: f.workspace, env: f.env, stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = '', stderr = ''
  child.stdout.on('data', b => { stdout += b }); child.stderr.on('data', b => { stderr += b })
  const done = new Promise((resolve, reject) => { child.on('error', reject); child.on('close', code => resolve(code)) })
  const until = Date.now() + 10000
  try {
    while (!fs.existsSync(reached)) {
      if (child.exitCode !== null || Date.now() > until) throw Error(`writer never reached lock: ${stderr}`)
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    change()
  } finally { fs.writeFileSync(release, 'go') }
  assert.equal(await done, 0, stdout + stderr)
}

test('phase update preserves a context append completed before its lock', async t => {
  const f = fixture(t), target = path.join(f.eng, 'context.md')
  await interleave(f, ['log', 'phase', 'discover'], target, () => fs.appendFileSync(target, '\nCONCURRENT_CONTEXT\n'))
  const text = fs.readFileSync(target, 'utf8')
  assert.match(text, /CONCURRENT_CONTEXT/); assert.match(text, /\*\*Phase:\*\* discover/)
})

test('undo removes its entry while preserving a concurrent decision', async t => {
  const f = fixture(t), target = path.join(f.eng, 'decisions.md')
  assert.equal(f.run(['log', 'decision', 'UNDO_THIS_ENTRY']).status, 0)
  await interleave(f, ['log', '--undo'], target, () => fs.appendFileSync(target, '\n- [2026-09-10] KEEP_CONCURRENT_DECISION\n'))
  const text = fs.readFileSync(target, 'utf8')
  assert.doesNotMatch(text, /UNDO_THIS_ENTRY/); assert.match(text, /KEEP_CONCURRENT_DECISION/)
})

test('redaction matches current content instead of stale line positions', async t => {
  const f = fixture(t), target = path.join(f.eng, 'decisions.md')
  fs.writeFileSync(target, '# Decisions\nREMOVE_SENTINEL\nKEEP_ORIGINAL\n')
  await interleave(f, ['redact', 'REMOVE_SENTINEL', '--apply'], target, () => fs.writeFileSync(target, 'KEEP_CONCURRENT\n' + fs.readFileSync(target, 'utf8')))
  const text = fs.readFileSync(target, 'utf8')
  assert.doesNotMatch(text, /REMOVE_SENTINEL/); assert.match(text, /KEEP_ORIGINAL/); assert.match(text, /KEEP_CONCURRENT/)
})

test('delivery ledger update preserves another writer’s completed row', async t => {
  const f = fixture(t), target = path.join(f.eng, 'delivery.md')
  await interleave(f, ['log', 'delivery', 'Retry | 10 min | 5 min | Priya | staging'], target, () => fs.appendFileSync(target, '\nCONCURRENT_DELIVERY_NOTE\n'))
  const text = fs.readFileSync(target, 'utf8')
  assert.match(text, /CONCURRENT_DELIVERY_NOTE/); assert.match(text, /Retry/)
})

test('failed undo releases metadata lock so a later log can proceed', t => {
  const f = fixture(t)
  assert.equal(f.run(['log', '--undo']).status, 1)
  assert.equal(fs.existsSync(path.join(f.eng, '.last-write.lock')), false)
  assert.equal(f.run(['log', 'decision', 'new decision after empty undo']).status, 0)
})

test('MCP initialize, list, stage, propose and explicit apply keep client records isolated', async t => {
  const f = fixture(t)
  assert.equal(f.run(['resume', '--init', 'other']).status, 0)
  const other = path.join(f.dir, 'clients/other/.fde')
  const otherBefore = fs.readFileSync(path.join(other, 'decisions.md'), 'utf8')
  const targetBefore = fs.readFileSync(path.join(f.eng, 'decisions.md'), 'utf8')
  const child = spawn(process.execPath, [path.resolve(__dirname, '../mcp/fdeops-ingest/server.js')], {
    cwd: f.workspace, env: { ...f.env, FDEOPS_ENGAGEMENT: other }, stdio: ['pipe', 'pipe', 'pipe'],
  })
  t.after(() => child.kill())
  let sequence = 0, buffer = ''
  const pending = new Map()
  child.stdout.on('data', chunk => {
    buffer += chunk
    while (buffer.includes('\n')) {
      const end = buffer.indexOf('\n'), line = buffer.slice(0, end)
      buffer = buffer.slice(end + 1)
      if (!line.trim()) continue
      const response = JSON.parse(line), item = pending.get(response.id)
      if (item) { clearTimeout(item.timer); pending.delete(response.id); item.resolve(response) }
    }
  })
  const request = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence
    const timer = setTimeout(() => { pending.delete(id); reject(Error(`MCP request timed out: ${method}`)) }, 15000)
    pending.set(id, { resolve, timer })
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
  })
  const call = (name, args = {}) => request('tools/call', { name, arguments: { engagement: f.eng, ...args } })
  const init = await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'record-regression', version: '1' } })
  assert.equal(init.result.serverInfo.name, 'fdeops-ingest')
  const listing = await request('tools/list')
  assert.deepEqual(listing.result.tools.map(tool => tool.name), ['ingest_stage', 'ingest_list', 'ingest_propose', 'ingest_apply'])
  assert.equal((await call('ingest_apply')).result.isError, true, 'apply without a proposal must fail')
  const staged = await call('ingest_stage', { source: 'manual', title: 'safe-review', content: 'decision: CLIENT_A_DECISION\n<private>CLIENT_A_PRIVATE</private>\n' })
  assert.equal(staged.result.isError, undefined)
  const id = fs.readdirSync(path.join(f.dir, 'clients/acme/.inbox')).find(name => name.endsWith('.md'))
  assert.ok(id)
  const proposed = await call('ingest_propose', { id })
  assert.equal(proposed.result.isError, undefined)
  assert.doesNotMatch(JSON.stringify(proposed), /CLIENT_A_PRIVATE/)
  assert.equal(fs.readFileSync(path.join(f.eng, 'decisions.md'), 'utf8'), targetBefore, 'staging and proposal cannot apply decisions')
  const applied = await call('ingest_apply')
  assert.equal(applied.result.isError, undefined, JSON.stringify(applied))
  assert.match(fs.readFileSync(path.join(f.eng, 'decisions.md'), 'utf8'), /CLIENT_A_DECISION/)
  assert.equal(fs.readFileSync(path.join(other, 'decisions.md'), 'utf8'), otherBefore)
  assert.equal((await call('ingest_stage', { engagement: 'missing-client', content: 'must never reach other client' })).result.isError, true)
  assert.equal(fs.existsSync(path.join(f.dir, 'clients/other/.inbox')), false)
  child.kill()
})

for (const file of ['context.md', 'context-archive.md']) {
  test(`tidy archive preserves another writer’s ${file} update`, async t => {
    const f = fixture(t), context = path.join(f.eng, 'context.md'), target = path.join(f.eng, file)
    fs.writeFileSync(context, '# Context\n' + ['01', '02', '03'].map(day => `\n## Session end - 2020-01-${day}\nold session ${day}\n`).join(''))
    fs.writeFileSync(path.join(f.eng, 'context-archive.md'), '# Context archive\nEXISTING_ARCHIVE\n')
    await interleave(f, ['tidy', '--apply'], target, () => fs.appendFileSync(target, '\n## Current update\nCONCURRENT_RECORD\n'))
    assert.match(fs.readFileSync(target, 'utf8'), /CONCURRENT_RECORD/)
    assert.match(fs.readFileSync(path.join(f.eng, 'context-archive.md'), 'utf8'), /EXISTING_ARCHIVE/)
    assert.doesNotMatch(fs.readFileSync(context, 'utf8'), /old session/)
  })
}

test('undo contention releases its metadata lock and preserves the competing lock', t => {
  const f = fixture(t)
  assert.equal(f.run(['log', 'decision', 'UNDO_AFTER_CONTENTION']).status, 0)
  const target = path.join(f.eng, 'decisions.md'), lock = target + '.lock'
  fs.writeFileSync(lock, 'other writer')
  const before = fs.readFileSync(target, 'utf8')
  const result = f.run(['log', '--undo'])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /could not lock decisions.md/)
  assert.equal(fs.existsSync(path.join(f.eng, '.last-write.lock')), false)
  assert.equal(fs.readFileSync(lock, 'utf8'), 'other writer')
  assert.equal(fs.readFileSync(target, 'utf8'), before)
  fs.unlinkSync(lock)
  assert.equal(f.run(['log', '--undo']).status, 0)
})

test('archive contention releases its context lock without changing the live record', t => {
  const f = fixture(t), context = path.join(f.eng, 'context.md')
  const original = '# Context\n' + ['01', '02', '03'].map(day => `\n## Session end - 2020-01-${day}\nold session ${day}\n`).join('')
  fs.writeFileSync(context, original)
  const lock = path.join(f.eng, 'context-archive.md.lock')
  fs.writeFileSync(lock, 'other archivist')
  const result = f.run(['tidy', '--apply'])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /could not lock context-archive.md/)
  assert.equal(fs.existsSync(context + '.lock'), false)
  assert.equal(fs.readFileSync(context, 'utf8'), original)
  assert.equal(fs.readFileSync(lock, 'utf8'), 'other archivist')
  fs.unlinkSync(lock)
  assert.equal(f.run(['tidy', '--apply']).status, 0)
})

test('unsafe archive write unwinds both locks and preserves linked data', t => {
  const f = fixture(t), context = path.join(f.eng, 'context.md')
  const original = '# Context\n' + ['01', '02', '03'].map(day => `\n## Session end - 2020-01-${day}\nold session ${day}\n`).join('')
  fs.writeFileSync(context, original)
  const outside = path.join(f.dir, 'outside.txt'), archive = path.join(f.eng, 'context-archive.md')
  fs.writeFileSync(outside, 'KEEP_EXTERNAL')
  fs.symlinkSync(outside, archive)
  const result = f.run(['tidy', '--apply'])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /symlink/)
  assert.equal(fs.existsSync(context + '.lock'), false)
  assert.equal(fs.existsSync(archive + '.lock'), false)
  assert.equal(fs.readFileSync(context, 'utf8'), original)
  assert.equal(fs.readFileSync(outside, 'utf8'), 'KEEP_EXTERNAL')
})
