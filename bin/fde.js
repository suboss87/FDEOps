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
  // "Blacktone" - a calm, dense, modern standup board. Dark by default, light on request.
  return `
:root{
  --bg:#0c0e12;--surface:#14171d;--surface-2:#1a1e25;--elevated:#1e232b;
  --ink:#e9ecf1;--ink-2:#aeb4bf;--muted:#777e8a;
  --line:rgba(255,255,255,.07);--line-2:rgba(255,255,255,.12);
  --green:#34d399;--amber:#fbbf24;--red:#fb7185;--accent:#8b8fff;
  --red-tint:rgba(251,113,133,.09);--amber-tint:rgba(251,191,36,.07);
  --shadow:0 1px 0 rgba(255,255,255,.03),0 8px 24px rgba(0,0,0,.4);
  --r:14px;--r-s:9px;
  --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
}
@media(prefers-color-scheme:light){
  :root{
    --bg:#f6f7f9;--surface:#ffffff;--surface-2:#f3f5f8;--elevated:#ffffff;
    --ink:#10131a;--ink-2:#414855;--muted:#727a87;
    --line:rgba(15,19,26,.08);--line-2:rgba(15,19,26,.14);
    --green:#0f9d6b;--amber:#c87f0a;--red:#e23a5e;--accent:#5b5ff0;
    --red-tint:rgba(226,58,94,.05);--amber-tint:rgba(200,127,10,.05);
    --shadow:0 1px 2px rgba(15,19,26,.04),0 10px 28px rgba(15,19,26,.08);
  }
}
*{box-sizing:border-box;margin:0}
html{scroll-behavior:smooth}
body{font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.wrap{max-width:880px;margin:0 auto;padding:0 22px 72px}
/* sticky top bar */
.topbar{position:sticky;top:0;z-index:20;backdrop-filter:saturate(140%) blur(12px);background:color-mix(in srgb,var(--bg) 82%,transparent);border-bottom:1px solid var(--line)}
.bar-inner{max-width:880px;margin:0 auto;padding:13px 22px;display:flex;align-items:center;justify-content:space-between;gap:14px}
.brand{display:flex;align-items:baseline;gap:9px;min-width:0}
.brand .logo{width:9px;height:9px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 22%,transparent);align-self:center;flex-shrink:0}
.brand .title{font-size:15px;font-weight:650;letter-spacing:-.2px}
.brand .date{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.health{display:flex;align-items:center;gap:10px}
.meter{display:flex;width:120px;height:7px;border-radius:99px;overflow:hidden;background:var(--line-2)}
.meter .seg{height:100%}
.meter .seg.red{background:var(--red)}.meter .seg.amber{background:var(--amber)}.meter .seg.green{background:var(--green)}
.health-num{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
/* search */
.search-wrap{position:relative;margin:22px 0 18px}
.search-wrap svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:15px;height:15px;stroke:var(--muted);stroke-width:2;fill:none}
.search{width:100%;padding:11px 14px 11px 38px;font-size:13px;color:var(--ink);border:1px solid var(--line);border-radius:var(--r-s);background:var(--surface);outline:none;transition:border-color .15s,box-shadow .15s}
.search:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent)}
.search::placeholder{color:var(--muted)}
/* TODAY hero */
.today{position:relative;margin:0 0 26px;padding:20px 22px;background:linear-gradient(180deg,var(--surface-2),var(--surface));border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--shadow);overflow:hidden}
.today::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--red)}
.today.lead-amber::before{background:var(--amber)}
.today .tag{font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--muted);display:flex;align-items:center;gap:7px}
.today .tag .pulse{width:7px;height:7px;border-radius:50%;background:var(--red);box-shadow:0 0 0 0 color-mix(in srgb,var(--red) 60%,transparent);animation:pulse 2.4s infinite}
.today.lead-amber .tag .pulse{background:var(--amber);box-shadow:0 0 0 0 color-mix(in srgb,var(--amber) 60%,transparent)}
@keyframes pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--red) 55%,transparent)}70%{box-shadow:0 0 0 7px transparent}100%{box-shadow:0 0 0 0 transparent}}
.today h2{font-size:21px;font-weight:720;letter-spacing:-.4px;margin:9px 0 5px}
.today .why{color:var(--ink-2);font-size:14px;line-height:1.55;max-width:62ch}
.today .why b,.today .why strong{color:var(--ink);font-weight:650}
.today .foot{display:flex;align-items:center;gap:14px;margin-top:14px;flex-wrap:wrap}
.today .age{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.copy{appearance:none;font:inherit;font-size:12px;font-weight:600;color:var(--ink);background:var(--elevated);border:1px solid var(--line-2);border-radius:99px;padding:6px 13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:border-color .15s,background .15s,transform .08s}
.copy:hover{border-color:var(--accent);background:var(--surface-2)}
.copy:active{transform:translateY(1px)}
.copy svg{width:13px;height:13px;stroke:currentColor;stroke-width:2;fill:none}
.copy.done{color:var(--green);border-color:color-mix(in srgb,var(--green) 50%,transparent)}
/* section label */
.section{margin:24px 2px 11px;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted)}
.section .ct{color:var(--ink-2);margin-left:6px;font-weight:600}
/* dense engagement rows */
.rows{display:flex;flex-direction:column;gap:7px}
details.eng{background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--muted);border-radius:var(--r-s);overflow:hidden;transition:border-color .15s,background .15s,box-shadow .15s}
details.eng:hover{box-shadow:var(--shadow)}
details.eng.t-red{border-left-color:var(--red);background:linear-gradient(90deg,var(--red-tint),var(--surface) 60%)}
details.eng.t-amber{border-left-color:var(--amber)}
details.eng.t-green{border-left-color:var(--green)}
details.eng.muted{opacity:.5}
details.eng.muted:hover,details.eng[open].muted{opacity:1}
details.eng>summary{list-style:none;cursor:pointer;padding:13px 15px;display:flex;align-items:center;gap:12px}
details.eng>summary::-webkit-details-marker{display:none}
.r-name{font-size:14px;font-weight:650;letter-spacing:-.1px;white-space:nowrap;flex-shrink:0}
.track{display:flex;gap:4px;flex-shrink:0}
.track .d{width:6px;height:6px;border-radius:50%;background:var(--line-2)}
.track .d.done{background:var(--ink-2)}
.track .d.cur{background:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 22%,transparent)}
.r-next{flex:1;min-width:0;color:var(--ink-2);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.r-next.none{color:var(--muted);font-style:italic}
.r-age{font-size:11.5px;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap;flex-shrink:0;display:flex;align-items:center;gap:4px}
.r-age.stale{color:var(--amber)}
.r-age.stale svg{width:11px;height:11px;stroke:currentColor;stroke-width:2;fill:none}
.chev{width:15px;height:15px;flex-shrink:0;stroke:var(--muted);stroke-width:2;fill:none;transition:transform .18s}
details.eng[open] .chev{transform:rotate(180deg)}
.r-copy{appearance:none;font:inherit;font-size:11px;color:var(--muted);background:transparent;border:1px solid var(--line-2);border-radius:7px;padding:3px 8px;cursor:pointer;opacity:0;transition:opacity .15s,color .15s,border-color .15s;flex-shrink:0}
details.eng:hover .r-copy{opacity:1}
.r-copy:hover{color:var(--ink);border-color:var(--accent)}
.r-copy.done{color:var(--green);opacity:1;border-color:color-mix(in srgb,var(--green) 50%,transparent)}
/* expanded body */
.eng-body{padding:4px 18px 18px;border-top:1px solid var(--line)}
.sub-sec{padding:13px 0;border-bottom:1px solid var(--line)}.sub-sec:last-child{border-bottom:none}
.sub-sec h4.title{margin:0 0 7px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.9px;color:var(--muted)}
.sub-sec h4{margin:10px 0 4px;font-size:13.5px;font-weight:650;color:var(--ink)}
.sub-sec p{margin:4px 0;line-height:1.62;color:var(--ink-2);font-size:13px}
.sub-sec ul{margin:4px 0;padding-left:19px;color:var(--ink-2);font-size:13px}.sub-sec li{margin:2px 0}
.empty{color:var(--muted);font-style:italic;font-size:12.5px}
table{border-collapse:collapse;width:100%;margin:8px 0;font-size:12.5px;border:1px solid var(--line);border-radius:8px;overflow:hidden}
th,td{padding:7px 10px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}
th{background:var(--surface-2);font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)}
tr:last-child td{border-bottom:none}
code{background:var(--surface-2);padding:1px 5px;border-radius:5px;font-size:12px;font-family:var(--mono);color:var(--ink-2)}
strong{color:var(--ink);font-weight:650}
footer{max-width:880px;margin:0 auto;padding:8px 22px 56px;color:var(--muted);font-size:11.5px;line-height:1.6}
footer code{color:var(--ink-2)}
.hide{display:none!important}
@media(max-width:600px){
  .bar-inner,.wrap{padding-left:15px;padding-right:15px}
  .meter{width:84px}
  details.eng>summary{flex-wrap:wrap}
  .r-next{flex-basis:100%;order:5;white-space:normal}
}`
}

function dashScript() {
  return [
    "var q=document.getElementById('q');",
    "function norm(s){return (s||'').toLowerCase();}",
    "if(q){",
    "  q.addEventListener('input',function(){",
    "    var term=norm(q.value);",
    "    document.querySelectorAll('[data-search]').forEach(function(el){",
    "      var hit=!term||norm(el.getAttribute('data-search')).indexOf(term)>-1;",
    "      el.classList.toggle('hide',!hit);",
    "    });",
    "  });",
    "  document.addEventListener('keydown',function(e){",
    "    if(e.key==='/'&&document.activeElement!==q){e.preventDefault();q.focus();}",
    "    else if(e.key==='Escape'&&document.activeElement===q){q.value='';q.dispatchEvent(new Event('input'));q.blur();}",
    "  });",
    "}",
    "function flash(btn){if(btn._orig==null)btn._orig=btn.innerHTML;btn.classList.add('done');btn.textContent='Copied';clearTimeout(btn._t);btn._t=setTimeout(function(){btn.classList.remove('done');btn.innerHTML=btn._orig;btn._orig=null;},1400);}",
    "function legacyCopy(text){var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();var ok=false;try{ok=document.execCommand('copy');}catch(_){}document.body.removeChild(ta);return ok;}",
    "document.querySelectorAll('[data-copy]').forEach(function(btn){",
    "  btn.addEventListener('click',function(e){",
    "    e.preventDefault();e.stopPropagation();",
    "    var text=btn.getAttribute('data-copy');",
    "    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){flash(btn);},function(){if(legacyCopy(text))flash(btn);});}",
    "    else if(legacyCopy(text)){flash(btn);}",
    "  });",
    "});",
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

  // phase lifecycle: render a 6-dot progress track per engagement
  const PHASES = ['land', 'discover', 'plan', 'build', 'ship', 'operate']
  const phaseIdx = p => { const i = PHASES.indexOf(String(p).toLowerCase()); return i !== -1 ? i : (String(p).toLowerCase() === 'close' ? 5 : -1) }
  const phaseTrack = p => {
    const idx = phaseIdx(p)
    const dots = PHASES.map((_, i) => `<span class="d${i < idx ? ' done' : i === idx ? ' cur' : ''}"></span>`).join('')
    return `<span class="track" title="phase: ${escapeHtml(p)}">${dots}</span>`
  }
  // paste-ready resume prompt - the "copy context" payload
  const resumeText = e => escapeHtml(stripPrivate(
    `Resume engagement "${e.name}". Phase: ${e.signals.phase}. Trust: ${e.signals.trust}. ` +
    `Next action: ${e.next || 'not set'}. Top risk: ${e.signals.topRisk || 'none logged'}.`).replace(/\s+/g, ' ').trim())
  const copyIcon = '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>'

  // enrich each engagement: next action + search index
  engagements.forEach(e => {
    const ctx = readEng(e.dir, 'context.md')
    e.next = (sectionBody(ctx, 'Next action').split('\n').find(l => l.trim()) || '').trim()
    e.hasNext = !!e.next
    e.searchBlob = escapeHtml(stripPrivate(e.name + ' ' + DASH_SECTIONS.map(([f]) => readEng(e.dir, f)).join(' ')).toLowerCase())
  })

  // triage order: red > amber > green; real work above placeholders; most stale first
  const tierRank = { RED: 0, amber: 1, green: 2 }
  const ordered = engagements.slice().sort((a, b) =>
    (tierRank[a.signals.trust] - tierRank[b.signals.trust])
    || ((b.hasNext ? 1 : 0) - (a.hasNext ? 1 : 0))
    || ((b.signals.ageDays || 0) - (a.signals.ageDays || 0))
    || a.name.localeCompare(b.name))
  const reds = ordered.filter(e => e.signals.trust === 'RED')

  // TODAY hero - where the FDE starts, and why
  const lead = reds[0] || ordered.find(e => e.signals.trust === 'amber' && e.hasNext) || ordered[0]
  let today = ''
  if (lead) {
    const why = inlineMd(stripPrivate(lead.signals.topRisk || lead.next || (lead.signals.trust === 'RED' ? 'trust signal is red - stabilise before anything else' : 'oldest open thread, keep it warm')).trim().slice(0, 160))
    const a = lead.signals.ageDays
    const ageTxt = !Number.isFinite(a) ? 'not touched yet' : a === 0 ? 'touched today' : `${a}d since touched`
    today = [
      `<section class="today${reds.length ? '' : ' lead-amber'}">`,
      `<div class="tag"><span class="pulse"></span>${reds.length ? 'Today, start here' : 'Today, keep moving'}</div>`,
      `<h2>${inlineMd(lead.name)}</h2>`,
      `<p class="why">${why}</p>`,
      `<div class="foot">${phaseTrack(lead.signals.phase)}<span class="age">${ageTxt}</span>`,
      `<button class="copy" data-copy="${resumeText(lead)}">${copyIcon}Copy context</button></div>`,
      `</section>`,
    ].join('')
  }

  // every engagement as a dense, expandable row
  const rows = ordered.map(e => {
    const id = 'eng-' + slugify(e.name)
    const trustClass = e.signals.trust === 'RED' ? 't-red' : 't-' + e.signals.trust
    const muted = e.hasNext ? '' : ' muted'
    const a = e.signals.ageDays
    const stale = Number.isFinite(a) && a >= 14
    const ageTxt = !Number.isFinite(a) ? 'never' : a === 0 ? 'today' : a + 'd'
    const ageHtml = `<span class="r-age${stale ? ' stale' : ''}">${stale ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' : ''}${ageTxt}</span>`
    const nextHtml = e.next
      ? `<span class="r-next">${inlineMd(e.next)}</span>`
      : '<span class="r-next none">no next action set</span>'

    const subs = DASH_SECTIONS.map(([file, title]) => {
      const md = readEng(e.dir, file)
      const body = hasContent(md) ? mdToHtml(md) : '<p class="empty">- not yet filled -</p>'
      return `<div class="sub-sec"><h4 class="title">${title}</h4>${body}</div>`
    })
    const retroDir = path.join(e.dir, 'retrospectives')
    let retros = ''
    try {
      const files = fs.readdirSync(retroDir).filter(f => f.endsWith('.md')).sort()
      const items = files.filter(f => hasContent(readEng(retroDir, f)))
        .map(f => `<h4>${escapeHtml(f)}</h4>${mdToHtml(readEng(retroDir, f))}`).join('')
      if (items) retros = `<div class="sub-sec"><h4 class="title">Retrospectives</h4>${items}</div>`
    } catch (_) {}

    return [
      `<details class="eng ${trustClass}${muted}" id="${id}" data-search="${e.searchBlob}">`,
      `<summary>`,
      `<span class="r-name">${inlineMd(e.name)}</span>`,
      phaseTrack(e.signals.phase),
      nextHtml,
      ageHtml,
      `<button class="r-copy" data-copy="${resumeText(e)}" title="Copy resume context">copy</button>`,
      `<svg class="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>`,
      `</summary>`,
      `<div class="eng-body">${subs.join('')}${retros}</div>`,
      `</details>`,
    ].join('')
  }).join('\n')

  const emptyState = '<p class="empty">No engagements yet. Start one with <code>fde resume --init &lt;client-name&gt;</code>, then re-run <code>fde dashboard</code>.</p>'

  // health meter segments - portfolio health as one glance
  const meter = ['red', 'amber', 'green'].map(k => {
    const n = counts[k === 'red' ? 'RED' : k]
    return n ? `<span class="seg ${k}" style="flex:${n}"></span>` : ''
  }).join('')
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  const html = [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="color-scheme" content="dark light">',
    '<title>FDE Fieldbook</title><style>' + dashStyles() + '</style></head><body>',
    '<div class="topbar"><div class="bar-inner">',
    `<div class="brand"><span class="logo"></span><span class="title">Fieldbook</span><span class="date">${escapeHtml(dateStr)}</span></div>`,
    engagements.length ? `<div class="health"><div class="meter">${meter}</div><span class="health-num">${counts.RED} red · ${counts.amber} amber · ${counts.green} green</span></div>` : '',
    '</div></div>',
    '<div class="wrap">',
    engagements.length ? '<div class="search-wrap"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><input id="q" class="search" placeholder="Search engagements   ( / to focus )"></div>' : '',
    today,
    engagements.length ? `<div class="section">Portfolio<span class="ct">${engagements.length}</span></div>` : '',
    engagements.length ? `<div class="rows">${rows}</div>` : emptyState,
    '</div>',
    `<footer>fdeops · a deterministic render of your <code>.fde/</code> memory - edit the markdown, re-run <code>fde dashboard</code>. The files stay the source of truth.</footer>`,
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
