const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
function check(t, body) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fde-ready-language-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const eng = path.join(root, '.fde'); fs.mkdirSync(eng)
  fs.writeFileSync(path.join(eng, 'success.md'), '# Success\n' + body + '\n**Stakeholder who signs off:** Priya Shah\n')
  return spawnSync(process.execPath, [path.resolve(__dirname, '../bin/fde.js'), 'doctor', '--ready'], { cwd: root, env: { ...process.env, HOME: root, FDEOPS_ENGAGEMENT: eng, FDEOPS_ENGAGEMENTS_ROOT: root }, encoding: 'utf8' }).stdout
}
for (const criterion of [
  '100 synthetic referrals produce zero incorrect routes in customer-operated staging, and median handling time is at most 5 minutes.',
  'Given a full month settlement replay in production, reconcile 100% of input and output totals with zero duplicate settlements within 5 minutes.',
]) test('readiness recognizes supplied measurable criterion: ' + criterion, t => {
  assert.doesNotMatch(check(t, '**Done when:** ' + criterion), /needs a binary acceptance check/)
})
test('explicit input and pass condition do not require preferred result verbs', t => {
  assert.doesNotMatch(check(t, '**Acceptance check:**\n- Input: one month of settlement records on staging\n- Pass when: zero duplicate settlements and 100% balanced totals'), /needs a binary acceptance check/)
})
for (const criterion of [
  '**Acceptance check:**\n- Input: unknown\n- Pass when: zero errors',
  '**Acceptance check:**\n- Input: one month of records\n- Pass when: better performance',
  '**Done when:** 100 customers are happy.',
]) test('incomplete or subjective criteria still need clarification: ' + criterion, t => {
  assert.match(check(t, criterion), /needs a binary acceptance check/)
})
