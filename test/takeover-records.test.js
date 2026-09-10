const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fde-takeover-'))
  const eng = path.join(root, '.fde'); fs.mkdirSync(eng)
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const write = (file, text) => fs.writeFileSync(path.join(eng, file), text)
  write('context.md', '# Context\n## Next action\nValidate shift recovery\n')
  write('success.md', '# Success\n**Stakeholder who signs off:** Lina Ortiz\n**Done when:** ten replay batches return zero missing serial numbers.\n')
  const run = args => spawnSync(process.execPath, [path.join(__dirname, '../bin/fde.js'), ...args], { cwd: root, env: { ...process.env, HOME: root, USERPROFILE: root, FDEOPS_ENGAGEMENT: eng, FDEOS_ENGAGEMENT: '', FDEOPS_ENGAGEMENTS_ROOT: root }, encoding: 'utf8' })
  return { write, run }
}
test('operational handoff survives bounded export and targeted recall without private content', t => {
  const f = fixture(t)
  f.write('handoff.md', '# Operations\nSERIAL_RESET_RECOVERY: stop scanner, restore checkpoint, verify next serial. Owner: Omar.\n<private>SECRET_RECOVERY</private>\n' + 'ordinary note\n'.repeat(3000))
  for (const args of [['handoff', '--max-bytes', '4096'], ['recall', 'SERIAL_RESET_RECOVERY', '--max-bytes', '4096']]) {
    const r = f.run(args); assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /SERIAL_RESET_RECOVERY/); assert.match(r.stdout, /Omar/)
    assert.doesNotMatch(r.stdout, /SECRET_RECOVERY/); assert.ok(Buffer.byteLength(r.stdout) <= 4096)
  }
})
test('inherited open risk bullets survive summaries while retired risks stay excluded', t => {
  const f = fixture(t)
  f.write('risks.md', '# Risks\n- Open: departed engineer alone knows reset recovery.\n* Night shift rollback has never been demonstrated.\n## Retired\n- Open: RETIRED_EXPOSURE\n')
  for (const args of [['resume'], ['handoff']]) {
    const r = f.run(args); assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /departed engineer alone knows reset recovery/)
    assert.match(r.stdout, /Night shift rollback has never been demonstrated/)
    assert.doesNotMatch(r.stdout, /RETIRED_EXPOSURE/)
  }
})
test('long receipts retain latest withdrawal and original assertion with explicit omissions', t => {
  const f = fixture(t)
  f.write('decisions.md', '# Decisions\n' + Array.from({ length: 250 }, (_, i) => `- [2026-08-01] rollout approved checkpoint ${i} [source: meeting 2026-08-01]\n`).join('') + '- [2026-09-10] rollout approval withdrawn [source: meeting 2026-09-10]\n')
  const r = f.run(['receipts', 'rollout']); assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /approval withdrawn/); assert.match(r.stdout, /checkpoint 0 /)
  assert.match(r.stdout, /selected|omitted/i); assert.ok(Buffer.byteLength(r.stdout) <= 16384)
})
