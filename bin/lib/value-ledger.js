'use strict'
const { hasSource } = require('./provenance')

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

function evidenceSource(evidence) {
  const text = String(evidence || '').trim()
  return hasSource(text) && !PENDING_CELL_RE.test(text) && !/\b(?:no evidence|never (?:run|tested|measured)|not (?:run|tested|measured|verified)|unverified|invalid|retracted)\b/i.test(text)
}

function valueState({ measured, accepted, acceptanceStatus, evidence }) {
  if (withdrawalMention({ measured, accepted, acceptanceStatus, evidence })) return 'claimed'
  if (!measured || PENDING_CELL_RE.test(measured)) return 'unmeasured'
  if (!acceptanceName(accepted) || !evidenceSource(evidence)) return 'claimed'
  // Explicit status is authoritative when the column exists. Unknown values
  // fail closed. Existing name-only ledgers remain readable during migration.
  if (acceptanceStatus !== undefined) {
    if (acceptanceStatus.trim().toLowerCase() !== 'accepted') return 'claimed'
    if (!evidence || PENDING_CELL_RE.test(evidence)) return 'claimed'
  }
  return 'accepted'
}

// These checks flag explicit conflicts for human review. They do not authenticate
// approval, infer delegation, or revoke history when the current signer changes.
function withdrawalMention(row) {
  const text = [row.measured, row.accepted, row.acceptanceStatus, row.evidence].filter(Boolean).join(' ')
    .replace(/\S*[/\\]\S*/g, '') // artifact names are sources, not withdrawal events
    .replace(/\b(?:not|never)\s+(?:been\s+)?(?:withdrawn|retracted|revoked|superseded)\b/gi, '')
  return /\b(?:withdrawn|retracted|revoked|superseded|retracts? (?:the )?(?:approval|acceptance|evidence)|withdraws? (?:the )?(?:approval|acceptance|evidence))\b/i.test(text)
}

function scopeIssue(row, goal) {
  const promise = String(row.promised || goal || '')
  const acceptance = String(row.accepted || '')
  const limited = acceptance.match(/\b(staging|slides?(?: design)?|demo|prototype|poc)\s+only\b/i)
  if (limited) {
    const scope = limited[1].toLowerCase()
    const matchingGoal = scope.startsWith('slide') ? /\bslides?\b/i.test(promise) : new RegExp('\\b' + scope + '\\b', 'i').test(promise)
    if (!matchingGoal || /\b(?:production|clinical use|go.live)\b/i.test(promise)) return 'approval scope is limited; review against the promised outcome'
  }
  if (/\bproduction\b/i.test(promise) && /\b(?:staging|synthetic|prototype|poc)\b/i.test(String(row.measured || '')) && !/\bproduction\b/i.test(String(row.measured || ''))) return 'measurement scope differs from production promise; review required'
  return ''
}

function reconcileValueRows(rows, goal = '') {
  const key = row => String(row.slice || '').trim().toLowerCase()
  const withdrawn = new Set(rows.filter(withdrawalMention).map(key).filter(Boolean))
  return rows.map(row => {
    let acceptanceIssue = scopeIssue(row, goal)
    if (withdrawalMention(row)) acceptanceIssue = 'withdrawal recorded; review current acceptance'
    else if (withdrawn.has(key(row))) acceptanceIssue = 'conflicting withdrawal for this slice; review history before relying on acceptance'
    return acceptanceIssue ? { ...row, acceptanceIssue, state: row.state === 'unmeasured' ? 'unmeasured' : 'claimed' } : row
  })
}

module.exports = { PENDING_CELL_RE, acceptanceName, evidenceSource, valueState, reconcileValueRows }
