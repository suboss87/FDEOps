'use strict'

// Pure presentation policy shared by CLI triage and the offline fieldbook.
// Callers supply sanitized records and classified value rows. This helper does
// not authenticate approval, infer missing signer fields, or modify next actions.
function deliverySummary(e) {
  const signals = e.signals || {}
  const rows = e.valueRows || []
  const gaps = []
  const add = (kind, text, action, source, tone = 'amber') => gaps.push({ kind, text, action, source, tone })
  if (signals.memoryWarn) add('record', 'Record needs repair: ' + signals.memoryWarn, 'Review and repair the client record before relying on it', 'context.md', 'red')
  if (e.highRisks) add('blocker', `${e.highRisks} high risk${e.highRisks === 1 ? '' : 's'} open`, 'Review the highest-priority open risk and confirm its owner', 'risks.md', 'red')
  if (signals.trust === 'RED') add('trust', 'Check in with the customer: trust is at risk', 'Confirm the customer concern before continuing delivery', 'stakeholders.md', 'red')
  if (e.hasSigner === false) add('signer', 'Acceptance owner not recorded', 'Name who can accept the outcome and confirm their authority', 'success.md')
  const missingEvidence = rows.filter(r => r.evidenceMissing).length
  if (missingEvidence) add('evidence', `${missingEvidence} outcome${missingEvidence === 1 ? '' : 's'} missing evidence`, 'Find the measurement source before presenting the outcome', 'delivery.md')
  const unmeasured = rows.filter(r => r.state === 'unmeasured').length
  if (unmeasured) add('measurement', `${unmeasured} outcome${unmeasured === 1 ? '' : 's'} not yet measured`, 'Agree how to measure the outcome and collect the result', 'delivery.md')
  const claimed = rows.filter(r => r.state === 'claimed').length
  if (claimed) add('acceptance', `${claimed} measured outcome${claimed === 1 ? '' : 's'} awaiting acceptance`, 'Ask the acceptance owner to review the measured outcome', 'delivery.md')
  if (signals.trust === 'amber') add('trust', 'Check in with the customer: trust is watch', 'Check the customer concern and agree the next step', 'stakeholders.md')
  if (signals.stale) add('stale-trust', 'Reconfirm the dated trust signal', 'Check whether the recorded customer signal still applies', 'stakeholders.md')
  if (!e.hasNext) add('next', 'Set the next action', 'Set one next action with an owner and completion check', 'context.md')
  if (signals.trust === 'new') add('new-trust', 'No dated trust signal yet - ask someone', 'Ask the customer how the engagement is going', 'stakeholders.md')
  if (e.quiet) add('stale-record', 'Record last updated ' + (signals.updated || 'at an unknown time'), 'Check what changed since the last recorded update', 'context.md')
  const first = gaps[0]
  return {
    gaps,
    firstAction: first
      ? { kind: first.kind, text: first.action, reason: first.text, tone: first.tone, source: first.source }
      : { kind: 'recorded', text: e.next || 'Review the client record', reason: 'Recorded next action', tone: '', source: 'context.md' },
  }
}
module.exports = { deliverySummary }
