const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { spawnSync } = require('node:child_process')
const cli = path.resolve(__dirname, '../bin/fde.js')

function fixture(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fde-review-path-')))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const home = path.join(dir, 'home'), workspace = path.join(dir, 'workspace')
  fs.mkdirSync(home); fs.mkdirSync(workspace)
  const env = { ...process.env, HOME: home, USERPROFILE: home, FDEOPS_ENGAGEMENTS_ROOT: path.join(dir, 'clients'), FDEOPS_ENGAGEMENT: '', FDEOS_ENGAGEMENT: '' }
  const run = (args, input) => spawnSync(process.execPath, [cli, ...args], { cwd: workspace, env, input, encoding: 'utf8' })
  assert.equal(run(['resume', '--init', 'acme']).status, 0)
  return { dir, env, run, eng: path.join(dir, 'clients/acme/.fde') }
}

test('messy intake shows asks, scope, explicit signer and gaps before applying an unaccepted record', t => {
  const f = fixture(t)
  const before = fs.readFileSync(path.join(f.eng, 'decisions.md'), 'utf8')
  const proposed = f.run(['debrief', '--smart'], [
    'We need reconciliation alerts before the audit. [source: meeting 2026-09-10]',
    'Proposed scope: alert on failed settlements; no connector rewrite. [source: meeting 2026-09-10]',
    'We agreed to replay failed settlements in staging. [source: meeting 2026-09-10]',
    'Priya Shah signs off on the acceptance test. [source: meeting 2026-09-10]',
    'Next action: obtain the runbook from Tom.',
    '<private>CONFIDENTIAL_INTAKE</private>',
  ].join('\n'))
  assert.equal(proposed.status, 0, proposed.stderr)
  for (const expected of ['REVIEW', 'stated asks:', 'proposed scope:', 'named signer', 'Priya Shah', 'next action:', 'measurement: missing', 'evidence: missing', 'customer approval: missing']) assert.ok(proposed.stdout.includes(expected), expected)
  assert.doesNotMatch(proposed.stdout, /CONFIDENTIAL_INTAKE/)
  assert.equal(fs.readFileSync(path.join(f.eng, 'decisions.md'), 'utf8'), before)
  const proposal = fs.readFileSync(path.join(f.eng, '.debrief-propose'), 'utf8')
  assert.match(proposal, /signer: Priya Shah \[source: meeting 2026-09-10\]/)
  assert.doesNotMatch(proposal, /\[approved:/)
  assert.equal(f.run(['debrief', '--apply']).status, 0)
  assert.match(fs.readFileSync(path.join(f.eng, 'success.md'), 'utf8'), /Priya Shah/)
  assert.match(fs.readFileSync(path.join(f.eng, 'context.md'), 'utf8'), /ask: We need reconciliation alerts/)
  assert.doesNotMatch(f.run(['status']).stdout, /accepted by/)
})

test('tentative signer question stays a question and creates no authority', t => {
  const f = fixture(t)
  const proposed = f.run(['debrief', '--smart'], 'Maybe Priya signs off? We need to ask her.\n')
  assert.equal(proposed.status, 0)
  assert.match(proposed.stdout, /named signer \(authority, not approval\): not stated/)
  assert.doesNotMatch(fs.readFileSync(path.join(f.eng, '.debrief-propose'), 'utf8'), /^signer:/m)
})

for (const done of ['Make reconciliation better.', 'Improve performance by 30%.', 'Pilot signed off.', 'Run the test and it works well.']) {
  test(`plan readiness rejects a vague done-definition: ${done}`, t => {
    const f = fixture(t)
    fs.writeFileSync(path.join(f.eng, 'context.md'), '# Context\n**Phase:** plan\n## Next action\n- review the acceptance test\n')
    fs.writeFileSync(path.join(f.eng, 'success.md'), `# Success\n**Done when:** ${done}\n**Stakeholder who signs off:** Priya Shah\n`)
    const doctor = f.run(['doctor'])
    assert.equal(doctor.status, 1)
    assert.match(doctor.stdout, /binary acceptance check/)
  })
}

for (const done of ['Replay a failed settlement; its alert arrives within 15 minutes.', 'Given a revoked token, the request rejects every attempt.']) {
  test(`observable acceptance check is recognized independently of numeric metrics: ${done}`, t => {
    const f = fixture(t)
    fs.writeFileSync(path.join(f.eng, 'context.md'), '# Context\n**Phase:** plan\n## Next action\n- review the acceptance test\n')
    fs.writeFileSync(path.join(f.eng, 'success.md'), `# Success\n**Done when:** ${done}\n**Stakeholder who signs off:** Priya Shah\n`)
    assert.doesNotMatch(f.run(['doctor']).stdout, /binary acceptance check|needs a named customer-side signer/)
    fs.writeFileSync(path.join(f.eng, 'success.md'), `# Success\n**Done when:** ${done}\n**Stakeholder who signs off:** Customer sponsor\n`)
    assert.match(f.run(['doctor']).stdout, /needs a named customer-side signer/)
  })
}

test('doctor distinguishes an automatically dated decision from a source-backed record', t => {
  const f = fixture(t)
  assert.equal(f.run(['log', 'decision', 'keep the existing connector']).status, 0)
  assert.match(f.run(['doctor']).stdout, /dated decision\(s\) remain CLAIM: source missing/)
  const decisions = path.join(f.eng, 'decisions.md')
  fs.appendFileSync(decisions, '- [2026-09-10] use replay test [source: meeting 2026-09-10]\n')
  assert.match(f.run(['doctor']).stdout, /1 dated decision\(s\) remain CLAIM/)
  fs.writeFileSync(decisions, fs.readFileSync(decisions, 'utf8').replace('keep the existing connector', 'keep the existing connector [source: transcript:kickoff-42]'))
  assert.doesNotMatch(f.run(['doctor']).stdout, /remain CLAIM: source missing/)
})

test('revised multiline acceptance and descriptive named authority remain usable', t => {
  const f = fixture(t)
  const example = fs.readFileSync(path.resolve(__dirname, '../examples/kesterman-freight/.fde/success.md'), 'utf8')
  fs.writeFileSync(path.join(f.eng, 'context.md'), '# Context\n**Phase:** plan\n## Next action\n- verify the board\n')
  fs.writeFileSync(path.join(f.eng, 'success.md'), example)
  assert.doesNotMatch(f.run(['doctor']).stdout, /binary acceptance check|needs a named customer-side signer/)
  fs.writeFileSync(path.join(f.eng, 'success.md'), example.replace('Denise Kowalczyk. Floor acceptance:', 'Denise Kowalczyk: customer-side signer. Floor acceptance:'))
  assert.doesNotMatch(f.run(['doctor']).stdout, /needs a named customer-side signer/)
})

test('multiline vague acceptance cannot borrow a metric from the next field', t => {
  const f = fixture(t)
  fs.writeFileSync(path.join(f.eng, 'context.md'), '# Context\n**Phase:** plan\n')
  fs.writeFileSync(path.join(f.eng, 'success.md'), '# Success\n**Done when (revised):**\n- Make the system better.\n**Baseline → target:** Replay matches the expected state within 5 minutes.\n**Stakeholder who signs off:** Priya Shah\n')
  assert.match(f.run(['doctor']).stdout, /binary acceptance check/)
})
