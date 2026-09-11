'use strict'

const DEFAULT_BYTES = 16384
const MIN_BYTES = 4096
const MAX_BYTES = 65536
const OMITTED = '\n[Excerpt truncated; retrieve the source before relying on omitted details.]'

// A byte ceiling is deterministic across hosts. It is deliberately not called
// a token count: tokenization varies by model and language.
function clipUtf8(text, bytes) {
  if (Buffer.byteLength(text) <= bytes) return text
  const buf = Buffer.from(text)
  let end = Math.max(0, bytes)
  while (end > 0 && (buf[end] & 0xc0) === 0x80) end--
  return buf.subarray(0, end).toString('utf8')
}
function budgetArgs(args, defaultBytes = DEFAULT_BYTES) {
  const rest = [...args]
  let maxBytes = defaultBytes
  const at = rest.indexOf('--max-bytes')
  if (at !== -1) {
    const raw = rest[at + 1]
    maxBytes = Number(raw)
    if (!/^\d+$/.test(raw || '') || !Number.isSafeInteger(maxBytes) || maxBytes < MIN_BYTES || maxBytes > MAX_BYTES) {
      throw new Error(`--max-bytes must be an integer from ${MIN_BYTES} to ${MAX_BYTES}`)
    }
    rest.splice(at, 2)
    if (rest.includes('--max-bytes')) throw new Error('supply --max-bytes only once')
  }
  return { args: rest, maxBytes }
}
function boundedSections(sections, maxBytes = DEFAULT_BYTES) {
  const footer = '\n\nCONTEXT: selected excerpts, not the complete record or proof of approval. Use fde recall <topic> for relevant evidence. If policy or constraints are truncated, retrieve them before acting. Verify conflicting decisions.\n'
  let out = ''
  const filled = sections.filter(s => s && s.trim())
  for (let i = 0; i < filled.length; i++) {
    const available = maxBytes - Buffer.byteLength(out + footer) - 2
    const share = Math.max(0, Math.floor(available / (filled.length - i)))
    const text = filled[i]
    const next = Buffer.byteLength(text) <= share ? text : clipUtf8(text, Math.max(0, share - Buffer.byteLength(OMITTED))) + OMITTED
    out += (out ? '\n\n' : '') + next
  }
  return out + footer
}

// Literal, client-scoped lexical retrieval. Retain independently matching
// records, including conflicting/older ones; recency never means truth.
function recallSections(documents, query, maxHits = 12, outputText = text => text) {
  const words = [...new Set(query.toLocaleLowerCase().split(/\s+/).filter(Boolean))].slice(0, 16)
  const hits = []
  for (const { file, text } of documents) {
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lower = line.toLocaleLowerCase()
      const score = words.reduce((n, word) => n + Number(lower.includes(word)), 0)
      if (!score) continue
      const first = Math.max(0, i - 1)
      const last = Math.min(lines.length, i + 3)
      const excerpt = lines.slice(first, last).map(outputText).map(l => Buffer.byteLength(l) <= 1024 ? l : clipUtf8(l, 900) + OMITTED).join('\n')
      hits.push({ file, line: first + 1, end: last, score, text: excerpt.trim() })
    }
  }
  hits.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file) || b.line - a.line)
  // Round-robin files, taking recent and older matches so a long topic does
  // not hide its latest change or original constraint. Omission stays explicit.
  const groups = new Map()
  for (const hit of hits) {
    if (!groups.has(hit.file)) groups.set(hit.file, [])
    groups.get(hit.file).push(hit)
  }
  const selected = []
  let oldest = false
  while (selected.length < maxHits && [...groups.values()].some(g => g.length)) {
    for (const group of groups.values()) {
      if (group.length && selected.length < maxHits) selected.push(oldest ? group.pop() : group.shift())
    }
    oldest = !oldest
  }
  return {
    total: hits.length,
    sections: selected.map(h => `${h.file}:${h.line}-${h.end} (lines in redacted view)\n${h.text}`),
  }
}
module.exports = { DEFAULT_BYTES, clipUtf8, budgetArgs, boundedSections, recallSections }
