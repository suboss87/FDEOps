#!/usr/bin/env node
/**
 * Live CLI smoke for skill-routing happy paths.
 * Proves every documented happy verb actually works in a bound engagement.
 * Negatives stay agent-harness / human trials (see README).
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

const root = path.resolve(__dirname, '../..')
const fde = path.join(root, 'bin', 'fde.js')
const pack = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8'))

const smoke = fs.mkdtempSync(path.join(os.tmpdir(), 'fdeops-live-'))
const home = path.join(smoke, 'home')
const ws = path.join(smoke, 'ws')
fs.mkdirSync(home, { recursive: true })
fs.mkdirSync(ws, { recursive: true })

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd || ws,
    env: { ...process.env, HOME: home, USERPROFILE: home },
    encoding: 'utf8',
    input: opts.input,
  })
  return r
}

function fdeRun(args) {
  return sh(process.execPath, [fde, ...args])
}

let fail = 0
const results = []

function assert(id, ok, detail) {
  results.push({ id, ok, detail })
  console.log(`${ok ? '✔' : '✖'}  ${id}  ${detail}`)
  if (!ok) fail++
}

// workspace git
sh('git', ['init', '-q'])
fs.writeFileSync(path.join(ws, 'app.js'), 'module.exports=1\n')
sh('git', ['add', '.'])
sh('git', ['-c', 'user.email=fde@firm.com', '-c', 'user.name=FDE', 'commit', '-qm', 'init'])

assert('init', fdeRun(['resume', '--init', 'livesmoke']).status === 0, 'resume --init')

const eng = path.join(home, 'fde-engagements', 'livesmoke', '.fde')
fs.writeFileSync(path.join(eng, 'success.md'), '# Success\nDone when: pilot signed.\n')
fs.writeFileSync(
  path.join(eng, 'context.md'),
  '# Engagement context\n**Phase:** discover\n\n## Next action\n- confirm Denise\n\n## Notes\n'
)
assert('seed-decision', fdeRun(['log', 'decision', 'descope reporting until audit']).status === 0, 'log decision')
assert('seed-phase', fdeRun(['log', 'phase', 'discover']).status === 0, 'log phase')
assert(
  'seed-secret',
  fdeRun(['log', 'decision', 'rotate demo token sk-live-EXAMPLE later', '--force']).status === 0,
  'seed redact target'
)

const happy = pack.cases.filter(c => c.kind === 'happy')
for (const c of happy) {
  const verb = (c.expect.cli || [])[0]
  let r
  if (verb === 'debrief') {
    const notes = path.join(smoke, 'notes.txt')
    fs.writeFileSync(notes, 'We agreed to freeze reporting.\nRisk: no rollback.\nDenise quiet after board.\n')
    r = fdeRun(['debrief', '--smart', notes])
    if (r.status === 0) r = fdeRun(['debrief', '--apply'])
  } else if (verb === 'prep') {
    r = fdeRun(['prep', 'sponsor Denise'])
  } else if (verb === 'receipts') {
    r = fdeRun(['receipts', 'reporting'])
  } else if (verb === 'doctor') {
    r = fdeRun(['doctor'])
    // doctor exits 1 when issues remain — still a successful invoke
    assert(c.id, r.status === 0 || /FDE DOCTOR|issue/i.test(r.stdout + r.stderr), `fde doctor rc=${r.status}`)
    continue
  } else if (verb === 'scan') {
    r = fdeRun(['scan'])
  } else if (verb === 'status') {
    r = fdeRun(['status'])
  } else if (verb === 'log') {
    r = fdeRun(['log', 'contact', 'Denise went quiet after board prep', '--signal', 'amber'])
  } else if (verb === 'dashboard') {
    r = fdeRun(['dashboard', '--out', path.join(smoke, 'fb.html')])
  } else if (verb === 'resume') {
    r = fdeRun(['resume'])
  } else if (verb === 'redact') {
    r = fdeRun(['redact', 'sk-live'])
    if (r.status === 0) r = fdeRun(['redact', 'sk-live', '--apply'])
  } else {
    assert(c.id, false, `unknown verb ${verb}`)
    continue
  }
  assert(c.id, r.status === 0, `fde ${verb} rc=${r.status} ${(r.stderr || '').slice(0, 80)}`)
}

// fresh day-1 silent hygiene
const ws2 = path.join(smoke, 'ws2')
fs.mkdirSync(ws2)
sh('git', ['init', '-q'], { cwd: ws2 })
fs.writeFileSync(path.join(ws2, 'a.js'), '1\n')
sh('git', ['add', '.'], { cwd: ws2 })
sh('git', ['-c', 'user.email=a@b', '-c', 'user.name=a', 'commit', '-qm', 'i'], { cwd: ws2 })
const init2 = spawnSync(process.execPath, [fde, 'resume', '--init', 'freshday'], {
  cwd: ws2,
  env: { ...process.env, HOME: home, USERPROFILE: home },
  encoding: 'utf8',
})
const triage = spawnSync(process.execPath, [fde, 'triage'], {
  cwd: ws2,
  env: { ...process.env, HOME: home, USERPROFILE: home },
  encoding: 'utf8',
})
assert(
  'fresh-hygiene-silent',
  init2.status === 0 && triage.status === 0 && !/hygiene:/i.test(triage.stdout),
  /hygiene:/i.test(triage.stdout) ? 'hygiene leaked on day-1' : 'silent'
)

const out = path.join(__dirname, 'LAST_LIVE_SMOKE.md')
const body = [
  '# Last live CLI smoke',
  '',
  `Ran: ${new Date().toISOString()}`,
  `Sandbox: ${smoke}`,
  '',
  '| Case | Result | Detail |',
  '|------|--------|--------|',
  ...results.map(r => `| ${r.id} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.detail.replace(/\|/g, '/')} |`),
  '',
  fail ? `**FAIL:** ${fail} case(s)` : '**PASS:** all happy CLI outcomes + day-1 silent hygiene',
  '',
].join('\n')
fs.writeFileSync(out, body)

console.log('\n' + (fail ? `FAIL: ${fail}` : 'PASS: live CLI smoke'))
console.log(`wrote ${out}`)
process.exit(fail ? 1 : 0)
