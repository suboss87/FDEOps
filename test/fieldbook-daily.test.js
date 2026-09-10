const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { spawnSync } = require('node:child_process')

const root = path.join(__dirname, '..')
const fde = path.join(root, 'bin', 'fde.js')

function makeSandbox(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `fdeops-${name}-`))
  const home = path.join(dir, 'home')
  const workspace = path.join(dir, 'workspace')
  fs.mkdirSync(home, { recursive: true })
  fs.mkdirSync(workspace, { recursive: true })
  return { dir: fs.realpathSync(dir), home: fs.realpathSync(home), workspace: fs.realpathSync(workspace) }
}

function runFde(sandbox, args) {
  const result = spawnSync(process.execPath, [fde, ...args], {
    cwd: sandbox.workspace,
    env: { ...process.env, HOME: sandbox.home, USERPROFILE: sandbox.home, FDEOPS_ENGAGEMENT: '', FDEOS_ENGAGEMENT: '' },
    encoding: 'utf8',
  })
  return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' }
}

function engagementPath(sandbox, slug) {
  return path.join(sandbox.home, 'fde-engagements', slug, '.fde')
}

test('dashboard exports cannot replace client records or write through a record directory alias', t => {
  const sandbox = makeSandbox('dashboard-record-destination')
  t.after(() => fs.rmSync(sandbox.dir, { recursive: true, force: true }))
  assert.equal(runFde(sandbox, ['resume', '--init', 'acme']).status, 0)
  const eng = engagementPath(sandbox, 'acme')
  const record = path.join(eng, 'success.md')
  const before = fs.readFileSync(record, 'utf8')
  const direct = runFde(sandbox, ['dashboard', '--out', record])
  assert.notEqual(direct.status, 0)
  assert.equal(fs.readFileSync(record, 'utf8'), before)
  const alias = path.join(sandbox.dir, 'records-alias')
  fs.symlinkSync(eng, alias, 'dir')
  assert.notEqual(runFde(sandbox, ['dashboard', '--out', path.join(alias, 'report.html')]).status, 0)
  assert.equal(fs.existsSync(path.join(eng, 'report.html')), false)
  const report = path.join(sandbox.dir, 'portfolio.html')
  assert.equal(runFde(sandbox, ['dashboard', '--all', '--out', report]).status, 0)
  assert.equal(runFde(sandbox, ['dashboard', '--all', '--out', report]).status, 0, 'refreshing an ordinary report remains supported')
})

test('fieldbook people rows use table names, not the/Friday from signal prose', () => {
  const sandbox = makeSandbox('people-garvey')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Garvey Payments']).status, 0)
  const src = fs.readFileSync(path.join(root, 'examples/garvey-payments/.fde/stakeholders.md'), 'utf8')
  fs.writeFileSync(path.join(engagementPath(sandbox, 'garvey-payments'), 'stakeholders.md'), src)
  const out = path.join(sandbox.dir, 'fieldbook.html')
  const dash = runFde(sandbox, ['dashboard', '--out', out])
  assert.equal(dash.status, 0, dash.stderr)
  const html = fs.readFileSync(out, 'utf8')
  const names = [...html.matchAll(/fb-person-name">([^<]+)/g)].map(m => m[1])
  assert.deepEqual(names.sort(), ['CTO (invite)', 'June Porter (finance controller)', 'Platform lead', 'Prior vendor (left)'].sort())
  assert.doesNotMatch(html, /fb-person-name">the</)
  assert.doesNotMatch(html, /fb-person-name">Friday</)
  assert.equal(names.filter(n => /^CTO\b/.test(n)).length, 1, 'one CTO row, not a duplicate from signal prose')
})

test('fieldbook still keys INCIDENT recovery on the person, not the event word', () => {
  const sandbox = makeSandbox('people-incident')
  assert.equal(runFde(sandbox, ['resume', '--init', 'acme']).status, 0)
  fs.writeFileSync(path.join(engagementPath(sandbox, 'acme'), 'stakeholders.md'), [
    '# Stakeholders',
    '',
    '| Name | Signal | Notes |',
    '|------|--------|-------|',
    '| Marcus Hale | champion | sponsor |',
    '',
    '## Signal history',
    '',
    '- [2026-09-01] [signal:red] INCIDENT: overnight AP batch failed, Marcus Hale escalated',
    '- [2026-09-02] [signal:green] recovery confirmed by Marcus Hale, batch green two nights running',
    '',
  ].join('\n'))
  const out = path.join(sandbox.dir, 'fieldbook.html')
  assert.equal(runFde(sandbox, ['dashboard', '--out', out]).status, 0)
  const html = fs.readFileSync(out, 'utf8')
  assert.match(html, /fb-person-name">Marcus Hale/)
  assert.doesNotMatch(html, /fb-person-name">INCIDENT/)
  assert.doesNotMatch(html, /fb-person-name">recovery/)
})

test('named acceptance with pending evidence remains a claim and nags missing evidence', () => {
  const sandbox = makeSandbox('evidence-accepted')
  assert.equal(runFde(sandbox, ['resume', '--init', 'acme']).status, 0)
  fs.writeFileSync(path.join(engagementPath(sandbox, 'acme'), 'delivery.md'), [
    '# Delivery', '## Value ledger',
    '| Slice | Promised | Measured | Accepted by | Evidence |',
    '|---|---|---|---|---|',
    '| Export | no lost rows | 0 lost | Priya 2026-09-09 | pending |',
    '',
  ].join('\n'))
  const out = path.join(sandbox.dir, 'fieldbook.html')
  assert.equal(runFde(sandbox, ['dashboard', '--out', out]).status, 0)
  const html = fs.readFileSync(out, 'utf8')
  assert.match(html, /missing evidence/)
  assert.match(html, /Awaiting acceptance/)
  assert.doesNotMatch(html, /Acceptance recorded/)
  assert.match(html, /Priya 2026-09-09/)
  assert.match(runFde(sandbox, ['status']).stdout, /claimed, not yet accepted/)
})

test('named acceptance with a supplied measurement source is recorded without claiming authentication', () => {
  const sandbox = makeSandbox('evidence-sourced')
  assert.equal(runFde(sandbox, ['resume', '--init', 'acme']).status, 0)
  fs.writeFileSync(path.join(engagementPath(sandbox, 'acme'), 'delivery.md'), [
    '# Delivery', '## Value ledger',
    '| Slice | Promised | Measured | Accepted by | Evidence | Acceptance status |',
    '|---|---|---|---|---|---|',
    '| Export | no lost rows | 0 lost | Priya, meeting 2026-09-09 | PR #42, replay.csv | accepted |',
    '',
  ].join('\n'))
  const out = path.join(sandbox.dir, 'fieldbook.html')
  assert.equal(runFde(sandbox, ['dashboard', '--out', out]).status, 0)
  const html = fs.readFileSync(out, 'utf8')
  assert.match(html, /Acceptance recorded/)
  assert.match(html, /PR #42, replay.csv/)
  assert.match(html, /Priya, meeting 2026-09-09/)
  assert.match(html, /not independent verification/)
  assert.doesNotMatch(html, /missing evidence/)
})

test('empty fieldbook stays new, not verified, and ships clipboard fallback markup', () => {
  const sandbox = makeSandbox('empty-new')
  assert.equal(runFde(sandbox, ['resume', '--init', 'fresh']).status, 0)
  const out = path.join(sandbox.dir, 'fieldbook.html')
  assert.equal(runFde(sandbox, ['dashboard', '--out', out]).status, 0)
  const html = fs.readFileSync(out, 'utf8')
  assert.match(html, /No dated trust signal yet - ask someone/)
  assert.match(html, /No delivery evidence yet/)
  assert.doesNotMatch(html, />steady</)
  assert.match(html, /id="fb-prompt-dialog"/)
  assert.match(html, /id="fb-prompt-text"/)
  assert.match(html, /Automatic copy is unavailable/)
  const client = fs.readFileSync(path.join(root, 'bin/lib/fieldbook-client.js'), 'utf8')
  assert.match(client, /if \(id === 'fb-main'\) \{ id = 'today'/)
  assert.match(client, /event\.preventDefault\(\)/)
})
