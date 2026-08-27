'use strict'

// Derived Obsidian view of the fieldbook. Pure builders: in comes already-redacted
// engagement data, out comes a list of { rel, content } files. No fs, no network.
//
// Two rules this file exists to keep:
//   1. `.fde/` stays the only source of truth. Nothing here is ever parsed back,
//      so an FDE can edit the vault, delete it, or ignore it with no consequence.
//   2. The vault is an output of the CLI, so <private> blocks are already gone
//      before anything reaches these builders (callers use readClean). `redacted`
//      goes further and drops the political layer for a shared screen.

const FORMAT = 1
const STAMP = '.fdeops-vault'

// Obsidian resolves [[links]] by note name, and | # ^ [ ] break the link syntax.
// A client called "Acme | EU" must still get a reachable page.
function safeTitle(s) {
  return String(s || '')
    .replace(/[[\]|#^\\/:*?"<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'untitled'
}

function cell(s) {
  return String(s || '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim()
}

function yamlStr(s) {
  return `"${String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

// Frontmatter is what makes the vault queryable (Obsidian properties, Dataview,
// Bases). It exists only in generated files - the authoritative .fde/ markdown
// stays plain, so a client can read it without a tool.
function frontmatter(fields) {
  const lines = ['---']
  for (const [k, v] of Object.entries(fields)) {
    if (v == null || v === '') continue
    if (Array.isArray(v)) {
      if (!v.length) continue
      lines.push(`${k}:`)
      v.forEach(item => lines.push(`  - ${yamlStr(item)}`))
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      lines.push(`${k}: ${v}`)
    } else {
      lines.push(`${k}: ${yamlStr(v)}`)
    }
  }
  lines.push('---', '')
  return lines.join('\n')
}

function trustWord(trust) {
  return String(trust || '').toLowerCase() === 'red' ? 'red' : String(trust || '')
}

// A signal token is internal shorthand; the sponsor view keeps the fact and
// drops the grading.
function stripInternalTokens(text) {
  return String(text || '')
    .replace(/\[signal:(red|amber|green)\]/gi, '')
    .replace(/\[@[^\]]+\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function sectionPage({ eng, title, body, kind, redacted, today }) {
  return frontmatter({
    client: eng.name,
    fde_page: kind,
    phase: eng.signals.phase === '?' ? '' : eng.signals.phase,
    generated: today,
    tags: ['fdeops', `fdeops/${kind}`],
  }) + `# ${safeTitle(eng.name)} - ${title}\n\n` +
    `Engagement: [[${safeTitle(eng.name)}]]\n\n` +
    (body.trim() ? body.trim() + '\n' : `*(nothing recorded yet)*\n`) +
    `\n---\n*Generated from \`${eng.name}/.fde/${kind}.md\`${redacted ? ' - sponsor-safe copy' : ''}. Edit the fieldbook, not this page.*\n`
}

function personPage({ eng, person, today }) {
  return frontmatter({
    client: eng.name,
    fde_page: 'person',
    role: person.role,
    signal: person.signal,
    generated: today,
    tags: ['fdeops', 'fdeops/person', `fdeops/signal/${person.signal || 'unknown'}`],
  }) + `# ${safeTitle(person.name)}\n\n` +
    `${person.role ? `**Role:** ${person.role}  \n` : ''}` +
    `**Latest signal:** ${person.signal || 'unrecorded'}\n\n` +
    (person.note ? `${person.note}\n\n` : '') +
    `Engagement: [[${safeTitle(eng.name)}]]\n`
}

function hubPage({ eng, today, redacted }) {
  const s = eng.signals
  const links = [
    ['Decisions', 'decisions'],
    ['Risks', 'risks'],
    ['Delivery', 'delivery'],
    ...(redacted ? [] : [['Stakeholders', 'stakeholders']]),
    ['Terrain', 'terrain'],
    ['Success', 'success'],
    ...(redacted ? [] : [['Trust profile', 'trust-profile']]),
  ].filter(([, kind]) => eng.pages[kind] != null)

  const timeline = (redacted ? eng.log.filter(e => e.kind !== 'note') : eng.log)
    .map(e => `- **${e.date}** ${cell(redacted ? stripInternalTokens(e.text) : e.text)}${e.sig && !redacted ? ` \`[${e.sig}]\`` : ''}`)

  const people = redacted ? [] : eng.stakeholders.map(p =>
    `- [[${safeTitle(eng.name)}/People/${safeTitle(p.name)}|${safeTitle(p.name)}]]${p.role ? ` - ${cell(p.role)}` : ''} \`${p.signal || 'unrecorded'}\``)

  return frontmatter({
    client: eng.name,
    fde_page: 'engagement',
    phase: s.phase === '?' ? '' : s.phase,
    ...(redacted ? {} : { trust: trustWord(s.trust), signal_age_days: s.signalAge == null ? '' : s.signalAge, signal_stale: !!s.stale }),
    open_risks: s.openRisks,
    days_elapsed: eng.days == null ? '' : eng.days,
    last_updated: s.updated,
    overlay: eng.overlay || '',
    generated: today,
    tags: ['fdeops', 'fdeops/engagement', ...(redacted ? [] : [`fdeops/trust/${trustWord(s.trust) || 'unknown'}`])],
  }) + [
    `# ${safeTitle(eng.name)}`,
    '',
    `**Phase:** ${s.phase === '?' ? 'unset' : s.phase}` +
      (redacted ? '' : `  ·  **Trust:** ${trustWord(s.trust)}${s.stale ? ' (signal stale - reconfirm)' : ''}`) +
      `  ·  **Open risks:** ${s.openRisks}  ·  **Updated:** ${s.updated}`,
    '',
    '## Next action',
    '',
    eng.next ? eng.next : '*(none recorded - `fde log`/`@fde` writes one)*',
    '',
    ...(eng.brief ? ['## Brief', '', eng.brief, ''] : []),
    ...(eng.reality ? ['## Reality', '', eng.reality, ''] : []),
    '## The record',
    '',
    ...links.map(([label, kind]) => `- [[${safeTitle(eng.name)}/${label}|${label}]]`),
    '',
    ...(people.length ? ['## People', '', ...people, ''] : []),
    ...(timeline.length ? ['## Timeline', '', ...timeline, ''] : []),
    '---',
    `*Derived from \`${eng.name}/.fde/\` on ${today}. Regenerate with \`fde vault${redacted ? ' --redacted' : ''}\`.*`,
    '',
  ].join('\n')
}

function portfolioPage({ engagements, today, redacted }) {
  const order = { RED: 0, amber: 1, green: 2 }
  const rows = [...engagements].sort((a, b) =>
    (order[a.signals.trust] ?? 3) - (order[b.signals.trust] ?? 3) || a.name.localeCompare(b.name))

  const head = redacted
    ? ['| Engagement | Phase | Open risks | Next action |', '|---|---|---|---|']
    : ['| Engagement | Phase | Trust | Open risks | Updated | Next action |', '|---|---|---|---|---|---|']

  const body = rows.map(e => {
    const link = `[[${safeTitle(e.name)}]]`
    const phase = e.signals.phase === '?' ? 'unset' : e.signals.phase
    const next = cell(e.next) || '-'
    return redacted
      ? `| ${link} | ${phase} | ${e.signals.openRisks} | ${next} |`
      : `| ${link} | ${phase} | ${trustWord(e.signals.trust)}${e.signals.stale ? '?' : ''} | ${e.signals.openRisks} | ${cell(e.signals.updated)} | ${next} |`
  })

  return frontmatter({
    fde_page: 'portfolio',
    engagements: rows.length,
    generated: today,
    tags: ['fdeops', 'fdeops/portfolio'],
  }) + [
    '# Portfolio',
    '',
    rows.length
      ? `${rows.length} engagement${rows.length === 1 ? '' : 's'}${redacted ? '' : ', worst trust first'}.`
      : 'No engagements yet - `fde resume --init <name>`.',
    '',
    ...(rows.length ? [...head, ...body, ''] : []),
    ...(redacted ? [] : ['See [[Questions]] for what the record is missing.', '']),
  ].join('\n')
}

// Deterministic answers, computed here rather than shipped as Dataview queries:
// the vault must work in a stock Obsidian with no plugins installed.
function questionsPage({ engagements, today }) {
  const quiet = engagements.filter(e => e.signals.ageDays !== Infinity && e.signals.ageDays >= 14)
  const staleSignal = engagements.filter(e => e.signals.stale)
  const noNext = engagements.filter(e => !e.next)
  const unaccepted = []
  const noSignal = []
  for (const e of engagements) {
    for (const row of e.valueRows || []) {
      if (!row.acceptedBy) unaccepted.push({ eng: e, row })
    }
    if (!e.stakeholders.length) noSignal.push(e)
  }

  const list = (items, empty) => items.length ? items : [`- ${empty}`]

  return frontmatter({
    fde_page: 'questions',
    generated: today,
    tags: ['fdeops', 'fdeops/questions'],
  }) + [
    '# Questions',
    '',
    'What the record cannot answer is the part worth reading. Recomputed on every `fde vault`.',
    '',
    '## Gone quiet (14+ days since a memory write)',
    '',
    ...list(quiet.map(e => `- [[${safeTitle(e.name)}]] - ${e.signals.updated}`), 'none'),
    '',
    '## Value promised but nobody accepted it',
    '',
    ...list(unaccepted.map(({ eng, row }) => `- [[${safeTitle(eng.name)}]] - ${cell(row.slice || row.promised || 'unnamed slice')}`),
      'none - every delivered slice names a customer-side acceptor'),
    '',
    '## Trust signal older than 21 days',
    '',
    ...list(staleSignal.map(e => `- [[${safeTitle(e.name)}]] - signal ${e.signals.signalAge}d old`), 'none'),
    '',
    '## No stakeholder signal at all',
    '',
    ...list(noSignal.map(e => `- [[${safeTitle(e.name)}]]`), 'none'),
    '',
    '## No next action recorded',
    '',
    ...list(noNext.map(e => `- [[${safeTitle(e.name)}]]`), 'none'),
    '',
    `Portfolio: [[Portfolio]]`,
    '',
  ].join('\n')
}

function readmePage({ engagements, today, redacted, engagementsRoot }) {
  return [
    '# FDEOps vault (generated - do not keep anything here)',
    '',
    `Generated ${today} from \`${engagementsRoot}\`. ${engagements.length} engagement${engagements.length === 1 ? '' : 's'}.`,
    '',
    'Open this folder as an Obsidian vault. Start at [[Portfolio]]' + (redacted ? '.' : ' and [[Questions]].'),
    '',
    '## What this is',
    '',
    '- A **derived** view. The fieldbook at `~/fde-engagements/<client>/.fde/` is the only source of truth.',
    '- **Disposable.** `fde vault` deletes and rebuilds this folder, so anything you type here is lost. Log to the fieldbook instead (`@fde` or `fde log`).',
    '- **Nothing is read back.** No plugin required, no sync, no network - plain markdown, wikilinks and frontmatter.',
    '',
    '## What is not here',
    '',
    '- `<private>` blocks. They never leave `.fde/`; every page here is built from redacted reads.',
    ...(redacted
      ? [
        '- Stakeholders, people pages, trust signals and `trust-profile.md` - this is the `--redacted` build, meant for a shared screen.',
        '- Internal `[signal:x]` and `[@owner]` tokens, and contact notes in the timeline.',
        '',
        '**Still check before you screen-share.** Redaction removes the political layer, not judgement: `decisions.md`, `risks.md` and `delivery.md` are shown as written.',
      ]
      : [
        '- Nothing else. This is the full working view, for your machine only. For a sponsor meeting run `fde vault --redacted`.',
      ]),
    '',
  ].join('\n')
}

function buildVaultFiles({ engagements, today, redacted = false, engagementsRoot = '~/fde-engagements', version = '' }) {
  const files = []
  const SECTIONS = [
    ['Decisions', 'decisions'],
    ['Risks', 'risks'],
    ['Delivery', 'delivery'],
    ['Stakeholders', 'stakeholders'],
    ['Terrain', 'terrain'],
    ['Success', 'success'],
    ['Trust profile', 'trust-profile'],
  ]
  const REDACTED_OUT = new Set(['stakeholders', 'trust-profile'])

  files.push({ rel: 'README.md', content: readmePage({ engagements, today, redacted, engagementsRoot }) })
  files.push({ rel: 'Portfolio.md', content: portfolioPage({ engagements, today, redacted }) })
  if (!redacted) files.push({ rel: 'Questions.md', content: questionsPage({ engagements, today }) })

  for (const eng of engagements) {
    const dir = safeTitle(eng.name)
    files.push({ rel: `${dir}/${dir}.md`, content: hubPage({ eng, today, redacted }) })
    for (const [title, kind] of SECTIONS) {
      if (redacted && REDACTED_OUT.has(kind)) continue
      const body = eng.pages[kind]
      if (body == null) continue
      files.push({
        rel: `${dir}/${title}.md`,
        content: sectionPage({ eng, title, body: redacted ? stripInternalTokens(body) : body, kind, redacted, today }),
      })
    }
    if (!redacted) {
      for (const person of eng.stakeholders) {
        files.push({ rel: `${dir}/People/${safeTitle(person.name)}.md`, content: personPage({ eng, person, today }) })
      }
    }
  }

  // A generated vault must not become a commit. `*` covers the whole tree, so a
  // vault written inside a repo checkout stays out of `git status` too.
  files.push({ rel: '.gitignore', content: '# generated by fde vault - never commit a client record\n*\n' })
  files.push({
    rel: STAMP,
    content: JSON.stringify({
      tool: 'fdeops', format: FORMAT, version, generated: today,
      mode: redacted ? 'redacted' : 'full', engagements: engagements.length,
      source: engagementsRoot,
      note: 'Written by `fde vault`. Deleted and rebuilt on every run - this file is how the CLI knows the folder is safe to replace.',
    }, null, 2) + '\n',
  })
  return files
}

module.exports = { buildVaultFiles, safeTitle, stripInternalTokens, frontmatter, STAMP, FORMAT }
