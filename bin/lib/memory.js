'use strict'

const { execFileSync } = require('child_process')

// Ephemeral sidecar files - never treated as "manual tamper" dirt.
const MEMORY_EPHEMERAL = new Set(['.last-write', '.debrief-propose'])

function createMemoryApi(deps) {
  const { fs, path, gitBinOk, writeOwnerIfMissing, atomicWriteFile } = deps
  let _gitWarned = false

  function memoryPorcelainPaths(eng) {
    if (!eng || !fs.existsSync(path.join(eng, '.git'))) return []
    try {
      return execFileSync('git', ['status', '--porcelain'], {
        cwd: eng, encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'],
      }).toString().split('\n').filter(Boolean).map(line => {
        // " M path", "?? path", rename "R old -> new"
        let p = line.slice(3).trim()
        if (p.includes(' -> ')) p = p.split(' -> ').pop().trim()
        return p.replace(/^"/, '').replace(/"$/, '')
      }).filter(p => p && !MEMORY_EPHEMERAL.has(path.basename(p)))
    } catch (_) { return [] }
  }

  function memoryDirtyManual(eng) {
    return memoryPorcelainPaths(eng)
  }

  // Commit engagement memory. When `opts.files` is set, stage ONLY those paths
  // so a hand-edit to an unrelated record is never laundered into this write's
  // commit (tamper-evident ledger). Unrelated dirty paths are warned, not added.
  // Omit `files` only for intentional full-tree commits (init).
  function commitMemory(eng, message, opts = {}) {
    if (!eng || !fs.existsSync(path.join(eng, '.git'))) {
      if (!ensureMemoryGit(eng)) return null
    }
    if (!gitBinOk()) return null
    const owner = writeOwnerIfMissing(eng)
    const files = Array.isArray(opts.files) ? opts.files.filter(Boolean).map(f => String(f).replace(/^\.\//, '')) : null
    try {
      if (files && files.length) {
        const foreign = memoryPorcelainPaths(eng).filter(p => !files.includes(p))
        if (foreign.length) {
          process.stderr.write(
            `⚠ memory has uncommitted manual edits (not part of this write): ${foreign.slice(0, 6).join(', ')}${foreign.length > 6 ? '…' : ''}\n` +
            '  they will NOT be auto-committed - review/commit/discard before relying on the ledger\n'
          )
        }
        for (const f of files) {
          const abs = path.join(eng, f)
          if (!fs.existsSync(abs) && !memoryPorcelainPaths(eng).includes(f)) continue
          execFileSync('git', ['add', '--', f], { cwd: eng, stdio: 'ignore', timeout: 10000 })
        }
      } else {
        execFileSync('git', ['add', '-A'], { cwd: eng, stdio: 'ignore', timeout: 10000 })
      }
      const porcelain = execFileSync('git', ['status', '--porcelain'], {
        cwd: eng, encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'],
      })
      if (!String(porcelain || '').trim()) return null
      // If we staged specific files, refuse to commit if the index somehow picked up others
      // (defense in depth). Re-check staged vs intended.
      if (files && files.length) {
        const staged = execFileSync('git', ['diff', '--cached', '--name-only'], {
          cwd: eng, encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'],
        }).toString().split('\n').map(s => s.trim()).filter(Boolean)
        const sneak = staged.filter(p => !files.includes(p) && !MEMORY_EPHEMERAL.has(path.basename(p)))
        if (sneak.length) {
          execFileSync('git', ['reset', '-q', 'HEAD', '--'].concat(sneak), {
            cwd: eng, stdio: 'ignore', timeout: 10000,
          })
        }
      }
      const still = execFileSync('git', ['diff', '--cached', '--name-only'], {
        cwd: eng, encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'],
      }).toString().trim()
      if (!still) return null
      const env = {
        ...process.env,
        GIT_AUTHOR_NAME: owner.name,
        GIT_AUTHOR_EMAIL: owner.email,
        GIT_COMMITTER_NAME: owner.name,
        GIT_COMMITTER_EMAIL: owner.email,
      }
      // -c user.* beats user.useConfigOnly=true (common on clean laptops) so git
      // never prints "Please tell me who you are" on first init / memory writes.
      execFileSync('git', [
        '-c', 'commit.gpgsign=false',
        '-c', `user.name=${owner.name}`,
        '-c', `user.email=${owner.email}`,
        'commit', '-m', String(message || 'memory write').slice(0, 72),
      ], {
        cwd: eng, stdio: 'ignore', timeout: 15000, env,
      })
      return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
        cwd: eng, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'],
      }).toString().trim()
    } catch (_) {
      return null
    }
  }

  function configureMemoryGitIdentity(eng, owner) {
    if (!owner || !owner.name || !owner.email) return
    try {
      execFileSync('git', ['config', 'user.name', owner.name], {
        cwd: eng, stdio: 'ignore', timeout: 5000,
      })
      execFileSync('git', ['config', 'user.email', owner.email], {
        cwd: eng, stdio: 'ignore', timeout: 5000,
      })
    } catch (_) {}
  }

  function ensureMemoryGit(eng) {
    if (!eng || !fs.existsSync(eng)) return false
    if (fs.existsSync(path.join(eng, '.git'))) {
      configureMemoryGitIdentity(eng, writeOwnerIfMissing(eng))
      return true
    }
    if (!gitBinOk()) {
      if (!_gitWarned) {
        process.stderr.write('⚠ git not found - engagement memory will not be versioned (receipts stay dated, but not tamper-evident)\n')
        _gitWarned = true
      }
      writeOwnerIfMissing(eng)
      return false
    }
    try {
      execFileSync('git', ['init'], { cwd: eng, stdio: 'ignore', timeout: 10000 })
      atomicWriteFile(
        path.join(eng, '.gitignore'),
        ['*.lock', '*.tmp', '.last-write', '.debrief-propose', ''].join('\n')
      )
      const owner = writeOwnerIfMissing(eng)
      configureMemoryGitIdentity(eng, owner)
      commitMemory(eng, 'init engagement memory')
      return true
    } catch (_) {
      return false
    }
  }

  function memoryHead(eng) {
    if (!eng || !fs.existsSync(path.join(eng, '.git'))) return ''
    try {
      return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
        cwd: eng, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'],
      }).toString().trim()
    } catch (_) { return '' }
  }

  // True only when .git exists AND can resolve HEAD. A corrupt ledger (broken
  // HEAD / missing objects) still has a .git directory — existsSync alone lied.
  function memoryGitHealthy(eng) {
    if (!eng) return { ok: false, reason: 'missing' }
    if (!fs.existsSync(path.join(eng, '.git'))) return { ok: false, reason: 'missing' }
    if (!gitBinOk()) return { ok: false, reason: 'no-git-bin' }
    try {
      execFileSync('git', ['rev-parse', '--verify', 'HEAD'], {
        cwd: eng, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'],
      })
      execFileSync('git', ['status', '--porcelain'], {
        cwd: eng, encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'],
      })
      return { ok: true, reason: '' }
    } catch (_) {
      return { ok: false, reason: 'broken' }
    }
  }

  return {
    MEMORY_EPHEMERAL,
    memoryPorcelainPaths,
    memoryDirtyManual,
    commitMemory,
    memoryHead,
    memoryGitHealthy,
    ensureMemoryGit,
  }
}

module.exports = { createMemoryApi, MEMORY_EPHEMERAL }
