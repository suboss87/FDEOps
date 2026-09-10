'use strict'

// Empty measurements and unsigned outcomes are different facts. Keep their
// interpretation shared by status, reports, and exported vaults.
const PENDING_CELL_RE = /^(?:pending|tbd|to ?be ?(?:measured|confirmed|determined)|n\s*\/\s*a|na|none|unknown|not(?:\s+yet)?\s+measured|unmeasured|awaiting|\?+|\.{2,}|…|-+)(?:[^\w].*)?$/i
const UNCERTAIN_ACCEPTANCE_RE = /\b(?:not|no|never|pending|awaiting|unapproved|unsigned|unconfirmed|unaccepted|unverified|rejected|declined|denied|revoked|withdrawn|superseded|proposed|requested|unknown|tbd|tentative|conditional|required|needed|blocked|draft)\b|\?|\b(?:wait(?:ing)?|request(?:ing)?|seek(?:ing)?)\s+(?:for\s+)?(?:approval|sign.?off|acceptance)\b/i
const APPROVAL_PROSE_RE = /^(?:yes|true|ok(?:ay)?|approved|accepted|confirmed|signed(?:\s+off)?|done|complete(?:d)?)\b/i

function acceptanceName(value) {
  const name = String(value || '').trim()
  if (!name || PENDING_CELL_RE.test(name) || UNCERTAIN_ACCEPTANCE_RE.test(name) || APPROVAL_PROSE_RE.test(name.replace(/[*_`]/g, ''))) return ''
  // A date, number, or punctuation cannot identify a customer-side signer.
  if (!/\p{L}/u.test(name)) return ''
  // Legacy cells must name a signer, not just a role plus a date. Keep names
  // first: "Priya Shah, approved 2026-09-10" remains a recorded assertion.
  const withoutDates = name.replace(/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,4}\b/gi, '')
  const identity = withoutDates.replace(/\b(?:yes|true|okay|ok|approved|accepted|confirmed|signed|off|done|complete|completed|approval|acceptance)\b/gi, '').replace(/[\d\p{P}\p{S}]/gu, ' ').trim()
  if (!identity || /^(?:(?:the|by|on|customer|client|sponsor|approver|owner|team|lead|manager|stakeholder|signer|signatory|ceo|cto|cfo)\s*)+$/i.test(identity)) return ''
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
