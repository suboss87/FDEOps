#!/usr/bin/env node
/**
 * Operational smoke checks before publish. Run: npm run check
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
let failed = 0

function fail(msg) {
  console.error('FAIL:', msg)
  failed = 1
}

function ok(msg) {
  console.log('OK:', msg)
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

const requiredTemplates = [
  'context.md',
  'brief.md',
  'success.md',
  'stakeholders.md',
  'trust-profile.md',
  'reality.md',
  'terrain.md',
  'decisions.md',
  'risks.md',
  'delivery.md',
  'assumptions.md',
]

for (const f of requiredTemplates) {
  const p = path.join(root, 'templates', '.fde', f)
  if (!fs.existsSync(p)) fail(`missing template templates/.fde/${f}`)
  else ok(`template ${f}`)
}

const gif = path.join(root, 'media', 'demo.gif')
if (!fs.existsSync(gif) || fs.statSync(gif).size < 1000) {
  fail('media/demo.gif missing or too small')
} else {
  ok('media/demo.gif')
}

for (const dir of fs.readdirSync(path.join(root, 'skills'))) {
  const skill = path.join(root, 'skills', dir, 'SKILL.md')
  if (!fs.existsSync(skill)) continue
  const body = fs.readFileSync(skill, 'utf8')
  if (!body.includes('## Purpose')) fail(`${dir}/SKILL.md missing ## Purpose`)
  if (!body.includes('## Principles')) fail(`${dir}/SKILL.md missing ## Principles`)
}
ok('skills structure')

// v3: one skill + phase references (progressive disclosure)
const requiredReferences = [
  'land.md', 'discover.md', 'audit.md', 'plan.md', 'review.md',
  'rescue.md', 'ship.md', 'sketch.md', 'close.md', 'dashboard.md',
  'debrief.md', 'status.md', 'demo-prep.md',
  'healthcare.md', 'fintech.md', 'gov.md',
  'ai.md', 'eval-pack.md',
]
for (const f of requiredReferences) {
  const p = path.join(root, 'skills', 'fde', 'references', f)
  if (!fs.existsSync(p)) {
    fail(`missing phase reference skills/fde/references/${f}`)
  } else {
    const body = fs.readFileSync(p, 'utf8')
    if (!/## Principles/.test(body)) fail(`references/${f} missing ## Principles`)
  }
}
ok('phase references')

// A method reference teaches by showing one engagement, not by describing a shape:
// every judgment-heavy reference carries a worked example that names the memory
// file the work lands in. Prose-only guidance drifts into advice nobody can apply.
const exampleReferences = [
  'land.md', 'discover.md', 'plan.md', 'ship.md', 'close.md',
  'status.md', 'stakeholder-radar.md', 'options-analysis.md', 'business-case.md',
  'assumption-audit.md', 'scope-defense.md',
]
for (const f of exampleReferences) {
  const p = path.join(root, 'skills', 'fde', 'references', f)
  if (!fs.existsSync(p)) { fail(`missing method reference skills/fde/references/${f}`); continue }
  const body = fs.readFileSync(p, 'utf8')
  const section = (body.match(/\n## Worked example\n([\s\S]*?)(?=\n## |$)/) || [])[1]
  if (!section) {
    fail(`references/${f} missing ## Worked example`)
  } else if (section.trim().length < 400) {
    fail(`references/${f} worked example is too thin to teach anything`)
  } else if (!/`[a-z-]+\.md`/.test(section)) {
    fail(`references/${f} worked example never names the memory file the work lands in`)
  }
}
ok(`worked examples (${exampleReferences.length} references)`)

const router = read('skills/fde/SKILL.md')
if (!router.includes('memory contract')) fail('SKILL.md must define the memory contract')
// every references/<name>.md the router mentions must exist
const mentioned = [...new Set([...router.matchAll(/references\/([a-z-]+\.md)/g)].map(m => m[1]))]
if (mentioned.length === 0) fail('SKILL.md must dispatch to references/')
for (const refFile of mentioned) {
  if (!fs.existsSync(path.join(root, 'skills', 'fde', 'references', refFile))) {
    fail(`SKILL.md routes to references/${refFile} which does not exist`)
  }
}
ok(`router dispatch (${mentioned.length} reference targets verified) + memory contract`)

// Public claims must match the router. The docs advertise a method count and a
// per-domain list; both drifted from SKILL.md once (ingest / ingest-connect
// routed but undocumented), and a number nobody can verify is worse than none.
{
  // Every routing row must parse. A row this misses is a method that could go
  // undocumented for free, so an unparsed row is a hard failure, not a silent skip.
  const routed = new Set()
  const routing = (router.split('## Routing - 6 domains')[1] || '').split('**Overlays')[0]
  const methodCell = line => (line.split('|')[2] || '').trim().replace(/\s*\([^)]*\)\s*$/, '')
  for (const line of routing.split('\n')) {
    if (!/^\|/.test(line)) continue
    // A row that names a method but no reference would route that method while
    // nothing requires anyone to document it - shape checks can only police rows
    // they recognise, so name a method here and you must name its reference.
    if (!/references\/[a-z0-9-]+\.md/.test(line)) {
      const orphan = methodCell(line)
      // a method name, not a `-` placeholder (CLI-only rows) or a `---` separator
      if (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(orphan)) {
        fail(`SKILL.md routes '${orphan}' without naming a reference: ${line.trim().slice(0, 80)}`)
      }
      continue
    }
    // Candidate rows are selected on the reference name in ANY form, then the
    // shape is enforced - a row this cannot read must fail, never be skipped,
    // or a method could go undocumented by being written unusually.
    if (!/`references\/[a-z0-9-]+\.md`/.test(line)) {
      fail(`SKILL.md routing row must name its reference as \`references/<name>.md\`: ${line.trim().slice(0, 80)}`)
      continue
    }
    // | You hear | <method> | <cell mentioning references/*.md> |
    const method = methodCell(line)
    if (!/^[a-z0-9-]+$/.test(method)) {
      fail(`check.js cannot read the method name in a SKILL.md routing row: ${line.trim().slice(0, 80)}`)
      continue
    }
    routed.add(method)
  }
  if (!routed.size) fail('check.js could not parse the SKILL.md routing table')

  // docs/skills-reference.md is the canonical per-method list: one row per
  // method inside the six domain tables, ending at the Overlays section.
  const reference = read('docs/skills-reference.md')
  const documented = new Set()
  let documentedRows = 0
  for (const line of reference.split('### Overlays')[0].split('\n')) {
    const m = line.match(/^\|\s*\[([a-z0-9-]+)\]\(\.\.\/skills\/fde\/references\/([a-z0-9-]+\.md)\)/)
    if (!m) continue
    documentedRows++
    documented.add(m[1])
    // A link nobody followed is the same unverifiable claim this gate exists for:
    // the target must exist, and it must be the method the text names.
    if (m[2] !== `${m[1]}.md`) {
      fail(`docs/skills-reference.md links [${m[1]}] at references/${m[2]}`)
    } else if (!fs.existsSync(path.join(root, 'skills', 'fde', 'references', m[2]))) {
      fail(`docs/skills-reference.md links references/${m[2]}, which does not exist`)
    }
  }
  if (documented.size !== documentedRows) {
    fail(`docs/skills-reference.md lists ${documentedRows} method rows for ${documented.size} methods - a duplicate row inflates the count`)
  }
  const undocumented = [...routed].filter(name => !documented.has(name))
  if (undocumented.length) {
    fail(`SKILL.md routes skill(s) missing from docs/skills-reference.md: ${undocumented.join(', ')}`)
  }
  // and the other direction: a documented method nothing routes to is a method
  // the agent can never reach, advertised anyway.
  const unrouted = [...documented].filter(name => !routed.has(name))
  if (unrouted.length) {
    fail(`docs/skills-reference.md documents method(s) SKILL.md never routes to: ${unrouted.join(', ')}`)
  }
  for (const rel of ['docs/skills.md', 'docs/skills-reference.md']) {
    const body = read(rel)
    // `-` is a word boundary, so \bingest\b matches inside `ingest-connect`:
    // a method could disappear from the docs behind a hyphenated sibling.
    const absent = [...documented].filter(name => !new RegExp(`(?<![\\w-])${name}(?![\\w-])`).test(body))
    if (absent.length) fail(`${rel} does not list method(s): ${absent.join(', ')}`)
    // every count claim, not just the first: an earlier sentence must not shadow
    // a stale headline (or the reverse).
    const claims = [...body.matchAll(/(\d+)\s+methods/g)].map(m => Number(m[1]))
    if (!claims.length) fail(`${rel} must state how many methods it documents`)
    const wrong = [...new Set(claims.filter(n => n !== documented.size))]
    if (wrong.length) {
      fail(`${rel} claims ${wrong.join('/')} methods; ${documented.size} are documented`)
    }
  }
  ok(`public method count is verifiable (${documented.size} documented, ${routed.size} routed)`)
}

const install = read('bin/install.js')
if (install.includes('scaffoldFdeInProject(process.cwd())')) {
  fail('install.js must not auto-scaffold .fde in customer cwd')
} else if (!install.includes("arg === 'init'")) {
  fail('install.js must support: npx fdeops init <name>')
} else {
  ok('install.js engagement model')
}

if (read('package.json').includes('postinstall')) {
  fail('package.json must not auto-run install on npm postinstall')
} else {
  ok('no surprise postinstall')
}

const readme = read('README.md')
// The README shows one recording: media/session.gif, a real CLI session.
// media/demo.gif is a hand-typed mock kept for history - it must never be embedded,
// or the front door shows output no command actually produced.
if (readme.includes('demo.gif')) fail('README must not embed media/demo.gif (staged mock, not real CLI output)')
else ok('README no staged demo gif')

// The recording may live on the front door or one click in (docs/USAGE.md), but
// it must stay reachable and reproducible - an orphaned gif rots silently.
const recordingHosts = ['README.md', 'docs/USAGE.md'].filter(f => read(f).includes('media/session.gif'))
if (!recordingHosts.length) {
  fail('media/session.gif must be embedded in README.md or docs/USAGE.md (the recorded session is the proof)')
} else if (!recordingHosts.some(f => read(f).includes('media/record-session.sh'))) {
  fail('link media/record-session.sh next to the recording, so it can be re-recorded')
} else {
  const gifPath = path.join(root, 'media', 'session.gif')
  const rec = path.join(root, 'media', 'record-session.sh')
  if (!fs.existsSync(gifPath) || fs.statSync(gifPath).size < 50000) fail('media/session.gif missing or too small')
  else if (!fs.existsSync(rec)) fail('media/record-session.sh missing - the recording must be reproducible')
  else if (!fs.existsSync(path.join(root, 'media', 'session.cast'))) fail('media/session.cast missing - keep the source recording next to the gif')
  else ok(`recorded session in ${recordingHosts.join(' + ')} (gif + reproducible recorder + cast)`)
}

// Every repo-relative README link and image must resolve, or the front door 404s.
const brokenLinks = []
for (const m of readme.matchAll(/(?:\]\(|src=")([^)"#\s]+)(?:\)|")/g)) {
  const target = m[1]
  if (/^(https?:|mailto:|#|\/)/.test(target)) continue
  if (!fs.existsSync(path.join(root, target))) brokenLinks.push(target)
}
if (brokenLinks.length) fail(`README links to missing paths: ${brokenLinks.join(', ')}`)
else ok('README links all resolve')

for (const section of [
  'How it works',
  'Quickstart',
  'Engagement memory',
  'Who this is for',
  'Commands',
  'Principles',
]) {
  if (!readme.includes(section)) fail(`README missing section: ${section}`)
}
if (!readme.includes('AI coding agent')) {
  fail('README must say AI coding agent (not ambiguous "agent")')
}
ok('README clarity sections')

for (const cmd of ['/brief', '/discover', '/plan', '/ship', '/got', '/close', '/debrief', '/prep', '/quiet', '/agreed', '/status']) {
  if (!readme.includes(cmd)) fail(`README must document slash command ${cmd}`)
}
ok('README slash commands documented')

// Front-door map is the embed left-to-right (LAND → CLOSE), not a pile of situations.
if (!readme.slice(0, 4000).includes('LAND') || !readme.slice(0, 4000).includes('/discover')) {
  fail('README must include the LAND→CLOSE command-map diagram near the top')
} else ok('README command-map diagram')

if (readme.includes('your-client-repo')) {
  fail('README must not instruct install in customer repo (your-client-repo)')
} else ok('README no customer-repo install')

if (!readme.includes('fde-engagements') || !/fdeops.*init.*engagement/i.test(readme)) {
  fail('README must document fde-engagements + init flow')
} else ok('README engagement path')

// The contributor-only testing skill lives in .agents/skills/, so a bare
// `skills add` installs it too. The advertised command must name the one skill
// a field user wants.
for (const m of readme.match(/^.*npx skills add .*$/gm) || []) {
  if (!m.includes('--skill fde')) {
    fail(`README skills-add command must pin --skill fde: ${m.trim()}`)
  }
}
ok('README skills install is one skill')

// A skill-only install has no fde on the PATH; the router must reach npx before
// falling back to writing memory by hand.
if (!read('skills/fde/SKILL.md').includes('npx --yes fdeops')) {
  fail('skills/fde/SKILL.md must fall back to npx --yes fdeops when the CLI is not installed')
} else ok('SKILL.md npx CLI fallback')

// The frontmatter description is the only text every host reads before deciding
// to load the skill. If it triggers on "@fde" alone, an FDE who just talks about
// their client gets no memory - so it must carry natural-intent triggers in the
// "Use when …" convention, and @fde must be one of several, never the gate.
{
  const fm = /^---\n([\s\S]*?)\n---/.exec(read('skills/fde/SKILL.md'))
  const desc = fm ? (/^description:[^\S\n]*(.*)$/m.exec(fm[1]) || [])[1] || '' : ''
  const triggers = desc.match(/Use when/g) || []
  if (triggers.length < 4) {
    fail(`SKILL.md description needs several "Use when …" triggers so it fires on intent (found ${triggers.length})`)
  } else if (/Use when the human says @fde or/.test(desc)) {
    fail('SKILL.md description must not gate on @fde - name the client-work intents first')
  } else ok('SKILL.md description triggers on intent')
}

// Six invented words (fieldbook, terrain, reality, trust signal, receipts,
// vault) carry the method. They were never defined in one place, so a stranger
// met them scattered through the docs and guessed.
{
  const gloss = /Words used here[\s\S]{0,1200}/.exec(readme)
  const missing = ['fieldbook', 'reality', 'terrain', 'trust signal', 'receipts', 'vault']
    .filter(w => !gloss || !new RegExp(w, 'i').test(gloss[0]))
  if (!gloss) fail('README must define its invented words once (a "Words used here" line)')
  else if (missing.length) fail(`README glossary is missing: ${missing.join(', ')}`)
  else ok('README defines its own vocabulary')
}

if (!fs.existsSync(path.join(root, 'docs', 'USAGE.md'))) {
  fail('docs/USAGE.md missing')
} else ok('docs/USAGE.md')

if (!readme.includes('FDEOPS_ENGAGEMENT')) {
  fail('README must document FDEOPS_ENGAGEMENT')
} else ok('README FDEOPS_ENGAGEMENT')

const badPhrases = ['team of ten', 'solo 100x', '100x engineer']
for (const phrase of badPhrases) {
  if (readme.toLowerCase().includes(phrase.toLowerCase())) {
    fail(`README must not contain hype phrase: ${phrase}`)
  }
}
// fdeops stands on its own. The README must never frame it as a derivative -
// a fork, port, or rebuild of another project.
const derivativeFraming = [
  /\b(fork of|forked from|port of|rebuild of|reimplementation of|based on)\s+[A-Z]/,
  /\b(inspired by|built on top of|powered by)\s+[A-Z][A-Za-z0-9-]+/,
]
for (const rx of derivativeFraming) {
  if (rx.test(readme)) fail(`README must not frame fdeops as derivative: ${rx}`)
}
if (/docs\/internal|PMF_360/i.test(readme)) {
  fail('README must not link docs/internal or PMF_360')
}
ok('README tone')

if (fs.existsSync(path.join(root, '.codex')) || fs.existsSync(path.join(root, '.opencode'))) {
  fail('.codex/ or .opencode/ must not live at repo root - use docs/internal/experimental-agents/')
} else ok('no root-level experimental stubs')

for (const rel of ['docs/schema.md', 'docs/skills-reference.md', 'PRIVACY.md']) {
  const text = read(rel)
  if (text.includes('your-client-repo') || /scaffold.*project root/i.test(text)) {
    fail(`${rel} contradicts laptop engagement model`)
  }
  if (!text.includes('fde-engagements') && rel !== 'PRIVACY.md') {
    fail(`${rel} should mention fde-engagements default path`)
  }
}
ok('docs aligned with engagement model')

if (!fs.existsSync(path.join(root, 'docs', 'OPERATIONS.md'))) fail('docs/OPERATIONS.md missing')
else ok('docs/OPERATIONS.md')

if (!fs.existsSync(path.join(root, 'docs', 'schema.md'))) fail('docs/schema.md missing')
else ok('docs/schema.md')

if (!fs.existsSync(path.join(root, 'SECURITY.md'))) fail('SECURITY.md missing')
else {
  // A reporting section that only offers GitHub Security Advisories is a dead end
  // whenever private reporting is off for the repo (that page 403s), which is how
  // issue #9 sat unreported. Require a channel that does not depend on a repo setting.
  const sec = read('SECURITY.md')
  if (!/[\w.+-]+@[\w-]+\.[\w.]+/.test(sec)) {
    fail('SECURITY.md must give a reporting channel that works when GitHub private reporting is off (an email address)')
  } else ok('SECURITY.md (reachable reporting channel)')
}

const exampleFiles = ['reality.md', 'decisions.md', 'delivery.md', 'stakeholders.md', 'assumptions.md']
for (const f of exampleFiles) {
  const p = path.join(root, 'examples', 'garvey-payments', '.fde', f)
  if (!fs.existsSync(p)) fail(`examples/garvey-payments/.fde/${f} missing`)
}
ok('examples walkthrough files')

if (fs.existsSync(path.join(root, 'tasks', 'plan.md'))) {
  fail('tasks/plan.md should not be in public tree (move to docs/internal)')
}

if (fs.existsSync(path.join(root, 'patterns'))) {
  fail('patterns/ is deprecated - use skills/ only (overlays live there)')
}

const pmf = path.join(root, 'docs', 'internal', 'PMF_360_REVIEW.md')
if (fs.existsSync(pmf) && !read('docs/internal/PMF_360_REVIEW.md').includes('INTERNAL')) {
  fail('PMF_360_REVIEW.md needs INTERNAL banner')
} else if (fs.existsSync(pmf)) ok('internal PMF banner')

const hook = read('hooks/session-start')
const hookCode = hook.replace(/^[ \t]*#.*$/gm, '')
if (!hook.includes('FDEOPS_ENGAGEMENT')) {
  fail('session-start hook must read FDEOPS_ENGAGEMENT env var')
} else ok('hook FDEOPS_ENGAGEMENT')
if (!hookCode.includes('FDEOPS_ENGAGEMENT="$ENG_DIR" fde triage') ||
    !hookCode.includes('FDEOPS_ENGAGEMENT="$ENG_DIR" node "$FDE_CMD" triage')) {
  fail('session-start must run triage with its resolved engagement')
}
// Token discipline: SessionStart must not dump the full skill (L1 progressive disclosure).
// Strip comments before scanning for a real `cat …SKILL.md` / BOOTSTRAP inject.
if (/\$\(cat\s+"\$BOOTSTRAP"\)|cat\s+"\$BOOTSTRAP"|cat\s+[^\n]*SKILL\.md/.test(hookCode)) {
  fail('session-start must not cat SKILL.md - inject TRIAGE + bounded context + pointer only')
}
if (hookCode.includes('BOOTSTRAP=')) {
  fail('session-start must not resolve BOOTSTRAP skill path for inject')
}
if (!/plain language with @fde|invoke @fde/.test(hook)) {
  fail('session-start must include a lean @fde / plain-language pointer (not full skill)')
}
const skillBody = read('skills/fde/SKILL.md')
if (!skillBody.includes('Human surface vs agent plumbing')) {
  fail('SKILL.md must define human NL surface vs agent CLI plumbing')
}
if (!/never tell the FDE to type|Never tell the FDE to type|never ask the human to type fde/i.test(skillBody)) {
  fail('SKILL.md must forbid asking the human to type fde commands')
}
if (!skillBody.includes('fde prep')) {
  fail('SKILL.md must route walk-in prep to fde prep')
}
if (!skillBody.includes('debrief --smart')) {
  fail('SKILL.md must prefer fde debrief --smart for messy notes')
}
const debriefRef = read('skills/fde/references/debrief.md')
if (!/gate \+ writer|not a brain/i.test(debriefRef) || !/rewrite.*prefix/i.test(debriefRef)) {
  fail('debrief.md must state --smart is a gate (agent rewrites propose with prefixes)')
} else ok('debrief --smart honesty contract')
if (!/existing.*## Next action|never append a second/i.test(skillBody)) {
  fail('SKILL.md must warn against appending a second ## Next action')
} else ok('session-end Next action instruction')
if (!/session digest/i.test(skillBody) || !/Key decisions & why/i.test(skillBody)) {
  fail('SKILL.md memory contract must define session digest (TL;DR / decisions & why → .fde/)')
} else ok('session digest in memory contract')
if (!/transcript/i.test(skillBody) || !/judgment/i.test(skillBody)) {
  fail('SKILL.md must reject transcript dumps in favor of judgment in .fde/')
} else ok('session digest anti-transcript gate')
if (!/\btriage\b/.test(hook)) {
  fail('session-start must still inject TRIAGE')
}
ok('session-start lean inject (no SKILL dump)')

// v3: write-side memory backstop
if (!fs.existsSync(path.join(root, 'hooks', 'session-stop'))) {
  fail('hooks/session-stop missing (write-side memory backstop)')
} else {
  const stopHook = read('hooks/session-stop')
  const stopHookCode = stopHook.replace(/^[ \t]*#.*$/gm, '')
  if (!stopHook.includes('FDEOPS_ENGAGEMENT')) fail('session-stop must resolve FDEOPS_ENGAGEMENT')
  if (!stopHookCode.includes('resolve_fde') || !stopHookCode.includes('command -v fde')) {
    fail('session-stop must resolve PATH fde before plugin copies')
  }
  if (!/FDEOPS_ENGAGEMENT="\$ENG_DIR" (?:fde|node "\$FDE_CMD") capture/.test(stopHookCode)
    && !stopHookCode.includes('run_fde "$FDE_CMD" capture')) {
    fail('session-stop must delegate capture with its resolved engagement')
  }
  ok('session-stop write side')
}
const compactHook = read('hooks/pre-compact')
const compactHookCode = compactHook.replace(/^[ \t]*#.*$/gm, '')
if (!compactHookCode.includes('resolve_fde') || !compactHookCode.includes('command -v fde')) {
  fail('pre-compact must resolve PATH fde before plugin copies')
}
if (!/FDEOPS_ENGAGEMENT="\$ENG_DIR" (?:fde|node "\$FDE_CMD") preserve/.test(compactHookCode)) {
  fail('pre-compact must delegate preserve with its resolved engagement')
}
for (const h of ['session-stop', 'pre-compact']) {
  const body = read('hooks/' + h).replace(/^[ \t]*#.*$/gm, '')
  const contextTarget = /(?:"?\$(?:\{)?CONTEXT_FILE(?:\})?"?|"?\$(?:\{)?ENG_DIR(?:\})?\/context\.md"?)/.source
  const redirectsToContext = new RegExp(`>{1,2}\\s*${contextTarget}`)
  const teesToContext = new RegExp(`\\btee\\b[^\\n]*${contextTarget}`)
  if (redirectsToContext.test(body) || teesToContext.test(body)) {
    fail(`hooks/${h} must not append context.md directly`)
  }
}
ok('mutation hooks delegate CLI writes')
for (const h of ['session-start', 'session-stop', 'pre-compact']) {
  const mode = fs.statSync(path.join(root, 'hooks', h)).mode
  if (!(mode & 0o111)) fail(`hooks/${h} lost its executable bit`)
}
ok('hook exec bits')

// registry-aware hooks: `fde resume --init` binds via <root>/.registry, so every
// hook must consult it or registry-bound users get zero auto-capture. The root
// is FDEOPS_ENGAGEMENTS_ROOT with a ~/fde-engagements default - hooks must use
// the env-aware root (CLI/hook parity), not a hardcoded home path.
for (const h of ['session-start', 'session-stop', 'pre-compact']) {
  const body = read('hooks/' + h)
  if (!/\.registry/.test(body)) fail(`hooks/${h} must consult the workspace registry`)
  if (!body.includes('registry_engagement_dir')) fail(`hooks/${h} missing registry_engagement_dir`)
  if (!body.includes('FDEOPS_ENGAGEMENTS_ROOT')) fail(`hooks/${h} must honor FDEOPS_ENGAGEMENTS_ROOT (CLI/hook root parity)`)
}
ok('hooks registry-aware')

// v3.1: the fde CLI (deterministic core)
if (!fs.existsSync(path.join(root, 'bin', 'fde.js'))) {
  fail('bin/fde.js missing (the deterministic core)')
} else {
  const cliFiles = [
    'bin/fde.js',
    ...fs.readdirSync(path.join(root, 'bin', 'lib'))
      .filter(name => name.endsWith('.js'))
      .map(name => path.join('bin', 'lib', name)),
  ]
  const cliSource = cliFiles.map(read).join('\n')
  for (const sub of ['cmdScan', 'cmdResume', 'cmdLog', 'cmdDebrief', 'cmdIngest', 'cmdReceipts', 'cmdCapture', 'cmdStatus', 'cmdDashboard', 'cmdVault']) {
    if (!cliSource.includes(sub)) fail(`CLI sources missing ${sub}`)
  }
  if (!JSON.parse(read('package.json')).bin.fde) fail('package.json must expose the fde bin')
  if (!read('bin/install.js').includes('fde.js')) fail('install.js must deploy fde.js')
  if (!read('bin/install.js').includes('LIB_SRC')) fail('install.js must deploy bin/lib/')
  if (!read('skills/fde/SKILL.md').includes('fde resume')) fail('SKILL.md must use the CLI for memory ops')
  if (!cliSource.includes('[signal:')) fail('CLI sources must support structured [signal:x] trust tokens')
  if (!cliSource.includes('ASK ON DAY 1')) fail('CLI sources must emit ASK ON DAY 1 questions')
  for (const renderSymbol of ['buildFieldbookHtml', 'dashStyles', 'dashScript', 'FONT_FACE_CSS']) {
    if (!cliSource.includes(renderSymbol)) fail(`CLI sources missing dashboard renderer symbol ${renderSymbol}`)
  }
  if (!read('bin/install.js').includes('FDE_SUBCOMMANDS')) fail('install.js must pass fde subcommands through (npx fdeops scan)')
  ok('fde CLI present and wired')
}
const hooksJson = JSON.parse(read('hooks/hooks.json'))
if (!hooksJson.hooks.SessionEnd) {
  fail('hooks.json must register SessionEnd → session-stop')
} else ok('SessionEnd registered')
if (!read('bin/install.js').includes('session-stop')) {
  fail('install.js must copy session-stop hook')
} else ok('install.js copies session-stop')

const pkg = JSON.parse(read('package.json'))
const plugin = JSON.parse(read('.claude-plugin/plugin.json'))
if (pkg.version !== plugin.version) {
  fail(`version mismatch package.json ${pkg.version} vs plugin ${plugin.version}`)
} else ok('plugin version aligned')
if (plugin.commands !== './.claude/commands' || plugin.skills !== './skills') {
  fail('.claude-plugin/plugin.json must declare skills and commands')
} else {
  for (const cmd of ['brief', 'discover', 'plan', 'ship', 'got', 'close', 'debrief', 'prep', 'quiet', 'agreed', 'status']) {
    const rel = `.claude/commands/${cmd}.md`
    if (!fs.existsSync(path.join(root, rel))) fail(`${rel} missing`)
    else if (!read(rel).includes('@fde')) fail(`${rel} must load @fde`)
  }
  ok('slash commands load @fde')
}

if (!fs.existsSync(path.join(root, 'mcp', 'fdeops-ingest', 'server.js'))) {
  fail('mcp/fdeops-ingest/server.js missing (ingest MCP sink)')
} else if (!read('mcp/fdeops-ingest/server.js').includes('ingest_stage')) {
  fail('ingest MCP must expose ingest_stage')
} else if (!read('skills/fde/references/ingest.md').includes('stage')) {
  fail('skills/fde/references/ingest.md missing stage contract')
} else if (!fs.existsSync(path.join(root, 'skills', 'fde', 'references', 'ingest-connect.md'))) {
  fail('skills/fde/references/ingest-connect.md missing')
} else {
  for (const recipe of ['file.md', 'granola.md', 'slack.md', 'notion.md']) {
    if (!fs.existsSync(path.join(root, 'mcp', 'recipes', recipe))) fail(`mcp/recipes/${recipe} missing`)
  }
  if (!read('README.md').includes('mcp/recipes')) fail('README must point at mcp/recipes for connect clarity')
  ok('ingest MCP + connect recipes + skill reference')
}

// Agent Plugins 1.0.0 conformance (agent-plugins.org/specification).
// plugin.json has a closed schema: an illegal field is fatal to the whole plugin,
// and an mcp.json whose $schema version differs from plugin.json silently disables MCP.
const AP_VERSION = '1.0.0'
const AP_PLUGIN_SCHEMA = `https://agent-plugins.org/schemas/${AP_VERSION}/plugin.schema.json`
const AP_MCP_SCHEMA = `https://agent-plugins.org/schemas/${AP_VERSION}/mcp.schema.json`
const AP_MANIFEST_FIELDS = [
  '$schema', 'name', 'version', 'description', 'author',
  'homepage', 'repository', 'license', 'keywords', 'extensions',
]

const apManifest = JSON.parse(read('plugin.json'))
const apUnknown = Object.keys(apManifest).filter(k => !AP_MANIFEST_FIELDS.includes(k))
if (apManifest.$schema !== AP_PLUGIN_SCHEMA) {
  fail(`plugin.json $schema must be ${AP_PLUGIN_SCHEMA}`)
} else if (apUnknown.length) {
  fail(`plugin.json has non-portable field(s) ${apUnknown.join(', ')} - client-specific data belongs under extensions`)
} else if (!/^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(apManifest.name)) {
  fail(`plugin.json name "${apManifest.name}" violates Agent Plugins name constraints`)
} else if (apManifest.version !== pkg.version) {
  fail(`version mismatch package.json ${pkg.version} vs plugin.json ${apManifest.version}`)
} else ok('agent plugins manifest')

const apMcp = JSON.parse(read('mcp.json'))
const apServers = apMcp.mcpServers || {}
if (apMcp.$schema !== AP_MCP_SCHEMA) {
  fail(`mcp.json $schema must be ${AP_MCP_SCHEMA} (a version mismatch with plugin.json disables MCP)`)
} else if (Object.keys(apMcp).some(k => k !== '$schema' && k !== 'mcpServers')) {
  fail('mcp.json permits only $schema and mcpServers')
} else {
  for (const [name, srv] of Object.entries(apServers)) {
    if (srv.type !== 'stdio') fail(`mcp.json ${name}: fdeops ships stdio servers only (local-only core)`)
    else if (!srv.command || (/[\s/]/.test(srv.command) && !srv.command.startsWith('./'))) {
      fail(`mcp.json ${name}: command must be one executable token or a ./-relative path`)
    } else if ((srv.args || []).some(a => path.isAbsolute(a))) {
      fail(`mcp.json ${name}: args must use \${PLUGIN_ROOT}, never an absolute path`)
    } else if (Object.keys(srv.env || {}).some(k => k === 'PLUGIN_ROOT' || k === 'PLUGIN_DATA')) {
      fail(`mcp.json ${name}: env must not set PLUGIN_ROOT/PLUGIN_DATA (client-supplied)`)
    }
  }
  const ingest = apServers['fdeops-ingest']
  const rootArg = ingest && (ingest.args || []).find(a => String(a).startsWith('${PLUGIN_ROOT}/'))
  const target = rootArg ? String(rootArg).replace('${PLUGIN_ROOT}/', '') : ''
  if (!ingest) fail('mcp.json must declare the fdeops-ingest stdio server')
  else if (!rootArg) fail('mcp.json fdeops-ingest: args must include a ${PLUGIN_ROOT}-relative server path')
  else if (!fs.existsSync(path.join(root, target))) fail(`mcp.json fdeops-ingest points at missing ${target}`)
  else ok('agent plugins mcp config')
}

// A manifest that ships only in git and not in the npm tarball is the worst kind of drift.
for (const manifest of ['plugin.json', 'mcp.json']) {
  if (!(pkg.files || []).includes(manifest)) fail(`package.json files must include ${manifest}`)
  else ok(`${manifest} published to npm`)
}

for (const entry of fs.readdirSync(path.join(root, 'skills'))) {
  const dir = path.join(root, 'skills', entry)
  if (!fs.statSync(dir).isDirectory()) continue
  if (!fs.existsSync(path.join(dir, 'SKILL.md'))) fail(`skills/${entry}/ has no SKILL.md - clients skip it`)
  else ok(`skill ${entry} discoverable`)
}

if (!fs.existsSync(path.join(root, '.github', 'ISSUE_TEMPLATE', 'bug_report.yml'))) {
  fail('GitHub issue template missing')
} else ok('issue templates')

process.exit(failed)
