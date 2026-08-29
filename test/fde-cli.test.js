const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { spawn, spawnSync } = require('node:child_process')

const root = path.join(__dirname, '..')
const fde = path.join(root, 'bin', 'fde.js')
const installer = path.join(root, 'bin', 'install.js')

function runInstall(sandbox, args, opts = {}) {
  const result = spawnSync(process.execPath, [installer, ...args], {
    cwd: opts.cwd || sandbox.workspace,
    env: { ...process.env, HOME: sandbox.home, USERPROFILE: sandbox.home },
    encoding: 'utf8',
  })
  return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' }
}

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

function runHook(sandbox, name, opts = {}) {
  const result = spawnSync('bash', [opts.hook || path.join(root, 'hooks', name)], {
    cwd: opts.cwd || sandbox.workspace,
    env: {
      ...process.env,
      HOME: sandbox.home,
      USERPROFILE: sandbox.home,
      PWD: opts.cwd || sandbox.workspace,
      PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin`,
      CLAUDE_PLUGIN_ROOT: root,
      FDEOPS_ENGAGEMENT: '',
      FDEOS_ENGAGEMENT: '',
      ...(opts.env || {}),
    },
    input: opts.input,
    encoding: 'utf8',
  })
  return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' }
}

function engagementPath(sandbox, slug) {
  return path.join(sandbox.home, 'fde-engagements', slug, '.fde')
}

function fillOperatingMap(eng, exception = 'Friday batch fails reconciliation') {
  fs.writeFileSync(
    path.join(eng, 'terrain.md'),
    [
      '# Terrain',
      '**Stack:** node',
      '',
      '## Operating map (exception-led)',
      '',
      '| Exception / break | Who notices first | What they do today (workaround) | System of record then | Blast if wrong | Evidence |',
      '|-------------------|-------------------|---------------------------------|-----------------------|----------------|----------|',
      `| ${exception} | Denise | manual spreadsheet | email thread | payroll late | heard 2026-07-01 |`,
      '',
    ].join('\n')
  )
}

function gitInEng(eng, args) {
  return spawnSync('git', ['-C', eng, ...args], { encoding: 'utf8' })
}

function ensureEngagementGitClean(eng) {
  const status = gitInEng(eng, ['status', '--porcelain'])
  assert.equal(status.status, 0, status.stderr)
  if (status.stdout.trim()) {
    gitInEng(eng, ['add', '-A'])
    const commit = gitInEng(eng, ['-c', 'user.email=fdeops-test@example.com', '-c', 'user.name=fdeops test', 'commit', '-m', 'test cleanup'])
    assert.equal(commit.status, 0, commit.stderr)
  }
}

function tryUnlink(p) {
  try { fs.unlinkSync(p) } catch (_) {}
}

function rmTreeIfPresent(p) {
  try { fs.rmSync(p, { recursive: true, force: true }) } catch (_) {}
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
  assert.match(fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8'), /- \[\d{4}-\d{2}-\d{2}\](?: \[@[\w.-]+\])? ship retry slice/)
  assert.match(fs.readFileSync(path.join(eng, 'stakeholders.md'), 'utf8'), /\[signal:green\] Denise saw demo/)
})

test('log decision does not reclaim an existing stale lock', () => {
  const sandbox = makeSandbox('stale-lock')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Stale Lock']).status, 0)
  const target = path.join(engagementPath(sandbox, 'stale-lock'), 'decisions.md')
  const lock = target + '.lock'
  const before = fs.readFileSync(target, 'utf8')
  fs.writeFileSync(lock, 'abandoned\n')
  const stale = new Date(Date.now() - 31_000)
  fs.utimesSync(lock, stale, stale)

  const log = runFde(sandbox, ['log', 'decision', 'must not be written'])

  assert.notEqual(log.status, 0)
  assert.match(log.stderr, /another writer is active; retry/)
  assert.equal(fs.readFileSync(target, 'utf8'), before)
  assert.equal(fs.existsSync(lock), true)
})

test('log decision does not reclaim a fresh lock or modify its target', () => {
  const sandbox = makeSandbox('fresh-lock')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Fresh Lock']).status, 0)
  const target = path.join(engagementPath(sandbox, 'fresh-lock'), 'decisions.md')
  const lock = target + '.lock'
  const before = fs.readFileSync(target, 'utf8')
  fs.writeFileSync(lock, 'active\n')

  const log = runFde(sandbox, ['log', 'decision', 'must not be written'])

  assert.notEqual(log.status, 0)
  assert.match(log.stderr, /another writer is active; retry/)
  assert.equal(fs.readFileSync(target, 'utf8'), before)
  assert.equal(fs.existsSync(lock), true)
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
  assert.match(dryRun.stdout, /→ decisions\.md\s+- \[\d{4}-\d{2}-\d{2}\](?: \[@[\w.-]+\])? keep launch date/)
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
  assert.match(found.stdout, /decisions\.md:\d+\s+- \[\d{4}-\d{2}-\d{2}\](?: \[@[\w.-]+\])? literal a\+b\? scope/)

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

test('dashboard rename failure preserves the existing fieldbook', () => {
  const sandbox = makeSandbox('dashboard-atomic-failure')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Atomic Dashboard']).status, 0)
  const out = path.join(sandbox.dir, 'fieldbook.html')
  const before = Buffer.from('existing fieldbook bytes\n')
  fs.writeFileSync(out, before)
  const injector = path.join(sandbox.dir, 'fail-dashboard-rename.cjs')
  fs.writeFileSync(injector, [
    "const fs = require('node:fs')",
    "const path = require('node:path')",
    'const originalRenameSync = fs.renameSync',
    'fs.renameSync = function (source, destination) {',
    '  const target = process.env.FDEOPS_TEST_RENAME_DEST',
    '  if (target && path.resolve(String(destination)) === path.resolve(target)) {',
    "    const error = new Error('injected dashboard rename failure')",
    "    error.code = 'EIO'",
    '    throw error',
    '  }',
    '  return originalRenameSync.apply(this, arguments)',
    '}',
    '',
  ].join('\n'))

  const dashboard = runFde(sandbox, ['dashboard', '--out', out], {
    env: {
      NODE_OPTIONS: `--require=${JSON.stringify(injector)}`,
      FDEOPS_TEST_RENAME_DEST: out,
    },
  })

  assert.notEqual(dashboard.status, 0)
  assert.match(dashboard.stderr, /cannot write fieldbook\.html \(EIO\)/)
  assert.doesNotMatch(dashboard.stderr, /\n\s+at /)
  assert.deepEqual(fs.readFileSync(out), before)
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

test('basename match cannot write into another client memory', () => {
  const sandbox = makeSandbox('no-basename-write')
  runFde(sandbox, ['resume', '--init', 'acme'])
  const before = fs.readFileSync(path.join(engagementPath(sandbox, 'acme'), 'decisions.md'), 'utf8')
  const stray = path.join(sandbox.dir, 'acme')
  fs.mkdirSync(stray, { recursive: true })
  const log = runFde(sandbox, ['log', 'decision', 'WRONG CLIENT WRITE'], { cwd: fs.realpathSync(stray) })
  assert.notEqual(log.status, 0, 'unbound same-name folder must not write')
  assert.match(log.stderr, /no binding|explicit bind/i)
  const after = fs.readFileSync(path.join(engagementPath(sandbox, 'acme'), 'decisions.md'), 'utf8')
  assert.equal(after, before, 'decisions.md must be unchanged')
})

test('unknown command exits non-zero', () => {
  const sandbox = makeSandbox('badcmd')
  const r = runFde(sandbox, ['definitely-not-a-command'])
  assert.equal(r.status, 1)
  assert.match(r.stdout, /fde scan/)
  const help = runFde(sandbox, ['help'])
  assert.equal(help.status, 0)
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

test('NO ENGAGEMENT lists real engagements only, not rendered dashboards', () => {
  const sandbox = makeSandbox('unbound-list')
  runFde(sandbox, ['resume', '--init', 'clienta'])
  const dash = runFde(sandbox, ['dashboard'])
  assert.equal(dash.status, 0, dash.stderr)

  const unbound = path.join(sandbox.dir, 'elsewhere')
  fs.mkdirSync(unbound, { recursive: true })
  const r = runFde(sandbox, ['resume'], { cwd: fs.realpathSync(unbound) })
  assert.match(r.stdout, /existing: clienta$/m)
  assert.doesNotMatch(r.stdout, /fieldbook-current\.html/, 'dashboard output is not an engagement')
})

test('receipts separates dated agreements from unverified claims', () => {
  const sandbox = makeSandbox('receipts-claims')
  runFde(sandbox, ['resume', '--init', 'nw'])
  const eng = engagementPath(sandbox, 'nw')
  fs.writeFileSync(path.join(eng, 'decisions.md'), '# Decisions\n- [2026-07-11] descope reporting until audit\n')
  fs.writeFileSync(path.join(eng, 'brief.md'), '# Brief\nvendor promised TLS before the audit\n')

  const agreed = runFde(sandbox, ['receipts', 'descope'])
  assert.match(agreed.stdout, /ON RECORD/, 'a dated decision must show under ON RECORD')

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
  assert.match(all.stdout, /value: none yet/, 'portfolio path must also print the ledger')
})

test('status leads with the value ledger, not trust hygiene', () => {
  const sandbox = makeSandbox('status-value')
  assert.equal(runFde(sandbox, ['resume', '--init', 'kesterman']).status, 0)
  const eng = engagementPath(sandbox, 'kesterman')
  const empty = runFde(sandbox, ['status'])
  assert.equal(empty.status, 0, empty.stderr)
  assert.match(empty.stdout, /value first, then trust/)
  assert.match(empty.stdout, /value: none yet/)
  const emptyValueAt = empty.stdout.indexOf('value: none yet')
  const emptyTrustAt = empty.stdout.indexOf('[')
  assert.ok(emptyValueAt !== -1 && emptyValueAt < emptyTrustAt, 'empty ledger still prints before the trust line')

  fs.writeFileSync(
    path.join(eng, 'delivery.md'),
    '# Delivery\n## Value ledger\n' +
      '| Date | Slice | Bucket | Promised | Measured | Accepted by | Evidence | Rollback |\n' +
      '|------|-------|--------|----------|----------|-------------|----------|----------|\n' +
      '| 2026-08-14 | Invoice cycle | cost-save | 6 days → 2 days | 2 days | Denise Chen, Aug 14 | ops | n/a |\n' +
      '| 2026-08-20 | Payment retry | risk-mitigation | 340 failures/wk → 12 | 12 | | pager | n/a |\n'
  )
  const s = runFde(sandbox, ['status'])
  assert.equal(s.status, 0, s.stderr)
  assert.match(s.stdout, /Invoice cycle: 6 days → 2 days · accepted by Denise Chen, Aug 14/)
  assert.match(s.stdout, /Payment retry: 340 failures\/wk → 12 · claimed, not yet accepted/)
  const acceptedAt = s.stdout.indexOf('Invoice cycle:')
  const trustAt = s.stdout.indexOf('[')
  assert.ok(acceptedAt !== -1 && acceptedAt < trustAt, 'value lines must print before the trust row')

  fs.writeFileSync(
    path.join(eng, 'delivery.md'),
    '# Delivery\n## Value ledger\n' +
      '| Date | Slice | Bucket | Promised | Measured | Accepted by | Evidence | Rollback |\n' +
      '|------|-------|--------|----------|----------|-------------|----------|----------|\n' +
      '| 2026-08-14 | rate card | cost-save | trim spend | <private>SEALED-4242 saved</private> | Denise, Aug 14 | invoice | n/a |\n'
  )
  const priv = runFde(sandbox, ['status'])
  assert.equal(priv.status, 0, priv.stderr)
  assert.doesNotMatch(priv.stdout, /SEALED-4242/, 'status must not print a <private> measured cell')
  assert.match(priv.stdout, /private - redacted/)

  fs.writeFileSync(
    path.join(eng, 'delivery.md'),
    '# Delivery\n## Value ledger\n' +
      '| Date | Slice | Bucket | Promised | Measured | Accepted by | Evidence | Rollback |\n' +
      '|------|-------|--------|----------|----------|-------------|----------|----------|\n' +
      '| | | *(cost-save / risk-mitigation / revenue-uplift)* | *(what we said it would change)* | *(pending)* | *(claimed)* | | |\n' +
      '\n**Bucket:** `cost-save` · `risk-mitigation` · `revenue-uplift`\n' +
      '**Accepted by:** a customer-side name and date - without one the value stays *claimed*, not accepted.\n'
  )
  const legend = runFde(sandbox, ['status'])
  assert.equal(legend.status, 0, legend.stderr)
  assert.match(legend.stdout, /value: none yet/)
  assert.doesNotMatch(legend.stdout, /Bucket:/)
  assert.doesNotMatch(legend.stdout, /customer-side name/)

  fs.writeFileSync(
    path.join(eng, 'delivery.md'),
    '# Delivery\n## Value ledger\n' +
      '| Date | Slice | Bucket | Promised | Measured | Accepted by | Evidence | Rollback |\n' +
      '|------|-------|--------|----------|----------|-------------|----------|----------|\n' +
      '| 2026-08-14 | Invoice cycle | cost-save | 6 days → 2 days | 2 days | Denise Chen, Aug 14 | ops | n/a |\n' +
      '| 2026-08-20 | Payment retry | risk-mitigation | 340 failures/wk → 12 | 12 | | pager | n/a |\n'
  )
  const ws2 = path.join(sandbox.dir, 'workspace-b')
  fs.mkdirSync(ws2, { recursive: true })
  const sandboxB = { ...sandbox, workspace: fs.realpathSync(ws2) }
  assert.equal(runFde(sandboxB, ['resume', '--init', 'acme'], { cwd: sandboxB.workspace }).status, 0)
  const portfolio = runFde(sandbox, ['status', '--all'])
  assert.equal(portfolio.status, 0, portfolio.stderr)
  assert.match(portfolio.stdout, /Invoice cycle: 6 days → 2 days · accepted by Denise Chen, Aug 14/)
  assert.match(portfolio.stdout, /… 1 more in delivery.md/, 'portfolio caps rows per client')
  assert.doesNotMatch(portfolio.stdout, /Payment retry:.*claimed/)
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

test('resume bounds a long context.md and survives <private> redaction (anchor not stripped)', () => {
  const sandbox = makeSandbox('resume-bound')
  runFde(sandbox, ['resume', '--init', 'boundy'])
  const eng = engagementPath(sandbox, 'boundy')
  const lines = ['# Context']
  for (let i = 1; i <= 40; i++) lines.push(`HEAD curated state line ${i}`)
  lines.push('<!-- fdeops auto-capture -->')
  lines.push('## Session end - 2026-07-01 09:00')
  for (let i = 1; i <= 150; i++) lines.push(`OLD session log line ${i}`)
  lines.push('RECENT tail marker Z')
  fs.writeFileSync(path.join(eng, 'context.md'), lines.join('\n') + '\n')

  const r = runFde(sandbox, ['resume'])
  assert.equal(r.status, 0, r.stderr)
  // the bounded view must actually bound (readClean strips the <!-- --> anchor,
  // so this only works if resumeView anchors on the "## Session end" heading)
  assert.match(r.stdout, /lines of earlier session log hidden/, 'long context must be bounded')
  assert.match(r.stdout, /RECENT tail marker Z/, 'the recent tail must still show')
  assert.doesNotMatch(r.stdout, /OLD session log line 5\b/, 'the old middle must be hidden, not dumped')
})

test('install never deletes or overwrites a skill dir the user wrote (issue #8)', () => {
  const sandbox = makeSandbox('install-ownership')
  const skills = path.join(sandbox.home, '.claude', 'skills')
  const mine = path.join(skills, 'healthcare-fde')
  fs.mkdirSync(mine, { recursive: true })
  fs.writeFileSync(path.join(mine, 'SKILL.md'), '---\nname: healthcare-fde\n---\nmy own hard-won prompt\n')
  fs.writeFileSync(path.join(mine, 'notes.md'), 'irreplaceable\n')
  const ownFde = path.join(skills, 'fde')
  fs.mkdirSync(ownFde, { recursive: true })
  fs.writeFileSync(path.join(ownFde, 'SKILL.md'), '---\nname: fde\n---\nunrelated skill of mine\n')

  const first = runInstall(sandbox, [])
  assert.equal(first.status, 0, first.stderr)
  assert.equal(fs.readFileSync(path.join(mine, 'SKILL.md'), 'utf8'), '---\nname: healthcare-fde\n---\nmy own hard-won prompt\n')
  assert.equal(fs.existsSync(path.join(mine, 'notes.md')), true, 'user-authored skill must survive install')
  assert.equal(fs.readFileSync(path.join(ownFde, 'SKILL.md'), 'utf8'), '---\nname: fde\n---\nunrelated skill of mine\n')
  assert.match(first.stdout, /fdeops did not create/)
  assert.match(first.stdout, /healthcare-fde/)

  // --force is the documented escape hatch
  const forced = runInstall(sandbox, ['--force'])
  assert.equal(forced.status, 0, forced.stderr)
  assert.equal(fs.existsSync(mine), false, '--force removes the legacy dir')
  assert.match(fs.readFileSync(path.join(ownFde, 'SKILL.md'), 'utf8'), /fdeops|fieldbook/i)
  assert.equal(fs.existsSync(path.join(ownFde, '.fdeops-managed')), true)

  // dirs fdeops created are marked, so the next run can clean them up on its own
  const legacy = path.join(skills, 'fde-land')
  fs.mkdirSync(legacy, { recursive: true })
  fs.writeFileSync(path.join(legacy, 'SKILL.md'), 'stale v2 content\n')
  fs.writeFileSync(path.join(legacy, '.fdeops-managed'), 'managed-by: fdeops\n')
  const second = runInstall(sandbox, [])
  assert.equal(second.status, 0, second.stderr)
  assert.equal(fs.existsSync(legacy), false, 'a marked v2 dir is still cleaned up')
  assert.match(second.stdout, /Removed 1 v2 skill dir/)
})

test('install adopts an earlier unmarked fdeops skill so upgrades still apply', () => {
  const sandbox = makeSandbox('install-adopt')
  const ownFde = path.join(sandbox.home, '.claude', 'skills', 'fde')
  fs.mkdirSync(ownFde, { recursive: true })
  // what a pre-marker install actually left behind: our shipped frontmatter
  fs.writeFileSync(path.join(ownFde, 'SKILL.md'),
    '---\nname: fde\ndescription: Engagement fieldbook for Forward Deployed Engineers. Use when …\n---\nold fdeops brain from a pre-marker install\n')

  const r = runInstall(sandbox, [])
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /adopt/)
  assert.equal(fs.existsSync(path.join(ownFde, '.fdeops-managed')), true)
  assert.doesNotMatch(fs.readFileSync(path.join(ownFde, 'SKILL.md'), 'utf8'), /pre-marker install/)

  // A skill of the user's that merely mentions fdeops in prose is not ours: the
  // fingerprint is the shipped frontmatter, not the word "fdeops" somewhere.
  const mentions = makeSandbox('install-mentions')
  const theirs = path.join(mentions.home, '.claude', 'skills', 'fde')
  fs.mkdirSync(theirs, { recursive: true })
  const prose = '---\nname: fde\ndescription: My own wrapper around fdeops for retainer clients\n---\nirreplaceable\n'
  fs.writeFileSync(path.join(theirs, 'SKILL.md'), prose)
  const m = runInstall(mentions, [])
  assert.equal(m.status, 0, m.stderr)
  assert.equal(fs.readFileSync(path.join(theirs, 'SKILL.md'), 'utf8'), prose, 'prose mentioning fdeops must not authorize an overwrite')
  assert.match(m.stdout, /fdeops did not create/)
})

test('install refuses to write through a symlinked skill dir, even with --force', () => {
  const sandbox = makeSandbox('install-symlink')
  const skills = path.join(sandbox.home, '.claude', 'skills')
  // the user keeps skills in their own tree and links them into ~/.claude
  const real = path.join(sandbox.dir, 'my-skills', 'fde')
  fs.mkdirSync(real, { recursive: true })
  const mine = '---\nname: fde\ndescription: Engagement fieldbook for Forward Deployed Engineers - my fork\n---\nsentinel\n'
  fs.writeFileSync(path.join(real, 'SKILL.md'), mine)
  fs.mkdirSync(skills, { recursive: true })
  fs.symlinkSync(real, path.join(skills, 'fde'))
  // and a legacy-named one, which the removal path must not follow either
  const realLegacy = path.join(sandbox.dir, 'my-skills', 'gov-fde')
  fs.mkdirSync(realLegacy, { recursive: true })
  fs.writeFileSync(path.join(realLegacy, 'SKILL.md'), 'my gov skill\n')
  fs.symlinkSync(realLegacy, path.join(skills, 'gov-fde'))

  for (const args of [[], ['--force']]) {
    const r = runInstall(sandbox, args)
    assert.equal(fs.readFileSync(path.join(real, 'SKILL.md'), 'utf8'), mine,
      `fdeops wrote through the symlink (${args.join(' ') || 'no flags'})`)
    assert.equal(fs.existsSync(path.join(real, '.fdeops-managed')), false,
      'no marker may be planted outside ~/.claude/skills')
    assert.equal(fs.existsSync(path.join(real, 'references')), false)
    assert.equal(fs.existsSync(path.join(realLegacy, 'SKILL.md')), true, 'a symlinked legacy dir must survive')
    assert.equal(fs.lstatSync(path.join(skills, 'fde')).isSymbolicLink(), true, 'the link itself stays the user\'s')
    assert.match(r.stdout, /symlinks - fdeops will not write through them/)
  }
})

test('install reports an unwritable skill dir in human terms and finishes the rest', () => {
  const sandbox = makeSandbox('install-readonly')
  const dest = path.join(sandbox.home, '.claude', 'skills', 'fde')
  fs.mkdirSync(dest, { recursive: true })
  fs.writeFileSync(path.join(dest, 'SKILL.md'),
    '---\nname: fde\ndescription: Engagement fieldbook for Forward Deployed Engineers. Use when …\n---\nold\n')
  fs.chmodSync(dest, 0o500)
  try {
    const r = runInstall(sandbox, [])
    assert.equal(r.status, 1, 'a partial install must not report success')
    assert.match(r.stdout, /permission denied/)
    assert.doesNotMatch(r.stderr, /at Object\.|node:internal/, 'no stack trace')
    // the rest of the install still landed
    assert.equal(fs.existsSync(path.join(sandbox.home, '.claude', 'fdeops', 'fde.js')), true)
    assert.equal(fs.existsSync(path.join(sandbox.home, '.claude', 'FDEOPS-CLAUDE.md')), true)
  } finally {
    fs.chmodSync(dest, 0o700)
  }
})

test('demo runs the real CLI on a fake client, leaks no private block, and stays out of the portfolio', () => {
  const sandbox = makeSandbox('demo')
  const root = path.join(sandbox.dir, 'engagements')
  // a real engagement the demo must not touch or advertise
  assert.equal(runFde(sandbox, ['resume', '--init', 'realclient'], { env: { FDEOPS_ENGAGEMENTS_ROOT: root } }).status, 0)

  const r = runFde(sandbox, ['demo'], { env: { FDEOPS_ENGAGEMENTS_ROOT: root } })
  assert.equal(r.status, 0, r.stderr)
  // the value promise: notes routed, memory reloaded cold, receipts dated
  assert.match(r.stdout, /ENGAGEMENT READY/)
  assert.match(r.stdout, /debrief routed/)
  assert.match(r.stdout, /ON RECORD \(dated - defensible\)/)
  assert.match(r.stdout, /MEETING PREP/)
  assert.match(r.stdout, /fieldbook-current\.html/)
  // no fabricated transcript: the record on disk holds what the demo printed
  const demoEng = path.join(root, '.demo', 'acme-payments', '.fde')
  assert.match(fs.readFileSync(path.join(demoEng, 'decisions.md'), 'utf8'), /Stripe connector/)
  assert.match(fs.readFileSync(path.join(demoEng, 'risks.md'), 'utf8'), /reconciliation job/)

  // the demo's own <private> block must not reach the transcript or the dashboard
  const secret = 'previous vendor was let go'
  assert.doesNotMatch(r.stdout, new RegExp(secret))
  assert.match(fs.readFileSync(path.join(demoEng, 'context.md'), 'utf8'), new RegExp(secret),
    'sealed, not lost - otherwise this assertion is vacuous')
  const html = fs.readFileSync(path.join(root, '.demo', 'fieldbook-current.html'), 'utf8')
  assert.doesNotMatch(html, new RegExp(secret))
  assert.match(html, /reconciliation job/, 'non-vacuous: the demo engagement did render')

  // isolation: real portfolio views never show the demo, and the real registry is untouched
  const all = runFde(sandbox, ['status', '--all'], { env: { FDEOPS_ENGAGEMENTS_ROOT: root } })
  assert.match(all.stdout, /realclient/)
  assert.doesNotMatch(all.stdout, /acme-payments/)
  assert.doesNotMatch(fs.readFileSync(path.join(root, '.registry'), 'utf8'), /\.demo/)

  // repeatable, then removable
  const again = runFde(sandbox, ['demo'], { env: { FDEOPS_ENGAGEMENTS_ROOT: root } })
  assert.equal(again.status, 0, again.stderr)
  assert.equal(
    (fs.readFileSync(path.join(demoEng, 'decisions.md'), 'utf8').match(/Stripe connector/g) || []).length, 1,
    'a second run must start from empty, not stack duplicates')
  // "John Doe" home directories: the fieldbook path the demo hands the user must
  // be the whole path, not everything after the last space.
  const spaced = path.join(sandbox.dir, 'John Doe', 'engagements')
  const sp = runFde(sandbox, ['demo'], { env: { FDEOPS_ENGAGEMENTS_ROOT: spaced } })
  assert.equal(sp.status, 0, sp.stderr)
  const shown = (sp.stdout.match(/Open the fieldbook:\s+(.+)/) || [])[1]
  assert.equal(shown, path.join(spaced, '.demo', 'fieldbook-current.html'))
  assert.equal(fs.existsSync(shown), true, 'the path the demo prints must be openable')

  const clean = runFde(sandbox, ['demo', '--clean'], { env: { FDEOPS_ENGAGEMENTS_ROOT: root } })
  assert.equal(clean.status, 0, clean.stderr)
  assert.equal(fs.existsSync(path.join(root, '.demo')), false)
  assert.equal(fs.existsSync(path.join(root, 'realclient', '.fde', 'context.md')), true,
    'clean must not touch real engagements')
})

test('adapters-only install places the skill the pointer files reference', () => {
  // Ground simulation found: `npx fdeops adapters .` (the documented Cursor/
  // Codex path) wrote a pointer to ~/.claude/skills/fde/SKILL.md without ever
  // placing that file - a dangling reference for any non-Claude user who
  // never separately ran bare `npx fdeops`.
  const sandbox = makeSandbox('adapters-skill')
  const r = runInstall(sandbox, ['adapters', '.'])
  assert.equal(r.status, 0, r.stderr)
  assert.equal(fs.existsSync(path.join(sandbox.home, '.claude', 'skills', 'fde', 'SKILL.md')), true,
    'adapters must install the skill it points at, not just the pointer')
  const cursorRule = fs.readFileSync(path.join(sandbox.workspace, '.cursor', 'rules', 'fde.mdc'), 'utf8')
  assert.match(cursorRule, /~\/\.claude\/skills\/fde\/SKILL\.md/)
})

test('signal tokens land under Signal history regardless of writer or token position', () => {
  const sandbox = makeSandbox('signal-history')
  runFde(sandbox, ['resume', '--init', 'trustco'])
  const eng = engagementPath(sandbox, 'trustco')

  // fde log contact --signal: token right after the date
  const cli = runFde(sandbox, ['log', 'contact', 'Dana went quiet', '--signal', 'red'])
  assert.equal(cli.status, 0, cli.stderr)

  // fde debrief: token at the END of the text (the skill's own contact: convention)
  const debrief = runFde(sandbox, ['debrief'], { input: 'contact: Priya seemed cold on the call [signal:amber]' })
  assert.equal(debrief.status, 0, debrief.stderr)

  const stakeholders = fs.readFileSync(path.join(eng, 'stakeholders.md'), 'utf8')
  const section = stakeholders.slice(stakeholders.indexOf('## Signal history'))
  assert.match(section, /\[signal:red\] Dana went quiet/, 'CLI-format signal must land inside the section')
  assert.match(section, /\[signal:amber\] Priya seemed cold on the call/, 'debrief-format signal must land inside the section (normalized token position)')
})

test('a full stakeholder-table rewrite that preserves Signal history keeps the trust color', () => {
  // The exact failure a ground-FDE simulation hit: land.md tells the agent to
  // write stakeholders.md as a full artifact. A rewrite that PRESERVES the
  // section, as the template now instructs, must keep working end to end.
  const sandbox = makeSandbox('rewrite-survives')
  runFde(sandbox, ['resume', '--init', 'clobberco'])
  const eng = engagementPath(sandbox, 'clobberco')
  assert.equal(runFde(sandbox, ['log', 'contact', 'Dana went quiet', '--signal', 'red']).status, 0)

  fs.writeFileSync(path.join(eng, 'stakeholders.md'), [
    '# Stakeholders',
    '',
    '| Who | Role | Signal | Notes |',
    '|-----|------|--------|-------|',
    '| Dana | sponsor | red | went quiet 8 days |',
    '',
    '## Signal history',
    '',
    '- [2026-07-13] [signal:red] Dana went quiet',
    '',
  ].join('\n'))

  const status = runFde(sandbox, ['status'])
  assert.equal(status.status, 0, status.stderr)
  assert.match(status.stdout, /\[RED\s*\]\s*clobberco/, 'trust must still read RED after a section-preserving rewrite')
})

test('CLI signal ledger keeps trust RED after Signal history is wiped', () => {
  const sandbox = makeSandbox('ledger-survives')
  runFde(sandbox, ['resume', '--init', 'ledgerco'])
  const eng = engagementPath(sandbox, 'ledgerco')
  assert.equal(runFde(sandbox, ['log', 'contact', 'Dana went quiet', '--signal', 'red']).status, 0)
  assert.equal(fs.existsSync(path.join(eng, '.signal-ledger')), true)

  // Agent rewrite that drops the section entirely - ledger must still drive trust.
  fs.writeFileSync(path.join(eng, 'stakeholders.md'), [
    '# Stakeholders',
    '',
    '| Who | Role | Signal | Notes |',
    '|-----|------|--------|-------|',
    '| Dana | sponsor | unknown | |',
    '',
  ].join('\n'))

  const status = runFde(sandbox, ['status'])
  assert.equal(status.status, 0, status.stderr)
  assert.match(status.stdout, /\[RED\s*\]\s*ledgerco/, 'trust must read RED from .signal-ledger after wipe')
})

test('prep and dashboard redact private signal-ledger history', () => {
  const sandbox = makeSandbox('private-ledger')
  assert.equal(runFde(sandbox, ['resume', '--init', 'privateledger']).status, 0)
  const eng = engagementPath(sandbox, 'privateledger')
  const canary = 'PRIVATE_LEDGER_CANARY_7Q9X'
  fs.writeFileSync(path.join(eng, '.signal-ledger'), [
    '<private>',
    `- [2026-07-20] [signal:red] ${canary} blocked rollout`,
    '</private>',
    '',
  ].join('\n'))

  const prep = runFde(sandbox, ['prep', 'Sponsor sync'])
  assert.equal(prep.status, 0, prep.stderr)
  assert.doesNotMatch(prep.stdout, new RegExp(canary), 'prep leaked private signal-ledger history')

  const out = path.join(sandbox.dir, 'private-ledger.html')
  const dashboard = runFde(sandbox, ['dashboard', '--out', out])
  assert.equal(dashboard.status, 0, dashboard.stderr)
  assert.doesNotMatch(fs.readFileSync(out, 'utf8'), new RegExp(canary),
    'dashboard leaked private signal-ledger history')
})

test('dashboard scoped render and scan smoke', () => {
  const sandbox = makeSandbox('dash-scan')
  assert.equal(runFde(sandbox, ['resume', '--init', 'dashco']).status, 0)
  const dash = runFde(sandbox, ['dashboard'])
  assert.equal(dash.status, 0, dash.stderr)
  assert.match(dash.stdout, /fieldbook-current\.html/)
  const htmlPath = (dash.stdout.match(/\/[^\s]+\.html/) || [])[0]
  assert.ok(htmlPath && fs.existsSync(htmlPath))
  const html = fs.readFileSync(htmlPath, 'utf8')
  assert.match(html, /dashco/)
  assert.doesNotMatch(html, /<script[^>]+src=/i)

  fs.writeFileSync(path.join(sandbox.workspace, 'app.js'), 'module.exports = 1\n')
  const scan = runFde(sandbox, ['scan'])
  assert.equal(scan.status, 0, scan.stderr)
  assert.match(scan.stdout, /FDE RECON|ASK ON DAY 1|heuristic/i)
})

test('log refuses secret-like text and --undo removes the last entry', () => {
  const sandbox = makeSandbox('secret-undo')
  assert.equal(runFde(sandbox, ['resume', '--init', 'secco']).status, 0)
  const eng = engagementPath(sandbox, 'secco')
  const before = fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8')

  const refused = runFde(sandbox, ['log', 'decision', 'leaked AKIAIOSFODNN7EXAMPLE into chat'])
  assert.equal(refused.status, 1)
  assert.match(refused.stderr, /AWS access key/i)
  assert.equal(fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8'), before)

  assert.equal(runFde(sandbox, ['log', 'decision', 'ship the retry slice']).status, 0)
  assert.match(fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8'), /ship the retry slice/)
  const undo = runFde(sandbox, ['log', '--undo'])
  assert.equal(undo.status, 0, undo.stderr)
  assert.doesNotMatch(fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8'), /ship the retry slice/)
})

test('debrief skips a secret-shaped next action without --force', () => {
  const sandbox = makeSandbox('secret-next')
  assert.equal(runFde(sandbox, ['resume', '--init', 'nextsafe']).status, 0)
  const eng = engagementPath(sandbox, 'nextsafe')
  const secret = 'AKIAIOSFODNN7EXAMPLE'

  const debrief = runFde(sandbox, ['debrief'], { input: `next: rotate ${secret} after demo` })

  assert.equal(debrief.status, 0, debrief.stderr)
  assert.match(debrief.stderr, /skipped next line - looks like an? AWS access key/i)
  assert.doesNotMatch(fs.readFileSync(path.join(eng, 'context.md'), 'utf8'), new RegExp(secret))
  assert.match(debrief.stdout, /debrief empty - nothing routed/)
})

test('corrupted stakeholders.md does not default to green', () => {
  const sandbox = makeSandbox('corrupt-mem')
  assert.equal(runFde(sandbox, ['resume', '--init', 'wreck']).status, 0)
  const eng = engagementPath(sandbox, 'wreck')
  fs.writeFileSync(path.join(eng, 'stakeholders.md'), Buffer.from([0x23, 0x20, 0x53, 0x00, 0x01, 0x02]))
  const status = runFde(sandbox, ['status'])
  assert.equal(status.status, 0, status.stderr)
  assert.match(status.stdout, /\[amber\s*\]\s*wreck/)
  assert.match(status.stdout, /memory unreadable/i)
  assert.doesNotMatch(status.stdout, /\[green\s*\]\s*wreck/)
})

test('write through a symlinked memory file is refused', () => {
  const sandbox = makeSandbox('symlink-write')
  assert.equal(runFde(sandbox, ['resume', '--init', 'linkco']).status, 0)
  const eng = engagementPath(sandbox, 'linkco')
  const outside = path.join(sandbox.dir, 'outside-decisions.md')
  fs.writeFileSync(outside, 'OUTSIDE\n')
  const decisions = path.join(eng, 'decisions.md')
  fs.unlinkSync(decisions)
  fs.symlinkSync(outside, decisions)
  const log = runFde(sandbox, ['log', 'decision', 'must not escape'])
  assert.notEqual(log.status, 0)
  assert.match(log.stderr, /symlink/i)
  assert.doesNotMatch(log.stderr, /writeFileUtf8|at Object/)
  assert.equal(fs.readFileSync(outside, 'utf8'), 'OUTSIDE\n')
})

test('read-only engagement dir fails with a human message, not a stack dump', () => {
  const sandbox = makeSandbox('readonly-eng')
  assert.equal(runFde(sandbox, ['resume', '--init', 'lockco']).status, 0)
  const eng = engagementPath(sandbox, 'lockco')
  fs.chmodSync(eng, 0o555)
  let log
  try {
    log = runFde(sandbox, ['log', 'decision', 'blocked by perms'])
  } finally {
    fs.chmodSync(eng, 0o755)
  }
  assert.notEqual(log.status, 0)
  assert.match(log.stderr, /permission denied|read-only|locked down/i)
  assert.doesNotMatch(log.stderr, /writeFileUtf8|at Object\.|node:fs/)
})

test('resume --init creates a complete engagement (atomic path)', () => {
  const sandbox = makeSandbox('atomic-init')
  const init = runFde(sandbox, ['resume', '--init', 'freshco'])
  assert.equal(init.status, 0, init.stderr)
  const eng = engagementPath(sandbox, 'freshco')
  for (const f of ['context.md', 'decisions.md', 'stakeholders.md', 'brief.md']) {
    assert.equal(fs.existsSync(path.join(eng, f)), true, `missing ${f}`)
  }
  assert.equal(fs.existsSync(path.join(sandbox.home, 'fde-engagements', '.init-freshco-' + process.pid)), false)
})

test('worst-of-stakeholder trust: Randy green cannot clear Denise amber', () => {
  const sandbox = makeSandbox('worst-trust')
  assert.equal(runFde(sandbox, ['resume', '--init', 'haulline']).status, 0)
  assert.equal(runFde(sandbox, ['log', 'contact', 'Denise unresponsive after board prep', '--signal', 'amber']).status, 0)
  assert.equal(runFde(sandbox, ['log', 'contact', 'Randy opened the sheet and is helping', '--signal', 'green']).status, 0)
  const status = runFde(sandbox, ['status'])
  assert.equal(status.status, 0, status.stderr)
  assert.match(status.stdout, /\[amber\s*\]\s*haulline/)
  assert.match(status.stdout, /Denise unresponsive/)
  assert.doesNotMatch(status.stdout, /\[green\s*\]\s*haulline/)
})

test('resume leads with triage; log phase advances portfolio phase', () => {
  const sandbox = makeSandbox('resume-triage')
  assert.equal(runFde(sandbox, ['resume', '--init', 'monday']).status, 0)
  const eng = engagementPath(sandbox, 'monday')
  fs.writeFileSync(path.join(eng, 'context.md'), [
    '# Engagement context',
    '**Phase:** unset',
    '',
    '## Next action',
    '- confirm Denise channel before Thursday demo',
    '',
  ].join('\n'))
  assert.equal(runFde(sandbox, ['log', 'contact', 'Denise cooling', '--signal', 'amber']).status, 0)

  const resume = runFde(sandbox, ['resume'])
  assert.equal(resume.status, 0, resume.stderr)
  const head = resume.stdout.split('ENGAGEMENT:')[0]
  assert.match(head, /TRIAGE/)
  assert.match(head, /amber/)
  assert.match(head, /Denise cooling/)
  assert.match(head, /confirm Denise channel/)

  const before = runFde(sandbox, ['status'])
  assert.match(before.stdout, /phase:unset/)
  assert.equal(runFde(sandbox, ['log', 'phase', 'discover']).status, 0)
  const after = runFde(sandbox, ['status'])
  assert.match(after.stdout, /phase:discover/)
  assert.match(fs.readFileSync(path.join(eng, 'context.md'), 'utf8'), /\*\*Phase:\*\*\s*discover/)
})

test('engagement memory is git-versioned with owner attribution on writes', () => {
  const sandbox = makeSandbox('mem-git')
  const init = runFde(sandbox, ['resume', '--init', 'ledgerco'])
  assert.equal(init.status, 0, init.stderr)
  assert.match(init.stdout, /memory git:/)
  const eng = engagementPath(sandbox, 'ledgerco')
  assert.equal(fs.existsSync(path.join(eng, '.git')), true)
  assert.equal(fs.existsSync(path.join(eng, '.owner')), true)

  const log = runFde(sandbox, ['log', 'decision', 'descope reporting until audit'])
  assert.equal(log.status, 0, log.stderr)
  assert.match(log.stdout, /@[0-9a-f]+/)
  const decisions = fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8')
  assert.match(decisions, /\[@[\w.-]+\]/)
  assert.match(decisions, /descope reporting until audit/)

  const head = spawnSync('git', ['-C', eng, 'log', '-1', '--format=%s'], { encoding: 'utf8' })
  assert.equal(head.status, 0, head.stderr)
  assert.match(head.stdout, /log decision/)
})

test('debrief --smart proposes then --apply writes after confirm', () => {
  const sandbox = makeSandbox('smart-debrief')
  assert.equal(runFde(sandbox, ['resume', '--init', 'messyco']).status, 0)
  const notes = path.join(sandbox.workspace, 'notes.txt')
  fs.writeFileSync(notes, [
    'We agreed to descope the reporting slice until after the audit.',
    'Risk: payroll file still has no rollback drill.',
    'Denise gone quiet after Thursday board prep.',
    'Randy opened the tracking sheet and is helping with recon.',
    'Open question: who signs success for go-live?',
    'Next action: confirm Denise channel before Thursday demo',
  ].join('\n'))

  const propose = runFde(sandbox, ['debrief', '--smart', notes])
  assert.equal(propose.status, 0, propose.stderr)
  assert.match(propose.stdout, /SMART PROPOSE/)
  assert.match(propose.stdout, /\[signal:amber\].*Denise|Denise.*\[signal:amber\]/)
  assert.match(propose.stdout, /\[signal:green\].*Randy|Randy.*\[signal:green\]/)
  assert.match(propose.stdout, /Next action/)
  assert.match(propose.stdout, /fde debrief --apply/)
  const eng = engagementPath(sandbox, 'messyco')
  assert.equal(fs.existsSync(path.join(eng, '.debrief-propose')), true)
  assert.doesNotMatch(fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8'), /descope the reporting/)

  const apply = runFde(sandbox, ['debrief', '--apply'])
  assert.equal(apply.status, 0, apply.stderr)
  assert.match(apply.stdout, /debrief routed/)
  assert.match(fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8'), /descope the reporting/)
  assert.match(fs.readFileSync(path.join(eng, 'risks.md'), 'utf8'), /payroll file/)
  assert.match(fs.readFileSync(path.join(eng, 'risks.md'), 'utf8'), /who signs success/)
  assert.match(fs.readFileSync(path.join(eng, 'stakeholders.md'), 'utf8'), /\[signal:amber\]/)
  assert.match(fs.readFileSync(path.join(eng, 'context.md'), 'utf8'), /confirm Denise channel/)
  assert.equal(fs.existsSync(path.join(eng, '.debrief-propose')), false)

  const status = runFde(sandbox, ['status'])
  assert.match(status.stdout, /\[amber\s*\]/)
  assert.doesNotMatch(status.stdout, /\[green\s*\]\s*messyco/)
})

test('triage, prep, and doctor surface engagement state', () => {
  const sandbox = makeSandbox('triage-prep')
  assert.equal(runFde(sandbox, ['resume', '--init', 'walkin']).status, 0)
  const eng = engagementPath(sandbox, 'walkin')
  fs.writeFileSync(path.join(eng, 'context.md'), [
    '# Engagement context',
    '**Phase:** discover',
    '',
    '## Next action',
    '- confirm Denise channel',
    '',
  ].join('\n'))
  fs.writeFileSync(path.join(eng, 'success.md'), '# Success\n\nPayroll runs without manual patch on Friday.\n')
  assert.equal(runFde(sandbox, ['log', 'contact', 'Denise cooling', '--signal', 'amber']).status, 0)
  assert.equal(runFde(sandbox, ['log', 'risk', 'no tested rollback on Friday batch']).status, 0)

  const triage = runFde(sandbox, ['triage'])
  assert.equal(triage.status, 0, triage.stderr)
  assert.match(triage.stdout, /TRIAGE/)
  assert.match(triage.stdout, /amber/)
  assert.match(triage.stdout, /record:/)

  const prep = runFde(sandbox, ['prep', 'Denise sync'])
  assert.equal(prep.status, 0, prep.stderr)
  assert.match(prep.stdout, /MEETING PREP/)
  assert.match(prep.stdout, /Denise sync/)
  assert.match(prep.stdout, /\[amber\].*Denise/)
  assert.match(prep.stdout, /no tested rollback/)
  assert.match(prep.stdout, /confirm Denise channel/)

  const doctor = runFde(sandbox, ['doctor'])
  assert.equal(doctor.status, 0, doctor.stderr)
  assert.match(doctor.stdout, /OK/)
})

test('manual dirty file is not laundered into the next fde write commit', () => {
  const sandbox = makeSandbox('dirty-launder')
  assert.equal(runFde(sandbox, ['resume', '--init', 'launderco']).status, 0)
  const eng = engagementPath(sandbox, 'launderco')
  ensureEngagementGitClean(eng)

  const manualLine = '- MANUAL_DIRTY_RISK_LINE added outside fde'
  fs.appendFileSync(path.join(eng, 'risks.md'), `\n${manualLine}\n`)

  const log = runFde(sandbox, ['log', 'decision', 'scoped write only'])
  assert.equal(log.status, 0, log.stderr)
  assert.match(log.stderr, /uncommitted manual edits/i, 'write must warn about unrelated dirty files')

  const headFiles = gitInEng(eng, ['show', '--name-only', '--pretty=format:', 'HEAD'])
  assert.equal(headFiles.status, 0, headFiles.stderr)
  const committed = headFiles.stdout.split('\n').map(s => s.trim()).filter(Boolean)
  assert.ok(committed.includes('decisions.md'), 'latest commit must include the fde-written file')
  assert.equal(committed.includes('risks.md'), false, 'manual risks.md edit must not be laundered into the write commit')

  const porcelain = gitInEng(eng, ['status', '--porcelain'])
  assert.equal(porcelain.status, 0, porcelain.stderr)
  assert.match(porcelain.stdout, /risks\.md/, 'risks.md must still be dirty after the scoped write')
  assert.match(fs.readFileSync(path.join(eng, 'risks.md'), 'utf8'), /MANUAL_DIRTY_RISK_LINE/)
})

test('triage and status surface dirty memory from manual edits', () => {
  const sandbox = makeSandbox('dirty-surface')
  assert.equal(runFde(sandbox, ['resume', '--init', 'dirtysurf']).status, 0)
  const eng = engagementPath(sandbox, 'dirtysurf')
  ensureEngagementGitClean(eng)
  fs.appendFileSync(path.join(eng, 'context.md'), '\n- manual context tweak outside fde\n')

  for (const cmd of [['triage'], ['status'], ['resume']]) {
    const r = runFde(sandbox, cmd)
    assert.equal(r.status, 0, `${cmd[0]} failed: ${r.stderr}`)
    assert.match(r.stdout, /memory dirty|uncommitted manual/i, `${cmd[0]} must surface dirty memory`)
  }
})

test('memory unreadable is still shown when trust resolves green from the signal ledger', () => {
  const sandbox = makeSandbox('unreadable-green')
  assert.equal(runFde(sandbox, ['resume', '--init', 'ledgergreen']).status, 0)
  const eng = engagementPath(sandbox, 'ledgergreen')
  assert.equal(runFde(sandbox, ['log', 'contact', 'Sponsor confirmed go-live', '--signal', 'green']).status, 0)
  assert.equal(fs.existsSync(path.join(eng, '.signal-ledger')), true)

  fs.writeFileSync(path.join(eng, 'stakeholders.md'), Buffer.from([0x23, 0x20, 0x53, 0x00, 0x01, 0x02]))

  for (const cmd of [['status'], ['triage'], ['resume']]) {
    const r = runFde(sandbox, cmd)
    assert.equal(r.status, 0, `${cmd[0]} failed: ${r.stderr}`)
    if (cmd[0] === 'status') {
      assert.match(r.stdout, /\[green\s*\]\s*ledgergreen/i, 'status must show green trust from ledger')
    } else {
      assert.match(r.stdout, /TRIAGE\s+\[green\s*\]/i, `${cmd[0]} must still show green trust from ledger`)
    }
    assert.match(r.stdout, /memory unreadable/i, `${cmd[0]} must surface unreadable memory alongside green trust`)
  }
})

test('receipts puts dated declined decisions under ON RECORD, not claims', () => {
  const sandbox = makeSandbox('receipts-declined')
  assert.equal(runFde(sandbox, ['resume', '--init', 'declineco']).status, 0)
  const eng = engagementPath(sandbox, 'declineco')
  fs.writeFileSync(path.join(eng, 'decisions.md'), '# Decisions\n- [2026-07-11] sponsor declined the rollback drill\n')
  fs.writeFileSync(path.join(eng, 'brief.md'), '# Brief\nvendor declined to share the audit packet\n')

  const receipts = runFde(sandbox, ['receipts', 'declined'])
  assert.equal(receipts.status, 0, receipts.stderr)
  const onRecord = receipts.stdout.split('CLAIMS & working notes')[0]
  const claims = receipts.stdout.split('CLAIMS & working notes')[1] || ''
  assert.match(onRecord, /ON RECORD/, 'dated decision text must appear under ON RECORD')
  assert.match(onRecord, /decisions\.md.*declined the rollback drill/i)
  assert.match(claims, /brief\.md.*declined to share the audit packet/i)
  assert.doesNotMatch(onRecord, /brief\.md/, 'brief must not appear under ON RECORD')
})

test('session-start injects TRIAGE + pointer, not the full SKILL.md body', () => {
  const sandbox = makeSandbox('session-start-lean')
  assert.equal(runFde(sandbox, ['resume', '--init', 'LeanHook']).status, 0)
  const hook = path.join(root, 'hooks', 'session-start')
  const result = spawnSync('bash', [hook], {
    cwd: sandbox.workspace,
    env: {
      ...process.env,
      HOME: sandbox.home,
      USERPROFILE: sandbox.home,
      PWD: sandbox.workspace,
      PATH: `${path.dirname(process.execPath)}:${process.env.PATH || ''}`,
    },
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  const out = result.stdout || ''
  assert.match(out, /plain language with @fde|invoke @fde/)
  assert.match(out, /never ask the human to type fde/)
  assert.match(out, /TRIAGE/)
  assert.match(out, /Engagement context/)
  // Full skill markers must not appear (progressive disclosure L1).
  assert.doesNotMatch(out, /## Purpose/)
  assert.doesNotMatch(out, /## Routing/)
  assert.doesNotMatch(out, /## Anti-invention gates/)
})

test('session-stop delegates capture to the hook-resolved engagement and commits context only', () => {
  const sandbox = makeSandbox('session-stop-delegation')
  const projectA = path.join(sandbox.dir, 'project-a')
  const projectB = path.join(sandbox.dir, 'project-b')
  const hookWorkspace = path.join(sandbox.dir, 'hook workspace')
  fs.mkdirSync(projectA)
  fs.mkdirSync(projectB)
  fs.mkdirSync(hookWorkspace)
  assert.equal(runFde(sandbox, ['resume', '--init', 'Hook A'], { cwd: projectA }).status, 0)
  assert.equal(runFde(sandbox, ['resume', '--init', 'Hook B'], { cwd: projectB }).status, 0)
  const engA = engagementPath(sandbox, 'hook-a')
  const engB = engagementPath(sandbox, 'hook-b')
  fs.writeFileSync(path.join(hookWorkspace, 'CLAUDE.md'), `FDEOPS_ENGAGEMENT=${engA}\n`)
  fs.mkdirSync(path.join(sandbox.home, '.claude'), { recursive: true })
  fs.writeFileSync(path.join(sandbox.home, '.claude', 'FDEOPS-CLAUDE.md'), `FDEOPS_ENGAGEMENT=${engB}\n`)
  ensureEngagementGitClean(engA)
  ensureEngagementGitClean(engB)
  const headA = gitInEng(engA, ['rev-parse', 'HEAD']).stdout.trim()
  const headB = gitInEng(engB, ['rev-parse', 'HEAD']).stdout.trim()
  const contextB = fs.readFileSync(path.join(engB, 'context.md'), 'utf8')

  const result = runHook(sandbox, 'session-stop', { cwd: hookWorkspace })

  assert.equal(result.status, 0, result.stderr)
  const contextA = fs.readFileSync(path.join(engA, 'context.md'), 'utf8')
  assert.match(contextA, /\n<!-- fdeops auto-capture -->\n## Session end - \d{4}-\d{2}-\d{2} \d{2}:\d{2}\n/)
  assert.notEqual(gitInEng(engA, ['rev-parse', 'HEAD']).stdout.trim(), headA, 'capture must commit engagement A')
  assert.equal(gitInEng(engA, ['log', '-1', '--format=%s']).stdout.trim(), 'session capture')
  assert.equal(gitInEng(engA, ['show', '--format=', '--name-only', 'HEAD']).stdout.trim(), 'context.md')
  assert.equal(gitInEng(engB, ['rev-parse', 'HEAD']).stdout.trim(), headB, 'global engagement B must not be written')
  assert.equal(fs.readFileSync(path.join(engB, 'context.md'), 'utf8'), contextB)
})

test('capture uses one local calendar for both date and time', () => {
  const sandbox = makeSandbox('capture-local-calendar')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Local Clock']).status, 0)
  const eng = engagementPath(sandbox, 'local-clock')
  const utcHour = new Date().getUTCHours()
  const timeZone = utcHour >= 10 ? 'Pacific/Kiritimati' : 'Etc/GMT+12'
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date()).map(part => [part.type, part.value]))
  const localDate = `${parts.year}-${parts.month}-${parts.day}`
  assert.notEqual(localDate, new Date().toISOString().slice(0, 10), 'test timezone must cross the UTC date boundary')

  const capture = runFde(sandbox, ['capture'], {
    env: { FDEOPS_ENGAGEMENT: eng, TZ: timeZone },
  })

  assert.equal(capture.status, 0, capture.stderr)
  const context = fs.readFileSync(path.join(eng, 'context.md'), 'utf8')
  assert.match(context, new RegExp(`## Session end - ${localDate} \\d{2}:\\d{2}`))
})

test('pre-compact delegates preserve with private stripping, UTC-day dedupe, and memory commit', () => {
  const sandbox = makeSandbox('pre-compact-delegation')
  const projectA = path.join(sandbox.dir, 'project-a')
  const projectB = path.join(sandbox.dir, 'project-b')
  const hookWorkspace = path.join(sandbox.dir, 'compact workspace')
  fs.mkdirSync(projectA)
  fs.mkdirSync(projectB)
  fs.mkdirSync(hookWorkspace)
  assert.equal(runFde(sandbox, ['resume', '--init', 'Compact A'], { cwd: projectA }).status, 0)
  assert.equal(runFde(sandbox, ['resume', '--init', 'Compact B'], { cwd: projectB }).status, 0)
  const engA = engagementPath(sandbox, 'compact-a')
  const engB = engagementPath(sandbox, 'compact-b')
  fs.writeFileSync(path.join(hookWorkspace, 'CLAUDE.md'), `FDEOPS_ENGAGEMENT="${engA}"\n`)
  fs.mkdirSync(path.join(sandbox.home, '.claude'), { recursive: true })
  fs.writeFileSync(path.join(sandbox.home, '.claude', 'FDEOPS-CLAUDE.md'), `FDEOPS_ENGAGEMENT=${engB}\n`)
  fs.writeFileSync(path.join(engA, 'decisions.md'), [
    '# Decisions',
    ...Array.from({ length: 22 }, (_, i) => `- decision ${i + 1}`),
    '<private>',
    'PRIVATE_DECISION_CANARY',
    '</private>',
    '- final public decision',
    '',
  ].join('\n'))
  fs.writeFileSync(path.join(engA, 'risks.md'), [
    '# Risks',
    '<private>',
    '- open PRIVATE_RISK_CANARY',
    '</private>',
    ...Array.from({ length: 10 }, (_, i) => `- active public risk ${i + 1}`),
    '',
  ].join('\n'))
  ensureEngagementGitClean(engA)
  ensureEngagementGitClean(engB)
  const headA = gitInEng(engA, ['rev-parse', 'HEAD']).stdout.trim()
  const headB = gitInEng(engB, ['rev-parse', 'HEAD']).stdout.trim()

  const first = runHook(sandbox, 'pre-compact', { cwd: hookWorkspace })
  const second = runHook(sandbox, 'pre-compact', { cwd: hookWorkspace })

  assert.equal(first.status, 0, first.stderr)
  assert.equal(second.status, 0, second.stderr)
  const context = fs.readFileSync(path.join(engA, 'context.md'), 'utf8')
  const today = new Date().toISOString().slice(0, 10)
  assert.match(context, new RegExp(
    `\\n---\\n\\[fdeops context preserved at ${today}T\\d{2}:\\d{2}:\\d{2}Z\\]\\n` +
    'Recent decisions \\(tail\\):\\n[\\s\\S]*\\n\\nOpen risks:\\n[\\s\\S]*\\n---\\n$'
  ))
  assert.equal((context.match(/\[fdeops context preserved/g) || []).length, 1)
  assert.doesNotMatch(context, /PRIVATE_DECISION_CANARY|PRIVATE_RISK_CANARY/)
  assert.match(context, /final public decision/)
  assert.equal((context.match(/active public risk/g) || []).length, 8)
  assert.notEqual(gitInEng(engA, ['rev-parse', 'HEAD']).stdout.trim(), headA, 'preserve must commit engagement A')
  assert.equal(gitInEng(engA, ['log', '-1', '--format=%s']).stdout.trim(), 'context preserve')
  assert.equal(gitInEng(engA, ['show', '--format=', '--name-only', 'HEAD']).stdout.trim(), 'context.md')
  assert.equal(gitInEng(engB, ['rev-parse', 'HEAD']).stdout.trim(), headB, 'global engagement B must not be written')
})

test('preserve deduplicates atomically while concurrent writers wait on the context lock', async () => {
  const sandbox = makeSandbox('preserve-atomic-dedupe')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Atomic Preserve']).status, 0)
  const eng = engagementPath(sandbox, 'atomic-preserve')
  const contextPath = path.join(eng, 'context.md')
  const lockPath = contextPath + '.lock'
  fs.writeFileSync(lockPath, 'test barrier\n')

  const children = Array.from({ length: 6 }, () => new Promise(resolve => {
    const child = spawn(process.execPath, [fde, 'preserve'], {
      cwd: sandbox.workspace,
      env: {
        ...process.env,
        HOME: sandbox.home,
        USERPROFILE: sandbox.home,
        FDEOPS_ENGAGEMENT: eng,
        FDEOS_ENGAGEMENT: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stderr = ''
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('close', status => resolve({ status, stderr }))
  }))
  await new Promise(resolve => setTimeout(resolve, 750))
  fs.unlinkSync(lockPath)
  const results = await Promise.all(children)

  for (const result of results) assert.equal(result.status, 0, result.stderr)
  const context = fs.readFileSync(contextPath, 'utf8')
  assert.equal((context.match(/\[fdeops context preserved/g) || []).length, 1)
})

test('preserve commits an existing daily marker left dirty by an earlier failed commit', () => {
  const sandbox = makeSandbox('preserve-commit-recovery')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Preserve Recovery']).status, 0)
  const eng = engagementPath(sandbox, 'preserve-recovery')
  const today = new Date().toISOString().slice(0, 10)
  fs.appendFileSync(path.join(eng, 'context.md'),
    `\n---\n[fdeops context preserved at ${today}T00:00:00Z]\nRecent decisions (tail):\n\nOpen risks:\n\n---\n`)
  const before = gitInEng(eng, ['rev-parse', 'HEAD']).stdout.trim()

  const preserve = runFde(sandbox, ['preserve'], { env: { FDEOPS_ENGAGEMENT: eng } })

  assert.equal(preserve.status, 0, preserve.stderr)
  assert.notEqual(gitInEng(eng, ['rev-parse', 'HEAD']).stdout.trim(), before)
  assert.equal(gitInEng(eng, ['status', '--porcelain']).stdout, '')
  const context = fs.readFileSync(path.join(eng, 'context.md'), 'utf8')
  assert.equal((context.match(/\[fdeops context preserved/g) || []).length, 1)
})

test('preserve refuses a symlinked context file without touching its target', () => {
  const sandbox = makeSandbox('preserve-context-symlink')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Preserve Symlink']).status, 0)
  const eng = engagementPath(sandbox, 'preserve-symlink')
  const contextPath = path.join(eng, 'context.md')
  const outside = path.join(sandbox.dir, 'outside-context.md')
  fs.writeFileSync(outside, 'outside must stay unchanged\n')
  fs.unlinkSync(contextPath)
  fs.symlinkSync(outside, contextPath)

  const preserve = runFde(sandbox, ['preserve'], { env: { FDEOPS_ENGAGEMENT: eng } })

  assert.equal(preserve.status, 0, preserve.stderr)
  assert.equal(fs.readFileSync(outside, 'utf8'), 'outside must stay unchanged\n')
  assert.equal(fs.lstatSync(contextPath).isSymbolicLink(), true)
})

test('preserve keeps twenty decision lines when readClean input has one terminal newline', () => {
  const sandbox = makeSandbox('preserve-tail-lines')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Preserve Tail']).status, 0)
  const eng = engagementPath(sandbox, 'preserve-tail')
  fs.writeFileSync(path.join(eng, 'decisions.md'),
    Array.from({ length: 21 }, (_, i) => `- intended decision ${String(i + 1).padStart(2, '0')}`).join('\n') + '\n')

  const preserve = runFde(sandbox, ['preserve'], { env: { FDEOPS_ENGAGEMENT: eng } })

  assert.equal(preserve.status, 0, preserve.stderr)
  const context = fs.readFileSync(path.join(eng, 'context.md'), 'utf8')
  const decisions = context.split('Recent decisions (tail):\n')[1].split('\n\nOpen risks:')[0].split('\n')
  assert.equal(decisions.length, 20)
  assert.equal(decisions[0], '- intended decision 02')
  assert.equal(decisions[19], '- intended decision 21')
  assert.doesNotMatch(decisions.join('\n'), /intended decision 01/)
})

test('mutation hooks exit zero without writing when Node or the CLI is unavailable', () => {
  const sandbox = makeSandbox('hooks-best-effort-missing-runtime')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Best Effort']).status, 0)
  const eng = engagementPath(sandbox, 'best-effort')
  const contextPath = path.join(eng, 'context.md')
  const before = fs.readFileSync(contextPath, 'utf8')
  const noNodePath = path.join(sandbox.dir, 'path-without-node')
  fs.mkdirSync(noNodePath)
  const shellTools = spawnSync('/bin/sh', ['-c', 'command -v bash; command -v cat; command -v sed'], { encoding: 'utf8' })
  assert.equal(shellTools.status, 0, shellTools.stderr)
  for (const tool of shellTools.stdout.trim().split('\n')) {
    fs.symlinkSync(tool, path.join(noNodePath, path.basename(tool)))
  }

  for (const name of ['session-stop', 'pre-compact']) {
    const withoutNode = runHook(sandbox, name, {
      env: {
        FDEOPS_ENGAGEMENT: eng,
        CLAUDE_PLUGIN_ROOT: '',
        PATH: noNodePath,
      },
    })
    assert.equal(withoutNode.status, 0, withoutNode.stderr)
  }

  const isolatedHooks = path.join(sandbox.dir, 'isolated-hooks')
  fs.mkdirSync(isolatedHooks)
  for (const name of ['session-stop', 'pre-compact']) {
    const isolatedHook = path.join(isolatedHooks, name)
    fs.copyFileSync(path.join(root, 'hooks', name), isolatedHook)
    fs.chmodSync(isolatedHook, 0o755)
    const withoutCli = runHook(sandbox, name, {
      hook: isolatedHook,
      env: { FDEOPS_ENGAGEMENT: eng, CLAUDE_PLUGIN_ROOT: '' },
    })
    assert.equal(withoutCli.status, 0, withoutCli.stderr)
  }

  assert.equal(fs.readFileSync(contextPath, 'utf8'), before,
    'best-effort hooks must not bypass the CLI safety layer')
})

test('mutation hooks fall back to PATH fde when plugin copies are missing', () => {
  const sandbox = makeSandbox('hooks-path-fde')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Path Fde']).status, 0)
  const eng = engagementPath(sandbox, 'path-fde')
  ensureEngagementGitClean(eng)
  const beforeHead = gitInEng(eng, ['rev-parse', 'HEAD']).stdout.trim()

  const binDir = path.join(sandbox.dir, 'path-bin')
  fs.mkdirSync(binDir)
  const fdeShim = path.join(binDir, 'fde')
  fs.writeFileSync(fdeShim, `#!/bin/sh\nexec "${process.execPath}" "${fde}" "$@"\n`)
  fs.chmodSync(fdeShim, 0o755)

  const isolatedHooks = path.join(sandbox.dir, 'path-hooks')
  fs.mkdirSync(isolatedHooks)
  for (const name of ['session-stop', 'pre-compact']) {
    const isolatedHook = path.join(isolatedHooks, name)
    fs.copyFileSync(path.join(root, 'hooks', name), isolatedHook)
    fs.chmodSync(isolatedHook, 0o755)
  }

  const pathEnv = {
    FDEOPS_ENGAGEMENT: eng,
    CLAUDE_PLUGIN_ROOT: '',
    PATH: `${binDir}:${path.dirname(process.execPath)}:/usr/bin:/bin`,
  }

  const stop = runHook(sandbox, 'session-stop', {
    hook: path.join(isolatedHooks, 'session-stop'),
    env: pathEnv,
  })
  assert.equal(stop.status, 0, stop.stderr)
  assert.match(fs.readFileSync(path.join(eng, 'context.md'), 'utf8'), /## Session end -/)
  assert.notEqual(gitInEng(eng, ['rev-parse', 'HEAD']).stdout.trim(), beforeHead,
    'PATH fde must still capture through session-stop')

  const afterCapture = gitInEng(eng, ['rev-parse', 'HEAD']).stdout.trim()
  const compact = runHook(sandbox, 'pre-compact', {
    hook: path.join(isolatedHooks, 'pre-compact'),
    env: pathEnv,
  })
  assert.equal(compact.status, 0, compact.stderr)
  assert.match(fs.readFileSync(path.join(eng, 'context.md'), 'utf8'), /\[fdeops context preserved/)
  assert.notEqual(gitInEng(eng, ['rev-parse', 'HEAD']).stdout.trim(), afterCapture,
    'PATH fde must still preserve through pre-compact')
})

test('v3.9.10-shaped engagement still works through core CLI verbs', () => {
  const sandbox = makeSandbox('upgrade-fixture')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Upgrade Fixture']).status, 0)
  const eng = engagementPath(sandbox, 'upgrade-fixture')
  for (const hidden of ['.git', '.owner', '.signal-ledger', '.last-write']) {
    const p = path.join(eng, hidden)
    if (hidden === '.git') rmTreeIfPresent(p)
    else tryUnlink(p)
  }

  assert.equal(runFde(sandbox, ['resume']).status, 0)
  assert.equal(runFde(sandbox, ['log', 'decision', 'keep launch date']).status, 0)
  assert.equal(runFde(sandbox, ['debrief'], { input: 'contact: Denise saw demo [signal:green]\nnext: send recap\n' }).status, 0)
  assert.equal(runFde(sandbox, ['prep', 'Sponsor sync']).status, 0)
  const doctor = runFde(sandbox, ['doctor'])
  assert.ok(doctor.status === 0 || doctor.status === 1, doctor.stderr)
  assert.equal(runFde(sandbox, ['status']).status, 0)
  const dash = runFde(sandbox, ['dashboard', '--out', path.join(sandbox.dir, 'upgrade.html')])
  assert.equal(dash.status, 0, dash.stderr)
  assert.equal(runFde(sandbox, ['capture'], { env: { FDEOPS_ENGAGEMENT: eng } }).status, 0)
  assert.equal(runFde(sandbox, ['preserve'], { env: { FDEOPS_ENGAGEMENT: eng } }).status, 0)
  assert.match(fs.readFileSync(path.join(eng, 'context.md'), 'utf8'), /Session end|fdeops context preserved/)
})

test('session-start triage uses the same project-pointer engagement as rendered context', () => {
  const sandbox = makeSandbox('session-start-one-engagement')
  const projectA = path.join(sandbox.dir, 'project-a')
  const projectB = path.join(sandbox.dir, 'project-b')
  const hookWorkspace = path.join(sandbox.dir, 'start workspace')
  fs.mkdirSync(projectA)
  fs.mkdirSync(projectB)
  fs.mkdirSync(hookWorkspace)
  assert.equal(runFde(sandbox, ['resume', '--init', 'Start A'], { cwd: projectA }).status, 0)
  assert.equal(runFde(sandbox, ['resume', '--init', 'Start B'], { cwd: projectB }).status, 0)
  const engA = engagementPath(sandbox, 'start-a')
  const engB = engagementPath(sandbox, 'start-b')
  fs.writeFileSync(path.join(engA, 'context.md'), '# Engagement context\n**Phase:** land\n\n## Next action\n- A_ONLY_NEXT_ACTION\n')
  fs.writeFileSync(path.join(engB, 'context.md'), '# Engagement context\n**Phase:** ship\n\n## Next action\n- B_ONLY_NEXT_ACTION\n')
  fs.writeFileSync(path.join(hookWorkspace, 'CLAUDE.md'), `FDEOPS_ENGAGEMENT=${engA}\n`)
  fs.mkdirSync(path.join(sandbox.home, '.claude'), { recursive: true })
  fs.writeFileSync(path.join(sandbox.home, '.claude', 'FDEOPS-CLAUDE.md'), `FDEOPS_ENGAGEMENT=${engB}\n`)

  const result = runHook(sandbox, 'session-start', { cwd: hookWorkspace })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /TRIAGE\s+\[[^\]]+\]\s+phase:land/)
  assert.match(result.stdout, /A_ONLY_NEXT_ACTION/)
  assert.doesNotMatch(result.stdout, /TRIAGE\s+\[[^\]]+\]\s+phase:ship/)
  assert.doesNotMatch(result.stdout, /B_ONLY_NEXT_ACTION/)
})

test('memory init stays quiet when git has no global identity', () => {
  const sandbox = makeSandbox('no-git-id')
  const env = {
    HOME: sandbox.home,
    USERPROFILE: sandbox.home,
    GIT_CONFIG_GLOBAL: path.join(sandbox.home, 'empty-gitconfig'),
    GIT_CONFIG_SYSTEM: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
  }
  fs.writeFileSync(path.join(sandbox.home, 'empty-gitconfig'), '')
  // Simulate corporate default: require config (env alone is not enough)
  const init = runFde(sandbox, ['resume', '--init', 'quietco'], {
    env: {
      ...env,
      // Force local git to prefer config - still must not leak "Please tell me who you are"
    },
  })
  assert.equal(init.status, 0, init.stderr + init.stdout)
  assert.doesNotMatch(init.stderr + init.stdout, /Please tell me who you are/i)
  assert.doesNotMatch(init.stderr + init.stdout, /Author identity unknown/i)
  const eng = engagementPath(sandbox, 'quietco')
  assert.ok(fs.existsSync(path.join(eng, '.git')))
  const head = gitInEng(eng, ['rev-parse', '--short', 'HEAD'])
  assert.equal(head.status, 0, 'init must produce a memory commit even without global git identity')
})

test('redact removes a buried secret line that undo cannot reach', () => {
  const sandbox = makeSandbox('redact-buried')
  assert.equal(runFde(sandbox, ['resume', '--init', 'redactco']).status, 0)
  const eng = engagementPath(sandbox, 'redactco')
  const secret = 'AKIAIOSFODNN7EXAMPLE'
  assert.equal(runFde(sandbox, ['log', 'decision', `leaked ${secret} into chat`, '--force']).status, 0)
  assert.equal(runFde(sandbox, ['log', 'decision', 'ship the retry slice']).status, 0)
  assert.equal(runFde(sandbox, ['log', 'contact', 'eng lead Mo cooperative', '--signal', 'green']).status, 0)

  const undo = runFde(sandbox, ['log', '--undo'])
  assert.equal(undo.status, 0, undo.stderr)
  const afterUndo = fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8')
  assert.match(afterUndo, new RegExp(secret), 'undo only removes last write - secret still buried')

  const preview = runFde(sandbox, ['redact', secret])
  assert.equal(preview.status, 0, preview.stderr)
  assert.match(preview.stdout, /Preview only|--apply/)
  assert.match(fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8'), new RegExp(secret))

  const applied = runFde(sandbox, ['redact', secret, '--apply'])
  assert.equal(applied.status, 0, applied.stderr)
  assert.match(applied.stdout, /redacted/)
  assert.doesNotMatch(fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8'), new RegExp(secret))
  assert.match(fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8'), /ship the retry slice/)
})

test('doctor warns on close with open risks and duplicate risk echoes', () => {
  const sandbox = makeSandbox('doctor-close')
  assert.equal(runFde(sandbox, ['resume', '--init', 'closeco']).status, 0)
  const eng = engagementPath(sandbox, 'closeco')
  fs.writeFileSync(path.join(eng, 'success.md'), '# Success\nDone when: finance signs off on the pilot.\n')
  const ctx = fs.readFileSync(path.join(eng, 'context.md'), 'utf8')
  fs.writeFileSync(
    path.join(eng, 'context.md'),
    ctx.replace(/\*\*Phase:\*\*.*/, '**Phase:** close') + '\n## Next action\n- hand off the runbook\n'
  )
  fs.writeFileSync(
    path.join(eng, 'risks.md'),
    '# Risks\n' +
      '- [2026-05-01] PLC vendor firmware drift on line 3\n' +
      '- [2026-05-08] PLC vendor firmware drift on line 3 again\n' +
      '- [2026-05-15] PLC vendor firmware drift still open\n'
  )
  const doctor = runFde(sandbox, ['doctor'])
  assert.notEqual(doctor.status, 0)
  assert.match(doctor.stdout, /open risk/i)
  assert.match(doctor.stdout, /duplicate open-risk/i)
})

test('triage hygiene: silent on fresh day-1; speaks after real work accrues gaps', () => {
  const sandbox = makeSandbox('hygiene-triage')
  assert.equal(runFde(sandbox, ['resume', '--init', 'hygco']).status, 0)
  // Brand-new templates must NOT nag - wallpaper trains people to ignore hygiene.
  const fresh = runFde(sandbox, ['triage'])
  assert.equal(fresh.status, 0, fresh.stderr)
  assert.doesNotMatch(fresh.stdout, /hygiene:/i, 'day-1 empty fieldbook stays silent')

  // Real work without next action / success → high-value week-start hygiene.
  assert.equal(runFde(sandbox, ['log', 'decision', 'descope reporting until audit']).status, 0)
  assert.equal(runFde(sandbox, ['log', 'phase', 'discover']).status, 0)
  const eng = engagementPath(sandbox, 'hygco')
  fs.writeFileSync(
    path.join(eng, 'context.md'),
    '# Engagement context\n**Phase:** discover\n\n## Next action\n\n## Notes\n'
  )
  fs.writeFileSync(path.join(eng, 'success.md'), '# Success\n')
  const dirty = runFde(sandbox, ['triage'])
  assert.equal(dirty.status, 0, dirty.stderr)
  assert.match(dirty.stdout, /hygiene:/i)
  assert.match(dirty.stdout, /@fde clean up the fieldbook/i)

  fs.writeFileSync(path.join(eng, 'success.md'), '# Success\nDone when: pilot signed off.\n')
  fs.writeFileSync(
    path.join(eng, 'context.md'),
    '# Engagement context\n**Phase:** discover\n\n## Next action\n- confirm Denise channel\n'
  )
  fs.writeFileSync(path.join(eng, 'risks.md'), '# Risks\n')
  const doctorOk = runFde(sandbox, ['doctor'])
  assert.equal(doctorOk.status, 0, doctorOk.stdout + doctorOk.stderr)
  const clean = runFde(sandbox, ['triage'])
  assert.equal(clean.status, 0, clean.stderr)
  assert.doesNotMatch(clean.stdout, /hygiene:/i, 'hygiene must be silent when doctor is OK')
})

test('a day-1 risk register counts zero open risks; a legend line is not a risk', () => {
  const sandbox = makeSandbox('risk-legend')
  assert.equal(runFde(sandbox, ['resume', '--init', 'legendco']).status, 0)
  const shipped = runFde(sandbox, ['triage'])
  assert.equal(shipped.status, 0, shipped.stderr)
  assert.match(shipped.stdout, /open risks:0/, 'shipped risks.md template must count 0 open risks')

  // "**Status:** open · closed" starts with '*' - it is markdown emphasis, not a bullet.
  const eng = engagementPath(sandbox, 'legendco')
  fs.writeFileSync(
    path.join(eng, 'risks.md'),
    '# Risk register\n\n| Risk | Status | Owner | Mitigation |\n|------|--------|-------|------------|\n\n' +
    '**Status:** `open` · `mitigating` · `closed` · `accepted`\n'
  )
  const legend = runFde(sandbox, ['triage'])
  assert.match(legend.stdout, /open risks:0/, 'a status legend must not read as an open risk')

  assert.equal(runFde(sandbox, ['log', 'risk', 'cutover window still unsigned']).status, 0)
  const real = runFde(sandbox, ['triage'])
  assert.match(real.stdout, /open risks:1/, 'a logged risk still counts')
})

test('phase ship/close warns when open risks remain', () => {
  const sandbox = makeSandbox('phase-risk-warn')
  assert.equal(runFde(sandbox, ['resume', '--init', 'phasewarn']).status, 0)
  const eng = engagementPath(sandbox, 'phasewarn')
  fs.writeFileSync(path.join(eng, 'risks.md'), '# Risks\n- [2026-07-01] cutover window still unsigned\n')
  const phase = runFde(sandbox, ['log', 'phase', 'close'])
  assert.equal(phase.status, 0, phase.stderr)
  assert.match(phase.stderr, /open risk/i)
})

test('doctor ship/close: value bucket required; eval only when AI in scope', () => {
  const sandbox = makeSandbox('doctor-value-eval')
  assert.equal(runFde(sandbox, ['resume', '--init', 'valco']).status, 0)
  const eng = engagementPath(sandbox, 'valco')
  assert.equal(runFde(sandbox, ['log', 'decision', 'descope reporting until audit']).status, 0)
  assert.equal(runFde(sandbox, ['log', 'phase', 'ship']).status, 0)
  fs.writeFileSync(
    path.join(eng, 'context.md'),
    '# Engagement context\n**Phase:** ship\n\n## Next action\n- canary the parity fix\n'
  )
  fs.writeFileSync(path.join(eng, 'success.md'), '# Success\nDone when: finance signs off.\n')
  fs.writeFileSync(path.join(eng, 'risks.md'), '# Risks\n')

  const noBucket = runFde(sandbox, ['doctor'])
  assert.notEqual(noBucket.status, 0)
  assert.match(noBucket.stdout, /value bucket|operating map/i)
  assert.doesNotMatch(noBucket.stdout, /eval receipt/i, 'non-AI ship must not force eval pack')

  fs.writeFileSync(
    path.join(eng, 'success.md'),
    '# Success\nDone when: finance signs off.\n**Primary value bucket:** cost-save\n**Baseline → target:** 4h → 1h reconciliation\n'
  )
  const stillMap = runFde(sandbox, ['doctor'])
  assert.notEqual(stillMap.status, 0)
  assert.match(stillMap.stdout, /operating map/i)

  fillOperatingMap(eng)
  const nonAiOk = runFde(sandbox, ['doctor'])
  assert.equal(nonAiOk.status, 0, nonAiOk.stdout + nonAiOk.stderr)

  fs.writeFileSync(
    path.join(eng, 'delivery.md'),
    '# Delivery\n## Value ledger\n| Date | Slice | Bucket | Promised | Measured | Evidence | Rollback |\n|------|-------|--------|----------|----------|----------|----------|\n| 2026-07-01 | parity | cost-save | cut recon time | pending | | |\n\n## Shipped\nRAG retrieval path live for ops FAQ.\n'
  )
  const aiMissingEval = runFde(sandbox, ['doctor'])
  assert.notEqual(aiMissingEval.status, 0)
  assert.match(aiMissingEval.stdout, /eval receipt/i)

  fs.writeFileSync(
    path.join(eng, 'evals.md'),
    '# Eval pack\n**Verdict:** SHIP\n**Last run:** 2026-07-18\n| ID | Input | Expected | Result |\n|----|-------|----------|--------|\n| G1 | known FAQ | cited answer | pass |\n'
  )
  const aiOk = runFde(sandbox, ['doctor'])
  assert.equal(aiOk.status, 0, aiOk.stdout + aiOk.stderr)
})

test('the shipped delivery.md template cannot satisfy the eval-receipt gate it documents', () => {
  const sandbox = makeSandbox('eval-gate-template')
  assert.equal(runFde(sandbox, ['resume', '--init', 'aico']).status, 0)
  const eng = engagementPath(sandbox, 'aico')
  fs.appendFileSync(
    path.join(eng, 'trust-profile.md'),
    '\n## AI policy\nCustomer approved an LLM-assisted reranker; no PHI may reach the model.\n'
  )
  assert.equal(runFde(sandbox, ['log', 'phase', 'ship']).status, 0)

  // delivery.md ships "**Eval receipt:** n/a unless AI touches the slice, else evals.md
  // pass + the HITL owner" - prose that documents the receipt, not a receipt.
  const untouched = runFde(sandbox, ['doctor'])
  assert.notEqual(untouched.status, 0)
  assert.match(untouched.stdout, /eval receipt/i, 'day-1 template prose must not satisfy the gate')

  // A dated Ship receipts row is a receipt, and still clears it.
  const del = fs.readFileSync(path.join(eng, 'delivery.md'), 'utf8').replace(
    /(\| Date \| Slice \| Audit receipt \| Eval receipt \|\n\|[-|]+\|)/,
    '$1\n| 2026-07-18 | reranker v1 | 2026-07-10 exception path verified with Tom | evals.md 18/18 pass, HITL owner Priya |'
  )
  fs.writeFileSync(path.join(eng, 'delivery.md'), del)
  const receipted = runFde(sandbox, ['doctor'])
  assert.doesNotMatch(receipted.stdout, /eval receipt/i, 'a dated ship receipt clears the gate')
})

test('doctor calls out a measured benefit nobody on the customer side accepted', () => {
  const sandbox = makeSandbox('doctor-claimed-value')
  assert.equal(runFde(sandbox, ['resume', '--init', 'claimco']).status, 0)
  const eng = engagementPath(sandbox, 'claimco')
  assert.equal(runFde(sandbox, ['log', 'decision', 'route failures to on-call']).status, 0)
  assert.equal(runFde(sandbox, ['log', 'phase', 'ship']).status, 0)
  fs.writeFileSync(
    path.join(eng, 'context.md'),
    '# Engagement context\n**Phase:** ship\n\n## Next action\n- confirm the number with finance\n'
  )
  fs.writeFileSync(
    path.join(eng, 'success.md'),
    '# Success\nDone when: finance signs off.\n**Primary value bucket:** risk-mitigation\n'
  )
  fs.writeFileSync(path.join(eng, 'risks.md'), '# Risks\n')
  fillOperatingMap(eng)

  const ledger = (measured, accepted) =>
    '# Delivery\n## Value ledger\n' +
    '| Date | Slice | Bucket | Promised | Measured | Accepted by | Evidence | Rollback |\n' +
    '|------|-------|--------|----------|----------|-------------|----------|----------|\n' +
    `| 2026-07-01 | failure routing | risk-mitigation | 4h → 15min | ${measured} | ${accepted} | kill test | disable route |\n`

  // Still being measured: nothing to accept yet, so no nag.
  fs.writeFileSync(path.join(eng, 'delivery.md'), ledger('pending', ''))
  const stillPending = runFde(sandbox, ['doctor'])
  assert.equal(stillPending.status, 0, stillPending.stdout + stillPending.stderr)

  // A number we calculated and nobody signed: claimed, not delivered.
  fs.writeFileSync(path.join(eng, 'delivery.md'), ledger('12min over 2 incidents', ''))
  const claimed = runFde(sandbox, ['doctor'])
  assert.notEqual(claimed.status, 0)
  assert.match(claimed.stdout, /1 value ledger row\(s\) measured but not accepted/)
  assert.doesNotMatch(claimed.stdout, /no "Accepted by" column/)

  // An older ledger without the column is the same finding, said differently.
  fs.writeFileSync(
    path.join(eng, 'delivery.md'),
    '# Delivery\n## Value ledger\n' +
      '| Date | Slice | Bucket | Promised | Measured | Evidence | Rollback |\n' +
      '|------|-------|--------|----------|----------|----------|----------|\n' +
      '| 2026-07-01 | failure routing | risk-mitigation | 4h → 15min | 12min over 2 incidents | kill test | disable route |\n'
  )
  const legacy = runFde(sandbox, ['doctor'])
  assert.notEqual(legacy.status, 0)
  assert.match(legacy.stdout, /no "Accepted by" column/)

  // Named customer-side owner clears it.
  fs.writeFileSync(path.join(eng, 'delivery.md'), ledger('12min over 2 incidents', 'Denise Chen, Jul 9'))
  const accepted = runFde(sandbox, ['doctor'])
  assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr)

  // An escaped pipe in a latency figure must not shift the columns: the row
  // reads pending and stays quiet, and the same table with a real unaccepted
  // measurement still fires.
  fs.writeFileSync(
    path.join(eng, 'delivery.md'),
    '# Delivery\n## Value ledger\n' +
      '| Date | Slice | Bucket | Promised | Measured | Accepted by | Evidence | Rollback |\n' +
      '|------|-------|--------|----------|----------|-------------|----------|----------|\n' +
      '| 2026-07-01 | routing | risk-mitigation | 4h \\| 15min p95 | pending | | kill test | off |\n'
  )
  const pipedPending = runFde(sandbox, ['doctor'])
  assert.equal(pipedPending.status, 0, pipedPending.stdout + pipedPending.stderr)

  fs.writeFileSync(
    path.join(eng, 'delivery.md'),
    '# Delivery\n## Value ledger\n' +
      '| Date | Slice | Bucket | Promised | Measured | Accepted by | Evidence | Rollback |\n' +
      '|------|-------|--------|----------|----------|-------------|----------|----------|\n' +
      '| 2026-07-01 | routing | risk-mitigation | 4h → 15min | 40% \\| p95 | | kill test | off |\n'
  )
  const pipedMeasured = runFde(sandbox, ['doctor'])
  assert.notEqual(pipedMeasured.status, 0)
  assert.match(pipedMeasured.stdout, /1 value ledger row\(s\) measured but not accepted/)

  // A sealed row must not truncate the table and hide every row beneath it.
  fs.writeFileSync(
    path.join(eng, 'delivery.md'),
    '# Delivery\n## Value ledger\n' +
      '| Date | Slice | Bucket | Promised | Measured | Accepted by | Evidence | Rollback |\n' +
      '|------|-------|--------|----------|----------|-------------|----------|----------|\n' +
      '| 2026-06-20 | rate card | cost-save | trim spend | <private>SEALED-4242 saved</private> | | invoice | n/a |\n' +
      '| 2026-07-01 | routing | risk-mitigation | 4h → 15min | 12min over 2 incidents | | kill test | off |\n'
  )
  const sealedAbove = runFde(sandbox, ['doctor'])
  assert.notEqual(sealedAbove.status, 0)
  assert.match(sealedAbove.stdout, /2 value ledger row\(s\) measured but not accepted/)
  assert.doesNotMatch(sealedAbove.stdout, /SEALED-4242/, 'doctor must never echo sealed content')

  // Placeholder near-misses mean "not measured yet", not "measured".
  for (const placeholder of ['pending review', 'TBD.', 'n/a (blocked)', '...', '?']) {
    fs.writeFileSync(path.join(eng, 'delivery.md'), ledger(placeholder, ''))
    const near = runFde(sandbox, ['doctor'])
    assert.equal(near.status, 0, `${placeholder}: ${near.stdout}${near.stderr}`)
  }
})

test('ANSI / control chars cannot smuggle fake colors into triage', () => {
  const sandbox = makeSandbox('ansi-smuggle')
  assert.equal(runFde(sandbox, ['resume', '--init', 'ansico']).status, 0)
  const poisoned = `Denise went quiet \x1b[31m[signal:green]\x1b[0m after the demo`
  assert.equal(runFde(sandbox, ['log', 'contact', poisoned, '--signal', 'amber']).status, 0)
  const eng = engagementPath(sandbox, 'ansico')
  const raw = fs.readFileSync(path.join(eng, 'stakeholders.md'), 'utf8')
  assert.doesNotMatch(raw, /\x1b/, 'writes must strip ESC before storing')
  const triage = runFde(sandbox, ['triage'])
  assert.equal(triage.status, 0, triage.stderr)
  assert.doesNotMatch(triage.stdout, /\x1b/, 'triage must not emit ANSI')
  assert.match(triage.stdout, /amber/i)
  const prep = runFde(sandbox, ['prep', 'Denise'])
  assert.doesNotMatch(prep.stdout, /\x1b/)
})

test('debrief refuses binary / mostly-nonprintable stdin', () => {
  const sandbox = makeSandbox('bin-debrief')
  assert.equal(runFde(sandbox, ['resume', '--init', 'binc']).status, 0)
  const junk = require('crypto').randomBytes(5000)
  const r = runFde(sandbox, ['debrief'], { input: junk })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /binary|non-printable/i)
  const eng = engagementPath(sandbox, 'binc')
  const ctx = fs.readFileSync(path.join(eng, 'context.md'), 'utf8')
  assert.doesNotMatch(ctx, /Debrief -/, 'binary must not land in context')
})

test('engagement .fde replaced by a file fails loudly (no fake green TRIAGE)', () => {
  const sandbox = makeSandbox('fde-as-file')
  assert.equal(runFde(sandbox, ['resume', '--init', 'fileco']).status, 0)
  const eng = engagementPath(sandbox, 'fileco')
  fs.rmSync(eng, { recursive: true, force: true })
  fs.writeFileSync(eng, 'not a directory')
  const triage = runFde(sandbox, ['triage'])
  assert.notEqual(triage.status, 0)
  assert.match((triage.stderr + triage.stdout), /not a directory|memory missing|no engagement/i)
  assert.doesNotMatch(triage.stdout, /TRIAGE\s+\[green/)
  const log = runFde(sandbox, ['log', 'decision', 'should fail'])
  assert.notEqual(log.status, 0)
  assert.match(log.stderr, /not a directory|memory missing|no engagement/i)
})

test('doctor shouts when memory .git is corrupt (silent ledger death)', () => {
  const sandbox = makeSandbox('broken-git')
  assert.equal(runFde(sandbox, ['resume', '--init', 'broke']).status, 0)
  const eng = engagementPath(sandbox, 'broke')
  assert.equal(runFde(sandbox, ['log', 'decision', 'descope until audit']).status, 0)
  fs.writeFileSync(
    path.join(eng, 'context.md'),
    '# Engagement context\n**Phase:** build\n\n## Next action\n- fix ledger\n'
  )
  fs.writeFileSync(path.join(eng, 'success.md'), '# Success\nDone when: pilot signed.\n')
  // Corrupt the ledger the way Agent 3 did: .git still exists, HEAD/objects dead.
  fs.writeFileSync(path.join(eng, '.git', 'HEAD'), 'ref: refs/heads/does-not-exist\n')
  fs.rmSync(path.join(eng, '.git', 'objects'), { recursive: true, force: true })
  fs.mkdirSync(path.join(eng, '.git', 'objects'), { recursive: true })

  const doctor = runFde(sandbox, ['doctor'])
  assert.notEqual(doctor.status, 0)
  assert.match(doctor.stdout, /BROKEN|UNVERSIONED/i)

  const garden = runFde(sandbox, ['garden'])
  assert.equal(garden.status, 0, garden.stderr)
  assert.match(garden.stdout, /BROKEN|NOT reversible/i)
  assert.doesNotMatch(garden.stdout, /reversible via memory git\)/)
})

test('receipts caveats ON RECORD hits in dirty memory files', () => {
  const sandbox = makeSandbox('receipts-dirty')
  assert.equal(runFde(sandbox, ['resume', '--init', 'dirtco']).status, 0)
  assert.equal(runFde(sandbox, ['log', 'decision', 'descope reporting until audit']).status, 0)
  const eng = engagementPath(sandbox, 'dirtco')
  const decisions = fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8')
  fs.writeFileSync(
    path.join(eng, 'decisions.md'),
    decisions.replace('descope reporting until audit', 'descope reporting until audit (backdated hand edit)')
  )
  const r = runFde(sandbox, ['receipts', 'descope'])
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /ON RECORD/)
  assert.match(r.stdout, /dirty/i)
})

test('debrief --smart caps long preview lines and routes Decided: to decisions', () => {
  const sandbox = makeSandbox('smart-cap')
  assert.equal(runFde(sandbox, ['resume', '--init', 'smartco']).status, 0)
  const long = 'x'.repeat(8000)
  const notes = `Decided: freeze prompts for the pilot\nNoise line ${long}\n`
  const notesPath = path.join(sandbox.workspace, 'notes.md')
  fs.writeFileSync(notesPath, notes)
  const smart = runFde(sandbox, ['debrief', '--smart', notesPath])
  assert.equal(smart.status, 0, smart.stderr)
  assert.match(smart.stdout, /→ decisions\.md/)
  assert.match(smart.stdout, /freeze prompts/)
  assert.doesNotMatch(smart.stdout, /x{500}/, 'preview must not echo the full 8k line')
  assert.match(smart.stdout, /… \(\d+ chars\)/)
})

test('triage prefers last non-empty ## Next action; doctor flags duplicates', () => {
  const sandbox = makeSandbox('next-dup')
  assert.equal(runFde(sandbox, ['resume', '--init', 'nextdup']).status, 0)
  assert.equal(runFde(sandbox, ['log', 'decision', 'kickoff complete']).status, 0)
  assert.equal(runFde(sandbox, ['log', 'phase', 'discover']).status, 0)
  const eng = engagementPath(sandbox, 'nextdup')
  fs.writeFileSync(
    path.join(eng, 'context.md'),
    '# Engagement context\n**Phase:** discover\n\n## Current state\nKickoff done\n\n## Next action\n\n## Notes\nold\n\n## Next action\n- walk in with Priya one-pager\n'
  )
  fs.writeFileSync(path.join(eng, 'success.md'), '# Success\nDone when: pilot signed.\n')
  const triage = runFde(sandbox, ['triage'])
  assert.equal(triage.status, 0, triage.stderr)
  assert.match(triage.stdout, /Priya one-pager/)
  assert.doesNotMatch(triage.stdout, /next: \(none set/)
  const doctor = runFde(sandbox, ['doctor'])
  assert.notEqual(doctor.status, 0)
  assert.match(doctor.stdout, /duplicate ## Next action/i)

  // next: apply collapses duplicates into one filled section
  const notesPath = path.join(sandbox.workspace, 'next-only.md')
  fs.writeFileSync(notesPath, 'next: send recap before Thursday\n')
  assert.equal(runFde(sandbox, ['debrief', notesPath]).status, 0)
  const ctx = fs.readFileSync(path.join(eng, 'context.md'), 'utf8')
  const headings = ctx.match(/^##\s+Next action\b/gim) || []
  assert.equal(headings.length, 1, 'setNextAction must collapse duplicate headings')
  assert.match(ctx, /send recap before Thursday/)
  assert.doesNotMatch(ctx, /Priya one-pager/)
})

test('garden proposes and applies duplicate open-risk consolidation', () => {
  const sandbox = makeSandbox('garden-dedupe')
  assert.equal(runFde(sandbox, ['resume', '--init', 'gardenco']).status, 0)
  const eng = engagementPath(sandbox, 'gardenco')
  fs.writeFileSync(
    path.join(eng, 'risks.md'),
    '# Risks\n' +
      '- [2026-05-01] PLC vendor firmware drift on line 3\n' +
      '- [2026-05-08] PLC vendor firmware drift on line 3 again\n' +
      '- [2026-05-15] PLC vendor firmware drift still open\n' +
      '- [2026-05-20] PLC vendor firmware drift on line 3\n'
  )
  // Make fingerprints match closely enough (doctor already clusters these).
  const propose = runFde(sandbox, ['garden'])
  assert.equal(propose.status, 0, propose.stderr)
  assert.match(propose.stdout, /duplicate open-risk|Consolidate/i)

  const applied = runFde(sandbox, ['garden', '--apply'])
  assert.equal(applied.status, 0, applied.stderr)
  assert.match(applied.stdout, /retired|dedupe/i)
  const risks = fs.readFileSync(path.join(eng, 'risks.md'), 'utf8')
  assert.match(risks, /## Retired/i)
  const open = risks.split(/^##\s+Retired/im)[0]
  const openBullets = open.split('\n').filter(l => /^-\s*\[\d{4}-\d{2}-\d{2}\]/.test(l.trim()))
  assert.ok(openBullets.length < 4, `expected fewer open risks after dedupe, got ${openBullets.length}`)
})

test('tidy is the verb and garden still routes to it', () => {
  const sandbox = makeSandbox('tidy-alias')
  assert.equal(runFde(sandbox, ['resume', '--init', 'tidyco']).status, 0)
  const tidy = runFde(sandbox, ['tidy'])
  const garden = runFde(sandbox, ['garden'])
  assert.equal(tidy.status, 0, tidy.stderr)
  assert.equal(garden.status, 0, garden.stderr)
  assert.equal(tidy.stdout, garden.stdout)
  // An unknown verb prints usage and exits 1; the alias must not degrade to that.
  assert.doesNotMatch(tidy.stdout, /deterministic core of fdeops/)

  const help = runFde(sandbox, ['help'])
  assert.match(help.stdout, /fde tidy \[--apply\]/)
  // capture/preserve are hook-internal - listing them as verbs invited an FDE to
  // run a snapshot by hand and wonder why nothing happened.
  assert.doesNotMatch(help.stdout, /^\s+fde capture\s{2,}/m)
  assert.doesNotMatch(help.stdout, /^\s+fde preserve\s{2,}/m)
})

test('doctor requires operating map from plan onward; silent on discover', () => {
  const sandbox = makeSandbox('opmap-doctor')
  assert.equal(runFde(sandbox, ['resume', '--init', 'opmap']).status, 0)
  const eng = engagementPath(sandbox, 'opmap')
  assert.equal(runFde(sandbox, ['log', 'decision', 'descope reporting until audit']).status, 0)
  fs.writeFileSync(path.join(eng, 'success.md'), '# Success\nDone when: pilot signed.\n')
  fs.writeFileSync(
    path.join(eng, 'context.md'),
    '# Engagement context\n**Phase:** discover\n\n## Next action\n- map Friday exception\n'
  )
  fs.writeFileSync(path.join(eng, 'risks.md'), '# Risks\n')
  const discoverOk = runFde(sandbox, ['doctor'])
  assert.equal(discoverOk.status, 0, discoverOk.stdout + discoverOk.stderr)
  assert.doesNotMatch(discoverOk.stdout, /operating map/i)

  assert.equal(runFde(sandbox, ['log', 'phase', 'plan']).status, 0)
  fs.writeFileSync(
    path.join(eng, 'context.md'),
    '# Engagement context\n**Phase:** plan\n\n## Next action\n- sequence the parity slice\n'
  )
  const planMissing = runFde(sandbox, ['doctor'])
  assert.notEqual(planMissing.status, 0)
  assert.match(planMissing.stdout, /operating map/i)

  fillOperatingMap(eng)
  const planOk = runFde(sandbox, ['doctor'])
  assert.equal(planOk.status, 0, planOk.stdout + planOk.stderr)
})

test('doctor flags stakeholder identity forks (Denise vs Denise Chen)', () => {
  const sandbox = makeSandbox('alias-doctor')
  assert.equal(runFde(sandbox, ['resume', '--init', 'aliasco']).status, 0)
  const eng = engagementPath(sandbox, 'aliasco')
  assert.equal(runFde(sandbox, ['log', 'decision', 'descope reporting until audit']).status, 0)
  assert.equal(runFde(sandbox, ['log', 'phase', 'discover']).status, 0)
  fs.writeFileSync(path.join(eng, 'success.md'), '# Success\nDone when: pilot signed.\n')
  fs.writeFileSync(
    path.join(eng, 'context.md'),
    '# Engagement context\n**Phase:** discover\n\n## Next action\n- confirm Denise channel\n'
  )
  fs.writeFileSync(path.join(eng, 'risks.md'), '# Risks\n')
  const today = new Date().toISOString().slice(0, 10)
  fs.writeFileSync(
    path.join(eng, 'stakeholders.md'),
    [
      '# Stakeholders',
      '| Name | Role | Stance | Notes |',
      '|------|------|--------|-------|',
      '| Denise Chen | sponsor | champion | |',
      '| Denise | AP lead | neutral | |',
      '',
      '## Signal history',
      `- [${today}] [signal:amber] Denise went quiet after board`,
      '',
    ].join('\n')
  )
  const doctor = runFde(sandbox, ['doctor'])
  assert.notEqual(doctor.status, 0)
  assert.match(doctor.stdout, /stakeholder identity|Denise/i)

  fs.writeFileSync(
    path.join(eng, 'stakeholders.md'),
    [
      '# Stakeholders',
      '| Name | Role | Stance | Notes |',
      '|------|------|--------|-------|',
      '| Denise Chen | sponsor | champion | also AP lead |',
      '',
      '## Signal history',
      `- [${today}] [signal:amber] Denise Chen went quiet after board`,
      '',
    ].join('\n')
  )
  const clean = runFde(sandbox, ['doctor'])
  assert.equal(clean.status, 0, clean.stdout + clean.stderr)
})

test('ingest stage → propose → apply never writes .fde until confirm', () => {
  const sandbox = makeSandbox('ingest-sink')
  assert.equal(runFde(sandbox, ['resume', '--init', 'ingestco']).status, 0)
  const eng = engagementPath(sandbox, 'ingestco')
  const inbox = path.join(sandbox.home, 'fde-engagements', 'ingestco', '.inbox')
  const notes = path.join(sandbox.workspace, 'call.md')
  fs.writeFileSync(
    notes,
    [
      'decision: agreed to descope reporting until audit - Denise',
      'Denise went quiet after the board review',
      'next: send one-pager before Thursday',
    ].join('\n')
  )

  const stage = runFde(sandbox, ['ingest', 'stage', '--source', 'granola', '--title', 'board prep', notes])
  assert.equal(stage.status, 0, stage.stderr)
  assert.match(stage.stdout, /staged →/)
  assert.match(stage.stdout, /does not write \.fde/)
  assert.equal(fs.existsSync(inbox), true)
  const staged = fs.readdirSync(inbox).filter(f => f.endsWith('.md'))
  assert.equal(staged.length, 1)
  assert.match(staged[0], /granola/)
  const decisionsBefore = fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8')

  const listed = runFde(sandbox, ['ingest', 'list'])
  assert.equal(listed.status, 0, listed.stderr)
  assert.match(listed.stdout, /INBOX|granola|board prep/i)

  const propose = runFde(sandbox, ['ingest', 'propose', staged[0]])
  assert.equal(propose.status, 0, propose.stderr)
  assert.match(propose.stdout, /INGEST PROPOSE|via:granola/)
  assert.equal(fs.existsSync(path.join(eng, '.debrief-propose')), true)
  assert.equal(fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8'), decisionsBefore)

  // Agent-shaped prefixes (simulate rewrite) then apply
  fs.writeFileSync(
    path.join(eng, '.debrief-propose'),
    [
      'via:granola board prep',
      'decision: agreed to descope reporting until audit - Denise',
      'contact: Denise went quiet after the board review [signal:amber]',
      'next: send one-pager before Thursday',
      '',
    ].join('\n')
  )
  const apply = runFde(sandbox, ['ingest', 'apply'])
  assert.equal(apply.status, 0, apply.stderr)
  assert.match(fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8'), /descope reporting/)
  assert.match(fs.readFileSync(path.join(eng, 'stakeholders.md'), 'utf8'), /\[signal:amber\].*Denise|Denise.*\[signal:amber\]/)
  assert.match(fs.readFileSync(path.join(eng, 'context.md'), 'utf8'), /one-pager/)
  assert.equal(fs.existsSync(path.join(eng, '.debrief-propose')), false)
  // raw staging preserved
  assert.equal(fs.readdirSync(inbox).length, 1)
})

test('propose previews never echo <private> content, and apply still seals it', () => {
  const sandbox = makeSandbox('propose-private')
  assert.equal(runFde(sandbox, ['resume', '--init', 'privco']).status, 0)
  const eng = engagementPath(sandbox, 'privco')
  const notes = path.join(sandbox.workspace, 'notes.md')
  fs.writeFileSync(notes, [
    'decision: use postgres for the pilot',
    '<private>',
    'Bank account for payout: 12345678',
    '</private>',
    '',
  ].join('\n'))

  const smart = runFde(sandbox, ['debrief', '--smart', notes])
  assert.equal(smart.status, 0, smart.stderr)
  assert.doesNotMatch(smart.stdout, /12345678/)
  assert.match(smart.stdout, /private - redacted/)
  // the agent-facing propose file holds no secret; the sidecar does, owner-only
  const proposeText = fs.readFileSync(path.join(eng, '.debrief-propose'), 'utf8')
  assert.doesNotMatch(proposeText, /12345678|<private>/)
  const sidecar = path.join(eng, '.debrief-private')
  assert.match(fs.readFileSync(sidecar, 'utf8'), /12345678/)
  assert.equal(fs.statSync(sidecar).mode & 0o777, 0o600)

  assert.equal(runFde(sandbox, ['debrief', '--apply']).status, 0)
  const context = fs.readFileSync(path.join(eng, 'context.md'), 'utf8')
  assert.match(context, /<private>[\s\S]*12345678[\s\S]*<\/private>/)
  assert.equal(fs.existsSync(sidecar), false)
  assert.doesNotMatch(runFde(sandbox, ['resume']).stdout, /12345678/)

  const stage = runFde(sandbox, ['ingest', 'stage', '--source', 'granola', '--title', 'payout', notes])
  assert.equal(stage.status, 0, stage.stderr)
  const staged = fs.readdirSync(path.join(path.dirname(eng), '.inbox')).filter(f => f.endsWith('.md'))
  const propose = runFde(sandbox, ['ingest', 'propose', staged[0]])
  assert.equal(propose.status, 0, propose.stderr)
  assert.doesNotMatch(propose.stdout, /12345678/)
  assert.match(propose.stdout, /private - redacted/)
  assert.doesNotMatch(fs.readFileSync(path.join(eng, '.debrief-propose'), 'utf8'), /12345678/)
})

test('routable lines inside a <private> block are sealed, never routed unsealed', () => {
  const sandbox = makeSandbox('private-routing')
  assert.equal(runFde(sandbox, ['resume', '--init', 'sealco']).status, 0)
  const eng = engagementPath(sandbox, 'sealco')
  const notes = path.join(sandbox.workspace, 'notes.md')
  fs.writeFileSync(notes, [
    'decision: ship the pilot in March',
    '<private>',
    'decision: pay the vendor via account 12345678',
    'risk: account 12345678 is exposed in the runbook',
    '</private>',
    '',
  ].join('\n'))

  const smart = runFde(sandbox, ['debrief', '--smart', notes])
  assert.equal(smart.status, 0, smart.stderr)
  assert.doesNotMatch(smart.stdout, /12345678/)
  assert.equal(runFde(sandbox, ['debrief', '--apply']).status, 0)

  // what the human approved is what got written: no unsealed decision/risk
  assert.doesNotMatch(fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8'), /12345678/)
  assert.doesNotMatch(fs.readFileSync(path.join(eng, 'risks.md'), 'utf8'), /12345678/)
  assert.match(fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8'), /ship the pilot in March/)
  assert.match(fs.readFileSync(path.join(eng, 'context.md'), 'utf8'), /<private>[\s\S]*12345678[\s\S]*<\/private>/)

  for (const cmd of [['resume'], ['resume', '--full'], ['triage'], ['prep'], ['status', '--all'], ['receipts', 'account'], ['garden'], ['doctor']]) {
    const out = runFde(sandbox, cmd)
    assert.doesNotMatch(out.stdout + out.stderr, /12345678/, `${cmd.join(' ')} leaked`)
  }
  const dash = runFde(sandbox, ['dashboard'])
  const html = (dash.stdout.match(/\S+\.html/) || [])[0]
  assert.ok(html, dash.stdout)
  assert.doesNotMatch(fs.readFileSync(html, 'utf8'), /12345678/)
})

test('a secret hidden in an HTML comment never reaches a preview or memory', () => {
  const sandbox = makeSandbox('private-comment')
  assert.equal(runFde(sandbox, ['resume', '--init', 'commentco']).status, 0)
  const eng = engagementPath(sandbox, 'commentco')
  const notes = path.join(sandbox.workspace, 'notes.md')
  fs.writeFileSync(notes, [
    'Decided: renew the support contract.',
    '<!-- Bank account for payout: 12345678 -->',
    '<!-- unterminated comment hiding 87654321',
    '',
  ].join('\n'))

  const smart = runFde(sandbox, ['debrief', '--smart', notes])
  assert.equal(smart.status, 0, smart.stderr)
  assert.doesNotMatch(smart.stdout, /12345678|87654321/)
  assert.doesNotMatch(fs.readFileSync(path.join(eng, '.debrief-propose'), 'utf8'), /12345678|87654321/)

  const dry = runFde(sandbox, ['debrief', '--dry-run'], { input: fs.readFileSync(notes, 'utf8') })
  assert.doesNotMatch(dry.stdout, /12345678|87654321/)

  assert.equal(runFde(sandbox, ['debrief', '--apply']).status, 0)
  for (const f of ['context.md', 'decisions.md', 'risks.md']) {
    assert.doesNotMatch(fs.readFileSync(path.join(eng, f), 'utf8'), /12345678|87654321/)
  }
  assert.match(fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8'), /renew the support contract/)
})

test('apply refuses when the sealed sidecar went missing instead of dropping it', () => {
  const sandbox = makeSandbox('sidecar-loss')
  assert.equal(runFde(sandbox, ['resume', '--init', 'lossco']).status, 0)
  const eng = engagementPath(sandbox, 'lossco')
  const notes = path.join(sandbox.workspace, 'notes.md')
  fs.writeFileSync(notes, [
    'decision: ship the pilot in March',
    '<private>',
    'Bank account for payout: 12345678',
    '</private>',
    '',
  ].join('\n'))

  assert.equal(runFde(sandbox, ['debrief', '--smart', notes]).status, 0)
  fs.unlinkSync(path.join(eng, '.debrief-private'))
  const apply = runFde(sandbox, ['debrief', '--apply'])
  assert.equal(apply.status, 1)
  assert.match(apply.stderr, /missing or unreadable/)
  assert.doesNotMatch(fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8'), /ship the pilot/)

  // a symlinked sidecar is refused without leaving an unbacked proposal behind
  const outside = path.join(sandbox.dir, 'outside.md')
  fs.writeFileSync(outside, 'untouched\n')
  fs.unlinkSync(path.join(eng, '.debrief-propose'))
  fs.symlinkSync(outside, path.join(eng, '.debrief-private'))
  const refused = runFde(sandbox, ['debrief', '--smart', notes])
  assert.equal(refused.status, 1)
  assert.match(refused.stderr, /symlink/)
  assert.equal(fs.readFileSync(outside, 'utf8'), 'untouched\n')
  assert.equal(fs.existsSync(path.join(eng, '.debrief-propose')), false)
  assert.equal(fs.existsSync(path.join(eng, '.debrief-private.lock')), false)
})

test('a stray <!-- already in memory does not hide later notes, and quoting the redaction marker still applies', () => {
  const sandbox = makeSandbox('comment-scope')
  assert.equal(runFde(sandbox, ['resume', '--init', 'scopeco']).status, 0)
  const eng = engagementPath(sandbox, 'scopeco')

  // stored memory: a dangling comment opener must not blank the rest of the file
  fs.appendFileSync(path.join(eng, 'context.md'), '\n- note with a stray <!-- opener\n- later visible note about rollout\n')
  const resume = runFde(sandbox, ['resume', '--full'])
  assert.match(resume.stdout, /later visible note about rollout/)

  // notes quoting "(private - redacted)" sealed nothing, so apply must not refuse
  const notes = path.join(sandbox.workspace, 'notes.md')
  fs.writeFileSync(notes, `decision: keep the audit trail\nresume printed (private - redacted) for that entry\n`)
  assert.equal(runFde(sandbox, ['debrief', '--smart', notes]).status, 0)
  const apply = runFde(sandbox, ['debrief', '--apply'])
  assert.equal(apply.status, 0, apply.stderr)
  assert.match(fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8'), /keep the audit trail/)
  assert.equal(fs.existsSync(path.join(eng, '.debrief-seal')), false)
})

test('an unclosed private note is balanced before storage and cannot swallow later notes', () => {
  const sandbox = makeSandbox('unclosed-seal')
  assert.equal(runFde(sandbox, ['resume', '--init', 'unclosedco']).status, 0)
  const eng = engagementPath(sandbox, 'unclosedco')
  const notes = path.join(sandbox.workspace, 'notes.md')
  fs.writeFileSync(notes, [
    'decision: ship the pilot in March',
    '<private>',
    'Bank account for payout: 12345678',
    '',
  ].join('\n'))

  assert.equal(runFde(sandbox, ['debrief', '--smart', notes]).status, 0)
  const sidecar = fs.readFileSync(path.join(eng, '.debrief-private'), 'utf8')
  assert.match(sidecar, /<\/private>/)
  assert.equal(fs.statSync(path.join(eng, '.debrief-private')).mode & 0o777, 0o600)
  assert.equal(runFde(sandbox, ['debrief', '--apply']).status, 0)
  assert.match(fs.readFileSync(path.join(eng, 'context.md'), 'utf8'), /12345678[\s\S]*<\/private>/)

  fs.writeFileSync(notes, [
    '<private>',
    'first secret 12345678',
    '<private>',
    'second secret 87654321',
    '',
  ].join('\n'))
  assert.equal(runFde(sandbox, ['debrief', notes]).status, 0)
  const ctx = fs.readFileSync(path.join(eng, 'context.md'), 'utf8')
  const tags = ctx.match(/<(\/)?private\b[^>]*>/gi) || []
  assert.equal(tags.filter(t => t.startsWith('</')).length, tags.length / 2, ctx)

  fs.writeFileSync(notes, 'later public note about the March rollout\n')
  assert.equal(runFde(sandbox, ['debrief', notes]).status, 0)
  const resume = runFde(sandbox, ['resume', '--full'])
  assert.doesNotMatch(resume.stdout, /12345678/)
  assert.match(resume.stdout, /later public note about the March rollout/)
})

test('near-miss <private> tags still seal instead of failing open', () => {
  const sandbox = makeSandbox('private-tags')
  assert.equal(runFde(sandbox, ['resume', '--init', 'tagco']).status, 0)
  const eng = engagementPath(sandbox, 'tagco')
  fs.appendFileSync(path.join(eng, 'context.md'), [
    '',
    '<private >',
    'trailing space opener 11111111',
    '</private>',
    '<private data-x="1">',
    'attribute opener 22222222',
    '</private >',
    '<private>',
    'outer <private>inner 33333333</private> still sealed 44444444',
    '</private>',
    '</private>',
    'stray closer keeps public text visible',
    '<private>',
    'unclosed to EOF 55555555',
    '',
  ].join('\n'))

  for (const cmd of [['resume'], ['resume', '--full'], ['prep'], ['triage']]) {
    const out = runFde(sandbox, cmd)
    assert.doesNotMatch(out.stdout + out.stderr, /11111111|22222222|33333333|44444444|55555555/, `${cmd.join(' ')} leaked`)
  }
  assert.match(runFde(sandbox, ['resume', '--full']).stdout, /stray closer keeps public text visible/)
})

test('ingest_propose over MCP keeps <private> content out of the model-facing result', async () => {
  const sandbox = makeSandbox('mcp-private')
  assert.equal(runFde(sandbox, ['resume', '--init', 'mcpco']).status, 0)
  const server = path.join(root, 'mcp', 'fdeops-ingest', 'server.js')
  const proc = spawn(process.execPath, [server], {
    cwd: root,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      HOME: sandbox.home,
      USERPROFILE: sandbox.home,
      FDEOPS_ENGAGEMENT: engagementPath(sandbox, 'mcpco'),
    },
  })
  const lines = []
  let buf = ''
  proc.stdout.on('data', (d) => {
    buf += d
    while (buf.includes('\n')) {
      const line = buf.slice(0, buf.indexOf('\n')).trim()
      buf = buf.slice(buf.indexOf('\n') + 1)
      if (line) lines.push(JSON.parse(line))
    }
  })
  const send = (msg) => proc.stdin.write(`${JSON.stringify(msg)}\n`)
  const waitFor = async (count) => {
    const deadline = Date.now() + 10000
    while (lines.length < count && Date.now() < deadline) await new Promise(r => setTimeout(r, 50))
  }

  send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } })
  send({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'ingest_stage',
      arguments: {
        source: 'granola',
        title: 'payout',
        content: 'decision: use postgres for the pilot\n<private>\nBank account for payout: 12345678\n</private>\n',
      },
    },
  })
  await waitFor(2)
  const stagedId = (JSON.stringify(lines[1]).match(/(\d{8}T\d{6}Z-granola-payout\.md)/) || [])[1]
  assert.ok(stagedId, `no staged id in ${JSON.stringify(lines[1])}`)

  send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'ingest_propose', arguments: { id: stagedId } } })
  await waitFor(3)
  proc.kill()

  assert.equal(lines.length, 3, `expected 3 replies, got ${JSON.stringify(lines)}`)
  const proposeText = lines[2].result.content.map(c => c.text).join('\n')
  assert.doesNotMatch(proposeText, /12345678/)
  assert.match(proposeText, /private - redacted/)
})

test('ingest MCP stage works via engagement argument without FDEOPS_ENGAGEMENT env', async () => {
  const sandbox = makeSandbox('mcp-eng-arg')
  assert.equal(runFde(sandbox, ['resume', '--init', 'engarg']).status, 0)
  const server = path.join(root, 'mcp', 'fdeops-ingest', 'server.js')
  const proc = spawn(process.execPath, [server], {
    cwd: root,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      HOME: sandbox.home,
      USERPROFILE: sandbox.home,
    },
  })
  const lines = []
  let buf = ''
  proc.stdout.on('data', (d) => {
    buf += d
    while (buf.includes('\n')) {
      const line = buf.slice(0, buf.indexOf('\n')).trim()
      buf = buf.slice(buf.indexOf('\n') + 1)
      if (line) lines.push(JSON.parse(line))
    }
  })
  const send = (msg) => proc.stdin.write(`${JSON.stringify(msg)}\n`)
  const waitFor = async (count) => {
    const deadline = Date.now() + 10000
    while (lines.length < count && Date.now() < deadline) await new Promise(r => setTimeout(r, 50))
  }

  send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } })
  send({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'ingest_stage',
      arguments: {
        source: 'slack',
        title: 'standup',
        engagement: engagementPath(sandbox, 'engarg'),
        content: 'decision: freeze scope until Friday\n',
      },
    },
  })
  await waitFor(2)
  proc.kill()
  assert.equal(lines.length, 2, `expected 2 replies, got ${JSON.stringify(lines)}`)
  assert.equal(lines[1].result.isError, undefined)
  const text = lines[1].result.content.map(c => c.text).join('\n')
  assert.match(text, /staged|inbox|standup/i)
  const inbox = path.join(sandbox.home, 'fde-engagements', 'engarg', '.inbox')
  const files = fs.readdirSync(inbox).filter(f => f.endsWith('.md'))
  assert.equal(files.length, 1)
})

test('ingest MCP server speaks newline-delimited stdio as the MCP transport requires', async () => {
  const server = path.join(root, 'mcp', 'fdeops-ingest', 'server.js')
  const proc = spawn(process.execPath, [server], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] })
  const lines = []
  let buf = ''
  proc.stdout.on('data', (d) => {
    buf += d
    while (buf.includes('\n')) {
      const line = buf.slice(0, buf.indexOf('\n')).trim()
      buf = buf.slice(buf.indexOf('\n') + 1)
      if (line) lines.push(JSON.parse(line))
    }
  })

  const send = (msg) => proc.stdin.write(`${JSON.stringify(msg)}\n`)
  send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } })
  send({ jsonrpc: '2.0', id: 2, method: 'tools/list' })

  const deadline = Date.now() + 8000
  while (lines.length < 2 && Date.now() < deadline) await new Promise(r => setTimeout(r, 50))
  proc.kill()

  assert.equal(lines.length, 2, `expected 2 newline-framed replies, got ${JSON.stringify(lines)}`)
  assert.equal(lines[0].result.serverInfo.name, 'fdeops-ingest')
  assert.deepEqual(
    lines[1].result.tools.map(t => t.name),
    ['ingest_stage', 'ingest_list', 'ingest_propose', 'ingest_apply']
  )
})

test('a typo\'d fdeops subcommand errors instead of silently installing', () => {
  const sandbox = makeSandbox('typo')
  for (const typo of ['dmeo', 'dashbord', 'instal', 'nonsense']) {
    const r = runInstall(sandbox, [typo])
    assert.equal(r.status, 1, `${typo} should fail: ${r.stdout}`)
    assert.match(r.stderr, new RegExp(`unknown command '${typo}'`))
    assert.equal(
      fs.existsSync(path.join(sandbox.home, '.claude', 'skills', 'fde')),
      false,
      `${typo} must not write ~/.claude`
    )
  }
  // Case is a typo too, not a request to rewrite the home directory.
  const upper = runInstall(sandbox, ['Demo', '--clean'])
  assert.equal(upper.status, 0, upper.stderr)
  assert.match(upper.stdout, /real engagements .* were not touched/)
  assert.equal(fs.existsSync(path.join(sandbox.home, '.claude', 'skills', 'fde')), false)

  // Asking a question is not consent to write to the home directory either.
  for (const flag of ['--help', '-h', '--version', '-v']) {
    const r = runInstall(sandbox, [flag])
    const expected = /version/.test(flag) || flag === '-v' ? /^\d+\.\d+\.\d+/ : /fde /
    assert.match(r.stdout, expected, `${flag} should answer, not install: ${r.stdout}`)
    assert.equal(
      fs.existsSync(path.join(sandbox.home, '.claude', 'skills', 'fde')),
      false,
      `${flag} must not write ~/.claude`
    )
  }

  // Bare invocation still installs.
  assert.equal(runInstall(sandbox, []).status, 0)
  assert.ok(fs.existsSync(path.join(sandbox.home, '.claude', 'skills', 'fde')))
})

test('a flag before the verb does not corrupt the argument the CLI receives', () => {
  const sandbox = makeSandbox('argvorder')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  assert.equal(runFde(sandbox, ['log', 'decision', 'rotate vaultkey9 before ship']).status, 0)

  const plain = runInstall(sandbox, ['redact', 'vaultkey9'], { cwd: sandbox.workspace })
  const flagFirst = runInstall(sandbox, ['--force', 'redact', 'vaultkey9'], { cwd: sandbox.workspace })
  assert.match(plain.stdout, /1 matching line\(s\) for "vaultkey9"/)
  assert.equal(flagFirst.stdout, plain.stdout, 'a leading flag changed which term was searched')

  // A command's own flag typed before the command is not silently dropped.
  const misplaced = runInstall(sandbox, ['--all', 'status'], { cwd: sandbox.workspace })
  assert.equal(misplaced.status, 1)
  assert.match(misplaced.stderr, /unknown option '--all' before 'status'/)

  // Flags after the verb still reach the command.
  const all = runInstall(sandbox, ['status', '--all'], { cwd: sandbox.workspace })
  assert.equal(all.status, 0, all.stderr)
  assert.notEqual(all.stdout, runInstall(sandbox, ['status'], { cwd: sandbox.workspace }).stdout)
})

test('the fieldbook LOG shows one row per logged contact, not one per storage location', () => {
  const sandbox = makeSandbox('logdedup')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  assert.equal(runFde(sandbox, ['log', 'contact', 'Denise saw the demo', '--signal', 'green']).status, 0)
  assert.equal(runFde(sandbox, ['log', 'contact', 'Marco confirmed scope', '--signal', 'amber']).status, 0)

  const eng = engagementPath(sandbox, 'acme')
  // The CLI records each contact twice on purpose (markdown + .signal-ledger).
  assert.match(fs.readFileSync(path.join(eng, '.signal-ledger'), 'utf8'), /Denise saw the demo/)

  assert.equal(runFde(sandbox, ['dashboard']).status, 0)
  const html = fs.readFileSync(path.join(sandbox.home, 'fde-engagements', 'fieldbook-current.html'), 'utf8')
  const logRows = html.match(/<span class="fb-log-text">[^<]*<\/span>/g) || []
  const rowsFor = text => logRows.filter(r => r.includes(text)).length
  assert.equal(rowsFor('Denise saw the demo'), 1, `LOG rows: ${logRows.join(' | ')}`)
  assert.equal(rowsFor('Marco confirmed scope'), 1, `LOG rows: ${logRows.join(' | ')}`)

  // Same note, same day, escalating signal: an event, not a duplicate.
  assert.equal(runFde(sandbox, ['log', 'contact', 'Marco confirmed scope', '--signal', 'red']).status, 0)
  assert.equal(runFde(sandbox, ['dashboard']).status, 0)
  const after = fs.readFileSync(path.join(sandbox.home, 'fde-engagements', 'fieldbook-current.html'), 'utf8')
  const afterRows = (after.match(/<span class="fb-log-text">[^<]*<\/span>/g) || [])
  assert.equal(afterRows.filter(r => r.includes('Marco confirmed scope')).length, 2, `LOG rows: ${afterRows.join(' | ')}`)
  // …and the two rows are distinguishable, or they read as a double write.
  assert.match(after, /fb-log-sig t-amber/)
  assert.match(after, /fb-log-sig t-red/)
})

test('doctor flags unbalanced <private> markers, which change what is public', () => {
  const sandbox = makeSandbox('privbalance')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  // Doctor stays quiet on an untouched day-1 template; give it real work first.
  assert.equal(runFde(sandbox, ['log', 'decision', 'ship the retry slice']).status, 0)
  const eng = engagementPath(sandbox, 'acme')

  const stray = path.join(eng, 'context.md')
  fs.appendFileSync(stray, '\n</private>\nrate card is 1800/day\n')
  const opener = path.join(eng, 'risks.md')
  fs.appendFileSync(opener, '\n<private>\nsponsor is being replaced\n')

  const doc = runFde(sandbox, ['doctor'])
  assert.match(doc.stdout, /context\.md has 1 unmatched <\/private>/)
  assert.match(doc.stdout, /risks\.md has 1 unclosed <private>/)
  // Doctor reports the imbalance, never the sealed text.
  assert.doesNotMatch(doc.stdout, /sponsor is being replaced/)
})

test('an unresolvable FDEOPS_ENGAGEMENT refuses instead of routing the note elsewhere', () => {
  const sandbox = makeSandbox('envrefuse')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  const acme = engagementPath(sandbox, 'acme')

  const write = runFde(sandbox, ['log', 'decision', 'meant for another client'], {
    env: { FDEOPS_ENGAGEMENT: 'acmee' },
  })
  assert.equal(write.status, 2, write.stdout + write.stderr)
  assert.match(write.stderr, /FDEOPS_ENGAGEMENT is set to "acmee"/)
  assert.match(write.stderr, /refusing to fall back/)
  assert.doesNotMatch(fs.readFileSync(path.join(acme, 'decisions.md'), 'utf8'), /meant for another client/)

  // Reads refuse too - a stale override must not print another client's memory.
  const read = runFde(sandbox, ['resume'], { env: { FDEOPS_ENGAGEMENT: 'acmee' } })
  assert.equal(read.status, 2, read.stdout + read.stderr)
  assert.match(read.stderr, /FDEOPS_ENGAGEMENT is set to "acmee"/)
})

test('FDEOPS_ENGAGEMENT accepts a bare slug and the engagement folder itself', () => {
  const sandbox = makeSandbox('envslug')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  const acme = engagementPath(sandbox, 'acme')
  const engFolder = path.dirname(acme)

  assert.equal(runFde(sandbox, ['log', 'decision', 'logged by slug'], {
    env: { FDEOPS_ENGAGEMENT: 'Acme' },
  }).status, 0)
  // Pointing at the folder instead of its .fde must not fork a second memory.
  assert.equal(runFde(sandbox, ['log', 'decision', 'logged by folder'], {
    env: { FDEOPS_ENGAGEMENT: engFolder },
  }).status, 0)

  const decisions = fs.readFileSync(path.join(acme, 'decisions.md'), 'utf8')
  assert.match(decisions, /logged by slug/)
  assert.match(decisions, /logged by folder/)
  assert.equal(fs.existsSync(path.join(engFolder, 'decisions.md')), false)
})

test('a corrupt .registry line is reported, not silently turned into a bad binding', () => {
  const sandbox = makeSandbox('regcorrupt')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  const registry = path.join(sandbox.home, 'fde-engagements', '.registry')
  const good = fs.readFileSync(registry, 'utf8')
  fs.writeFileSync(registry, `garbage-with-no-space\n${good}`)

  const resume = runFde(sandbox, ['resume'])
  assert.equal(resume.status, 0, resume.stderr)
  assert.match(resume.stderr, /1 unreadable line\(s\)/)
  // The valid binding beneath the junk still resolves.
  assert.match(resume.stdout, /TRIAGE/)

  // Re-binding rewrites the registry without the unparseable line.
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  assert.doesNotMatch(fs.readFileSync(registry, 'utf8'), /garbage-with-no-space/)
})

test('doctor flags a memory file that is a directory or a symlink', () => {
  const sandbox = makeSandbox('doctorfileshape')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  const eng = engagementPath(sandbox, 'acme')

  fs.unlinkSync(path.join(eng, 'decisions.md'))
  fs.mkdirSync(path.join(eng, 'decisions.md'))
  const outside = path.join(sandbox.dir, 'outside.md')
  fs.writeFileSync(outside, 'outside\n')
  fs.unlinkSync(path.join(eng, 'risks.md'))
  fs.symlinkSync(outside, path.join(eng, 'risks.md'))

  const doc = runFde(sandbox, ['doctor'])
  assert.equal(doc.status, 1, doc.stdout)
  assert.match(doc.stdout, /decisions\.md is not a regular file/)
  assert.match(doc.stdout, /risks\.md is a symlink/)
})

// --- the hooks layer must refuse exactly like the CLI ---------------------
// These run the real bash hooks: they resolve the engagement themselves, so a
// fix in bin/fde.js alone leaves the unattended path misrouting.
test('hooks refuse an unresolvable FDEOPS_ENGAGEMENT instead of using the bound engagement', () => {
  const sandbox = makeSandbox('hookrefuse')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Client B']).status, 0)
  const bound = engagementPath(sandbox, 'client-b')
  fs.appendFileSync(path.join(bound, 'context.md'), '\nclient-b-secret-context\n')
  const before = fs.readdirSync(bound).map(f => {
    const abs = path.join(bound, f)
    return `${f}:${fs.statSync(abs).isFile() ? fs.readFileSync(abs, 'utf8') : 'dir'}`
  }).join('\n')

  for (const hook of ['session-start', 'session-stop', 'pre-compact']) {
    const res = runHook(sandbox, hook, { env: { FDEOPS_ENGAGEMENT: 'client-zzz' } })
    assert.equal(res.status, 0, `${hook}: ${res.stderr}`)
    assert.doesNotMatch(res.stdout, /client-b-secret-context/, `${hook} leaked the wrong client`)
  }

  const after = fs.readdirSync(bound).map(f => {
    const abs = path.join(bound, f)
    return `${f}:${fs.statSync(abs).isFile() ? fs.readFileSync(abs, 'utf8') : 'dir'}`
  }).join('\n')
  assert.equal(after, before, 'a hook wrote into an engagement the operator did not name')
})

test('hooks honor a bare slug, so the refusal does not cost the normal path', () => {
  const sandbox = makeSandbox('hookslug')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  const eng = engagementPath(sandbox, 'acme')
  fs.appendFileSync(path.join(eng, 'context.md'), '\nacme-context-marker\n')

  const res = runHook(sandbox, 'session-start', { env: { FDEOPS_ENGAGEMENT: 'Acme' }, cwd: sandbox.dir })
  assert.equal(res.status, 0, res.stderr)
  assert.match(res.stdout, /acme-context-marker/)
})

test('a relative FDEOPS_ENGAGEMENT is refused rather than resolved against the cwd', () => {
  const sandbox = makeSandbox('envrelative')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  const nested = path.join(sandbox.workspace, 'src')
  fs.mkdirSync(nested)

  const res = runFde(sandbox, ['log', 'decision', 'relative override'], {
    cwd: nested,
    env: { FDEOPS_ENGAGEMENT: '..' },
  })
  assert.equal(res.status, 2, res.stdout + res.stderr)
  assert.match(res.stderr, /must be an absolute path or a bare engagement slug/)
  assert.equal(fs.existsSync(path.join(sandbox.workspace, '.fde')), false)
  assert.doesNotMatch(fs.readFileSync(path.join(engagementPath(sandbox, 'acme'), 'decisions.md'), 'utf8'), /relative override/)
})

test('a fifo in a memory slot is reported, not opened - the CLI never hangs', () => {
  const sandbox = makeSandbox('fifoslot')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  const eng = engagementPath(sandbox, 'acme')
  fs.unlinkSync(path.join(eng, 'decisions.md'))
  const mk = spawnSync('mkfifo', [path.join(eng, 'decisions.md')], { encoding: 'utf8' })
  if (mk.status !== 0) return // no mkfifo on this platform

  const doc = runFde(sandbox, ['doctor'])
  assert.equal(doc.status, 1, doc.stdout + doc.stderr)
  assert.match(doc.stdout, /decisions\.md is not a regular file/)
  const resume = runFde(sandbox, ['resume'])
  assert.equal(resume.status, 0, resume.stderr)
})

test('resume --init fails loudly when the workspace cannot be bound', () => {
  const sandbox = makeSandbox('bindfail')
  const registry = path.join(sandbox.home, 'fde-engagements', '.registry')
  fs.mkdirSync(path.dirname(registry), { recursive: true })
  fs.mkdirSync(registry) // a directory where the registry belongs: unwritable

  const res = runFde(sandbox, ['resume', '--init', 'Acme'])
  assert.equal(res.status, 1, res.stdout + res.stderr)
  assert.match(res.stderr, /\.registry/)
  // never "ready and bound" when nothing was bound
  assert.doesNotMatch(res.stdout, /bound to workspace/)
})

test('resume --init does not report a bind it could not make through a symlinked registry', () => {
  const sandbox = makeSandbox('bindsymlink')
  const root = path.join(sandbox.home, 'fde-engagements')
  fs.mkdirSync(root, { recursive: true })
  fs.symlinkSync(path.join(sandbox.dir, 'elsewhere-registry'), path.join(root, '.registry'))

  const res = runFde(sandbox, ['resume', '--init', 'Acme'])
  assert.notEqual(res.status, 0, res.stdout + res.stderr)
  assert.doesNotMatch(res.stdout, /bound to workspace/)
  assert.equal(fs.existsSync(path.join(sandbox.dir, 'elsewhere-registry')), false)
})

test('a value that slugifies to nothing names nothing - never the "engagement" slug', () => {
  const sandbox = makeSandbox('slugfallback')
  // slugify() defaults to the literal "engagement"; make that a real client.
  assert.equal(runFde(sandbox, ['resume', '--init', 'Engagement']).status, 0)
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  const decoy = engagementPath(sandbox, 'engagement')
  const before = fs.readFileSync(path.join(decoy, 'decisions.md'), 'utf8')

  for (const value of ['???', '---', '@@@@']) {
    const write = runFde(sandbox, ['log', 'decision', 'slug-fallback needle'], { env: { FDEOPS_ENGAGEMENT: value } })
    assert.equal(write.status, 2, `${value}: ${write.stdout + write.stderr}`)
    assert.match(write.stderr, /which is not an engagement name/)
    const read = runFde(sandbox, ['resume'], { env: { FDEOPS_ENGAGEMENT: value } })
    assert.equal(read.status, 2, read.stdout)
  }
  assert.equal(fs.readFileSync(path.join(decoy, 'decisions.md'), 'utf8'), before)
})

test('a fifo in any memory slot is refused, not opened - reads and writes both', () => {
  const sandbox = makeSandbox('fifoslots')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  const eng = engagementPath(sandbox, 'acme')
  const slot = path.join(eng, 'stakeholders.md')
  fs.unlinkSync(slot)
  if (spawnSync('mkfifo', [slot], { encoding: 'utf8' }).status !== 0) return

  // status/triage/doctor read stakeholders.md outside readEng() - they used to hang.
  for (const verb of ['doctor', 'resume', 'triage', 'status']) {
    const res = runFde(sandbox, [verb], { env: { FDEOPS_ENGAGEMENT: 'acme' } })
    assert.notEqual(res.status, null, `${verb} timed out on a fifo`)
  }
  const doc = runFde(sandbox, ['doctor'], { env: { FDEOPS_ENGAGEMENT: 'acme' } })
  assert.match(doc.stdout, /stakeholders\.md is not a regular file/)

  const target = path.join(eng, 'decisions.md')
  fs.unlinkSync(target)
  spawnSync('mkfifo', [target])
  const write = runFde(sandbox, ['log', 'decision', 'fifo write'], { env: { FDEOPS_ENGAGEMENT: 'acme' } })
  assert.equal(write.status, 1, write.stdout + write.stderr)
  assert.match(write.stderr + write.stdout, /decisions\.md is not a regular file/)
})

test('a fifo .registry does not hang resume --init, and the lock is never left behind', () => {
  const sandbox = makeSandbox('fiforegistry')
  const root = path.join(sandbox.home, 'fde-engagements')
  fs.mkdirSync(root, { recursive: true })
  if (spawnSync('mkfifo', [path.join(root, '.registry')], { encoding: 'utf8' }).status !== 0) return

  const res = runFde(sandbox, ['resume', '--init', 'Acme'])
  assert.equal(res.status, 1, res.stdout + res.stderr)
  assert.match(res.stderr, /could not bind this workspace/)
  assert.equal(fs.existsSync(path.join(root, '.registry.lock')), false)
})

test('an unbindable .registry always explains itself and leaves no lock', () => {
  for (const shape of ['symlink', 'directory']) {
    const sandbox = makeSandbox(`bindshape-${shape}`)
    const root = path.join(sandbox.home, 'fde-engagements')
    fs.mkdirSync(root, { recursive: true })
    const registry = path.join(root, '.registry')
    if (shape === 'symlink') fs.symlinkSync(path.join(sandbox.dir, 'elsewhere'), registry)
    else fs.mkdirSync(registry)

    const res = runFde(sandbox, ['resume', '--init', 'Acme'])
    assert.equal(res.status, 1, `${shape}: ${res.stdout + res.stderr}`)
    assert.match(res.stderr, /could not bind this workspace/)
    assert.match(res.stderr, /export FDEOPS_ENGAGEMENT=/)
    assert.equal(fs.existsSync(registry + '.lock'), false, `${shape} left a stale lock`)
    assert.equal(fs.existsSync(path.join(sandbox.dir, 'elsewhere')), false)
  }
})

test('a whitespace-only FDEOPS_ENGAGEMENT refuses instead of using the workspace binding', () => {
  const sandbox = makeSandbox('envwhitespace')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Client B']).status, 0)
  const bound = engagementPath(sandbox, 'client-b')
  const before = fs.readFileSync(path.join(bound, 'decisions.md'), 'utf8')

  const res = runFde(sandbox, ['log', 'decision', 'whitespace needle'], { env: { FDEOPS_ENGAGEMENT: '   ' } })
  assert.equal(res.status, 2, res.stdout + res.stderr)
  assert.match(res.stderr, /set to whitespace/)
  assert.equal(fs.readFileSync(path.join(bound, 'decisions.md'), 'utf8'), before)
})

// ---------- fde vault (derived Obsidian view) ----------

function vaultDir(sandbox, name = 'fde-vault') {
  return path.join(sandbox.home, name)
}

function readVault(sandbox, rel, name = 'fde-vault') {
  return fs.readFileSync(path.join(vaultDir(sandbox, name), rel), 'utf8')
}

test('vault renders the portfolio and every engagement, and never the private block', () => {
  const sandbox = makeSandbox('vault')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme Payments']).status, 0)
  runFde(sandbox, ['log', 'decision', 'keep the existing Stripe connector'])
  runFde(sandbox, ['log', 'contact', 'Priya sponsor still backing it', '--signal', 'green'])
  const eng = engagementPath(sandbox, 'acme-payments')
  fs.appendFileSync(path.join(eng, 'risks.md'), '\n<private>Tom is about to be managed out</private>\n')

  const second = path.join(sandbox.dir, 'ws2')
  fs.mkdirSync(second, { recursive: true })
  assert.equal(runFde(sandbox, ['resume', '--init', 'Beta Bank'], { cwd: second }).status, 0)

  const res = runFde(sandbox, ['vault'])
  assert.equal(res.status, 0, res.stdout + res.stderr)
  assert.match(res.stdout, /2 engagement\(s\)/)

  const portfolio = readVault(sandbox, 'Portfolio.md')
  assert.match(portfolio, /\[\[acme-payments\]\]/)
  assert.match(portfolio, /\[\[beta-bank\]\]/)

  const hub = readVault(sandbox, path.join('acme-payments', 'acme-payments.md'))
  assert.match(hub, /^---\nclient: "acme-payments"/)          // frontmatter only in the derived copy
  assert.match(hub, /\[\[acme-payments\/Decisions\|Decisions\]\]/)
  assert.match(hub, /keep the existing Stripe connector/)
  assert.match(readVault(sandbox, path.join('acme-payments', 'People', 'Priya.md')), /signal: "green"/)
  assert.ok(fs.existsSync(path.join(vaultDir(sandbox), 'Questions.md')))

  // the authoritative fieldbook stays plain markdown - no frontmatter, no wikilinks
  const source = fs.readFileSync(path.join(eng, 'decisions.md'), 'utf8')
  assert.equal(source.startsWith('---'), false)
  assert.equal(/\[\[/.test(source), false)

  for (const file of walkFiles(vaultDir(sandbox))) {
    const body = fs.readFileSync(file, 'utf8')
    assert.equal(/managed out/.test(body), false, `private text leaked into ${file}`)
  }
})

function walkFiles(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkFiles(p))
    else out.push(p)
  }
  return out
}

test('vault --redacted drops the political layer and its internal tokens', () => {
  const sandbox = makeSandbox('vaultredacted')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  runFde(sandbox, ['log', 'contact', 'Priya sponsor still backing it', '--signal', 'amber'])
  runFde(sandbox, ['log', 'decision', 'ship the reconciliation slice first'])

  const res = runFde(sandbox, ['vault', '--redacted'])
  assert.equal(res.status, 0, res.stdout + res.stderr)
  const out = vaultDir(sandbox, 'fde-vault-redacted')
  assert.ok(fs.existsSync(out))
  assert.equal(fs.existsSync(path.join(out, 'acme', 'Stakeholders.md')), false)
  assert.equal(fs.existsSync(path.join(out, 'acme', 'Trust profile.md')), false)
  assert.equal(fs.existsSync(path.join(out, 'acme', 'People')), false)

  const hub = fs.readFileSync(path.join(out, 'acme', 'acme.md'), 'utf8')
  assert.match(hub, /ship the reconciliation slice first/)
  assert.equal(/Priya/.test(hub), false)
  assert.equal(/trust:/.test(hub), false)
  assert.equal(/\[signal:/.test(hub), false)
  assert.equal(/\[@/.test(hub), false)
  assert.equal(/amber/.test(fs.readFileSync(path.join(out, 'Portfolio.md'), 'utf8')), false)
})

test('vault is disposable: identical on a rerun, and a dropped engagement disappears', () => {
  const sandbox = makeSandbox('vaultrebuild')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  const second = path.join(sandbox.dir, 'ws2')
  fs.mkdirSync(second, { recursive: true })
  assert.equal(runFde(sandbox, ['resume', '--init', 'Gone'], { cwd: second }).status, 0)

  assert.equal(runFde(sandbox, ['vault']).status, 0)
  const first = walkFiles(vaultDir(sandbox)).map(f => f + '\n' + fs.readFileSync(f, 'utf8')).join('\n')
  assert.equal(runFde(sandbox, ['vault']).status, 0)
  const again = walkFiles(vaultDir(sandbox)).map(f => f + '\n' + fs.readFileSync(f, 'utf8')).join('\n')
  assert.equal(again, first, 'vault output is not deterministic')

  // A hand-typed note in the vault is not memory - the rebuild takes it away.
  fs.writeFileSync(path.join(vaultDir(sandbox), 'acme', 'scratch.md'), 'typed into the wrong place')
  fs.rmSync(path.join(sandbox.home, 'fde-engagements', 'gone'), { recursive: true, force: true })
  assert.equal(runFde(sandbox, ['vault']).status, 0)
  assert.equal(fs.existsSync(path.join(vaultDir(sandbox), 'acme', 'scratch.md')), false)
  assert.equal(fs.existsSync(path.join(vaultDir(sandbox), 'gone')), false)
  assert.equal(/\[\[gone\]\]/.test(readVault(sandbox, 'Portfolio.md')), false)
})

test('vault refuses any target it would be wrong to delete', () => {
  const sandbox = makeSandbox('vaultrefuse')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  const engRoot = path.join(sandbox.home, 'fde-engagements')

  const mine = path.join(sandbox.dir, 'my-notes')
  fs.mkdirSync(mine, { recursive: true })
  fs.writeFileSync(path.join(mine, 'notes.md'), 'ten years of notes')
  const link = path.join(sandbox.dir, 'link')
  fs.symlinkSync(mine, link)

  const cases = [
    [engRoot, /engagements root/],
    [sandbox.home, /deleted and rebuilt/],
    [engagementPath(sandbox, 'acme'), /inside a fieldbook/],
    [mine, /did not write/],
    [link, /symlink/],
  ]
  for (const [target, expected] of cases) {
    const res = runFde(sandbox, ['vault', '--out', target])
    assert.equal(res.status, 1, `${target} was not refused: ${res.stdout + res.stderr}`)
    assert.match(res.stderr, expected)
  }
  assert.equal(fs.readFileSync(path.join(mine, 'notes.md'), 'utf8'), 'ten years of notes')
  assert.equal(runFde(sandbox, ['vault', '--out']).status, 1)

  // a path with spaces is a path, not two arguments
  const spaced = path.join(sandbox.dir, 'my vault')
  assert.equal(runFde(sandbox, ['vault', '--out', spaced]).status, 0)
  assert.ok(fs.existsSync(path.join(spaced, 'Portfolio.md')))
  assert.ok(fs.existsSync(path.join(spaced, '.gitignore')))
})

test('an empty portfolio builds a vault that says so instead of failing', () => {
  const sandbox = makeSandbox('vaultempty')
  const res = runFde(sandbox, ['vault'])
  assert.equal(res.status, 0, res.stdout + res.stderr)
  assert.match(readVault(sandbox, 'Portfolio.md'), /No engagements yet/)
  assert.equal(runFde(sandbox, ['vault', '--current']).status, 2)
})

test('vault surfaces value promised with nobody named as accepting it', () => {
  const sandbox = makeSandbox('vaultquestions')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  const eng = engagementPath(sandbox, 'acme')
  const delivery = fs.readFileSync(path.join(eng, 'delivery.md'), 'utf8')
    .replace('|------|-------|--------|----------|----------|-------------|----------|----------|',
      '|------|-------|--------|----------|----------|-------------|----------|----------|\n' +
      '| 2026-08-27 | reconciliation | cost-save | 4h/week | 6h/week | pending | run log | flag |')
  fs.writeFileSync(path.join(eng, 'delivery.md'), delivery)

  assert.equal(runFde(sandbox, ['vault']).status, 0)
  const questions = readVault(sandbox, 'Questions.md')
  assert.match(questions, /Value promised but nobody accepted it[\s\S]*reconciliation/)
})

test('a redacted section page keeps its markdown structure (headings, table rows, blank lines)', () => {
  const sandbox = makeSandbox('vaultstructure')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  runFde(sandbox, ['log', 'delivery', 'reconciliation slice shipped'])
  const eng = engagementPath(sandbox, 'acme')
  const source = fs.readFileSync(path.join(eng, 'delivery.md'), 'utf8')

  assert.equal(runFde(sandbox, ['vault', '--redacted']).status, 0)
  const page = fs.readFileSync(path.join(sandbox.home, 'fde-vault-redacted', 'acme', 'Delivery.md'), 'utf8')
  const body = page.split(/\n---\n/).slice(1).join('\n---\n')

  // one heading per line, table rows intact, and the [@owner] token gone
  for (const heading of source.match(/^#{1,6} .*$/gm) || []) {
    assert.match(body, new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'), `heading collapsed: ${heading}`)
  }
  assert.match(body, /^\|------\|-------\|/m, 'table separator row collapsed')
  assert.match(body, /^- \[\d{4}-\d{2}-\d{2}\] reconciliation slice shipped$/m)
  assert.equal(/\[@/.test(body), false)
  assert.ok(body.includes('\n\n'), 'every blank line was collapsed away')
})

test('a redacted vault strips internal tokens from next action, brief and reality too', () => {
  const sandbox = makeSandbox('vaulttokens')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  const eng = engagementPath(sandbox, 'acme')
  fs.appendFileSync(path.join(eng, 'context.md'), '\n## Next action\n\nchase the sign-off [@alice] [signal:red]\n')
  fs.writeFileSync(path.join(eng, 'brief.md'), '# Brief\n\nreplace the batch job [signal:amber]\n')
  fs.writeFileSync(path.join(eng, 'reality.md'), '# Reality\n\n**Working theory:** the batch job is load-bearing [@bob]\n')

  assert.equal(runFde(sandbox, ['vault', '--redacted']).status, 0)
  const out = path.join(sandbox.home, 'fde-vault-redacted')
  for (const rel of ['Portfolio.md', path.join('acme', 'acme.md')]) {
    const body = fs.readFileSync(path.join(out, rel), 'utf8')
    assert.equal(/\[signal:/.test(body), false, `signal token leaked into ${rel}`)
    assert.equal(/\[@/.test(body), false, `owner token leaked into ${rel}`)
    assert.match(body, /chase the sign-off/)
  }
  const hub = fs.readFileSync(path.join(out, 'acme', 'acme.md'), 'utf8')
  assert.match(hub, /replace the batch job/)
  assert.match(hub, /the batch job is load-bearing/)

  // the full build keeps them - they are how the CLI reads its own memory
  assert.equal(runFde(sandbox, ['vault']).status, 0)
  assert.match(fs.readFileSync(path.join(sandbox.home, 'fde-vault', 'acme', 'acme.md'), 'utf8'), /\[@alice\]/)
})

test('a symlinked parent cannot smuggle the vault into the engagements root', () => {
  const sandbox = makeSandbox('vaultsymlinkparent')
  assert.equal(runFde(sandbox, ['resume', '--init', 'Acme']).status, 0)
  const engRoot = path.join(sandbox.home, 'fde-engagements')
  const link = path.join(sandbox.dir, 'link')
  fs.symlinkSync(engRoot, link)

  const res = runFde(sandbox, ['vault', '--out', path.join(link, 'newvault')])
  assert.equal(res.status, 1, res.stdout + res.stderr)
  assert.match(res.stderr, /engagements root/)
  assert.equal(fs.existsSync(path.join(engRoot, 'newvault')), false)

  const homeLink = path.join(sandbox.dir, 'homelink')
  fs.symlinkSync(sandbox.home, homeLink)
  const res2 = runFde(sandbox, ['vault', '--out', path.join(homeLink, '..', path.basename(sandbox.home))])
  assert.equal(res2.status, 1, res2.stdout + res2.stderr)
  assert.match(res2.stderr, /deleted and rebuilt|engagements root/)
})

test('signal key follows the person, not INCIDENT/recovery event words', () => {
  const sandbox = makeSandbox('signal-incident')
  assert.equal(runFde(sandbox, ['resume', '--init', 'incco']).status, 0)
  assert.equal(runFde(sandbox, [
    'log', 'contact',
    'INCIDENT: overnight AP batch failed, Marcus Hale escalated',
    '--signal', 'red',
  ]).status, 0)
  assert.equal(runFde(sandbox, [
    'log', 'contact',
    'recovery confirmed by Marcus Hale, batch green two nights running',
    '--signal', 'green',
  ]).status, 0)

  const prep = runFde(sandbox, ['prep'])
  assert.equal(prep.status, 0, prep.stderr)
  assert.match(prep.stdout, /Marcus/)
  assert.doesNotMatch(prep.stdout, /\[red\] INCIDENT/)
  assert.doesNotMatch(prep.stdout, /\[green\] recovery/)

  const status = runFde(sandbox, ['status'])
  assert.equal(status.status, 0, status.stderr)
  assert.doesNotMatch(status.stdout, /\[RED\s*\]/)
  assert.match(status.stdout, /\[green\s*\]/)
})

test('redact --apply commit subject does not contain the secret', () => {
  const sandbox = makeSandbox('redact-subject')
  assert.equal(runFde(sandbox, ['resume', '--init', 'redactlog']).status, 0)
  const eng = engagementPath(sandbox, 'redactlog')
  const secret = 'AKIAIOSFODNN7EXAMPLE'
  assert.equal(runFde(sandbox, ['log', 'decision', `leaked ${secret} into chat`, '--force']).status, 0)
  const applied = runFde(sandbox, ['redact', secret, '--apply'])
  assert.equal(applied.status, 0, applied.stderr)
  const log = gitInEng(eng, ['log', '--oneline', '-5'])
  assert.equal(log.status, 0, log.stderr)
  assert.doesNotMatch(log.stdout, new RegExp(secret))
  assert.doesNotMatch(log.stdout, /AKIA/)
  assert.match(log.stdout, /redact \d+ line/)
})

test('log refuses a postgres URL and an api_key assignment', () => {
  const sandbox = makeSandbox('secret-url')
  assert.equal(runFde(sandbox, ['resume', '--init', 'urlco']).status, 0)
  const pg = runFde(sandbox, ['log', 'decision', 'dsn postgresql://user:PASSWORD@db.internal:5432/app'])
  assert.notEqual(pg.status, 0)
  assert.match(pg.stderr, /refused/)
  const key = runFde(sandbox, ['log', 'risk', 'rotate api_key=not-an-openai-shape-but-still-a-secret'])
  assert.notEqual(key.status, 0)
  assert.match(key.stderr, /refused/)
})

test('dashboard does not render a schema-less reality.md as what is actually true', () => {
  const sandbox = makeSandbox('reality-schema')
  assert.equal(runFde(sandbox, ['resume', '--init', 'realco']).status, 0)
  const eng = engagementPath(sandbox, 'realco')
  fs.writeFileSync(path.join(eng, 'brief.md'), '# Brief\n**Stated problem:** build a dispatch dashboard\n')
  fs.writeFileSync(
    path.join(eng, 'reality.md'),
    '# Reality\n**Stated problem:** build a dispatch dashboard\nThe spreadsheet is still the system of record.\n'
  )
  const out = path.join(sandbox.dir, 'fieldbook.html')
  const dash = runFde(sandbox, ['dashboard', '--out', out])
  assert.equal(dash.status, 0, dash.stderr)
  const html = fs.readFileSync(out, 'utf8')
  assert.match(html, /UNREADABLE|does not match the schema/i)
  assert.match(html, /fb-why-missing/)
  assert.doesNotMatch(html, /fb-why-reality">/)
})

test('debrief --smart prints the prefix vocabulary before the preview', () => {
  const sandbox = makeSandbox('smart-vocab')
  assert.equal(runFde(sandbox, ['resume', '--init', 'vocabco']).status, 0)
  const notes = path.join(sandbox.dir, 'notes.md')
  fs.writeFileSync(notes, 'talked about the audit date\n')
  const smart = runFde(sandbox, ['debrief', '--smart', notes])
  assert.equal(smart.status, 0, smart.stderr)
  assert.match(smart.stdout, /decision:/)
  assert.match(smart.stdout, /risk:/)
  assert.match(smart.stdout, /delivery:/)
  assert.match(smart.stdout, /contact:/)
  assert.match(smart.stdout, /next:/)
})

test('log delivery with pipes writes a value-ledger row', () => {
  const sandbox = makeSandbox('log-ledger')
  assert.equal(runFde(sandbox, ['resume', '--init', 'ledco']).status, 0)
  const logged = runFde(sandbox, [
    'log', 'delivery',
    'retry slice | cost-save | 4h/week | 3.2h/week | Denise | Marco sheet | revert 412',
  ])
  assert.equal(logged.status, 0, logged.stderr)
  const eng = engagementPath(sandbox, 'ledco')
  const md = fs.readFileSync(path.join(eng, 'delivery.md'), 'utf8')
  assert.match(md, /retry slice/)
  assert.match(md, /cost-save/)
  assert.match(md, /Denise/)
  const section = md.split(/## Value ledger/)[1].split(/^## /m)[0]
  assert.match(section, /retry slice/)
})

test('log risk --retire moves the matching open risk under Retired', () => {
  const sandbox = makeSandbox('risk-retire')
  assert.equal(runFde(sandbox, ['resume', '--init', 'retco']).status, 0)
  assert.equal(runFde(sandbox, ['log', 'risk', 'cutover window still unsigned']).status, 0)
  const retired = runFde(sandbox, ['log', 'risk', '--retire', 'cutover window'])
  assert.equal(retired.status, 0, retired.stderr)
  const eng = engagementPath(sandbox, 'retco')
  const md = fs.readFileSync(path.join(eng, 'risks.md'), 'utf8')
  const open = md.split(/^##\s+Retired/m)[0]
  const rest = md.split(/^##\s+Retired/m)[1] || ''
  assert.doesNotMatch(open, /cutover window still unsigned/)
  assert.match(rest, /cutover window still unsigned/)
})

test('tidy proposes blessing handwritten dirty files', () => {
  const sandbox = makeSandbox('tidy-bless')
  assert.equal(runFde(sandbox, ['resume', '--init', 'blessco']).status, 0)
  const eng = engagementPath(sandbox, 'blessco')
  fs.appendFileSync(path.join(eng, 'brief.md'), '\nHand-written sponsor line.\n')
  const preview = runFde(sandbox, ['tidy'])
  assert.equal(preview.status, 0, preview.stderr)
  assert.match(preview.stdout, /bless|hand-written|brief\.md/i)
  assert.doesNotMatch(preview.stdout, /Nothing to tidy/)
  const applied = runFde(sandbox, ['tidy', '--apply'])
  assert.equal(applied.status, 0, applied.stderr)
  const dirty = gitInEng(eng, ['status', '--porcelain'])
  assert.equal(dirty.stdout.trim(), '')
})

test('status and dashboard consult doctor instead of ignoring it', () => {
  const sandbox = makeSandbox('doctor-consult')
  assert.equal(runFde(sandbox, ['resume', '--init', 'docco']).status, 0)
  const eng = engagementPath(sandbox, 'docco')
  assert.equal(runFde(sandbox, ['log', 'decision', 'descope reporting until audit']).status, 0)
  fs.writeFileSync(
    path.join(eng, 'context.md'),
    '# Engagement context\n**Phase:** ship\n\n## Next action\n- canary the parity fix\n'
  )
  const status = runFde(sandbox, ['status'])
  assert.match(status.stdout + status.stderr, /hygiene:|doctor|issue/i)
  const dash = runFde(sandbox, ['dashboard'])
  assert.match(dash.stdout + dash.stderr, /hygiene:|doctor|issue/i)
})
