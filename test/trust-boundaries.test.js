const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const test = require('node:test')
const root = path.join(__dirname, '..')

function fixture(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fde-trust-')))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const home = path.join(dir, 'home'), workspace = path.join(dir, 'workspace')
  const eng = path.join(dir, 'engagements', 'client', '.fde')
  for (const p of [home, workspace, eng]) fs.mkdirSync(p, { recursive: true })
  const env = { ...process.env, HOME: home, USERPROFILE: home, FDEOPS_ENGAGEMENT: eng,
    FDEOS_ENGAGEMENT: '', FDEOPS_ENGAGEMENTS_ROOT: path.join(dir, 'engagements'),
    CLAUDE_PLUGIN_ROOT: root, PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin` }
  const run = args => spawnSync(process.execPath, [path.join(root, 'bin/fde.js'), ...args], { cwd: workspace, env, encoding: 'utf8', timeout: 15000 })
  const hook = overrides => spawnSync('bash', [path.join(root, 'hooks/session-start')], { cwd: workspace, env: { ...env, ...overrides }, encoding: 'utf8', timeout: 15000 })
  return { dir, eng, env, run, hook }
}

test('startup context uses the CLI privacy boundary before bounding long notes', t => {
  const f = fixture(t)
  const notes = ['# Engagement context', '**Phase:** land', 'VISIBLE_SENTINEL',
    '<private data-owner="client">ATTRIBUTE_SECRET</private>',
    '<PRIVATE>OUTER_SECRET<private>INNER_SECRET</private>STILL_PRIVATE</PRIVATE>',
    '<!-- COMMENT_SECRET -->', String.raw`literal \033[31m stays data`,
    '## Session end', ...Array.from({ length: 180 }, (_, i) => `old session ${i}`),
    'RECENT_SENTINEL', '<private>UNCLOSED_SECRET'].join('\n')
  fs.writeFileSync(path.join(f.eng, 'context.md'), notes)
  const cli = f.run(['resume']), hook = f.hook()
  assert.equal(cli.status, 0, cli.stderr)
  assert.equal(hook.status, 0, hook.stderr)
  for (const out of [cli.stdout, hook.stdout]) {
    assert.match(out, /VISIBLE_SENTINEL/)
    assert.match(out, /RECENT_SENTINEL/)
    assert.match(out, /lines of earlier session log hidden/)
    assert.doesNotMatch(out, /ATTRIBUTE_SECRET|OUTER_SECRET|INNER_SECRET|STILL_PRIVATE|COMMENT_SECRET|UNCLOSED_SECRET/)
    assert.ok(!out.includes('\x1b'), 'notes must not introduce terminal escapes')
  }
  assert.ok(hook.stdout.includes(cli.stdout.trim()), 'startup must use the complete canonical resume output')
})

test('startup fails closed for invalid client overrides', t => {
  const f = fixture(t)
  fs.writeFileSync(path.join(f.eng, 'context.md'), 'PRIVATE_CLIENT_SENTINEL')
  const result = f.hook({ FDEOPS_ENGAGEMENT: 'missing-client' })
  assert.equal(result.status, 0)
  assert.equal(result.stdout, '')
})

for (const acceptance of ['not approved', 'Priya: not approved', 'awaiting Priya', 'Priya (pending)', 'rejected by Priya', 'approval revoked', 'Priya?', 'approved', 'yes', 'Priya approval required', 'Approval needed from Priya', 'Priya (tentative)']) {
  test(`delivery never treats uncertain approval as a signer: ${acceptance}`, t => {
    const f = fixture(t)
    fs.writeFileSync(path.join(f.eng, 'context.md'), '# Context\n**Phase:** outcome\n')
    fs.writeFileSync(path.join(f.eng, 'delivery.md'), `# Delivery\n## Value ledger\n| Slice | Promised | Measured | Accepted by | Evidence |\n|---|---|---|---|---|\n| Retry | 10 min | 5 min | ${acceptance} | staging run |\n`)
    const status = f.run(['status'])
    assert.equal(status.status, 0, status.stderr)
    assert.match(status.stdout, /claimed, not yet accepted/)
    assert.doesNotMatch(status.stdout, /accepted by/)
  })
}

const { valueState } = require('../bin/lib/value-ledger')
test('explicit acceptance status needs signer, measurement and evidence; legacy rows remain readable', () => {
  const accepted = { measured: '5 min', accepted: 'Priya Shah, 2026-09-10', evidence: 'Priya email 2026-09-10', acceptanceStatus: 'accepted' }
  assert.equal(valueState(accepted), 'accepted')
  for (const acceptanceStatus of ['', 'pending', 'rejected', 'revoked', 'approved', 'unexpected']) {
    assert.equal(valueState({ ...accepted, acceptanceStatus }), 'claimed', acceptanceStatus)
  }
  assert.equal(valueState({ ...accepted, evidence: 'pending' }), 'claimed')
  assert.equal(valueState({ ...accepted, accepted: 'approved' }), 'claimed')
  assert.equal(valueState({ ...accepted, measured: 'pending' }), 'unmeasured')
  for (const accepted of ['May', 'Jan', 'Denise Chen, Aug 14']) assert.equal(valueState({ measured: '5 min', accepted, evidence: 'PR #42' }), 'accepted')
  assert.equal(valueState({ measured: '5 min', accepted: 'Priya Shah, approved 2026-09-10', evidence: 'PR #42' }), 'accepted')
})

test('explicit revocation stays unaccepted in CLI, dashboard and vault', t => {
  const f = fixture(t)
  fs.writeFileSync(path.join(f.eng, 'context.md'), '# Context\n**Phase:** outcome\n')
  fs.writeFileSync(path.join(f.eng, 'delivery.md'), '# Delivery\n## Value ledger\n| Slice | Promised | Measured | Accepted by | Evidence | Acceptance status |\n|---|---|---|---|---|---|\n| Retry | 10 min | 5 min | Priya Shah | email Sep 10 | revoked |\n')
  const status = f.run(['status'])
  assert.equal(status.status, 0, status.stderr)
  assert.match(status.stdout, /claimed, not yet accepted/)
  const output = path.join(f.dir, 'report.html')
  const report = f.run(['dashboard', '--out', output])
  assert.equal(report.status, 0, report.stderr)
  const html = fs.readFileSync(output, 'utf8')
  assert.ok(html.includes('Awaiting acceptance'), 'report must show the outcome as awaiting acceptance')
  assert.doesNotMatch(html, /accepted by Priya/)
  const vault = f.run(['vault', '--out', path.join(f.dir, 'vault')])
  assert.equal(vault.status, 0, vault.stderr)
  const files = fs.readdirSync(path.join(f.dir, 'vault'))
  assert.ok(files.length > 0)
  const overview = fs.readFileSync(path.join(f.dir, 'vault', 'Questions.md'), 'utf8')
  assert.match(overview, /Retry/)
})


test('startup supports an approved in-repository fieldbook', t => {
  const f = fixture(t)
  const cwd = path.join(f.dir, 'workspace')
  fs.mkdirSync(path.join(cwd, '.fde'))
  fs.writeFileSync(path.join(cwd, '.fde/context.md'), 'LOCAL_CONTEXT_SENTINEL')
  const out = f.hook({ FDEOPS_ENGAGEMENT: '' })
  assert.equal(out.status, 0, out.stderr)
  assert.match(out.stdout, /LOCAL_CONTEXT_SENTINEL/)
})


test('initialization preserves unrelated files in an existing client directory', t => {
  const f = fixture(t)
  const client = path.join(f.env.FDEOPS_ENGAGEMENTS_ROOT, 'acme')
  fs.mkdirSync(client)
  const contract = path.join(client, 'contract.txt')
  fs.writeFileSync(contract, 'KEEP_EXISTING_CONTRACT')
  const result = f.run(['resume', '--init', 'acme'])
  assert.equal(result.status, 0, result.stderr)
  assert.equal(fs.readFileSync(contract, 'utf8'), 'KEEP_EXISTING_CONTRACT')
  assert.ok(fs.existsSync(path.join(client, '.fde/context.md')))
  assert.equal(f.run(['resume', '--init', 'acme']).status, 0)
  assert.equal(fs.readFileSync(contract, 'utf8'), 'KEEP_EXISTING_CONTRACT')
})

test('initialization refuses linked client destinations without modifying them', t => {
  const f = fixture(t)
  const outside = path.join(f.dir, 'outside')
  fs.mkdirSync(outside)
  fs.writeFileSync(path.join(outside, 'keep.txt'), 'UNCHANGED')
  fs.symlinkSync(outside, path.join(f.env.FDEOPS_ENGAGEMENTS_ROOT, 'linked'))
  const result = f.run(['resume', '--init', 'linked'])
  assert.notEqual(result.status, 0)
  assert.deepEqual(fs.readdirSync(outside), ['keep.txt'])
  assert.equal(fs.readFileSync(path.join(outside, 'keep.txt'), 'utf8'), 'UNCHANGED')
})

test('startup never reads raw context when its Node runtime cannot run', t => {
  const f = fixture(t)
  const bin = path.join(f.dir, 'bin')
  fs.mkdirSync(bin)
  fs.writeFileSync(path.join(bin, 'node'), '#!/bin/sh\nexit 127\n', { mode: 0o755 })
  fs.writeFileSync(path.join(f.eng, 'context.md'), 'RAW_CONTEXT_MUST_NOT_APPEAR')
  const result = f.hook({ PATH: `${bin}:/usr/bin:/bin` })
  assert.equal(result.status, 0)
  assert.equal(result.stdout, '')
})

for (const explicit of [false, true]) {
  test(`approval prose without a named signer stays claimed across outputs (explicit=${explicit})`, t => {
    const f = fixture(t)
    const cells = ['approved 2026-09-10', '**approved** 2026-09-10', 'accepted September 10, 2026', 'signed off by customer', 'customer sponsor', 'customer sponsor 2026-09-10', 'customer approved 2026-09-10', 'sponsor signed off']
    for (const accepted of cells) {
      assert.equal(valueState({ measured: '5 min', accepted, evidence: 'email', ...(explicit ? { acceptanceStatus: 'accepted' } : {}) }), 'claimed', accepted)
    }
    fs.writeFileSync(path.join(f.eng, 'context.md'), '# Context\n**Phase:** outcome\n')
    const extra = explicit ? ' Acceptance status |' : ''
    const separator = explicit ? '---|' : ''
    const rows = cells.map((cell, i) => `| Slice${i} | 10 min | 5 min | ${cell} | email |${explicit ? ' accepted |' : ''}`).join('\n')
    fs.writeFileSync(path.join(f.eng, 'delivery.md'), `# Delivery\n## Value ledger\n| Slice | Promised | Measured | Accepted by | Evidence |${extra}\n|---|---|---|---|---|${separator}\n${rows}\n`)
    const status = f.run(['status'])
    assert.equal(status.status, 0, status.stderr)
    assert.doesNotMatch(status.stdout, /accepted by/)
    const output = path.join(f.dir, 'report.html')
    assert.equal(f.run(['dashboard', '--out', output]).status, 0)
    assert.doesNotMatch(fs.readFileSync(output, 'utf8'), /accepted by approved|accepted by customer/)
    const vault = path.join(f.dir, 'vault')
    assert.equal(f.run(['vault', '--out', vault]).status, 0)
    const questions = fs.readFileSync(path.join(vault, 'Questions.md'), 'utf8')
    for (let i = 0; i < cells.length; i++) assert.ok(questions.includes(`Slice${i}`))
  })
}
