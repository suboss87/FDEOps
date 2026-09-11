#!/usr/bin/env node
/**
 * fde - the deterministic core of fdeops.
 * Real tool, no AI required: recon, memory ops, portfolio status.
 * The @fde skill calls these for mechanics and adds judgment on top.
 *
 * Security note: every execSync below runs a FIXED constant command
 * (git introspection only). User input never reaches a shell - file
 * writes go through fs, and search terms through an escaped RegExp.
 *
 *   fde scan                day-1 recon of the cwd repo (facts, no opinions)
 *   fde resume              find this workspace's engagement, print bounded context
 *   fde resume --full       same, but the complete context.md (no bound)
 *   fde resume --init <n>   create + bind an engagement for this workspace
 *   fde triage              deterministic TRIAGE block (hooks / Cursor entry)
 *   fde log <type> <text>   structured append (decision|risk|delivery|contact)
 *   fde debrief [file]      meeting notes → structured memory (stdin if no file)
 *   fde debrief --smart     propose routing from messy notes; --apply commits it
 *   fde prep [label]        grounded walk-in brief from existing .fde/ only
 *   fde doctor              deterministic memory lint (stale signals, gaps)
 *   fde tidy [--apply]      propose safe consolidations; apply only with --apply (was: garden)
 *   fde ingest …            stage → propose → apply pull sink (.inbox/; never auto-writes .fde/)
 *   fde owner [set …]       who keeps this engagement record
 *   fde receipts <term>     "what did we agree?" - search memory with dates
 *   fde capture             session-end snapshot → context.md (hooks use this)
 *   fde preserve            pre-compaction context snapshot (hook-internal; hooks use this)
 *   fde status [--all]      value ledger first, then trust (pass --all for portfolio)
 *   fde dashboard [--all] [--open] [--out <path>]  bound fieldbook, or all (--all)
 *   fde vault               derived Obsidian vault of the fieldbook (disposable; --redacted)
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync, execFileSync } = require('child_process')
const { createMemoryApi } = require('./lib/memory')
const { createTrustApi } = require('./lib/trust')
const vault = require('./lib/vault')
const context = require('./lib/context')
const { sourceReference, hasSource, datedDecisions } = require('./lib/provenance')
const { deliverySummary } = require('./lib/delivery-gaps')

const HOME = os.homedir()
// FDEOPS_ENGAGEMENTS_ROOT isolates init/status/dashboard (and the registry) for
// dogfood/simulations. Default remains ~/fde-engagements.
const ENGAGEMENTS_ROOT = ((process.env.FDEOPS_ENGAGEMENTS_ROOT || '').trim().replace(/^~/, HOME))
  || path.join(HOME, 'fde-engagements')
const REGISTRY = path.join(ENGAGEMENTS_ROOT, '.registry')
const masking = require('./lib/masking').createMasking(ENGAGEMENTS_ROOT)
function maskDisplay(text) {
  return ['dashboard', 'vault'].includes(process.argv[2]) ? String(text) : masking.mask(text)
}
function maskedSections(sections, maxBytes) {
  return context.boundedSections(sections.map(text => masking.mask(text)), maxBytes)
}
const DEBRIEF_MAX_BYTES = 256 * 1024
const CODE_EXT = ['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.go', '.rb', '.cs', '.php']
const CONF_EXT = CODE_EXT.concat(['.env', '.yaml', '.yml', '.json'])
// Bare "inference" is banned here: TypeScript codebases are full of "type
// inference" comments and the false positives poison the day-1 questions.
const AI_CODE_RE = /openai|anthropic|\bllm\b|gpt-|claude|embedding|vector store|model inference|inference (?:api|endpoint|server|engine)/i
// one routing table for structured appends - cmdLog and cmdDebrief share it
const LOG_FILES = { decision: 'decisions.md', risk: 'risks.md', delivery: 'delivery.md', contact: 'stakeholders.md' }

// constant-command runner - never receives user input
function sh(cmd, cwd) {
  try {
    return execSync(cmd, { cwd: cwd || process.cwd(), stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 }).toString().trim()
  } catch (_) { return '' }
}

// Hex hashes only - never a shell. True when olderHash is an ancestor of newerHash.
function gitIsAncestor(eng, olderHash, newerHash) {
  if (!olderHash || !newerHash || olderHash === newerHash) return false
  if (!/^[0-9a-f]{7,64}$/i.test(olderHash) || !/^[0-9a-f]{7,64}$/i.test(newerHash)) return false
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', olderHash, newerHash], {
      cwd: eng, stdio: 'ignore', timeout: 15000,
    })
    return true
  } catch (_) { return false }
}

function gitLogHash(eng, args) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%H', ...args], {
      cwd: eng, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000,
    }).trim()
  } catch (_) { return '' }
}

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'engagement'
}

// Walk the repo collecting candidate files. Hard caps keep scan fast on monorepos.
function walk(dir, exts, cap) {
  const out = []
  const skip = new Set(['node_modules', '.git', 'dist', 'build', 'vendor', '.next', 'target', '__pycache__'])
  ;(function rec(d) {
    if (out.length >= cap) return
    let entries
    try { entries = fs.readdirSync(d, { withFileTypes: true }) } catch (_) { return }
    for (const e of entries) {
      if (out.length >= cap) return
      if (e.name.startsWith('.') && e.name !== '.env') continue
      const p = path.join(d, e.name)
      if (e.isDirectory()) { if (!skip.has(e.name)) rec(p) }
      else if (exts.includes(path.extname(e.name)) || e.name === '.env') {
        try { if (fs.statSync(p).size <= 1024 * 1024) out.push(p) } catch (_) {}
      }
    }
  })(dir)
  return out
}

function grepFiles(files, regex, cap) {
  const hits = []
  for (const f of files) {
    if (hits.length >= cap) break
    let text
    try { text = fs.readFileSync(f, 'utf8') } catch (_) { continue }
    const lines = text.split('\n')
    for (let i = 0; i < lines.length && hits.length < cap; i++) {
      if (regex.test(lines[i])) hits.push({ file: path.relative(process.cwd(), f), line: i + 1, text: maskDisplay(lines[i].trim()).slice(0, 120) })
    }
  }
  return hits
}

// ---------- engagement resolution (zero-ceremony order) ----------

// Registry lines are "<absolute workspace path> <slug>". A hand-edited or
// truncated file used to parse into nonsense bindings (a line with no space
// yielded a workspace missing its last character), so every binding a workspace
// could match on silently disappeared behind "NO ENGAGEMENT". Skip what cannot
// be a binding and say so once.
let registryWarned = false
function readRegistry() {
  let raw
  // Regular files only: a fifo here blocked `fde resume --init` on open.
  try { if (!fs.lstatSync(REGISTRY).isFile()) return [] } catch (_) { return [] }
  try { raw = fs.readFileSync(REGISTRY, 'utf8') } catch (_) { return [] }
  const entries = []
  let skipped = 0
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    const i = line.lastIndexOf(' ')
    const workspace = i > 0 ? line.slice(0, i) : ''
    const slug = i > 0 ? line.slice(i + 1).trim() : ''
    if (!workspace || !slug || !path.isAbsolute(workspace)) { skipped++; continue }
    entries.push({ workspace, slug })
  }
  if (skipped && !registryWarned) {
    registryWarned = true
    process.stderr.write(
      `⚠ ${skipped} unreadable line(s) in ${REGISTRY} ignored - expected "<workspace path> <slug>" per line.\n` +
      '  re-bind this workspace with: fde resume --init <name>\n'
    )
  }
  return entries
}

function resolveEngagement(opts = {}) {
  // opts.forWrite: memory mutations (log/debrief/capture) require an intentional
  // bind - env, registry, pointer, or in-repo .fde. Basename matching is
  // read-only convenience; writing on a folder-name guess contaminates clients.
  const forWrite = !!opts.forWrite
  const accept = (p) => acceptEngagementPath(p, { forWrite })
  // 1) explicit env (back-compat: accept old FDEOS_ENGAGEMENT too). An override
  // that cannot be honored is never silently ignored: falling through to the
  // registry would route this client's note into whichever engagement the
  // workspace happens to be bound to. A bare slug is accepted too - it is what
  // an FDE types - but only when it resolves under the engagements root.
  const envRaw = process.env.FDEOPS_ENGAGEMENT || process.env.FDEOS_ENGAGEMENT || ''
  const env = envRaw.replace(/^~/, HOME).trim()
  // A value that is all whitespace is a variable someone meant to set - usually
  // an empty expansion. Treating it as unset filed the note under whichever
  // engagement the workspace was bound to, silently.
  if (!env && envRaw) {
    process.stderr.write(
      'FDEOPS_ENGAGEMENT is set to whitespace - that names no engagement.\n' +
      '  set it to an engagement, or unset it to use this workspace\'s binding.\n'
    )
    return null
  }
  if (env) {
    // A relative value resolves against whatever directory the agent happened
    // to start in - `FDEOPS_ENGAGEMENT=..` accepted the parent folder and put
    // memory there. Absolute path, ~ path, or bare slug; nothing in between.
    const looksLikePath = env.includes(path.sep) || env.includes('/') || env.startsWith('.')
    if (looksLikePath && !path.isAbsolute(env)) {
      process.stderr.write(
        `FDEOPS_ENGAGEMENT must be an absolute path or a bare engagement slug - got "${env}".\n` +
        `  e.g. ${path.join(ENGAGEMENTS_ROOT, '<client>', '.fde')}  or just <client>\n`
      )
      return null
    }
    if (looksLikePath) {
      // Pointing at the engagement folder instead of its .fde used to create a
      // second, git-less memory beside the real one - same client, split record.
      const nested = accept(path.join(env, '.fde'))
      if (nested) return nested
      const ok = accept(env)
      if (ok) return ok
    } else {
      // slugify() falls back to the literal "engagement" for a value with no
      // slug characters at all ("???"), which used to resolve onto a real
      // engagement nobody named. A name that slugifies to nothing names nothing.
      if (!/[a-z0-9]/i.test(env)) {
        process.stderr.write(
          `FDEOPS_ENGAGEMENT is set to "${env}", which is not an engagement name.\n` +
          '  refusing to guess - fix or unset the variable.\n' +
          '  list what exists: fde status --all\n'
        )
        return null
      }
      const slugDir = path.join(ENGAGEMENTS_ROOT, slugify(env), '.fde')
      const asSlug = accept(slugDir)
      if (asSlug) return asSlug
      process.stderr.write(
        `FDEOPS_ENGAGEMENT is set to "${env}" but no engagement memory is there.\n` +
        `  looked at: ${slugDir}\n` +
        '  refusing to fall back to another engagement - fix or unset the variable.\n' +
        '  list what exists: fde status --all\n'
      )
      return null
    }
    process.stderr.write(
      `FDEOPS_ENGAGEMENT is set to "${env}" but no engagement memory is there.\n` +
      `  looked at: ${env}\n` +
      '  refusing to fall back to another engagement - fix or unset the variable.\n' +
      '  list what exists: fde status --all\n'
    )
    return null
  }
  // 2) workspace registry binding (written by resume --init). Match the cwd OR
  // any ancestor of it - FDEs run commands from src/, packages/api/, etc., not
  // just the repo root where they bound. Nearest (deepest) registered ancestor
  // wins, exactly like git searching upward for .git. `startsWith(workspace +
  // sep)` requires a true path-boundary ancestor, so /work/repo-2 never matches
  // a binding on /work/repo. Kept in lockstep with registry_engagement_dir in
  // hooks/session-start, session-stop, pre-compact.
  const cwd = process.cwd()
  const reg = readRegistry()
    .filter(r => cwd === r.workspace || cwd.startsWith(r.workspace + path.sep))
    .sort((a, b) => b.workspace.length - a.workspace.length)[0]
  if (reg) {
    const ok = accept(path.join(ENGAGEMENTS_ROOT, reg.slug, '.fde'))
    if (ok) return ok
  }
  // 3) global pointer file (back-compat: try old FDEOS-CLAUDE.md too)
  for (const ptrName of ['FDEOPS-CLAUDE.md', 'FDEOS-CLAUDE.md']) {
    try {
      const ptr = fs.readFileSync(path.join(HOME, '.claude', ptrName), 'utf8')
      const m = ptr.match(/^(?:FDEOPS|FDEOS)_ENGAGEMENT=(.+)$/m)
      if (m) {
        const ok = accept(m[1].trim().replace(/^~/, HOME))
        if (ok) return ok
      }
    } catch (_) {}
  }
  // 4) workspace dir name matches an engagement slug. Read-only convenience.
  // NEVER a write target - an unbound checkout named like a client must not
  // append into that client's memory.
  const slugGuess = slugify(path.basename(cwd))
  const guess = path.join(ENGAGEMENTS_ROOT, slugGuess, '.fde')
  if (fs.existsSync(guess)) {
    if (forWrite) {
      process.stderr.write(
        `no binding for this workspace - folder name matched "${slugGuess}" but writes require an explicit bind.\n` +
        `run: fde resume --init ${slugGuess}\n` +
        ` or: export FDEOPS_ENGAGEMENT=${guess}\n`
      )
      return null
    }
    const ok = accept(guess)
    if (ok) {
      process.stderr.write(`⚠ resolved engagement by directory name ("${slugGuess}"), not a saved binding (read-only). If this is the right client, run \`fde resume --init ${slugGuess}\` here to bind it before logging or debriefing.\n`)
      return ok
    }
  }
  // 5) in-repo .fde (engagement-approved only)
  const inRepo = accept(path.join(cwd, '.fde'))
  if (inRepo) return inRepo
  return null
}

// Engagement memory must be a directory. A file named .fde used to yield a
// healthy-looking green TRIAGE then raw ENOTDIR on write - refuse loudly.
function acceptEngagementPath(p, opts = {}) {
  if (!p || !fs.existsSync(p)) return null
  try {
    const st = fs.statSync(p)
    if (st.isDirectory()) return p
    const msg =
      `engagement path is not a directory (memory missing/broken): ${p}\n` +
      '  repair: remove that file, then re-run: fde resume --init <name>'
    console.error(msg)
    if (opts.forWrite) process.exit(1)
    return null
  } catch (e) {
    if (opts.forWrite) failFs(e, 'open', p)
    return null
  }
}

function templatesDir() {
  for (const c of [path.join(__dirname, '..', 'templates', '.fde'), path.join(__dirname, 'templates', '.fde')]) {
    if (fs.existsSync(c)) return c
  }
  return null
}

// ---------- shared engagement signals (one source of truth) ----------

// Regular files only: a fifo left in a memory slot used to block the whole CLI
// on open (doctor/resume/triage hung forever), and a directory threw EISDIR.
function readEng(eng, f) {
  const abs = path.join(eng, f)
  try { if (!fs.lstatSync(abs).isFile()) return '' } catch (_) { return '' }
  try { return fs.readFileSync(abs, 'utf8') } catch (_) { return '' }
}

// Redact private notes and template hints from every model-facing read.
// Also strip terminal control chars so poisoned memory cannot smuggle ANSI
// into triage/prep/status (C0/C1 except tab/LF/CR).
function stripControlChars(s) {
  return String(s || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
}

const PRIVATE_MARKER = '(private - redacted)'
// Openers tolerate whitespace and attributes (<private >, <private data-x="1">)
// so a near-miss tag still seals instead of failing open.
const PRIVATE_TAG = /<(\/)?private\b[^>]*>/gi

// Depth-aware split of a markdown body into public text and sealed blocks. A
// nested block seals to the outermost close, an unclosed one seals to EOF, and a
// stray close is dropped - a regex pair cannot do any of those safely.
// HTML comments go first: template hints and pasted notes hide content there, and
// `clean` is what debrief/ingest preview to a human and route into memory.
// opts.sealDangling seals an unterminated `<!--` to EOF. Only untrusted input
// gets that: on the read path a stray `<!--` already stored in memory would
// otherwise hide every line after it from every view.
function splitPrivate(md, opts = {}) {
  let text = String(md || '').replace(/<!--[\s\S]*?-->/g, '')
  if (opts.sealDangling) text = text.replace(/<!--[\s\S]*$/, '')
  const blocks = []
  let out = ''
  let cursor = 0
  let depth = 0
  let start = 0
  let m
  PRIVATE_TAG.lastIndex = 0
  while ((m = PRIVATE_TAG.exec(text))) {
    const closing = Boolean(m[1])
    if (!closing) {
      if (depth === 0) {
        out += text.slice(cursor, m.index)
        start = m.index
      }
      depth++
    } else if (depth > 0) {
      depth--
      if (depth === 0) {
        blocks.push(text.slice(start, m.index + m[0].length))
        out += PRIVATE_MARKER
        cursor = m.index + m[0].length
      }
    } else {
      out += text.slice(cursor, m.index)
      cursor = m.index + m[0].length
    }
  }
  if (depth > 0) {
    blocks.push(text.slice(start))
    out += PRIVATE_MARKER
  } else {
    out += text.slice(cursor)
  }
  return { clean: out, blocks }
}

function stripPrivate(md) {
  return stripControlChars(splitPrivate(md).clean)
}

// Persisted blocks must be balanced. splitPrivate() seals an unclosed block to
// EOF and hands it back exactly as written; storing that would leave a dangling
// opener that swallows every note appended to the file afterwards.
function sealedText(blocks) {
  return blocks.map((b) => {
    let open = 0
    let m
    PRIVATE_TAG.lastIndex = 0
    while ((m = PRIVATE_TAG.exec(b))) {
      if (m[1]) open = Math.max(0, open - 1)
      else open++
    }
    // Balance by count, not by suffix: one block can hold several unclosed
    // openers, and each needs its own closer or the tail still dangles.
    return `${b}\n${'</private>\n'.repeat(open)}`
  }).join('')
}

// Unbalanced markers do not leak a sealed block, but they change what is public:
// a stray `</private>` leaves the text after it in the clear, and a forgotten
// closer seals everything appended later. Counts only - never the content.
function privateMarkerImbalance(md) {
  const text = String(md || '')
  let depth = 0
  let unclosed = 0
  let stray = 0
  let m
  PRIVATE_TAG.lastIndex = 0
  while ((m = PRIVATE_TAG.exec(text))) {
    if (!m[1]) depth++
    else if (depth > 0) depth--
    else stray++
  }
  unclosed = depth
  return { unclosed, stray }
}

// Read + redact in one step - the default way dashboard code should ever touch
// a markdown file, so a forgotten stripPrivate() call can't leak a <private> block.
function readClean(eng, f) { return stripPrivate(readEng(eng, f)) }

// CLI-owned append-only mirror of [signal:x] lines. Survives an agent rewrite
// that drops stakeholders.md "## Signal history" - skill discipline still
// matters, but CLI-logged trust tokens must not vanish with the markdown.
const SIGNAL_LEDGER = '.signal-ledger'
const LAST_WRITE = '.last-write'

// Heuristic secret shapes - warn/block CLI writes so a wrong-client paste is not silent.
// Not a scanner product; high-signal patterns an FDE actually pastes by mistake.
const SECRET_PATTERNS = [
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub token', re: /\bghp_[A-Za-z0-9]{20,}\b/ },
  { name: 'GitHub fine-grained token', re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { name: 'OpenAI-style key', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'PEM private key', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Bearer token', re: /\bBearer\s+[A-Za-z0-9._\-]{20,}\b/ },
  { name: 'database URL', re: /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:]+:[^/\s@]+@/i },
  { name: 'api key assignment', re: /\b(?:api[_-]?key|secret|password)\s*=\s*\S{8,}/i },
]

function findSecretHit(text) {
  for (const p of SECRET_PATTERNS) {
    if (p.re.test(String(text))) return p.name
  }
  return null
}

function refuseSecret(kind, hit) {
  console.error(
    `refused: ${kind} looks like a ${hit}.\n` +
    `Do not log credentials into engagement memory. Redact first, or pass --force if this is intentional.\n` +
    `If you already wrote one: fde log --undo (last write) or fde redact <term> --apply (buried)`
  )
}

function recordLastWrite(eng, file, entry) {
  const p = path.join(eng, LAST_WRITE)
  withFileLock(p, () => {
    atomicWriteFile(p, JSON.stringify({ file, entry, at: new Date().toISOString() }) + '\n')
  })
}

function removeExactEntryLine(md, entry) {
  const target = entry.trim()
  const lines = md.split('\n')
  const idx = lines.findIndex(l => l.trim() === target)
  if (idx === -1) return null
  lines.splice(idx, 1)
  while (idx < lines.length && lines[idx] === '') lines.splice(idx, 1)
  return lines.join('\n')
}


// Map Node fs errno codes to one-line field messages - never dump a stack at an FDE.
function formatFsError(err, action, target) {
  const code = err && err.code
  const where = path.basename(String(target || '')) || String(target || 'path')
  if (code === 'ENOSPC') return `cannot ${action} ${where} - disk full`
  if (code === 'ENOTDIR') {
    return `cannot ${action} ${where} - engagement path is not a directory (memory missing/broken); remove the file and re-run fde resume --init`
  }
  if (code === 'EACCES' || code === 'EPERM' || code === 'EROFS') {
    return `cannot ${action} ${where} - permission denied (read-only or locked down)`
  }
  if (code === 'ELOOP') return `cannot ${action} ${where} - symlink loop`
  if (code === 'ENOENT') return `cannot ${action} ${where} - path missing`
  return `cannot ${action} ${where}${code ? ` (${code})` : ''}${err && err.message && !code ? ': ' + err.message : ''}`
}

let debriefTransactionActive = false
const ownedDebriefLocks = new Set()

function failFs(err, action, target) {
  if (debriefTransactionActive || ownedDebriefLocks.size) throw new Error(formatFsError(err, action, target))
  console.error(formatFsError(err, action, target))
  process.exit(1)
}

// Refuse writes that would follow a symlink out of the engagement tree, or
// block forever on something that is not a file (a fifo in a memory slot hung
// every append). Missing path is fine (new file). Soft mode returns the message
// instead of exiting (session capture must never crash a hook).
function refuseSymlinkWrite(p, opts = {}) {
  try {
    const st = fs.lstatSync(p)
    if (st.isSymbolicLink() || !st.isFile()) {
      const msg = st.isSymbolicLink()
        ? `refused: ${path.basename(p)} is a symlink - write would leave the engagement tree. Replace it with a real file.`
        : `refused: ${path.basename(p)} is not a regular file - remove it and re-run; every write is refused while it is there.`
      if ((debriefTransactionActive || ownedDebriefLocks.size) && !opts.soft) throw new Error(msg)
      if (opts.soft) return msg
      console.error(msg)
      process.exit(1)
    }
  } catch (e) {
    if (e.code === 'ENOENT') return null
    if (opts.soft) return formatFsError(e, 'check', p)
    failFs(e, 'check', p)
  }
  return null
}

// Exclusive create lock + retry. Two parallel agent sessions (or hook + CLI)
// appending the same .fde file otherwise interleave/corrupt under load.
function withFileLock(targetPath, fn, opts = {}) {
  if (ownedDebriefLocks.has(targetPath)) return fn()
  if (debriefTransactionActive || ownedDebriefLocks.size) opts = { ...opts, soft: true }
  const lockPath = targetPath + '.lock'
  const deadline = Date.now() + 5000
  while (true) {
    let fd
    try {
      fd = fs.openSync(lockPath, 'wx')
    } catch (e) {
      if (e.code === 'EEXIST') {
        if (Date.now() > deadline) {
          const msg = `could not lock ${path.basename(targetPath)} - another writer is active; retry`
          if (opts.soft) throw Object.assign(new Error(msg), { code: 'ELOCKED' })
          console.error(msg)
          process.exit(1)
        }
        const waitUntil = Date.now() + 20
        while (Date.now() < waitUntil) { /* spin */ }
        continue
      }
      if (opts.soft) throw e
      failFs(e, 'lock', targetPath)
    }
    try {
      return fn()
    } finally {
      try { fs.closeSync(fd) } catch (_) {}
      try { fs.unlinkSync(lockPath) } catch (_) {}
    }
  }
}

function atomicWriteFile(p, content, opts = {}) {
  const blocked = refuseSymlinkWrite(p, opts)
  if (blocked) {
    if (opts.soft) throw Object.assign(new Error(blocked), { code: blocked.includes('symlink') ? 'ESYMLINK' : 'EIRREGULAR' })
    return
  }
  const tmp = `${p}.${process.pid}.${Date.now()}.tmp`
  try {
    // opts.mode is set at create time: a secret must never exist world-readable,
    // not even for the window between rename and a follow-up chmod.
    fs.writeFileSync(tmp, content, opts.mode ? { mode: opts.mode } : undefined)
    if (opts.mode) fs.chmodSync(tmp, opts.mode)
    fs.renameSync(tmp, p)
  } catch (e) {
    try { fs.unlinkSync(tmp) } catch (_) {}
    if (opts.soft) throw e
    failFs(e, 'write', p)
  }
}

function lockedAppendFile(p, text, opts = {}) {
  const blocked = refuseSymlinkWrite(p, opts)
  if (blocked) {
    if (opts.soft) throw Object.assign(new Error(blocked), { code: blocked.includes('symlink') ? 'ESYMLINK' : 'EIRREGULAR' })
    return
  }
  try {
    withFileLock(p, () => { fs.appendFileSync(p, text) }, opts)
  } catch (e) {
    if (opts.soft) throw e
    failFs(e, 'append', p)
  }
}

function rmTreeQuiet(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }) } catch (_) {}
}

// ---------- versioned engagement memory (tamper-evident receipts) ----------
// Each .fde/ is its own git repo. Writes auto-commit. No new npm deps - shell git.
// Skips quietly if git is missing (warn once). Cross-process safety stays on
// withFileLock + atomic rename; this layer is history + attribution, not locking.

const OWNER_FILE = '.owner'
const DEBRIEF_PROPOSE = '.debrief-propose'
// The agent is told to open and rewrite .debrief-propose, so sealed blocks are
// held out of it in an owner-only sidecar that only --apply reads back.
const DEBRIEF_PRIVATE = '.debrief-private'
const DEBRIEF_SEAL = '.debrief-seal'

function gitBinOk() {
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore', timeout: 5000 })
    return true
  } catch (_) { return false }
}

function readOwner(eng) {
  try {
    const raw = fs.readFileSync(path.join(eng, OWNER_FILE), 'utf8')
    const name = (raw.match(/^name:\s*(.+)$/m) || [])[1]
    const email = (raw.match(/^email:\s*(.+)$/m) || [])[1]
    if (name && email) return { name: name.trim(), email: email.trim() }
  } catch (_) {}
  return null
}

function writeOwnerIfMissing(eng) {
  if (readOwner(eng)) return readOwner(eng)
  const name = sh('git config user.name') || process.env.USER || process.env.LOGNAME || 'fde'
  const email = sh('git config user.email') || `${String(name).replace(/\s+/g, '.').toLowerCase()}@local`
  const body = `name: ${name}\nemail: ${email}\n`
  try {
    withFileLock(path.join(eng, OWNER_FILE), () => {
      atomicWriteFile(path.join(eng, OWNER_FILE), body)
    })
  } catch (_) {
    try { atomicWriteFile(path.join(eng, OWNER_FILE), body) } catch (_) {}
  }
  return { name, email }
}

function authorBracket(eng) {
  const o = writeOwnerIfMissing(eng)
  const id = (o.email.includes('@') ? o.email.split('@')[0] : o.name)
    .replace(/[^\w.-]/g, '')
    .slice(0, 40)
  return id ? `@${id}` : ''
}

function datedEntry(eng, date, text, signal) {
  const who = authorBracket(eng)
  const bits = [`- [${date}]`]
  if (who) bits.push(`[${who}]`)
  if (signal) bits.push(`[signal:${signal}]`)
  bits.push(stripControlChars(text))
  return bits.join(' ')
}

const {
  ensureMemoryGit,
  memoryDirtyManual,
  commitMemory,
  memoryHead,
  memoryGitHealthy,
} = createMemoryApi({ fs, path, gitBinOk, writeOwnerIfMissing, atomicWriteFile })

// Pull the body under a "## Heading" up to the next "##" (or EOF).
// opts.lastNonEmpty: when duplicate headings exist (common skill trap: template
// "## Next action" left empty, agent appends a second), prefer the last filled
// body so triage/resume do not silently report "(none set)".
function sectionBodies(md, heading) {
  const lines = String(md || '').split('\n')
  const re = new RegExp('^#{1,6}\\s+' + heading + '\\b', 'i')
  const out = []
  for (let i = 0; i < lines.length; i++) {
    if (!re.test(lines[i].trim())) continue
    const body = []
    for (let j = i + 1; j < lines.length; j++) {
      if (/^#{1,6}\s/.test(lines[j].trim())) break
      body.push(lines[j])
    }
    out.push(body.join('\n').trim())
  }
  return out
}

function sectionBody(md, heading, opts) {
  const bodies = sectionBodies(md, heading)
  if (!bodies.length) return ''
  if (!(opts && opts.lastNonEmpty)) return bodies[0]
  return [...bodies].reverse().find(Boolean) || bodies[0]
}

function countSections(md, heading) {
  const re = new RegExp('^#{1,6}\\s+' + heading + '\\b', 'i')
  let n = 0
  for (const raw of String(md || '').split('\n')) {
    if (re.test(raw.trim())) n++
  }
  return n
}

// Remove every "## Heading" section (heading line + body). Used to collapse
// duplicate Next action blocks before writing a single canonical one.
function stripAllSections(md, heading) {
  const lines = String(md || '').split('\n')
  const re = new RegExp('^#{1,6}\\s+' + heading + '\\b', 'i')
  const out = []
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i].trim())) {
      i++
      while (i < lines.length && !/^#{1,6}\s/.test(lines[i].trim())) i++
      i--
      continue
    }
    out.push(lines[i])
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\n*$/, '\n')
}

// Append `entry` as the last line of a "## Heading" section, creating the
// section at end-of-file if it doesn't exist yet. Plain fs.appendFileSync
// would land the entry after ANY later section the agent added (e.g. a
// "## Notes" heading appended after "## Signal history"), silently moving a
// signal token outside the section the reader scans - this keeps it inside
// regardless of what follows.
function appendUnderSection(md, heading, entry) {
  const lines = md.split('\n')
  const start = lines.findIndex(l => new RegExp('^#{1,6}\\s+' + heading + '\\b', 'i').test(l.trim()))
  if (start === -1) {
    const sep = md.length && !md.endsWith('\n') ? '\n' : ''
    return `${md}${sep}\n## ${heading}\n\n${entry}\n`
  }
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,6}\s/.test(lines[i].trim())) { end = i; break }
  }
  const before = lines.slice(0, end)
  const after = lines.slice(end)
  while (before.length > start + 1 && before[before.length - 1].trim() === '') before.pop()
  before.push(entry)
  if (after.length) before.push('')
  return before.concat(after).join('\n')
}

// Shared by cmdLog and cmdDebrief so the two writers can't drift (the earlier
// bug: fde log's format and fde debrief's format both existed, only one of
// them matched what extractStakeholders actually read). A contact entry
// carrying a [signal:x] token - however it got there - lands inside
// "## Signal history"; everything else is a plain end-of-file append.
function appendLogEntry(eng, type, entry, opts = {}) {
  ensureMemoryGit(eng)
  const p = path.join(eng, LOG_FILES[type])
  if (type === 'contact' && /\[signal:(red|amber|green)\]/i.test(entry)) {
    withFileLock(p, () => {
      atomicWriteFile(p, appendUnderSection(readEng(eng, LOG_FILES[type]), 'Signal history', entry))
    })
    // Durable CLI ledger - not rewritten by agent artifact passes.
    lockedAppendFile(path.join(eng, SIGNAL_LEDGER), `${entry}\n`)
  } else {
    lockedAppendFile(p, `\n${entry}\n`)
  }
  recordLastWrite(eng, LOG_FILES[type], entry)
  if (!opts.skipCommit) {
    const files = [LOG_FILES[type]]
    if (type === 'contact' && /\[signal:(red|amber|green)\]/i.test(entry)) files.push(SIGNAL_LEDGER)
    commitMemory(eng, opts.commitMsg || `log ${type}`, { files })
  }
}

// ---------- dashboard content extractors (best-effort, read-only) ----------
// The fieldbook's structured widgets (stakeholders, risks, log, stats) want
// data shapes that .fde/ markdown does not literally carry - it is written by
// hand, in slightly different shapes engagement to engagement. Same spirit as
// computeSignals() above: keyword/pattern heuristics, commented as heuristics,
// degrading to "nothing found" rather than guessing when the shape does not
// match. Never fabricate a number, a name, or a signal that is not in the text.

const PHASES = ['land', 'discover', 'plan', 'ship', 'outcome', 'close']
const PHASE_ALIASES = { build: 'ship', prove: 'outcome' } // legacy names; public map is ship / outcome
const PHASE_LABELS = {
  land: 'Land', discover: 'Discover', plan: 'Plan',
  ship: 'Ship', outcome: 'Outcome', close: 'Close',
}
function canonicalPhase(phase) {
  const p = String(phase).toLowerCase()
  return PHASE_ALIASES[p] || p
}
function phaseLabel(phase) {
  const p = canonicalPhase(phase)
  return PHASE_LABELS[p] || phase
}

// First real (non-blank, non-heading) line of a prose file, bold-label prefix
// stripped ("**Confirmed:** text..." -> "text...") - same spirit as the
// existing topRisk extraction above, just for brief.md/reality.md one-liners.
// An unfilled template line ("**Stated problem:**" with nothing after the
// colon) collapses to '' here, which callers treat as "nothing to show".
function firstLine(md, maxLen) {
  for (const raw of md.split('\n')) {
    const l = raw.trim()
    if (!l || /^#{1,6}\s/.test(l)) continue
    const clean = maskDisplay(l.replace(/^\*\*[^*]+:\*\*\s*/, '').replace(/\*\*/g, '').replace(/^["']|["']$/g, '').trim())
    if (!clean) continue
    return clean.length > maxLen ? clean.slice(0, maxLen - 1).trim() + '…' : clean
  }
  return ''
}

// reality.md is the one panel whose job is "not the brief". If the file does
// not carry Working theory / Evidence / Differs from brief, do not scrape a
// first line that might be the inherited brief and label it truth.
function parseReality(md, maxLen) {
  const theory = (md.match(/\*\*Working theory:\*\*[^\S\r\n]*(.*)/i) || [])[1]
  const hasSchema = /\*\*(Working theory|Evidence|Differs from brief how):\*\*/i.test(md)
  const theoryText = maskDisplay((theory || '').trim())
  if (theoryText) {
    const line = theoryText.length > maxLen ? theoryText.slice(0, maxLen - 1).trim() + '…' : theoryText
    return { line, missing: '' }
  }
  if (hasSchema) return { line: '', missing: '' }
  const prose = firstLine(md, maxLen)
  if (prose) {
    return {
      line: '',
      missing: 'UNREADABLE - reality.md does not match the schema (Working theory / Evidence / Differs from brief). Not showing the brief as truth.',
    }
  }
  return { line: '', missing: '' }
}

// Same columns as templates/.fde/delivery.md - a row without them above it is
// read as the header line, so the value it carries disappears.
const VALUE_LEDGER_HEADER = '| Date | Slice | Bucket | Promised | Measured | Accepted by | Evidence | Rollback |'
const VALUE_LEDGER_RULE = '|------|-------|--------|----------|----------|-------------|----------|----------|'

// A header and a legend are text, not value: a template copy of the ledger has
// zero rows, and must not shadow filled work above it (or receive a row).
function valueLedgerRowCount(body) {
  const t = parseMdTable(stripTemplateNoise(String(body || '')))
  if (!t) return 0
  return t.rows.filter(r => r.some(c => String(c || '').trim())).length
}

function appendValueLedgerRow(eng, cells, { skipCommit = false } = {}) {
  ensureMemoryGit(eng)
  const p = path.join(eng, 'delivery.md')
  let row
  withFileLock(p, () => {
    let md = readEng(eng, 'delivery.md')
    if (!md) md = '# Delivery log\n\n## Value ledger\n\n'
    const date = new Date().toISOString().slice(0, 10)
    const cols = []
    for (let i = 0; i < 7; i++) cols.push((cells[i] || '').replace(/\|/g, '\\|').trim() || ' ')
    row = `| ${date} | ${cols.join(' | ')} |`
    // Write into the same section the readers take: the last filled ## Value ledger.
    // A row appended to the empty template heading above a filled one is a row no
    // gate can see.
    const lines = md.split('\n')
    const sections = []
    let cur = null
    for (let i = 0; i < lines.length; i++) {
      if (/^##\s+Value ledger\b/i.test(lines[i])) {
        cur = { heading: i, lastTable: -1, filled: false, body: [] }
        sections.push(cur)
        continue
      }
      if (!cur) continue
      if (/^##\s+/.test(lines[i])) { cur = null; continue }
      cur.body.push(lines[i])
      if (lines[i].trim()) cur.filled = true
      if (/^\|/.test(lines[i].trim())) cur.lastTable = i
    }
    // Same choice parseValueLedger makes: the last section carrying rows, else the
    // last with a body. A row written anywhere else is a row no gate can see.
    const withRows = [...sections].reverse().find(s => valueLedgerRowCount(s.body.join('\n')))
    const target = withRows || [...sections].reverse().find(s => s.filled) || sections[sections.length - 1]
    if (!target) {
      md = appendUnderSection(md, 'Value ledger', `${VALUE_LEDGER_HEADER}\n${VALUE_LEDGER_RULE}\n${row}`)
    } else if (target.lastTable !== -1) {
      lines.splice(target.lastTable + 1, 0, row)
      md = lines.join('\n')
    } else {
      // No table under the chosen heading: a lone row would be read as the header
      // line and the value would vanish. Lay the canonical table first.
      lines.splice(target.heading + 1, 0, '', VALUE_LEDGER_HEADER, VALUE_LEDGER_RULE, row)
      md = lines.join('\n')
    }
    atomicWriteFile(p, md.endsWith('\n') ? md : md + '\n')
  })
  recordLastWrite(eng, 'delivery.md', row)
  if (!skipCommit) commitMemory(eng, 'log delivery', { files: ['delivery.md'] })
}

function retireOpenRisks(eng, needle) {
  const n = String(needle || '').toLowerCase()
  if (!n) return 0
  const p = path.join(eng, 'risks.md')
  return withFileLock(p, () => {
    const md = readEng(eng, 'risks.md')
    if (!md) return 0
    const retired = []
    const kept = []
    let inRetired = false
    for (const raw of md.split('\n')) {
      const t = raw.trim()
      if (/^#{1,6}\s+Retired\b/i.test(t)) { inRetired = true; kept.push(raw); continue }
      if (!inRetired) {
        const m = t.match(/^-\s*\[\d{4}-\d{2}-\d{2}\]\s*(?:\[@[^\]]+\]\s*)?(.*)$/)
        if (m && m[1].toLowerCase().includes(n)) {
          retired.push(raw)
          continue
        }
      }
      kept.push(raw)
    }
    if (!retired.length) return 0
    let out = kept.join('\n')
    if (!/^#{1,6}\s+Retired\b/im.test(out)) out = out.replace(/\n*$/, '\n\n## Retired\n')
    const stamp = new Date().toISOString().slice(0, 10)
    const block = retired.map(l => {
      const body = l.trim().replace(/^-\s*/, '')
      return `- [${stamp}] (retired) ${body}`
    }).join('\n')
    out = appendUnderSection(out, 'Retired', block)
    atomicWriteFile(p, out.endsWith('\n') ? out : out + '\n')
    return retired.length
  })
}

// Engagement age from the .fde/ directory's own birth time - hidden (not
// fabricated as 0) on filesystems that do not report birthtime.
function daysElapsed(eng) {
  try {
    const b = fs.statSync(eng).birthtimeMs
    if (!b) return null
    return Math.max(0, Math.floor((Date.now() - b) / 86400000))
  } catch (_) { return null }
}

// Sector/overlay badge: only shown when trust-profile.md or context.md name an
// explicit overlay in so many words - never inferred from the business domain,
// so a fintech-sounding name with no stated overlay stays badge-less.
const OVERLAY_WORDS = [['fintech', 'fintech'], ['healthcare', 'healthcare'], ['government', 'gov compliance'], ['gov compliance', 'gov compliance']]
function detectOverlay(eng) {
  const text = (readClean(eng, 'trust-profile.md') + ' ' + readClean(eng, 'context.md')).toLowerCase()
  for (const [needle, label] of OVERLAY_WORDS) if (text.includes(needle)) return label
  return ''
}

// Generic "first pipe-table in this markdown" parser - structured rows, not
// HTML. Stops at the first non-table line once the table has started, so a
// prose section (e.g. risks.md's "## Retired") after the table is never
// swept in as rows.
function parseMdTable(md) {
  // Split on unescaped pipes only, then unescape: a ledger full of "40% \| p95"
  // otherwise shifts every later cell and the table reads as a different table.
  const cells = r => r.replace(/^\s*\|/, '').replace(/(?<!\\)\|\s*$/, '')
    .split(/(?<!\\)\|/).map(c => c.replace(/\\\|/g, '|').trim())
  const isSep = r => r.includes('-') && /^\|?[\s:|-]+\|?$/.test(r.trim())
  let headers = null
  const rows = []
  for (const raw of md.split('\n')) {
    const t = raw.trim()
    // A redacted row is still a row: sealing one line must not truncate the
    // table and silently hide every row under it.
    if (t === PRIVATE_MARKER) continue
    if (!/^\|.*\|/.test(t)) { if (headers) break; continue }
    if (isSep(t)) continue
    const cs = cells(t)
    if (!headers) headers = cs
    else if (cs.some(c => c)) rows.push(cs)
  }
  return headers ? { headers, rows } : null
}
function colIndex(headers, rx) { return headers.findIndex(h => rx.test(h)) }

const {
  personFromSignalText,
  signalSubjectKey,
  isSignalNameNoise,
  nextActionLine,
  computeSignals,
  resumeTriage,
  countOpenRisks,
} = createTrustApi({
  fs, path, readClean, readEng, parseMdTable, sectionBody, SIGNAL_LEDGER, memoryDirtyManual,
  stripTemplateNoise, stripLegendLines, extractRisks,
})

// Stakeholders: columns are matched by header wording, not position - real
// files use "Name" or "Name / role", "Stance" or "Signal", with or without a
// separate Role column (see examples/garvey-payments vs examples/kesterman-
// freight). Per-person signal color: FIRST try a dated [signal:x] token from
// "## Signal history" whose bullet text mentions the person's name (latest
// date wins) - this is a best-effort text match, not a guaranteed link between
// a person and a bullet that happens to name them. No token match -> keyword
// heuristic on the stance/signal cell. No table at all -> empty, never
// fabricated.
function parseSignalHistoryEntries(eng) {
  // Format-agnostic on token position: CLI writes "[date] [signal:x] text";
  // debrief may put the token at the end. Author tags [@x] are stripped for matching.
  const md = readClean(eng, 'stakeholders.md')
  const histText = sectionBody(md, 'Signal history') + '\n' + readClean(eng, SIGNAL_LEDGER)
  const history = []
  histText.split('\n').forEach(l => {
    const dm = l.trim().match(/^-\s*\[(\d{4}-\d{2}-\d{2})\]\s*(.*)$/i)
    if (!dm) return
    const sm = dm[2].match(/\[signal:(red|amber|green)\]/i)
    if (!sm) return
    const text = dm[2]
      .replace(/\[signal:(red|amber|green)\]/i, '')
      .replace(/\[@[^\]]+\]/g, '')
      .trim()
    history.push({ date: dm[1], signal: sm[1].toLowerCase(), text })
  })
  return history
}

function displayNameFromSignalText(text) {
  const person = personFromSignalText(text)
  if (person) return person
  const t = String(text).trim()
  const words = t.split(/\s+/).filter(w => {
    const bare = w.replace(/[^A-Za-z0-9.-]/g, '')
    return bare.length >= 2 && !isSignalNameNoise(bare) && !/^(dr|mr|mrs|ms)\.?$/i.test(bare)
  })
  if (!words.length) return ''
  const proper = words.find(w => /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(w) || /^[A-Z]{2,}$/.test(w))
  if (proper && !isSignalNameNoise(proper)) return proper.replace(/[^A-Za-z0-9. -]/g, '')
  return words.slice(0, 2).join(' ').replace(/[^A-Za-z0-9. -]/g, '')
}

// Stakeholders for prep/dashboard: table rows PLUS people who only appear in
// Signal history / .signal-ledger (the common log-shaped path after debrief).
function extractStakeholders(eng) {
  const md = readClean(eng, 'stakeholders.md')
  const table = parseMdTable(md)
  const history = parseSignalHistoryEntries(eng)
  const byKey = new Map()

  if (table) {
    const { headers, rows } = table
    const nameIdx = colIndex(headers, /name|who/i)
    if (nameIdx !== -1) {
      const roleIdx = colIndex(headers, /^role$/i)
      const stanceIdx = colIndex(headers, /stance|signal/i)
      const notesIdx = colIndex(headers, /notes?/i)
      for (const cs of rows) {
        const name = (cs[nameIdx] || '').trim()
        if (!name) continue
        const role = roleIdx !== -1 ? (cs[roleIdx] || '').trim() : ''
        const stance = stanceIdx !== -1 ? (cs[stanceIdx] || '').trim() : ''
        const note = notesIdx !== -1 ? (cs[notesIdx] || '').trim() : ''
        const words = name.replace(/\([^)]*\)/g, '').split(/\s+/).filter(w => w && !/^(dr|mr|mrs|ms)\.?$/i.test(w))
        const nameKey = signalSubjectKey(name)
        let signal = null, matchedDate = null
        if (nameKey) {
          for (const h of history) {
            if (signalSubjectKey(h.text) === nameKey && (!matchedDate || h.date >= matchedDate)) {
              signal = h.signal; matchedDate = h.date
            }
          }
        }
        if (!signal) {
          const s = stance.toLowerCase()
          signal = /champion|steady|\bgreen\b/.test(s) ? 'green'
            : /resistant|hostile|blocker|\bred\b/.test(s) ? 'red'
            : 'amber'
        }
        byKey.set(signalSubjectKey(name), { name, role, note, signal, source: 'table' })
      }
    }
  }

  // Latest signal per subject; fill gaps when the FDE never filled the table.
  const latest = new Map()
  for (const h of history) {
    const key = signalSubjectKey(h.text)
    const prev = latest.get(key)
    if (!prev || h.date >= prev.date) latest.set(key, h)
  }
  for (const [key, h] of latest) {
    if (byKey.has(key)) {
      const cur = byKey.get(key)
      byKey.set(key, { ...cur, signal: h.signal, note: cur.note || maskDisplay(h.text).slice(0, 80) })
    } else {
      const name = displayNameFromSignalText(h.text)
      if (!name || isSignalNameNoise(name)) continue
      byKey.set(key, {
        name,
        role: '',
        note: maskDisplay(h.text).slice(0, 80),
        signal: h.signal,
        source: 'signal',
      })
    }
  }
  return [...byKey.values()]
}

// Risks: table rows AND dated CLI/debrief bullets. Empty template cells ignored.
function extractRisks(eng) {
  const md = stripTemplateNoise(readClean(eng, 'risks.md'))
  const body = md.split(/^#{1,6}\s+Retired\b/im)[0] || md
  const HIGH = /critical|blocker|exposure|breach|urgent|at risk|at stake|\brace\b|rollback|no test/i
  const out = []
  const seen = new Set()
  const push = (text) => {
    const t = String(text || '').trim()
    if (!t || /^(?:\[[xX]\]\s|(?:closed|resolved|retired)\s*:)/i.test(t) || seen.has(t.toLowerCase())) return
    seen.add(t.toLowerCase())
    out.push({ text: t, severity: HIGH.test(t) ? 'high' : 'med' })
  }
  const table = parseMdTable(body)
  if (table) {
    const riskIdx = colIndex(table.headers, /^risk$/i)
    if (riskIdx !== -1) {
      const statusIdx = colIndex(table.headers, /^status$/i)
      for (const cs of table.rows) {
        if (statusIdx !== -1 && /^(closed|resolved|retired)$/i.test((cs[statusIdx] || '').trim())) continue
        push(cs[riskIdx])
      }
    }
  }
  for (const raw of body.split('\n')) {
    const t = raw.trim()
    const m = t.match(/^-\s*\[\d{4}-\d{2}-\d{2}\]\s*(?:\[@[^\]]+\]\s*)?(.*)$/)
    if (m) push(m[1])
    else {
      // Inherited Markdown may predate the dated CLI format. Keep its open
      // bullets visible; absence of a date does not mean absence of a risk.
      const bullet = t.match(/^[-*+]\s+(.*)$/)
      if (bullet && !/^\[[xX]\]\s/.test(bullet[1])) push(bullet[1].replace(/^\[ \]\s*/, ''))
    }
  }
  return out
}

// Best-effort scan for "before -> after" metric callouts in delivery/decisions
// prose (e.g. "94.1% row parity day one -> 98.8% by ..."). Only kept when both
// sides look like real numbers/percentages, deduped by value pair, capped at
// 4; nothing reliable found -> the widget stays empty, never an invented number.
function extractStats(eng) {
  const text = readClean(eng, 'delivery.md') + '\n' + readClean(eng, 'decisions.md')
  const patterns = [
    /(\d+(?:\.\d+)?%)[^\n%]{0,40}?(?:→|->)[^\n%]{0,20}?(\d+(?:\.\d+)?%)/g, // "X% ... -> Y%"
    /(\d+(?:\.\d+)?%)\s+to\s+(\d+(?:\.\d+)?%)/gi,                               // "X% to Y%"
    /from\s+([\d.]+\s?[a-zA-Z]{0,6}%?)\s+to\s+([\d.]+\s?[a-zA-Z]{0,6}%?)/gi,     // "from X to Y" / "reduced from X to Y"
  ]
  const seen = new Set(); const stats = []
  for (const rx of patterns) {
    let m
    while ((m = rx.exec(text))) {
      const from = m[1].trim(), to = m[2].trim()
      if (!from || !to || from === to) continue
      const key = from + '→' + to
      if (seen.has(key)) continue
      seen.add(key)
      const pre = text.slice(Math.max(0, m.index - 40), m.index)
      const label = pre.split(/\s+/).filter(Boolean).slice(-3).join(' ').replace(/^[,:;.\-]+|[,:;.\-]+$/g, '') || 'metric'
      stats.push({ label, from, to })
    }
  }
  return stats.slice(0, 4)
}

// Unified dated log: merges (a) plain "- [date] text" bullets - the exact
// shape `fde log`/`fde debrief` write mechanically, so this MUST be supported
// - found in decisions.md, delivery.md, risks.md's "## Retired" section and
// stakeholders.md's "## Signal history" section; with (b) the human-authored
// "### [date] title" / "## date - title" decision headers seen in real
// decisions.md files. Sorted newest first, capped for the panel.
function extractLog(eng) {
  const FLAT = /^-\s*\[(\d{4}-\d{2}-\d{2})\]\s*(.+)$/
  const entries = []
  const push = (date, text, kind) => {
    const sig = (text.match(/\[signal:(red|amber|green)\]/i) || [])[1] || ''
    text = text.replace(/\[signal:(red|amber|green)\]\s*/i, '').trim()
    if (date && text) entries.push({ date, text, kind, sig: sig.toLowerCase() })
  }

  readClean(eng, 'decisions.md').split('\n').forEach(l => {
    const t = l.trim()
    const fm = t.match(FLAT); if (fm) { push(fm[1], fm[2], 'decision'); return }
    const bm = t.match(/^#{2,3}\s*\[(\d{4}-\d{2}-\d{2})\]\s*(.+)$/); if (bm) { push(bm[1], bm[2], 'decision'); return }
    const dm = t.match(/^#{2,3}\s*(\d{4}-\d{2}-\d{2})\s*-\s*(.+)$/); if (dm) push(dm[1], dm[2], 'decision')
  })
  readClean(eng, 'delivery.md').split('\n').forEach(l => {
    const m = l.trim().match(FLAT); if (m) push(m[1], m[2], 'receipt')
  })
  sectionBody(readClean(eng, 'risks.md'), 'Retired').split('\n').forEach(l => {
    const m = l.trim().match(FLAT); if (m) push(m[1], m[2], 'receipt')
  })
  const signalLog = sectionBody(readClean(eng, 'stakeholders.md'), 'Signal history') + '\n' + readClean(eng, SIGNAL_LEDGER)
  signalLog.split('\n').forEach(l => {
    const m = l.trim().match(FLAT); if (m) push(m[1], m[2], 'note')
  })

  entries.sort((a, b) => b.date.localeCompare(a.date))
  // `fde log contact` records one entry in two places (stakeholders.md "Signal
  // history" and .signal-ledger); the timeline reads both, so collapse identical
  // rows or the same note renders twice and looks like a double write.
  const seen = new Set()
  return entries.filter(e => {
    // The signal is part of the event: the same note logged amber then red on
    // one day is an escalation, not a duplicate.
    const key = `${e.kind}|${e.date}|${e.sig}|${e.text}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 15)
}

// ---------- commands ----------

function cmdScan() {
  const cwd = process.cwd()
  const isGit = !!sh('git rev-parse --git-dir')
  const out = []
  out.push('FDE RECON - ' + path.basename(cwd))
  out.push('local only · git + file reads · no AI, no network - nothing leaves this machine')
  out.push('='.repeat(60))

  // stack + age
  const files = walk(cwd, CONF_EXT.concat(['.md']), 5000)
  const extCount = {}
  for (const f of files) { const e = path.extname(f); extCount[e] = (extCount[e] || 0) + 1 }
  const langs = Object.entries(extCount).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([e, n]) => `${e}:${n}`).join(' ')
  const birth = isGit ? sh('git log --reverse --format=%ad --date=short').split('\n')[0] : 'n/a'
  const last = isGit ? sh('git log -1 --format=%ad --date=short') : 'n/a'
  out.push(`STACK  ${langs || 'no code files found'}   first commit: ${birth}   last: ${last}`)

  // churn × tests = the load-bearing walls
  out.push('\nHOTSPOTS (churn 90d × test coverage) - handle with care:')
  let firstUntested = ''
  if (isGit) {
    const churn = sh("git log --since='90 days ago' --name-only --pretty=format:") || ''
    const counts = {}
    churn.split('\n').filter(Boolean).forEach(f => { counts[f] = (counts[f] || 0) + 1 })
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
    const testFiles = files.filter(f => /test|spec/i.test(f))
    if (top.length === 0) out.push('  (no commits in the last 90 days)')
    for (const [f, n] of top) {
      const base = path.basename(f).replace(/\.[^.]+$/, '')
      const tested = testFiles.some(t => t.includes(base))
      if (!tested && !firstUntested) firstUntested = f
      out.push(`  ${String(n).padStart(3)} commits/90d  ${f}  ${tested ? '' : '⚠ NO TEST NEIGHBOR'}`)
    }
  } else out.push('  (not a git repo - churn unavailable)')

  // temporary archaeology
  out.push('\n"TEMPORARY" ARCHAEOLOGY (permanent code with an excuse):')
  const codeFiles = files.filter(f => CODE_EXT.includes(path.extname(f)))
  const tmp = grepFiles(codeFiles, /HACK|FIXME|XXX|temporar|for now|remove this|remove after|workaround/i, 15)
  tmp.length ? tmp.forEach(h => out.push(`  ${h.file}:${h.line}  ${h.text}`)) : out.push('  none found')

  // AI components - they fail silently
  out.push('\nAI COMPONENTS (no exception fires when these drift):')
  // NOTE: bare "inference" is banned from this regex - TypeScript codebases are
  // full of "type inference" comments and the false positives poison the day-1
  // questions. Model inference only, in explicit forms.
  const ai = grepFiles(codeFiles, AI_CODE_RE, 10)
  ai.length ? ai.forEach(h => out.push(`  ${h.file}:${h.line}  ${h.text}`)) : out.push('  none found')
  // The eval gate reads the record, not the repo. A finding here that never
  // reaches .fde/ leaves ship/close green with no eval - so say the next move.
  if (ai.length) {
    out.push('  → the ship gate reads the record, not this scan. Put it there:')
    out.push(`    fde log decision "AI in scope: ${path.basename(ai[0].file)} calls a model - eval receipt required before ship"`)
  }

  // secrets (redacted)
  out.push('\nPOSSIBLE HARDCODED SECRETS (values redacted):')
  const confFiles = files.filter(f => CONF_EXT.includes(path.extname(f)) || path.basename(f) === '.env')
  const sec = grepFiles(confFiles, /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}/i, 10)
    .filter(h => !/example|template|test|sample|placeholder/i.test(h.file + h.text))
  sec.length
    ? sec.forEach(h => out.push(`  ${h.file}:${h.line}  ${h.text.replace(/(['"])[^'"]+(['"])/, '$1REDACTED$2')}`))
    : out.push('  none found')
  out.push('  (grep-grade check - run gitleaks or trufflehog for real secret coverage)')

  // previous attempts - the political archaeology
  out.push('\nPREVIOUS ATTEMPTS (ask who ran these, and what happened):')
  const reverts = isGit ? sh("git log --oneline -i --grep=revert --grep=rollback") : ''
  const readmeHits = grepFiles(files.filter(f => /readme/i.test(f)), /revert|rewrite|attempted|abandoned|deprecated/i, 5)
  if (reverts) reverts.split('\n').slice(0, 5).forEach(l => out.push('  git: ' + l))
  readmeHits.forEach(h => out.push(`  ${h.file}:${h.line}  ${h.text}`))
  if (!reverts && readmeHits.length === 0) out.push('  none visible')

  // test landscape
  const testCount = files.filter(f => /test|spec/i.test(f)).length
  out.push(`\nTEST LANDSCAPE  ${testCount} test file(s) across ${codeFiles.length} code files`)

  // day-1 questions - each one earned by a finding above, skipped when empty
  out.push('\nASK ON DAY 1:')
  const asks = []
  if (reverts || readmeHits.length) asks.push('Who ran the previous attempt(s), and what happened to them?')
  if (firstUntested) asks.push(`What breaks when ${firstUntested} changes, and who owns it?`)
  if (ai.length) asks.push(`How would anyone notice if ${ai[0].file}'s model output drifted?`)
  if (sec.length) asks.push('What is the secret-rotation story?')
  if (tmp.length) asks.push("Which of these 'temporary' fixes are now load-bearing contracts?")
  asks.length
    ? asks.slice(0, 5).forEach((q, i) => out.push(`  ${i + 1}. ${q}`))
    : out.push('  (clean scan - ask what the last engineer wished they had known)')

  out.push('\n' + '-'.repeat(60))
  out.push("Facts only - interpretation is the FDE's (or @fde's) job.")
  console.log(out.join('\n'))
}

function cmdResume(args) {
  let maxBytes
  try { ({ args, maxBytes } = context.budgetArgs(args)) } catch (e) { console.error(e.message); process.exit(2) }

  const initIdx = args.indexOf('--init')
  if (initIdx !== -1) {
    const name = args[initIdx + 1]
    if (!name) { console.error('usage: fde resume --init <engagement-name>'); process.exit(1) }
    const tpl = templatesDir()
    if (!tpl) { console.error('templates not found - run from the fdeops clone or reinstall'); process.exit(1) }
    const slug = slugify(name)
    const engRoot = path.join(ENGAGEMENTS_ROOT, slug)
    const fdeDir = path.join(engRoot, '.fde')
    const existed = fs.existsSync(fdeDir)

    // Optional stubs (AI eval pack, …) stay in templates/ for copy-on-use - not day-1 scaffold.
    const SKIP_INIT_TEMPLATES = new Set(['evals.md'])
    const fillTemplates = (destFde) => {
      for (const f of fs.readdirSync(tpl)) {
        if (SKIP_INIT_TEMPLATES.has(f)) continue
        const src = path.join(tpl, f); const dst = path.join(destFde, f)
        if (fs.statSync(src).isDirectory()) fs.mkdirSync(dst, { recursive: true })
        else if (!fs.existsSync(dst)) fs.copyFileSync(src, dst)
      }
      fs.mkdirSync(path.join(destFde, 'retrospectives'), { recursive: true })
    }

    try {
      const installPaths = require('./lib/install-paths')
      installPaths.checkTree(tpl, fdeDir)
      if (!existed) {
        // Stage only the fieldbook. A pre-existing client folder can contain
        // contracts or source files that initialization must never remove.
        installPaths.mkdir(engRoot)
        const stagingRoot = fs.mkdtempSync(path.join(ENGAGEMENTS_ROOT, `.init-${slug}-`))
        const stagingFde = path.join(stagingRoot, '.fde')
        try {
          fs.mkdirSync(stagingFde)
          fillTemplates(stagingFde)
          fs.renameSync(stagingFde, fdeDir)
        } finally {
          rmTreeQuiet(stagingRoot)
        }
      } else {
        // Re-init only fills missing templates; existing records are preserved.
        fillTemplates(fdeDir)
      }
    } catch (e) {
      failFs(e, 'init engagement', fdeDir)
    }

    // bind THIS workspace to the engagement (zero ceremony next time).
    // A workspace binds to exactly ONE engagement: rebinding REPLACES the old
    // line - resolution is first-match-wins, so appending a second line would
    // leave the stale binding winning and silently write to the wrong client.
    const cwd = process.cwd()
    const prev = readRegistry().find(r => r.workspace === cwd)
    const kept = readRegistry().filter(r => r.workspace !== cwd).map(r => `${r.workspace} ${r.slug}`)
    kept.push(`${cwd} ${slug}`)
    let bindErr = null
    // soft: an unwritable registry must not process.exit() from inside the lock -
    // that skipped the finally and left a stale .registry.lock behind.
    try {
      withFileLock(REGISTRY, () => { atomicWriteFile(REGISTRY, kept.join('\n') + '\n', { soft: true }) }, { soft: true })
    } catch (e) { bindErr = e }
    if (bindErr || !readRegistry().some(r => r.workspace === cwd && r.slug === slug)) {
      // Silently unbound is the worst outcome: the memory exists, every later
      // command says NO ENGAGEMENT, and nothing said why.
      console.log(`ENGAGEMENT READY: ${fdeDir}`)
      process.stderr.write(
        `could not bind this workspace - ${REGISTRY} is not writable${bindErr ? ` (${bindErr.code || bindErr.message})` : ''}.\n` +
        `  fix the file (it must be a regular file), or work with: export FDEOPS_ENGAGEMENT=${fdeDir}\n`
      )
      try { fs.unlinkSync(REGISTRY + '.lock') } catch (_) {}
      process.exit(1)
    }
    console.log(`ENGAGEMENT READY: ${fdeDir}\nbound to workspace: ${cwd}`)
    if (prev && prev.slug !== slug) console.log(`rebound: this workspace previously wrote to "${prev.slug}" - that memory is untouched; sessions here now write to "${slug}"`)
    // NDA surface: engagement notes must not silently leave the machine via file sync
    const syncHit = /icloud|mobile documents|dropbox|onedrive|google drive|box sync/i.exec(ENGAGEMENTS_ROOT)
    if (syncHit) console.log(`⚠ engagements root is inside a synced folder ("${syncHit[0]}") - client notes will leave this machine via sync. See PRIVACY.md.`)
    // Tamper-evident fieldbook: version .fde/ with git (local only, no remote).
    if (ensureMemoryGit(fdeDir)) {
      const owner = readOwner(fdeDir)
      const head = memoryHead(fdeDir)
      console.log(`memory git: ${head || 'ready'}${owner ? `  owner: ${owner.email}` : ''}`)
    }
    return
  }
  if (args[0] === '--bind') {
    // inspection: what does THIS workspace resolve to, and why
    const cwd = process.cwd()
    const reg = readRegistry().find(r => r.workspace === cwd)
    const eng = resolveEngagement()
    console.log(`workspace: ${cwd}`)
    console.log(`registry:  ${reg ? `${reg.slug} (${path.join(ENGAGEMENTS_ROOT, reg.slug, '.fde')})` : '(not bound)'}`)
    console.log(`resolves:  ${eng || '(nothing - run: fde resume --init <client>)'}`)
    return
  }
  const eng = resolveEngagement()
  if (!eng) {
    const list = fs.existsSync(ENGAGEMENTS_ROOT)
      ? fs.readdirSync(ENGAGEMENTS_ROOT).sort()
        .filter(d => !d.startsWith('.') && fs.existsSync(path.join(ENGAGEMENTS_ROOT, d, '.fde')))
        .join(', ') || '(none yet)'
      : '(none yet)'
    console.log(`NO ENGAGEMENT for this workspace.\nexisting: ${list}\nAsk the human the client name (one question), then run: fde resume --init <client-name>\nDo not tell them to type that command.`)
    process.exit(2)
  }
  const intro = [resumeTriage(eng), firstActionLine(eng), ...hygieneTriageLines(eng), ...recordDigest(eng)].join('\n')
  const ctx = readClean(eng, 'context.md')
  if (args.includes('--full')) {
    console.log(`${intro}\n\nENGAGEMENT: ${eng}\n\n${ctx || '(no context.md yet)'}`)
    return
  }
  // Bound the complete command output, not only context.md's line count.
  // Separate allocations keep a long history from crowding out current goals.
  const policy = readClean(eng, 'trust-profile.md')
  const success = readClean(eng, 'success.md')
  const risks = readClean(eng, 'risks.md')
  process.stdout.write(maskedSections([
    policy ? `CLIENT POLICY - trust-profile.md\n${policy}` : '',
    `${intro}\n\nENGAGEMENT: ${eng}`,
    success ? `CURRENT GOALS & ACCEPTANCE - success.md\n${success}` : '',
    risks ? `OPEN RISKS - risks.md\n${extractRisks(eng).map(r => r.text).join('\n') || '(none recorded)'}` : '',
    `VALUE LEDGER - delivery.md\n${parseValueLedger(eng).rows.map(r => formatValueLedgerLine(r) + '; source: ' + (r.evidence || '(missing)')).join('\n') || '(none recorded)'}`,
    `WORKING CONTEXT - context.md\n${ctx ? resumeView(ctx) : '(no context.md yet)'}`,
  ], maxBytes))
}

// Token discipline: context.md grows every session (the session-stop hook
// appends a snapshot). Loading the whole file on every resume costs more tokens
// each day for less marginal signal. This returns a bounded view - the curated
// head (state / next action) plus the most recent activity - and hides the
// middle of the log behind `fde resume --full`. Pure code, zero model tokens.
// The session-start hook consumes this same view through fde resume.
function resumeView(md) {
  const lines = md.split('\n')
  // A file ending in "\n" yields a trailing "" here; drop it so the line count
  // counts content lines rather than the terminal newline.
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  if (lines.length <= 160) return md
  // Anchor on the "## Session end" heading, NOT the "<!-- fdeops auto-capture -->"
  // comment: this text is read via readClean (stripPrivate strips HTML comments),
  // so the comment is gone by the time we get here. The heading is written on the
  // very next line by cmdCapture and the session-stop hook and survives redaction.
  // Bound after sanitation so removed comments cannot shift the anchor.
  let headEnd = lines.findIndex(l => /^##\s+Session end\b/.test(l.trim()))
  if (headEnd === -1) headEnd = 120
  headEnd = Math.min(headEnd, 120)
  const tailStart = Math.max(headEnd, lines.length - 40)
  const hidden = tailStart - headEnd
  if (hidden <= 0) return md
  const head = lines.slice(0, headEnd).join('\n').replace(/\s+$/, '')
  const tail = lines.slice(tailStart).join('\n').trim()
  return `${head}\n\n_(\u2026 ${hidden} lines of earlier session log hidden \u2014 \`fde resume --full\` or open context.md for the full history)_\n\n${tail}`
}

function cmdLogUndo() {
  const eng = resolveEngagement({ forWrite: true })
  if (!eng) { console.error('no engagement - run: fde resume --init <name>'); process.exit(2) }
  const metaPath = path.join(eng, LAST_WRITE)
  let meta
  try {
    withFileLock(metaPath, () => {
      try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) } catch (_) {
        throw new Error('nothing to undo - no prior fde log/debrief write recorded')
      }
      if (!Object.values(LOG_FILES).includes(meta.file) || !meta.entry) {
        throw new Error('corrupt .last-write - cannot undo')
      }
      const target = path.join(eng, meta.file)
      withFileLock(target, () => {
        const after = removeExactEntryLine(readEng(eng, meta.file), meta.entry)
        if (after == null) {
          throw new Error(`cannot undo - entry no longer in ${meta.file} (edited by hand?). Remove it manually.`)
        }
        atomicWriteFile(target, after.endsWith('\n') ? after : after + '\n', { soft: true })
      }, { soft: true })
      if (/\[signal:(red|amber|green)\]/i.test(meta.entry)) {
        const ledgerPath = path.join(eng, SIGNAL_LEDGER)
        withFileLock(ledgerPath, () => {
          const led = removeExactEntryLine(readEng(eng, SIGNAL_LEDGER), meta.entry)
          if (led != null) atomicWriteFile(ledgerPath, led.endsWith('\n') ? led : led + '\n', { soft: true })
        }, { soft: true })
      }
      try { fs.unlinkSync(metaPath) } catch (_) {}
    })
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
  const undoFiles = [meta.file]
  if (/\[signal:(red|amber|green)\]/i.test(meta.entry)) undoFiles.push(SIGNAL_LEDGER)
  const hash = commitMemory(eng, `undo ${meta.file}`, { files: undoFiles })
  console.log(`undid last write → ${meta.file}${hash ? ` @${hash}` : ''}`)
}

function cmdLog(args) {
  args = args.slice()
  if (args[0] === '--undo') { cmdLogUndo(); return }
  let force = false
  const forceIdx = args.indexOf('--force')
  if (forceIdx !== -1) { force = true; args.splice(forceIdx, 1) }
  // --signal red|amber|green (contact only) → structured token computeSignals trusts
  let signal = ''
  const sigIdx = args.indexOf('--signal')
  if (sigIdx !== -1) {
    signal = (args[sigIdx + 1] || '').toLowerCase()
    if (!['red', 'amber', 'green'].includes(signal)) { console.error('usage: fde log contact <text> --signal red|amber|green'); process.exit(1) }
    args.splice(sigIdx, 2)
  }
  let retire = false
  const retireIdx = args.indexOf('--retire')
  if (retireIdx !== -1) { retire = true; args.splice(retireIdx, 1) }
  const type = args[0]; const text = args.slice(1).join(' ')
  const eng = resolveEngagement({ forWrite: true })
  if (!eng) { console.error('no engagement - run: fde resume --init <name>'); process.exit(2) }

  // fde log phase <land|discover|plan|ship|outcome|close> - advances portfolio phase (prove → outcome)
  if (type === 'phase') {
    const phase = canonicalPhase((text || '').toLowerCase().trim())
    if (!PHASES.includes(phase)) {
      console.error(`usage: fde log phase <${PHASES.join('|')}>`)
      process.exit(1)
    }
    const hash = setContextPhase(eng, phase)
    console.log(`phase → ${phase}${hash ? ` @${hash}` : ''}`)
    return
  }

  if (!LOG_FILES[type] || !text) { console.error(`usage: fde log <decision|risk|delivery|contact> <text> [--signal red|amber|green] [--force]\n       fde log risk --retire <text>\n       fde log phase <${PHASES.join('|')}>\n       fde log --undo`); process.exit(1) }
  if (signal && type !== 'contact') { console.error('--signal only applies to: fde log contact'); process.exit(1) }
  if (retire && type !== 'risk') { console.error('--retire only applies to: fde log risk'); process.exit(1) }
  const hit = findSecretHit(text)
  if (hit && !force) { refuseSecret('log text', hit); process.exit(1) }
  if (hit && force) console.error(`warning: logging possible ${hit} (--force)`)
  if (retire) {
    const n = retireOpenRisks(eng, text)
    if (!n) { console.error(`no open risk matched ${JSON.stringify(text)}`); process.exit(1) }
    const hash = commitMemory(eng, 'retire risk', { files: ['risks.md'] })
    console.log(`retired ${n} risk(s) → risks.md${hash ? ` @${hash}` : ''}`)
    return
  }
  if (type === 'delivery' && text.includes('|')) {
    let cells
    try { cells = deliveryCells(text) } catch (error) { console.error(error.message); process.exitCode = 1; return }
    appendValueLedgerRow(eng, cells)
    const hash = memoryHead(eng)
    console.log(`logged → delivery.md (value ledger)${hash ? ` @${hash}` : ''}`)
    return
  }
  const date = new Date().toISOString().slice(0, 10)
  const entry = datedEntry(eng, date, text, signal || '')
  appendLogEntry(eng, type, entry)
  const hash = memoryHead(eng)
  console.log(`logged → ${LOG_FILES[type]}${signal ? ` (signal:${signal})` : ''}${hash ? ` @${hash}` : ''}`)
  // A dated bullet is a note; the ship gate reads the ledger. Say what this did
  // NOT do, once, so promised→measured→accepted does not quietly stay unassembled.
  if (type === 'delivery' && !parseValueLedger(eng).rows.length) {
    console.log('  note: no value ledger row yet - "accepted by" is what a sponsor argues with. Add the row in delivery.md ## Value ledger (promised | measured | accepted by).')
  }
  if (type === 'contact' && !signal) {
    console.log('  note: no --signal, so trust is unchanged - prep and status show people who carry a signal.')
  }
}

function setContextPhase(eng, phase) {
  ensureMemoryGit(eng)
  const p = path.join(eng, 'context.md')
  withFileLock(p, () => {
    let md = readEng(eng, 'context.md')
    if (!md) md = '# Engagement context\n\n'
    if (/\*\*Phase:\*\*/i.test(md)) {
      md = md.replace(/\*\*Phase:\*\*\s*.*/i, `**Phase:** ${phase}`)
    } else {
      md = md.replace(/\n*$/, `\n\n**Phase:** ${phase}\n`)
    }
    const today = new Date().toISOString().slice(0, 10)
    if (/\*\*Last updated:\*\*/i.test(md)) {
      md = md.replace(/\*\*Last updated:\*\*\s*.*/i, `**Last updated:** ${today}`)
    }
    atomicWriteFile(p, md.endsWith('\n') ? md : md + '\n')
  })
  const hash = commitMemory(eng, `phase ${phase}`, { files: ['context.md'] })
  // Proactive warn at the moment it matters - don't wait for Monday hygiene.
  if (phase === 'ship' || phase === 'close') {
    const open = countOpenRisks(eng)
    if (open > 0) {
      process.stderr.write(
        `⚠ phase → ${phase} with ${open} open risk(s) still live - retire, hand off, or keep them intentional\n` +
        '  say "@fde clean up the fieldbook" to walk the list (or: fde doctor)\n'
      )
    }
  }
  return hash
}


// Meeting notes → structured memory. Deterministic routing, zero AI: lines that
// start with decision:/risk:/delivery:/contact:/next: (case-insensitive) go to
// their LOG_FILES target as dated bullets; everything else lands in context.md
// as one dated debrief block. contact: lines may carry an inline [signal:x]
// token anywhere in the text - preserved verbatim so computeSignals can trust it.
// --smart: thin heuristic propose (existing prefixes + light keywords). Not a
// brain - the agent rewrites .debrief-propose with prefixes; --apply commits.
// --dry-run prints the routing without writing anything.
function inferContactSignal(text) {
  const t = String(text)
  if (/\b(hostile|blocker|fired|refused|walked out|\bred\b|escalat(?:ed|ion) to (?:cto|legal))\b/i.test(t)) return 'red'
  if (/\b(gone quiet|unresponsive|skipped|cooling|seemed cold|no-show|missed the|amber)\b/i.test(t)) return 'amber'
  if (/\b(champion|helping|opened the|warming|supportive|on board|\bgreen\b|saw demo)\b/i.test(t)) return 'green'
  return ''
}

function looksLikePersonLine(text) {
  // "Denise …" / "Randy opened…" - capitalized subject + field verb.
  return /^[A-Z][a-z]{1,20}\b/.test(text) &&
    /\b(helping|quiet|skipped|said|will|opened|resistant|champion|warm|cold|unresponsive|demo|sheet|slack)\b/i.test(text)
}

function smartProposeText(input) {
  const out = []
  for (const raw of input.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    let bare = line
      .replace(/^[-*+]\s+/, '')
      .replace(/^\*\*(decision|risk|delivery|contact|next):?\*\*:?\s*/i, '$1: ')
    if (/^decided:\s+/i.test(bare)) {
      out.push(`decision: ${bare.replace(/^decided:\s+/i, '')}`)
      continue
    }
    if (/^(decision|risk|delivery|contact|next|signer):\s*/i.test(bare)) {
      let routed = bare.replace(/^(decision|risk|delivery|contact|next|signer):\s*/i, (m, t) => `${t.toLowerCase()}: `)
      if (/^contact:/i.test(routed) && !/\[signal:(red|amber|green)\]/i.test(routed)) {
        const sig = inferContactSignal(routed)
        if (sig) routed = routed.replace(/\s*$/, ` [signal:${sig}]`)
      }
      out.push(routed)
      continue
    }
    // Sentence-level: a signer named mid-paragraph gets its own routed line and
    // the original stays as context, so nothing is invented or lost.
    for (const sentence of bare.split(/(?<=[.!?])\s+/)) {
      const who = signerFromLine(sentence)
      if (who) {
        const source = (bare.match(/\[source:\s*[^\]]+\]/i) || [])[0] || ''
        out.push(`signer: ${who}${source ? ` ${source}` : ''}`); break
      }
    }
    if (/^(next action|follow-?ups?|action items?|todo):\s*/i.test(bare) ||
        /\b(next action|walk in with|follow up with)\b/i.test(bare)) {
      const next = bare.replace(/^(next action|follow-?ups?|action items?|todo):\s*/i, '').trim()
      out.push(`next: ${next}`)
      continue
    }
    if (/^(?:scope|proposed scope|out of scope):\s*/i.test(bare)) {
      out.push(`scope: ${bare}`)
      continue
    }
    if (/\b(?:we need|we want|customer asks?|customer asked|please|can you|could you)\b/i.test(bare)) {
      out.push(`ask: ${bare}`)
      continue
    }
    if (/\b(we (decided|agreed)|decided:|decision:|descope|agreed to|agreement was|freeze scope|freeze prompts)\b/i.test(bare)) {
      out.push(`decision: ${bare}`)
    } else if (/\b(open question|who signs|unclear who|unresolved)\b/i.test(bare)) {
      out.push(`risk: ${bare}`)
    } else if (/\b(risk|blocker|concern|at risk|worried|exposure|mitigation|no tested|no rollback)\b/i.test(bare)) {
      out.push(`risk: ${bare}`)
    } else if (/\b(shipped|delivered|deployed|merged PR|rolled out|went live)\b/i.test(bare)) {
      out.push(`delivery: ${bare}`)
    } else if (looksLikePersonLine(bare) ||
               /\b(gone quiet|champion|resistant|unresponsive|skipped|cooling|signal:)\b/i.test(bare)) {
      const sig = inferContactSignal(bare)
      out.push(sig ? `contact: ${bare} [signal:${sig}]` : `contact: ${bare}`)
    } else {
      out.push(bare)
    }
  }
  return out.join('\n') + (out.length ? '\n' : '')
}

// Kickoff English, not only "signer: Priya". "Helena signs off", "Anand Mehta
// has final say", "Finance controller (Helena) signs off" all have to fill
// success.md - that is the line Monday's RECORD reads.
const SIGNER_VERB = '(?:signs?(?:\\s+off)?|approves|has (?:the )?final say|can say yes|owns the decision|is the (?:sponsor|signer|decision[- ]maker))'
const SIGNER_NAME = '([A-Z][\\w.\'-]+(?:\\s+[A-Z][\\w.\'-]+){0,3})'
const NOT_A_PERSON = /^(The|This|That|It|We|They|She|He|Staging|Budget|Prod|Production|Nobody|Someone|Everyone|Finance|Legal|Security|Platform|Engineering)\b/
const ROLE_TOKEN = /\b(VP|SVP|EVP|CTO|CFO|COO|CEO|CISO|Eng|Engineer|Director|Lead|Head|Manager|Controller|Ops|Legal|Finance|Sponsor)\b/i

function looksLikePersonName(s) {
  const t = String(s || '').trim()
  if (!t || NOT_A_PERSON.test(t) || ROLE_TOKEN.test(t)) return false
  return /^[A-Z][\w.'-]+(?:\s+[A-Z][\w.'-]+){0,2}$/.test(t)
}

function signerFromLine(text) {
  const t = String(text || '').replace(/^[-*+]\s+/, '').trim()
  if (!t || /\?|\b(?:not|nobody|unclear|maybe|might|whether|could|should|if|unless|pending|unconfirmed)\b/i.test(t)) return ''
  // "Priya (VP Eng) signs off" → Priya. "Finance controller (Helena) signs off" → Helena.
  const titled = t.match(new RegExp('\\b' + SIGNER_NAME + '\\s+\\(' + SIGNER_NAME + '\\)\\s+' + SIGNER_VERB + '\\b'))
  if (titled) {
    const before = titled[1].trim()
    const inside = titled[2].trim()
    if (looksLikePersonName(before) && ROLE_TOKEN.test(inside)) return before
    if (looksLikePersonName(inside)) return inside
    if (looksLikePersonName(before)) return before
  }
  const paren = t.match(new RegExp('\\(' + SIGNER_NAME + '\\)\\s+' + SIGNER_VERB + '\\b'))
  if (paren && looksLikePersonName(paren[1])) return paren[1].trim()
  const named = t.match(new RegExp('\\b' + SIGNER_NAME + '\\s+' + SIGNER_VERB + '\\b'))
  if (!named) return ''
  const who = named[1].trim()
  return looksLikePersonName(who) ? who : ''
}

function setSigner(eng, who) {
  ensureMemoryGit(eng)
  const p = path.join(eng, 'success.md')
  return withFileLock(p, () => {
    let md = readEng(eng, 'success.md')
    if (!md) md = '# Success definition\n\n'
    const norm = (s) => String(s).replace(/\s+/g, ' ').trim().toLowerCase()
    // [^\S\n], not \s: \s crosses newlines, so an empty field captured the next
    // line - and setSigner then read a filled field and filed the name as "also
    // named" under whatever heading followed.
    const line = /^\*\*Stakeholder who signs off:\*\*[^\S\n]*(.*)$/m
    const m = md.match(line)
    if (m && !m[1].trim()) {
      md = md.replace(line, `**Stakeholder who signs off:** ${who}`)
    } else if (m) {
      // Whole-name compare against the primary and every "also named" line under
      // it: "Sam" must not vanish inside "Samantha", and re-applying must not
      // stack duplicates.
      const start = md.indexOf(m[0]) + m[0].length
      const alsoNamed = []
      for (const l of md.slice(start).split('\n').slice(1)) {
        const a = l.match(/^- also named:\s*(.+)$/)
        if (!a) break
        alsoNamed.push(a[1])
      }
      const known = [m[1], ...alsoNamed].map(norm)
      if (known.includes(norm(who))) return false
      // A second, different name is a fact worth keeping next to the first, not
      // a silent overwrite - who signs is exactly the thing people argue about.
      const block = [m[0], ...alsoNamed.map(a => `- also named: ${a}`)].join('\n')
      md = md.replace(block, `${block}\n- also named: ${who}`)
    } else {
      md = md.replace(/\n*$/, `\n\n**Stakeholder who signs off:** ${who}\n`)
    }
    atomicWriteFile(p, md.endsWith('\n') ? md : md + '\n')
    return true
  })
}

function setNextAction(eng, text) {
  ensureMemoryGit(eng)
  const bullet = `- ${stripControlChars(String(text).replace(/^[-*]\s+/, '').trim())}`
  const p = path.join(eng, 'context.md')
  withFileLock(p, () => {
    let md = readEng(eng, 'context.md')
    if (!md) md = '# Engagement context\n\n'
    // Collapse duplicate ## Next action headings (skill-append trap) into one.
    md = stripAllSections(md, 'Next action')
    if (/^##\s+Current state\b/im.test(md)) {
      md = md.replace(
        /(^##\s+Current state\b[^\n]*\n)([\s\S]*?)(?=^##\s|\s*$)/im,
        (_, h, body) => `${h}${String(body).replace(/\n*$/, '\n')}\n## Next action\n\n${bullet}\n\n`
      )
    } else {
      md = md.replace(/\n*$/, `\n\n## Next action\n\n${bullet}\n`)
    }
    atomicWriteFile(p, md.endsWith('\n') ? md : md + '\n')
  })
}

function looksLikeBinaryNoise(text) {
  const s = String(text || '')
  if (!s) return false
  if (s.includes('\0')) return true
  const sample = s.slice(0, 8192)
  let ctrl = 0
  let replacement = 0
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i)
    if (c === 0xfffd) replacement++
    if (c === 9 || c === 10 || c === 13) continue
    if (c < 32 || (c >= 0x7f && c <= 0x9f)) ctrl++
  }
  if (!sample.length) return false
  // Mostly-control or high U+FFFD density = urandom / binary mistyped as text.
  return (ctrl / sample.length) > 0.05 || (replacement / sample.length) > 0.1
}

function readDebriefInput(args) {
  let input = ''
  if (args[0]) {
    const notesPath = args[0].replace(/^~/, HOME)
    let st
    try { st = fs.statSync(notesPath) } catch (_) { throw new Error(`cannot read ${args[0]}`) }
    if (st.size > DEBRIEF_MAX_BYTES) {
      throw new Error(`debrief refused: ${args[0]} is ${st.size} bytes (max ${DEBRIEF_MAX_BYTES}). Split the notes or paste the relevant section.`)
    }
    let buf
    try { buf = fs.readFileSync(notesPath) } catch (_) { throw new Error(`cannot read ${args[0]}`) }
    if (buf.includes(0) || looksLikeBinaryNoise(buf.toString('utf8'))) {
      throw new Error(`debrief refused: ${args[0]} looks binary or mostly non-printable. Paste text notes only.`)
    }
    input = buf.toString('utf8')
  } else {
    let buf
    try { buf = fs.readFileSync(0) } catch (_) { buf = Buffer.alloc(0) }
    if (Buffer.byteLength(buf) > DEBRIEF_MAX_BYTES) {
      throw new Error(`debrief refused: stdin is over ${DEBRIEF_MAX_BYTES} bytes. Split the notes.`)
    }
    if (buf.includes(0) || looksLikeBinaryNoise(buf.toString('utf8'))) {
      throw new Error('debrief refused: stdin looks binary or mostly non-printable. Paste text notes only.')
    }
    input = buf.toString('utf8')
  }
  return stripControlChars(input)
}

function previewLine(text, max = 240) {
  text = masking.mask(text)
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}… (${t.length} chars)`
}

function writeProposal(eng, text, { replace = false, locked = false } = {}) {
  if (!locked && ownedDebriefLocks.has(path.join(eng, DEBRIEF_PROPOSE))) return writeProposal(eng, text, { replace, locked: true })
  if (!locked) return withFileLock(path.join(eng, DEBRIEF_PROPOSE), () => {
    ownedDebriefLocks.add(path.join(eng, DEBRIEF_PROPOSE))
    try { return writeProposal(eng, text, { replace, locked: true }) }
    finally { ownedDebriefLocks.delete(path.join(eng, DEBRIEF_PROPOSE)) }
  }, { soft: true })
  if (!debriefTransactionActive) return withDebriefRecords(eng, () => writeProposal(eng, text, { replace, locked: true }), [DEBRIEF_PROPOSE, DEBRIEF_PRIVATE, DEBRIEF_SEAL])
  const { clean: original, blocks } = splitPrivate(text, { sealDangling: true })
  const clean = masking.mask(original)
  const proposePath = path.join(eng, DEBRIEF_PROPOSE)
  const privatePath = path.join(eng, DEBRIEF_PRIVATE)
  if (fs.existsSync(proposePath) && !replace) {
    const existing = fs.readFileSync(proposePath, 'utf8')
    const existingPrivate = readSealedProposal(eng)
    if (existing !== clean || JSON.stringify(existingPrivate) !== JSON.stringify(blocks)) {
      throw new Error('pending proposal already exists. Review and apply it first, or explicitly replace it with fde debrief --smart <notes> --replace-proposal.')
    }
  }
  // Seal first. A refused or failed sidecar write must not leave behind a
  // proposal whose (private - redacted) marker has nothing left behind it.
  if (blocks.length) {
    const blocked = refuseSymlinkWrite(privatePath, { soft: true })
    if (blocked) throw new Error(blocked)
    withFileLock(privatePath, () => { atomicWriteFile(privatePath, sealedText(blocks), { mode: 0o600 }) })
    try { fs.chmodSync(privatePath, 0o600) } catch (_) {}
  } else {
    try { fs.unlinkSync(privatePath) } catch (_) {}
  }
  withFileLock(proposePath, () => { atomicWriteFile(proposePath, clean) })
  // Receipt, so apply knows how many blocks the human actually approved. Counting
  // (private - redacted) markers in the proposal instead would refuse forever on
  // notes that merely quote the wording - the CLI prints it, so it gets pasted back.
  withFileLock(path.join(eng, DEBRIEF_SEAL), () => {
    atomicWriteFile(path.join(eng, DEBRIEF_SEAL), `${blocks.length}\n`)
  })
  return { proposePath, clean, blocks }
}

function approvedStamp(text) {
  const m = String(text || '').match(/\[approved:\s*([^\]]+)\]/i)
  return m ? m[1].trim() : ''
}

function stripApprovedStamp(text) {
  return String(text || '').replace(/\s*\[approved:\s*[^\]]+\]/i, '').trim()
}

// One screen a human can confirm in two minutes. The file-by-file routing
// still prints after this - agents edit prefixes; people read this.
function printDebriefReview(text, eng) {
  text = masking.restore(text)
  const repeats = repeatedDebriefStatements(eng, text)
  if (repeats.length) console.log(`REPLAY WARNING: ${repeats.length} source-backed statement(s) already recorded. Review newer facts and next action; applying again requires --allow-replay.\n`)
  const buckets = { decided: [], asked: [], scope: [], delivery: [], open: [], next: [], signer: [] }
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim().replace(/^[-*+]\s+/, '')
    if (!line) continue
    const m = line.match(/^(decision|risk|delivery|contact|next|signer|ask|scope):\s*(.+)$/i)
    if (!m) continue
    const type = m[1].toLowerCase()
    const body = m[2]
    if (type === 'decision') {
      const who = approvedStamp(body)
      const core = previewLine(stripApprovedStamp(body), 90)
      buckets.decided.push(who ? `${core}  (approved ${who})` : `${core}  (unconfirmed)`)
    } else if (type === 'ask') {
      buckets.asked.push(previewLine(body, 100))
    } else if (type === 'scope') {
      buckets.scope.push(previewLine(body, 100))
    } else if (type === 'delivery') {
      buckets.delivery.push(previewLine(body, 100))
    } else if (type === 'risk') {
      buckets.open.push(previewLine(body, 100))
    } else if (type === 'next') {
      buckets.next.push(previewLine(body, 100))
    } else if (type === 'signer') {
      buckets.signer.push(previewLine(body, 80))
    }
  }
  console.log('REVIEW (one screen - confirm once, then apply)\n')
  const order = [
    ['decided', buckets.decided],
    ['stated asks', buckets.asked],
    ['proposed scope', buckets.scope],
    ['reported delivery (not customer acceptance)', buckets.delivery],
    ['open', buckets.open],
    ['next action', buckets.next],
    ['named signer (authority, not approval)', buckets.signer],
  ]
  let any = false
  for (const [label, items] of order) {
    if (!items.length) {
      if (['stated asks', 'proposed scope', 'next action', 'named signer (authority, not approval)'].includes(label)) console.log(`  ${label}: not detected - review the notes`)
      continue
    }
    any = true
    console.log(`  ${label}:`)
    for (const item of items.slice(0, 5)) console.log(`    - ${item}`)
    if (items.length > 5) console.log(`    - ${items.length - 5} more omitted here; review the full proposal before applying.`)
  }
  if (!any) console.log('  (nothing prefixed yet - edit .debrief-propose, then apply)')
  const recorded = eng ? parseValueLedger(eng).rows : []
  const measured = recorded.some(row => row.state !== 'unmeasured')
  const evidenced = recorded.some(row => !row.evidenceMissing)
  const accepted = recorded.some(row => row.state === 'accepted')
  console.log('  delivery picture (existing record; this proposal does not certify it):')
  console.log(`    - measurement: ${measured ? 'recorded; check the value ledger' : 'missing - record the observed result'}`)
  console.log(`    - evidence: ${evidenced ? 'recorded; review its source' : 'missing - cite the test, artifact, or source'}`)
  console.log(`    - customer approval: ${accepted ? 'recorded for a prior outcome; not this proposal' : 'missing - request explicit acceptance after evidence review'}`)
  console.log('  Saving this update confirms your record, not customer acceptance.\n')
}

function latestDatedDecision(md) {
  let latest = { date: '', line: '' }
  for (const raw of String(md || '').split('\n')) {
    const t = raw.trim()
    const m = t.match(/^[-*]\s*\[(\d{4}-\d{2}-\d{2})\]/)
    if (!m) continue
    if (m[1] >= latest.date) latest = { date: m[1], line: t }
  }
  return latest
}

function formatDecisionRecord(line) {
  const raw = String(line || '').trim().replace(/^[-*]\s*/, '')
  const who = approvedStamp(raw)
  const core = stripApprovedStamp(raw)
  const stamp = !hasSource(raw) ? '(CLAIM - source missing)' : who ? `(approved ${who}; source recorded)` : '(unconfirmed; source recorded)'
  return `${stamp} ${previewLine(core, 110)}`
}

function changeReviewIssues(eng) {
  const issues = []
  const del = latestDeliveryEntry(readClean(eng, 'delivery.md'))
  const dec = latestDatedDecision(readClean(eng, 'decisions.md'))
  const delHash = del.line
    ? sh(`git log -1 --format=%H -S${JSON.stringify(del.line)} -- delivery.md`, eng)
    : ''
  if (del.date && dec.date && dec.date > del.date && delHash) {
    issues.push(
      'a decision landed after the last delivery line - review whether what you are shipping still matches'
    )
  }
  if (claimedValueRows(eng).claimed && delHash) {
    const sigHash = gitLogHash(eng, ['-GStakeholder who signs off|also named:', '--', 'success.md'])
    if (sigHash && gitIsAncestor(eng, delHash, sigHash)) {
      issues.push(
        'the signer line changed while a measured number is still unaccepted - pending acceptance may need a new yes'
      )
    }
  }
  return issues
}

function readSealCount(eng) {
  try {
    const n = parseInt(fs.readFileSync(path.join(eng, DEBRIEF_SEAL), 'utf8').trim(), 10)
    return Number.isInteger(n) && n >= 0 ? n : null
  } catch (_) { return null }
}

function readSealedProposal(eng) {
  try {
    return splitPrivate(stripControlChars(fs.readFileSync(path.join(eng, DEBRIEF_PRIVATE), 'utf8'))).blocks
  } catch (_) { return [] }
}

// A debrief touches several records. Acquire every cooperating writer's lock
// before the first append, and restore snapshots if an ordinary write fails.
// This is not a power-loss transaction; no history is deleted or reset.
function withDebriefRecords(eng, apply, files = ['decisions.md', 'risks.md', 'delivery.md', 'stakeholders.md',
  'success.md', 'context.md', SIGNAL_LEDGER, LAST_WRITE, DEBRIEF_PROPOSE, DEBRIEF_PRIVATE, DEBRIEF_SEAL]) {
  files = files.slice().sort()
  const snapshots = new Map()
  function lockAt(index) {
    if (index < files.length) {
      const target = path.join(eng, files[index])
      if (ownedDebriefLocks.has(target)) return lockAt(index + 1)
      return withFileLock(target, () => {
        ownedDebriefLocks.add(target)
        try { return lockAt(index + 1) } finally { ownedDebriefLocks.delete(target) }
      }, { soft: true })
    }
    for (const file of files) {
      const target = path.join(eng, file)
      const blocked = refuseSymlinkWrite(target, { soft: true })
      if (blocked) throw new Error(blocked)
      snapshots.set(target, fs.existsSync(target) ? { bytes: fs.readFileSync(target), mode: fs.statSync(target).mode & 0o777 } : null)
    }
    debriefTransactionActive = true
    try { return apply() } catch (error) {
      const failed = []
      for (const [target, previous] of snapshots) {
        try {
          if (previous) atomicWriteFile(target, previous.bytes, { mode: previous.mode, soft: true })
          else if (fs.existsSync(target)) fs.unlinkSync(target)
        } catch (_) { failed.push(path.basename(target)) }
      }
      if (failed.length) throw new Error(`${error.message}; recovery could not restore ${failed.join(', ')}. Inspect these records and the pending proposal before retrying.`)
      throw new Error(`${error.message}; no record changes kept. The proposal is retained; retry after resolving the cause.`)
    } finally { debriefTransactionActive = false }
  }
  return lockAt(0)
}

// Limit model-facing review output while preserving the full editable proposal.
function boundedDebriefPreview(eng, render, { proposal = true, maxBytes = 12000 } = {}) {
  const original = console.log, originalError = console.error
  let bytes = 0, omitted = 0
  const bounded = output => (...args) => {
    const line = args.join(' ') + '\n'
    const size = Buffer.byteLength(line)
    if (bytes + size > maxBytes) { omitted++; return }
    bytes += size; output(...args)
  }
  console.log = bounded(original)
  console.error = bounded(originalError)
  let result
  try { result = render() } finally { console.log = original; console.error = originalError }
  if (omitted) console.log(proposal
    ? `\n${omitted} preview lines omitted. Review the complete proposal at ${path.join(eng, DEBRIEF_PROPOSE)} before applying.`
    : `\n${omitted} preview lines omitted. Review the full input notes before applying.`)
  return result
}

function deliveryCells(text) {
  const cells = text.split('|').map(s => s.trim())
  if (cells.length !== 7) throw new Error('delivery needs exactly 7 fields: Slice | Bucket | Promised | Measured | Accepted by | Evidence | Rollback. Use pending for unknowns; omit pipes for a narrative note.')
  return cells
}

// Exact sourced statement replay only; a shared source may contain new facts.
// Do not silently deduplicate: the engineer decides whether a repeated event is intended.
function repeatedDebriefStatements(eng, input) {
  const repeats = []
  const records = new Map()
  const normalize = value => value.replace(/\s*\|\s*/g, '|').replace(/\s+/g, ' ').trim()
  for (const raw of splitPrivate(input, { sealDangling: true }).clean.split('\n')) {
    const match = raw.trim().replace(/^[-*+]\s+/, '').match(/^(decision|risk|delivery|contact):\s*(.+)$/i)
    if (!match || !/\[source:[^\]]+\]/i.test(match[2])) continue
    const body = match[2].trim()
    const file = LOG_FILES[match[1].toLowerCase()]
    if (!records.has(file)) {
      const statements = String(readClean(eng, file) || '').split('\n').map(line => {
        if (/^\s*\|/.test(line)) return normalize(line.trim().replace(/^\|\s*\d{4}-\d{2}-\d{2}\s*\|/, '').replace(/\|\s*$/, ''))
        return normalize(line.replace(/^\s*[-*+]\s+/, '').replace(/^(?:\[(?:\d{4}-\d{2}-\d{2}|@[^\]]+|signal:[^\]]+)\]\s*)+/, ''))
      })
      records.set(file, new Set(statements))
    }
    if (records.get(file).has(normalize(body))) repeats.push(body)
  }
  return repeats
}

function routeDebriefInput(eng, input, { dry, force, sealed = [], allowReplay = false }) {
  input = masking.restore(input)
  masking.mask(splitPrivate(input, { sealDangling: true }).clean)
  if (!dry && !debriefTransactionActive) {
    ensureMemoryGit(eng)
    return withDebriefRecords(eng, () => {
      const result = routeDebriefInput(eng, input, { dry, force, sealed, allowReplay })
      // Consuming the review is part of the write. If cleanup fails, restoring
      // both the records and proposal makes the next explicit apply safe.
      for (const file of [DEBRIEF_PROPOSE, DEBRIEF_PRIVATE, DEBRIEF_SEAL]) {
        try { fs.unlinkSync(path.join(eng, file)) } catch (error) {
          if (error.code !== 'ENOENT') throw new Error(formatFsError(error, 'remove', file))
        }
      }
      return result
    })
  }
  const repeats = repeatedDebriefStatements(eng, input)
  if (repeats.length && !dry && !allowReplay) throw new Error('source-backed statement already recorded; review the existing record and newer next action. Explicitly confirm a repeat with --allow-replay, or remove the repeated statement from the proposal.')
  const d = new Date()
  const date = d.toISOString().slice(0, 10)
  const counts = { decision: 0, risk: 0, delivery: 0, contact: 0, next: 0, signer: 0 }
  const ctxLines = []
  let nextAction = ''
  if (!dry) ensureMemoryGit(eng)
  // Sealed blocks are pulled out before routing, so a <private> block's interior
  // lines are never previewed and never routed into decisions/risks/stakeholders
  // unsealed. They land verbatim in context.md instead: the preview a human
  // approves is exactly what --apply writes.
  const { clean: routable, blocks: inlinePrivate } = splitPrivate(input, { sealDangling: true })
  const privateBlocks = [...inlinePrivate, ...sealed]
  for (const raw of routable.split('\n')) {
    let line = raw.trim()
    if (!line) continue
    const bare = line.replace(/^[-*+]\s+/, '').replace(/^\*\*(decision|risk|delivery|contact|next|signer):?\*\*:?\s*/i, '$1: ')
    const m = bare.match(/^(decision|risk|delivery|contact|next|signer):\s*(.+)$/i)
    if (m) {
      const type = m[1].toLowerCase()
      let body = m[2]
      const hit = findSecretHit(body)
      if (hit && !force) {
        console.error(`skipped ${type} line - looks like a ${hit}. Redact it, or re-run with --force.`)
        continue
      }
      if (type === 'signer') {
        const who = body.replace(/\s+signs?(?:\s+off)?\b.*$/i, '').trim() || body.trim()
        if (dry) {
          console.log(`→ success.md  **Stakeholder who signs off:** ${previewLine(who)}`)
          console.log(`→ stakeholders.md  ${previewLine(`- [${date}] ${who} signs off`)}`)
        } else {
          setSigner(eng, who)
          appendLogEntry(eng, 'contact', datedEntry(eng, date, `${who} signs off`), { skipCommit: true })
        }
        counts.signer++
        continue
      }
      if (type === 'next') {
        if (dry) console.log(`→ context.md ## Next action  - ${previewLine(body)}`)
        else nextAction = body
        counts.next++
        continue
      }
      if (type === 'delivery' && body.includes('|')) {
        const cells = deliveryCells(body)
        if (dry) console.log(`→ delivery.md ## Value ledger  ${previewLine(body)}`)
        else appendValueLedgerRow(eng, cells, { skipCommit: true })
        counts.delivery++
        continue
      }
      const sigInline = (body.match(/\[signal:(red|amber|green)\]/i) || [])[1]
      if (sigInline) body = body.replace(/\[signal:(red|amber|green)\]/i, '').trim()
      const entry = dry ? `- [${date}]${type === 'contact' && sigInline ? ` [signal:${sigInline.toLowerCase()}]` : ''} ${body}` : datedEntry(eng, date, body, type === 'contact' && sigInline ? sigInline.toLowerCase() : '')
      if (dry) console.log(`→ ${LOG_FILES[type]}  ${previewLine(entry)}`)
      else appendLogEntry(eng, type, entry, { skipCommit: true })
      counts[type]++
    } else {
      if (findSecretHit(line) && !force) {
        console.error('skipped context line - looks like a secret. Redact it, or re-run with --force.')
        continue
      }
      ctxLines.push(line)
    }
  }
  if (nextAction && !dry) setNextAction(eng, nextAction)
  if (ctxLines.length || privateBlocks.length) {
    const stamp = `${date} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    if (dry) ctxLines.forEach(l => console.log(`→ context.md  - ${previewLine(l)}`))
    else {
      const bullets = ctxLines.length ? `${ctxLines.map(l => `- ${l}`).join('\n')}\n` : ''
      const sealed = privateBlocks.length ? sealedText(privateBlocks) : ''
      lockedAppendFile(path.join(eng, 'context.md'), `\n## Debrief - ${stamp}\n${bullets}${sealed}`)
    }
  }
  return { counts, ctxLines, date, nextAction, privateBlocks }
}

function cmdDebrief(args) {
  const eng = resolveEngagement({ forWrite: true })
  if (!eng) { console.error('no engagement - run: fde resume --init <name>'); process.exitCode = 2; return }
  const target = path.join(eng, DEBRIEF_PROPOSE)
  try {
    withFileLock(target, () => {
      ownedDebriefLocks.add(target)
      try { return runDebrief(args, eng) } finally { ownedDebriefLocks.delete(target) }
    }, { soft: true })
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}

function runDebrief(args, eng) {
  args = args.slice()
  const replayIdx = args.indexOf('--allow-replay')
  const allowReplay = replayIdx !== -1
  if (allowReplay) args.splice(replayIdx, 1)
  if (args.includes('--review')) {
    if (args.length !== 1 || allowReplay) throw new Error('use debrief --review alone to inspect the pending proposal')
    const proposal = path.join(eng, DEBRIEF_PROPOSE)
    const refused = refuseSymlinkWrite(proposal, { soft: true })
    if (refused) throw new Error(refused)
    if (!fs.existsSync(proposal)) throw new Error('nothing to review - run debrief --smart <notes> first')
    const stored = fs.readFileSync(proposal, 'utf8')
    if (splitPrivate(stored, { sealDangling: true }).blocks.length) throw new Error('pending proposal contains raw private content: do not open it with an agent. Recreate it through debrief --smart from local notes, using --replace-proposal only after confirmation.')
    const { clean: input } = splitPrivate(masking.restore(stored), { sealDangling: true })
    const safe = masking.mask(input)
    if (safe !== stored) atomicWriteFile(proposal, safe, { mode: 0o600, soft: true })
    return boundedDebriefPreview(eng, () => {
      printDebriefReview(input, eng)
      routeDebriefInput(eng, input, { dry: true, force: false })
    })
  }
  const dryIdx = args.indexOf('--dry-run')
  const dry = dryIdx !== -1
  if (dry) args.splice(dryIdx, 1)
  const smartIdx = args.indexOf('--smart')
  const smart = smartIdx !== -1
  if (smart) args.splice(smartIdx, 1)
  const applyIdx = args.indexOf('--apply')
  const apply = applyIdx !== -1
  if (apply) args.splice(applyIdx, 1)
  let force = false
  const forceIdx = args.indexOf('--force')
  if (forceIdx !== -1) { force = true; args.splice(forceIdx, 1) }

  const replaceIdx = args.indexOf('--replace-proposal')
  const replace = replaceIdx !== -1
  if (replace) args.splice(replaceIdx, 1)
  if (replace && !smart) throw new Error('--replace-proposal requires --smart <notes>')

  if (!smart && !apply && !dry && fs.existsSync(path.join(eng, DEBRIEF_PROPOSE))) {
    throw new Error('pending proposal already exists. Review and apply it before writing another debrief.')
  }
  if (apply && !smart && args[0] && fs.existsSync(path.join(eng, DEBRIEF_PROPOSE))) {
    throw new Error('pending proposal already exists. Use debrief --apply without a notes file to apply that review.')
  }
  let input = ''
  let sealed = []
  if (apply && !smart && !args[0]) {
    try { input = stripControlChars(fs.readFileSync(path.join(eng, DEBRIEF_PROPOSE), 'utf8')) } catch (_) {
      console.error('nothing to apply - run: fde debrief --smart <notes.md>   then   fde debrief --apply')
      return void (process.exitCode = 1)
    }
    input = masking.restore(input)
    sealed = readSealedProposal(eng)
    const expected = readSealCount(eng)
    if (expected === null ? (!sealed.length && input.includes(PRIVATE_MARKER)) : sealed.length < expected) {
      console.error(`refused: the proposal seals a private note but ${DEBRIEF_PRIVATE} is missing or unreadable - applying now would drop it silently.`)
      console.error('re-run the propose step (fde debrief --smart <notes> | fde ingest propose <id>).')
      return void (process.exitCode = 1)
    }
  } else {
    input = readDebriefInput(args)
  }

    if (smart) {
    const { proposePath, clean, blocks } = writeProposal(eng, smartProposeText(input), { replace })
    boundedDebriefPreview(eng, () => {
    console.log('SMART PROPOSE (heuristic - review before apply; no new facts invented beyond line rewrites)\n')
    printDebriefReview(clean, eng)
    console.log('Prefix vocabulary (lines that route): decision:  risk:  delivery:  contact:  next:  signer:')
    console.log('Optional on a decision: [approved: Name YYYY-MM-DD]. Missing means unconfirmed.')
    console.log('Everything else → context.md. Keep the prefixes; the preview gate stays.\n')
    routeDebriefInput(eng, clean, { dry: true, force, sealed: blocks })
    }, { maxBytes: 8000 })
    if (!apply) {
      console.log(`\nproposal saved → ${proposePath}`)
      console.log('confirm:  fde debrief --apply')
      console.log('(edit the propose file if mis-routed; debrief --review shows the pending REVIEW)')
      return
    }
    input = clean
    sealed = blocks
  }

  const route = () => routeDebriefInput(eng, input, { dry, force, sealed, allowReplay })
  const { counts, ctxLines, privateBlocks } = boundedDebriefPreview(eng, route, { proposal: false, maxBytes: smart ? 4000 : 12000 })
  if (!dry) {
    const hash = commitMemory(eng, 'debrief', {
      files: ['decisions.md', 'risks.md', 'delivery.md', 'stakeholders.md', 'success.md', 'context.md', SIGNAL_LEDGER],
    })
    if (hash) console.log(`memory @${hash}`)
  }
  const plural = {
    decision: 'decisions', risk: 'risks', delivery: 'deliveries', contact: 'contacts', next: 'next actions', signer: 'signers',
  }
  const parts = Object.keys(counts).filter(t => counts[t])
    .map(t => `${counts[t]} ${counts[t] === 1 ? (t === 'next' ? 'next action' : t) : plural[t]}`)
  if (ctxLines.length) parts.push(`${ctxLines.length} context line${ctxLines.length === 1 ? '' : 's'}`)
  if (privateBlocks.length) parts.push(`${privateBlocks.length} sealed private note${privateBlocks.length === 1 ? '' : 's'}`)
  const verb = dry ? 'debrief would route' : 'debrief routed'
  console.log(parts.length ? `${verb} → ${parts.join(', ')}` : 'debrief empty - nothing routed')
}

// Pull sink: stage raw artifacts outside the memory ledger, then reuse debrief
// propose/apply. Never writes .fde/ until the FDE confirms apply. Source SaaS
// (Granola/Gmail/…) is not here - only staging + the existing confirm gate.
function inboxDir(eng) {
  return path.join(path.dirname(eng), '.inbox')
}

function sanitizeIngestToken(s, fallback) {
  const t = String(s || '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48)
  return t || fallback
}

function parseIngestFrontMatter(raw) {
  const text = String(raw || '')
  if (!text.startsWith('---\n')) return { meta: {}, body: text }
  const end = text.indexOf('\n---\n', 4)
  if (end === -1) return { meta: {}, body: text }
  const head = text.slice(4, end)
  const body = text.slice(end + 5)
  const meta = {}
  for (const line of head.split('\n')) {
    const m = /^([a-z_]+):\s*(.*)$/i.exec(line.trim())
    if (m) meta[m[1].toLowerCase()] = m[2].trim()
  }
  return { meta, body }
}

function resolveInboxItem(eng, id) {
  const box = inboxDir(eng)
  const want = String(id || '').trim()
  if (!want) return null
  const direct = path.join(box, want)
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct
  const withMd = want.endsWith('.md') ? want : `${want}.md`
  const alt = path.join(box, withMd)
  if (fs.existsSync(alt) && fs.statSync(alt).isFile()) return alt
  try {
    const hits = fs.readdirSync(box).filter(f => f === want || f.startsWith(want) || f.includes(want))
    if (hits.length === 1) return path.join(box, hits[0])
  } catch (_) {}
  return null
}

function cmdIngest(args) {
  args = args.slice()
  const sub = (args.shift() || '').toLowerCase()
  if (!['stage', 'list', 'propose', 'apply'].includes(sub)) {
    console.error('usage: fde ingest stage [--source NAME] [--title TEXT] [--force] [file|-]\n' +
      '       fde ingest list\n' +
      '       fde ingest propose <id>\n' +
      '       fde ingest apply')
    process.exit(1)
  }

  if (sub === 'apply') {
    cmdDebrief(['--apply', ...args])
    return
  }

  const eng = resolveEngagement({ forWrite: true })
  if (!eng) { console.error('no engagement - run: fde resume --init <name>'); process.exit(2) }

  if (sub === 'list') {
    const box = inboxDir(eng)
    if (!fs.existsSync(box)) {
      console.log(`inbox empty → ${box}`)
      console.log('(stage with: fde ingest stage --source granola notes.md)')
      return
    }
    const files = fs.readdirSync(box).filter(f => f.endsWith('.md')).sort().reverse()
    if (!files.length) {
      console.log(`inbox empty → ${box}`)
      return
    }
    console.log(`INBOX → ${box}\n`)
    for (const f of files) {
      const raw = fs.readFileSync(path.join(box, f), 'utf8')
      const { meta } = parseIngestFrontMatter(raw)
      const src = meta.source || '?'
      const title = meta.title || ''
      const when = meta.staged || ''
      console.log(`  ${f}${title ? `  ${title}` : ''}  via:${src}${when ? `  ${when}` : ''}`)
    }
    console.log(`\npropose:  fde ingest propose <id>`)
    return
  }

  if (sub === 'propose') {
    const id = args[0]
    if (!id) { console.error('usage: fde ingest propose <id>'); process.exit(1) }
    const item = resolveInboxItem(eng, id)
    if (!item) {
      console.error(`ingest propose: no staged item matching "${id}" - run: fde ingest list`)
      process.exit(1)
    }
    const raw = stripControlChars(fs.readFileSync(item, 'utf8'))
    const { meta, body } = parseIngestFrontMatter(raw)
    const source = meta.source || 'manual'
    const title = meta.title || path.basename(item, '.md')
    const stamped = meta.staged || 'unknown'
    const viaLine = `via:${source} ${title} (staged ${stamped}; file ${path.basename(item)})`
    const input = `${viaLine}\n\n${body.trim()}\n`
    if (Buffer.byteLength(input) > DEBRIEF_MAX_BYTES) {
      console.error(`ingest propose refused: staged item is over ${DEBRIEF_MAX_BYTES} bytes after provenance. Split it.`)
      process.exit(1)
    }
    let proposal
    try { proposal = writeProposal(eng, smartProposeText(input)) } catch (error) { console.error(error.message); process.exitCode = 1; return }
    const { proposePath, clean, blocks } = proposal
    boundedDebriefPreview(eng, () => {
    console.log(`INGEST PROPOSE from ${path.basename(item)} (via:${source})\n`)
    printDebriefReview(clean, eng)
    routeDebriefInput(eng, clean, { dry: true, force: false, sealed: blocks })
    })
    console.log(`\nproposal saved → ${proposePath}`)
    console.log('confirm:  fde ingest apply')
    console.log('(agent: rewrite lines with decision:/risk:/contact:/next: prefixes before apply)')
    return
  }

  // stage
  let source = 'manual'
  let title = ''
  let force = false
  const rest = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) { source = args[++i]; continue }
    if (args[i] === '--title' && args[i + 1]) { title = args[++i]; continue }
    if (args[i] === '--force') { force = true; continue }
    rest.push(args[i])
  }
  source = sanitizeIngestToken(source, 'manual')
  const titleSlug = sanitizeIngestToken(title || 'notes', 'notes')
  if (!title) title = titleSlug

  let input = ''
  if (rest[0] && rest[0] !== '-') {
    const p = path.resolve(rest[0])
    try {
      const st = fs.statSync(p)
      if (st.size > DEBRIEF_MAX_BYTES) {
        console.error(`ingest stage refused: ${rest[0]} is ${st.size} bytes (max ${DEBRIEF_MAX_BYTES}). Split or stage a relevant section.`)
        process.exit(1)
      }
      input = stripControlChars(fs.readFileSync(p, 'utf8'))
    } catch (e) {
      failFs(e, 'read', p)
    }
  } else {
    input = stripControlChars(fs.readFileSync(0, 'utf8'))
    if (Buffer.byteLength(input) > DEBRIEF_MAX_BYTES) {
      console.error(`ingest stage refused: stdin is over ${DEBRIEF_MAX_BYTES} bytes. Split the notes.`)
      process.exit(1)
    }
  }
  if (!input.trim()) {
    console.error('ingest stage refused: empty input')
    process.exit(1)
  }
  const hit = findSecretHit(input)
  if (hit && !force) { refuseSecret('ingest stage', hit); process.exit(1) }
  if (hit && force) console.error(`warning: staging possible ${hit} (--force)`)

  const box = inboxDir(eng)
  try { fs.mkdirSync(box, { recursive: true }) } catch (e) { failFs(e, 'create inbox', box) }
  const compact = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const id = `${compact}-${source}-${titleSlug}.md`
  const dest = path.join(box, id)
  const body = [
    '---',
    `source: ${source}`,
    `title: ${title.replace(/\n/g, ' ')}`,
    `staged: ${new Date().toISOString()}`,
    `id: ${id}`,
    '---',
    '',
    input.replace(/\s+$/, '') + '\n',
  ].join('\n')
  withFileLock(dest, () => { atomicWriteFile(dest, body) })
  console.log(`staged → ${dest}`)
  console.log(`id: ${id}`)
  console.log('next:   fde ingest propose ' + id)
  console.log('(does not write .fde/ - confirm via propose → apply)')
}

function cmdReceipts(args) {
  const term = args.join(' ').trim()
  if (!term) { console.error('usage: fde receipts <search term>'); process.exit(2) }
  const eng = resolveEngagement()
  if (!eng) { console.error('no engagement - bind a client first'); process.exit(2) }
  const recordFiles = ['decisions.md', 'delivery.md', 'success.md', 'risks.md', 'stakeholders.md']
  const workingFiles = ['brief.md', 'assumptions.md', 'reality.md', 'context.md']
  const dirty = new Set(memoryDirtyManual(eng))
  const records = [], claims = []
  for (const file of [...recordFiles, ...workingFiles]) {
    const document = readClean(eng, file)
    const decisionSources = new Map()
    if (file === 'decisions.md') for (const entry of datedDecisions(document)) {
      const source = sourceReference(entry.text)
      for (let line = entry.line; line < entry.line + entry.text.split('\n').length; line++) decisionSources.set(line, source)
    }
    document.split('\n').forEach((line, i) => {
      if (!line.toLowerCase().includes(term.toLowerCase())) return
      const source = decisionSources.get(i + 1) || sourceReference(line)
      const hit = `  ${file}:${i + 1}  ${masking.mask(line.trim()).slice(0, 160)}${source ? ` [source: ${masking.mask(source).slice(0, 160)}]` : ' [source missing]'}${dirty.has(file) ? '  dirty file - review manual edits' : ''}`
      ;(recordFiles.includes(file) && source ? records : claims).push({ file, hit })
    })
  }
  // Alternate the latest and earliest matching lines per file. Otherwise a
  // long history can spend the entire packet on approvals before a withdrawal.
  const select = hits => {
    const groups = new Map()
    for (const { file, hit } of hits) {
      if (!groups.has(file)) groups.set(file, [])
      groups.get(file).push(hit)
    }
    const selected = []
    let latest = true
    while (selected.length < 24 && [...groups.values()].some(group => group.length)) {
      for (const group of groups.values()) {
        if (group.length && selected.length < 24) selected.push(latest ? group.pop() : group.shift())
      }
      latest = !latest
    }
    return `Selected ${selected.length} of ${hits.length} matching lines; omitted matches require a narrower search.\n` + selected.join('\n')
  }
  const sections = ['RECEIPTS: a cited record is not proof of customer approval. File line numbers refer to the redacted view. Latest and earliest matching lines are sampled; file order is not authority. Check conflicting records.']
  if (records.length) sections.push('ON RECORD (dated, source-backed):\n' + select(records))
  if (claims.length) sections.push('CLAIMS & working notes (verify source and approval before citing):\n' + select(claims))
  if (!records.length && !claims.length) sections.push(`no record of "${term}" - a gap in the record, not proof of absence`)
  process.stdout.write(maskedSections(sections))
}

// Portable snapshot; stdout is read-only. --out creates a new file and never
// overwrites an engagement record, existing file, or symlink.
function cmdHandoff(args, label = 'Handoff') {
  let parsed
  try { parsed = context.budgetArgs(args) } catch (e) { console.error(e.message); process.exit(1) }
  let out = ''
  if (parsed.args.length) {
    if (parsed.args.length !== 2 || parsed.args[0] !== '--out' || !parsed.args[1] || parsed.args[1].startsWith('--')) {
      console.error('usage: fde handoff [--out new-file.md] [--max-bytes 4096..65536]'); process.exit(1)
    }
    out = path.resolve(parsed.args[1])
  }
  const eng = resolveEngagement()
  if (!eng) { console.error('no engagement - run: fde resume --init <name>'); process.exit(2) }
  const success = stripTemplateNoise(readClean(eng, 'success.md'))
  const signer = ((success.match(/^\*\*Stakeholder who signs off:\*\*[^\S\n]*(.*)$/m) || [])[1] || '').trim()
  const ledger = parseValueLedger(eng).rows
  const rowText = r => `- ${r.slice || 'Unnamed slice'}: promised ${r.promised || '(missing)'}; measured ${r.measured || '(missing)'}; accepted by ${r.accepted || '(missing)'}; evidence ${r.evidence || '(missing)'}`
  const decisions = datedDecisions(readClean(eng, 'decisions.md'))
  const selected = decisions.slice(-8)
  const records = selected.filter(d => hasSource(d.text))
  const claims = selected.filter(d => !hasSource(d.text))
  const decisionText = d => `${d.text} (decisions.md:${d.line}, redacted view)`
  const next = stripTemplateNoise(sectionBody(readClean(eng, 'context.md'), 'Next action', { lastNonEmpty: true }))
  const gaps = collectDoctorIssues(eng, { readiness: true })
  const report = maskedSections([
    `# ${label}: ${engagementSlugFromPath(eng)}\nSnapshot: ${new Date().toISOString()} · memory ${memoryHead(eng) || 'unversioned'}\nRead-only record, not proof of approval. Confirm sources with the named customer before relying on a claim. Private blocks are excluded; review remaining client information before sharing.`,
    `## Constraints - trust-profile.md\n${stripTemplateNoise(readClean(eng, 'trust-profile.md')) || '(missing)'}`,
    `## Signer and success - success.md\nSigner: ${signer || '(missing; do not infer)'}\n${success || '(missing)'}`,
    `## Next action - context.md\n${next || '(missing)'}\n\n## Open risks - risks.md\n${extractRisks(eng).map(r => '- ' + r.text).join('\n') || '(none recorded; not proof of no risk)'}`,
    label === 'Handoff' ? `## Operational handoff - handoff.md\n${stripTemplateNoise(readClean(eng, 'handoff.md')) || '(missing; record recovery steps and the operating owner before rotation)'}` : '',
    `## Accepted value - recorded assertion with source\nOnly structured value-ledger rows are summarized here; review other notes in delivery.md before presenting or handing over this record.\n${ledger.filter(r => r.state === 'accepted').map(rowText).join('\n') || '(none)'}\n\n## CLAIMS and unmeasured promises\n${ledger.filter(r => r.state !== 'accepted').map(r => rowText(r) + ' [' + r.state + ']' + (r.acceptanceIssue ? '; ' + r.acceptanceIssue : '')).join('\n') || '(none)'}`,
    `## ON RECORD decisions - source supplied, not automatic approval\n${records.map(decisionText).join('\n') || '(none)'}\n\n## CLAIM decisions - source missing\n${claims.map(decisionText).join('\n') || '(none)'}\nSelected ${selected.length} of ${decisions.length} dated decisions. Retrieve older or conflicting decisions with fde recall.`,
    `## Gaps before relying on this packet\n${gaps.map(g => '- ' + g).join('\n') || '(no deterministic lint gaps; human review still required)'}`,
  ], parsed.maxBytes)
  if (!out) { process.stdout.write(report); return }
  try {
    // Exclusive creation fails closed for files and links. Resolve the parent
    // first so a directory link cannot redirect an export into .fde/.
    const parent = fs.realpathSync(path.dirname(out))
    const target = path.join(parent, path.basename(out))
    const root = fs.realpathSync(eng)
    if (parent.split(path.sep).includes('.fde') || target === root || target.startsWith(root + path.sep)) throw new Error('export outside .fde/; engagement records are not export destinations')
    fs.writeFileSync(target, report, { flag: 'wx', mode: 0o600 })
    console.log(`${label.toLowerCase()} → ${out}`)
  } catch (e) { console.error(`could not export packet: ${e.message}`); process.exit(1) }
}

function cmdRecall(args) {
  let maxBytes
  try { ({ args, maxBytes } = context.budgetArgs(args)) } catch (e) { console.error(e.message); process.exit(2) }
  const query = args.join(' ').trim()
  if (!query || Buffer.byteLength(query) > 2048 || args.some(a => a.startsWith('--'))) {
    console.error('usage: fde recall <topic> [--max-bytes 4096..65536]'); process.exit(2)
  }
  const eng = resolveEngagement()
  if (!eng) { console.error('no engagement - bind a client before recall'); process.exit(2) }
  const files = ['context.md', 'trust-profile.md', 'success.md', 'decisions.md', 'risks.md', 'delivery.md', 'stakeholders.md', 'brief.md', 'reality.md', 'assumptions.md', 'terrain.md', 'handoff.md']
  const result = context.recallSections(files.map(file => ({ file, text: readClean(eng, file) })), query, 12, masking.mask)
  process.stdout.write(maskedSections([
    `RECALL - ${eng}\n${result.total ? `${result.sections.length} of ${result.total} matching lines; refine the query if evidence is omitted.` : 'No matching record. This is not proof that the event never happened.'}\nSources are local record assertions; verify dates, supersession and approval scope.`,
    ...result.sections,
  ], maxBytes))
}

function cmdCapture() {
  const eng = resolveEngagement({ forWrite: true })
  if (!eng) process.exit(0) // silent: capture must never break a session
  // Workspace git facts (cwd), not the engagement memory repo.
  const branch = sh('git branch --show-current')
  const lastCommit = sh("git log -1 --format='%h %s'")
  // porcelain lines are "XY path" - sh() trims, so parse by first whitespace
  const changed = sh('git status --porcelain').split('\n').filter(Boolean).slice(0, 8)
    .map(l => l.trim().split(/\s+/).slice(1).join(' ')).join(' ')
  const updated = fs.readdirSync(eng).filter(f => {
    if (!f.endsWith('.md') || f === 'context.md') return false
    try { return (Date.now() - fs.statSync(path.join(eng, f)).mtimeMs) < 12 * 3600 * 1000 } catch (_) { return false }
  }).join(' ')
  if (!changed && !updated) process.exit(0) // idle session - keep memory clean
  const d = new Date()
  const localDate = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
  const stamp = `${localDate} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  let block = `\n<!-- fdeops auto-capture -->\n## Session end - ${stamp}\n`
  if (branch) block += `- workspace: \`${branch}\` @ ${lastCommit || 'no commits yet'}\n`
  if (changed) block += `- uncommitted: ${changed}\n`
  if (updated) block += `- engagement files updated: ${updated}\n`
  try {
    ensureMemoryGit(eng)
    lockedAppendFile(path.join(eng, 'context.md'), block, { soft: true })
    commitMemory(eng, 'session capture', { files: ['context.md'] })
  } catch (_) {}
}

function cmdPreserve() {
  try {
    const eng = resolveEngagement({ forWrite: true })
    if (!eng || !fs.existsSync(path.join(eng, 'context.md'))) return
    const marker = '[fdeops context preserved'
    const today = new Date().toISOString().slice(0, 10)
    const decisionLines = readClean(eng, 'decisions.md').split('\n')
    if (decisionLines[decisionLines.length - 1] === '') decisionLines.pop()
    const recentDecisions = decisionLines.slice(-20).join('\n')
    const openRisks = readClean(eng, 'risks.md').split('\n')
      .filter(line => /open|active|unresolved/i.test(line))
      .slice(0, 8)
      .join('\n')
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
    const block = `\n---\n${marker} at ${timestamp}]\nRecent decisions (tail):\n${recentDecisions}\n\nOpen risks:\n${openRisks}\n---\n`

    ensureMemoryGit(eng)
    const contextPath = path.join(eng, 'context.md')
    const blocked = refuseSymlinkWrite(contextPath, { soft: true })
    if (blocked) throw Object.assign(new Error(blocked), { code: blocked.includes('symlink') ? 'ESYMLINK' : 'EIRREGULAR' })
    withFileLock(contextPath, () => {
      const context = readEng(eng, 'context.md')
      const preservedToday = context.split('\n')
        .some(line => line.includes(marker) && line.includes(today))
      if (!preservedToday) fs.appendFileSync(contextPath, block)
    }, { soft: true })
    commitMemory(eng, 'context preserve', { files: ['context.md'] })
  } catch (_) {}
}

function cmdTriage() {
  const eng = resolveEngagement()
  if (!eng) {
    console.error('no engagement - run: fde resume --init <name>')
    process.exit(2)
  }
  // Session-start hooks call this - hygiene is proactive here (silent when clean),
  // and the record digest travels with it so a fresh session knows who signs.
  printTriageBlock(eng)
  for (const line of recordDigest(eng)) console.log(line)
  const owner = readOwner(eng) || writeOwnerIfMissing(eng)
  const head = memoryHead(eng)
  if (owner || head) {
    console.log(`  record: ${owner ? owner.email : '?'}${head ? `  memory@${head}` : '  (unversioned)'}`)
  }
}

function cmdOwner(args) {
  const eng = resolveEngagement({ forWrite: args[0] === 'set' })
  if (!eng) { console.error('no engagement - run: fde resume --init <name>'); process.exit(2) }
  if (args[0] === 'set') {
    const email = args[1]
    if (!email || !email.includes('@')) {
      console.error('usage: fde owner set <email> [name...]')
      process.exit(1)
    }
    const name = args.slice(2).join(' ') || email.split('@')[0]
    ensureMemoryGit(eng)
    withFileLock(path.join(eng, OWNER_FILE), () => {
      atomicWriteFile(path.join(eng, OWNER_FILE), `name: ${name}\nemail: ${email}\n`)
    })
    const hash = commitMemory(eng, 'owner set', { files: [OWNER_FILE] })
    console.log(`owner → ${name} <${email}>${hash ? ` @${hash}` : ''}`)
    return
  }
  const o = readOwner(eng) || writeOwnerIfMissing(eng)
  console.log(`owner: ${o.name} <${o.email}>`)
  const head = memoryHead(eng)
  if (head) console.log(`memory HEAD: ${head}`)
  else console.log('memory HEAD: (unversioned - git init on next write)')
}

function riskFingerprint(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\[\d{4}-\d{2}-\d{2}\]/g, '')
    .replace(/\[@[^\]]+\]/g, '')
    .replace(/^\s*[-*|]\s*/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join(' ')
}

function findDuplicateOpenRisks(eng) {
  // Scan raw open risks (not extractRisks - that dedupes exact text).
  const md = readClean(eng, 'risks.md')
  const body = md.split(/^#{1,6}\s+Retired\b/im)[0] || md
  const items = []
  const table = parseMdTable(body)
  if (table) {
    const riskIdx = colIndex(table.headers, /^risk$/i)
    if (riskIdx !== -1) {
      for (const cs of table.rows) {
        const t = (cs[riskIdx] || '').trim()
        if (t) items.push(t)
      }
    }
  }
  for (const raw of body.split('\n')) {
    const t = raw.trim()
    const m = t.match(/^-\s*\[\d{4}-\d{2}-\d{2}\]\s*(?:\[@[^\]]+\]\s*)?(.*)$/)
    if (m && m[1].trim()) items.push(m[1].trim())
  }
  const byKey = new Map()
  for (const text of items) {
    const key = riskFingerprint(text)
    if (key.length < 12) continue
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(text)
  }
  return [...byKey.values()].filter(g => g.length >= 2)
}

// The bound client repo moved and delivery.md did not. This is the one place
// the CLI can catch "we shipped code and told the record nothing" without AI:
// registry gives the workspace(s) bound to this engagement, git gives commits
// newer than the last dated delivery line. Local reads only.
// Only dates that stamp an entry count: a ledger row's Date cell, a dated
// bullet, a dated heading. "trial night 2026-06-02" inside a Measured cell is a
// promise, not a receipt - and a future promise must not hide today's commits.
function latestDeliveryEntry(md) {
  const today = new Date().toISOString().slice(0, 10)
  let latest = { date: '', line: '' }
  for (const raw of stripTemplateNoise(md).split('\n')) {
    const t = raw.trim()
    const m = t.match(/^[-*]\s*\[(\d{4}-\d{2}-\d{2})\]/) ||
      t.match(/^#{1,6}\s+\[?(\d{4}-\d{2}-\d{2})(?:\]|\b)/) ||
      t.match(/^\|\s*(\d{4}-\d{2}-\d{2})\s*\|/)
    if (!m || m[1] > today) continue
    if (m[1] >= latest.date) latest = { date: m[1], line: t }
  }
  return latest
}

function silentCommitIssues(eng) {
  const slug = path.basename(path.dirname(eng))
  const workspaces = readRegistry().filter(r => r.slug === slug).map(r => r.workspace)
  if (!workspaces.length) return []
  const entry = latestDeliveryEntry(readClean(eng, 'delivery.md'))
  const lastDelivery = entry.date
  const out = []
  for (const ws of workspaces) {
    let st
    try { st = fs.statSync(ws) } catch (_) { continue }
    if (!st.isDirectory()) continue
    // The memory folder is itself a git repo; never lint it as the client repo.
    if (path.resolve(ws) === path.resolve(eng) || path.resolve(ws) === path.dirname(path.resolve(eng))) continue
    if (sh('git rev-parse --is-inside-work-tree', ws) !== 'true') continue
    // Memory git knows the exact moment that entry was written; dates in the
    // file are day-grained and would miss a commit made later the same day.
    // Pickaxe on the entry text, not the file: a later status edit to
    // delivery.md must not become the cutoff and hide commits before it.
    const raw = entry.line
      ? sh(`git log -1 --format=%cI -S${JSON.stringify(entry.line)} -- delivery.md`, eng)
      : ''
    // git --since is inclusive at second grain; a commit in the same second as
    // the receipt is the receipt's own work, not a silent one.
    const stamp = raw && !Number.isNaN(Date.parse(raw)) ? new Date(Date.parse(raw) + 1000).toISOString() : ''
    const since = stamp ? `--since="${stamp}"`
      : lastDelivery ? `--since="${lastDelivery} 23:59:59"`
        : "--since='30 days ago'"
    const commits = sh(`git log ${since} --format=%h -- .`, ws).split('\n').filter(Boolean).length
    if (!commits) continue
    const where = path.basename(ws)
    out.push(
      lastDelivery
        ? `${commits} commit(s) in ${where} since the last delivery line (${lastDelivery}) - code moved, ledger did not; log the receipt or say why nothing shipped`
        : `${commits} commit(s) in ${where} in 30d and delivery.md has no dated line - code moved, ledger did not; fde log delivery "slice | bucket | promised | measured | accepted | evidence | rollback"`
    )
  }
  return out
}

// Deterministic fieldbook hygiene - shared by doctor + session TRIAGE.
// Silent when clean OR brand-new (no dated work yet). Never auto-rewrites.
// High-value moments: week-start (via triage), ship/close, after real work accrues.
function successContractIssues(success) {
  const issues = []
  const text = stripTemplateNoise(String(success || ''))
  const checks = []
  let active = -1
  for (const line of text.split('\n')) {
    const header = line.match(/^(?:\*\*)?(?:Done when|Acceptance check)(?:\s*\([^\n)]*\))?:(?:\*\*)?[^\S\n]*(.*)$/i)
    if (header) { checks.push(header[1].trim()); active = checks.length - 1; continue }
    if (/^#{1,6}\s|^\*\*[^*]+:/.test(line)) { active = -1; continue }
    if (active !== -1 && line.trim()) checks[active] += ` ${line.trim()}`
  }
  const observable = checks.some(check => {
    // This is a lint check, not a semantic proof. Explicit fields let any
    // domain describe its test without depending on a vocabulary of verbs.
    const target = /(?:\b(?:within|under|at most|at least|exactly|zero|no missing|no duplicate|all|every|none|true|false|pass|fail|http)\b|[<>=])/i
    const vague = /\b(?:tbd|unknown|to be defined|improve|better|satisfactory|as expected|works well)\b/i
    if (vague.test(check)) return false
    const explicit = check.match(/(?:^|\s)(?:-\s*)?Input:\s*(.+?)\s+(?:-\s*)?Pass when:\s*(.+)$/i)
    if (explicit) return explicit[1].trim().length > 3 && target.test(explicit[2])
    const stimulus = /\b(?:test|drill|replay|runs?|request|sample|given|when|simulate|inject|compare|restore|verified|observed|measured)\b/i.test(check)
      || /^\d+\s+[a-z]/i.test(check)
    const result = /\b(?:returns?|rejects?|matches?|equals?|arrives?|alerts?|restores?|passes?|fails?|contains?|produces?|shows?|remains?|receives?)\b/i.test(check)
      || /\b(?:zero|no duplicate|no missing)\s+[a-z]/i.test(check)
    return stimulus && result && target.test(check)
  })
  if (!observable) issues.push('success.md needs a binary acceptance check: the wording was not recognized as a test/input and observable pass/fail result under **Done when:** or **Acceptance check:**. Use Input: and Pass when: for a domain-specific check; this lint does not prove readiness')
  const signerLine = ((text.match(/^\*\*Stakeholder who signs off:\*\*[^\S\n]*(.*)$/m) || [])[1] || '').replace(/\[source:[^\]]+\]/gi, '').trim()
  // A named primary signer may be followed by responsibilities or another
  // signer's role. Preserve the full record; validate only the leading name.
  const signer = (signerLine.match(/^((?:[A-Z]\.|[A-Z][\w'-]+)(?:\s+(?:[A-Z]\.|[A-Z][\w'-]+)){0,2})(?=\s*(?:[.,;:]|\(|$))/) || [])[1] || ''
  if (!looksLikePersonName(signer) || /\b(?:pending|unknown|tbd|nobody|none|unassigned|unconfirmed)\b/i.test(signer)) issues.push('success.md needs a named customer-side signer under **Stakeholder who signs off:**; a team, role, or pending name is not authority')
  return issues
}

function collectDoctorIssues(eng, { readiness = false } = {}) {
  const issues = []
  const s = computeSignals(eng)
  // stripTemplateNoise: a dated example inside a template comment is not work.
  const datedBlob = stripTemplateNoise([
    readEng(eng, 'decisions.md'), readEng(eng, 'delivery.md'),
    readEng(eng, 'risks.md'), readEng(eng, 'stakeholders.md'),
  ].join('\n'))
  const hasDatedWork = /\[\d{4}-\d{2}-\d{2}\]/.test(datedBlob)
  // Day-1 empty templates are not hygiene failures - nagging there trains people to ignore doctor.
  const fresh = !hasDatedWork && (s.phase === '?' || s.phase === 'unset') && !s.openRisks

  if (s.memoryWarn) issues.push(s.memoryWarn)
  // A memory file that is not a regular file (a stray directory, a socket)
  // reads as empty and rejects every append - doctor used to call that healthy.
  for (const f of Object.values(LOG_FILES).concat('context.md')) {
    const abs = path.join(eng, f)
    let st
    try { st = fs.lstatSync(abs) } catch (_) { continue }
    if (st.isSymbolicLink()) {
      issues.push(`${f} is a symlink - writes are refused; replace it with a real file inside .fde/`)
    } else if (!st.isFile()) {
      issues.push(`${f} is not a regular file - reads come back empty and every write fails; remove it and re-run any fde write`)
    }
  }
  if (fresh && !readiness) return issues

  if (s.phase === '?' || s.phase === 'unset') {
    if (hasDatedWork) {
      issues.push(`phase is unset but dated work exists - run: fde log phase <${PHASES.join('|')}>`)
    }
  }
  if (s.stale) issues.push(`trust signal is STALE (${s.signalAge}d) - reconfirm with fde log contact ... --signal`)
  if (!readOwner(eng)) issues.push('no .owner - run any write or: fde owner set you@firm.com')
  const gitHealth = memoryGitHealthy(eng)
  if (!gitHealth.ok) {
    if (gitHealth.reason === 'broken') {
      issues.push(
        'memory git is BROKEN (UNVERSIONED) - receipts are not tamper-evident; repair: mv .fde/.git .fde/.git.broken && re-run any fde write (or resume --init) to re-init the ledger'
      )
    } else if (gitHealth.reason === 'no-git-bin') {
      issues.push('git binary missing - engagement memory cannot be versioned (receipts stay dated, not tamper-evident)')
    } else {
      issues.push('memory not git-versioned - next write will init, or re-run resume --init')
    }
  }
  for (const file of REDACT_FILES) {
    const abs = path.join(eng, file)
    if (!fs.existsSync(abs)) continue
    const { unclosed, stray } = privateMarkerImbalance(readEng(eng, file))
    if (stray) {
      issues.push(`${file} has ${stray} unmatched </private> - text after it is PUBLIC; pair or delete the marker`)
    }
    if (unclosed) {
      issues.push(`${file} has ${unclosed} unclosed <private> - everything after it is sealed, including notes added later`)
    }
  }
  const { hasSource } = require('./lib/provenance')
  const unsourced = readClean(eng, 'decisions.md').split('\n').filter(line => /^[-*]\s*\[\d{4}-\d{2}-\d{2}\]/.test(line.trim()) && !hasSource(line))
  if (unsourced.length) issues.push(`${unsourced.length} dated decision(s) remain CLAIM: source missing - add the actual meeting, transcript, email, or artifact reference; a log date is not evidence`)
  const success = readClean(eng, 'success.md')
  if (readiness || /^(plan|ship|outcome|close)$/.test(s.phase)) issues.push(...successContractIssues(success))
  if (!firstLine(success, 80)) issues.push('success.md has no stated done-definition - fill before plan/ship')
  const ctxMd = readClean(eng, 'context.md')
  if (!sectionBody(ctxMd, 'Next action', { lastNonEmpty: true })) {
    issues.push('no ## Next action in context.md - Monday morning has nothing to drive')
  } else if (countSections(ctxMd, 'Next action') > 1) {
    issues.push(
      'duplicate ## Next action headings in context.md - fill the first (template) section and remove extras; triage reads the last non-empty'
    )
  }
  // Open, owned risks are normal mid-ship (triage already shows the count every
  // session). The gate is close: nothing still live when you call the embed done.
  if (s.phase === 'close' && s.openRisks > 0) {
    issues.push(
      `phase is close with ${s.openRisks} open risk(s) - retire, hand off, or move still-live ones before calling the embed done`
    )
  }
  if (s.phase === 'close' || s.phase === 'ship') {
    if (!hasValueBucket(eng)) {
      issues.push(
        `phase is ${s.phase} with no value bucket (cost-save | risk-mitigation | revenue-uplift) in success.md or delivery value ledger`
      )
    }
    const value = claimedValueRows(eng)
    if (value.claimed) {
      issues.push(
        `${value.claimed} value ledger row(s) measured but not accepted by anyone on the customer side${value.columnMissing ? ' (no "Accepted by" column)' : ''} - a number only we agree with is claimed, not delivered; name who signed off in delivery.md`
      )
    }
    if (engagementTouchesAI(eng) && !hasEvalReceipt(eng)) {
      issues.push(
        `phase is ${s.phase} with AI in scope but no eval receipt (evals.md Verdict or delivery Eval / Ship receipts) - required before green ship/close`
      )
    } else if (!engagementTouchesAI(eng)) {
      const hit = workspaceAIHit(eng)
      if (hit) {
        issues.push(
          `the bound workspace calls a model (${hit.file}) but nothing in the record says AI is in scope - the eval gate is off; record it: fde log decision "AI in scope: …"`
        )
      }
    }
    issues.push(...silentCommitIssues(eng))
  }
  const dupes = findDuplicateOpenRisks(eng)
  if (dupes.length) {
    const sample = maskDisplay((dupes[0][0] || '').replace(/\s+/g, ' ').trim()).slice(0, 60)
    issues.push(
      `${dupes.length} duplicate open-risk cluster(s) (e.g. "${sample}${sample.length >= 60 ? '…' : ''}") - consolidate or retire echoes in risks.md`
    )
  }
  // Failure-path (exception-led operating map): required once past discover.
  // Land seeds; discover fills; plan+ without a real break→owner row is wallpaper.
  if (/^(plan|ship|outcome|close)$/.test(s.phase) && !hasOperatingMapContent(eng)) {
    issues.push(
      `phase is ${s.phase} with empty operating map - fill terrain.md ## Operating map (exception-led): break → who notices → workaround → evidence`
    )
  }
  // A second copy of a heading the gates read: they take the last filled one, so
  // the record is ambiguous rather than lost. Say so once, here.
  // Full heading names only: "Value" would also match "## Value ledger".
  for (const [file, heading] of [['terrain.md', 'Operating map'], ['delivery.md', 'Value ledger']]) {
    if (countSections(readClean(eng, file), heading) > 1) {
      issues.push(`duplicate ## ${heading} headings in ${file} - merge into one section; the gates read the last filled one`)
    }
  }
  const aliases = findAmbiguousStakeholders(eng)
  if (aliases.length) {
    const sample = aliases[0].forms.slice(0, 3).join(' / ')
    issues.push(
      `${aliases.length} stakeholder identity cluster(s) (e.g. "${sample}") - same person under different names? consolidate in stakeholders.md`
    )
  }
  const reality = parseReality(readClean(eng, 'reality.md'), 220)
  if (reality.missing) issues.push(reality.missing)
  issues.push(...changeReviewIssues(eng))
  return issues
}

// True when ## Operating map has at least one real exception row (not the empty template).
// lastNonEmpty: an agent that appends a filled section leaves the empty template
// heading above it. Reading the first match called that work invisible.
function hasOperatingMapContent(eng) {
  const terrain = stripTemplateNoise(readClean(eng, 'terrain.md'))
  const body = sectionBody(terrain, 'Operating map', { lastNonEmpty: true })
  if (!body.trim()) return false
  const table = parseMdTable(body)
  if (table) {
    const exIdx = colIndex(table.headers, /exception|break/i)
    const idx = exIdx !== -1 ? exIdx : 0
    for (const row of table.rows) {
      const cell = (row[idx] || '').trim()
      if (cell && !/^unknown/i.test(cell)) return true
    }
  }
  for (const raw of body.split('\n')) {
    const t = raw.trim().replace(/^[-*]\s+/, '')
    if (!t || t.startsWith('#') || t.startsWith('|') || /^\*\*/.test(t)) continue
    if (t.length >= 8 && !/^unknown/i.test(t)) return true
  }
  return false
}

// Near-duplicate stakeholder forms sharing a first-name key (Denise vs Denise Chen).
function findAmbiguousStakeholders(eng) {
  const forms = []
  const md = readClean(eng, 'stakeholders.md')
  const table = parseMdTable(md)
  if (table) {
    const nameIdx = colIndex(table.headers, /name|who/i)
    if (nameIdx !== -1) {
      for (const row of table.rows) {
        const name = (row[nameIdx] || '').trim()
        if (!name || name.length < 2) continue
        forms.push(name)
      }
    }
  }
  for (const h of parseSignalHistoryEntries(eng)) {
    const name = displayNameFromSignalText(h.text)
    if (name && name.length >= 2 && !/^anon:/i.test(name)) forms.push(name)
  }
  const byKey = new Map()
  for (const name of forms) {
    const key = signalSubjectKey(name)
    if (!key || key.startsWith('anon:')) continue
    const norm = name.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
    if (!norm || norm.length < 2) continue
    if (!byKey.has(key)) byKey.set(key, new Set())
    byKey.get(key).add(norm)
  }
  const clusters = []
  for (const [key, set] of byKey) {
    if (set.size < 2) continue
    // Prefer clusters where forms aren't just identical casing - already lowercased.
    // Require at least one multi-token form vs a shorter form (Denise / Denise Chen).
    const list = [...set]
    const hasLong = list.some(f => f.split(/\s+/).length >= 2)
    const hasShort = list.some(f => f.split(/\s+/).length === 1)
    if (hasLong && hasShort) {
      clusters.push({ key, forms: list })
      continue
    }
    // Or two multi-token forms that share first token but differ later (Denise Chen / Denise C.)
    if (list.length >= 2 && list.every(f => f.split(/\s+/).length >= 2)) {
      clusters.push({ key, forms: list })
    }
  }
  return clusters
}

// Strip template comments / italic *(hints)* so doctor does not treat stubs as filled.
function stripTemplateNoise(md) {
  return String(md || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\*\([^)]*\)\*/g, '')
}

// Drop "**Label:** allowed · values" guidance lines. A receipt is a dated line or a
// table row - never a bold label - so template prose that *documents* a receipt must
// not satisfy the gate requiring one. hasOperatingMapContent already skips these.
function stripLegendLines(md) {
  return String(md || '').split('\n')
    .filter(l => !/^\s*\*\*[^*]+:\*\*/.test(l))
    .join('\n')
}

const VALUE_BUCKET_RE = /(cost[- ]?save|risk[- ]?mitigat|revenue[- ]?uplift)/i

function hasValueBucket(eng) {
  const success = stripTemplateNoise(readClean(eng, 'success.md'))
  const bucketLine = success.match(/\*\*Primary value bucket:\*\*\s*(.+)/i)
  if (bucketLine && VALUE_BUCKET_RE.test(bucketLine[1].trim())) return true
  if (!/\*\*Primary value bucket:\*\*/i.test(success) && VALUE_BUCKET_RE.test(success)) return true

  const ledger = stripLegendLines(stripTemplateNoise(sectionBody(readClean(eng, 'delivery.md'), 'Value ledger', { lastNonEmpty: true }) || ''))
  const table = parseMdTable(ledger)
  if (table) {
    const bIdx = colIndex(table.headers, /bucket/i)
    if (bIdx !== -1) {
      for (const row of table.rows) {
        const cell = String(row[bIdx] || '').trim()
        if (cell && VALUE_BUCKET_RE.test(cell)) return true
      }
    } else if (VALUE_BUCKET_RE.test(ledger)) {
      return true
    }
  } else if (VALUE_BUCKET_RE.test(ledger)) {
    return true
  }
  return false
}

// Shared classification keeps CLI, dashboard, and vault acceptance consistent.
const { PENDING_CELL_RE, valueState, evidenceSource, reconcileValueRows } = require('./lib/value-ledger')

function parseValueLedger(eng) {
  // Last section with actual rows, not merely the last non-empty one: a template
  // copy appended below filled work is a header and a legend - text, but no
  // value - and it would otherwise shadow a real accepted row above it.
  const bodies = sectionBodies(readClean(eng, 'delivery.md'), 'Value ledger')
    .map(b => stripTemplateNoise(b || ''))
  const withRows = [...bodies].reverse().find(b => valueLedgerRowCount(b))
  const table = parseMdTable(withRows || [...bodies].reverse().find(Boolean) || '')
  if (!table) return { rows: [], columnMissing: false }
  const idx = {
    slice: colIndex(table.headers, /slice/i),
    promised: colIndex(table.headers, /promised/i),
    measured: colIndex(table.headers, /measured/i),
    accepted: colIndex(table.headers, /accepted by/i),
    acceptanceStatus: colIndex(table.headers, /^acceptance status$/i),
    evidence: colIndex(table.headers, /evidence/i),
  }
  const cell = (row, i) => (i === -1 ? '' : String(row[i] || '').trim())
  const rows = []
  for (const row of table.rows) {
    const slice = cell(row, idx.slice)
    const promised = cell(row, idx.promised)
    const measured = cell(row, idx.measured)
    const accepted = cell(row, idx.accepted)
    if (!slice && !promised && !measured) continue
    const evidence = cell(row, idx.evidence)
    const acceptanceStatus = idx.acceptanceStatus === -1 ? undefined : cell(row, idx.acceptanceStatus)
    const state = valueState({ measured, accepted, acceptanceStatus, evidence })
    rows.push({ slice, promised, measured, accepted, acceptanceStatus, evidence, evidenceMissing: !evidenceSource(evidence), state })
  }
  return { rows: reconcileValueRows(rows, readClean(eng, 'success.md')), columnMissing: idx.accepted === -1 }
}

function claimedValueRows(eng) {
  const { rows, columnMissing } = parseValueLedger(eng)
  return { claimed: rows.filter(r => r.state === 'claimed').length, columnMissing }
}

function formatValueLedgerLine(r) {
  const name = r.slice || 'value'
  let body = r.promised || ''
  if (r.state !== 'unmeasured' && r.measured) {
    if (!body) body = r.measured
    else if (!body.includes(r.measured)) body = `${body} → ${r.measured}`
  }
  const head = body ? `${name}: ${body}` : name
  if (r.state === 'accepted') return `${head} · accepted by ${r.accepted}`
  const issue = r.acceptanceIssue ? `; ${r.acceptanceIssue}` : ''
  if (r.state === 'claimed') return `${head} · claimed, not yet accepted${issue}`
  return `${head} · not yet measured${issue}`
}

function valueLedgerStatusLines(eng, opts = {}) {
  const { rows } = parseValueLedger(eng)
  if (!rows.length) return ['    value: none yet']
  const cap = opts.compact ? 1 : 8
  const lines = rows.slice(0, cap).map(r => `    ${formatValueLedgerLine(r)}`)
  if (rows.length > cap) lines.push(`    … ${rows.length - cap} more in delivery.md`)
  return lines
}

// AI in scope for ship/close hygiene - the FDE's own words, wherever they wrote them.
// Do not scan terrain.md: its template headers mention LLM and would false-positive every ship.
function engagementTouchesAI(eng) {
  const trust = readClean(eng, 'trust-profile.md')
  const aiSec = stripTemplateNoise(sectionBody(trust, 'AI policy', { lastNonEmpty: true }) || '')
  if (aiSec.trim().length > 20) return true
  // Not **AI code policy:** - that field is about the FDE's own agent writing
  // code ("permitted with human review"), which every engagement now has. AI in
  // the shipped product is a different claim, and only the record's own words
  // below can make it.
  // brief/success/risks included: an engagement is often declared AI in the brief
  // or in a risk ("nobody can say what the accuracy was") and never again.
  const blob = stripTemplateNoise([
    readClean(eng, 'delivery.md'),
    readClean(eng, 'decisions.md'),
    readClean(eng, 'brief.md'),
    readClean(eng, 'success.md'),
    readClean(eng, 'risks.md'),
    readClean(eng, 'assumptions.md'),
  ].join('\n'))
  // No bare "prompt": "prompt response" / "prompt payment" is ordinary delivery
  // English and would fail every non-AI ship on a missing eval receipt.
  return /\bAI in scope\b|\b(llm|rag|embedding|model card|model output|model drift|agentic|openai|anthropic|vector database|vector db|fine-tun\w*|hallucinat\w*)\b|\bmodel inference\b|\binference (?:api|endpoint|server|engine)\b|\b(?:system|model|user)\s+prompts?\b|\bprompt (?:engineering|injection|template)/i.test(blob)
}

// The repo says AI even when the record does not. Read-only, capped, local: the
// point is to refuse to run a silent green ship over an unevaluated model.
function workspaceAIHit(eng) {
  const slug = path.basename(path.dirname(eng))
  const ws = readRegistry().filter(r => r.slug === slug).map(r => r.workspace)
  for (const dir of ws.slice(0, 3)) {
    let files
    try {
      if (!fs.existsSync(dir)) continue
      files = walk(dir, CODE_EXT, 1500)
    } catch (_) { continue }
    const hit = grepFiles(files, AI_CODE_RE, 1)[0]
    if (hit) return { workspace: dir, file: hit.file }
  }
  return null
}

function hasEvalReceipt(eng) {
  const evalsPath = path.join(eng, 'evals.md')
  if (fs.existsSync(evalsPath)) {
    const e = stripTemplateNoise(readClean(eng, 'evals.md'))
    // Empty G1 stub + "Pass / fail" heading is not a receipt - need a real verdict/run/result.
    if (/\*\*Verdict:\*\*\s*SHIP\b/i.test(e) || /(?:^|\n)\s*-\s*\*\*Verdict:\*\*\s*SHIP\b/i.test(e)) return true
    if (/\bLast run:\s*\d{4}-\d{2}-\d{2}/i.test(e)) return true
    if (/\|\s*G\d+\s*\|[^|\n]+\|[^|\n]+\|[^|\n]+\|[^|\n]+\|\s*pass\s*\|/i.test(e)) return true
  }
  const del = stripLegendLines(stripTemplateNoise(readClean(eng, 'delivery.md')))
  if (/#{1,6}\s+Eval\b/i.test(del) && /\b(pass|SHIP|\d+\/\d+)\b/i.test(sectionBody(del, 'Eval', { lastNonEmpty: true }) || del)) return true
  if (/\beval (pack|receipt)[:\s].*\b(pass|SHIP)\b/i.test(del)) return true
  const receipts = sectionBody(del, 'Ship receipts', { lastNonEmpty: true }) || ''
  if (/\bevals\.md\b/i.test(receipts) && /\b(pass|SHIP)\b/i.test(receipts) && !/\*\([^)]*evals\.md[^)]*\)\*/i.test(receipts)) {
    return true
  }
  return false
}

// Lean line for session-start TRIAGE - count + top issue + NL cue. Omitted when clean.
function hygieneTriageLines(eng) {
  const issues = collectDoctorIssues(eng)
  if (!issues.length) return []
  const top = maskDisplay(issues[0].replace(/\s+/g, ' ').trim()).slice(0, 72)
  return [
    `  hygiene: ${issues.length} issue(s) - ${top}${issues[0].length > 72 ? '…' : ''}`,
    '    → say "@fde clean up the fieldbook" when ready (agent runs fde doctor; nothing auto-rewrites), or: fde doctor',
  ]
}

function deliverySummaryFor(eng) {
  const signals = computeSignals(eng)
  const next = stripTemplateNoise(sectionBody(readClean(eng, 'context.md'), 'Next action', { lastNonEmpty: true })).trim()
  const signer = ((readClean(eng, 'success.md').match(/^\*\*Stakeholder who signs off:\*\*[^\S\n]*(.*)$/m) || [])[1] || '').trim()
  return deliverySummary({ signals, next, hasNext: !!next,
    hasSigner: !!require('./lib/value-ledger').acceptanceName(signer),
    highRisks: extractRisks(eng).filter(r => r.severity === 'high').length,
    valueRows: parseValueLedger(eng).rows,
    quiet: signals.ageDays !== Infinity && signals.ageDays >= 3,
  })
}

function firstActionLine(eng) {
  const action = deliverySummaryFor(eng).firstAction
  return `  do first: ${previewLine(action.text, 140)} (${action.source}: ${previewLine(action.reason, 140)})`
}

function printTriageBlock(eng) {
  console.log(resumeTriage(eng))
  console.log(firstActionLine(eng))
  for (const line of hygieneTriageLines(eng)) console.log(line)
}

// What a session must not have to ask for: who signs, what was promised, what was
// decided. Read-only, and from the same places the writers use - the signer is
// success.md **Stakeholder who signs off** (what `signer:` fills), never a role
// guess out of stakeholders.md, where contacts live. Bounded on purpose (<= 6
// lines): this is injected into every session.
function recordDigest(eng) {
  const success = stripTemplateNoise(readClean(eng, 'success.md'))
  const signer = ((success.match(/^\*\*Stakeholder who signs off:\*\*[^\S\n]*(.*)$/m) || [])[1] || '').trim()
  // "(none)" rather than a missing line: on session start, nobody named to sign
  // off is the fact worth seeing, not an absence to scroll past.
  const lines = [`  signer: ${masking.mask(signer).slice(0, 110) || '(none)'}`]
  const { rows } = parseValueLedger(eng)
  const promisedRow = [...rows].reverse().find(r => r.promised)
  if (promisedRow) {
    lines.push(`  promised: ${masking.mask(formatValueLedgerLine(promisedRow)).slice(0, 110)}`)
  } else {
    const target = ((success.match(/^\*\*Baseline[^\S\n]*→[^\S\n]*target:\*\*[^\S\n]*(.*)$/m) || [])[1] || '').trim()
    if (target) lines.push(`  promised: ${masking.mask(target).slice(0, 110)}`)
  }
  const decisions = datedDecisions(readClean(eng, 'decisions.md')).slice(-2)
  for (const d of decisions) lines.push(`  decided: ${formatDecisionRecord(d.text)}; source: ${previewLine(sourceReference(d.text) || '(missing)', 100)}`)
  return ['RECORD (read-only - success, delivery, decisions)', ...lines]
}

function cmdDoctor(args = []) {
  const eng = resolveEngagement()
  if (!eng) { console.error('no engagement - run: fde resume --init <name>'); process.exit(2) }
  const issues = collectDoctorIssues(eng, { readiness: args.includes('--ready') })
  console.log(`FDE DOCTOR - ${engagementSlugFromPath(eng)}`)
  printTriageBlock(eng)
  if (!issues.length) {
    console.log('\nOK - no structural issues (judgment still yours)')
    process.exit(0)
  }
  console.log(`\n${issues.length} issue(s):`)
  issues.forEach((i, n) => console.log(`  ${n + 1}. ${i}`))
  process.exit(1)
}

// Remove buried lines that contain a search term (secrets noticed hours later).
// Preview by default; --apply commits the scrub to the memory ledger.
const REDACT_FILES = [
  'decisions.md', 'risks.md', 'delivery.md', 'stakeholders.md', 'context.md',
  'brief.md', 'reality.md', 'assumptions.md', SIGNAL_LEDGER,
]

function cmdRedact(args) {
  const apply = args.includes('--apply')
  const term = args.filter(a => a !== '--apply').join(' ').trim()
  if (!term || term.length < 4) {
    console.error('usage: fde redact <term> [--apply]\n  preview lines containing <term>; --apply removes them and commits the ledger')
    process.exit(1)
  }
  const eng = resolveEngagement({ forWrite: apply })
  if (!eng) { console.error('no engagement - run: fde resume --init <name>'); process.exit(2) }
  const needle = term.toLowerCase()
  const hits = []
  for (const file of REDACT_FILES) {
    const abs = path.join(eng, file)
    if (!fs.existsSync(abs)) continue
    const md = readEng(eng, file)
    const lines = md.split('\n')
    lines.forEach((line, i) => {
      if (line.toLowerCase().includes(needle)) hits.push({ file, lineNo: i + 1, line })
    })
  }
  if (!hits.length) {
    console.log(`redact: no lines contain ${JSON.stringify(term)}`)
    return
  }
  console.log(`REDACT - ${hits.length} matching line(s) for ${JSON.stringify(term)}`)
  hits.slice(0, 20).forEach(h => {
    const preview = h.line.length > 100 ? masking.mask(h.line).slice(0, 97) + '…' : h.line
    console.log(`  ${h.file}:${h.lineNo}  ${preview}`)
  })
  if (hits.length > 20) console.log(`  … +${hits.length - 20} more`)
  if (!apply) {
    console.log('\nPreview only. Remove and commit:  fde redact <term> --apply')
    console.log('Note: git history still holds prior commits - rotate the real secret.')
    return
  }
  ensureMemoryGit(eng)
  const touched = []
  for (const file of new Set(hits.map(h => h.file))) {
    const abs = path.join(eng, file)
    withFileLock(abs, () => {
      const before = readEng(eng, file)
      const after = before.split('\n').filter(line => !line.toLowerCase().includes(needle)).join('\n')
      if (after === before) return
      atomicWriteFile(abs, after.endsWith('\n') || after === '' ? after : after + '\n')
      touched.push(file)
    })
  }
  if (!touched.length) {
    console.log('nothing changed')
    return
  }
  const hash = commitMemory(eng, `redact ${hits.length} line(s)`, { files: touched })
  console.log(`redacted ${hits.length} line(s) in ${touched.join(', ')}${hash ? ` @${hash}` : ''}`)
  console.log('rotate the real credential if this was a secret - history may still contain it')
}

function cmdPrep(args) {
  const eng = resolveEngagement()
  if (!eng) { console.error('no engagement - run: fde resume --init <name>'); process.exit(2) }
  const label = args.join(' ').trim() || 'next meeting'
  // Grounded brief: only text already in .fde/. No invention (Rowboat meeting-prep rule).
  console.log(`MEETING PREP - ${label}`)
  console.log('(grounded in local .fde/ only - if a fact is missing, it is missing)\n')
  console.log(resumeTriage(eng))
  const owner = readOwner(eng)
  const head = memoryHead(eng)
  if (owner || head) console.log(`  record: ${owner ? owner.email : '?'}${head ? `  @${head}` : ''}`)

  const people = extractStakeholders(eng).slice(0, 8)
  console.log('\nStakeholders (table + signal history)')
  if (!people.length) console.log('  (none yet - log contacts with --signal)')
  else people.forEach(p => console.log(`  [${p.signal}] ${p.name}${p.role ? ` - ${p.role}` : ''}${p.note ? ` · ${masking.mask(p.note).slice(0, 60)}` : ''}`))

  const risks = extractRisks(eng).slice(0, 5)
  console.log('\nOpen risks (table + dated bullets)')
  if (!risks.length) console.log('  (none logged)')
  else risks.forEach(r => console.log(`  [${r.severity}] ${masking.mask(r.text).slice(0, 100)}`))

  const success = firstLine(readClean(eng, 'success.md'), 160)
  console.log('\nSuccess looks like')
  console.log(success ? `  ${success}` : '  (success.md empty)')

  const decisions = readClean(eng, 'decisions.md').split('\n')
    .filter(l => /^-\s*\[\d{4}-\d{2}-\d{2}\]/.test(l.trim()))
    .slice(-5)
  console.log('\nRecent decisions')
  if (!decisions.length) console.log('  (none logged)')
  else decisions.forEach(l => console.log(`  ${masking.mask(l.trim()).slice(0, 120)}`))

  const next = nextActionLine(readClean(eng, 'context.md'))
  console.log('\nWalk in with')
  console.log(next ? `  ${next}` : '  (set ## Next action in context.md)')
}

function cmdGarden(args) {
  const apply = args.includes('--apply')
  const eng = resolveEngagement({ forWrite: apply })
  if (!eng) { console.error('no engagement - run: fde resume --init <name>'); process.exit(2) }
  const gitHealth = memoryGitHealthy(eng)
  // Gardener contract (from Rowboat note_curation): no new facts, no deleted substance,
  // reversible via git when healthy, confirm before apply. Mechanical only - no LLM rewrite.
  if (gitHealth.ok) {
    console.log('TIDY (contract: no new facts · no deleted substance · reversible via memory git)')
  } else if (gitHealth.reason === 'broken') {
    console.log('TIDY (contract: no new facts · no deleted substance · ⚠ memory git BROKEN - NOT reversible until ledger is repaired)')
  } else {
    console.log('TIDY (contract: no new facts · no deleted substance · ⚠ memory not git-versioned - NOT reversible)')
  }
  console.log(resumeTriage(eng))
  if (!gitHealth.ok) {
    console.log(
      gitHealth.reason === 'broken'
        ? '\n⚠ ledger is UNVERSIONED (corrupt .git). Repair before trusting tidy apply: mv .fde/.git .fde/.git.broken && run any fde write to re-init.'
        : '\n⚠ no memory git - tidy apply cannot create a reversible commit until the ledger exists.'
    )
  }
  const proposals = []
  const s = computeSignals(eng)
  if (s.stale) {
    proposals.push({
      id: 'reconfirm-signal',
      kind: 'manual',
      text: `Reconfirm stale ${s.trust} signal (${s.signalAge}d): fde log contact "…" --signal`,
    })
  }
  const dupes = findDuplicateOpenRisks(eng)
  if (dupes.length) {
    const sample = maskDisplay((dupes[0][0] || '').replace(/\s+/g, ' ').trim()).slice(0, 50)
    proposals.push({
      id: 'dedupe-risks',
      kind: 'apply',
      text: `Consolidate ${dupes.length} duplicate open-risk cluster(s) (e.g. "${sample}${sample.length >= 50 ? '…' : ''}") - keep first, retire echoes`,
      clusters: dupes,
    })
  }
  const ctx = readEng(eng, 'context.md')
  const sessionBlocks = []
  const lines = ctx.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+Session end\s+-\s+(\d{4}-\d{2}-\d{2})\b/)
    if (!m) continue
    const age = Math.floor((Date.now() - Date.parse(m[1])) / 86400000)
    if (age >= 60) sessionBlocks.push({ line: i, date: m[1], age })
  }
  if (sessionBlocks.length >= 3) {
    proposals.push({
      id: 'archive-sessions',
      kind: 'apply',
      text: `Archive ${sessionBlocks.length} session-end blocks older than 60d into context-archive.md`,
      sessionBlocks,
    })
  }
  const dirty = memoryDirtyManual(eng)
  if (dirty.length) {
    proposals.push({
      id: 'bless-manual',
      kind: 'apply',
      text: `Bless ${dirty.length} hand-written file(s) into the ledger: ${dirty.slice(0, 5).join(', ')}${dirty.length > 5 ? '…' : ''}`,
      files: dirty,
    })
  }
  if (!proposals.length) {
    console.log('\nNothing to tidy.')
    return
  }
  console.log(`\n${proposals.length} proposal(s):`)
  proposals.forEach((p, i) => console.log(`  ${i + 1}. [${p.kind}] ${p.text}`))
  if (!apply) {
    console.log('\nApply mechanical items only:  fde tidy --apply')
    console.log('Manual items stay yours. Every apply commits to memory git when the ledger is healthy.')
    return
  }
  if (!gitHealth.ok && gitHealth.reason === 'broken') {
    console.error('refusing tidy --apply while memory git is broken - repair the ledger first')
    process.exit(1)
  }
  ensureMemoryGit(eng)
  let applied = 0
  const touched = new Set()
  for (const p of proposals) {
    if (p.id === 'dedupe-risks') {
      const n = applyRiskDedupe(eng, p.clusters)
      if (n > 0) {
        applied++
        touched.add('risks.md')
        console.log(`applied: retired ${n} duplicate open-risk echo(s) → ## Retired`)
      }
      continue
    }
    if (p.id === 'bless-manual') {
      applied++
      for (const f of p.files) touched.add(f)
      console.log(`applied: bless ${p.files.join(', ')}`)
      continue
    }
    if (p.id !== 'archive-sessions') continue
    let archived
    try {
      archived = withFileLock(path.join(eng, 'context.md'), () => {
        const cutDates = new Set(p.sessionBlocks.map(b => b.date))
        const keep = []
        const archive = []
        let mode = 'keep'
        let buf = []
        const flush = () => {
          if (!buf.length) return
          ;(mode === 'archive' ? archive : keep).push(...buf)
          buf = []
        }
        for (const line of readEng(eng, 'context.md').split('\n')) {
          const m = line.match(/^##\s+Session end\s+-\s+(\d{4}-\d{2}-\d{2})\b/)
          if (m) {
            flush()
            mode = cutDates.has(m[1]) ? 'archive' : 'keep'
          } else if (/^##\s+/.test(line) && mode === 'archive') {
            flush()
            mode = 'keep'
          }
          buf.push(line)
        }
        flush()
        if (!archive.length) return false
        const archPath = path.join(eng, 'context-archive.md')
        withFileLock(archPath, () => {
          const prev = readEng(eng, 'context-archive.md') || '# Context archive\n\n'
          atomicWriteFile(archPath, prev.replace(/\n*$/, '\n\n') + archive.join('\n').trim() + '\n', { soft: true })
        }, { soft: true })
        atomicWriteFile(path.join(eng, 'context.md'), keep.join('\n').replace(/\n*$/, '\n'), { soft: true })
        return true
      }, { soft: true })
    } catch (e) {
      console.error(`tidy archive: ${e.message}`)
      process.exit(1)
    }
    if (!archived) continue
    applied++
    touched.add('context.md')
    touched.add('context-archive.md')
    console.log(`applied: archived ${p.sessionBlocks.length} old session-end blocks → context-archive.md`)
  }
  const hash = commitMemory(eng, 'tidy', { files: [...touched] })
  if (!applied) console.log('no mechanical proposals applied (manual items remain)')
  else console.log(`tidy done${hash ? ` @${hash}` : ''}`)
}

// Keep the first open-risk bullet per fingerprint; move later echoes under ## Retired.
function applyRiskDedupe(eng, clusters) {
  const p = path.join(eng, 'risks.md')
  return withFileLock(p, () => {
    let md = readEng(eng, 'risks.md')
    if (!md) return 0
    const echoTexts = new Set()
    for (const group of clusters) {
      for (let i = 1; i < group.length; i++) echoTexts.add(group[i])
    }
    if (!echoTexts.size) return 0
    const retiredLines = []
    const kept = []
    let inRetired = false
    let moved = 0
    for (const raw of md.split('\n')) {
      const t = raw.trim()
      if (/^#{1,6}\s+Retired\b/i.test(t)) {
        inRetired = true
        kept.push(raw)
        continue
      }
      if (!inRetired) {
        const m = t.match(/^-\s*\[\d{4}-\d{2}-\d{2}\]\s*(?:\[@[^\]]+\]\s*)?(.*)$/)
        if (m && echoTexts.has(m[1].trim())) {
          retiredLines.push(raw)
          moved++
          continue
        }
      }
      kept.push(raw)
    }
    if (!moved) return 0
    let out = kept.join('\n')
    if (!/^#{1,6}\s+Retired\b/im.test(out)) {
      out = out.replace(/\n*$/, '\n\n## Retired\n')
    }
    const stamp = new Date().toISOString().slice(0, 10)
    const block = retiredLines.map(l => {
      const body = l.trim().replace(/^-\s*/, '')
      return `- [${stamp}] (tidy dedupe) ${body}`
    }).join('\n')
    out = appendUnderSection(out, 'Retired', block)
    atomicWriteFile(p, out.endsWith('\n') ? out : out + '\n')
    return moved
  })
}

function engagementSlugFromPath(eng) {
  return path.basename(path.dirname(eng))
}

function cmdStatus(args) {
  const all = args.includes('--all')
  if (!fs.existsSync(ENGAGEMENTS_ROOT)) { console.log('no engagements yet - fde resume --init <name>'); return }
  const rows = []
  if (all) {
    for (const d of fs.readdirSync(ENGAGEMENTS_ROOT)) {
      if (d.startsWith('.')) continue
      const eng = path.join(ENGAGEMENTS_ROOT, d, '.fde')
      if (!fs.existsSync(eng)) continue
      const s = computeSignals(eng)
      const note = maskDisplay([s.memoryWarn, (s.dirtyFiles && s.dirtyFiles.length) ? `dirty:${s.dirtyFiles.length}` : '', s.reason || s.topRisk].filter(Boolean).join(' · ')).slice(0, 70)
      rows.push({ name: d, phase: s.phase, trust: s.trust, signalAge: s.signalAge, stale: s.stale, updated: s.updated, reason: note, memoryWarn: s.memoryWarn, dirtyFiles: s.dirtyFiles, valueLines: valueLedgerStatusLines(eng, { compact: true }) })
    }
  } else {
    const eng = resolveEngagement()
    if (!eng) {
      console.error('no engagement bound to this workspace.\nrun: fde resume --init <name>   or   fde status --all')
      process.exit(2)
    }
    const s = computeSignals(eng)
    const note = maskDisplay([s.memoryWarn, (s.dirtyFiles && s.dirtyFiles.length) ? `dirty:${s.dirtyFiles.length}` : '', s.reason || s.topRisk].filter(Boolean).join(' · ')).slice(0, 70)
    rows.push({ name: engagementSlugFromPath(eng), phase: s.phase, trust: s.trust, signalAge: s.signalAge, stale: s.stale, updated: s.updated, reason: note, memoryWarn: s.memoryWarn, dirtyFiles: s.dirtyFiles, valueLines: valueLedgerStatusLines(eng) })
  }
  if (!rows.length) { console.log('no engagements yet'); return }
  // `new` sorts last: nothing to act on yet, unlike a green somebody confirmed.
  const order = { RED: 0, amber: 1, green: 2, new: 3 }
  rows.sort((a, b) => order[a.trust] - order[b.trust])
  console.log((all ? 'FDE PORTFOLIO' : 'FDE STATUS') + ' - value first, then trust\n')
  for (const r of rows) {
    for (const line of r.valueLines) console.log(line)
    // "amber?" = structured signal went stale (>21d) - reconfirm before trusting it
    // "new" = nobody has been asked yet; green is reserved for asked-and-fine.
    const label = r.trust + (r.stale ? '?' : '')
    const sig = r.signalAge != null ? `signal ${r.signalAge}d old${r.stale ? ' (STALE - reconfirm)' : ''}  ` : ''
    console.log(`  [${label.padEnd(6)}] ${r.name.padEnd(24)} phase:${(r.phase === '?' ? 'unset' : r.phase).padEnd(10)} updated:${r.updated.padEnd(8)} ${sig}${r.reason}`)
    if (r.memoryWarn) console.log(`           memory: ${r.memoryWarn}`)
    if (r.dirtyFiles && r.dirtyFiles.length) {
      console.log(`           ⚠ dirty (uncommitted manual edits): ${r.dirtyFiles.slice(0, 5).join(', ')}`)
    }
  }
  if (!all) console.log('\n(current engagement only - pass --all for the full portfolio)')
  if (!all) {
    const current = resolveEngagement()
    if (current) for (const line of hygieneTriageLines(current)) console.log(line)
  }
  console.log('\ntrust: worst active [signal:x] across stakeholders (latest per person) - a green from B cannot clear an amber/red on A; keyword heuristic only when none exists.')
}


// ---------- dashboard (deterministic markdown → one local HTML) ----------

const render = require("./lib/render")

function gatherEngagements(opts = {}) {
  const list = []
  if (opts.only) {
    list.push({ name: engagementSlugFromPath(opts.only), dir: opts.only, signals: computeSignals(opts.only) })
    return list
  }
  if (!fs.existsSync(ENGAGEMENTS_ROOT)) return list
  for (const d of fs.readdirSync(ENGAGEMENTS_ROOT).sort()) {
    if (d.startsWith('.')) continue
    const eng = path.join(ENGAGEMENTS_ROOT, d, '.fde')
    if (!fs.existsSync(eng)) continue
    list.push({ name: d, dir: eng, signals: computeSignals(eng) })
  }
  return list
}

function cmdDashboard(args) {
  const all = args.includes('--all')
  const outIdx = args.indexOf('--out')
  const outPath = outIdx !== -1 && args[outIdx + 1]
    ? path.resolve(args[outIdx + 1].replace(/^~/, HOME))
    : path.join(ENGAGEMENTS_ROOT, all ? 'fieldbook.html' : 'fieldbook-current.html')
  let engagements
  if (all) {
    engagements = gatherEngagements()
  } else {
    const eng = resolveEngagement()
    if (!eng) {
      console.error('no engagement bound to this workspace.\nrun: fde resume --init <name>   or   fde dashboard --all')
      process.exit(2)
    }
    engagements = gatherEngagements({ only: eng })
  }
  const counts = { green: 0, amber: 0, RED: 0, new: 0 }
  engagements.forEach(e => { counts[e.signals.trust]++ })
  const today = render.formatToday(new Date())

  // enrich each engagement with everything the read-only fieldbook renders -
  // next action + last-session excerpt (reused from context.md), brief/reality
  // one-liners, sector/overlay, days elapsed, and the four structured widgets.
  engagements.forEach(e => {
    const ctx = readClean(e.dir, 'context.md')
    e.next = (sectionBody(ctx, 'Next action', { lastNonEmpty: true }).split('\n').find(l => l.trim()) || '').trim()
    e.next = e.next.replace(/^[-*]\s+/, '')
    e.hasNext = !!e.next
    e.lastSession = firstLine(sectionBody(ctx, 'Current state'), 240)
    // 220, not 140 - now that brief/reality each get their own full-width
    // line instead of sharing one, a shorter cap just meant more sentences
    // cut off mid-thought for no reason.
    e.brief = firstLine(readClean(e.dir, 'brief.md'), 220)
    const reality = parseReality(readClean(e.dir, 'reality.md'), 220)
    e.reality = reality.line
    e.realityMissing = reality.missing
    e.overlay = detectOverlay(e.dir)
    e.days = daysElapsed(e.dir)
    e.phaseLabel = phaseLabel(e.signals.phase)
    e.stakeholders = extractStakeholders(e.dir)
    e.risks = extractRisks(e.dir)
    e.log = extractLog(e.dir)
    e.stats = extractStats(e.dir)
    e.valueRows = parseValueLedger(e.dir).rows
    e.hasSigner = !deliverySummaryFor(e.dir).gaps.some(g => g.kind === 'signer')
    e.highRisks = e.risks.filter(r => r.severity === 'high').length
    e.quiet = e.signals.ageDays !== Infinity && e.signals.ageDays >= 3
    e.slug = slugify(e.name)
    // reference documents, not logs - shown collapsed in a "More" block so
    // trust-profile.md (sacred data, AI policy) stays visible, never dropped
    e.moreSections = [
      ['success.md', 'Success & scope'],
      ['terrain.md', 'Terrain'],
      ['trust-profile.md', 'Trust profile'],
    ].map(([f, title]) => [title, readClean(e.dir, f)])
    .filter(([, md]) => render.hasRealContent(md))
    .map(([title, md]) => ({ title, html: render.mdBlockHtml(md, parseMdTable) }))
    e.searchBlob = render.escapeHtml([
      e.name, e.next, e.lastSession, e.reality, e.brief,
      ...e.log.map(g => g.text), ...e.risks.map(r => r.text),
      ...e.stakeholders.map(p => `${p.name} ${p.role} ${p.note}`),
      ...e.moreSections.map(s => s.title),
      ...e.valueRows.map(r => `${r.slice} ${r.promised} ${r.measured} ${r.accepted} ${r.evidence}`),
    ].join(' ').toLowerCase())
  })

  const html = render.buildFieldbookHtml({ engagements, today, generatedAt: new Date().toISOString() })

  try {
    const isRecordPath = p => p.split(path.sep).some(part => ['.fde', '.git'].includes(part.toLowerCase()))
    if (isRecordPath(outPath)) throw new Error('save the dashboard outside .fde/ and .git/; these folders hold records, not reports')
    let existingParent = path.dirname(outPath)
    while (!fs.existsSync(existingParent)) existingParent = path.dirname(existingParent)
    if (isRecordPath(fs.realpathSync(existingParent))) throw new Error('save the dashboard outside .fde/ and .git/; this path points into a record folder')
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    if (isRecordPath(fs.realpathSync(path.dirname(outPath)))) throw new Error('save the dashboard outside .fde/ and .git/; this path points into a record folder')
    atomicWriteFile(outPath, html)
  } catch (e) {
    failFs(e, 'write fieldbook', outPath)
  }
  console.log(`fieldbook → ${outPath}`)
  console.log(`${engagements.length} engagement(s) rendered · ${counts.RED} red / ${counts.amber} amber / ${counts.green} green / ${counts.new} new · 0 tokens (pure render)`)
  if (!all) {
    const current = resolveEngagement()
    if (current) for (const line of hygieneTriageLines(current)) console.log(line)
  }
  if (args.includes('--open')) {
    // arg-array form: the path is never interpolated into a shell string.
    const [bin, pre] = process.platform === 'darwin' ? ['open', []]
      : process.platform === 'win32' ? ['cmd', ['/c', 'start', '']]
      : ['xdg-open', []]
    try { execFileSync(bin, [...pre, outPath], { stdio: 'ignore', timeout: 5000 }) } catch (_) {}
  } else {
    console.log('open it:  double-click the file, or run with --open')
  }
}

// ---------- vault (a window onto the fieldbook, not a second copy of it) ----------
// Obsidian skips any path starting with "." - so ~/fde-engagements as a vault shows
// nothing, because every client's record lives inside .fde/. The answer is a derived
// vault: generated from .fde/, rebuilt from scratch each run, gitignored, never read
// back. That is also where redaction belongs (`--redacted` for a shared screen).

// Stamped into the vault so a stale folder is identifiable. Best-effort: a
// missing package.json must not stop an FDE generating their vault.
function cliVersion() {
  try {
    return String(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version || '')
  } catch (_) { return '' }
}

function valueLedgerRows(eng) {
  return parseValueLedger(eng).rows.map(row => ({
    slice: row.slice, promised: row.promised,
    acceptedBy: row.state === 'accepted' ? row.accepted : '',
  }))
}

function isInside(child, parent) {
  const rel = path.relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

// Containment must be judged on the real path: a symlinked parent
// (ln -s ~/fde-engagements /tmp/l; --out /tmp/l/vault) resolves textually to
// somewhere harmless while writing inside the engagements root. The vault target
// usually does not exist yet, so resolve the deepest ancestor that does.
function realPathish(p) {
  let cur = p
  const tail = []
  for (let i = 0; i < 64; i++) {
    try {
      return path.join(fs.realpathSync(cur), ...tail)
    } catch (e) {
      if (e.code !== 'ENOENT' && e.code !== 'ENOTDIR') return p
      const parent = path.dirname(cur)
      if (parent === cur) return p
      tail.unshift(path.basename(cur))
      cur = parent
    }
  }
  return p
}

// `fde vault` deletes its output directory before rebuilding, so the only
// acceptable targets are a fresh path or a folder this command wrote before
// (proved by its stamp file). Never the engagements root, never $HOME.
function resolveVaultOut(args, redacted) {
  const outIdx = args.indexOf('--out')
  const raw = outIdx !== -1 ? String(args[outIdx + 1] || '').trim() : ''
  if (outIdx !== -1 && !raw) {
    console.error('--out needs a directory path')
    process.exit(1)
  }
  const out = raw
    ? path.resolve(raw.replace(/^~(?=$|\/)/, HOME))
    : path.join(HOME, redacted ? 'fde-vault-redacted' : 'fde-vault')

  const refuse = (why) => {
    console.error(`refused: will not build the vault at ${out} - ${why}`)
    process.exit(1)
  }
  // The symlink check reads the path as given; every containment check reads it
  // resolved, so a link cannot smuggle the target past them.
  try {
    if (fs.lstatSync(out).isSymbolicLink()) {
      refuse('it is a symlink - a rebuild would delete whatever it points at')
    }
  } catch (e) {
    if (e.code !== 'ENOENT') failFs(e, 'check', out)
  }
  const canon = realPathish(out)
  const engRoot = realPathish(ENGAGEMENTS_ROOT)
  const realHome = realPathish(HOME)
  for (const p of new Set([out, canon])) {
    if (p === path.parse(p).root) refuse('that is the filesystem root')
    if (p === HOME || p === realHome) refuse('the vault directory is deleted and rebuilt on every run')
    if (p.split(path.sep).includes('.fde')) refuse('that is inside a fieldbook; .fde/ is the source of truth')
    for (const root of new Set([ENGAGEMENTS_ROOT, engRoot])) {
      if (isInside(p, root) || isInside(root, p)) refuse('it would contain or sit inside your engagements root')
    }
  }
  try {
    const st = fs.lstatSync(out)
    if (!st.isDirectory()) refuse('it exists and is not a directory')
    const entries = fs.readdirSync(out)
    if (entries.length && !entries.includes(vault.STAMP)) {
      refuse(`it already holds files fde vault did not write (no ${vault.STAMP}). Pick an empty path with --out`)
    }
  } catch (e) {
    if (e.code !== 'ENOENT') failFs(e, 'check', out)
  }
  return out
}

function cmdVault(args) {
  const redacted = args.includes('--redacted')
  const all = !args.includes('--current')
  const out = resolveVaultOut(args, redacted)

  let engagements
  if (all) {
    engagements = gatherEngagements()
  } else {
    const eng = resolveEngagement()
    if (!eng) {
      console.error('no engagement bound to this workspace.\nrun: fde resume --init <name>   or   fde vault')
      process.exit(2)
    }
    engagements = gatherEngagements({ only: eng })
  }

  const SECTION_FILES = ['decisions', 'risks', 'delivery', 'stakeholders', 'terrain', 'success', 'trust-profile']
  const ALWAYS = new Set(['decisions', 'risks', 'delivery'])
  engagements.forEach(e => {
    const ctx = readClean(e.dir, 'context.md')
    e.next = (sectionBody(ctx, 'Next action', { lastNonEmpty: true }).split('\n').find(l => l.trim()) || '').trim()
    e.brief = firstLine(readClean(e.dir, 'brief.md'), 400)
    const reality = parseReality(readClean(e.dir, 'reality.md'), 400)
    e.reality = reality.line || reality.missing
    e.overlay = detectOverlay(e.dir)
    e.days = daysElapsed(e.dir)
    e.stakeholders = extractStakeholders(e.dir)
    e.log = extractLog(e.dir)
    e.valueRows = valueLedgerRows(e.dir)
    e.pages = {}
    for (const f of SECTION_FILES) {
      if (!fs.existsSync(path.join(e.dir, `${f}.md`))) continue
      // stripTemplateNoise: the instruction comments are for whoever writes the
      // fieldbook, not for whoever reads it in Obsidian.
      const body = stripTemplateNoise(readClean(e.dir, `${f}.md`))
      if (!ALWAYS.has(f) && !render.hasRealContent(body)) continue
      e.pages[f] = body
    }
  })

  const files = vault.buildVaultFiles({
    engagements,
    today: render.formatToday(new Date()),
    redacted,
    engagementsRoot: ENGAGEMENTS_ROOT,
    version: cliVersion(),
  })

  // Fresh every run: a client dropped from the portfolio, or a page that stopped
  // having content, must not linger as a stale note.
  rmTreeQuiet(out)
  try {
    fs.mkdirSync(out, { recursive: true })
  } catch (e) {
    failFs(e, 'create vault', out)
  }
  for (const f of files) {
    const target = path.join(out, f.rel)
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true })
    } catch (e) {
      failFs(e, 'create vault folder', target)
    }
    atomicWriteFile(target, f.content)
  }

  console.log(`vault → ${out}${redacted ? '  (redacted)' : ''}`)
  console.log(`${engagements.length} engagement(s) · ${files.length} pages · derived, gitignored, rebuilt on every run`)
  console.log('open it:  Obsidian → Open folder as vault → this folder, then start at Portfolio')
  if (!redacted) console.log('sharing a screen with the sponsor?  fde vault --redacted')
}

// ---------- demo (see the value before touching a real client) ----------
// Everything below runs the real commands against a throwaway engagement under
// ~/fde-engagements/.demo/ - the leading dot keeps it out of every portfolio
// listing (status --all, dashboard --all, resume's "existing:" line). Nothing
// here fabricates output: the fieldbook you see is what debrief/log actually
// wrote, so the demo cannot drift from the product.
const DEMO_SLUG = 'acme-payments'
const DEMO_NOTES = `Fictional kickoff transcript - Acme payments, meeting 2026-09-10

We need read-only access to the payments repo and the last 90 days of audit logs. [source: meeting 2026-09-10]
We agreed to settle on the existing Stripe connector instead of the in-house rewrite - Priya wants the Q3 audit clean first. [source: meeting 2026-09-10]
Proposed scope: repair reconciliation alerts; leave the connector rewrite out pending sponsor confirmation. [source: meeting 2026-09-10]
Risk: nobody can name who owns the reconciliation job; it has failed silently twice since March. [source: meeting 2026-09-10]
Priya Shah signs off on the acceptance test. [source: meeting 2026-09-10]
Priya is travelling for two weeks - Tom is the day-to-day contact. [source: meeting 2026-09-10]
Next action: get the reconciliation runbook from Tom before touching anything. [source: meeting 2026-09-10]

<private>
Priya hinted the previous vendor was let go mid-contract. Do not repeat this to the team.
</private>
`

// What `@fde land` drafts with the human in the chat. The CLI has no command for
// these two files by design (they are judgment, not appends), so the demo writes
// them and says so - the transcript stays honest either way.
const DEMO_LAND_ARTIFACTS = {
  'brief.md': `# Brief - Acme payments

**As stated:** clean up payment reconciliation before the Q3 audit.
**What we heard instead:** nobody owns the reconciliation job, and it fails silently.
**Proposed out of scope:** the in-house connector rewrite; sponsor confirmation is still required.
`,
  'success.md': `# Success

**Done when:** Replay a failed settlement in staging; its alert arrives at the on-call queue within 15 minutes.
**Primary value bucket:** risk-mitigation
**Baseline → target:** no reliable alert → an alert within 15 minutes of a simulated failure.
**Explicitly out of scope:** connector rewrite (proposed; not customer-approved).
**Stakeholder who signs off:** Priya Shah [source: meeting 2026-09-10]

Acceptance is pending. The named signer identifies authority, not an approval.
`,
}

function demoRoot() { return path.join(ENGAGEMENTS_ROOT, '.demo') }

// Piping the demo into a file or a docs snippet must not litter escape codes.
const DEMO_BOLD = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR
function demoHead(s) { return DEMO_BOLD ? `\x1b[1m${s}\x1b[0m` : s }

function demoStep(label, argv, cwd, env) {
  console.log(`\n${demoHead(label)}`)
  console.log(`  $ fde ${argv.join(' ')}\n`)
  const r = require('child_process').spawnSync(process.execPath, [__filename, ...argv], {
    cwd, env, encoding: 'utf8',
  })
  const out = `${r.stdout || ''}${r.stderr || ''}`.trimEnd()
  if (out) console.log(out.split('\n').map(l => `  ${l}`).join('\n'))
  // doctor exits 1 on hygiene findings, resume exits 2 when unbound: a demo step
  // failing means the product is broken, so surface it instead of pretending.
  if (r.status !== 0 && !(argv[0] === 'doctor')) {
    console.error(`\n  demo step failed (exit ${r.status}): fde ${argv.join(' ')}`)
    process.exit(1)
  }
  return out
}

function cmdDemo(args) {
  const root = demoRoot()
  if (args.includes('--clean')) {
    rmTreeQuiet(root)
    console.log(`removed ${root}\n(your real engagements under ${ENGAGEMENTS_ROOT} were not touched)`)
    return
  }
  // Always start from empty, so the demo is the same on the tenth run as the first.
  rmTreeQuiet(root)
  const workspace = path.join(root, 'acme-payments-repo')
  try {
    fs.mkdirSync(workspace, { recursive: true })
  } catch (e) { failFs(e, 'create demo workspace', workspace) }
  const notes = path.join(workspace, 'kickoff-notes.md')
  fs.writeFileSync(notes, DEMO_NOTES)
  const env = {
    ...process.env,
    FDEOPS_ENGAGEMENTS_ROOT: root,
    // the demo must resolve to its own sandbox, never to whatever the shell points at
    FDEOPS_ENGAGEMENT: '',
    FDEOS_ENGAGEMENT: '',
  }

  console.log(`
  fdeops demo - a fake client, real commands, nothing sent anywhere

  Sandbox:  ${root}
  Fake client: Acme (payments platform). This writes fictional notes, local Git history, and HTML inside the sandbox above.
  It resets that sandbox on repeat runs; real client records stay untouched.
  Allow under five minutes. Fictional proposal approval is automatic in this demo only.`)

  demoStep('1. Monday of week 1 - create the fieldbook for this client', ['resume', '--init', DEMO_SLUG], workspace, env)
  demoStep('2. You walk out of the kickoff with messy notes - hand them over', ['debrief', '--smart', notes], workspace, env)
  demoStep('3. Demo automatically confirms the fictional record (not customer acceptance)', ['debrief', '--apply'], workspace, env)
  demoStep('4. Say where you are in the engagement', ['log', 'phase', 'land'], workspace, env)
  const engDir = path.join(root, DEMO_SLUG, '.fde')
  console.log(`\n${demoHead('5. During land, @fde drafts the brief and the definition of done with you')}`)
  console.log('  (the two files the agent writes with you in the chat - not a CLI command)\n')
  for (const [file, body] of Object.entries(DEMO_LAND_ARTIFACTS)) {
    try { fs.writeFileSync(path.join(engDir, file), body) } catch (e) { failFs(e, 'write demo artifact', file) }
    console.log(`  → ${file}`)
  }
  // The header fields the agent fills during land, in place - the debrief content
  // below them stays untouched.
  const ctxPath = path.join(engDir, 'context.md')
  const ctx = fs.readFileSync(ctxPath, 'utf8')
    .replace(/^\*\*Engagement:\*\*\s*$/m, '**Engagement:** Acme payments reconciliation')
    .replace(/^\*\*Customer:\*\*\s*$/m, '**Customer:** Acme (fake - this is the demo)')
  fs.writeFileSync(ctxPath, ctx)
  console.log('  → context.md (engagement + customer header)')
  // Land them in the ledger the way the agent would, or every later step warns
  // about uncommitted manual edits - correct behaviour, wrong lesson for a demo.
  const landHash = commitMemory(engDir, 'land: brief + success', { files: [...Object.keys(DEMO_LAND_ARTIFACTS), 'context.md'] })
  if (landHash) console.log(`  memory @${landHash}`)
  demoStep('6. Add a fictional measured result with evidence, still awaiting customer acceptance', ['log', 'delivery', 'Reconciliation alert | risk-mitigation | alert within 15 minutes | alert in 8 minutes | pending | PR#42 staging replay | revert alert rule'], workspace, env)
  demoStep('7. Two days later, the sponsor goes quiet', ['log', 'contact', 'Priya has not replied to two emails about the runbook', '--signal', 'amber'], workspace, env)
  demoStep('8. Next morning, a fresh agent session with no memory of any of this', ['resume'], workspace, env)
  demoStep('9. A meeting in ten minutes - what do you walk in knowing?', ['prep', 'sponsor check-in'], workspace, env)
  demoStep('10. Six weeks later: "we never agreed to drop the rewrite"', ['receipts', 'rewrite'], workspace, env)
  demoStep('11. The whole engagement on one page', ['dashboard'], workspace, env)
  // cmdDashboard's default out path, computed rather than scraped from its output:
  // a HOME with a space in it truncates any whitespace-delimited parse.
  const html = path.join(root, 'fieldbook-current.html')

  console.log(`
  ${demoHead('What just happened')}

  - Every line above came from the real CLI - no canned output.
  - The kickoff notes became proposed asks, scope, dated decisions, risks, and a
    next action. This demo applied fictional notes automatically after showing REVIEW.
  - PR#42 is fictional evidence for a measured result. The ledger still says claimed:
    naming Priya as signer does not mean she accepted the result.
  - The <private> block in those notes never appears in resume, prep, receipts or
    the dashboard - it is sealed in context.md and redacted from anything an agent
    or a screen share can see.
  - Tomorrow's session starts from the record instead of a blank chat.
${fs.existsSync(html) ? `\n  Open the fieldbook:  ${html}` : ''}

  ${demoHead('Your turn')}  (inside your own client's workspace)

    fde resume --init <client-name>

  Delete this demo whenever you like:  fde demo --clean
`)
}

function printUsage() {
  console.log(`fde - deterministic core of fdeops
  fde demo                 the whole loop on a fake client (fde demo --clean removes it)
  fde privacy              show masking capability and its boundaries
  fde scan                 day-1 recon of this repo (facts, no AI)
  fde resume               load this workspace's engagement memory (bounded)
  fde resume --full        load the complete context.md (no bound)
  fde resume --init <name> create + bind engagement for this workspace (rebind replaces)
  fde resume --bind        show what this workspace is bound to, and what resolves
  fde triage               TRIAGE block only (hooks / Cursor session entry)
  fde log <type> <text>    append decision|risk|delivery|contact (contact takes --signal red|amber|green; delivery "a|b|c" writes the value ledger; --force to allow secret-like text)
  fde log risk --retire    move matching open-risk bullets to ## Retired
  fde log phase <phase>    set engagement phase (land|discover|plan|ship|outcome|close)
  fde log --undo           remove the last CLI log/debrief entry from memory
  fde debrief [file]       meeting notes → memory (prefixed lines; --dry-run; --force)
  fde debrief --smart      heuristic propose; REVIEW first (decided/asked/open/next/signer); --apply after one confirm
    --review              inspect the pending REVIEW after editing, without replacing it
    --allow-replay        explicitly apply already recorded sourced statements after review
    --replace-proposal    explicitly discard a pending review when proposing different notes
  fde ingest stage …       stage raw pull into <engagement>/.inbox/ (not .fde/)
  fde ingest list          list staged inbox items
  fde ingest propose <id>  smart-propose a staged item → .debrief-propose (confirm before apply)
  fde ingest apply         same as: fde debrief --apply
  fde prep [label]         grounded walk-in brief from existing .fde/ only
  fde doctor [--ready]     lint memory; --ready checks success before plan/build. Lint (stale signals, gaps). status/dashboard/resume print the same issues
  fde redact <term>        preview/remove lines containing a buried term (pass --apply to commit; subject never repeats the term)
  fde tidy [--apply]       propose consolidations; blesses hand-written dirty files when you apply
  fde owner [set email]    who keeps this engagement record
  fde recall <topic>       bounded, redacted source excerpts (--max-bytes 4096..65536)
  fde receipts <term>      source-backed records versus claims
  fde defend              sponsor readout: accepted assertions, claims, sources, gaps
  fde handoff [--out file] portable redacted packet; stdout by default, new file only
  fde status [--all]       value ledger, then trust (pass --all for full portfolio)
  fde dashboard [--all] [--open] [--out <path>]  bound fieldbook (pass --all for every client)
  fde vault                derived Obsidian vault of every engagement (--current for one, --redacted for a shared screen, --out <dir>)
  hooks call these; you do not: capture (session-end snapshot), preserve (pre-compaction snapshot)
  env FDEOPS_ENGAGEMENTS_ROOT  override ~/fde-engagements (init/status/dashboard/registry)
  writes require a workspace bind (or FDEOPS_ENGAGEMENT) - folder-name match is read-only
  .fde/ is git-versioned locally for tamper-evident receipts (no remote, no telemetry)
  ingest is a sink only - source MCPs (Granola/Gmail/…) are user-configured; never ambient sync`)
}

const [cmd, ...rawArgs] = process.argv.slice(2)
let outputBudget
if (['resume', 'recall', 'handoff', 'defend'].includes(cmd) && !rawArgs.some(a => ['--full', '--init', '--bind', '--out'].includes(a))) {
  try { outputBudget = context.budgetArgs(rawArgs).maxBytes } catch (_) {}
}
require('./lib/masking').protectOutput(masking, { maxBytes: outputBudget })
let args
try {
  args = rawArgs.map(arg => masking.restore(arg))
  for (const key of ['FDEOPS_ENGAGEMENT', 'FDEOS_ENGAGEMENT']) {
    if (process.env[key]) process.env[key] = masking.restore(process.env[key])
  }
  // Resolve privacy-state failures before a user-authorized argument write.
  args.forEach(arg => masking.mask(arg))
}
catch (e) { console.error(e.message); process.exit(1) }
if (args.includes('--help') || args.includes('-h') || cmd === 'help' || cmd === '--help' || cmd === '-h') {
  printUsage()
  process.exit(0)
}
try {
switch (cmd) {
  case 'privacy':
    if (args.length) { console.error('usage: fde privacy'); process.exitCode = 2; break }
    console.log(`FDEOps ${require('../package.json').version} - identifier masking enabled by default.\nCLI responses, smart proposals, handoff packets and ingest MCP results use local aliases.\nPatterns: common emails, international/US phones, SSN-shaped identifiers and supported credentials.\nNames and arbitrary sensitive prose are not detected; mark them <private>.\nRaw files, pasted chat, upstream MCP content and local dashboard/vault files bypass this protection.`)
    break
  case 'demo': cmdDemo(args); break
  case 'scan': cmdScan(); break
  case 'resume': cmdResume(args); break
  case 'recall': cmdRecall(args); break
  case 'triage': cmdTriage(); break
  case 'log': cmdLog(args); break
  case 'debrief': cmdDebrief(args); break
  case 'ingest': cmdIngest(args); break
  case 'prep': cmdPrep(args); break
  case 'doctor': cmdDoctor(args); break
  case 'redact': cmdRedact(args); break
  // `garden` was the name through 3.11.x; it keeps working.
  case 'tidy':
  case 'garden': cmdGarden(args); break
  case 'owner': cmdOwner(args); break
  case 'receipts': cmdReceipts(args); break
  case 'handoff': cmdHandoff(args); break
  case 'defend': cmdHandoff(args, 'Sponsor readout'); break
  case 'capture': cmdCapture(); break
  case 'preserve': cmdPreserve(); break
  case 'status': cmdStatus(args); break
  case 'dashboard': cmdDashboard(args); break
  case 'vault': cmdVault(args); break
  case 'help':
  case '-h':
  case '--help':
    printUsage()
    break
  default:
    printUsage()
    // Missing or unknown command must fail - exit 0 made typos look like success in scripts/hooks.
    process.exit(1)
}

} catch (error) {
  console.error(error && error.message ? error.message : "command failed")
  process.exitCode = 1
}
