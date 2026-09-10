'use strict'

// Empty measurements and unsigned outcomes are different facts. Keep their
// interpretation shared by status, reports, and exported vaults.
const PENDING_CELL_RE = /^(?:pending|tbd|to ?be ?(?:measured|confirmed|determined)|n\s*\/\s*a|na|none|unknown|not(?:\s+yet)?\s+measured|unmeasured|awaiting|\?+|\.{2,}|…|-+)(?:[^\w].*)?$/i
const UNCERTAIN_ACCEPTANCE_RE = /\b(?:not|no|never|pending|awaiting|unapproved|unsigned|unconfirmed|unaccepted|unverified|rejected|declined|denied|revoked|withdrawn|superseded|proposed|requested|unknown|tbd|tentative|conditional|required|needed|blocked|draft)\b|\?|\b(?:wait(?:ing)?|request(?:ing)?|seek(?:ing)?)\s+(?:for\s+)?(?:approval|sign.?off|acceptance)\b/i
const BARE_APPROVAL_RE = /^(?:yes|true|ok(?:ay)?|approved|accepted|confirmed|signed(?:\s+off)?|done|complete(?:d)?)[.!\s]*$/i

function acceptanceName(value) {
  const name = String(value || '').trim()
  if (!name || PENDING_CELL_RE.test(name) || UNCERTAIN_ACCEPTANCE_RE.test(name) || BARE_APPROVAL_RE.test(name)) return ''
  // A date, number, or punctuation cannot identify a customer-side signer.
  if (!/\p{L}/u.test(name)) return ''
  return name
}

function valueState({ measured, accepted, acceptanceStatus, evidence }) {
  if (!measured || PENDING_CELL_RE.test(measured)) return 'unmeasured'
  if (!acceptanceName(accepted)) return 'claimed'
  // Explicit status is authoritative when the column exists. Unknown values
  // fail closed. Existing name-only ledgers remain readable during migration.
  if (acceptanceStatus !== undefined) {
    if (acceptanceStatus.trim().toLowerCase() !== 'accepted') return 'claimed'
    if (!evidence || PENDING_CELL_RE.test(evidence)) return 'claimed'
  }
  return 'accepted'
}

module.exports = { PENDING_CELL_RE, acceptanceName, valueState }
