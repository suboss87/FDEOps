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
  assert.doesNotMatch(out, /## Routing - 6 domains/)
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

test('phase ship/close warns when open risks remain', () => {
  const sandbox = makeSandbox('phase-risk-warn')
  assert.equal(runFde(sandbox, ['resume', '--init', 'phasewarn']).status, 0)
  const eng = engagementPath(sandbox, 'phasewarn')
  fs.writeFileSync(path.join(eng, 'risks.md'), '# Risks\n- [2026-07-01] cutover window still unsigned\n')
  const phase = runFde(sandbox, ['log', 'phase', 'close'])
  assert.equal(phase.status, 0, phase.stderr)
  assert.match(phase.stderr, /open risk/i)
})
