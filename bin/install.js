#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const os = require('os')

const SKILLS_SRC = path.join(__dirname, '..', 'skills')
const HOOKS_SRC = path.join(__dirname, '..', 'hooks')
const CLAUDE_MD_SRC = path.join(__dirname, '..', 'CLAUDE.md.template')
const FDE_TEMPLATES_SRC = path.join(__dirname, '..', 'templates', '.fde')
const ADAPTERS_SRC = path.join(__dirname, '..', 'adapters')
const LIB_SRC = path.join(__dirname, 'lib')

const GLOBAL_SKILLS_DIR = path.join(os.homedir(), '.claude', 'skills')
const GLOBAL_HOOKS_DIR = path.join(os.homedir(), '.claude', 'hooks')
const HOOK_SCRIPTS = ['session-start', 'session-stop', 'pre-compact']
const ENGAGEMENTS_ROOT = path.join(os.homedir(), 'fde-engagements')

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function copyTemplateTree(src, dest, onlyMissing) {
  let merged = 0
  fs.mkdirSync(dest, { recursive: true })
  for (const name of fs.readdirSync(src)) {
    const srcPath = path.join(src, name)
    const destPath = path.join(dest, name)
    if (fs.statSync(srcPath).isDirectory()) {
      merged += copyTemplateTree(srcPath, destPath, onlyMissing)
    } else if (!onlyMissing || !fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath)
      if (onlyMissing) merged++
    }
  }
  return merged
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'engagement'
}

// Written into every skill directory this installer creates. Nothing is ever
// removed or overwritten without it: `healthcare-fde` and `fintech-fde` are
// plausible names for a skill the user wrote themselves, and a name collision
// must be reported, not silently resolved by deleting their work.
const MANAGED_MARKER = '.fdeops-managed'

function markManaged(dir) {
  let version = 'unknown'
  try { version = require(path.join(__dirname, '..', 'package.json')).version } catch (_) {}
  try {
    fs.writeFileSync(
      path.join(dir, MANAGED_MARKER),
      `managed-by: fdeops\nversion: ${version}\ninstalled: ${new Date().toISOString()}\n` +
      'Delete this file to make fdeops treat the directory as yours and leave it alone.\n',
    )
  } catch (_) {}
}

function isManaged(dir) {
  return fs.existsSync(path.join(dir, MANAGED_MARKER))
}

// Fingerprint of a skill fdeops itself wrote before markers existed: the shipped
// SKILL.md names the fdeops engagement brain. Only consulted for a directory
// whose name matches one we ship, and only to overwrite it - never to delete.
function wasInstalledByUs(dir) {
  try {
    const md = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8')
    return /engagement fieldbook for forward deployed engineers/i.test(md) || /fdeops/i.test(md)
  } catch (_) { return false }
}

// v2 shipped 16 standalone skills; v3 is one `fde` skill + references.
// Leaving the old ones in place would route users to stale content.
const LEGACY_SKILL_DIRS = [
  'fde-land', 'fde-discover', 'fde-audit', 'fde-rescue', 'fde-sketch',
  'fde-close', 'fde-engineering', 'fde-plan', 'fde-build', 'fde-review',
  'fde-debug', 'fde-ship', 'fde-dashboard', 'healthcare-fde', 'fintech-fde',
  'gov-fde',
]

function removeLegacySkills(opts = {}) {
  let removed = 0
  const skipped = []
  for (const dir of LEGACY_SKILL_DIRS) {
    const p = path.join(GLOBAL_SKILLS_DIR, dir)
    if (!fs.existsSync(path.join(p, 'SKILL.md'))) continue
    if (isManaged(p) || opts.force) {
      fs.rmSync(p, { recursive: true, force: true })
      removed++
    } else {
      skipped.push(dir)
    }
  }
  return { removed, skipped }
}

// Copy each skill in, but never over a directory fdeops did not create.
function installSkillDirs(opts = {}) {
  const skipped = []
  fs.mkdirSync(GLOBAL_SKILLS_DIR, { recursive: true })
  for (const entry of fs.readdirSync(SKILLS_SRC, { withFileTypes: true })) {
    const src = path.join(SKILLS_SRC, entry.name)
    const dest = path.join(GLOBAL_SKILLS_DIR, entry.name)
    if (!entry.isDirectory()) { fs.copyFileSync(src, dest); continue }
    if (fs.existsSync(dest) && !isManaged(dest) && !opts.force) {
      // Installs predating the marker are still ours: adopt a same-named dir
      // whose SKILL.md is recognizably fdeops', so upgrades keep working.
      if (!wasInstalledByUs(dest)) {
        skipped.push(entry.name)
        continue
      }
      console.log(`  adopt  ~/.claude/skills/${entry.name} (earlier fdeops install)`)
    }
    copyDir(src, dest)
    markManaged(dest)
  }
  return { skipped }
}

function reportCollisions(paths, verb) {
  if (!paths.length) return
  console.log(`  skip   ${paths.length} skill dir(s) fdeops did not create - ${verb} would destroy your own work:`)
  for (const name of paths) console.log(`           ~/.claude/skills/${name}`)
  console.log('         move or delete them yourself, or re-run with --force to let fdeops take them over')
}

function installSkills(opts = {}) {
  const legacy = removeLegacySkills(opts)
  if (legacy.removed > 0) console.log(`  Removed ${legacy.removed} v2 skill dir(s) (now covered by @fde)`)
  const placed = installSkillDirs(opts)
  reportCollisions(legacy.skipped, 'removing them')
  reportCollisions(placed.skipped, 'overwriting them')
  fs.mkdirSync(GLOBAL_HOOKS_DIR, { recursive: true })
  for (const name of HOOK_SCRIPTS) {
    const src = path.join(HOOKS_SRC, name)
    if (!fs.existsSync(src)) continue
    const dest = path.join(GLOBAL_HOOKS_DIR, `fdeops-${name}`)
    fs.copyFileSync(src, dest)
    try {
      fs.chmodSync(dest, '755')
    } catch (_) {}
  }
  const globalPointer = path.join(os.homedir(), '.claude', 'FDEOPS-CLAUDE.md')
  if (!fs.existsSync(globalPointer)) {
    fs.copyFileSync(CLAUDE_MD_SRC, globalPointer)
  }
  fs.copyFileSync(CLAUDE_MD_SRC, path.join(os.homedir(), '.claude', 'FDEOPS-CLAUDE.md.template'))

  // the fde CLI + templates, so the skill can call it from any workspace
  const cliHome = path.join(os.homedir(), '.claude', 'fdeops')
  fs.mkdirSync(cliHome, { recursive: true })
  fs.copyFileSync(path.join(__dirname, 'fde.js'), path.join(cliHome, 'fde.js'))
  copyDir(LIB_SRC, path.join(cliHome, 'lib'))
  try { fs.chmodSync(path.join(cliHome, 'fde.js'), '755') } catch (_) {}
  copyDir(FDE_TEMPLATES_SRC, path.join(cliHome, 'templates', '.fde'))

  // cross-platform pointer templates, so `fdeops adapters` works from anywhere
  if (fs.existsSync(ADAPTERS_SRC)) copyDir(ADAPTERS_SRC, path.join(cliHome, 'adapters'))
}

// One brain (skills/fde/SKILL.md) reached through a thin pointer per tool.
// Each tool reads a different file in a different place; the content is the same.
const ADAPTER_TARGETS = [
  { label: 'CLAUDE.md', dest: 'CLAUDE.md', src: CLAUDE_MD_SRC, appendable: true },
  { label: 'AGENTS.md', dest: 'AGENTS.md', src: path.join(ADAPTERS_SRC, 'AGENTS.md'), appendable: true },
  { label: 'GEMINI.md', dest: 'GEMINI.md', src: path.join(ADAPTERS_SRC, 'GEMINI.md'), appendable: true },
  { label: '.github/copilot-instructions.md', dest: path.join('.github', 'copilot-instructions.md'), src: path.join(ADAPTERS_SRC, 'copilot-instructions.md'), appendable: true },
  { label: '.cursor/rules/fde.mdc', dest: path.join('.cursor', 'rules', 'fde.mdc'), src: path.join(ADAPTERS_SRC, 'cursor.fde.mdc'), appendable: false },
]

const FDE_MARKER = '<!-- fdeops adapter - points your AI tool at @fde; safe to keep -->'

function placePointer(destPath, content, label, appendable) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  if (fs.existsSync(destPath)) {
    const existing = fs.readFileSync(destPath, 'utf8')
    if (/FDEOS|fdeops/i.test(existing)) {
      console.log(`  skip   ${label} (already wired)`)
      return
    }
    if (!appendable) {
      console.log(`  skip   ${label} (exists - left untouched)`)
      return
    }
    fs.writeFileSync(destPath, `${existing.trimEnd()}\n\n${FDE_MARKER}\n\n${content}`)
    console.log(`  append ${label}`)
    return
  }
  fs.writeFileSync(destPath, content)
  console.log(`  write  ${label}`)
}

function cmdAdapters(targetDir, opts = {}) {
  const dest = path.resolve(targetDir || process.cwd())
  console.log('')
  console.log(`  fdeops cross-platform adapters → ${dest}`)
  console.log('  One brain (skills/fde/SKILL.md). These are thin pointers per tool.')
  console.log('')
  // The pointers below all point at ~/.claude/skills/fde/SKILL.md. Only the
  // default install (bare `npx fdeops` / `node bin/install.js`) used to place
  // that file - `adapters` alone wrote pointers to a brain that didn't exist
  // yet, a dangling reference for anyone following the documented Cursor/Codex
  // path. installSkills() is idempotent (safe to call every run).
  if (!fs.existsSync(path.join(GLOBAL_SKILLS_DIR, 'fde', 'SKILL.md'))) {
    installSkills(opts)
    console.log('  Skills → ~/.claude/skills/  (installed - the pointers below need this)')
    console.log('')
  }
  for (const a of ADAPTER_TARGETS) {
    if (!fs.existsSync(a.src)) { console.log(`  skip   ${a.label} (template missing)`); continue }
    placePointer(path.join(dest, a.dest), fs.readFileSync(a.src, 'utf8'), a.label, a.appendable)
  }
  console.log('')
  console.log('  Open this workspace in Claude Code, Cursor, Codex, Gemini CLI, or Copilot')
  console.log('  and type @fde - each tool now routes to the same engagement brain.')
  console.log('')
}

function cmdInit(engagementName) {
  if (!engagementName) {
    console.error('  Usage: node bin/install.js init <engagement-name>')
    console.error('  Example: node bin/install.js init retailbank-payments')
    process.exit(1)
  }
  const slug = slugify(engagementName)
  const root = path.join(ENGAGEMENTS_ROOT, slug)
  const fdeDir = path.join(root, '.fde')
  const created = !fs.existsSync(fdeDir)
  const merged = copyTemplateTree(FDE_TEMPLATES_SRC, fdeDir, !created)

  const pointer = path.join(root, 'ENGAGEMENT.md')
  if (!fs.existsSync(pointer)) {
    fs.writeFileSync(
      pointer,
      `# ${engagementName}\n\nEngagement root: \`${fdeDir}\`\n\nPoint your **AI coding agent** at this folder (not a human colleague). Add to ~/.claude/FDEOPS-CLAUDE.md:\n\n\`\`\`\nFDEOPS_ENGAGEMENT=${fdeDir}\n\`\`\`\n\nOpen your workspace. In the AI chat, type \`@fde\`.\n`,
    )
  }

  console.log('')
  console.log('  fdeops engagement created (private notes on your machine)')
  console.log('')
  console.log(`  ${fdeDir}`)
  if (created) console.log('  (new)')
  else if (merged > 0) console.log(`  (${merged} missing template file(s) added)`)
  console.log('')
  console.log('  Next:')
  console.log('  1. Open your workspace for this engagement')
  console.log(`  2. Point your AI coding agent at: FDEOPS_ENGAGEMENT=${fdeDir}`)
  console.log('  3. In the AI chat (not email), type: @fde and describe what is happening')
  console.log('')
}

function cmdInstall(opts = {}) {
  console.log('')
  console.log('  fdeops - installs on YOUR machine only')
  console.log('')
  installSkills(opts)
  console.log('  Skills → ~/.claude/skills/')
  console.log('  Hooks → ~/.claude/hooks/fdeops-*')
  console.log('  CLI → ~/.claude/fdeops/fde.js  (try: node ~/.claude/fdeops/fde.js scan)')
  console.log('')
  console.log('  Create an engagement (stays off customer infrastructure):')
  console.log('    node bin/install.js init <engagement-name>')
  console.log('')
  console.log('  Example:')
  console.log('    node bin/install.js init garvey-payments')
  console.log('  (npm 3.0.0+: npx fdeops@latest init <engagement-name>)')
  console.log('')
  console.log('  Use another AI tool (Cursor, Codex, Gemini CLI, Copilot)? Wire it up:')
  console.log('    node bin/install.js adapters <engagement-workspace>')
  console.log('')
  console.log('  Then open your workspace and use @fde')
  console.log('  Docs: docs/install.md')
  console.log('')
}

// `npx fdeops scan` must recon, not install - any fde subcommand passes straight
// through to the CLI (fde.js reads process.argv itself, so require() is enough).
const FDE_SUBCOMMANDS = [
  'scan', 'resume', 'triage', 'log', 'debrief', 'ingest', 'prep', 'doctor', 'redact',
  'garden', 'owner', 'receipts', 'capture', 'status', 'dashboard', 'help',
]

const argv = process.argv.slice(2)
const force = argv.includes('--force')
const positional = argv.filter(a => a !== '--force')
const arg = positional[0]
if (arg === 'init') {
  cmdInit(positional[1])
} else if (arg === 'adapters') {
  cmdAdapters(positional[1], { force })
} else if (FDE_SUBCOMMANDS.includes(arg)) {
  require(path.join(__dirname, 'fde.js'))
} else {
  cmdInstall({ force })
}
