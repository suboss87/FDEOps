const test = require('node:test')
const assert = require('node:assert/strict')
const { verifyRelease } = require('../.github/scripts/verify-release.cjs')

const pkg = { name: 'fdeops', version: '5.1.18' }
const visible = () => ({ ok: true, json: async () => pkg })

function harness(respond) {
  const requests = [], waits = [], logs = []
  return {
    requests, waits, logs,
    run: () => verifyRelease(pkg, {
      fetch: async (url, options) => {
        requests.push({ url, options })
        return respond(requests.length)
      },
      wait: async ms => { waits.push(ms) },
      log: line => { logs.push(line) },
    }),
  }
}

test('exact version succeeds without querying latest or sleeping', async () => {
  const h = harness(visible)
  assert.equal(await h.run(), true)
  assert.equal(h.requests.length, 1)
  assert.equal(h.requests[0].url.pathname, '/fdeops/5.1.18')
  assert.deepEqual(h.waits, [])
  assert.match(h.logs.at(-1), /Registry serves fdeops@5\.1\.18/)
})

test('propagation beyond the old ten attempts uses fresh requests and eventually succeeds', async () => {
  let cancelled = 0
  const h = harness(n => n < 12
    ? { ok: false, status: 404, body: { cancel: async () => { cancelled++ } } }
    : visible())
  assert.equal(await h.run(), true)
  assert.equal(cancelled, 11)
  assert.deepEqual(h.waits, Array(11).fill(10000))
  assert.equal(new Set(h.requests.map(r => r.url.href)).size, 12)
  for (const { url, options } of h.requests) {
    assert.equal(url.pathname, '/fdeops/5.1.18')
    assert.equal(options.headers['cache-control'], 'no-cache')
    assert.ok(options.signal instanceof AbortSignal)
  }
})

test('network, timeout, server and malformed responses retry without false confirmation', async () => {
  const h = harness(n => {
    if (n === 1) throw new Error('network unavailable')
    if (n === 2) throw Object.assign(new Error('timeout'), { name: 'TimeoutError' })
    if (n === 3) return { ok: false, status: 503 }
    if (n === 4) return { ok: true, json: async () => { throw new SyntaxError('bad JSON') } }
    if (n === 5) return { ok: true, json: async () => null }
    if (n === 6) return { ok: true, json: async () => ({ ...pkg, version: '5.1.17' }) }
    if (n === 7) return { ok: true, json: async () => ({ ...pkg, name: 'other' }) }
    return visible()
  })
  assert.equal(await h.run(), true)
  assert.equal(h.requests.length, 8)
  assert.equal(h.waits.length, 7)
  assert.ok(h.logs.some(line => line.includes('request timed out')))
})

test('persistent failure is bounded and distinguishes publication from visibility', async () => {
  const h = harness(() => ({ ok: false, status: 404 }))
  assert.equal(await h.run(), false)
  assert.equal(h.requests.length, 30)
  assert.deepEqual(h.waits, Array(29).fill(10000))
  assert.match(h.logs.at(-1), /npm publish succeeded.*visibility remains unconfirmed/)
  assert.match(h.logs.at(-1), /Do not republish; rerun only node/)
})
