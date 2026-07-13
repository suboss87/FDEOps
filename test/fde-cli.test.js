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

function runFde(sandbox, args, opts = {}) {
  const result = spawnSync(process.execPath, [fde, ...args], {
    cwd: opts.cwd || sandbox.workspace,
    env: {
      ...process.env,
      HOME: sandbox.home,
      USERPROFILE: sandbox.home,
      FDEOPS_ENGAGEMENT: '',
      FDEOS_ENGAGEMENT: '',
      ...(opts.env || {}),
    },
    input: opts.input,
    encoding: 'utf8',
  })
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  }
}

function engagementPath(sandbox, slug) {
  return path.join(sandbox.home, 'fde-engagements', slug, '.fde')
}

test('resume --init creates templates, binds the workspace, and resume resolves from registry', () => {
  const sandbox = makeSandbox('resume')
  const init = runFde(sandbox, ['resume', '--init', 'Garvey Payments'])

  assert.equal(init.status, 0, init.stderr)
  assert.match(init.stdout, /ENGAGEMENT READY:/)
  assert.match(init.stdout, /bound to workspace:/)

  const eng = engagementPath(sandbox, 'garvey-payments')
  assert.equal(fs.existsSync(path.join(eng, 'context.md')), true)
  assert.equal(fs.existsSync(path.join(eng, 'retrospectives')), true)

  const registry = fs.readFileSync(path.join(sandbox.home, 'fde-engagements', '.registry'), 'utf8')
  assert.equal(registry, `${sandbox.workspace} garvey-payments\n`)

  const resume = runFde(sandbox, ['resume'])
  assert.equal(resume.status, 0, resume.stderr)
  assert.match(resume.stdout, new RegExp(`ENGAGEMENT: ${eng.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
})

test('log writes dated entries and enforces contact-only signal tokens', () => {
  const sandbox = makeSandbox('log')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)

  const decision = runFde(sandbox, ['log', 'decision', 'ship retry slice'])
  assert.equal(decision.status, 0, decision.stderr)
  assert.match(decision.stdout, /logged → decisions\.md/)

  const contact = runFde(sandbox, ['log', 'contact', 'Denise saw demo', '--signal', 'green'])
  assert.equal(contact.status, 0, contact.stderr)
  assert.match(contact.stdout, /signal:green/)

  const bad = runFde(sandbox, ['log', 'risk', 'scope creep', '--signal', 'amber'])
  assert.notEqual(bad.status, 0)
  assert.match(bad.stderr, /--signal only applies to/)

  const eng = engagementPath(sandbox, 'acme')
  assert.match(fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8'), /- \[\d{4}-\d{2}-\d{2}\] ship retry slice/)
  assert.match(fs.readFileSync(path.join(eng, 'stakeholders.md'), 'utf8'), /\[signal:green\] Denise saw demo/)
})

test('debrief --dry-run routes markdown-style notes without writing files', () => {
  const sandbox = makeSandbox('debrief')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Client']).status, 0)
  const eng = engagementPath(sandbox, 'client')
  const before = fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8')

  const notes = [
    '- **Decision:** keep launch date',
    '* risk: CFO approval pending',
    '+ delivery: retry slice demoed',
    '- contact: Denise warming [signal:green]',
    'unprefixed context line',
  ].join('\n')
  const dryRun = runFde(sandbox, ['debrief', '--dry-run'], { input: notes })

  assert.equal(dryRun.status, 0, dryRun.stderr)
  assert.match(dryRun.stdout, /→ decisions\.md\s+- \[\d{4}-\d{2}-\d{2}\] keep launch date/)
  assert.match(dryRun.stdout, /→ risks\.md/)
  assert.match(dryRun.stdout, /→ delivery\.md/)
  assert.match(dryRun.stdout, /→ stakeholders\.md/)
  assert.match(dryRun.stdout, /→ context\.md\s+- unprefixed context line/)
  assert.match(dryRun.stdout, /debrief would route → 1 decision, 1 risk, 1 delivery, 1 contact, 1 context line/)
  assert.equal(fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8'), before)
})

test('receipts escapes regex metacharacters and reports literal matches', () => {
  const sandbox = makeSandbox('receipts')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Regex']).status, 0)
  assert.equal(runFde(sandbox, ['log', 'decision', 'literal a+b? scope']).status, 0)

  const found = runFde(sandbox, ['receipts', 'a+b?'])
  assert.equal(found.status, 0, found.stderr)
  assert.match(found.stdout, /decisions\.md:\d+\s+- \[\d{4}-\d{2}-\d{2}\] literal a\+b\? scope/)

  const missing = runFde(sandbox, ['receipts', 'a.b'])
  assert.equal(missing.status, 0, missing.stderr)
  assert.match(missing.stdout, /no record of "a\.b"/)
})

test('scan emits repo facts, redacts likely secrets, and asks earned day-1 questions', () => {
  const sandbox = makeSandbox('scan')
  fs.writeFileSync(path.join(sandbox.workspace, 'app.js'), [
    'const openai = require("openai")',
    '// temporary workaround until billing is fixed',
    'console.log(openai)',
  ].join('\n'))
  fs.writeFileSync(path.join(sandbox.workspace, '.env'), 'API_KEY="abcd123456789"\n')

  for (const args of [
    ['init'],
    ['config', 'user.email', 'fdeops-test@example.com'],
    ['config', 'user.name', 'fdeops test'],
    ['add', '.'],
    ['commit', '-m', 'initial'],
  ]) {
    const git = spawnSync('git', args, { cwd: sandbox.workspace, encoding: 'utf8' })
    assert.equal(git.status, 0, git.stderr)
  }

  const scan = runFde(sandbox, ['scan'])
  assert.equal(scan.status, 0, scan.stderr)
  assert.match(scan.stdout, /FDE RECON - workspace/)
  assert.match(scan.stdout, /POSSIBLE HARDCODED SECRETS/)
  assert.match(scan.stdout, /API_KEY="REDACTED"/)
  assert.doesNotMatch(scan.stdout, /abcd123456789/)
  assert.doesNotMatch(scan.stdout, /abcd/, 'no characters of the secret value may show')
  assert.match(scan.stdout, /AI COMPONENTS/)
  assert.match(scan.stdout, /TEMPORARY/)
  assert.match(scan.stdout, /ASK ON DAY 1:/)
})

test('dashboard renders local HTML and redacts private blocks', () => {
  const sandbox = makeSandbox('dashboard')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Field Client']).status, 0)
  const eng = engagementPath(sandbox, 'field-client')
  fs.writeFileSync(path.join(eng, 'context.md'), '## Current state\nPhase: land\nSponsor call complete\n## Next action\nSend recap\n')
  fs.writeFileSync(path.join(eng, 'trust-profile.md'), 'Visible policy\n<private>cardholder data: 4111-1111-1111-1111</private>\n')
  fs.appendFileSync(path.join(eng, 'stakeholders.md'), '\n- [2026-01-01] [signal:red] Denise blocked rollout\n')
  const out = path.join(sandbox.dir, 'fieldbook.html')

  const dashboard = runFde(sandbox, ['dashboard', '--out', out])
  assert.equal(dashboard.status, 0, dashboard.stderr)
  assert.match(dashboard.stdout, /fieldbook →/)
  assert.equal(fs.existsSync(out), true)

  const html = fs.readFileSync(out, 'utf8')
  assert.match(html, /FDEOPS/)
  assert.match(html, /Visible policy/)
  assert.match(html, /private - redacted/)
  assert.doesNotMatch(html, /4111-1111-1111-1111/)
})

// --- privacy regression suite: every read path that can reach the model or a
// shared artifact must redact <private>, in every tag case. Each secret marker
// below reproduces a leak a brutal simulator found on 2026-07-11.
test('receipts never greps <private> content back out', () => {
  const sandbox = makeSandbox('priv-receipts')
  runFde(sandbox, ['resume', '--init', 'nda'])
  const eng = engagementPath(sandbox, 'nda')
  fs.writeFileSync(path.join(eng, 'decisions.md'),
    '# Decisions\n- normal: use Stripe\n- <private>stripe key SECRET-RCPT-1</private>\n')
  const r = runFde(sandbox, ['receipts', 'SECRET'])
  assert.doesNotMatch(r.stdout, /SECRET-RCPT-1/, 'receipts leaked a <private> secret')
  // positive control: non-private content is still findable
  const ok = runFde(sandbox, ['receipts', 'Stripe'])
  assert.match(ok.stdout, /Stripe/, 'receipts over-redacted normal content')
})

test('status never prints a <private> risk line', () => {
  const sandbox = makeSandbox('priv-status')
  runFde(sandbox, ['resume', '--init', 'nda'])
  const eng = engagementPath(sandbox, 'nda')
  fs.writeFileSync(path.join(eng, 'risks.md'),
    '# Risks\n- <private>root pw SECRET-STAT-2 open</private>\n')
  const s = runFde(sandbox, ['status'])
  assert.doesNotMatch(s.stdout, /SECRET-STAT-2/, 'status leaked a <private> risk')
})

test('scan redaction shows no characters of a secret value', () => {
  const sandbox = makeSandbox('priv-scan')
  fs.writeFileSync(path.join(sandbox.workspace, 'app.js'), 'const k = "sk-live-SECRETSCAN424242"\n')
  const git = a => spawnSync('git', a, { cwd: sandbox.workspace, encoding: 'utf8' })
  git(['init']); git(['add', '-A'])
  git(['-c', 'user.email=t@t.com', '-c', 'user.name=t', 'commit', '-m', 's'])
  const scan = runFde(sandbox, ['scan'])
  // no value chars at all - not even the sk-l provider prefix
  assert.doesNotMatch(scan.stdout, /sk-l/, 'scan leaked the secret value prefix')
})

test('resolving by directory name warns instead of silently attaching', () => {
  const sandbox = makeSandbox('priv-guess')
  runFde(sandbox, ['resume', '--init', 'acme'])
  // a DIFFERENT, unbound workspace whose basename matches the acme slug
  const stray = path.join(sandbox.dir, 'acme')
  fs.mkdirSync(stray, { recursive: true })
  const r = runFde(sandbox, ['resume'], { cwd: fs.realpathSync(stray) })
  assert.match(r.stderr, /directory name/i, 'dir-name resolution must warn, not be silent')
})

test('binding resolves from a nested subdirectory, not just the exact bind dir', () => {
  const sandbox = makeSandbox('nested')
  runFde(sandbox, ['resume', '--init', 'northwind'])
  const nested = path.join(sandbox.workspace, 'src', 'api', 'deep')
  fs.mkdirSync(nested, { recursive: true })
  const nestedReal = fs.realpathSync(nested)

  // resume from deep inside the tree resolves the bound engagement (was NO ENGAGEMENT)
  const resume = runFde(sandbox, ['resume'], { cwd: nestedReal })
  assert.equal(resume.status, 0, resume.stderr)
  assert.match(resume.stdout, /ENGAGEMENT: .*northwind/)

  // and a write from the subdirectory lands in the same engagement
  const log = runFde(sandbox, ['log', 'decision', 'logged from a nested dir'], { cwd: nestedReal })
  assert.equal(log.status, 0, log.stderr)
  const decisions = fs.readFileSync(path.join(engagementPath(sandbox, 'northwind'), 'decisions.md'), 'utf8')
  assert.match(decisions, /logged from a nested dir/)
})

test('a sibling directory with a shared path prefix does NOT match the binding', () => {
  const sandbox = makeSandbox('sibling')
  // bind .../workspace, then probe a sibling .../workspace-2 (shared prefix, not an ancestor)
  runFde(sandbox, ['resume', '--init', 'clienta'])
  const sibling = sandbox.workspace + '-2'
  fs.mkdirSync(sibling, { recursive: true })
  const r = runFde(sandbox, ['resume'], { cwd: fs.realpathSync(sibling) })
  assert.match(r.stdout, /NO ENGAGEMENT/, 'shared-prefix sibling must not resolve to the binding')
})

test('receipts separates dated agreements from unverified claims', () => {
  const sandbox = makeSandbox('receipts-claims')
  runFde(sandbox, ['resume', '--init', 'nw'])
  const eng = engagementPath(sandbox, 'nw')
  fs.writeFileSync(path.join(eng, 'decisions.md'), '# Decisions\n- [2026-07-11] descope reporting until audit\n')
  fs.writeFileSync(path.join(eng, 'brief.md'), '# Brief\nvendor promised TLS before the audit\n')

  const agreed = runFde(sandbox, ['receipts', 'descope'])
  assert.match(agreed.stdout, /AGREED/, 'a dated decision must show under AGREED')

  const claim = runFde(sandbox, ['receipts', 'TLS'])
  assert.match(claim.stdout, /CLAIMS & working notes/, 'a brief line must be labelled a claim')
  assert.match(claim.stdout, /NOT an agreement/, 'the claim must be explicitly flagged as not an agreement')
})

test('status defaults to the bound engagement; --all shows the portfolio', () => {
  const sandbox = makeSandbox('status-scope')
  assert.equal(runFde(sandbox, ['resume', '--init', 'alpha']).status, 0)
  const ws2 = path.join(sandbox.dir, 'workspace-b')
  fs.mkdirSync(ws2, { recursive: true })
  const sandboxB = { ...sandbox, workspace: fs.realpathSync(ws2) }
  assert.equal(runFde(sandboxB, ['resume', '--init', 'beta'], { cwd: sandboxB.workspace }).status, 0)

  const one = runFde(sandbox, ['status'])
  assert.equal(one.status, 0, one.stderr)
  assert.match(one.stdout, /alpha/)
  assert.doesNotMatch(one.stdout, /beta/)
  assert.match(one.stdout, /current engagement only/)

  const all = runFde(sandbox, ['status', '--all'])
  assert.equal(all.status, 0, all.stderr)
  assert.match(all.stdout, /alpha/)
  assert.match(all.stdout, /beta/)
})

test('debrief refuses binary notes files', () => {
  const sandbox = makeSandbox('debrief-bin')
  assert.equal(runFde(sandbox, ['resume', '--init', 'binclient']).status, 0)
  const notes = path.join(sandbox.dir, 'notes.bin')
  fs.writeFileSync(notes, Buffer.from([0x00, 0x01, 0x02, 0x03, 0x41]))
  const r = runFde(sandbox, ['debrief', notes])
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /binary/i)
})

test('FDEOPS_ENGAGEMENTS_ROOT isolates init from the default home tree', () => {
  const sandbox = makeSandbox('root-env')
  const altRoot = path.join(sandbox.dir, 'alt-engagements')
  const init = runFde(sandbox, ['resume', '--init', 'isolated'], {
    env: { FDEOPS_ENGAGEMENTS_ROOT: altRoot },
  })
  assert.equal(init.status, 0, init.stderr)
  assert.equal(fs.existsSync(path.join(altRoot, 'isolated', '.fde', 'context.md')), true)
  assert.equal(fs.existsSync(path.join(sandbox.home, 'fde-engagements', 'isolated')), false)
})
