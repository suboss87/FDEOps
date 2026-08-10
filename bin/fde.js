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
 *   fde garden [--apply]    propose safe consolidations; apply only with --apply
 *   fde ingest …            stage → propose → apply pull sink (.inbox/; never auto-writes .fde/)
 *   fde owner [set …]       who keeps this engagement record
 *   fde receipts <term>     "what did we agree?" - search memory with dates
 *   fde capture             session-end snapshot → context.md (hooks use this)
 *   fde preserve            pre-compaction context snapshot (hook-internal; hooks use this)
 *   fde status [--all]      current engagement (default) or full portfolio (--all)
 *   fde dashboard [--all]   current engagement fieldbook (default) or all (--all)
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync, execFileSync } = require('child_process')
const { createMemoryApi } = require('./lib/memory')
const { createTrustApi } = require('./lib/trust')

const HOME = os.homedir()
// FDEOPS_ENGAGEMENTS_ROOT isolates init/status/dashboard (and the registry) for
// dogfood/simulations. Default remains ~/fde-engagements.
const ENGAGEMENTS_ROOT = ((process.env.FDEOPS_ENGAGEMENTS_ROOT || '').trim().replace(/^~/, HOME))
  || path.join(HOME, 'fde-engagements')
const REGISTRY = path.join(ENGAGEMENTS_ROOT, '.registry')
const DEBRIEF_MAX_BYTES = 256 * 1024
const CODE_EXT = ['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.go', '.rb', '.cs', '.php']
const CONF_EXT = CODE_EXT.concat(['.env', '.yaml', '.yml', '.json'])
// one routing table for structured appends - cmdLog and cmdDebrief share it
const LOG_FILES = { decision: 'decisions.md', risk: 'risks.md', delivery: 'delivery.md', contact: 'stakeholders.md' }

// constant-command runner - never receives user input
function sh(cmd, cwd) {
  try {
    return execSync(cmd, { cwd: cwd || process.cwd(), stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 }).toString().trim()
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
      if (regex.test(lines[i])) hits.push({ file: path.relative(process.cwd(), f), line: i + 1, text: lines[i].trim().slice(0, 120) })
    }
  }
  return hits
}

// ---------- engagement resolution (zero-ceremony order) ----------

function readRegistry() {
  try {
    return fs.readFileSync(REGISTRY, 'utf8').split('\n').filter(Boolean).map(l => {
      const i = l.lastIndexOf(' ')
      return { workspace: l.slice(0, i), slug: l.slice(i + 1) }
    })
  } catch (_) { return [] }
}

function resolveEngagement(opts = {}) {
  // opts.forWrite: memory mutations (log/debrief/capture) require an intentional
  // bind - env, registry, pointer, or in-repo .fde. Basename matching is
  // read-only convenience; writing on a folder-name guess contaminates clients.
  const forWrite = !!opts.forWrite
  const accept = (p) => acceptEngagementPath(p, { forWrite })
  // 1) explicit env (back-compat: accept old FDEOS_ENGAGEMENT too)
  const env = (process.env.FDEOPS_ENGAGEMENT || process.env.FDEOS_ENGAGEMENT || '').replace(/^~/, HOME).trim()
  if (env) {
    const ok = accept(env)
    if (ok) return ok
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

function readEng(eng, f) {
  try { return fs.readFileSync(path.join(eng, f), 'utf8') } catch (_) { return '' }
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

function failFs(err, action, target) {
  console.error(formatFsError(err, action, target))
  process.exit(1)
}

// Refuse writes that would follow a symlink out of the engagement tree.
// Missing path is fine (new file). Soft mode returns the message instead of exiting
// (session capture must never crash a hook).
function refuseSymlinkWrite(p, opts = {}) {
  try {
    if (fs.lstatSync(p).isSymbolicLink()) {
      const msg = `refused: ${path.basename(p)} is a symlink - write would leave the engagement tree. Replace it with a real file.`
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
    if (opts.soft) throw Object.assign(new Error(blocked), { code: 'ESYMLINK' })
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
    if (opts.soft) throw Object.assign(new Error(blocked), { code: 'ESYMLINK' })
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
function sectionBody(md, heading, opts) {
  const preferLast = opts && opts.lastNonEmpty
  const lines = String(md || '').split('\n')
  const re = new RegExp('^#{1,6}\\s+' + heading + '\\b', 'i')
  let first = ''
  let lastFilled = ''
  let seen = false
  for (let i = 0; i < lines.length; i++) {
    if (!re.test(lines[i].trim())) continue
    const body = []
    for (let j = i + 1; j < lines.length; j++) {
      if (/^#{1,6}\s/.test(lines[j].trim())) break
      body.push(lines[j])
    }
    const text = body.join('\n').trim()
    if (!seen) { first = text; seen = true }
    if (text) lastFilled = text
  }
  if (!seen) return ''
  return preferLast ? (lastFilled || first) : first
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

const PHASE_LABELS = {
  land: 'Embed & Trust', discover: 'Discover & Diagnose', plan: 'Plan & Align',
  build: 'Build & Guard', ship: 'Ship & Verify', close: 'Operate & Close',
}
function phaseLabel(phase) { return PHASE_LABELS[String(phase).toLowerCase()] || phase }

// First real (non-blank, non-heading) line of a prose file, bold-label prefix
// stripped ("**Confirmed:** text..." -> "text...") - same spirit as the
// existing topRisk extraction above, just for brief.md/reality.md one-liners.
// An unfilled template line ("**Stated problem:**" with nothing after the
// colon) collapses to '' here, which callers treat as "nothing to show".
function firstLine(md, maxLen) {
  for (const raw of md.split('\n')) {
    const l = raw.trim()
    if (!l || /^#{1,6}\s/.test(l)) continue
    const clean = l.replace(/^\*\*[^*]+:\*\*\s*/, '').replace(/\*\*/g, '').replace(/^["']|["']$/g, '').trim()
    if (!clean) continue
    return clean.length > maxLen ? clean.slice(0, maxLen - 1).trim() + '…' : clean
  }
  return ''
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
  const cells = r => r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim())
  const isSep = r => r.includes('-') && /^\|?[\s:|-]+\|?$/.test(r.trim())
  let headers = null
  const rows = []
  for (const raw of md.split('\n')) {
    const t = raw.trim()
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
  signalSubjectKey,
  nextActionLine,
  computeSignals,
  resumeTriage,
  countOpenRisks,
} = createTrustApi({
  fs, path, readClean, readEng, parseMdTable, sectionBody, SIGNAL_LEDGER, memoryDirtyManual,
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
  const t = String(text).trim()
  const proper = t.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)
  if (proper) return proper[1]
  const word = t.split(/\s+/).find(w => w && !/^(dr|mr|mrs|ms)\.?$/i.test(w))
  return word ? word.replace(/[^A-Za-z0-9.-]/g, '') : t.slice(0, 24)
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
        const frag = (words[0] || '').replace(/[^a-z0-9]/gi, '')
        let signal = null, matchedDate = null
        if (frag.length >= 3) {
          for (const h of history) {
            if (h.text.trim().toLowerCase().startsWith(frag.toLowerCase()) && (!matchedDate || h.date >= matchedDate)) {
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
      byKey.set(key, { ...cur, signal: h.signal, note: cur.note || h.text.slice(0, 80) })
    } else {
      byKey.set(key, {
        name: displayNameFromSignalText(h.text),
        role: '',
        note: h.text.slice(0, 80),
        signal: h.signal,
        source: 'signal',
      })
    }
  }
  return [...byKey.values()]
}

// Risks: table rows AND dated CLI/debrief bullets. Empty template cells ignored.
function extractRisks(eng) {
  const md = readClean(eng, 'risks.md')
  const body = md.split(/^#{1,6}\s+Retired\b/im)[0] || md
  const HIGH = /critical|blocker|exposure|breach|urgent|at risk|at stake|\brace\b|rollback|no test/i
  const out = []
  const seen = new Set()
  const push = (text) => {
    const t = String(text || '').trim()
    if (!t || seen.has(t.toLowerCase())) return
    seen.add(t.toLowerCase())
    out.push({ text: t, severity: HIGH.test(t) ? 'high' : 'med' })
  }
  const table = parseMdTable(body)
  if (table) {
    const riskIdx = colIndex(table.headers, /^risk$/i)
    if (riskIdx !== -1) {
      for (const cs of table.rows) push(cs[riskIdx])
    }
  }
  for (const raw of body.split('\n')) {
    const t = raw.trim()
    const m = t.match(/^-\s*\[\d{4}-\d{2}-\d{2}\]\s*(?:\[@[^\]]+\]\s*)?(.*)$/)
    if (m) push(m[1])
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
  const ai = grepFiles(codeFiles, /openai|anthropic|\bllm\b|gpt-|claude|embedding|vector store|model inference|inference (?:api|endpoint|server|engine)/i, 10)
  ai.length ? ai.forEach(h => out.push(`  ${h.file}:${h.line}  ${h.text}`)) : out.push('  none found')

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

    // Optional stubs (AI eval pack, …) stay in templates/ for copy-on-use — not day-1 scaffold.
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
      if (!existed) {
        // Atomic create: build under a staging dir, then rename into place.
        // Disk-full / permission mid-copy must not leave a half-built engagement.
        fs.mkdirSync(ENGAGEMENTS_ROOT, { recursive: true })
        const stagingRoot = path.join(ENGAGEMENTS_ROOT, `.init-${slug}-${process.pid}`)
        const stagingEng = path.join(stagingRoot, slug)
        const stagingFde = path.join(stagingEng, '.fde')
        rmTreeQuiet(stagingRoot)
        try {
          fs.mkdirSync(stagingFde, { recursive: true })
          fillTemplates(stagingFde)
          // If a partial engRoot exists from an older failed run, remove it first.
          if (fs.existsSync(engRoot)) rmTreeQuiet(engRoot)
          fs.renameSync(stagingEng, engRoot)
          rmTreeQuiet(stagingRoot)
        } catch (e) {
          rmTreeQuiet(stagingRoot)
          if (fs.existsSync(engRoot) && !fs.existsSync(path.join(engRoot, '.fde', 'context.md'))) {
            rmTreeQuiet(engRoot)
          }
          failFs(e, 'create engagement', engRoot)
        }
      } else {
        // Re-init / rebind: only fill missing template files in place.
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
    withFileLock(REGISTRY, () => { atomicWriteFile(REGISTRY, kept.join('\n') + '\n') })
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
    console.log(`NO ENGAGEMENT for this workspace.\nexisting: ${list}\ncreate + bind one:  fde resume --init <client-name>`)
    process.exit(2)
  }
  // Monday-morning: triage + proactive hygiene (silent when clean), then memory.
  printTriageBlock(eng)
  console.log(`\nENGAGEMENT: ${eng}\n`)
  // readClean, not fs.readFileSync: this output is what an agent loads as
  // context, so it goes through the same <private> redaction as the dashboard.
  const ctx = readClean(eng, 'context.md')
  if (!ctx) { console.log('(context.md empty - new engagement)') }
  else { console.log(args.includes('--full') ? ctx : resumeView(ctx)) }
}

// Token discipline: context.md grows every session (the session-stop hook
// appends a snapshot). Loading the whole file on every resume costs more tokens
// each day for less marginal signal. This returns a bounded view - the curated
// head (state / next action) plus the most recent activity - and hides the
// middle of the log behind `fde resume --full`. Pure code, zero model tokens.
// The session-start hook mirrors this same bound in bash; keep them in sync.
function resumeView(md) {
  const lines = md.split('\n')
  // A file ending in "\n" yields a trailing "" here; drop it so the line count
  // matches the bash hook's `wc -l` and the two bounded views stay byte-aligned.
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  if (lines.length <= 160) return md
  // Anchor on the "## Session end" heading, NOT the "<!-- fdeops auto-capture -->"
  // comment: this text is read via readClean (stripPrivate strips HTML comments),
  // so the comment is gone by the time we get here. The heading is written on the
  // very next line by cmdCapture and the session-stop hook and survives redaction.
  // The bash bounded_context() anchors on the same heading - keep them identical.
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
  try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) } catch (_) {
    console.error('nothing to undo - no prior fde log/debrief write recorded')
    process.exit(1)
  }
  if (!meta.file || !meta.entry) { console.error('corrupt .last-write - cannot undo'); process.exit(1) }
  const target = path.join(eng, meta.file)
  const before = readEng(eng, meta.file)
  const after = removeExactEntryLine(before, meta.entry)
  if (after == null) {
    console.error(`cannot undo - entry no longer in ${meta.file} (edited by hand?). Remove it manually.`)
    process.exit(1)
  }
  withFileLock(target, () => { atomicWriteFile(target, after.endsWith('\n') ? after : after + '\n') })
  if (/\[signal:(red|amber|green)\]/i.test(meta.entry)) {
    const ledgerPath = path.join(eng, SIGNAL_LEDGER)
    const led = removeExactEntryLine(readEng(eng, SIGNAL_LEDGER), meta.entry)
    if (led != null) withFileLock(ledgerPath, () => { atomicWriteFile(ledgerPath, led.endsWith('\n') ? led : led + '\n') })
  }
  try { fs.unlinkSync(metaPath) } catch (_) {}
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
  const type = args[0]; const text = args.slice(1).join(' ')
  const eng = resolveEngagement({ forWrite: true })
  if (!eng) { console.error('no engagement - run: fde resume --init <name>'); process.exit(2) }

  // fde log phase <land|discover|plan|build|ship|close> - advances portfolio phase
  if (type === 'phase') {
    const phase = (text || '').toLowerCase().trim()
    if (!['land', 'discover', 'plan', 'build', 'ship', 'close'].includes(phase)) {
      console.error('usage: fde log phase <land|discover|plan|build|ship|close>')
      process.exit(1)
    }
    const hash = setContextPhase(eng, phase)
    console.log(`phase → ${phase}${hash ? ` @${hash}` : ''}`)
    return
  }

  if (!LOG_FILES[type] || !text) { console.error('usage: fde log <decision|risk|delivery|contact> <text> [--signal red|amber|green] [--force]\n       fde log phase <land|discover|plan|build|ship|close>\n       fde log --undo'); process.exit(1) }
  if (signal && type !== 'contact') { console.error('--signal only applies to: fde log contact'); process.exit(1) }
  const hit = findSecretHit(text)
  if (hit && !force) { refuseSecret('log text', hit); process.exit(1) }
  if (hit && force) console.error(`warning: logging possible ${hit} (--force)`)
  const date = new Date().toISOString().slice(0, 10)
  const entry = datedEntry(eng, date, text, signal || '')
  appendLogEntry(eng, type, entry)
  const hash = memoryHead(eng)
  console.log(`logged → ${LOG_FILES[type]}${signal ? ` (signal:${signal})` : ''}${hash ? ` @${hash}` : ''}`)
}

function setContextPhase(eng, phase) {
  ensureMemoryGit(eng)
  const p = path.join(eng, 'context.md')
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
  withFileLock(p, () => { atomicWriteFile(p, md.endsWith('\n') ? md : md + '\n') })
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
// brain — the agent rewrites .debrief-propose with prefixes; --apply commits.
// --dry-run prints the routing without writing anything.
function inferContactSignal(text) {
  const t = String(text)
  if (/\b(hostile|blocker|fired|refused|walked out|\bred\b|escalat(?:ed|ion) to (?:cto|legal))\b/i.test(t)) return 'red'
  if (/\b(gone quiet|unresponsive|skipped|cooling|seemed cold|no-show|missed the|amber)\b/i.test(t)) return 'amber'
  if (/\b(champion|helping|opened the|warming|supportive|on board|\bgreen\b|saw demo)\b/i.test(t)) return 'green'
  return ''
}

function looksLikePersonLine(text) {
  // "Denise …" / "Randy opened…" — capitalized subject + field verb.
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
    if (/^(decision|risk|delivery|contact|next):\s*/i.test(bare)) {
      let routed = bare.replace(/^(decision|risk|delivery|contact|next):\s*/i, (m, t) => `${t.toLowerCase()}: `)
      if (/^contact:/i.test(routed) && !/\[signal:(red|amber|green)\]/i.test(routed)) {
        const sig = inferContactSignal(routed)
        if (sig) routed = routed.replace(/\s*$/, ` [signal:${sig}]`)
      }
      out.push(routed)
      continue
    }
    if (/^(next action|follow-?ups?|action items?|todo):\s*/i.test(bare) ||
        /\b(next action|walk in with|follow up with)\b/i.test(bare)) {
      const next = bare.replace(/^(next action|follow-?ups?|action items?|todo):\s*/i, '').trim()
      out.push(`next: ${next}`)
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

function setNextAction(eng, text) {
  ensureMemoryGit(eng)
  const bullet = `- ${stripControlChars(String(text).replace(/^[-*]\s+/, '').trim())}`
  const p = path.join(eng, 'context.md')
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
  withFileLock(p, () => { atomicWriteFile(p, md.endsWith('\n') ? md : md + '\n') })
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
    try { st = fs.statSync(notesPath) } catch (_) { console.error(`cannot read ${args[0]}`); process.exit(1) }
    if (st.size > DEBRIEF_MAX_BYTES) {
      console.error(`debrief refused: ${args[0]} is ${st.size} bytes (max ${DEBRIEF_MAX_BYTES}). Split the notes or paste the relevant section.`)
      process.exit(1)
    }
    let buf
    try { buf = fs.readFileSync(notesPath) } catch (_) { console.error(`cannot read ${args[0]}`); process.exit(1) }
    if (buf.includes(0) || looksLikeBinaryNoise(buf.toString('utf8'))) {
      console.error(`debrief refused: ${args[0]} looks binary or mostly non-printable. Paste text notes only.`)
      process.exit(1)
    }
    input = buf.toString('utf8')
  } else {
    let buf
    try { buf = fs.readFileSync(0) } catch (_) { buf = Buffer.alloc(0) }
    if (Buffer.byteLength(buf) > DEBRIEF_MAX_BYTES) {
      console.error(`debrief refused: stdin is over ${DEBRIEF_MAX_BYTES} bytes. Split the notes.`)
      process.exit(1)
    }
    if (buf.includes(0) || looksLikeBinaryNoise(buf.toString('utf8'))) {
      console.error('debrief refused: stdin looks binary or mostly non-printable. Paste text notes only.')
      process.exit(1)
    }
    input = buf.toString('utf8')
  }
  return stripControlChars(input)
}

function previewLine(text, max = 240) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}… (${t.length} chars)`
}

function writeProposal(eng, text) {
  const { clean, blocks } = splitPrivate(text, { sealDangling: true })
  const proposePath = path.join(eng, DEBRIEF_PROPOSE)
  const privatePath = path.join(eng, DEBRIEF_PRIVATE)
  // Seal first. A refused or failed sidecar write must not leave behind a
  // proposal whose (private - redacted) marker has nothing left behind it.
  if (blocks.length) {
    const blocked = refuseSymlinkWrite(privatePath, { soft: true })
    if (blocked) { console.error(blocked); process.exit(1) }
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

function routeDebriefInput(eng, input, { dry, force, sealed = [] }) {
  const d = new Date()
  const date = d.toISOString().slice(0, 10)
  const counts = { decision: 0, risk: 0, delivery: 0, contact: 0, next: 0 }
  const ctxLines = []
  let nextAction = ''
  ensureMemoryGit(eng)
  // Sealed blocks are pulled out before routing, so a <private> block's interior
  // lines are never previewed and never routed into decisions/risks/stakeholders
  // unsealed. They land verbatim in context.md instead: the preview a human
  // approves is exactly what --apply writes.
  const { clean: routable, blocks: inlinePrivate } = splitPrivate(input, { sealDangling: true })
  const privateBlocks = [...inlinePrivate, ...sealed]
  for (const raw of routable.split('\n')) {
    let line = raw.trim()
    if (!line) continue
    const bare = line.replace(/^[-*+]\s+/, '').replace(/^\*\*(decision|risk|delivery|contact|next):?\*\*:?\s*/i, '$1: ')
    const m = bare.match(/^(decision|risk|delivery|contact|next):\s*(.+)$/i)
    if (m) {
      const type = m[1].toLowerCase()
      let body = m[2]
      const hit = findSecretHit(body)
      if (hit && !force) {
        console.error(`skipped ${type} line - looks like a ${hit}. Redact it, or re-run with --force.`)
        continue
      }
      if (type === 'next') {
        if (dry) console.log(`→ context.md ## Next action  - ${previewLine(body)}`)
        else nextAction = body
        counts.next++
        continue
      }
      const sigInline = (body.match(/\[signal:(red|amber|green)\]/i) || [])[1]
      if (sigInline) body = body.replace(/\[signal:(red|amber|green)\]/i, '').trim()
      const entry = datedEntry(eng, date, body, type === 'contact' && sigInline ? sigInline.toLowerCase() : '')
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
  args = args.slice()
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

  const eng = resolveEngagement({ forWrite: true })
  if (!eng) { console.error('no engagement - run: fde resume --init <name>'); process.exit(2) }

  let input = ''
  let sealed = []
  if (apply && !smart && !args[0]) {
    try { input = stripControlChars(fs.readFileSync(path.join(eng, DEBRIEF_PROPOSE), 'utf8')) } catch (_) {
      console.error('nothing to apply - run: fde debrief --smart <notes.md>   then   fde debrief --apply')
      process.exit(1)
    }
    sealed = readSealedProposal(eng)
    const expected = readSealCount(eng)
    if (expected === null ? (!sealed.length && input.includes(PRIVATE_MARKER)) : sealed.length < expected) {
      console.error(`refused: the proposal seals a private note but ${DEBRIEF_PRIVATE} is missing or unreadable - applying now would drop it silently.`)
      console.error('re-run the propose step (fde debrief --smart <notes> | fde ingest propose <id>).')
      process.exit(1)
    }
  } else {
    input = readDebriefInput(args)
  }

  if (smart) {
    const { proposePath, clean, blocks } = writeProposal(eng, smartProposeText(input))
    console.log('SMART PROPOSE (heuristic - review before apply; no new facts invented beyond line rewrites)\n')
    routeDebriefInput(eng, clean, { dry: true, force, sealed: blocks })
    if (!apply) {
      console.log(`\nproposal saved → ${proposePath}`)
      console.log('confirm:  fde debrief --apply')
      console.log('(edit the propose file first if a line mis-routed)')
      return
    }
    input = clean
    sealed = blocks
  }

  const { counts, ctxLines, privateBlocks } = routeDebriefInput(eng, input, { dry, force, sealed })
  if (!dry) {
    const hash = commitMemory(eng, 'debrief', {
      files: ['decisions.md', 'risks.md', 'delivery.md', 'stakeholders.md', 'context.md', SIGNAL_LEDGER],
    })
    try { fs.unlinkSync(path.join(eng, DEBRIEF_PROPOSE)) } catch (_) {}
    try { fs.unlinkSync(path.join(eng, DEBRIEF_PRIVATE)) } catch (_) {}
  try { fs.unlinkSync(path.join(eng, DEBRIEF_SEAL)) } catch (_) {}
    if (hash) console.log(`memory @${hash}`)
  }
  const plural = {
    decision: 'decisions', risk: 'risks', delivery: 'deliveries', contact: 'contacts', next: 'next actions',
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
// (Granola/Gmail/…) is not here — only staging + the existing confirm gate.
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
    const { proposePath, clean, blocks } = writeProposal(eng, smartProposeText(input))
    console.log(`INGEST PROPOSE from ${path.basename(item)} (via:${source})\n`)
    routeDebriefInput(eng, clean, { dry: true, force: false, sealed: blocks })
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
    `title: ${title.replace(/\n/g, ' ').slice(0, 120)}`,
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
  console.log('(does not write .fde/ — confirm via propose → apply)')
}

function cmdReceipts(args) {
  const term = args.join(' ')
  if (!term) { console.error('usage: fde receipts <search term>'); process.exit(1) }
  const eng = resolveEngagement()
  if (!eng) { console.error('no engagement - run: fde resume --init <name>'); process.exit(2) }
  const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  // "receipts" answers "what did we AGREE?" - so dated, agreed records are the
  // receipt. brief.md is the client's hypothesis and reality.md/context.md are
  // working notes; a hit there is a CLAIM, not an agreement. Keeping them in the
  // same list let an FDE cite a sales promise as a receipt - so they get a
  // separate, clearly-labelled section that is never mistaken for the record.
  const AGREEMENTS = ['decisions.md', 'delivery.md', 'success.md', 'risks.md', 'stakeholders.md']
  const CLAIMS = ['brief.md', 'assumptions.md', 'reality.md', 'context.md']
  const collect = files => {
    const hits = []
    for (const f of files) {
      if (!fs.existsSync(path.join(eng, f))) continue
      // readClean, not raw read: receipts must not grep sealed <private> notes
      // back out. Redaction can shift line numbers past a multi-line block; the
      // file:line is advisory - not leaking a sealed secret is worth that.
      readClean(eng, f).split('\n').forEach((l, i) => {
        if (rx.test(l)) hits.push(`  ${f}:${i + 1}  ${l.trim().slice(0, 160)}`)
      })
    }
    return hits
  }
  const agreed = collect(AGREEMENTS)
  const claimed = collect(CLAIMS)
  const dirty = memoryDirtyManual(eng)
  const dirtySet = new Set(dirty)
  const dirtyAgreedHits = [...new Set(
    agreed.map(h => (h.match(/^\s*([^:]+):/) || [])[1]).filter(f => f && dirtySet.has(f))
  )]
  if (agreed.length) {
    console.log('ON RECORD (dated - defensible):')
    agreed.forEach(h => {
      const file = (h.match(/^\s*([^:]+):/) || [])[1]
      console.log(h + (file && dirtySet.has(file) ? '  ⚠ dirty file' : ''))
    })
    if (dirtyAgreedHits.length) {
      console.log(
        `⚠ memory dirty (uncommitted manual edits: ${dirtyAgreedHits.join(', ')}) - dated lines above may not match the tamper-evident ledger until reviewed`
      )
    }
  }
  if (claimed.length) {
    if (agreed.length) console.log('')
    console.log('CLAIMS & working notes (stated, NOT an agreement - verify before citing):')
    claimed.forEach(h => console.log(h))
  }
  if (!agreed.length && !claimed.length) {
    console.log(`no record of "${term}" - nothing was ever logged about it. A gap in the record, not proof of absence: if it WAS agreed, log it now, dated today.`)
  } else if (!agreed.length) {
    console.log('\n(no dated agreement matched - only unverified claims above. If this was agreed, log it: fde log decision "...")')
  }
}

function cmdCapture() {
  const eng = resolveEngagement({ forWrite: true })
  if (!eng) process.exit(0) // silent: capture must never break a session
  // Workspace git facts (cwd), not the engagement memory repo.
  const branch = sh('git branch --show-current')
  const lastCommit = sh("git log -1 --format='%h %s'").slice(0, 100)
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
    if (blocked) throw Object.assign(new Error(blocked), { code: 'ESYMLINK' })
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
  // Session-start hooks call this - hygiene is proactive here (silent when clean).
  printTriageBlock(eng)
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

// Deterministic fieldbook hygiene - shared by doctor + session TRIAGE.
// Silent when clean OR brand-new (no dated work yet). Never auto-rewrites.
// High-value moments: week-start (via triage), ship/close, after real work accrues.
function collectDoctorIssues(eng) {
  const issues = []
  const s = computeSignals(eng)
  const datedBlob = [
    readEng(eng, 'decisions.md'), readEng(eng, 'delivery.md'),
    readEng(eng, 'risks.md'), readEng(eng, 'stakeholders.md'),
  ].join('\n')
  const hasDatedWork = /\[\d{4}-\d{2}-\d{2}\]/.test(datedBlob)
  // Day-1 empty templates are not hygiene failures - nagging there trains people to ignore doctor.
  const fresh = !hasDatedWork && (s.phase === '?' || s.phase === 'unset') && !s.openRisks

  if (s.memoryWarn) issues.push(s.memoryWarn)
  if (fresh) return issues

  if (s.phase === '?' || s.phase === 'unset') {
    if (hasDatedWork) {
      issues.push('phase is unset but dated work exists - run: fde log phase <land|discover|plan|build|ship|close>')
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
  const success = readClean(eng, 'success.md')
  if (!firstLine(success, 80)) issues.push('success.md has no stated done-definition - fill before plan/build')
  const ctxMd = readClean(eng, 'context.md')
  if (!sectionBody(ctxMd, 'Next action', { lastNonEmpty: true })) {
    issues.push('no ## Next action in context.md - Monday morning has nothing to drive')
  } else if (countSections(ctxMd, 'Next action') > 1) {
    issues.push(
      'duplicate ## Next action headings in context.md - fill the first (template) section and remove extras; triage reads the last non-empty'
    )
  }
  if ((s.phase === 'close' || s.phase === 'ship') && s.openRisks > 0) {
    issues.push(
      `phase is ${s.phase} with ${s.openRisks} open risk(s) - retire, hand off, or move still-live ones before calling the embed done`
    )
  }
  if (s.phase === 'close' || s.phase === 'ship') {
    if (!hasValueBucket(eng)) {
      issues.push(
        `phase is ${s.phase} with no value bucket (cost-save | risk-mitigation | revenue-uplift) in success.md or delivery value ledger`
      )
    }
    if (engagementTouchesAI(eng) && !hasEvalReceipt(eng)) {
      issues.push(
        `phase is ${s.phase} with AI in scope but no eval receipt (evals.md Verdict or delivery Eval / Ship receipts) — required before green ship/close`
      )
    }
  }
  const dupes = findDuplicateOpenRisks(eng)
  if (dupes.length) {
    const sample = (dupes[0][0] || '').replace(/\s+/g, ' ').trim().slice(0, 60)
    issues.push(
      `${dupes.length} duplicate open-risk cluster(s) (e.g. "${sample}${sample.length >= 60 ? '…' : ''}") - consolidate or retire echoes in risks.md`
    )
  }
  // Failure-path (exception-led operating map): required once past discover.
  // Land seeds; discover fills; plan+ without a real break→owner row is wallpaper.
  if (/^(plan|build|ship|close)$/.test(s.phase) && !hasOperatingMapContent(eng)) {
    issues.push(
      `phase is ${s.phase} with empty operating map - fill terrain.md ## Operating map (exception-led): break → who notices → workaround → evidence`
    )
  }
  const aliases = findAmbiguousStakeholders(eng)
  if (aliases.length) {
    const sample = aliases[0].forms.slice(0, 3).join(' / ')
    issues.push(
      `${aliases.length} stakeholder identity cluster(s) (e.g. "${sample}") - same person under different names? consolidate in stakeholders.md`
    )
  }
  return issues
}

// True when ## Operating map has at least one real exception row (not the empty template).
function hasOperatingMapContent(eng) {
  const terrain = stripTemplateNoise(readClean(eng, 'terrain.md'))
  const body = sectionBody(terrain, 'Operating map')
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
    const norm = name.replace(/\s+/g, ' ').trim().toLowerCase()
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

const VALUE_BUCKET_RE = /(cost[- ]?save|risk[- ]?mitigat|revenue[- ]?uplift)/i

function hasValueBucket(eng) {
  const success = stripTemplateNoise(readClean(eng, 'success.md'))
  const bucketLine = success.match(/\*\*Primary value bucket:\*\*\s*(.+)/i)
  if (bucketLine && VALUE_BUCKET_RE.test(bucketLine[1].trim())) return true
  if (!/\*\*Primary value bucket:\*\*/i.test(success) && VALUE_BUCKET_RE.test(success)) return true

  const ledger = stripTemplateNoise(sectionBody(readClean(eng, 'delivery.md'), 'Value ledger') || '')
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

// AI in scope for ship/close hygiene — delivery/decisions/trust evidence only.
// Do not scan terrain.md: its template headers mention LLM and would false-positive every ship.
function engagementTouchesAI(eng) {
  const trust = readClean(eng, 'trust-profile.md')
  const aiSec = stripTemplateNoise(sectionBody(trust, 'AI policy') || '')
  if (aiSec.trim().length > 20) return true
  const blob = stripTemplateNoise([
    readClean(eng, 'delivery.md'),
    readClean(eng, 'decisions.md'),
  ].join('\n'))
  return /\b(llm|rag|embedding|inference|model card|agentic|openai|anthropic|vector database|vector db)\b/i.test(blob)
}

function hasEvalReceipt(eng) {
  const evalsPath = path.join(eng, 'evals.md')
  if (fs.existsSync(evalsPath)) {
    const e = stripTemplateNoise(readClean(eng, 'evals.md'))
    // Empty G1 stub + "Pass / fail" heading is not a receipt — need a real verdict/run/result.
    if (/\*\*Verdict:\*\*\s*SHIP\b/i.test(e) || /(?:^|\n)\s*-\s*\*\*Verdict:\*\*\s*SHIP\b/i.test(e)) return true
    if (/\bLast run:\s*\d{4}-\d{2}-\d{2}/i.test(e)) return true
    if (/\|\s*G\d+\s*\|[^|\n]+\|[^|\n]+\|[^|\n]+\|[^|\n]+\|\s*pass\s*\|/i.test(e)) return true
  }
  const del = stripTemplateNoise(readClean(eng, 'delivery.md'))
  if (/#{1,6}\s+Eval\b/i.test(del) && /\b(pass|SHIP|\d+\/\d+)\b/i.test(sectionBody(del, 'Eval') || del)) return true
  if (/\beval (pack|receipt)[:\s].*\b(pass|SHIP)\b/i.test(del)) return true
  const receipts = sectionBody(del, 'Ship receipts') || ''
  if (/\bevals\.md\b/i.test(receipts) && /\b(pass|SHIP)\b/i.test(receipts) && !/\*\([^)]*evals\.md[^)]*\)\*/i.test(receipts)) {
    return true
  }
  return false
}

// Lean line for session-start TRIAGE - count + top issue + NL cue. Omitted when clean.
function hygieneTriageLines(eng) {
  const issues = collectDoctorIssues(eng)
  if (!issues.length) return []
  const top = issues[0].replace(/\s+/g, ' ').trim().slice(0, 72)
  return [
    `  hygiene: ${issues.length} issue(s) — ${top}${issues[0].length > 72 ? '…' : ''}`,
    '    → say "@fde clean up the fieldbook" when ready (agent runs fde doctor; nothing auto-rewrites)',
  ]
}

function printTriageBlock(eng) {
  console.log(resumeTriage(eng))
  for (const line of hygieneTriageLines(eng)) console.log(line)
}

function cmdDoctor() {
  const eng = resolveEngagement()
  if (!eng) { console.error('no engagement - run: fde resume --init <name>'); process.exit(2) }
  const issues = collectDoctorIssues(eng)
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
    const preview = h.line.length > 100 ? h.line.slice(0, 97) + '…' : h.line
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
  const byFile = new Map()
  for (const h of hits) {
    if (!byFile.has(h.file)) byFile.set(h.file, new Set())
    byFile.get(h.file).add(h.lineNo)
  }
  for (const [file, lineNos] of byFile) {
    const abs = path.join(eng, file)
    const before = readEng(eng, file)
    const kept = before.split('\n').filter((_, i) => !lineNos.has(i + 1))
    const after = kept.join('\n')
    if (after === before) continue
    withFileLock(abs, () => { atomicWriteFile(abs, after.endsWith('\n') || after === '' ? after : after + '\n') })
    touched.push(file)
  }
  if (!touched.length) {
    console.log('nothing changed')
    return
  }
  const hash = commitMemory(eng, `redact ${term.slice(0, 40)}`, { files: touched })
  console.log(`redacted ${hits.length} line(s) in ${touched.join(', ')}${hash ? ` @${hash}` : ''}`)
  console.log('rotate the real credential if this was a secret - history may still contain it')
}

function cmdPrep(args) {
  const eng = resolveEngagement()
  if (!eng) { console.error('no engagement - run: fde resume --init <name>'); process.exit(2) }
  const label = args.join(' ').trim() || 'next meeting'
  // Grounded brief: only text already in .fde/. No invention (Rowboat meeting-prep rule).
  console.log(`MEETING PREP — ${label}`)
  console.log('(grounded in local .fde/ only - if a fact is missing, it is missing)\n')
  console.log(resumeTriage(eng))
  const owner = readOwner(eng)
  const head = memoryHead(eng)
  if (owner || head) console.log(`  record: ${owner ? owner.email : '?'}${head ? `  @${head}` : ''}`)

  const people = extractStakeholders(eng).slice(0, 8)
  console.log('\nStakeholders (table + signal history)')
  if (!people.length) console.log('  (none yet - log contacts with --signal)')
  else people.forEach(p => console.log(`  [${p.signal}] ${p.name}${p.role ? ` — ${p.role}` : ''}${p.note ? ` · ${p.note.slice(0, 60)}` : ''}`))

  const risks = extractRisks(eng).slice(0, 5)
  console.log('\nOpen risks (table + dated bullets)')
  if (!risks.length) console.log('  (none logged)')
  else risks.forEach(r => console.log(`  [${r.severity}] ${r.text.slice(0, 100)}`))

  const success = firstLine(readClean(eng, 'success.md'), 160)
  console.log('\nSuccess looks like')
  console.log(success ? `  ${success}` : '  (success.md empty)')

  const decisions = readClean(eng, 'decisions.md').split('\n')
    .filter(l => /^-\s*\[\d{4}-\d{2}-\d{2}\]/.test(l.trim()))
    .slice(-5)
  console.log('\nRecent decisions')
  if (!decisions.length) console.log('  (none logged)')
  else decisions.forEach(l => console.log(`  ${l.trim().slice(0, 120)}`))

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
    console.log('GARDEN (contract: no new facts · no deleted substance · reversible via memory git)')
  } else if (gitHealth.reason === 'broken') {
    console.log('GARDEN (contract: no new facts · no deleted substance · ⚠ memory git BROKEN — NOT reversible until ledger is repaired)')
  } else {
    console.log('GARDEN (contract: no new facts · no deleted substance · ⚠ memory not git-versioned — NOT reversible)')
  }
  console.log(resumeTriage(eng))
  if (!gitHealth.ok) {
    console.log(
      gitHealth.reason === 'broken'
        ? '\n⚠ ledger is UNVERSIONED (corrupt .git). Repair before trusting garden apply: mv .fde/.git .fde/.git.broken && run any fde write to re-init.'
        : '\n⚠ no memory git — garden apply cannot create a reversible commit until the ledger exists.'
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
    const sample = (dupes[0][0] || '').replace(/\s+/g, ' ').trim().slice(0, 50)
    proposals.push({
      id: 'dedupe-risks',
      kind: 'apply',
      text: `Consolidate ${dupes.length} duplicate open-risk cluster(s) (e.g. "${sample}${sample.length >= 50 ? '…' : ''}") — keep first, retire echoes`,
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
  if (!proposals.length) {
    console.log('\nNothing to garden.')
    return
  }
  console.log(`\n${proposals.length} proposal(s):`)
  proposals.forEach((p, i) => console.log(`  ${i + 1}. [${p.kind}] ${p.text}`))
  if (!apply) {
    console.log('\nApply mechanical items only:  fde garden --apply')
    console.log('Manual items stay yours. Every apply commits to memory git when the ledger is healthy.')
    return
  }
  if (!gitHealth.ok && gitHealth.reason === 'broken') {
    console.error('refusing garden --apply while memory git is broken - repair the ledger first')
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
    if (p.id !== 'archive-sessions') continue
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
    for (const line of lines) {
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
    if (!archive.length) continue
    const archPath = path.join(eng, 'context-archive.md')
    const prev = fs.existsSync(archPath) ? fs.readFileSync(archPath, 'utf8') : '# Context archive\n\n'
    withFileLock(archPath, () => {
      atomicWriteFile(archPath, prev.replace(/\n*$/, '\n\n') + archive.join('\n').trim() + '\n')
    })
    withFileLock(path.join(eng, 'context.md'), () => {
      atomicWriteFile(path.join(eng, 'context.md'), keep.join('\n').replace(/\n*$/, '\n'))
    })
    applied++
    touched.add('context.md')
    touched.add('context-archive.md')
    console.log(`applied: archived ${p.sessionBlocks.length} old session-end blocks → context-archive.md`)
  }
  const hash = commitMemory(eng, 'garden', { files: [...touched] })
  if (!applied) console.log('no mechanical proposals applied (manual items remain)')
  else console.log(`garden done${hash ? ` @${hash}` : ''}`)
}

// Keep the first open-risk bullet per fingerprint; move later echoes under ## Retired.
function applyRiskDedupe(eng, clusters) {
  const p = path.join(eng, 'risks.md')
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
    return `- [${stamp}] (garden dedupe) ${body}`
  }).join('\n')
  out = appendUnderSection(out, 'Retired', block)
  withFileLock(p, () => { atomicWriteFile(p, out.endsWith('\n') ? out : out + '\n') })
  return moved
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
      const note = [s.memoryWarn, (s.dirtyFiles && s.dirtyFiles.length) ? `dirty:${s.dirtyFiles.length}` : '', s.reason || s.topRisk].filter(Boolean).join(' · ').slice(0, 70)
      rows.push({ name: d, phase: s.phase, trust: s.trust, signalAge: s.signalAge, stale: s.stale, updated: s.updated, reason: note, memoryWarn: s.memoryWarn, dirtyFiles: s.dirtyFiles })
    }
  } else {
    const eng = resolveEngagement()
    if (!eng) {
      console.error('no engagement bound to this workspace.\nrun: fde resume --init <name>   or   fde status --all')
      process.exit(2)
    }
    const s = computeSignals(eng)
    const note = [s.memoryWarn, (s.dirtyFiles && s.dirtyFiles.length) ? `dirty:${s.dirtyFiles.length}` : '', s.reason || s.topRisk].filter(Boolean).join(' · ').slice(0, 70)
    rows.push({ name: engagementSlugFromPath(eng), phase: s.phase, trust: s.trust, signalAge: s.signalAge, stale: s.stale, updated: s.updated, reason: note, memoryWarn: s.memoryWarn, dirtyFiles: s.dirtyFiles })
  }
  if (!rows.length) { console.log('no engagements yet'); return }
  const order = { RED: 0, amber: 1, green: 2 }
  rows.sort((a, b) => order[a.trust] - order[b.trust])
  console.log((all ? 'FDE PORTFOLIO' : 'FDE STATUS') + ' - trust-first triage (heuristic: red > amber > green)\n')
  for (const r of rows) {
    // "amber?" = structured signal went stale (>21d) - reconfirm before trusting it
    const label = r.trust + (r.stale ? '?' : '')
    const sig = r.signalAge != null ? `signal ${r.signalAge}d old${r.stale ? ' (STALE - reconfirm)' : ''}  ` : ''
    console.log(`  [${label.padEnd(6)}] ${r.name.padEnd(24)} phase:${(r.phase === '?' ? 'unset' : r.phase).padEnd(10)} updated:${r.updated.padEnd(8)} ${sig}${r.reason}`)
    if (r.memoryWarn) console.log(`           memory: ${r.memoryWarn}`)
    if (r.dirtyFiles && r.dirtyFiles.length) {
      console.log(`           ⚠ dirty (uncommitted manual edits): ${r.dirtyFiles.slice(0, 5).join(', ')}`)
    }
  }
  if (!all) console.log('\n(current engagement only - pass --all for the full portfolio)')
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
  const counts = { green: 0, amber: 0, RED: 0 }
  engagements.forEach(e => { counts[e.signals.trust]++ })
  const today = render.formatToday(new Date())

  // enrich each engagement with everything the read-only fieldbook renders -
  // next action + last-session excerpt (reused from context.md), brief/reality
  // one-liners, sector/overlay, days elapsed, and the four structured widgets.
  engagements.forEach(e => {
    const ctx = readClean(e.dir, 'context.md')
    e.next = (sectionBody(ctx, 'Next action', { lastNonEmpty: true }).split('\n').find(l => l.trim()) || '').trim()
    e.hasNext = !!e.next
    e.lastSession = firstLine(sectionBody(ctx, 'Current state'), 240)
    // 220, not 140 - now that brief/reality each get their own full-width
    // line instead of sharing one, a shorter cap just meant more sentences
    // cut off mid-thought for no reason.
    e.brief = firstLine(readClean(e.dir, 'brief.md'), 220)
    e.reality = firstLine(readClean(e.dir, 'reality.md'), 220)
    e.overlay = detectOverlay(e.dir)
    e.days = daysElapsed(e.dir)
    e.phaseLabel = phaseLabel(e.signals.phase)
    e.stakeholders = extractStakeholders(e.dir)
    e.risks = extractRisks(e.dir)
    e.log = extractLog(e.dir)
    e.stats = extractStats(e.dir)
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
    ].join(' ').toLowerCase())
  })

  const html = render.buildFieldbookHtml({ engagements, today })

  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    atomicWriteFile(outPath, html)
  } catch (e) {
    failFs(e, 'write fieldbook', outPath)
  }
  console.log(`fieldbook → ${outPath}`)
  console.log(`${engagements.length} engagement(s) rendered · ${counts.RED} red / ${counts.amber} amber / ${counts.green} green · 0 tokens (pure render)`)
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

// ---------- demo (see the value before touching a real client) ----------
// Everything below runs the real commands against a throwaway engagement under
// ~/fde-engagements/.demo/ - the leading dot keeps it out of every portfolio
// listing (status --all, dashboard --all, resume's "existing:" line). Nothing
// here fabricates output: the fieldbook you see is what debrief/log actually
// wrote, so the demo cannot drift from the product.
const DEMO_SLUG = 'acme-payments'
const DEMO_NOTES = `Kickoff call with Acme payments team - Priya (VP Eng, sponsor), Tom (staff eng)

decision: settle on the existing Stripe connector instead of the in-house rewrite - Priya wants the Q3 audit clean first
risk: nobody can name who owns the reconciliation job; it has failed silently twice since March
delivery: read-only access to the payments repo and the last 90 days of audit logs
contact: Priya is bought in but travelling for two weeks - Tom is the day-to-day decision maker
next: get the reconciliation runbook from Tom before touching anything

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
**Out of scope (agreed):** the in-house connector rewrite.
`,
  'success.md': `# Success

- Reconciliation failures alert someone within 15 minutes, with a named owner.
- The Q3 audit can trace any settlement discrepancy to a dated record.

**Signed off by:** Priya (VP Eng) - 2026-08-07
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
  Fake client: Acme (payments platform). No data of yours is read or written.`)

  demoStep('1. Monday of week 1 - create the fieldbook for this client', ['resume', '--init', DEMO_SLUG], workspace, env)
  demoStep('2. You walk out of the kickoff with messy notes - hand them over', ['debrief', '--smart', notes], workspace, env)
  demoStep('3. You confirm. Only now does anything enter the record', ['debrief', '--apply'], workspace, env)
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
  demoStep('6. Two days later, the sponsor goes quiet', ['log', 'contact', 'Priya has not replied to two emails about the runbook', '--signal', 'amber'], workspace, env)
  demoStep('7. Next morning, a fresh agent session with no memory of any of this', ['resume'], workspace, env)
  demoStep('8. A meeting in ten minutes - what do you walk in knowing?', ['prep', 'sponsor check-in'], workspace, env)
  demoStep('9. Six weeks later: "we never agreed to drop the rewrite"', ['receipts', 'rewrite'], workspace, env)
  demoStep('10. The whole engagement on one page', ['dashboard'], workspace, env)
  // cmdDashboard's default out path, computed rather than scraped from its output:
  // a HOME with a space in it truncates any whitespace-delimited parse.
  const html = path.join(root, 'fieldbook-current.html')

  console.log(`
  ${demoHead('What just happened')}

  - Every line above came from the real CLI - no canned output.
  - The kickoff notes became dated decisions, risks, deliveries and a stakeholder
    signal, and you confirmed before any of it was written.
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
  fde scan                 day-1 recon of this repo (facts, no AI)
  fde resume               load this workspace's engagement memory (bounded)
  fde resume --full        load the complete context.md (no bound)
  fde resume --init <name> create + bind engagement for this workspace (rebind replaces)
  fde resume --bind        show what this workspace is bound to, and what resolves
  fde triage               TRIAGE block only (hooks / Cursor session entry)
  fde log <type> <text>    append decision|risk|delivery|contact (contact takes --signal red|amber|green; --force to allow secret-like text)
  fde log phase <phase>    set engagement phase (land|discover|plan|build|ship|close)
  fde log --undo           remove the last CLI log/debrief entry from memory
  fde debrief [file]       meeting notes → memory (prefixed lines; --dry-run; --force)
  fde debrief --smart      heuristic propose (prefix + light keywords); agent routes, CLI gates → --apply
  fde ingest stage …       stage raw pull into <engagement>/.inbox/ (not .fde/)
  fde ingest list          list staged inbox items
  fde ingest propose <id>  smart-propose a staged item → .debrief-propose (confirm before apply)
  fde ingest apply         same as: fde debrief --apply
  fde prep [label]         grounded walk-in brief from existing .fde/ only
  fde doctor               lint engagement memory (stale signals, gaps)
  fde redact <term>        preview/remove lines containing a buried term (pass --apply to commit)
  fde garden [--apply]     propose safe consolidations (contract: no new facts; git-reversible)
  fde owner [set email]    who keeps this engagement record
  fde receipts <term>      "what did we agree?" with dates
  fde capture              session-end memory snapshot (hooks use this)
  fde preserve             pre-compaction context snapshot (hook-internal; hooks use this)
  fde status [--all]       current engagement status (pass --all for full portfolio)
  fde dashboard [--all]    current engagement fieldbook (pass --all for every client)
  env FDEOPS_ENGAGEMENTS_ROOT  override ~/fde-engagements (init/status/dashboard/registry)
  writes require a workspace bind (or FDEOPS_ENGAGEMENT) - folder-name match is read-only
  .fde/ is git-versioned locally for tamper-evident receipts (no remote, no telemetry)
  ingest is a sink only - source MCPs (Granola/Gmail/…) are user-configured; never ambient sync`)
}

const [cmd, ...args] = process.argv.slice(2)
switch (cmd) {
  case 'demo': cmdDemo(args); break
  case 'scan': cmdScan(); break
  case 'resume': cmdResume(args); break
  case 'triage': cmdTriage(); break
  case 'log': cmdLog(args); break
  case 'debrief': cmdDebrief(args); break
  case 'ingest': cmdIngest(args); break
  case 'prep': cmdPrep(args); break
  case 'doctor': cmdDoctor(); break
  case 'redact': cmdRedact(args); break
  case 'garden': cmdGarden(args); break
  case 'owner': cmdOwner(args); break
  case 'receipts': cmdReceipts(args); break
  case 'capture': cmdCapture(); break
  case 'preserve': cmdPreserve(); break
  case 'status': cmdStatus(args); break
  case 'dashboard': cmdDashboard(args); break
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
