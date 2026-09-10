'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { buildFieldbookHtml } = require('../bin/lib/render')

const client = (extra = {}) => ({
  slug: 'acme', name: 'Acme Payments', phaseLabel: 'Ship', next: 'Review staging evidence with Maya', hasNext: true,
  searchBlob: 'acme payments maya staging', signals: { trust: 'green', updated: 'today' }, highRisks: 0,
  stakeholders: [], log: [], stats: [], risks: [], moreSections: [], valueRows: [], ...extra,
})
const render = engagements => buildFieldbookHtml({ engagements, today: 'Thursday, Sep 10', generatedAt: '2026-09-10T09:00:00.000Z' })

test('portfolio filters distinguish missing records from clear clients, with recoverable empty results', () => {
  const html = render([client(), client({ slug: 'north', name: 'North Logistics', hasNext: false })])
  assert.match(html, /data-target="eng-acme"[^>]*data-attention="false"/)
  assert.match(html, /data-target="eng-north"[^>]*data-attention="true"/)
  assert.match(html, /data-client="eng-acme" data-nav="eng-acme"/)
  assert.match(html, /data-client="eng-north" data-nav="eng-north"/)
  assert.match(html, /id="fb-results-empty"[^>]*hidden/)
  assert.match(html, /data-reset-filters/)
  assert.equal((html.match(/id="fb-search-count"/g) || []).length, 1)
})

test('empty portfolio explains setup without pretending to create clients in the report', () => {
  const html = render([])
  assert.match(html, /Your next client starts here/)
  assert.match(html, /npx fdeops resume --init client01/)
  assert.match(html, /creates fictional records/)
  assert.match(html, /Read-only snapshot/)
  assert.doesNotMatch(html, /<form\b|contenteditable=/i)
})

test('palette shows the readable client name and malicious names remain text', () => {
  const html = render([client({ name: '<img src=x onerror=alert(1)>', searchBlob: '&lt;img src=x onerror=alert(1)&gt;' })])
  assert.doesNotMatch(html, /<img src=x/)
  assert.match(html, /class="fb-palette-label">&lt;img src=x onerror=alert\(1\)&gt;/)
  assert.match(html, /aria-controls="fb-client-rail"/)
  assert.match(html, /data-target="__print__"/)
  assert.match(html, /datetime="2026-09-10T09:00:00.000Z"/)
})

test('search and attention filtering keep navigation and overview in agreement, including reset', () => {
  const vm = require('node:vm')
  const clientScript = require('../bin/lib/fieldbook-client')
  function element(data = {}) {
    const classes = new Set()
    const attributes = new Map()
    return { dataset: data, hidden: false, value: '', textContent: '', events: {},
      classList: { toggle(name, force) { if (force) classes.add(name); else classes.delete(name) }, contains: name => classes.has(name), remove: name => classes.delete(name) },
      addEventListener(name, callback) { this.events[name] = callback }, setAttribute(name, value) { attributes.set(name, value) }, getAttribute(name) { return attributes.get(name) }, removeAttribute(name) { attributes.delete(name) }, focus() {},
    }
  }
  const nav = [element({ target: 'today' }), element({ target: 'eng-acme', search: 'ACME Maya staging', attention: 'true' }), element({ target: 'eng-harbor', search: 'harbor elena handover', attention: 'false' })]
  nav.forEach(n => { const reason = element(); n.querySelector = () => reason })
  const rows = [element({ client: 'eng-acme' }), element({ client: 'eng-harbor' })]
  const section = element(); section.querySelectorAll = () => rows
  const reset = element()
  const ids = Object.fromEntries(['fb-search', 'fb-filter', 'fb-client-rail', 'fb-clients-btn', 'fb-status', 'fb-palette-dialog', 'fb-palette-input', 'fb-prompt-dialog', 'fb-search-empty', 'fb-results-empty', 'fb-search-count', 'fde-theme-btn', 'fb-print-btn', 'fb-palette-btn'].map(id => [id, element()]))
  ids['fb-filter'].value = 'all'
  const views = ['today', 'eng-acme', 'eng-harbor'].map(id => Object.assign(element(), { id: 'view-' + id }))
  views.forEach(view => { ids[view.id] = view })
  const selectors = { '.fb-view': views, '.fb-nav': nav, '[data-client]': rows, '[data-filter-section]': [section], '[data-reset-filters]': [reset] }
  const main = element()
  const document = { documentElement: element(), getElementById: id => ids[id], querySelectorAll: selector => selectors[selector] || [], querySelector: selector => selector === '.fb-main' ? main : null, addEventListener() {} }
  const media = { matches: true, addEventListener(name, callback) { this.change = callback } }
  vm.runInNewContext('(' + clientScript.toString() + ')()', { document, location: { hash: '' }, window: { addEventListener() {}, matchMedia: () => media } })
  assert.equal(ids['fb-client-rail'].classList.contains('is-collapsed'), true)
  ids['fb-clients-btn'].events.click()
  assert.equal(ids['fb-client-rail'].classList.contains('is-collapsed'), false)
  media.change({ matches: false })
  assert.equal(ids['fb-clients-btn'].getAttribute('aria-expanded'), 'true')
  media.change({ matches: true })
  assert.equal(ids['fb-clients-btn'].getAttribute('aria-expanded'), 'false')
  const visible = list => list.filter(row => !row.classList.contains('hide'))
  ids['fb-search'].value = 'maya'
  ids['fb-search'].events.input()
  assert.equal(visible(nav.slice(1)).length, 1)
  assert.deepEqual(visible(rows).map(row => row.dataset.client), ['eng-acme'])
  ids['fb-filter'].value = 'clear'
  ids['fb-filter'].events.change()
  assert.equal(visible(rows).length, 0)
  assert.equal(ids['fb-results-empty'].hidden, false)
  assert.equal(section.hidden, true)
  reset.events.click()
  assert.equal(visible(rows).length, 2)
  assert.equal(ids['fb-results-empty'].hidden, true)
  assert.equal(section.hidden, false)
  ids['fb-filter'].value = 'attention'
  ids['fb-filter'].events.change()
  assert.deepEqual(visible(rows).map(row => row.dataset.client), ['eng-acme'])
})


test('daily action prompts check current records and missing next actions stay explicit', () => {
  const ready = render([client()])
  const fresh = render([client({ hasNext: false, next: '' })])
  assert.match(ready, />Continue next action<\/button>/)
  assert.match(ready, /Re-read the latest client record first because this report may be older/)
  assert.match(ready, /Check dependencies and required approvals/)
  assert.match(fresh, />Set next action<\/button>/)
  assert.doesNotMatch(fresh, />Continue next action<\/button>/)
  assert.match(ready, /data-nav="today">&larr; Back to overview/)
  assert.match(ready, /Reloading this page alone does not refresh the record/)
})


test('first-action policy prioritizes record gaps without inventing signer or acceptance', () => {
  const { deliverySummary } = require('../bin/lib/delivery-gaps')
  const missing = deliverySummary(client({ hasSigner: false, valueRows: [{ state: 'claimed', evidenceMissing: true }] }))
  assert.equal(missing.firstAction.kind, 'signer')
  assert.equal(missing.firstAction.source, 'success.md')
  assert.ok(missing.gaps.some(g => g.kind === 'evidence'))
  assert.ok(missing.gaps.some(g => g.kind === 'acceptance'))
  assert.ok(!deliverySummary(client()).gaps.some(g => g.kind === 'signer'))
  assert.equal(deliverySummary(client()).firstAction.text, 'Review staging evidence with Maya')
  assert.equal(deliverySummary(client({ highRisks: 1, hasSigner: false })).firstAction.kind, 'blocker')
  assert.equal(deliverySummary(client({ valueRows: [{ state: 'accepted', evidenceMissing: true }] })).firstAction.kind, 'evidence')
  assert.equal(deliverySummary(client({ valueRows: [{ state: 'unmeasured' }] })).firstAction.kind, 'measurement')
  assert.equal(deliverySummary(client({ signals: { trust: 'green', stale: true } })).firstAction.kind, 'stale-trust')
})

test('overview recommends one action while client detail preserves the recorded next action', () => {
  const html = render([client({ valueRows: [{ state: 'claimed', slice: 'Retry', evidenceMissing: false }] })])
  const overview = html.slice(html.indexOf('id="view-today"'), html.indexOf('id="view-eng-acme"'))
  assert.match(overview, /Recommended first actions/)
  assert.match(overview, /Ask the acceptance owner to review the measured outcome/)
  assert.match(overview, /awaiting acceptance &middot; delivery.md/)
  assert.equal((overview.match(/class="fb-row fb-queue-row"/g) || []).length, 1)
  assert.match(html.slice(html.indexOf('id="view-eng-acme"')), /Review staging evidence with Maya/)
})
