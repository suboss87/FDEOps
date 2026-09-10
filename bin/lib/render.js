"use strict"

const { deliverySummary } = require('./delivery-gaps')

// Pure, local HTML renderer for the FDE fieldbook. Data extraction stays in fde.js.

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// Never leak <private> notes or template hint comments into the rendered page.
// Closed pairs are redacted; an unclosed <private> redacts to end-of-text so a
// forgotten closing tag can never leak the rest of the file.

function inlineMd(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

// Generic markdown -> HTML for the three .fde files that are reference
// documents, not logs (success.md, terrain.md, trust-profile.md): they don't
// fit the structured stakeholder/risk/log widgets, but they're real content
// (trust-profile.md especially - sacred data and AI policy) and must stay
// visible in the fieldbook, not silently dropped. Headings, tables, bullet
// lists, and paragraphs only - matches what these files actually contain.
function mdBlockHtml(md, parseMdTable) {
  const lines = md.split('\n')
  const out = []; let i = 0
  while (i < lines.length) {
    const t = lines[i].trim()
    if (!t) { i++; continue }
    if (/^\|.*\|/.test(t)) {
      const tbl = []
      while (i < lines.length && /^\s*\|.*\|/.test(lines[i])) { tbl.push(lines[i]); i++ }
      const parsed = parseMdTable(tbl.join('\n'))
      if (parsed) {
        out.push('<table class="fb-table"><thead><tr>' + parsed.headers.map(h => '<th>' + inlineMd(h) + '</th>').join('') + '</tr></thead><tbody>' +
          parsed.rows.map(r => '<tr>' + r.map(c => '<td>' + inlineMd(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>')
      }
      continue
    }
    const h = t.match(/^(#{1,6})\s+(.*)$/)
    if (h) { out.push('<div class="fb-sec">' + inlineMd(h[2]) + '</div>'); i++; continue }
    if (/^[-*]\s+/.test(t)) {
      const items = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push('<li>' + inlineMd(lines[i].trim().replace(/^[-*]\s+/, '')) + '</li>'); i++ }
      out.push('<ul class="fb-plain-list">' + items.join('') + '</ul>'); continue
    }
    const para = []
    while (i < lines.length && lines[i].trim() && !/^\s*\|.*\|/.test(lines[i]) && !/^#{1,6}\s/.test(lines[i].trim()) && !/^[-*]\s+/.test(lines[i].trim())) {
      para.push(lines[i].trim()); i++
    }
    out.push('<p class="fb-plain-p">' + inlineMd(para.join(' ')) + '</p>')
  }
  return out.join('\n')
}

// True if a file has real content beyond headings, empty table cells, and
// blank bullets - same heuristic the old dashboard used to skip empty files.
function hasRealContent(md) {
  const txt = md
    .replace(/^#{1,6}\s.*$/gm, '')
    .replace(/^\s*\|[\s:|-]+\|\s*$/gm, '')
    .replace(/^\s*\|[\s|]*\|\s*$/gm, '')
    .replace(/\*\*[^*]+:\*\*\s*$/gm, '')
    .replace(/[-*]\s*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
  return txt.length > 0
}

// Keep embedded font data and its redistribution notice outside UI logic.
const FONT_FACE_CSS = require('./font-css')

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
function formatToday(d) { return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}` }
function formatLogDate(iso) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${MONTHS[parseInt(m[2], 10) - 1]} ${parseInt(m[3], 10)}` : iso
}
// `new` is its own word: nobody has been asked yet, which is neither steady nor at risk.
function trustWord(t) { return t === 'green' ? 'steady' : t === 'amber' ? 'watch' : t === 'new' ? 'new' : 'at risk' }
function dotClassFor(trust) { return trust === 'RED' ? 'red' : trust }

// Two-pane fieldbook: left rail (search + today + per-client nav), right main
// panel with a Today queue view and a per-client detail view, plus a command
// palette overlay. Light + dark are both full, real token sets (not one
// derived from the other) - translated 1:1 from the design's THEMES object
// into the file's existing :root / html[data-fde-theme="dark"] mechanism.
function dashStyles() {
  return `
:root{--bg:#f7f7f6;--panel:#eceae7;--rowhover:#e4e2de;--ink:#14140f;--ink-soft:#4a4942;--ink-faint:#68665f;--line:#dedcd6;--accent:#0f734d;--accent-bg:#dcf1e6;--green:#0f734d;--amber:#86530d;--red:#b23e2b;--shadow:0 12px 48px rgba(0,0,0,.18)}
html[data-fde-theme="dark"]{--bg:#0a0a09;--panel:#151513;--rowhover:#1c1c19;--ink:#f2f1ec;--ink-soft:#b0ada2;--ink-faint:#a39f94;--line:#232320;--accent:#3ddc97;--accent-bg:#132420;--green:#3ddc97;--amber:#f0b860;--red:#ff8f83;--shadow:0 12px 48px rgba(0,0,0,.5)}
${FONT_FACE_CSS}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;height:100%}
body{font-family:'Geist',system-ui,-apple-system,sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased;transition:background .15s,color .15s}
::selection{background:var(--accent-bg)}
button,input{font-family:inherit}
code{background:var(--panel);padding:1px 5px;border-radius:4px;font-size:12px;color:var(--ink-soft);font-family:'Geist Mono',monospace}
strong{font-weight:600}
.empty{color:var(--ink-faint);font-style:italic;font-size:13px}
.fb-app{height:100vh;display:flex;flex-direction:column;overflow:hidden}
.fb-scroll::-webkit-scrollbar{width:7px;height:7px}
.fb-scroll::-webkit-scrollbar-thumb{background:var(--line);border-radius:7px}
.fb-scroll::-webkit-scrollbar-track{background:transparent}
.fb-header{flex:0 0 auto;display:flex;align-items:center;gap:18px;padding:14px 24px;background:var(--bg);border-bottom:1px solid var(--line)}
.fb-brand{display:flex;align-items:baseline;gap:9px}
.fb-wordmark{font-family:'Geist Mono',monospace;font-size:14px;font-weight:700;letter-spacing:.01em}
.fb-tagline{font-family:'Geist Mono',monospace;font-size:12px;color:var(--ink-faint)}
.fb-need{font-family:'Geist Mono',monospace;font-size:11.5px;color:var(--accent);margin-left:8px}
.fb-spacer{flex:1 1 auto}
.fb-today{font-family:'Geist Mono',monospace;font-size:11.5px;color:var(--ink-faint)}
.fb-btn{border:1px solid var(--line);border-radius:6px;padding:5px 10px;background:transparent;color:var(--ink-faint);font-family:'Geist Mono',monospace;font-size:11px;cursor:pointer;line-height:1.4}
.fb-btn:hover{color:var(--ink);border-color:var(--accent)}
.fb-body{flex:1 1 auto;display:flex;min-height:0}
.fb-rail{flex:0 0 288px;display:flex;flex-direction:column;background:var(--bg);border-right:1px solid var(--line)}
.fb-rail-search{flex:0 0 auto;padding:12px 14px}
.fb-search{width:100%;padding:6px 9px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font-family:'Geist Mono',monospace;font-size:12px;outline:none}
.fb-search:focus{border-color:var(--accent)}
.fb-search::placeholder{color:var(--ink-faint)}
.fb-rail-list{flex:1 1 auto;overflow-y:auto;padding:0 8px 16px}
.fb-nav{width:100%;text-align:left;display:block;padding:9px 10px;border:none;border-radius:6px;background:transparent;cursor:pointer;color:inherit;margin-bottom:2px}
.fb-nav:hover{background:var(--panel)}
.fb-nav.active{background:var(--panel);box-shadow:inset 0 0 0 1px var(--accent)}
.fb-nav.hide{display:none}
.fb-nav-row{display:flex;align-items:center;gap:8px}
.fb-nav-name,.fb-nav-today{font-family:'Geist Mono',monospace;font-size:12.5px;font-weight:500;color:var(--ink);flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fb-nav.active .fb-nav-name{font-weight:600}
.fb-nav-today{color:var(--accent);font-weight:600}
.fb-nav-count{margin-left:auto;font-family:'Geist Mono',monospace;font-size:10.5px;color:var(--ink-faint)}
.fb-nav-meta{margin-top:3px;padding-left:14px;font-family:'Geist Mono',monospace;font-size:10.5px;color:var(--ink-faint)}
.fb-nav-reason{margin-top:3px;padding-left:14px;font-size:12px;line-height:1.35;color:var(--ink-soft)}
.fb-nav-reason.hide{display:none}
.fb-nav-reason mark{background:var(--accent-bg);color:inherit;border-radius:2px;padding:0 1px}
.fb-main{flex:1 1 auto;overflow-y:auto;background:var(--bg)}
.fb-main-inner{max-width:1440px;margin:0 auto;padding:28px 48px 64px}
.fb-grid-wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:22px 40px;margin-top:22px}
.fb-grid-wrap .fb-block{margin-top:0}
.fb-top-grid{display:grid;grid-template-columns:1fr 280px;gap:0 32px;align-items:stretch}
.fb-vitals{display:flex;flex-direction:column;margin-top:22px;padding:16px 18px;background:var(--panel);border:1px solid var(--line);border-radius:8px}
.fb-vital-row{display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:12.5px}
.fb-vital-row+.fb-vital-row{border-top:1px solid var(--line)}
.fb-vital-label{font-family:'Geist Mono',monospace;font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-faint)}
.fb-vital-val{color:var(--ink);font-weight:600;text-align:right}
.fb-vital-div{margin:4px 0;border-top:1px solid var(--line)}
@media(max-width:920px){.fb-top-grid{grid-template-columns:1fr}.fb-vitals{max-width:400px}}
.fb-view[hidden]{display:none}
.fb-eyebrow{font-family:'Geist Mono',monospace;font-size:11px;color:var(--ink-faint)}
.fb-h1{font-family:'Geist Mono',monospace;font-size:26px;font-weight:600;letter-spacing:-.01em;margin:6px 0 0}
.fb-title-row{display:flex;align-items:baseline;gap:10px;margin-top:6px}
.fb-title-row .fb-h1{margin-top:0}
.fb-trust{display:flex;align-items:center;gap:6px;font-family:'Geist Mono',monospace;font-size:12px}
.fb-meta-line{margin-top:5px;font-family:'Geist Mono',monospace;font-size:12px;color:var(--ink-faint)}
.fb-block{margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}
.fb-sec{font-family:'Geist Mono',monospace;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin:0 0 8px}
.fb-sec-row{display:flex;align-items:baseline;gap:8px}
.fb-sec-row .fb-sec{margin:0}
.fb-count{font-family:'Geist Mono',monospace;font-size:10.5px;color:var(--ink-faint)}
.fb-now-action{font-size:16.5px;font-weight:600;line-height:1.5;color:var(--ink)}
.fb-now-session{margin-top:10px;font-size:14.5px;line-height:1.6;color:var(--ink-soft)}
.fb-why{margin:0;font-size:14.5px;line-height:1.6;color:var(--ink)}
.fb-why-reality{margin-top:8px}
.fb-accent-label{color:var(--accent);font-weight:600}
.fb-stats{display:flex;gap:22px;flex-wrap:wrap;font-family:'Geist Mono',monospace;font-size:13.5px}
.fb-stat{display:inline-flex;align-items:baseline;gap:6px;padding:2px 0}
.fb-arrow{color:var(--ink-faint)}
.fb-stat-to{color:var(--ink);font-weight:600}
.fb-list{margin-top:2px}
.fb-row{display:flex;align-items:baseline;gap:10px;padding:7px 8px;margin:0 -8px;border-radius:5px}
.fb-list .fb-row:nth-child(even){background:var(--panel)}
.fb-row:hover{background:var(--rowhover)!important}
.fb-person-name{font-size:14px;font-weight:600;color:var(--ink);flex:0 0 150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fb-person-role{font-family:'Geist Mono',monospace;font-size:11.5px;color:var(--ink-faint);flex:0 0 130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fb-person-note{font-size:13px;color:var(--ink-soft);flex:1 1 auto}
.fb-risk-sev{font-family:'Geist Mono',monospace;font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;flex:0 0 38px}
.fb-risk-text{font-size:14px;line-height:1.4;color:var(--ink);flex:1 1 auto}
.fb-log-date{font-family:'Geist Mono',monospace;font-size:11.5px;color:var(--ink-faint);flex:0 0 48px}
.fb-log-kind{font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.03em;text-transform:uppercase;flex:0 0 62px}
.fb-log-text{flex:1 1 auto;font-size:14px;line-height:1.5;color:var(--ink)}
.fb-log-sig{font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.03em;text-transform:uppercase;white-space:nowrap}
.fb-more{border-top:1px solid var(--line);padding:12px 0}
.fb-more:first-child{border-top:none;padding-top:0}
.fb-more-sum{cursor:pointer;list-style:none;display:flex;align-items:center;gap:6px}
.fb-more-sum::-webkit-details-marker{display:none}
.fb-more-sum::before{content:'\\2023';color:var(--ink-faint);transition:transform .12s}
.fb-more[open] .fb-more-sum::before{transform:rotate(90deg)}
.fb-more-body{margin-top:10px}
.fb-plain-p{font-size:14px;line-height:1.55;color:var(--ink-soft);margin:0 0 10px}
.fb-plain-list{margin:0 0 10px;padding-left:18px}
.fb-plain-list li{font-size:14px;line-height:1.55;color:var(--ink-soft);margin:2px 0}
.fb-table{border-collapse:collapse;width:100%;margin:0 0 12px;font-size:13px}
.fb-table th,.fb-table td{padding:6px 9px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}
.fb-table th{font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-faint)}
.fb-table tr:last-child td{border-bottom:none}
.fb-queue-row,.fb-flag-row{cursor:pointer}
.fb-queue-row:nth-child(even),.fb-flag-row:nth-child(even){background:var(--panel)}
.fb-queue-slug{font-family:'Geist Mono',monospace;font-size:12px;color:var(--ink-faint);flex:0 0 130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fb-queue-action{font-size:14px;line-height:1.45;color:var(--ink);flex:1 1 auto}
.fb-queue-reason{display:block;font-size:12px;color:var(--ink-faint);margin-top:5px;line-height:1.5}
.fb-queue-touched{font-family:'Geist Mono',monospace;font-size:10.5px;color:var(--ink-faint);flex:0 0 auto}
.fb-flag-slug{font-family:'Geist Mono',monospace;font-size:12px;color:var(--ink-faint);flex:0 0 130px}
.fb-flag-text{font-family:'Geist Mono',monospace;font-size:12.5px}
.dot{display:inline-block;flex:0 0 auto;border-radius:50%;box-sizing:border-box}
.dot.green{background:var(--green)}
.dot.amber{background:var(--amber);border-radius:2px}
.dot.red{background:transparent;border:1.5px solid var(--red)}
.dot.new{background:transparent;border:1.5px solid var(--ink-faint)}
.dot-sm{width:7px;height:7px}
.dot-md{width:8px;height:8px}
.dot-lg{width:9px;height:9px}
.t-green{color:var(--green)}.t-amber{color:var(--amber)}.t-red{color:var(--red)}.t-accent{color:var(--accent)}.t-faint{color:var(--ink-faint)}.t-new{color:var(--ink-faint)}.t-soft{color:var(--ink-soft)}
.fb-hints{margin-top:26px;display:flex;gap:14px;flex-wrap:wrap;font-family:'Geist Mono',monospace;font-size:10.5px;color:var(--ink-faint);border-top:1px solid var(--line);padding-top:12px}
.fb-hints-spacer{margin-left:auto}
.fb-palette-input{width:100%;padding:12px 14px;border:none;border-bottom:1px solid var(--line);background:transparent;color:var(--ink);font-family:'Geist Mono',monospace;font-size:13.5px;outline:none;box-sizing:border-box}
.fb-palette-list{max-height:300px;overflow-y:auto}
.fb-palette-item{display:flex;gap:10px;align-items:baseline;padding:9px 14px;cursor:pointer}
.fb-palette-item.active{background:var(--panel)}
.fb-palette-item.hide{display:none}
.fb-palette-kind{font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.04em;color:var(--ink-faint);flex:0 0 52px;text-transform:uppercase}
.fb-palette-label{font-family:'Geist Mono',monospace;font-size:13px;color:var(--ink)}
.fb-palette-hint{margin-left:auto;font-family:'Geist Mono',monospace;font-size:11px;color:var(--ink-faint)}
@media(max-width:760px){.fb-rail{flex:0 0 220px}.fb-main-inner{padding:20px}}
@media(max-width:640px){.fb-body{flex-direction:column}.fb-rail{flex:0 0 auto;max-height:40vh;border-right:none;border-bottom:1px solid var(--line)}.fb-main-inner{padding:16px}}
/* Daily work: evidence is the focal point; chrome stays quiet. */
button:focus-visible,input:focus-visible,textarea:focus-visible,summary:focus-visible,a:focus-visible,[tabindex="0"]:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.fb-h1{font-family:'Geist',system-ui,sans-serif;font-size:32px;letter-spacing:-.035em}
.fb-h1:focus{outline:none}
.fb-sec{font-family:inherit;font-size:14px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--ink)}
.fb-main{min-width:0}.fb-main-inner{max-width:1280px}.fb-top-grid>*{min-width:0}
.fb-meta-line{line-height:1.6}.fb-eyebrow{font-family:inherit;font-size:12px}
.fb-back{margin-bottom:16px}
.fb-snapshot{font-size:11px;color:var(--ink-faint);line-height:1.6;margin-bottom:24px}
.fb-actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:20px}
.fb-action{padding:9px 13px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font-size:12px;font-weight:500;cursor:pointer}
.fb-action:first-child{background:var(--accent);color:#fff;border-color:var(--accent)}
html[data-fde-theme="dark"] .fb-action:first-child{color:#102219}
.fb-action:hover{border-color:var(--accent)}.fb-action:disabled{cursor:default;opacity:.8}.fb-actions>span{font-size:11px;color:var(--ink-faint);margin-left:4px}
.fb-queue-row,.fb-flag-row{border:0;background:transparent;width:100%;text-align:left;color:var(--ink)}
.fb-queue-row{padding:14px 10px;align-items:center}.fb-queue-slug{font-family:inherit;font-weight:600;color:var(--ink)}
.fb-flag-row{padding:10px}.fb-flag-text{font-family:inherit;font-size:13px}
.fb-value-table{min-width:700px;table-layout:fixed;margin:0}.fb-value-table th,.fb-value-table td{padding:14px 12px;overflow-wrap:anywhere;line-height:1.5}
.fb-value-table thead th{font-family:inherit;text-transform:none;letter-spacing:0;font-size:12px;font-weight:500}
.fb-value-table tbody th{font-family:inherit;text-transform:none;letter-spacing:0;font-size:13px;color:var(--ink)}
.fb-value-state{display:block;margin-top:5px;font-size:11px;font-weight:400}
.fb-table-scroll{overflow-x:auto;border:1px solid var(--line);border-radius:8px;margin-top:12px}
.fb-evidence-note{font-size:12px;line-height:1.5;color:var(--ink-faint);margin:8px 0}
.fb-empty-evidence{padding:18px;border:1px dashed var(--line);border-radius:8px;margin-top:12px;font-size:14px}
.fb-empty-evidence p{color:var(--ink-soft);max-width:65ch;line-height:1.6;margin:6px 0 0}
.fb-copy-status{font-size:13px;color:var(--accent);line-height:1.5}.fb-copy-status:empty{display:none}
.fb-dialog{padding:0;width:520px;max-width:calc(100vw - 32px);max-height:80vh;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--ink);box-shadow:var(--shadow)}
.fb-dialog::backdrop{background:rgba(0,0,0,.45)}
.fb-dialog-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;font-size:14px;font-weight:600;gap:12px;border-bottom:1px solid var(--line)}
.fb-dialog-help{padding:0 16px;font-size:13px;line-height:1.6;color:var(--ink-soft)}
#fb-prompt-text{display:block;width:calc(100% - 32px);margin:16px;padding:12px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:13px/1.6 inherit;resize:vertical}
.fb-palette-item{width:100%;border:0;background:transparent;text-align:left;color:var(--ink)}
.fb-empty-search{font-size:13px;line-height:1.6;color:var(--ink-soft);padding:12px}.fb-empty-search[hidden]{display:none}
.sr-only,.fb-skip:not(:focus){position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
.fb-skip:focus{position:fixed;top:8px;left:8px;z-index:100;background:var(--bg);color:var(--ink);padding:10px}
.fb-more-body{overflow-x:auto}.fb-title-row{flex-wrap:wrap}.fb-person{flex-wrap:wrap}.fb-person-note{min-width:140px}
@media(max-width:1100px){.fb-main-inner{padding:24px}.fb-rail{flex-basis:240px}.fb-grid-wrap{grid-template-columns:1fr}.fb-need{display:none}}
@media(max-width:640px){.fb-header{padding:12px;gap:8px;flex-wrap:wrap}.fb-today{display:none}.fb-brand{margin-right:auto}.fb-tagline{font-family:inherit}.fb-btn{min-height:34px}.fb-rail{max-height:190px;flex-basis:auto}.fb-main-inner{padding:20px 16px}.fb-h1{font-size:28px}.fb-queue-row{flex-wrap:wrap;gap:8px}.fb-queue-slug{flex-basis:calc(100% - 24px)}.fb-queue-action{flex-basis:100%;padding-left:16px}.fb-queue-touched{padding-left:16px}.fb-flag-row{flex-direction:column;gap:4px}.fb-flag-slug{flex-basis:auto}.fb-grid-wrap{grid-template-columns:minmax(0,1fr)}.fb-log{flex-wrap:wrap}.fb-log-text{flex-basis:100%}.fb-hints-spacer{margin-left:0}.fb-snapshot{margin-bottom:18px}.fb-body{min-height:0}.fb-actions>span{width:100%;margin-top:4px}.fb-app{height:100dvh}}
@media(max-width:390px){.fb-person-name,.fb-person-role{flex:1 1 100%}.fb-rail{max-height:150px}.fb-main-inner{padding:16px 12px}}
/* A shared search scope keeps the portfolio and navigation in agreement. */
.fb-search-label{display:block;font-size:12px;font-weight:600;margin-bottom:8px}
.fb-search{min-height:40px;font-family:inherit;font-size:13px}
.fb-filter-row{display:flex;gap:6px;margin-top:8px}.fb-filter-row select{min-width:0;flex:1;min-height:36px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink);padding:6px;font:12px inherit}
.fb-result-count{display:block;font-size:11px;color:var(--ink-faint);margin-top:8px}
.fb-queue-row.hide,.fb-flag-row.hide{display:none}.fb-block[hidden]{display:none}
.fb-onboard{max-width:65ch;margin-top:28px}.fb-onboard h2{font-size:20px;letter-spacing:-.02em}.fb-onboard p{font-size:14px;line-height:1.7;color:var(--ink-soft)}
.fb-h1,.fb-now-action,.fb-why,.fb-plain-p,.fb-person-note,.fb-log-text{overflow-wrap:anywhere}
.fb-now-action,.fb-now-session,.fb-why{max-width:70ch}
#fb-clients-btn{display:none}.fb-btn{min-height:36px}.fb-action{min-height:40px}
select:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
@media(max-width:640px){#fb-print-btn{display:none}#fb-clients-btn{display:inline-block}.fb-rail{max-height:45dvh}.fb-rail.is-collapsed{display:none}.fb-btn,.fb-action,.fb-filter-row select{min-height:44px}.fb-btn{min-width:44px}.fb-search{min-height:44px}.fb-palette-item{min-height:44px}.fb-rail-search{padding:10px 14px}.fb-snapshot{font-size:12px}.fb-nav{min-height:44px}}
@media(max-width:440px){.fb-header .fb-tagline{display:none}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;scroll-behavior:auto!important}}
@media print{@page{margin:12mm}html,body,.fb-app{height:auto;overflow:visible;background:#fff;color:#000}.fb-header,.fb-rail,.fb-actions,.fb-hints,.fb-copy-status,.fb-dialog,.fb-skip{display:none!important}.fb-body,.fb-main{display:block;overflow:visible}.fb-main-inner{padding:0;max-width:none}.fb-top-grid{grid-template-columns:1fr}.fb-table-scroll{overflow:visible}.fb-value-table{min-width:0;table-layout:fixed;font-size:10px}.fb-value-table th,.fb-value-table td{padding:6px}.fb-view[hidden]{display:none!important}.fb-block{break-inside:avoid}.fb-vitals{background:#fff}*{color:#000!important;box-shadow:none!important}}

`
}

// Vanilla DOM only - no framework. Read-only: view selection (today vs a
// client) is a plain show/hide over pre-rendered panels, not a re-render.
// Search filters the rail (hide + match-snippet, same mechanic the old
// dashboard used); keyboard nav (j/k/arrows, /, Escape, cmd/ctrl+K) and the
// command palette are wired the same way the theme toggle already was here -
// addEventListener, guarded null checks, no inline handlers.
function dashScript() {
  return '(' + require('./fieldbook-client').toString() + ')()'
}

// ---- HTML builders (one per fieldbook widget) - kept small and named so the
// structured extractors above and the markup below stay easy to trace. ----

function railItemHtml(e) {
  const dotClass = dotClassFor(e.signals.trust)
  const touchedClass = e.quiet ? 't-amber' : 't-faint'
  const preview = e.next.length > 58 ? e.next.slice(0, 56) + '…' : e.next
  const defaultReason = escapeHtml((e.attention || [])[0]?.text || preview)
  return `<button class="fb-nav" data-target="eng-${e.slug}" data-search="${e.searchBlob}" data-attention="${e.attention.length > 0}" data-default-reason="${defaultReason}">
<div class="fb-nav-row"><span class="dot dot-sm ${dotClass}"></span><span class="fb-nav-name">${inlineMd(e.name)}</span></div>
<div class="fb-nav-meta">${escapeHtml(e.phaseLabel)} &middot; <span class="${touchedClass}">${escapeHtml(e.signals.updated)}</span></div>
<div class="fb-nav-reason${defaultReason ? '' : ' hide'}">${defaultReason}</div>
</button>`
}

function queueRowHtml(e) {
  const dotClass = dotClassFor(e.signals.trust)
  const action = e.firstAction
  const touchedClass = e.quiet ? 't-amber' : 't-faint'
  return `<button type="button" class="fb-row fb-queue-row" data-client="eng-${e.slug}" data-nav="eng-${e.slug}">
<span class="dot dot-md ${dotClass}"></span>
<span class="fb-queue-slug">${inlineMd(e.name)}</span>
<span class="fb-queue-action">${inlineMd(action.text)}<span class="fb-queue-reason${action.tone ? ' t-' + action.tone : ''}">${escapeHtml(action.reason)} &middot; ${escapeHtml(action.source)}</span></span>
<span class="fb-queue-touched ${touchedClass}">${escapeHtml(e.signals.updated)}</span>
</button>`
}

function flagRowHtml(e, text, colorClass) {
  return `<button type="button" class="fb-row fb-flag-row" data-client="eng-${e.slug}" data-nav="eng-${e.slug}">
<span class="fb-flag-slug">${inlineMd(e.name)}</span>
<span class="fb-flag-text t-${colorClass}">${escapeHtml(text)}</span>
</button>`
}

function todayViewHtml({ today, total, attentionCount, highRiskTotal, todayQueue, flagsHtml, hasEngagements }) {
  if (!hasEngagements) {
    return `<div id="view-today" class="fb-view">
<div class="fb-eyebrow">Your engagements</div>
<h1 tabindex="-1" class="fb-h1">Today</h1>
<div class="fb-onboard"><h2>Your next client starts here</h2><p>Open the client workspace and tell your agent <code>@fde this is client01</code>. Review the brief, define one useful outcome, and name who will accept it.</p><p>Terminal setup: <code>npx fdeops resume --init client01</code>. Then generate this report again with <code>npx fdeops dashboard</code>.</p><p>Want to explore first? <code>npx fdeops demo</code> creates fictional records in its own demo folder.</p></div>
</div>`
  }
  return `<div id="view-today" class="fb-view">
<div class="fb-eyebrow">Your engagements</div>
<h1 tabindex="-1" class="fb-h1">Today</h1>
<div class="fb-meta-line">${escapeHtml(today)} &middot; ${total} engagement${total === 1 ? '' : 's'} &middot; ${attentionCount} need you &middot; ${highRiskTotal} high risk${highRiskTotal === 1 ? '' : 's'} open</div>
<p id="fb-results-empty" class="fb-empty-search" hidden>No clients match these filters. <button type="button" class="fb-btn" data-reset-filters>Clear filters</button></p>
<div class="fb-block" data-filter-section>
<div class="fb-sec">Recommended first actions</div>
<p class="fb-evidence-note">One starting point per client, based on the saved record. Confirm the gap before acting; these suggestions do not change recorded next actions.</p>
${todayQueue}
</div>
${flagsHtml ? `<div class="fb-block" data-filter-section>
<div class="fb-sec">Needs attention</div>
${flagsHtml}
</div>` : ''}
</div>`
}

function agentActionsHtml(e) {
  const prefix = `@fde Confirm the workspace is bound to ${JSON.stringify(e.name)} before using its records. `
  const actions = [
    e.hasNext
      ? ['Continue next action', 'Help me carry out the current next action. Re-read the latest client record first because this report may be older. Check dependencies and required approvals, then propose the smallest verifiable step.']
      : ['Set next action', 'Review the current client record and help me define one concrete next action, its owner, and what will show it is done. Flag missing information and show the proposed update before saving.'],
    ['Prepare meeting', 'Prepare me for the next customer meeting. Use the recorded decisions, open risks, delivery evidence and next action. Cite sources and flag unknowns.'],
    ['Debrief notes', 'Help me debrief a customer meeting. Ask me for the notes, then show proposed changes and conflicts for review before saving.'],
    ['Review outcome', 'Review what we promised, measured and recorded as accepted. Check the evidence and customer approver; do not infer acceptance. Draft a concise customer readout.'],
  ]
  return `<div class="fb-actions" aria-label="Continue in your coding agent">${actions.map(([label, prompt]) => `<button type="button" class="fb-action" data-prompt="${escapeHtml(prefix + prompt)}">${label}</button>`).join('')}<span>Copy a prompt into your agent</span></div>`
}

function deliveryHtml(e) {
  const rows = e.valueRows || []
  const labels = { unmeasured: 'Not yet measured', claimed: 'Awaiting acceptance', accepted: 'Acceptance recorded' }
  const pending = value => !value || /^(?:pending|tbd|unknown|n\/a|none|awaiting)(?:\b|$)/i.test(value)
  const cell = (value, fallback) => pending(value) ? `<span class="t-faint">${escapeHtml(value || fallback)}</span>` : inlineMd(value)
  return `<section class="fb-block fb-delivery" aria-label="Delivery evidence">
<div class="fb-sec-row"><h2 class="fb-sec">Delivery evidence</h2><span class="fb-count">${rows.length} outcome${rows.length === 1 ? '' : 's'}</span></div>
<p class="fb-evidence-note">Recorded in delivery.md. Acceptance reflects the saved record, not independent verification.</p>
${rows.length ? `<div class="fb-table-scroll" role="region" aria-label="Promised, measured and accepted outcomes" tabindex="0"><table class="fb-table fb-value-table"><thead><tr><th scope="col">Outcome</th><th scope="col">Promised</th><th scope="col">Measured</th><th scope="col">Acceptance</th><th scope="col">Evidence</th></tr></thead><tbody>${rows.map(r => `<tr><th scope="row">${inlineMd(r.slice || 'Outcome')}<span class="fb-value-state t-${r.state === 'accepted' ? 'green' : 'amber'}">${labels[r.state]}</span></th><td>${cell(r.promised, 'Not recorded')}</td><td>${cell(r.measured, 'Not yet measured')}</td><td>${cell(r.accepted, 'Not recorded')}</td><td>${cell(r.evidence, 'Not recorded')}</td></tr>`).join('')}</tbody></table></div>` : `<div class="fb-empty-evidence"><strong>No delivery evidence yet</strong><p>Ask your agent to define one useful increment: the expected result, how to measure it, and who will accept it.</p></div>`}
</section>`
}

function clientViewHtml(e) {
  const dotClass = dotClassFor(e.signals.trust)
  const sectorLine = [
    e.overlay ? escapeHtml(e.overlay) : '',
    escapeHtml(e.phaseLabel),
    e.days != null ? `day ${e.days}` : '',
    `touched ${escapeHtml(e.signals.updated)}`,
  ].filter(Boolean).join(' &middot; ')

  const nowBlock = `<div class="fb-block">
<div class="fb-sec">Next action</div>
<div class="fb-now-action${e.hasNext ? '' : ' t-amber'}">${e.hasNext ? inlineMd(e.next) : 'Set the next action'}</div>
${e.lastSession ? `<div class="fb-now-session">${inlineMd(e.lastSession)}</div>` : ''}
</div>`

  // Brief vs reality is the whole point of "discover" - what they said they
  // needed vs what's actually true. Squeezed onto one truncated line, that
  // contrast disappears. Each gets its own line, its own room to finish a
  // thought, not a race to fit before an ellipsis.
  const whyBlock = (e.brief || e.reality || e.realityMissing) ? `<div class="fb-block">
<div class="fb-sec">The problem to solve</div>
${e.brief ? `<p class="fb-why"><span class="t-faint">What they asked for:</span> ${inlineMd(e.brief)}</p>` : ''}
${e.realityMissing ? `<p class="fb-why fb-why-missing"><span class="fb-accent-label">What's actually true:</span> ${escapeHtml(e.realityMissing)}</p>` : e.reality ? `<p class="fb-why fb-why-reality"><span class="fb-accent-label">What's actually true:</span> ${inlineMd(e.reality)}</p>` : ''}
</div>` : ''

  // Vitals: a fixed field-facing gut-check panel, not a Movement block that
  // only exists when text mining finds numbers. Every row here is already
  // computed elsewhere in this file for other purposes (status/dashboard
  // triage, receipts, signals) - never a new fabricated field, just the
  // existing facts surfaced where an FDE's eye lands first. Sits beside
  // Now/Why so that column's natural reading width doesn't leave the top of
  // the page empty on a wide screen, and carries enough real rows to earn
  // roughly the same height instead of floating short beside a tall column.
  // Plain English, not fdeops shorthand - a junior FDE reading this for the
  // first time gets the same clear meaning as someone who wrote the CLI.
  // "signal" (the --signal flag's own word) becomes "trust"; a bare day
  // count becomes "started: 3 days ago" in the same relative-time phrasing
  // as everything else here, so there's one pattern to learn, not several.
  const dotGlyph = sig => sig === 'green' ? '&#9679;' : sig === 'red' ? '&#9675;' : '&#9632;' // filled circle / hollow ring / filled square - same shapes as the People list below
  const teamStatus = e.stakeholders.length
    ? ['green', 'amber', 'red'].map(sig => e.stakeholders.filter(p => p.signal === sig).length)
      .map((n, i) => n ? `<span class="t-${['green', 'amber', 'red'][i]}">${dotGlyph(['green', 'amber', 'red'][i])} ${n}</span>` : null)
      .filter(Boolean).join(' &nbsp; ')
    : ''
  const vitalsRows = [
    ['trust', trustWord(e.signals.trust), dotClass],
    e.signals.signalAge != null ? ['trust confirmed', e.signals.signalAge === 0 ? 'today' : `${e.signals.signalAge} days ago${e.signals.stale ? ' - recheck' : ''}`, e.signals.stale ? 'red' : ''] : null,
    ['phase', e.phaseLabel, ''],
    e.days != null ? ['started', e.days === 0 ? 'today' : `${e.days} days ago`, ''] : null,
    ['last updated', e.signals.updated, e.quiet ? 'amber' : ''],
    e.log.length ? ['last note', formatLogDate(e.log[0].date), ''] : null,
    e.risks.length ? ['open risks', `${e.risks.length}${e.highRisks ? ` (${e.highRisks} urgent)` : ''}`, e.highRisks ? 'red' : ''] : null,
    e.stakeholders.length ? ['people', `${e.stakeholders.length}`, ''] : null,
  ].filter(Boolean)
  const vitalsBlock = `<div class="fb-vitals">
${vitalsRows.map(([label, val, tone]) => `<div class="fb-vital-row"><span class="fb-vital-label">${escapeHtml(label)}</span><span class="fb-vital-val${tone ? ' t-' + tone : ''}">${escapeHtml(val)}</span></div>`).join('\n')}
${teamStatus ? `<div class="fb-vital-row"><span class="fb-vital-label">team status</span><span class="fb-vital-val">${teamStatus}</span></div>` : ''}
${e.stats.length ? `<div class="fb-vital-div"></div>${e.stats.map(s => `<div class="fb-vital-row"><span class="fb-vital-label">${inlineMd(s.label)}</span><span class="fb-vital-val">${inlineMd(s.from)} <span class="fb-arrow">&rarr;</span> <span class="fb-stat-to">${inlineMd(s.to)}</span></span></div>`).join('\n')}` : ''}
</div>`

  const peopleBlock = e.stakeholders.length ? `<div class="fb-block">
<div class="fb-sec">People</div>
<div class="fb-list">
${e.stakeholders.map(p => `<div class="fb-row fb-person">
<span class="dot dot-sm ${p.signal}" title="${trustWord(p.signal)}"></span>
<span class="fb-person-name">${inlineMd(p.name)}</span>
<span class="fb-person-role">${inlineMd(p.role)}</span>
<span class="fb-person-note">${inlineMd(p.note)}</span>
</div>`).join('\n')}
</div>
</div>` : ''

  const riskBlock = e.risks.length ? `<div class="fb-block">
<div class="fb-sec-row"><div class="fb-sec">Open risks</div><span class="fb-count">${e.risks.length} open</span></div>
<div class="fb-list">
${e.risks.map(r => `<div class="fb-row fb-risk">
<span class="fb-risk-sev t-${r.severity === 'high' ? 'red' : 'amber'}">${escapeHtml(r.severity)}</span>
<span class="fb-risk-text">${inlineMd(r.text)}</span>
</div>`).join('\n')}
</div>
</div>` : ''

  const logBlock = e.log.length ? `<div class="fb-block">
<div class="fb-sec">Decisions &amp; activity</div>
<div class="fb-list">
${e.log.map(g => `<div class="fb-row fb-log">
<span class="fb-log-date">${escapeHtml(formatLogDate(g.date))}</span>
<span class="fb-log-kind t-${g.kind === 'receipt' ? 'green' : g.kind === 'decision' ? 'accent' : 'faint'}">${escapeHtml(g.kind)}</span>
<span class="fb-log-text">${inlineMd(g.text)}</span>
${g.sig ? `<span class="fb-log-sig t-${g.sig}" title="trust signal ${escapeHtml(g.sig)}">●&nbsp;${escapeHtml(g.sig)}</span>` : ''}
</div>`).join('\n')}
</div>
</div>` : ''

  // reference docs (success/terrain/trust-profile) - collapsed by default,
  // never hidden entirely: trust-profile.md carries the data boundary
  const moreBlock = e.moreSections.length ? `<div class="fb-block">
${e.moreSections.map(s => `<details class="fb-more"><summary class="fb-sec fb-more-sum">${escapeHtml(s.title)}</summary><div class="fb-more-body">${s.html}</div></details>`).join('\n')}
</div>` : ''

  // People + Risk pair naturally (who's involved / what's at stake) and read
  // well side by side on a wide screen - a single 760px column left half the
  // window empty. Stats stays full width (it's already a wrapping strip of
  // small tiles that benefits from horizontal room); Log stays full width
  // (a chronological list reads better long than squeezed into a column).
  const pairedBlock = (peopleBlock || riskBlock) ? `<div class="fb-grid-wrap">${peopleBlock}${riskBlock}</div>` : ''

  return `<div id="view-eng-${e.slug}" class="fb-view" hidden>
<button type="button" class="fb-btn fb-back" data-nav="today">&larr; Back to overview</button>
<div class="fb-eyebrow">.fde/${escapeHtml(e.slug)}</div>
<div class="fb-title-row">
<h1 tabindex="-1" class="fb-h1">${inlineMd(e.name)}</h1>
<span class="fb-trust"><span class="dot dot-lg ${dotClass}"></span><span class="t-${dotClass}">${trustWord(e.signals.trust)}</span></span>
</div>
<div class="fb-meta-line">${sectorLine}</div>
${agentActionsHtml(e)}
<div class="fb-top-grid">
<div>${nowBlock}${whyBlock}</div>
${vitalsBlock}
</div>
${deliveryHtml(e)}${pairedBlock}${logBlock}${moreBlock}
</div>`
}

function paletteItemsHtml(ordered) {
  const items = [
    { kind: 'view', label: 'today', hint: 'portfolio queue', target: 'today' },
    ...ordered.map(e => ({ kind: 'open', label: e.name, hint: trustWord(e.signals.trust), target: 'eng-' + e.slug })),
    { kind: 'action', label: 'Print current view', hint: 'print / PDF', target: '__print__' },
    { kind: 'action', label: 'toggle theme', hint: 'light / dark', target: '__theme__' },
  ]
  return items.map(it => `<button type="button" class="fb-palette-item" data-target="${escapeHtml(it.target)}" data-label="${escapeHtml(it.label)}" data-kind="${escapeHtml(it.kind)}">
<span class="fb-palette-kind">${escapeHtml(it.kind)}</span>
<span class="fb-palette-label">${escapeHtml(it.label)}</span>
<span class="fb-palette-hint">${escapeHtml(it.hint)}</span>
</button>`).join('\n')
}

function buildFieldbookHtml({ engagements, today, generatedAt = '' }) {
  engagements = engagements.map(e => {
    const { gaps, firstAction } = deliverySummary(e)
    return { ...e, attention: gaps, firstAction }
  })
  // Rail and Today queue share an order: urgent record gaps first, then trust.
  const tierRank = { RED: 0, amber: 1, green: 2, new: 3 }
  const ordered = engagements.slice().sort((a, b) => Number(b.firstAction.tone === 'red') - Number(a.firstAction.tone === 'red') || Number(b.attention.length > 0) - Number(a.attention.length > 0) || tierRank[a.signals.trust] - tierRank[b.signals.trust])
  const attentionCount = engagements.filter(e => e.attention.length > 0).length
  const highRiskTotal = engagements.reduce((n, e) => n + e.highRisks, 0)

  const railItems = ordered.map(railItemHtml).join('\n')
  const todayQueue = ordered.map(queueRowHtml).join('\n') || '<p class="empty">No engagements yet.</p>'
  const flagRows = []
  ordered.forEach(e => {
    e.attention.forEach(item => flagRows.push(flagRowHtml(e, item.text, item.tone)))
  })

  const todayView = todayViewHtml({
    today, total: engagements.length, attentionCount, highRiskTotal,
    todayQueue, flagsHtml: flagRows.join('\n'), hasEngagements: engagements.length > 0,
  })
  const clientViews = ordered.map(clientViewHtml).join('\n')
  const paletteItems = paletteItemsHtml(ordered)

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script>document.documentElement.setAttribute("data-fde-theme","dark");try{if(localStorage.getItem("fde-fieldbook-theme")==="light")document.documentElement.setAttribute("data-fde-theme","light");}catch(e){}</script>
<title>FDE Fieldbook</title><style>${dashStyles()}</style></head><body>
<a class="fb-skip" href="#fb-main">Skip to content</a>
<div class="fb-app">
<header class="fb-header">
<div class="fb-brand">
<span class="fb-wordmark">FDEOPS</span>
<span class="fb-tagline">Fieldbook</span>
${engagements.length ? `<span class="fb-need">${attentionCount}/${engagements.length} need you</span>` : ''}
</div>
<div class="fb-spacer"></div>
<span class="fb-today">${escapeHtml(today)}</span>
<button id="fb-clients-btn" class="fb-btn" type="button" aria-expanded="true" aria-controls="fb-client-rail">Clients</button>
<button id="fb-print-btn" class="fb-btn" type="button">Print view</button>
<button id="fb-palette-btn" aria-label="Open command palette" class="fb-btn" type="button" title="Command palette (Ctrl/Cmd+K)">&#8984;K</button>
<button id="fde-theme-btn" class="fb-btn" type="button">dark</button>
</header>
<div class="fb-body">
<aside id="fb-client-rail" class="fb-rail" aria-label="Engagement navigation">
<div class="fb-rail-search"><label class="fb-search-label" for="fb-search">Find a client or record</label><input id="fb-search" aria-label="Search engagements and records" class="fb-search" placeholder="search clients, notes, risks…" spellcheck="false"><div class="fb-filter-row"><label class="sr-only" for="fb-filter">Filter clients</label><select id="fb-filter"><option value="all">All clients</option><option value="attention">Needs attention</option><option value="clear">No attention flags</option></select><button type="button" class="fb-btn" data-reset-filters aria-label="Clear search and filters">Reset</button></div><span id="fb-search-count" class="fb-result-count" role="status">${engagements.length} clients</span></div>
<div class="fb-rail-list fb-scroll">
<button class="fb-nav" data-target="today">
<div class="fb-nav-row"><span class="fb-nav-today">today</span>${engagements.length ? `<span class="fb-nav-count">${attentionCount} need you</span>` : ''}</div>
</button>
${railItems}
<p id="fb-search-empty" class="fb-empty-search" hidden>No matching engagements. Change the filter or search for a person, decision, or delivery.</p>
</div>
</aside>
<main id="fb-main" tabindex="-1" class="fb-main fb-scroll">
<div class="fb-main-inner">
<div class="fb-snapshot"><strong>Read-only snapshot</strong> &middot; Snapshot generated <time datetime="${escapeHtml(generatedAt)}">${escapeHtml(generatedAt ? generatedAt.replace('T', ' ').replace(/\.\d+Z$/, ' UTC') : today)}</time>. Re-run <code>fde dashboard</code> after updating your records. Reloading this page alone does not refresh the record.</div>
${todayView}
${clientViews}
<p id="fb-status" class="fb-copy-status" role="status" aria-live="polite"></p>
<div class="fb-hints">
<span><span class="t-soft">&uarr;&darr; / j k</span> client</span>
<span><span class="t-soft">/</span> search</span>
<span><span class="t-soft">&#8984;K</span> palette</span>
<span class="fb-hints-spacer">Local records. No network. Changes are reviewed in your coding agent.</span>
</div>
</div>
</main>
</div>
<dialog id="fb-palette-dialog" class="fb-dialog" role="dialog" aria-modal="true" aria-label="Command palette">
<div class="fb-dialog-head"><span>Jump to an engagement</span><button type="button" class="fb-btn" data-close-dialog>Close</button></div>
<input id="fb-palette-input" class="fb-palette-input" aria-label="Find an engagement or action" placeholder="Find an engagement or action" spellcheck="false">
<div class="fb-palette-list fb-scroll">${paletteItems}</div>
<p id="fb-palette-empty" class="fb-empty-search" hidden>No matching commands.</p>
</dialog>
<dialog id="fb-prompt-dialog" class="fb-dialog" role="dialog" aria-modal="true" aria-labelledby="fb-prompt-title">
<div class="fb-dialog-head"><span id="fb-prompt-title">Copy into your coding agent</span><button type="button" class="fb-btn" data-close-dialog>Close</button></div>
<p class="fb-dialog-help">Automatic copy is unavailable. Copy the selected prompt, then paste it into your agent. Review any proposed changes there.</p>
<textarea id="fb-prompt-text" aria-label="Agent prompt" readonly rows="7"></textarea>
</dialog>
</div>
<script>${dashScript()}</script>
</body></html>`
}

module.exports = {
  buildFieldbookHtml,
  escapeHtml,
  inlineMd,
  mdBlockHtml,
  hasRealContent,
  formatToday,
  dashStyles,
  dashScript,
}