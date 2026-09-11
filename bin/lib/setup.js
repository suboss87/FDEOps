'use strict'
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const paths = require('./install-paths')

const DEFAULTS = { view: 'current', context: 'standard', privacy: 'agent' }
const QUESTIONS = [
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
const LIMITS = 'Both options hide <private> content. Masking covers common identifier formats, not all personal data. Names and sensitive prose need private marking. Your AI host controls provider transmission; setup does not change it. Existing exports are not rewritten.'
function validate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== 3 || QUESTIONS.some(q => !q.options.some(([v]) => value[q.key] === v))) {
    throw new Error('Invalid setup choices; run fde setup to see the supported options.')
  }
  return value
}
function createSetup(root) {
  const file = path.join(root, '.preferences.json')
  function read() {
    let fd
    try {
      paths.checkPath(file)
      fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK)
      const st = fs.fstatSync(fd)
      if (!st.isFile() || st.nlink !== 1 || st.size > 4096) throw new Error('unsafe')
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
function describe(value) {
  return QUESTIONS.map(q => `${q.title} ${q.options.find(([v]) => v === value[q.key])[1]}`).join('\n')
}
function command(store, args) {
  if (args.length === 1 && args[0] === '--show') {
    const saved = store.read()
    console.log(JSON.stringify({ configured: !!saved, ...(saved || DEFAULTS) }))
    return
  }
  if (args.length) {
    const choices = {}
    if (!args.includes('--save') || args.filter(a => a === '--save').length !== 1) throw new Error('Use fde setup, or supply all three choices with --save.')
    const rest = args.filter(a => a !== '--save')
    for (let i = 0; i < rest.length; i += 2) {
      const key = rest[i].replace(/^--/, '')
      if (!rest[i].startsWith('--') || !Object.hasOwn(DEFAULTS, key) || Object.hasOwn(choices, key)) throw new Error('Unknown or repeated setup option.')
      choices[key] = rest[i + 1]
    }
    validate(choices)
    store.save(choices)
    console.log('Setup saved for this engagements folder. Change it anytime with fde setup.\n' + describe(choices) + '\n' + LIMITS)
    return
  }
  if (process.stdin.isTTY && process.stdout.isTTY) return interactive(store)
  console.log('FIRST-USE SETUP: ask these three questions together, then save the answers. No settings have been changed.')
  for (const [i, q] of QUESTIONS.entries()) console.log(`${i + 1}. ${q.title}\n` + q.options.map(([value, label]) => `   ${value}: ${label}`).join('\n'))
  console.log(LIMITS + '\nAfter the user answers: fde setup --view current|portfolio --context standard|compact --privacy agent|reports --save\nUse fde setup --show to inspect existing choices. Never infer client policy from these preferences.')
}
async function interactive(store) {
  // Only static prompts and validated enum labels bypass buffered CLI output.
  const emit = text => fs.writeSync(1, text)
  const rl = require('node:readline').createInterface({ input: process.stdin, terminal: false })
  const lines = rl[Symbol.asyncIterator]()
  const current = store.read() || DEFAULTS, choices = {}
  try {
    emit('Make FDEOps fit your day. Three choices; Enter keeps the current choice. Ctrl-C cancels.\n' + LIMITS + '\n')
    for (const q of QUESTIONS) {
      const selected = q.options.findIndex(([v]) => v === current[q.key])
      while (true) {
        emit(q.title + '\n' + q.options.map(([, label], i) => `  ${i + 1}. ${label}${i === selected ? ' (current)' : ''}`).join('\n') + '\n> ')
        const next = await lines.next()
        if (next.done) { emit('\nSetup cancelled; nothing saved.\n'); return }
        const value = next.value.trim(), index = value === '' ? selected : /^[12]$/.test(value) ? Number(value) - 1 : -1
        if (index >= 0) { choices[q.key] = q.options[index][0]; break }
        emit('Choose 1 or 2, or press Enter.\n')
      }
    }
    emit('\n' + describe(choices) + '\nSave these settings? [y/N] ')
    const next = await lines.next()
    if (!next.done && /^y(es)?$/i.test(next.value.trim())) { store.save(choices); emit('\nSetup saved. Change it anytime with fde setup.\n') }
    else emit('\nSetup cancelled; nothing saved.\n')
  } finally { rl.close() }
}
module.exports = { createSetup, command, DEFAULTS }
