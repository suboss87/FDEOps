const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { spawnSync } = require('node:child_process')

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
