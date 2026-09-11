'use strict'
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const paths = require('./install-paths')

const DEFAULTS = { view: 'current', context: 'standard', privacy: 'agent' }
const SETTINGS = [
  { key: 'view', title: 'What should your daily overview show?', options: [
    ['current', 'The client I am working on'], ['portfolio', 'All my clients'],
  ] },
  { key: 'context', title: 'How much context should your agent start with?', options: [
    ['standard', 'Standard (up to 16 KiB)'], ['compact', 'Compact (up to 4 KiB; retrieve details as needed)'],
  ] },
  { key: 'privacy', title: 'Where should common identifiers be masked?', options: [
    ['agent', 'Agent context; keep originals in my local reports'],
    ['reports', 'Agent context and newly generated Fieldbook/vault reports'],
  ] },
]
const QUESTIONS = [
  { key: 'work', title: 'How do you work?', options: [
    ['single', 'One client'], ['multiple', 'Several clients'], ['team', 'Leading a delivery team'],
  ] },
  { key: 'start', title: 'What would help you first?', options: [
    ['new', 'Starting an engagement'], ['daily', 'Continuing daily work'], ['takeover', 'Taking over existing work'],
  ] },
  { key: 'masking', title: 'What should FDEOps hide before sharing context with your agent?', options: [
    ['standard', 'Common identifiers and secrets'], ['custom', 'Those, plus names and terms I specify'],
  ] },
]
const PROFILE_DEFAULTS = { work: 'single', start: 'daily', masking: 'standard', terms: [] }
const LIMITS = 'Both choices hide marked private content. Masking reduces exposure; it does not guarantee anonymity or permission to share client data. Raw file tools, pasted chat and other tools can bypass it. AI-provider settings are unchanged.'
function validateTerms(terms) {
  if (!Array.isArray(terms) || terms.length > 100 || terms.some(t => typeof t !== 'string' || t.length < 2 || t.length > 128 || t !== t.trim() || /[\r\n\x00-\x1f]|\[\[|\]\]/.test(t))) {
    throw new Error('Use up to 100 names or terms, one per line, each 2-128 characters; control characters and alias markers are not allowed.')
  }
  return [...new Set(terms)]
}
function validate(value) {
  const keys = value && Object.keys(value)
  const personal = value && Object.hasOwn(value, 'work')
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      keys.length !== (personal ? 7 : 3) ||
      (personal ? SETTINGS.concat(QUESTIONS) : SETTINGS).some(q => !q.options.some(([v]) => value[q.key] === v))) {
    throw new Error('Invalid setup choices; run fde setup to see the supported options.')
  }
  if (personal) {
    validateTerms(value.terms)
    if (value.masking === 'custom' && !value.terms.length) throw new Error('Custom masking needs at least one name or term.')
  }
  return value
}
function readTerms(file) {
  let fd
  try {
    paths.checkPath(file)
    fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK)
    const st = fs.fstatSync(fd)
    if (!st.isFile() || st.nlink !== 1 || st.size > 65536) throw new Error('unsafe')
    const terms = validateTerms(fs.readFileSync(fd, 'utf8').split(/\r?\n/).map(t => t.trim()).filter(Boolean))
    if (!terms.length) throw new Error('empty')
    return terms
  } catch (_) { throw new Error('Cannot load custom terms. Use an ordinary local UTF-8 file with 1-100 terms, one per line, each 2-128 characters.') }
  finally { if (fd !== undefined) fs.closeSync(fd) }
}
function nextStep(value) {
  const start = {
    new: 'Clarify the client problem, one measurable outcome, and who will accept it. Start with land.',
    daily: 'Resume the current client and choose one action from the existing blockers. Start with triage.',
    takeover: 'Check the existing evidence, open risks and previous commitments before changing anything. Start with audit.',
  }
  return (start[value.start] || '') + (value.work === 'team' ? ' Make responsibility and handoff clear; do not assume shared access or synchronization.' : '')
}
function createSetup(root) {
  const file = path.join(root, '.preferences.json')
  function read() {
    let fd
    try {
      paths.checkPath(file)
      fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK)
      const st = fs.fstatSync(fd)
      if (!st.isFile() || st.nlink !== 1 || st.size > 65536 || (process.platform !== 'win32' && (st.mode & 0o077))) throw new Error('unsafe')
      return validate(JSON.parse(fs.readFileSync(fd, 'utf8')))
    } catch (e) {
      if (e.code === 'ENOENT') return null
      throw new Error('Cannot read setup safely. Check .preferences.json in your engagements folder; no settings were changed.')
    } finally { if (fd !== undefined) fs.closeSync(fd) }
  }
  function save(value) {
    validate(value)
    paths.mkdir(root)
    paths.checkPath(file)
    const temporary = path.join(root, `.preferences-${crypto.randomBytes(12).toString('hex')}.tmp`)
    try {
      fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
      paths.checkPath(file)
      fs.renameSync(temporary, file)
    } finally { try { fs.unlinkSync(temporary) } catch (_) {} }
  }
  return { read, save }
}
function describe(value, questions = QUESTIONS) {
  return questions.map(q => `${q.title} ${q.options.find(([v]) => v === value[q.key])[1]}`).join('\n')
}
function saveAnswers(store, choices, questions, termsFile) {
  const saved = store.read(), current = saved || DEFAULTS
  if (questions.some(q => !q.options.some(([v]) => choices[q.key] === v)) || Object.keys(choices).length !== questions.length) throw new Error('Supply one valid answer for each question.')
  let result
  if (questions === SETTINGS) result = { ...current, ...choices }
  else {
    if (termsFile && choices.masking !== 'custom') throw new Error('A terms file requires custom masking.')
    const terms = termsFile ? readTerms(termsFile) : current.terms || []
    result = { ...current, ...choices, terms, view: !saved || (saved.work && saved.work !== choices.work) ? (choices.work === 'multiple' ? 'portfolio' : 'current') : saved.view }
  }
  store.save(result)
  return result
}
function command(store, args) {
  if (args.length === 1 && args[0] === '--show') {
    const saved = store.read(), { terms, ...safe } = saved || DEFAULTS
    console.log(JSON.stringify({ configured: !!saved, ...safe, ...(terms ? { termCount: terms.length, nextStep: nextStep(saved) } : {}) }))
    return
  }
  if (args.length && !(args.length === 1 && args[0] === '--settings')) {
    const choices = {}, rest = args.filter(a => a !== '--save')
    let termsFile
    if (args.filter(a => a === '--save').length !== 1) throw new Error('Use fde setup, or supply all three answers with --save.')
    for (let i = 0; i < rest.length; i += 2) {
      const key = rest[i].replace(/^--/, '')
      if (key === 'terms-file' && !termsFile && rest[i + 1]) { termsFile = rest[i + 1]; continue }
      if (!rest[i].startsWith('--') || !SETTINGS.concat(QUESTIONS).some(q => q.key === key) || Object.hasOwn(choices, key)) throw new Error('Unknown or repeated setup option.')
      choices[key] = rest[i + 1]
    }
    const questions = Object.hasOwn(choices, 'work') ? QUESTIONS : SETTINGS
    if (termsFile && questions === SETTINGS) throw new Error('Use personal setup to change custom terms.')
    const result = saveAnswers(store, choices, questions, termsFile)
    console.log('Setup saved locally. Change it anytime with fde setup.\n' + describe(result, questions) + '\n' + nextStep(result) + '\n' + LIMITS)
    return
  }
  const questions = args[0] === '--settings' ? SETTINGS : QUESTIONS
  if (process.stdin.isTTY && process.stdout.isTTY) return interactive(store, questions)
  console.log('SETUP: ask these three questions together. No settings have been changed.')
  for (const [i, q] of questions.entries()) console.log(`${i + 1}. ${q.title}\n` + q.options.map(([value, label]) => `   ${value}: ${label}`).join('\n'))
  console.log(LIMITS)
  console.log(questions === QUESTIONS
    ? 'After answers: fde setup --work single|multiple|team --start new|daily|takeover --masking standard|custom [--terms-file LOCAL_FILE] --save\nFor custom masking, enter names locally with fde setup, or provide a local terms-file path; do not ask to paste sensitive names into chat. Existing terms are kept unless a replacement file is supplied.'
    : 'Save settings: fde setup --view current|portfolio --context standard|compact --privacy agent|reports --save')
  console.log('fde setup --show shows choices and term count only. fde setup --settings changes display and context options.')
}
async function interactive(store, questions) {
  const emit = text => fs.writeSync(1, text)
  const current = { ...PROFILE_DEFAULTS, ...(store.read() || DEFAULTS) }, choices = {}
  const rl = require('node:readline').createInterface({ input: process.stdin, terminal: false })
  const lines = rl[Symbol.asyncIterator]()
  try {
    emit('Make FDEOps fit your work. Enter keeps the current choice. Ctrl-C cancels.\n' + LIMITS + '\n')
    for (const q of questions) {
      const selected = q.options.findIndex(([v]) => v === current[q.key])
      while (true) {
        emit(q.title + '\n' + q.options.map(([, label], i) => `  ${i + 1}. ${label}${i === selected ? ' (current)' : ''}`).join('\n') + '\n> ')
        const next = await lines.next()
        if (next.done) { emit('\nCancelled; nothing saved.\n'); return }
        const value = next.value.trim(), index = value === '' ? selected : /^[123]$/.test(value) ? Number(value) - 1 : -1
        if (index >= 0 && index < q.options.length) { choices[q.key] = q.options[index][0]; break }
        emit('Choose a listed number, or press Enter.\n')
      }
    }
    let terms = current.terms
    if (choices.masking === 'custom') {
      emit(`Names or terms to hide, one per line; finish with an empty line. Enter alone keeps ${terms.length} saved terms. This input stays local.\n`)
      const entered = []
      while (true) {
        const next = await lines.next()
        if (next.done) { emit('\nCancelled; nothing saved.\n'); return }
        if (!next.value.trim()) break
        entered.push(next.value.trim())
        validateTerms(entered)
      }
      terms = entered.length ? validateTerms(entered) : terms
      if (!terms.length) throw new Error('Custom masking needs at least one term; nothing saved.')
    }
    const saved = store.read()
    const result = questions === SETTINGS ? { ...(saved || DEFAULTS), ...choices }
      : { ...(saved || DEFAULTS), ...choices, terms, view: !saved || (saved.work && saved.work !== choices.work) ? (choices.work === 'multiple' ? 'portfolio' : 'current') : saved.view }
    emit('\n' + describe(result, questions) + (choices.masking === 'custom' ? `\n${terms.length} custom terms ready to save locally.` : '') + '\nSave these choices? [y/N] ')
    const next = await lines.next()
    if (!next.done && /^y(es)?$/i.test(next.value.trim())) { store.save(result); emit('\nSetup saved. Change it anytime with fde setup.\n' + nextStep(result) + '\n') }
    else emit('\nCancelled; nothing saved.\n')
  } finally { rl.close() }
}
module.exports = { createSetup, command, DEFAULTS, nextStep }
