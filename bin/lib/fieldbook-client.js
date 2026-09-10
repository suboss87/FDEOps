'use strict'

// Embedded verbatim in the offline fieldbook. No imports, network, or record writes.
module.exports = function fieldbookClient() {
  const all = selector => Array.from(document.querySelectorAll(selector))
  const views = all('.fb-view')
  const nav = all('.fb-nav')
  const search = document.getElementById('fb-search')
  const filter = document.getElementById('fb-filter')
  const rail = document.getElementById('fb-client-rail')
  const clientsButton = document.getElementById('fb-clients-btn')
  const mobile = window.matchMedia('(max-width:640px)')
  const main = document.querySelector('.fb-main')
  const status = document.getElementById('fb-status')
  const palette = document.getElementById('fb-palette-dialog')
  const paletteInput = document.getElementById('fb-palette-input')
  const items = all('.fb-palette-item')
  const promptDialog = document.getElementById('fb-prompt-dialog')
  let returnFocus = null
  let active = 0
  const currentId = () => document.querySelector('.fb-view:not([hidden])').id.replace('view-', '')
  function showClients(show) {
    rail.classList.toggle('is-collapsed', !show)
    clientsButton.setAttribute('aria-expanded', String(show))
  }
  showClients(!mobile.matches)
  mobile.addEventListener('change', event => showClients(!event.matches))
  clientsButton.addEventListener('click', () => showClients(clientsButton.getAttribute('aria-expanded') !== 'true'))
  function selectView(id, updateHash = true, focus = false) {
    if (id === 'fb-main') { id = 'today'; updateHash = false }
    if (!document.getElementById('view-' + id)) id = 'today'
    views.forEach(v => { v.hidden = v.id !== 'view-' + id })
    nav.forEach(n => {
      const selected = n.dataset.target === id
      n.classList.toggle('active', selected)
      if (selected) n.setAttribute('aria-current', 'page')
      else n.removeAttribute('aria-current')
    })
    if (updateHash && location.hash !== '#' + id) location.hash = id
    main.scrollTop = 0
    if (focus) {
      document.querySelector('.fb-view:not([hidden]) h1').focus()
      if (mobile.matches) showClients(false)
    }
  }
  const hashId = () => location.hash.slice(1)
  selectView(hashId() || 'today', false)
  window.addEventListener('hashchange', () => selectView(hashId(), false))
  const skip = document.querySelector('.fb-skip')
  if (skip) skip.addEventListener('click', event => {
    event.preventDefault()
    main.focus()
  })
  nav.forEach(n => n.addEventListener('click', () => selectView(n.dataset.target, true, true)))
  all('[data-nav]').forEach(n => n.addEventListener('click', () => selectView(n.dataset.nav, true, true)))

  // Only escaped fragments become markup; engagement strings never become code.
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  function snippet(raw, term) {
    const i = raw.indexOf(term)
    const start = Math.max(0, i - 24), end = Math.min(raw.length, i + term.length + 40)
    return (start ? '…' : '') + esc(raw.slice(start, i)) + '<mark>' + esc(raw.slice(i, i + term.length)) + '</mark>' + esc(raw.slice(i + term.length, end)) + (end < raw.length ? '…' : '')
  }
  function filterClients() {
    const term = search.value.trim().toLowerCase()
    const matches = new Set()
    nav.filter(n => n.dataset.target !== 'today').forEach(n => {
      const raw = (n.dataset.search || '').toLowerCase()
      const inGroup = filter.value === 'all' || (n.dataset.attention === 'true') === (filter.value === 'attention')
      const hit = inGroup && (!term || raw.includes(term))
      n.classList.toggle('hide', !hit)
      if (hit) matches.add(n.dataset.target)
      const reason = n.querySelector('.fb-nav-reason')
      if (term && hit) reason.innerHTML = snippet(raw, term)
      else reason.textContent = n.dataset.defaultReason || ''
      reason.classList.toggle('hide', !reason.textContent)
    })
    const count = matches.size
    all('[data-client]').forEach(row => row.classList.toggle('hide', !matches.has(row.dataset.client)))
    const filtering = Boolean(term) || filter.value !== 'all'
    document.getElementById('fb-search-empty').hidden = !filtering || count > 0
    const empty = document.getElementById('fb-results-empty')
    if (empty) empty.hidden = !filtering || count > 0
    all('[data-filter-section]').forEach(section => { section.hidden = !Array.from(section.querySelectorAll('[data-client]')).some(row => !row.classList.contains('hide')) })
    const total = nav.length - 1
    document.getElementById('fb-search-count').textContent = count + ' of ' + total + ' client' + (total === 1 ? '' : 's') + (filtering ? ' match' : '')
  }
  search.addEventListener('input', filterClients)
  filter.addEventListener('change', filterClients)
  all('[data-reset-filters]').forEach(button => button.addEventListener('click', () => { search.value = ''; filter.value = 'all'; filterClients() }))
  filterClients()

  function toggleTheme() {
    const next = document.documentElement.dataset.fdeTheme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.fdeTheme = next
    try { localStorage.setItem('fde-fieldbook-theme', next) } catch (_) {}
    themeLabel()
  }
  function themeLabel() {
    const dark = document.documentElement.dataset.fdeTheme === 'dark'
    document.getElementById('fde-theme-btn').textContent = dark ? 'Light theme' : 'Dark theme'
  }
  themeLabel()
  document.getElementById('fde-theme-btn').addEventListener('click', toggleTheme)
  document.getElementById('fb-print-btn').addEventListener('click', () => window.print())

  function openDialog(dialog) {
    returnFocus = document.activeElement
    dialog.showModal()
  }
  ;[palette, promptDialog].forEach(dialog => {
    dialog.addEventListener('close', () => { if (returnFocus) returnFocus.focus() })
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close() })
    // Native modal dialogs isolate background controls; contain Tab explicitly
    // so keyboard focus never escapes into browser chrome between controls.
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return
      const controls = Array.from(dialog.querySelectorAll('input, textarea, button')).filter(el => !el.hidden && !el.classList.contains('hide'))
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    })
  })
  all('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()))
  const visibleItems = () => items.filter(it => !it.classList.contains('hide'))
  function highlight() {
    const visible = visibleItems()
    items.forEach(it => it.classList.remove('active'))
    if (visible[active]) visible[active].classList.add('active')
  }
  function filterPalette() {
    const term = paletteInput.value.trim().toLowerCase()
    items.forEach(it => it.classList.toggle('hide', !it.textContent.toLowerCase().includes(term)))
    active = 0
    highlight()
    document.getElementById('fb-palette-empty').hidden = visibleItems().length > 0
  }
  function openPalette() { openDialog(palette); paletteInput.value = ''; filterPalette(); paletteInput.focus() }
  function runItem(it) {
    if (!it) return
    palette.close()
    if (it.dataset.target === '__theme__') toggleTheme()
    else if (it.dataset.target === '__print__') window.print()
    else selectView(it.dataset.target, true, true)
  }
  document.getElementById('fb-palette-btn').addEventListener('click', openPalette)
  paletteInput.addEventListener('input', filterPalette)
  items.forEach(it => it.addEventListener('click', () => runItem(it)))
  paletteInput.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      active = Math.max(0, Math.min(visibleItems().length - 1, active + (event.key === 'ArrowDown' ? 1 : -1)))
      highlight()
      if (visibleItems()[active]) visibleItems()[active].scrollIntoView({ block: 'nearest' })
    }
    if (event.key === 'Enter') { event.preventDefault(); runItem(visibleItems()[active]) }
  })

  all('[data-prompt]').forEach(button => button.addEventListener('click', async () => {
    const text = button.dataset.prompt
    try {
      await navigator.clipboard.writeText(text)
      status.textContent = 'Prompt copied. Paste it into your coding agent; review changes before saving.'
      const label = button.textContent
      button.textContent = 'Copied'
      button.disabled = true
      setTimeout(() => { button.textContent = label; button.disabled = false }, 1800)
    } catch (_) {
      const input = document.getElementById('fb-prompt-text')
      input.value = text
      openDialog(promptDialog)
      input.focus(); input.select()
    }
  }))
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      if (!promptDialog.open) { if (palette.open) palette.close(); else openPalette() }
      return
    }
    if (palette.open || promptDialog.open || event.metaKey || event.ctrlKey || event.altKey) return
    const typing = event.target.matches('input, textarea, select') || event.target.isContentEditable
    if (typing) {
      if (event.key === 'Escape') { search.value = ''; search.dispatchEvent(new Event('input')); event.target.blur() }
      return
    }
    if (event.target.closest('.fb-table-scroll')) return
    if (event.key === '/') { event.preventDefault(); showClients(true); search.focus(); return }
    if (event.key === 'j' || event.key === 'k' || (event.target.closest('.fb-rail') && ['ArrowDown', 'ArrowUp'].includes(event.key))) {
      event.preventDefault()
      const ids = nav.filter(n => !n.classList.contains('hide')).map(n => n.dataset.target)
      const delta = event.key === 'j' || event.key === 'ArrowDown' ? 1 : -1
      const next = ids[Math.max(0, Math.min(ids.length - 1, ids.indexOf(currentId()) + delta))]
      if (next) selectView(next)
    }
  })
}
