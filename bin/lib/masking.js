'use strict'

// Local pseudonyms, not anonymization. Recognized identifiers are replaced
// in output and proposals, and retained in a private reversible dictionary.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { StringDecoder } = require('node:string_decoder')
const ALIAS = /\[\[(email|phone|identifier|credential|term):[a-f0-9]{16}\]\]/g
const PATTERNS = [
  ['credential', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?(?:-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|$)/g],
  ['credential', /\b(?:AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g],
  ['credential', /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:]+:[^/\s@]+@[^\s<>"']+/gi],
  ['credential', /\bBearer\s+[A-Za-z0-9._-]{20,}/gi],
  ['credential', /\b(?:api[_-]?key|secret|password)\s*=\s*[^\s"']{8,}/gi],
  ['email', /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?){1,10}/g],
  ['identifier', /\b\d{3}-\d{2}-\d{4}\b/g],
  // Deliberately conservative: international + notation or explicit US shape.
  // Plain integers and dates are not reliably distinguishable from business data.
  ['phone', /(?<![\w])(?:\+\d{1,3}[ .-]?(?:\(\d{2,4}\)|\d{2,4})(?:[ .-]?\d){6,10}|\(\d{3}\)[ .-]?\d{3}[ .-]\d{4}|\d{3}[ .-]\d{3}[ .-]\d{4})(?!\d)/g],
]
const FAIL = 'privacy masking unavailable: check the local .privacy directory; no unmasked output was returned'
function replacements(text, replace) {
  let out = String(text)
  for (const [kind, pattern] of PATTERNS) out = out.replace(pattern, value => replace(kind, value))
  return out
}
function createMasking(root, { custom = true } = {}) {
  const settings = require('./setup').createSetup(root)
  function replaceAll(text, replace) {
    let terms = []
    if (custom) {
      const profile = settings.read()
      if (profile && profile.masking === 'custom') terms = profile.terms
    }
    const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = terms.length ? new RegExp(terms.slice().sort((a, b) => b.length - a.length).map(term =>
      '(?<![\\p{L}\\p{N}_])' + escape(term) + '(?![\\p{L}\\p{N}_])').join('|'), 'giu') : null
    // Existing aliases are protocol tokens, never input for further masking.
    const pieces = String(text).split(/(\[\[(?:email|phone|identifier|credential|term):[a-f0-9]{16}\]\])/g)
    return pieces.map((piece, i) => {
      if (i % 2) return piece
      const builtIn = replacements(piece, replace)
      if (!pattern) return builtIn
      return builtIn.split(/(\[\[(?:email|phone|identifier|credential|term):[a-f0-9]{16}\]\])/g)
        .map((part, j) => j % 2 ? part : part.replace(pattern, value => replace('term', value))).join('')
    }).join('')
  }
  const directory = path.join(root, '.privacy'), file = path.join(directory, 'identifiers.json')
  function directoryReady(create) {
    if (create) fs.mkdirSync(root, { recursive: true })
    if (create) { try { fs.mkdirSync(directory, { mode: 0o700 }) } catch (e) { if (e.code !== 'EEXIST') throw e } }
    const st = fs.lstatSync(directory)
    if (!st.isDirectory() || st.isSymbolicLink() || (process.platform !== 'win32' && (st.mode & 0o077))) throw new Error(FAIL)
  }
  function read(create) {
    let fd
    try {
      fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK)
      const st = fs.fstatSync(fd)
      if (!st.isFile() || st.nlink !== 1 || st.size > 8 * 1024 * 1024 || (process.platform !== 'win32' && (st.mode & 0o077))) throw new Error(FAIL)
      const data = JSON.parse(fs.readFileSync(fd, 'utf8'))
      if (data.version !== 1 || !Array.isArray(data.entries) || data.entries.length > 50000) throw new Error(FAIL)
      const seen = new Set()
      for (const entry of data.entries) {
        if (!entry || typeof entry.value !== 'string' || !/^\[\[(email|phone|identifier|credential|term):[a-f0-9]{16}\]\]$/.test(entry.alias) || seen.has(entry.alias)) throw new Error(FAIL)
        seen.add(entry.alias)
      }
      return data
    } catch (e) { if (e.code === 'ENOENT' && create) return { version: 1, entries: [] }; throw e }
    finally { if (fd !== undefined) fs.closeSync(fd) }
  }
  function transact(create, fn) {
    let locked = false
    const lock = path.join(directory, 'lock')
    try {
      directoryReady(create)
      for (let attempt = 0; attempt < 100; attempt++) {
        try { fs.mkdirSync(lock, { mode: 0o700 }); locked = true; break }
        catch (e) { if (e.code !== 'EEXIST') throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10) }
      }
      if (!locked) throw new Error(FAIL)
      const data = read(create), before = data.entries.length, result = fn(data.entries)
      if (data.entries.length !== before) {
        if (data.entries.length > 50000) throw new Error(FAIL)
        const body = JSON.stringify(data)
        if (Buffer.byteLength(body) > 8 * 1024 * 1024) throw new Error(FAIL)
        const tmp = path.join(directory, `.write-${crypto.randomBytes(12).toString('hex')}`)
        try { fs.writeFileSync(tmp, body, { mode: 0o600, flag: 'wx' }); fs.renameSync(tmp, file) }
        finally { try { fs.unlinkSync(tmp) } catch (_) {} }
      }
      return result
    } catch (_) { throw new Error(FAIL) }
    finally { if (locked) { try { fs.rmdirSync(lock) } catch (_) {} } }
  }
  function mask(text) {
    text = String(text)
    let detected = false
    replaceAll(text, (_, value) => { detected = true; return value })
    if (!detected) return text
    return transact(true, entries => {
      const values = new Map(entries.map(e => [e.value, e.alias]))
      return replaceAll(text, (kind, value) => {
        if (!values.has(value)) {
          const alias = `[[${kind}:${crypto.randomBytes(8).toString('hex')}]]`
          entries.push({ alias, value }); values.set(value, alias)
        }
        return values.get(value)
      })
    })
  }
  function restore(text) {
    text = String(text)
    if (/\[\[(email|phone|identifier|credential|term):/.test(text.replace(ALIAS, ''))) throw new Error(FAIL)
    if (!text.match(ALIAS)) return text
    return transact(false, entries => {
      const aliases = new Map(entries.map(e => [e.alias, e.value]))
      return text.replace(ALIAS, alias => {
        if (!aliases.has(alias)) throw new Error(FAIL)
        return aliases.get(alias)
      })
    })
  }
  return { mask, restore }
}

// CLI output is finite, not an interactive stream. Buffer to catch identifiers
// split across writes, including multiline credentials. Never fall back to raw.
function protectOutput(masking, { maxBytes } = {}) {
  const buffers = ['', ''], decoders = [new StringDecoder('utf8'), new StringDecoder('utf8')]
  let overflow = false
  for (const [index, stream] of [process.stdout, process.stderr].entries()) {
    stream.write = (chunk, encoding, callback) => {
      const text = typeof chunk === 'string' ? chunk : decoders[index].write(chunk)
      buffers[index] += text
      if (Buffer.byteLength(buffers[index]) > 16 * 1024 * 1024) { overflow = true; buffers[index] = '' }
      const cb = typeof encoding === 'function' ? encoding : callback
      if (cb) cb()
      return true
    }
  }
  process.once('exit', () => {
    try {
      if (overflow) throw new Error(FAIL)
      // Prepare both before emitting either, so a failure cannot expose raw data.
      const output = buffers.map((text, i) => masking.mask(text + decoders[i].end()))
      if (maxBytes && Buffer.byteLength(output[0]) > maxBytes) {
        const notice = '\n[Masked context truncated; retrieve a narrower topic.]\n'
        let body = Buffer.from(output[0]).subarray(0, maxBytes - Buffer.byteLength(notice)).toString('utf8').replace(/\uFFFD$/, '')
        const open = body.lastIndexOf('[[')
        if (open > body.lastIndexOf(']]')) body = body.slice(0, open)
        output[0] = body + notice
      }
      output.forEach((text, i) => { if (text) fs.writeSync(i + 1, text) })
    } catch (_) { process.exitCode = 1; fs.writeSync(2, FAIL + '\n') }
  })
}
module.exports = { createMasking, protectOutput }
