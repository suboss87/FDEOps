const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const cli = path.resolve(__dirname, '../bin/fde.js')
const server = path.resolve(__dirname, '../mcp/fdeops-ingest/server.js')

test('MCP refuses invalid explicit customer selectors before any tool reads or writes', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fde-mcp-selection-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const env = { ...process.env, HOME: dir, USERPROFILE: dir, FDEOPS_ENGAGEMENTS_ROOT: path.join(dir, 'clients'), FDEOPS_ENGAGEMENT: '', FDEOS_ENGAGEMENT: '', FDEOPS_FDE: '' }
  const run = args => spawnSync(process.execPath, [cli, ...args], { cwd: dir, env, encoding: 'utf8' })
  assert.equal(run(['resume', '--init', 'atlas']).status, 0)
  const requests = []
  for (const name of ['ingest_stage', 'ingest_list', 'ingest_propose', 'ingest_apply']) {
    for (const engagement of ['', '   ', null, 42, false, {}, []]) {
      requests.push({ jsonrpc: '2.0', id: requests.length + 1, method: 'tools/call', params: { name, arguments: { engagement, content: 'decision: Wrong customer', id: 'missing' } } })
    }
  }
  const result = spawnSync(process.execPath, [server], { cwd: dir, env, encoding: 'utf8', input: requests.map(r => JSON.stringify(r)).join('\n') + '\n', timeout: 10000 })
  assert.equal(result.status, 0, result.stderr)
  const responses = result.stdout.trim().split('\n').map(line => JSON.parse(line))
  assert.equal(responses.length, requests.length)
  for (const response of responses) {
    assert.equal(response.result.isError, true)
    assert.match(response.result.content[0].text, /engagement must be a non-empty string/)
  }
  assert.equal(fs.existsSync(path.join(dir, 'clients/atlas/.inbox')), false)
  assert.equal(fs.existsSync(path.join(dir, 'clients/atlas/.fde/.debrief-propose')), false)
  // Omission uses the binding; an explicit valid selection overrides it.
  assert.equal(run(['resume', '--init', 'beta']).status, 0)
  const call = arguments_ => {
    const request = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'ingest_stage', arguments: arguments_ } }
    const result = spawnSync(process.execPath, [server], { cwd: dir, env, encoding: 'utf8', input: JSON.stringify(request) + '\n', timeout: 10000 })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(JSON.parse(result.stdout).result.isError, undefined, result.stdout)
  }
  call({ content: 'decision: Bound beta', title: 'beta-note' })
  call({ engagement: path.join(dir, 'clients/atlas/.fde'), content: 'decision: Selected atlas', title: 'atlas-note' })
  for (const client of ['atlas', 'beta']) {
    const inbox = path.join(dir, 'clients', client, '.inbox')
    const files = fs.readdirSync(inbox).filter(name => name.endsWith('.md'))
    assert.equal(files.length, 1)
    assert.match(files[0], new RegExp(client + '-note'))
  }
})
