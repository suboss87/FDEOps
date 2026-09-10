'use strict'

// Source syntax records an inspectable attribution, never authenticates it.
// The entry's automatic log date is deliberately not a source.
const PLACEHOLDER = /^(?:none|unknown|tbd|pending|n\/?a|source|evidence|not provided|missing|\?+|-+)$/i
function sourceReference(value) {
  const text = String(value || '')
  const explicit = text.match(/\[source:\s*([^\]\n]+)\]/i)
  if (explicit) {
    const source = explicit[1].trim()
    return source && !PLACEHOLDER.test(source) ? source : ''
  }
  const url = text.match(/https?:\/\/[^\s<>\])|]+/i)
  if (url) return url[0]
  const id = text.match(/\b(?:PR\s*#\s*\d+|commit\s+[a-f0-9]{7,40}|(?:transcript|meeting|email|run)\s*(?:id\s*)?:\s*[\w][\w./#-]*)/i)
  if (id && !PLACEHOLDER.test(id[0].split(':').pop().trim())) return id[0]
  const dated = text.match(/\b(?:meeting|call|email|transcript)\b[^\n|]{0,60}\b\d{4}-\d{2}-\d{2}\b/i)
  if (dated) return dated[0]
  const file = text.match(/(?:^|[\s(])((?:[\w.-]+\/)*[\w.-]+\.(?:md|txt|csv|json|pdf|png|html|log))(?:$|[\s)#])/i)
  return file ? file[1] : ''
}
module.exports = { sourceReference, hasSource: value => Boolean(sourceReference(value)) }

// Both CLI bullets and the documented long-form decision format are records.
// Keep the source with its decision body; a heading alone is not the evidence.
function datedDecisions(value) {
  const lines = String(value || '').split('\n')
  const entries = []
  for (let i = 0; i < lines.length; i++) {
    const bullet = lines[i].match(/^\s*[-*]\s*\[(\d{4}-\d{2}-\d{2})\]\s*(.+)/)
    const heading = lines[i].match(/^(#{2,3})\s+\[?(\d{4}-\d{2}-\d{2})(?:\]|\s+-)?\s+(.+)/)
    if (bullet) entries.push({ date: bullet[1], text: lines[i].trim(), line: i + 1 })
    else if (heading) {
      let end = i + 1
      while (end < lines.length && !/^#{1,3}\s/.test(lines[end]) && !/^\s*[-*]\s*\[\d{4}-\d{2}-\d{2}\]/.test(lines[end])) end++
      entries.push({ date: heading[2], text: lines.slice(i, end).join('\n').trim(), line: i + 1 })
      i = end - 1
    }
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date) || a.line - b.line)
}
module.exports.datedDecisions = datedDecisions
