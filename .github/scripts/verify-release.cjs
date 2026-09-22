// Release-only network verification; never imported by the local fde CLI.
const { randomUUID } = require('node:crypto')
const { setTimeout: sleep } = require('node:timers/promises')

async function verifyRelease({ name, version }, {
  fetch = globalThis.fetch,
  wait = sleep,
  log = console.log,
} = {}) {
  // At most 30 ten-second requests and 29 ten-second sleeps (under 10 minutes).
  const attempts = 30
  const nonce = randomUUID()
  let last = 'no response'
  log(`npm publish succeeded for ${name}@${version}; checking registry visibility.`)
  for (let attempt = 1; attempt <= attempts; attempt++) {
    // Exact version avoids a stale or subsequently moved latest tag. Bypass both
    // npm's local cache and intermediary caches on every request.
    const url = new URL(`https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`)
    url.searchParams.set('release-check', `${nonce}-${attempt}`)
    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json', 'cache-control': 'no-cache', pragma: 'no-cache' },
        signal: AbortSignal.timeout(10000),
      })
      if (response.ok) {
        const metadata = await response.json()
        if (metadata?.name === name && metadata?.version === version) {
          log(`Registry serves ${name}@${version} (attempt ${attempt}/${attempts}).`)
          return true
        }
        last = 'registry metadata did not match the exact package and version'
      } else {
        last = `HTTP ${response.status}`
        await response.body?.cancel()
      }
    } catch (error) {
      last = error.name === 'TimeoutError' ? 'request timed out' : 'request or JSON response failed'
    }
    log(`Visibility attempt ${attempt}/${attempts}: ${last}.`)
    if (attempt < attempts) await wait(10000)
  }
  log(`::error::npm publish succeeded for ${name}@${version}, but registry visibility remains unconfirmed after ${attempts} attempts (${last}). Do not republish; rerun only node .github/scripts/verify-release.cjs from this release commit.`)
  return false
}

if (require.main === module) {
  verifyRelease(require('../../package.json')).then(visible => { process.exitCode = visible ? 0 : 1 })
}

module.exports = { verifyRelease }
