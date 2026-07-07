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
  'land.md', 'discover.md', 'audit.md', 'plan.md', 'build.md', 'review.md',
  'debug.md', 'rescue.md', 'ship.md', 'sketch.md', 'close.md', 'dashboard.md',
  'debrief.md', 'status.md', 'demo-prep.md',
  'healthcare.md', 'fintech.md', 'gov.md',
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
if (readme.includes('demo.gif')) fail('README must not embed demo.gif (removed for clarity)')
else ok('README no demo gif')

for (const section of [
  'How it works',
  'Quickstart',
  'Engagement memory',
  'Who this is for',
  'Without fdeops vs with fdeops',
  'Principles',
]) {
  if (!readme.includes(section)) fail(`README missing section: ${section}`)
}
if (!readme.includes('AI coding agent')) {
  fail('README must say AI coding agent (not ambiguous "agent")')
}
ok('README clarity sections')

if (readme.includes('your-client-repo')) {
  fail('README must not instruct install in customer repo (your-client-repo)')
} else ok('README no customer-repo install')

if (!readme.includes('fde-engagements') || !/fdeops.*init.*engagement/i.test(readme)) {
  fail('README must document fde-engagements + init flow')
} else ok('README engagement path')

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
else ok('SECURITY.md')

const exampleFiles = ['reality.md', 'decisions.md', 'delivery.md', 'stakeholders.md']
for (const f of exampleFiles) {
  const p = path.join(root, 'examples', 'acme-payments', '.fde', f)
  if (!fs.existsSync(p)) fail(`examples/acme-payments/.fde/${f} missing`)
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
if (!hook.includes('FDEOPS_ENGAGEMENT')) {
  fail('session-start hook must read FDEOPS_ENGAGEMENT env var')
} else ok('hook FDEOPS_ENGAGEMENT')

// v3: write-side memory backstop
if (!fs.existsSync(path.join(root, 'hooks', 'session-stop'))) {
  fail('hooks/session-stop missing (write-side memory backstop)')
} else {
  const stopHook = read('hooks/session-stop')
  if (!stopHook.includes('FDEOPS_ENGAGEMENT')) fail('session-stop must resolve FDEOPS_ENGAGEMENT')
  if (!stopHook.includes('context.md')) fail('session-stop must append to context.md')
  ok('session-stop write side')
}
for (const h of ['session-start', 'session-stop', 'pre-compact']) {
  const mode = fs.statSync(path.join(root, 'hooks', h)).mode
  if (!(mode & 0o111)) fail(`hooks/${h} lost its executable bit`)
}
ok('hook exec bits')

// registry-aware hooks: `fde resume --init` binds via ~/fde-engagements/.registry,
// so every hook must consult it or registry-bound users get zero auto-capture
for (const h of ['session-start', 'session-stop', 'pre-compact']) {
  const body = read('hooks/' + h)
  if (!body.includes('fde-engagements/.registry')) fail(`hooks/${h} must consult the workspace registry`)
  if (!body.includes('registry_engagement_dir')) fail(`hooks/${h} missing registry_engagement_dir`)
}
ok('hooks registry-aware')

// v3.1: the fde CLI (deterministic core)
if (!fs.existsSync(path.join(root, 'bin', 'fde.js'))) {
  fail('bin/fde.js missing (the deterministic core)')
} else {
  const cli = read('bin/fde.js')
  for (const sub of ['cmdScan', 'cmdResume', 'cmdLog', 'cmdDebrief', 'cmdReceipts', 'cmdCapture', 'cmdStatus']) {
    if (!cli.includes(sub)) fail(`fde.js missing ${sub}`)
  }
  if (!JSON.parse(read('package.json')).bin.fde) fail('package.json must expose the fde bin')
  if (!read('bin/install.js').includes('fde.js')) fail('install.js must deploy fde.js')
  if (!read('skills/fde/SKILL.md').includes('fde resume')) fail('SKILL.md must use the CLI for memory ops')
  if (!cli.includes('[signal:')) fail('fde.js must support structured [signal:x] trust tokens')
  if (!cli.includes('ASK ON DAY 1')) fail('fde.js scan must emit ASK ON DAY 1 questions')
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

if (!fs.existsSync(path.join(root, '.github', 'ISSUE_TEMPLATE', 'bug_report.yml'))) {
  fail('GitHub issue template missing')
} else ok('issue templates')

process.exit(failed)
