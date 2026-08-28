'use strict'

function createTrustApi(deps) {
  const {
    fs, path, readClean, readEng, parseMdTable, sectionBody, SIGNAL_LEDGER, memoryDirtyManual,
  } = deps

  // phase / trust / top risk / freshness - identical heuristic for status + dashboard.
  // Trust resolution: structured [signal:red|amber|green] tokens in stakeholders.md
  // (written by `fde log contact --signal` and `fde debrief`) win - the latest dated
  // one. Older than 21 days → stale: shown with a "?" marker + age so a forgotten
  // signal never silently drives triage. The keyword grep survives only as the
  // zero-effort floor when NO token exists anywhere - prose like "escalated to CTO,
  // resolved amicably" must not flip a client amber forever.
  function stakeholdersMemoryHealth(eng) {
    // Hostile handoff: binary / unparseable stakeholders must not read as healthy green.
    let buf
    const abs = path.join(eng, 'stakeholders.md')
    // Regular files only - opening a fifo here blocked status/triage/doctor
    // forever. doctor reports the shape separately.
    try { if (!fs.lstatSync(abs).isFile()) return { ok: true, warn: '' } } catch (_) {
      return { ok: true, warn: '' }
    }
    try { buf = fs.readFileSync(abs) } catch (_) {
      return { ok: true, warn: '' }
    }
    if (buf.includes(0)) {
      return { ok: false, warn: 'memory unreadable - verify (binary data in stakeholders.md)' }
    }
    const md = buf.toString('utf8')
    const ledger = readEng(eng, SIGNAL_LEDGER)
    if (/\[signal:(red|amber|green)\]/i.test(md + '\n' + ledger)) {
      return { ok: true, warn: '' }
    }
    const trustLine = md.match(/\*\*Trust:\*\*\s*([A-Za-z?]+)/i)
    if (trustLine && !/^(red|amber|green)$/i.test(trustLine[1])) {
      return { ok: false, warn: 'memory unreadable - verify (invalid trust value)' }
    }
    const table = parseMdTable(md)
    const meaningful = md.split('\n').filter(l => {
      const t = l.trim()
      return t && !t.startsWith('#') && !t.startsWith('<!--') && !/^\|?\s*:?-{3,}/.test(t)
    }).length
    // Content present but no table and no structured signal → do not invent "green"
    if (meaningful >= 3 && !table) {
      return { ok: false, warn: 'memory unreadable - verify (stakeholders.md unparseable)' }
    }
    return { ok: true, warn: '' }
  }

  // Subject key for a signal-history line - first real name word (same spirit as
  // extractStakeholders). A green about Randy must not clear an amber about Denise.
  // Strip author tags [@email-local] so attribution never becomes the subject key.
  function signalSubjectKey(text) {
    const cleaned = String(text).replace(/\[@[^\]]+\]/g, '').replace(/\([^)]*\)/g, '')
    const words = cleaned.split(/\s+/).filter(w => w && !/^(dr|mr|mrs|ms)\.?$/i.test(w))
    const frag = (words[0] || '').replace(/[^a-z0-9]/gi, '').toLowerCase()
    return frag.length >= 3 ? frag : ('anon:' + cleaned.slice(0, 48).toLowerCase())
  }

  function parsePhase(ctx) {
    // Template ships "**Phase:** land | discover | ..." - that is UNSET, not land.
    const m = ctx.match(/\*\*Phase:\*\*\s*(.+)/i) || ctx.match(/^phase[:\s*]+(.+)$/im)
    if (!m) return '?'
    const raw = m[1].replace(/\*/g, '').trim()
    if (!raw || /\|/.test(raw) || /^unset$/i.test(raw) || /^[\[(]/.test(raw)) return '?'
    const one = raw.toLowerCase().match(/^(land|discover|plan|build|ship|prove|close)\b/)
    if (!one) return '?'
    return one[1] === 'build' ? 'ship' : one[1]
  }

  function countOpenRisks(eng) {
    const md = readClean(eng, 'risks.md')
    const body = md.split(/^#{1,6}\s+Retired\b/im)[0] || md
    let n = 0
    for (const raw of body.split('\n')) {
      const t = raw.trim()
      if (!t || t.startsWith('<!--') || /^#{1,6}\s/.test(t)) continue
      if (/risk\s*\|\s*status|mitigation/i.test(t) || /^\|?[\s|:-]+$/.test(t)) continue
      // Bullet risk with substance (skip empty "- " stubs). The bullet marker
      // must be followed by space: "**Status:** open · closed" is a legend, and
      // counting it as a risk reported one open risk on an empty register.
      if (/^[-*]\s/.test(t)) {
        if (t.replace(/^[-*]\s+/, '').trim()) n++
        continue
      }
      // Table row: first cell must have risk text (day-1 "| | open | |" placeholders don't count).
      if (/^\|/.test(t) && t.length > 12) {
        const riskCell = t.split('|').map(c => c.trim())[1] || ''
        if (riskCell) n++
      }
    }
    return n
  }

  function nextActionLine(ctx) {
    // lastNonEmpty: template ships an empty ## Next action; agents often append a
    // second heading with the real bullet — first-match would report "(none set)".
    const body = sectionBody(ctx, 'Next action', { lastNonEmpty: true })
    for (const raw of body.split('\n')) {
      const t = raw.trim().replace(/^[-*]\s+/, '')
      if (t) return t.slice(0, 120)
    }
    return ''
  }

  function computeSignals(eng) {
    // readClean, not readEng: status/dashboard echo topRisk and stakeholder lines
    // to the terminal and the rendered HTML - a <private> risk must never surface.
    const ctx = readClean(eng, 'context.md'); const stake = readClean(eng, 'stakeholders.md'); const risks = readClean(eng, 'risks.md')
    // Prefer structured tokens from stakeholders + CLI ledger (ledger survives wipes)
    const signalText = stake + '\n' + readClean(eng, SIGNAL_LEDGER)
    const phase = parsePhase(ctx)
    // Latest signal PER stakeholder, then worst-of those actives.
    // Global "latest wins" let a green from person B hide a sponsor crisis on A.
    const byPerson = new Map()
    for (const l of signalText.split('\n')) {
      const sm = l.match(/\[signal:(red|amber|green)\]/i)
      if (!sm) continue
      const date = (l.match(/\[(\d{4}-\d{2}-\d{2})\]/) || [])[1] || ''
      const text = l.replace(/^\s*-\s*/, '')
        .replace(/\[signal:(red|amber|green)\]/i, '')
        .replace(/\[\d{4}-\d{2}-\d{2}\]/, '')
        .replace(/\[@[^\]]+\]/g, '')
        .trim()
      const key = signalSubjectKey(text)
      const prev = byPerson.get(key)
      if (!prev || date >= prev.date) byPerson.set(key, { date, sig: sm[1].toLowerCase(), text })
    }
    const RANK = { red: 0, amber: 1, green: 2 }
    let worst = null
    for (const s of byPerson.values()) {
      if (!worst || RANK[s.sig] < RANK[worst.sig] || (RANK[s.sig] === RANK[worst.sig] && s.date >= worst.date)) {
        worst = s
      }
    }
    const mem = stakeholdersMemoryHealth(eng)
    let trust, signalAge = null, stale = false, trustReason = ''
    if (!mem.ok && !worst) {
      trust = 'amber'
      trustReason = mem.warn
    } else if (worst) {
      trust = worst.sig === 'red' ? 'RED' : worst.sig
      trustReason = (worst.text || '').slice(0, 80)
      if (worst.date) {
        signalAge = Math.max(0, Math.floor((Date.now() - Date.parse(worst.date)) / 86400000))
        stale = signalAge > 21
      }
    } else {
      const sLines = stake.split('\n').filter(l => !(/green/i.test(l) && /red|amber/i.test(l)))
      trust = sLines.some(l => /\bred\b/i.test(l)) ? 'RED'
        : sLines.some(l => /amber|gone quiet|routing around|escalat/i.test(l)) ? 'amber' : 'green'
    }
    const topRisk = (risks.split('\n').find(l => {
      const t = l.trim()
      return /^[-|]/.test(t) && t.length > 20 && !/^\|?[-\s|]+$/.test(t) &&
        !/risk\s*\|\s*status|mitigation/i.test(t) && !t.startsWith('<!--')
    }) || '').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
    // Prefer trust trigger / memory warn over a random risk line; always keep mem.warn available
    const reason = (trustReason || mem.warn) ? (trustReason || mem.warn) : topRisk
    const openRisks = countOpenRisks(eng)
    const nextAction = nextActionLine(ctx)
    let updated = 'never', ageDays = Infinity
    try {
      ageDays = Math.floor((Date.now() - fs.statSync(path.join(eng, 'context.md')).mtimeMs) / 86400000)
      updated = ageDays === 0 ? 'today' : `${ageDays}d ago`
    } catch (_) {}
    const dirty = memoryDirtyManual(eng)
    return {
      phase, trust, signalAge, stale, topRisk, reason, memoryWarn: mem.warn,
      dirtyFiles: dirty, openRisks, nextAction, updated, ageDays,
    }
  }

  function resumeTriage(eng) {
    const s = computeSignals(eng)
    const label = s.trust + (s.stale ? '?' : '')
    const phase = s.phase === '?' ? 'unset' : s.phase
    const lines = [
      `TRIAGE  [${label.padEnd(6)}]  phase:${phase}  updated:${s.updated}  open risks:${s.openRisks}`,
    ]
    if (s.reason) {
      const age = s.signalAge != null ? ` (${s.signalAge}d old${s.stale ? ', STALE - reconfirm' : ''})` : ''
      lines.push(`  trust: ${s.reason}${age}`)
    }
    // Always surface corruption / unreadable memory - even when trust still reads green
    if (s.memoryWarn) lines.push(`  memory: ${s.memoryWarn}`)
    if (s.dirtyFiles && s.dirtyFiles.length) {
      lines.push(`  ⚠ memory dirty (uncommitted manual edits): ${s.dirtyFiles.slice(0, 5).join(', ')}${s.dirtyFiles.length > 5 ? '…' : ''}`)
      lines.push('    review before relying on the ledger - fde writes will not auto-commit these')
    }
    if (s.nextAction) lines.push(`  next: ${s.nextAction}`)
    else lines.push('  next: (none set - add under ## Next action in context.md)')
    return lines.join('\n')
  }

  return {
    stakeholdersMemoryHealth,
    signalSubjectKey,
    parsePhase,
    countOpenRisks,
    nextActionLine,
    computeSignals,
    resumeTriage,
  }
}

module.exports = { createTrustApi }
