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
 *   fde owner [set …]       who keeps this engagement record
 *   fde receipts <term>     "what did we agree?" - search memory with dates
 *   fde capture             session-end snapshot → context.md (hooks use this)
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
  // 1) explicit env (back-compat: accept old FDEOS_ENGAGEMENT too)
  const env = (process.env.FDEOPS_ENGAGEMENT || process.env.FDEOS_ENGAGEMENT || '').replace(/^~/, HOME).trim()
  if (env && fs.existsSync(env)) return env
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
    const p = path.join(ENGAGEMENTS_ROOT, reg.slug, '.fde')
    if (fs.existsSync(p)) return p
  }
  // 3) global pointer file (back-compat: try old FDEOS-CLAUDE.md too)
  for (const ptrName of ['FDEOPS-CLAUDE.md', 'FDEOS-CLAUDE.md']) {
    try {
      const ptr = fs.readFileSync(path.join(HOME, '.claude', ptrName), 'utf8')
      const m = ptr.match(/^(?:FDEOPS|FDEOS)_ENGAGEMENT=(.+)$/m)
      if (m) {
        const p = m[1].trim().replace(/^~/, HOME)
        if (fs.existsSync(p)) return p
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
    process.stderr.write(`⚠ resolved engagement by directory name ("${slugGuess}"), not a saved binding (read-only). If this is the right client, run \`fde resume --init ${slugGuess}\` here to bind it before logging or debriefing.\n`)
    return guess
  }
  // 5) in-repo .fde (engagement-approved only)
  if (fs.existsSync(path.join(cwd, '.fde'))) return path.join(cwd, '.fde')
  return null
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
function stripPrivate(md) {
  return md
    .replace(/<private>[\s\S]*?<\/private>/gi, '(private - redacted)')
    .replace(/<private>[\s\S]*$/i, '(private - redacted)')
    .replace(/<!--[\s\S]*?-->/g, '')
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
    fs.writeFileSync(tmp, content)
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
  bits.push(text)
  return bits.join(' ')
}

const {
  ensureMemoryGit,
  memoryDirtyManual,
  commitMemory,
  memoryHead,
} = createMemoryApi({ fs, path, gitBinOk, writeOwnerIfMissing, atomicWriteFile })

// Pull the body under a "## Heading" up to the next "##" (or EOF).
function sectionBody(md, heading) {
  const lines = md.split('\n')
  const start = lines.findIndex(l => new RegExp('^#{1,6}\\s+' + heading + '\\b', 'i').test(l.trim()))
  if (start === -1) return ''
  const body = []
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,6}\s/.test(lines[i].trim())) break
    body.push(lines[i])
  }
  return body.join('\n').trim()
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
    text = text.replace(/\[signal:(red|amber|green)\]\s*/i, '').trim()
    if (date && text) entries.push({ date, text, kind })
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
  return entries.slice(0, 15)
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

    const fillTemplates = (destFde) => {
      for (const f of fs.readdirSync(tpl)) {
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
      ? fs.readdirSync(ENGAGEMENTS_ROOT).filter(d => !d.startsWith('.')).join(', ') || '(none yet)'
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
// start with decision:/risk:/delivery:/contact: (case-insensitive) go to their
// LOG_FILES target as dated bullets; everything else lands in context.md as one
// dated debrief block. contact: lines may carry an inline [signal:x] token
// anywhere in the text - preserved verbatim so computeSignals can trust it.
// --smart: heuristic propose from messy prose (confirm with --apply). No network.
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
    if (/\b(we (decided|agreed)|decision:|descope|agreed to|agreement was|freeze scope)\b/i.test(bare)) {
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
  const bullet = `- ${String(text).replace(/^[-*]\s+/, '').trim()}`
  const p = path.join(eng, 'context.md')
  let md = readEng(eng, 'context.md')
  if (!md) md = '# Engagement context\n\n'
  if (/^##\s+Next action\b/im.test(md)) {
    md = md.replace(/(^##\s+Next action\b[^\n]*\n)([\s\S]*?)(?=^##\s|\s*$)/im, `$1\n${bullet}\n\n`)
  } else {
    md = md.replace(/\n*$/, `\n\n## Next action\n\n${bullet}\n`)
  }
  withFileLock(p, () => { atomicWriteFile(p, md.endsWith('\n') ? md : md + '\n') })
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
    if (buf.includes(0)) {
      console.error(`debrief refused: ${args[0]} looks binary (null bytes). Paste text notes only.`)
      process.exit(1)
    }
    input = buf.toString('utf8')
  } else {
    try { input = fs.readFileSync(0, 'utf8') } catch (_) {}
    if (Buffer.byteLength(input, 'utf8') > DEBRIEF_MAX_BYTES) {
      console.error(`debrief refused: stdin is over ${DEBRIEF_MAX_BYTES} bytes. Split the notes.`)
      process.exit(1)
    }
  }
  return input
}

function routeDebriefInput(eng, input, { dry, force }) {
  const d = new Date()
  const date = d.toISOString().slice(0, 10)
  const counts = { decision: 0, risk: 0, delivery: 0, contact: 0, next: 0 }
  const ctxLines = []
  let nextAction = ''
  ensureMemoryGit(eng)
  for (const raw of input.split('\n')) {
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
        if (dry) console.log(`→ context.md ## Next action  - ${body}`)
        else nextAction = body
        counts.next++
        continue
      }
      const sigInline = (body.match(/\[signal:(red|amber|green)\]/i) || [])[1]
      if (sigInline) body = body.replace(/\[signal:(red|amber|green)\]/i, '').trim()
      const entry = datedEntry(eng, date, body, type === 'contact' && sigInline ? sigInline.toLowerCase() : '')
      if (dry) console.log(`→ ${LOG_FILES[type]}  ${entry}`)
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
  if (ctxLines.length) {
    const stamp = `${date} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    if (dry) ctxLines.forEach(l => console.log(`→ context.md  - ${l}`))
    else lockedAppendFile(path.join(eng, 'context.md'), `\n## Debrief - ${stamp}\n${ctxLines.map(l => `- ${l}`).join('\n')}\n`)
  }
  return { counts, ctxLines, date, nextAction }
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
  if (apply && !smart && !args[0]) {
    try { input = fs.readFileSync(path.join(eng, DEBRIEF_PROPOSE), 'utf8') } catch (_) {
      console.error('nothing to apply - run: fde debrief --smart <notes.md>   then   fde debrief --apply')
      process.exit(1)
    }
  } else {
    input = readDebriefInput(args)
  }

  if (smart) {
    const proposed = smartProposeText(input)
    const proposePath = path.join(eng, DEBRIEF_PROPOSE)
    withFileLock(proposePath, () => { atomicWriteFile(proposePath, proposed) })
    console.log('SMART PROPOSE (heuristic - review before apply; no new facts invented beyond line rewrites)\n')
    routeDebriefInput(eng, proposed, { dry: true, force })
    if (!apply) {
      console.log(`\nproposal saved → ${proposePath}`)
      console.log('confirm:  fde debrief --apply')
      console.log('(edit the propose file first if a line mis-routed)')
      return
    }
    input = proposed
  }

  const { counts, ctxLines } = routeDebriefInput(eng, input, { dry, force })
  if (!dry) {
    const hash = commitMemory(eng, 'debrief', {
      files: ['decisions.md', 'risks.md', 'delivery.md', 'stakeholders.md', 'context.md', SIGNAL_LEDGER],
    })
    try { fs.unlinkSync(path.join(eng, DEBRIEF_PROPOSE)) } catch (_) {}
    if (hash) console.log(`memory @${hash}`)
  }
  const plural = {
    decision: 'decisions', risk: 'risks', delivery: 'deliveries', contact: 'contacts', next: 'next actions',
  }
  const parts = Object.keys(counts).filter(t => counts[t])
    .map(t => `${counts[t]} ${counts[t] === 1 ? (t === 'next' ? 'next action' : t) : plural[t]}`)
  if (ctxLines.length) parts.push(`${ctxLines.length} context line${ctxLines.length === 1 ? '' : 's'}`)
  const verb = dry ? 'debrief would route' : 'debrief routed'
  console.log(parts.length ? `${verb} → ${parts.join(', ')}` : 'debrief empty - nothing routed')
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
  if (agreed.length) {
    console.log('ON RECORD (dated - defensible):')
    agreed.forEach(h => console.log(h))
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
  const stamp = `${d.toISOString().slice(0, 10)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
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
  if (!fs.existsSync(path.join(eng, '.git'))) issues.push('memory not git-versioned - next write will init, or re-run resume --init')
  const success = readClean(eng, 'success.md')
  if (!firstLine(success, 80)) issues.push('success.md has no stated done-definition - fill before plan/build')
  if (!sectionBody(readClean(eng, 'context.md'), 'Next action')) {
    issues.push('no ## Next action in context.md - Monday morning has nothing to drive')
  }
  if ((s.phase === 'close' || s.phase === 'ship') && s.openRisks > 0) {
    issues.push(
      `phase is ${s.phase} with ${s.openRisks} open risk(s) - retire, hand off, or move still-live ones before calling the embed done`
    )
  }
  const dupes = findDuplicateOpenRisks(eng)
  if (dupes.length) {
    const sample = (dupes[0][0] || '').replace(/\s+/g, ' ').trim().slice(0, 60)
    issues.push(
      `${dupes.length} duplicate open-risk cluster(s) (e.g. "${sample}${sample.length >= 60 ? '…' : ''}") - consolidate or retire echoes in risks.md`
    )
  }
  return issues
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
  // Gardener contract (from Rowboat note_curation): no new facts, no deleted substance,
  // reversible via git, confirm before apply. Mechanical only - no LLM rewrite.
  console.log('GARDEN (contract: no new facts · no deleted substance · reversible via memory git)')
  console.log(resumeTriage(eng))
  const proposals = []
  const s = computeSignals(eng)
  if (s.stale) {
    proposals.push({
      id: 'reconfirm-signal',
      kind: 'manual',
      text: `Reconfirm stale ${s.trust} signal (${s.signalAge}d): fde log contact "…" --signal`,
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
    console.log('Manual items stay yours. Every apply commits to memory git.')
    return
  }
  ensureMemoryGit(eng)
  let applied = 0
  for (const p of proposals) {
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
    console.log(`applied: archived ${p.sessionBlocks.length} old session-end blocks → context-archive.md`)
  }
  const hash = commitMemory(eng, 'garden', { files: ['context.md', 'context-archive.md'] })
  if (!applied) console.log('no mechanical proposals applied (manual items remain)')
  else console.log(`garden done${hash ? ` @${hash}` : ''}`)
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
    e.next = (sectionBody(ctx, 'Next action').split('\n').find(l => l.trim()) || '').trim()
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

function printUsage() {
  console.log(`fde - deterministic core of fdeops
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
  fde debrief --smart      propose routing from messy notes → review → fde debrief --apply
  fde prep [label]         grounded walk-in brief from existing .fde/ only
  fde doctor               lint engagement memory (stale signals, gaps)
  fde redact <term>        preview/remove lines containing a buried term (pass --apply to commit)
  fde garden [--apply]     propose safe consolidations (contract: no new facts; git-reversible)
  fde owner [set email]    who keeps this engagement record
  fde receipts <term>      "what did we agree?" with dates
  fde capture              session-end memory snapshot (hooks use this)
  fde status [--all]       current engagement status (pass --all for full portfolio)
  fde dashboard [--all]    current engagement fieldbook (pass --all for every client)
  env FDEOPS_ENGAGEMENTS_ROOT  override ~/fde-engagements (init/status/dashboard/registry)
  writes require a workspace bind (or FDEOPS_ENGAGEMENT) - folder-name match is read-only
  .fde/ is git-versioned locally for tamper-evident receipts (no remote, no telemetry)`)
}

const [cmd, ...args] = process.argv.slice(2)
switch (cmd) {
  case 'scan': cmdScan(); break
  case 'resume': cmdResume(args); break
  case 'triage': cmdTriage(); break
  case 'log': cmdLog(args); break
  case 'debrief': cmdDebrief(args); break
  case 'prep': cmdPrep(args); break
  case 'doctor': cmdDoctor(); break
  case 'redact': cmdRedact(args); break
  case 'garden': cmdGarden(args); break
  case 'owner': cmdOwner(args); break
  case 'receipts': cmdReceipts(args); break
  case 'capture': cmdCapture(); break
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
