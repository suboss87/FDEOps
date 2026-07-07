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
 *   fde log <type> <text>   structured append (decision|risk|delivery|contact)
 *   fde receipts <term>     "what did we agree?" - search memory with dates
 *   fde capture             session-end snapshot → context.md (hooks use this)
 *   fde status              portfolio across ~/fde-engagements (red/amber/green)
 *   fde dashboard           render every engagement into one local fieldbook.html
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync, execFileSync } = require('child_process')

const HOME = os.homedir()
const ENGAGEMENTS_ROOT = path.join(HOME, 'fde-engagements')
const REGISTRY = path.join(ENGAGEMENTS_ROOT, '.registry')
const CODE_EXT = ['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.go', '.rb', '.cs', '.php']
const CONF_EXT = CODE_EXT.concat(['.env', '.yaml', '.yml', '.json'])

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

function resolveEngagement() {
  // 1) explicit env (back-compat: accept old FDEOS_ENGAGEMENT too)
  const env = (process.env.FDEOPS_ENGAGEMENT || process.env.FDEOS_ENGAGEMENT || '').replace(/^~/, HOME).trim()
  if (env && fs.existsSync(env)) return env
  // 2) workspace registry binding (written by resume --init)
  const cwd = process.cwd()
  const reg = readRegistry().find(r => r.workspace === cwd)
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
  // 4) workspace dir name matches an engagement slug
  const guess = path.join(ENGAGEMENTS_ROOT, slugify(path.basename(cwd)), '.fde')
  if (fs.existsSync(guess)) return guess
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

// phase / trust / top risk / freshness - identical heuristic for status + dashboard.
function computeSignals(eng) {
  const ctx = readEng(eng, 'context.md'); const stake = readEng(eng, 'stakeholders.md'); const risks = readEng(eng, 'risks.md')
  const phase = (ctx.match(/phase[:* ]+\**([a-z-]+)/i) || [])[1] || '?'
  const sLines = stake.split('\n').filter(l => !(/green/i.test(l) && /red|amber/i.test(l)))
  const trust = sLines.some(l => /\bred\b/i.test(l)) ? 'RED'
    : sLines.some(l => /amber|gone quiet|routing around|escalat/i.test(l)) ? 'amber' : 'green'
  const topRisk = (risks.split('\n').find(l => {
    const t = l.trim()
    return /^[-|]/.test(t) && t.length > 20 && !/^\|?[-\s|]+$/.test(t) &&
      !/risk\s*\|\s*status|mitigation/i.test(t) && !t.startsWith('<!--')
  }) || '').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
  let updated = 'never', ageDays = Infinity
  try {
    ageDays = Math.floor((Date.now() - fs.statSync(path.join(eng, 'context.md')).mtimeMs) / 86400000)
    updated = ageDays === 0 ? 'today' : `${ageDays}d ago`
  } catch (_) {}
  return { phase, trust, topRisk, updated, ageDays }
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
  const ai = grepFiles(codeFiles, /openai|anthropic|\bllm\b|gpt-|claude|embedding|vector store|inference/i, 10)
  ai.length ? ai.forEach(h => out.push(`  ${h.file}:${h.line}  ${h.text}`)) : out.push('  none found')

  // secrets (redacted)
  out.push('\nPOSSIBLE HARDCODED SECRETS (values redacted):')
  const confFiles = files.filter(f => CONF_EXT.includes(path.extname(f)) || path.basename(f) === '.env')
  const sec = grepFiles(confFiles, /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}/i, 10)
    .filter(h => !/example|template|test|sample|placeholder/i.test(h.file + h.text))
  sec.length
    ? sec.forEach(h => out.push(`  ${h.file}:${h.line}  ${h.text.replace(/(['"])([^'"]{4})[^'"]+(['"])/, '$1$2…REDACTED$3')}`))
    : out.push('  none found')

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
    const fdeDir = path.join(ENGAGEMENTS_ROOT, slug, '.fde')
    fs.mkdirSync(fdeDir, { recursive: true })
    for (const f of fs.readdirSync(tpl)) {
      const src = path.join(tpl, f); const dst = path.join(fdeDir, f)
      if (fs.statSync(src).isDirectory()) fs.mkdirSync(dst, { recursive: true })
      else if (!fs.existsSync(dst)) fs.copyFileSync(src, dst)
    }
    fs.mkdirSync(path.join(fdeDir, 'retrospectives'), { recursive: true })
    // bind THIS workspace to the engagement (zero ceremony next time)
    const line = `${process.cwd()} ${slug}\n`
    const reg = fs.existsSync(REGISTRY) ? fs.readFileSync(REGISTRY, 'utf8') : ''
    if (!reg.includes(line.trim())) fs.appendFileSync(REGISTRY, line)
    console.log(`ENGAGEMENT READY: ${fdeDir}\nbound to workspace: ${process.cwd()}`)
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
  console.log(`ENGAGEMENT: ${eng}\n`)
  try {
    const ctx = fs.readFileSync(path.join(eng, 'context.md'), 'utf8')
    console.log(args.includes('--full') ? ctx : resumeView(ctx))
  } catch (_) { console.log('(context.md empty - new engagement)') }
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
  let headEnd = lines.findIndex(l => l.includes('fdeops auto-capture'))
  if (headEnd === -1) headEnd = 120
  headEnd = Math.min(headEnd, 120)
  const tailStart = Math.max(headEnd, lines.length - 40)
  const hidden = tailStart - headEnd
  if (hidden <= 0) return md
  const head = lines.slice(0, headEnd).join('\n').replace(/\s+$/, '')
  const tail = lines.slice(tailStart).join('\n').trim()
  return `${head}\n\n_(\u2026 ${hidden} lines of earlier session log hidden \u2014 \`fde resume --full\` or open context.md for the full history)_\n\n${tail}`
}

function cmdLog(args) {
  const map = { decision: 'decisions.md', risk: 'risks.md', delivery: 'delivery.md', contact: 'stakeholders.md' }
  const type = args[0]; const text = args.slice(1).join(' ')
  if (!map[type] || !text) { console.error('usage: fde log <decision|risk|delivery|contact> <text>'); process.exit(1) }
  const eng = resolveEngagement()
  if (!eng) { console.error('no engagement - run: fde resume --init <name>'); process.exit(2) }
  const date = new Date().toISOString().slice(0, 10)
  fs.appendFileSync(path.join(eng, map[type]), `\n- [${date}] ${text}\n`)
  console.log(`logged → ${map[type]}`)
}

function cmdReceipts(args) {
  const term = args.join(' ')
  if (!term) { console.error('usage: fde receipts <search term>'); process.exit(1) }
  const eng = resolveEngagement()
  if (!eng) { console.error('no engagement - run: fde resume --init <name>'); process.exit(2) }
  const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  let found = 0
  for (const f of ['decisions.md', 'delivery.md', 'risks.md', 'stakeholders.md', 'context.md', 'success.md', 'brief.md', 'reality.md']) {
    const p = path.join(eng, f)
    if (!fs.existsSync(p)) continue
    fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => {
      if (rx.test(l)) { console.log(`${f}:${i + 1}  ${l.trim().slice(0, 160)}`); found++ }
    })
  }
  if (!found) console.log(`no record of "${term}" - if it was agreed, it was never logged. That is itself the answer.`)
}

function cmdCapture() {
  const eng = resolveEngagement()
  if (!eng) process.exit(0) // silent: capture must never break a session
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
  try { fs.appendFileSync(path.join(eng, 'context.md'), block) } catch (_) {}
}

function cmdStatus() {
  if (!fs.existsSync(ENGAGEMENTS_ROOT)) { console.log('no engagements yet - fde resume --init <name>'); return }
  const rows = []
  for (const d of fs.readdirSync(ENGAGEMENTS_ROOT)) {
    if (d.startsWith('.')) continue
    const eng = path.join(ENGAGEMENTS_ROOT, d, '.fde')
    if (!fs.existsSync(eng)) continue
    const s = computeSignals(eng)
    rows.push({ name: d, phase: s.phase, trust: s.trust, updated: s.updated, topRisk: s.topRisk.slice(0, 60) })
  }
  if (!rows.length) { console.log('no engagements yet'); return }
  const order = { RED: 0, amber: 1, green: 2 }
  rows.sort((a, b) => order[a.trust] - order[b.trust])
  console.log('FDE PORTFOLIO - trust-first triage (heuristic: red > amber > green)\n')
  for (const r of rows) {
    console.log(`  [${r.trust.padEnd(5)}] ${r.name.padEnd(24)} phase:${r.phase.padEnd(10)} updated:${r.updated.padEnd(8)} ${r.topRisk}`)
  }
  console.log('\nred/amber derive from stakeholders.md signal words - verify before acting.')
}

// ---------- dashboard (deterministic markdown → one local HTML) ----------

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// Never leak <private> notes or template hint comments into the rendered page.
// Closed pairs are redacted; an unclosed <private> redacts to end-of-text so a
// forgotten closing tag can never leak the rest of the file.
function stripPrivate(md) {
  return md
    .replace(/<private>[\s\S]*?<\/private>/gi, '(private - redacted from dashboard)')
    .replace(/<private>[\s\S]*$/i, '(private - redacted from dashboard)')
    .replace(/<!--[\s\S]*?-->/g, '')
}

function inlineMd(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

function renderTable(rows) {
  const cells = r => r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim())
  const isSep = r => r.includes('-') && /^\|?[\s:|-]+\|?$/.test(r.trim())
  let html = '<table>'; let headerDone = false
  for (const r of rows) {
    if (isSep(r)) continue
    const cs = cells(r)
    if (!headerDone) {
      html += '<thead><tr>' + cs.map(c => '<th>' + inlineMd(c) + '</th>').join('') + '</tr></thead><tbody>'
      headerDone = true
    } else {
      if (cs.every(c => !c)) continue
      html += '<tr>' + cs.map(c => '<td>' + inlineMd(c) + '</td>').join('') + '</tr>'
    }
  }
  return html + '</tbody></table>'
}

function mdToHtml(md) {
  const lines = stripPrivate(md).split('\n')
  const out = []; let i = 0
  while (i < lines.length) {
    const t = lines[i].trim()
    if (!t) { i++; continue }
    if (/^\|.*\|/.test(t)) {
      const tbl = []
      while (i < lines.length && /^\s*\|.*\|/.test(lines[i])) { tbl.push(lines[i]); i++ }
      out.push(renderTable(tbl)); continue
    }
    const h = t.match(/^(#{1,6})\s+(.*)$/)
    if (h) { out.push('<h4>' + inlineMd(h[2]) + '</h4>'); i++; continue }
    if (/^[-*]\s+/.test(t)) {
      const items = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push('<li>' + inlineMd(lines[i].trim().replace(/^[-*]\s+/, '')) + '</li>'); i++ }
      out.push('<ul>' + items.join('') + '</ul>'); continue
    }
    const para = []
    while (i < lines.length && lines[i].trim() && !/^\s*\|.*\|/.test(lines[i]) && !/^#{1,6}\s/.test(lines[i].trim()) && !/^[-*]\s+/.test(lines[i].trim())) {
      para.push(lines[i].trim()); i++
    }
    out.push('<p>' + inlineMd(para.join(' ')) + '</p>')
  }
  return out.join('\n')
}

// True if a file has real content beyond headings, labels with empty values, and blank table rows.
function hasContent(md) {
  const txt = stripPrivate(md)
    .replace(/^#{1,6}\s.*$/gm, '')          // headings
    .replace(/^\s*\|[\s:|-]+\|\s*$/gm, '')    // table separators
    .replace(/^\s*\|[\s|]*\|\s*$/gm, '')      // empty table rows
    .replace(/\*\*[^*]+:\*\*\s*$/gm, '')      // bold labels with no value
    .replace(/[-*]\s*$/gm, '')                // empty bullets
    .replace(/\s+/g, ' ')
    .trim()
  return txt.length > 0
}

function gatherEngagements() {
  const list = []
  if (!fs.existsSync(ENGAGEMENTS_ROOT)) return list
  for (const d of fs.readdirSync(ENGAGEMENTS_ROOT).sort()) {
    if (d.startsWith('.')) continue
    const eng = path.join(ENGAGEMENTS_ROOT, d, '.fde')
    if (!fs.existsSync(eng)) continue
    list.push({ name: d, dir: eng, signals: computeSignals(eng) })
  }
  return list
}

const DASH_SECTIONS = [
  ['context.md', 'Context'],
  ['brief.md', 'Brief - stated problem'],
  ['reality.md', 'Reality - actual problem'],
  ['success.md', 'Success & scope'],
  ['stakeholders.md', 'Stakeholders'],
  ['decisions.md', 'Plan & decisions'],
  ['risks.md', 'Risk register'],
  ['delivery.md', 'Delivery log'],
  ['terrain.md', 'Terrain - codebase map'],
  ['trust-profile.md', 'Trust profile'],
]

function dashStyles() {
  return [
    // design system: quiet chrome, high density, daily-use second brain
    // light (default) + dark (opt-in via [data-fde-theme="dark"], set pre-paint - see cmdDashboard head script)
    ':root{--bg:#f9fafb;--card:#fff;--ink:#111827;--2:#374151;--3:#4b5563;--muted:#6b7280;--line:#f3f4f6;--line2:#e5e7eb;',
    '--green:#10b981;--amber:#f59e0b;--red:#ef4444;--accent:#6366f1;',
    '--red-bg:#fef2f2;--red-border:#fecaca;--red-ink:#7f1d1d;--red-ink2:#991b1b;',
    '--amber-bg:#fffbeb;--amber-border:#fde68a;--amber-ink:#78350f;--amber-ink2:#92400e;',
    '--shadow-s:0 1px 2px rgba(0,0,0,.04);--shadow:0 1px 3px rgba(0,0,0,.06);--shadow-l:0 4px 12px rgba(0,0,0,.08);',
    '--r:8px}',
    'html[data-fde-theme="dark"]{--bg:#0b0d12;--card:#161a22;--ink:#e5e7eb;--2:#cbd5e1;--3:#9ca3af;--muted:#7b8494;--line:#1f2430;--line2:#262c3a;',
    '--green:#34d399;--amber:#fbbf24;--red:#f87171;--accent:#818cf8;',
    '--red-bg:#2a1517;--red-border:#5b2328;--red-ink:#fecaca;--red-ink2:#fca5a5;',
    '--amber-bg:#2a2210;--amber-border:#5b4a1f;--amber-ink:#fde68a;--amber-ink2:#fcd34d;',
    '--shadow-s:0 1px 2px rgba(0,0,0,.3);--shadow:0 1px 3px rgba(0,0,0,.35);--shadow-l:0 4px 16px rgba(0,0,0,.45)}',
    '*{box-sizing:border-box;margin:0}',
    'body{font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased;transition:background .15s,color .15s}',
    '.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace}',
    // header - compact, purposeful
    'header{background:#111827;color:#fff;padding:20px 32px}',
    'header .inner{max-width:960px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}',
    'header .brand{display:flex;align-items:center;gap:10px}',
    'header h1{font-size:16px;font-weight:600;letter-spacing:-.2px}',
    'header .tagline{color:#9ca3af;font-size:12px}',
    '.stats{display:flex;align-items:center;gap:16px}',
    '.stat{font-size:12px;color:#9ca3af;display:flex;align-items:center;gap:5px}',
    '.stat b{color:#e5e7eb;font-weight:600}',
    '.stat .sdot{width:6px;height:6px;border-radius:50%;flex-shrink:0;box-sizing:border-box}',
    '.stat .sdot.green{background:#34d399}.stat .sdot.amber{background:#fbbf24;border-radius:1.5px}.stat .sdot.red{background:transparent;border:1.5px solid #f87171}',
    '.theme-toggle{border:1px solid #374151;background:transparent;color:#d1d5db;font-size:11px;padding:5px 10px;border-radius:6px;cursor:pointer;font-family:inherit;line-height:1.4}',
    '.theme-toggle:hover{border-color:#6b7280;color:#fff}',
    // layout
    '.wrap{max-width:960px;margin:0 auto;padding:24px 32px 64px}',
    // search - integrated, not floating
    '.search-wrap{position:relative;margin-bottom:8px}',
    '.search-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:16px;height:16px;stroke:var(--muted);stroke-width:2;fill:none}',
    '.search{width:100%;padding:10px 14px 10px 36px;font-size:13px;border:1px solid var(--line2);border-radius:var(--r);background:var(--card);color:var(--ink);transition:border-color .15s,box-shadow .15s;outline:none}',
    '.search:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(99,102,241,.15)}',
    '.search::placeholder{color:var(--muted)}',
    '.search-hint{display:block;margin:6px 2px 20px;font-size:11px;color:var(--muted)}',
    '.search-hint kbd{font-family:inherit;border:1px solid var(--line2);border-radius:4px;padding:1px 5px;font-size:10.5px;background:var(--bg)}',
    // directive - the one line that says where to start today
    '.directive{display:flex;align-items:center;gap:10px;margin:0 0 20px;padding:12px 16px;background:var(--red-bg);border:1px solid var(--red-border);border-radius:var(--r);font-size:13.5px;line-height:1.5;color:var(--red-ink)}',
    '.directive b{font-weight:700;color:var(--red-ink)}',
    '.directive.amber{background:var(--amber-bg);border-color:var(--amber-border);color:var(--amber-ink)}',
    '.directive.amber b{color:var(--amber-ink)}',
    '.directive-dot{width:9px;height:9px;border-radius:50%;background:var(--red);flex-shrink:0;box-shadow:0 0 0 3px rgba(239,68,68,.18)}',
    '.directive.amber .directive-dot{background:var(--amber);box-shadow:0 0 0 3px rgba(245,158,11,.18)}',
    // attention rows - red engagements dominate the page, full width
    '.attn-stack{display:flex;flex-direction:column;gap:10px}',
    '.attn{background:var(--red-bg);border:1px solid var(--red-border);border-left:4px solid var(--red);border-radius:var(--r);padding:16px 18px;cursor:pointer;transition:box-shadow .15s,border-color .15s}',
    '.attn:hover{border-color:var(--red);box-shadow:var(--shadow-l)}',
    '.attn-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.attn-head h3{font-size:15px;font-weight:700;color:var(--ink)}',
    '.attn .risk{margin-top:10px}',
    '.attn .next{margin-top:8px;font-size:13px;line-height:1.5;color:var(--2)}.attn .next b{color:var(--3);font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.3px;margin-right:4px}',
    // grid
    '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}',
    // cards - clean, scannable
    '.card{background:var(--card);border:1px solid var(--line2);border-radius:var(--r);padding:16px 18px;cursor:pointer;transition:border-color .15s,box-shadow .15s;position:relative;overflow:hidden}',
    '.card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px}',
    '.card:hover{border-color:var(--muted);box-shadow:var(--shadow-l)}',
    '.card.green::before{background:var(--green)}.card.amber::before{background:var(--amber)}.card.red::before{background:var(--red)}',
    '.card h3{font-size:14px;font-weight:600;margin-bottom:6px}',
    '.row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
    '.badge{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;padding:2px 7px;border-radius:4px;background:var(--line);color:var(--3);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace}',
    // colorblind-safe: shape carries the signal too, color reinforces it - circle/square/ring
    '.dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0;box-sizing:border-box}',
    '.dot.green{background:var(--green)}.dot.amber{background:var(--amber);border-radius:2px}.dot.red{background:transparent;border:2px solid var(--red)}',
    '.trust-label{font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.3px}',
    '.t-green{color:var(--green)}.t-amber{color:var(--amber)}.t-red{color:var(--red)}',
    '.meta{color:var(--muted);font-size:11px}',
    '.card .next{margin-top:10px;font-size:12.5px;line-height:1.5;color:var(--2)}.card .next b{color:var(--3);font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.3px;margin-right:2px}',
    '.card .risk{margin-top:8px;font-size:11.5px;color:var(--red-ink2);padding:5px 8px;background:var(--red-bg);border-radius:4px;border-left:2px solid var(--red);line-height:1.4}',
    '.card .risk.amber-risk{color:var(--amber-ink2);background:var(--amber-bg);border-left-color:var(--amber)}',
    // demote placeholder cards (no next action) - quiet until they earn attention
    '.card.muted{opacity:.55}',
    '.card.muted:hover{opacity:1}',
    // search match context - why this card/row matched, in the card's own words
    '.match-snippet{margin-top:8px;font-size:11.5px;line-height:1.4;color:var(--3);background:var(--bg);border-radius:4px;padding:5px 8px}',
    '.match-snippet:empty{display:none;padding:0;margin:0}',
    '.match-snippet mark{background:rgba(99,102,241,.25);color:inherit;border-radius:2px;padding:0 1px}',
    // section labels
    'h2.section{margin:28px 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:var(--muted)}',
    // detail accordion - tight, content-forward
    'details.eng{background:var(--card);border:1px solid var(--line2);border-radius:var(--r);margin:8px 0;overflow:hidden}',
    'details.eng>summary{list-style:none;cursor:pointer;padding:14px 18px;display:flex;align-items:center;gap:10px;font-weight:600;font-size:14px;transition:background .1s}',
    'details.eng>summary:hover{background:var(--bg)}',
    'details.eng>summary::-webkit-details-marker{display:none}',
    'details.eng>summary::after{content:"";margin-left:auto;width:16px;height:16px;background:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%239ca3af\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E") no-repeat center;transition:transform .15s}',
    'details.eng[open]>summary::after{transform:rotate(180deg)}',
    'details.eng[open]>summary{border-bottom:1px solid var(--line)}',
    '.eng-body{padding:8px 20px 20px}',
    '.sub-sec{padding:14px 0;border-bottom:1px solid var(--line)}.sub-sec:last-child{border-bottom:none}',
    '.sub-sec h4.title{margin:0 0 8px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)}',
    '.sub-sec h4{margin:10px 0 4px;font-size:13.5px;font-weight:600;color:var(--ink)}',
    '.sub-sec p{margin:4px 0;line-height:1.6;color:var(--2);font-size:13px}.sub-sec ul{margin:4px 0;padding-left:20px;color:var(--2);font-size:13px}',
    '.sub-sec li{margin:2px 0}',
    '.empty{color:var(--muted);font-style:italic;font-size:12px}',
    // tables
    'table{border-collapse:collapse;width:100%;margin:8px 0;font-size:12.5px;border:1px solid var(--line2);border-radius:6px;overflow:hidden}',
    'th,td{padding:7px 10px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}',
    'th{background:var(--bg);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;color:var(--3);border-bottom:1px solid var(--line2)}',
    'tr:last-child td{border-bottom:none}',
    'tr:hover td{background:var(--bg)}',
    'code{background:var(--line);padding:1px 5px;border-radius:4px;font-size:12px;color:var(--3)}',
    // footer
    'footer{max-width:960px;margin:0 auto;padding:0 32px 48px;color:var(--muted);font-size:11.5px;line-height:1.5}',
    'footer code{color:var(--3);background:var(--line)}',
    '.hide{display:none!important}',
    // responsive
    '@media(max-width:640px){header{padding:16px}.header .inner{flex-direction:column;align-items:flex-start}.wrap{padding:16px 16px 48px}.grid{grid-template-columns:1fr}.search{padding-left:32px}}',
  ].join('')
}

function dashScript() {
  return [
    "var q=document.getElementById('q');",
    "function norm(s){return (s||'').toLowerCase();}",
    "function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}",
    // why a card matched - a short excerpt from its own text, term highlighted
    "function snippetFor(raw,term){",
    "  var i=raw.indexOf(term);",
    "  if(i<0)return '';",
    "  var start=Math.max(0,i-28),end=Math.min(raw.length,i+term.length+46);",
    "  var pre=esc(raw.slice(start,i)),hit=esc(raw.slice(i,i+term.length)),post=esc(raw.slice(i+term.length,end));",
    "  return (start>0?'\u2026':'')+pre+'<mark>'+hit+'</mark>'+post+(end<raw.length?'\u2026':'');",
    "}",
    "if(q){q.addEventListener('input',function(){",
    "  var term=norm(q.value);",
    "  document.querySelectorAll('[data-search]').forEach(function(el){",
    "    var raw=norm(el.getAttribute('data-search'));",
    "    var hit=!term||raw.indexOf(term)>-1;",
    "    el.classList.toggle('hide',!hit);",
    "    var snip=el.querySelector('.match-snippet');",
    "    if(snip)snip.innerHTML=(hit&&term)?snippetFor(raw,term):'';",
    "  });",
    "});}",
    "document.querySelectorAll('.card,.attn').forEach(function(c){",
    "  c.addEventListener('click',function(){",
    "    var d=document.getElementById(c.getAttribute('data-target'));",
    "    if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'});}",
    "  });",
    "});",
    // '/' jumps to search from anywhere, unless already typing somewhere
    "document.addEventListener('keydown',function(e){",
    "  var t=e.target,typing=t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable);",
    "  if(!typing&&e.key==='/'&&q){e.preventDefault();q.focus();}",
    "});",
    // theme toggle - local only, no network; pre-paint script in <head> avoids a flash
    "var themeBtn=document.getElementById('fde-theme-btn');",
    "function currentTheme(){return document.documentElement.getAttribute('data-fde-theme')==='dark'?'dark':'light';}",
    "function setThemeLabel(){if(themeBtn)themeBtn.textContent=(currentTheme()==='dark'?'light':'dark')+' mode';}",
    "setThemeLabel();",
    "if(themeBtn){themeBtn.addEventListener('click',function(){",
    "  var next=currentTheme()==='dark'?'light':'dark';",
    "  try{localStorage.setItem('fde-fieldbook-theme',next);}catch(_){}",
    "  document.documentElement.setAttribute('data-fde-theme',next);",
    "  setThemeLabel();",
    "});}",
  ].join('\n')
}

function cmdDashboard(args) {
  const outIdx = args.indexOf('--out')
  const outPath = outIdx !== -1 && args[outIdx + 1]
    ? path.resolve(args[outIdx + 1].replace(/^~/, HOME))
    : path.join(ENGAGEMENTS_ROOT, 'fieldbook.html')
  const engagements = gatherEngagements()
  const counts = { green: 0, amber: 0, RED: 0 }
  engagements.forEach(e => { counts[e.signals.trust]++ })
  const now = new Date()
  const stamp = now.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'

  // enrich each engagement: next action + search index (reused in rows, cards, directive)
  engagements.forEach(e => {
    const ctx = readEng(e.dir, 'context.md')
    e.next = (sectionBody(ctx, 'Next action').split('\n').find(l => l.trim()) || '').trim()
    e.hasNext = !!e.next
    e.searchBlob = escapeHtml(stripPrivate(e.name + ' ' + ctx + ' ' + readEng(e.dir, 'risks.md') + ' ' + readEng(e.dir, 'stakeholders.md')).toLowerCase())
  })

  // triage order: red first (most stale first), then amber, then green; real work above placeholders
  const tierRank = { RED: 0, amber: 1, green: 2 }
  const ordered = engagements.slice().sort((a, b) =>
    (tierRank[a.signals.trust] - tierRank[b.signals.trust])
    || ((b.hasNext ? 1 : 0) - (a.hasNext ? 1 : 0))
    || ((b.signals.ageDays || 0) - (a.signals.ageDays || 0))
    || a.name.localeCompare(b.name))
  const reds = ordered.filter(e => e.signals.trust === 'RED')
  const rest = ordered.filter(e => e.signals.trust !== 'RED')

  // one directive line: where the FDE starts today, and why
  const lead = reds[0] || rest.find(e => e.signals.trust === 'amber' && e.hasNext) || rest[0]
  let directive = '', directiveClass = 'directive'
  if (lead) {
    const why = stripPrivate(lead.signals.topRisk || lead.next || (lead.signals.trust === 'RED' ? 'trust signal is red' : 'oldest open thread')).trim().slice(0, 90)
    const age = lead.signals.ageDays != null ? `${lead.signals.ageDays}d since touched` : ''
    directive = `Start here: <b>${inlineMd(lead.name)}</b> - ${inlineMd(why)}${age ? ' · ' + age : ''}`
    directiveClass = reds.length ? 'directive' : 'directive amber'
  }

  // red engagements: full-width attention rows that dominate the page
  const attention = reds.map(e => {
    const id = 'eng-' + slugify(e.name)
    return [
      `<div class="attn" data-target="${id}" data-search="${e.searchBlob}">`,
      `<div class="attn-head"><span class="dot red"></span><span class="trust-label t-red">RED</span>`,
      `<h3>${inlineMd(e.name)}</h3>`,
      `<span class="badge">${inlineMd(e.signals.phase)}</span><span class="meta">updated ${e.signals.updated}</span></div>`,
      e.signals.topRisk ? `<div class="risk">${inlineMd(e.signals.topRisk)}</div>` : '',
      e.next ? `<div class="next"><b>Next</b> ${inlineMd(e.next)}</div>` : '',
      `<div class="match-snippet"></div>`,
      `</div>`,
    ].join('')
  }).join('\n')

  // amber/green: quieter portfolio grid; cards without a next action sink and dim
  const cards = rest.map(e => {
    const id = 'eng-' + slugify(e.name)
    const trustClass = e.signals.trust
    const muted = e.hasNext ? '' : ' muted'
    return [
      `<div class="card ${trustClass}${muted}" data-target="${id}" data-search="${e.searchBlob}">`,
      `<h3>${inlineMd(e.name)}</h3>`,
      `<div class="row"><span class="dot ${trustClass}"></span><span class="trust-label t-${trustClass}">${trustClass}</span>`,
      `<span class="badge">${inlineMd(e.signals.phase)}</span><span class="meta">updated ${e.signals.updated}</span></div>`,
      e.next ? `<div class="next"><b>Next</b> ${inlineMd(e.next)}</div>` : '<div class="next meta">next action not set</div>',
      e.signals.topRisk ? `<div class="risk amber-risk">${inlineMd(e.signals.topRisk)}</div>` : '',
      `<div class="match-snippet"></div>`,
      `</div>`,
    ].join('')
  }).join('\n')

  const details = ordered.map(e => {
    const id = 'eng-' + slugify(e.name)
    const trustClass = e.signals.trust === 'RED' ? 'red' : e.signals.trust
    const subs = DASH_SECTIONS.map(([file, title]) => {
      const md = readEng(e.dir, file)
      const body = hasContent(md) ? mdToHtml(md) : '<p class="empty">- not yet filled -</p>'
      return `<div class="sub-sec"><h4 class="title">${title}</h4>${body}</div>`
    })
    // retrospectives (optional folder)
    const retroDir = path.join(e.dir, 'retrospectives')
    let retros = ''
    try {
      const files = fs.readdirSync(retroDir).filter(f => f.endsWith('.md')).sort()
      const items = files.filter(f => hasContent(readEng(retroDir, f)))
        .map(f => `<h4>${escapeHtml(f)}</h4>${mdToHtml(readEng(retroDir, f))}`).join('')
      if (items) retros = `<div class="sub-sec"><h4 class="title">Retrospectives</h4>${items}</div>`
    } catch (_) {}
    const searchBlob = escapeHtml(stripPrivate(e.name + ' ' + DASH_SECTIONS.map(([f]) => readEng(e.dir, f)).join(' ')).toLowerCase())
    return [
      `<details class="eng" id="${id}" data-search="${searchBlob}">`,
      `<summary><span class="dot ${trustClass}"></span>${inlineMd(e.name)}`,
      `<span class="badge">${inlineMd(e.signals.phase)}</span>`,
      `<span class="meta" style="font-weight:400">updated ${e.signals.updated}</span></summary>`,
      `<div class="eng-body">${subs.join('')}${retros}</div>`,
      `</details>`,
    ].join('')
  }).join('\n')

  const emptyState = '<p class="empty">No engagements yet. Start one with <code>fde resume --init &lt;client-name&gt;</code>, then re-run <code>fde dashboard</code>.</p>'

  const html = [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    // pre-paint theme: read the one localStorage key before first render so there is no flash.
    // No network calls - this file still opens and works fully offline.
    '<script>try{var t=localStorage.getItem("fde-fieldbook-theme");if(t==="dark"||(!t&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.setAttribute("data-fde-theme","dark");}catch(e){}</script>',
    '<title>FDE Fieldbook</title><style>' + dashStyles() + '</style></head><body>',
    '<header><div class="inner"><div class="brand"><h1>FDE Fieldbook</h1>',
    `<span class="tagline">${engagements.length} engagement${engagements.length === 1 ? '' : 's'}</span></div>`,
    '<div class="stats">',
    `<span class="stat"><span class="sdot green"></span> <b>${counts.green}</b> green</span>`,
    `<span class="stat"><span class="sdot amber"></span> <b>${counts.amber}</b> amber</span>`,
    `<span class="stat"><span class="sdot red"></span> <b>${counts.RED}</b> red</span>`,
    '<button id="fde-theme-btn" class="theme-toggle" type="button">dark mode</button>',
    '</div></div></header>',
    '<div class="wrap">',
    engagements.length ? '<div class="search-wrap"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><input id="q" class="search" placeholder="Search across all engagements..."></div>' : '',
    engagements.length ? '<span class="search-hint">press <kbd>/</kbd> to search - a matching card shows why, right on the card</span>' : '',
    directive ? `<div class="${directiveClass}"><span class="directive-dot"></span><span>${directive}</span></div>` : '',
    reds.length ? '<h2 class="section">Needs attention</h2><div class="attn-stack">' + attention + '</div>' : '',
    engagements.length ? `<h2 class="section">${reds.length ? 'Rest of portfolio' : 'Portfolio'}</h2>` : '',
    engagements.length ? (rest.length ? `<div class="grid">${cards}</div>` : '<p class="empty">Every active engagement needs attention - see above.</p>') : emptyState,
    engagements.length ? '<h2 class="section">Engagement detail</h2>' + details : '',
    '</div>',
    `<footer>fdeops · fieldbook is a deterministic render of your <code>.fde/</code> memory - edit the markdown, re-run <code>fde dashboard</code>. Source of truth stays in the files.</footer>`,
    '<script>' + dashScript() + '</script>',
    '</body></html>',
  ].join('\n')

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, html)
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

const [cmd, ...args] = process.argv.slice(2)
switch (cmd) {
  case 'scan': cmdScan(); break
  case 'resume': cmdResume(args); break
  case 'log': cmdLog(args); break
  case 'receipts': cmdReceipts(args); break
  case 'capture': cmdCapture(); break
  case 'status': cmdStatus(); break
  case 'dashboard': cmdDashboard(args); break
  default:
    console.log(`fde - deterministic core of fdeops
  fde scan                 day-1 recon of this repo (facts, no AI)
  fde resume               load this workspace's engagement memory (bounded)
  fde resume --full        load the complete context.md (no bound)
  fde resume --init <name> create + bind engagement for this workspace
  fde log <type> <text>    append decision|risk|delivery|contact
  fde receipts <term>      "what did we agree?" with dates
  fde capture              session-end memory snapshot (hooks use this)
  fde status               portfolio across all engagements
  fde dashboard            render every engagement into one local fieldbook.html`)
}
