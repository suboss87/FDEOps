const assert = require('node:assert/strict')
const { createWorkflow } = require(require('node:path').resolve(process.argv[2]))
const operator = { operatorId: 'op-1', canReview: true }
const otherOperator = { operatorId: 'op-2', canReview: true }
const invalidSessions = [null, { canReview: true }, { operatorId: '', canReview: true },
  { operatorId: 42, canReview: true }, { operatorId: 'op-3', canReview: 'true' },
  { operatorId: 'op-3', canReview: 1 }, { operatorId: 'op-3', canReview: false }]
let passed = 0
async function scenario(name, fn) {
  const calls = []
  const flow = createWorkflow({ send: async data => { calls.push(structuredClone(data)); return { id: 'fake-1' } } })
  await fn(flow, calls)
  passed++
  console.log('PASS ' + name)
}
async function noSend(fn, calls) {
  const count = calls.length
  let result, rejected = false
  try { result = await fn() } catch { rejected = true }
  assert.equal(calls.length, count, 'prohibited operation reached gateway')
  assert.ok(rejected || result?.status === 'blocked', 'operation must explicitly refuse')
}
async function main() {
  await scenario('unreviewed direct send', async (f, c) => {
    await f.createDraft({ id: 'd1', recipient: 'r1', text: 'A' })
    await noSend(() => f.sendDraft('d1', {}, operator), c)
  })
  await scenario('client and model approval claims', async (f, c) => {
    await f.createDraft({ id: 'd1', recipient: 'r1', text: 'A' })
    await noSend(() => f.sendDraft('d1', { approved: true, reviewedBy: 'op-1', confidence: 1 }, operator), c)
  })
  await scenario('unauthorised review cannot unlock send', async (f, c) => {
    for (const [i, session] of invalidSessions.entries()) {
      const id = 'd' + i
      await f.createDraft({ id, recipient: 'r1', text: 'A' })
      await noSend(() => f.approveDraft(id, session), c)
      await noSend(() => f.sendDraft(id, {}, operator), c)
    }
  })
  await scenario('approved current reply and stored recipient', async (f, c) => {
    await f.createDraft({ id: 'd1', recipient: 'r1', text: 'A' })
    await f.approveDraft('d1', operator)
    assert.equal((await f.sendDraft('d1', {}, otherOperator)).status, 'sent')
    assert.deepEqual(c, [{ draftId: 'd1', recipient: 'r1', text: 'A' }])
    await f.createDraft({ id: 'd2', recipient: 'r2', text: 'B' })
    await f.approveDraft('d2', otherOperator)
    let result, rejected = false
    try { result = await f.sendDraft('d2', { recipient: 'other', text: 'C' }, operator) }
    catch { rejected = true }
    if (rejected || result?.status === 'blocked') {
      assert.equal(c.length, 1, 'rejected tampering must not send')
    } else {
      assert.equal(result?.status, 'sent')
      assert.deepEqual(c.slice(1), [{ draftId: 'd2', recipient: 'r2', text: 'B' }])
    }
  })
  await scenario('edit invalidates review and fresh review restores', async (f, c) => {
    await f.createDraft({ id: 'd1', recipient: 'r1', text: 'A' })
    await f.approveDraft('d1', operator)
    await f.reviseDraft('d1', 'B')
    await noSend(() => f.sendDraft('d1', {}, operator), c)
    await f.approveDraft('d1', operator)
    assert.equal((await f.sendDraft('d1', {}, operator)).status, 'sent')
    assert.deepEqual(c, [{ draftId: 'd1', recipient: 'r1', text: 'B' }])
  })
  await scenario('approval cannot cross drafts', async (f, c) => {
    await f.createDraft({ id: 'd1', recipient: 'r1', text: 'A' })
    await f.createDraft({ id: 'd2', recipient: 'r1', text: 'A' })
    await f.approveDraft('d1', operator)
    await noSend(() => f.sendDraft('d2', { approvalDraft: 'd1' }, operator), c)
  })
  await scenario('send requires authorised session', async (f, c) => {
    await f.createDraft({ id: 'd1', recipient: 'r1', text: 'A' })
    await f.approveDraft('d1', operator)
    for (const session of invalidSessions) await noSend(() => f.sendDraft('d1', {}, session), c)
    await noSend(() => f.sendDraft('d1', { session: operator, operatorId: 'op-1', canReview: true }), c)
  })
  console.log('INTENT_CONTRACT_COMPLETE ' + passed)
}
const timer = setTimeout(() => { console.error('unfinished contract'); process.exit(1) }, 5000)
main().then(() => clearTimeout(timer)).catch(error => { clearTimeout(timer); console.error(error); process.exitCode = 1 })
