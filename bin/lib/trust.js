'use strict'

function createTrustApi(deps) {
  const {
    fs, path, readClean, readEng, parseMdTable, sectionBody, SIGNAL_LEDGER, memoryDirtyManual,
    stripTemplateNoise, stripLegendLines, extractRisks, maskDisplay = text => text,
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

  // Event labels are not people. "INCIDENT: … Marcus escalated" must key on
  // Marcus, or a recovered engagement stays RED in front of the sponsor.
  const SIGNAL_EVENT_KEYS = new Set([
    'incident', 'recovery', 'alert', 'update', 'note', 'status', 'escalation',
    'blocker', 'outage', 'fire', 'issue', 'sev', 'sev1', 'sev2', 'p1', 'p2', 'p3',
    'resolved', 'risk', 'decision', 'delivery', 'contact',
  ])
  // Articles and weekdays are not people. "the finance controller…" and
  // "Friday's readout" must key on the role/name, not the filler word.
  const SIGNAL_NAME_NOISE = new Set([
    'the', 'a', 'an', 'and', 'or', 'for', 'from', 'with', 'without', 'this', 'that',
    'these', 'those', 'their', 'our',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'today', 'tomorrow', 'yesterday', 'tonight',
  ])

  function isSignalNameNoise(word) {
    const n = String(word || '').replace(/[^a-z0-9]/gi, '').toLowerCase()
    if (SIGNAL_NAME_NOISE.has(n)) return true
    // "Friday's" → fridays after stripping punctuation
    if (n.endsWith('s') && SIGNAL_NAME_NOISE.has(n.slice(0, -1))) return true
    return false
  }

  function personFromSignalText(text) {
    let cleaned = String(text || '')
      .replace(/\[@[^\]]+\]/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\[signal:[^\]]+\]/gi, '')
      .replace(/\[\d{4}-\d{2}-\d{2}\]/g, '')
      .replace(/^([A-Z]{2,}[A-Z0-9_-]*):\s+/, '')
      .trim()
    const names = cleaned.match(/\b[A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20})?\b/g) || []
    for (const name of names) {
      const first = name.split(/\s+/)[0].toLowerCase()
      if (SIGNAL_EVENT_KEYS.has(first) || isSignalNameNoise(first) || isSignalNameNoise(name)) continue
      return name
    }
    const acronyms = cleaned.match(/\b[A-Z]{3,6}\b/g) || []
    for (const acronym of acronyms) {
      if (SIGNAL_EVENT_KEYS.has(acronym.toLowerCase()) || isSignalNameNoise(acronym)) continue
      return acronym
    }
    return ''
  }

  // Subject key for a signal-history line. Prefer a proper name in the bullet.
  // A green about Randy must not clear an amber about Denise.
  // Strip author tags [@email-local] so attribution never becomes the subject key.
  function signalSubjectKey(text) {
    const person = personFromSignalText(text)
    if (person) {
      const frag = person.split(/\s+/)[0].replace(/[^a-z0-9]/gi, '').toLowerCase()
      if (frag.length >= 3) return frag
    }
    const cleaned = String(text).replace(/\[@[^\]]+\]/g, '').replace(/\([^)]*\)/g, '')
      .replace(/^([A-Z]{2,}[A-Z0-9_-]*):\s+/, '')
    const words = cleaned.split(/\s+/).filter(w => {
      const n = w.replace(/[^a-z0-9]/gi, '').toLowerCase()
      return n.length >= 3 && !SIGNAL_EVENT_KEYS.has(n) && !isSignalNameNoise(n)
        && !/^(dr|mr|mrs|ms)$/i.test(w)
    })
    const frag = (words[0] || '').replace(/[^a-z0-9]/gi, '').toLowerCase()
    return frag.length >= 3 ? frag : ('anon:' + cleaned.slice(0, 48).toLowerCase())
  }

  function parsePhase(ctx) {
    // Template ships "**Phase:** land | discover | ..." - that is UNSET, not land.
    const m = ctx.match(/\*\*Phase:\*\*\s*(.+)/i) || ctx.match(/^phase[:\s*]+(.+)$/im)
    if (!m) return '?'
    const raw = m[1].replace(/\*/g, '').trim()
    if (!raw || /\|/.test(raw) || /^unset$/i.test(raw) || /^[\[(]/.test(raw)) return '?'
    const one = raw.toLowerCase().match(/^(land|discover|plan|build|ship|prove|outcome|close)\b/)
    if (!one) return '?'
    if (one[1] === 'build') return 'ship'
    if (one[1] === 'prove') return 'outcome'
    return one[1]
  }

  function countOpenRisks(eng) {
    return extractRisks(eng).length
  }

  function nextActionLine(ctx) {
    // lastNonEmpty: template ships an empty ## Next action; agents often append a
    // second heading with the real bullet - first-match would report "(none set)".
    const body = sectionBody(ctx, 'Next action', { lastNonEmpty: true })
    for (const raw of body.split('\n')) {
      const t = raw.trim().replace(/^[-*]\s+/, '')
      if (t) return maskDisplay(t).slice(0, 120)
    }
    return ''
  }

  function computeSignals(eng) {
    // readClean, not readEng: status/dashboard echo topRisk and stakeholder lines
    // to the terminal and the rendered HTML - a <private> risk must never surface.
    const ctx = readClean(eng, 'context.md'); const stake = readClean(eng, 'stakeholders.md')
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
      trustReason = maskDisplay(worst.text || '').slice(0, 80)
      if (worst.date) {
        signalAge = Math.max(0, Math.floor((Date.now() - Date.parse(worst.date)) / 86400000))
        stale = signalAge > 21
      }
    } else {
      // No structured signal anywhere. Prose still gets to raise an alarm - a
      // written "gone quiet" is worth an amber - but it never earns a green:
      // green must mean somebody was asked and said they were fine, and a day-1
      // template calling someone a "champion" is not that. That reads `new`.
      const sLines = stripLegendLines(stripTemplateNoise(stake)).split('\n')
        .filter(l => !(/green/i.test(l) && /red|amber/i.test(l)))
      trust = sLines.some(l => /\bred\b/i.test(l)) ? 'RED'
        : sLines.some(l => /amber|gone quiet|routing around|escalat/i.test(l)) ? 'amber' : 'new'
    }
    const topRisk = maskDisplay((extractRisks(eng)[0]?.text || '').replace(/\s+/g, ' ').trim()).slice(0, 80)
    // Prefer trust trigger / memory warn over a random risk line; always keep mem.warn available
    const reason = (trustReason || mem.warn) ? (trustReason || mem.warn) : topRisk
    // What the triage line is actually quoting. A risk bullet printed under
    // "trust:" read as a stakeholder problem that did not exist.
    const reasonKind = mem.warn && trustReason === mem.warn ? 'memory' : trustReason ? 'trust' : mem.warn ? 'memory' : topRisk ? 'risk' : ''
    const openRisks = countOpenRisks(eng)
    const nextAction = nextActionLine(ctx)
    let updated = 'never', ageDays = Infinity
    try {
      ageDays = Math.floor((Date.now() - fs.statSync(path.join(eng, 'context.md')).mtimeMs) / 86400000)
      updated = ageDays === 0 ? 'today' : `${ageDays}d ago`
    } catch (_) {}
    const dirty = memoryDirtyManual(eng)
    return {
      phase, trust, signalAge, stale, topRisk, reason, reasonKind, memoryWarn: mem.warn,
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
    if (s.reason && s.reasonKind !== 'memory') {
      const age = s.reasonKind === 'trust' && s.signalAge != null ? ` (${s.signalAge}d old${s.stale ? ', STALE - reconfirm' : ''})` : ''
      lines.push(`  ${s.reasonKind === 'risk' ? 'top risk' : 'trust'}: ${s.reason}${age}`)
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
    personFromSignalText,
    signalSubjectKey,
    isSignalNameNoise,
    parsePhase,
    countOpenRisks,
    nextActionLine,
    computeSignals,
    resumeTriage,
  }
}

module.exports = { createTrustApi }
