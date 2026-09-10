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
