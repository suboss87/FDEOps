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

// A skill "directory" that is really a symlink points somewhere outside
// ~/.claude/skills that fdeops has no claim on. Writing through it would edit
// files in the user's own tree - refuse even under --force, which is permission
// to take over this location, not to follow it elsewhere.
function isLink(p) {
  try { return fs.lstatSync(p).isSymbolicLink() } catch (_) { return false }
}

// Fingerprint of a skill fdeops itself wrote before markers existed. Anchored on
// the shipped frontmatter, not a bare "fdeops" substring: a skill of the user's
// that merely mentions fdeops in prose is theirs, not ours. Only consulted for a
// directory whose name matches one we ship, and only to overwrite - never to delete.
function wasInstalledByUs(dir) {
  try {
    const md = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8')
    const fm = (md.match(/^---\n([\s\S]*?)\n---/) || [])[1]
    if (!fm) return false
    return /^description:\s*Engagement fieldbook for Forward Deployed Engineers\b/im.test(fm)
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
  const links = []
  for (const dir of LEGACY_SKILL_DIRS) {
    const p = path.join(GLOBAL_SKILLS_DIR, dir)
    if (isLink(p)) { links.push(dir); continue }
    if (!fs.existsSync(path.join(p, 'SKILL.md'))) continue
    if (isManaged(p) || opts.force) {
      fs.rmSync(p, { recursive: true, force: true })
      removed++
    } else {
      skipped.push(dir)
    }
  }
  return { removed, skipped, links }
}

// Copy each skill in, but never over a directory fdeops did not create.
function installSkillDirs(opts = {}) {
  const skipped = []
  const links = []
  const failed = []
  fs.mkdirSync(GLOBAL_SKILLS_DIR, { recursive: true })
  for (const entry of fs.readdirSync(SKILLS_SRC, { withFileTypes: true })) {
    const src = path.join(SKILLS_SRC, entry.name)
    const dest = path.join(GLOBAL_SKILLS_DIR, entry.name)
    if (!entry.isDirectory()) { fs.copyFileSync(src, dest); continue }
    if (isLink(dest)) { links.push(entry.name); continue }
    if (fs.existsSync(dest) && !isManaged(dest) && !opts.force) {
      // Installs predating the marker are still ours: adopt a same-named dir
      // whose SKILL.md is recognizably fdeops', so upgrades keep working.
      if (!wasInstalledByUs(dest)) {
        skipped.push(entry.name)
        continue
      }
      console.log(`  adopt  ~/.claude/skills/${entry.name} (earlier fdeops install)`)
    }
    // One unwritable skill dir must not abort the install with a stack trace:
    // say it in human terms, place the rest, and exit non-zero at the end.
    try {
      copyDir(src, dest)
      markManaged(dest)
    } catch (e) {
      failed.push({ name: entry.name, code: e.code || 'error', path: destPathFor(e.path, src, dest) })
    }
  }
  return { skipped, links, failed }
}

// A failed copy can surface either side of the operation; the user can only fix
// the destination, so never point them at a path inside the package.
function destPathFor(failedPath, src, dest) {
  if (!failedPath) return dest
  if (failedPath === src || failedPath.startsWith(src + path.sep)) {
    return path.join(dest, path.relative(src, failedPath))
  }
  return failedPath
}

function reportCollisions(paths, verb) {
  if (!paths.length) return
  console.log(`  skip   ${paths.length} skill dir(s) fdeops did not create - ${verb} would destroy your own work:`)
  for (const name of paths) console.log(`           ~/.claude/skills/${name}`)
  console.log('         move or delete them yourself, or re-run with --force to let fdeops take them over')
}

function reportLinks(names) {
  if (!names.length) return
  console.log(`  skip   ${names.length} skill path(s) that are symlinks - fdeops will not write through them:`)
  for (const name of names) console.log(`           ~/.claude/skills/${name} -> ${readLinkQuiet(path.join(GLOBAL_SKILLS_DIR, name))}`)
  console.log('         remove the link if you want fdeops to install at that path itself')
}

function readLinkQuiet(p) {
  try { return fs.readlinkSync(p) } catch (_) { return '(unreadable)' }
}

// Anything here means part of the install did not land; cmdInstall exits non-zero.
let installIncomplete = false
function reportFailures(failures) {
  if (!failures.length) return
  installIncomplete = true
  console.log(`  error  ${failures.length} skill dir(s) could not be written:`)
  for (const f of failures) {
    const why = f.code === 'EACCES' || f.code === 'EPERM' ? 'permission denied' : f.code
    console.log(`           ~/.claude/skills/${f.name} - ${why} at ${f.path}`)
  }
  console.log('         fix the permissions (or remove the directory) and re-run - the rest of the install continued')
}

function installSkills(opts = {}) {
  const legacy = removeLegacySkills(opts)
  if (legacy.removed > 0) console.log(`  Removed ${legacy.removed} v2 skill dir(s) (now covered by @fde)`)
  const placed = installSkillDirs(opts)
  reportCollisions(legacy.skipped, 'removing them')
  reportCollisions(placed.skipped, 'overwriting them')
  reportLinks([...new Set([...legacy.links, ...placed.links])])
  reportFailures(placed.failed)
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
  // A partly-installed skill set is not success - a script that ran this must be
  // able to tell, and the reason is already printed above.
  if (installIncomplete) process.exit(1)
}

// `npx fdeops scan` must recon, not install - any fde subcommand passes straight
// through to the CLI (fde.js reads process.argv itself, so require() is enough).
const FDE_SUBCOMMANDS = [
  'demo', 'scan', 'resume', 'triage', 'log', 'debrief', 'ingest', 'prep', 'doctor', 'redact',
  'garden', 'owner', 'receipts', 'capture', 'preserve', 'status', 'dashboard', 'help',
]

const INSTALL_SUBCOMMANDS = ['init', 'adapters', 'install']

function editDistance(a, b) {
  let prev = [...Array(b.length + 1).keys()]
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = row
  }
  return prev[b.length]
}

function nearest(word, known) {
  const w = word.toLowerCase()
  let best = null
  let bestScore = 3
  for (const k of known) {
    const d = editDistance(w, k)
    if (d < bestScore) { best = k; bestScore = d }
  }
  return best
}

const argv = process.argv.slice(2)
const force = argv.includes('--force')
const positional = argv.filter(a => !a.startsWith('-'))
const raw = positional[0]
// `fdeops Demo` is a typo, not a request to rewrite ~/.claude: verbs match
// case-insensitively, and anything unrecognized fails loudly instead of
// falling through to a full install. Asking a question (`--help`, `--version`)
// is not consent to write to the home directory either.
const known = INSTALL_SUBCOMMANDS.concat(FDE_SUBCOMMANDS)
const arg = raw ? known.find(k => k === raw.toLowerCase()) : undefined
const askedHelp = argv.some(a => /^--?(h|help)$/i.test(a))
const askedVersion = argv.some(a => /^--?(v|version)$/i.test(a))

// Flags before the verb belong to fdeops, so an unknown one is a mistake worth
// saying out loud - the alternative is honoring `fdeops --all status` by
// quietly dropping --all.
const FDEOPS_FLAGS = /^--?(force|h|help|v|version)$/i
const leading = (raw === undefined ? argv : argv.slice(0, argv.indexOf(raw))).filter(a => !FDEOPS_FLAGS.test(a))
if (leading.length) {
  console.error(`  fdeops: unknown option '${leading[0]}'${raw ? ` before '${raw}' - put command options after the command: fdeops ${raw} ${leading[0]}` : ''}`)
  console.error('  fdeops itself takes only --force, --help and --version.')
  process.exit(1)
}

if (raw && !arg) {
  const guess = nearest(raw, known)
  console.error(`  fdeops: unknown command '${raw}'${guess ? ` - did you mean '${guess}'?` : ''}`)
  console.error('  Run `npx fdeops help` for the command list, or `npx fdeops` with no arguments to install.')
  process.exit(1)
}

// The verb the user typed may not be argv[0] (`fdeops --force redact ledger`),
// and fde.js reads process.argv itself - hand it back the positional order it
// expects with only the verb's case normalized.
function handOffToCli(verb) {
  // fde.js reads process.argv itself and takes the verb first, so hand it the
  // verb (case-normalized) plus everything the user typed after it. A flag
  // typed BEFORE the verb (`fdeops --force redact ledger`) belongs to fdeops,
  // not to the command - passing it on would make it part of the command's own
  // arguments (here: a search term of "--force ledger").
  const at = raw === undefined ? -1 : argv.indexOf(raw)
  const rest = at === -1 ? [] : argv.slice(at + 1)
  process.argv = [process.argv[0], process.argv[1], verb, ...rest]
  require(path.join(__dirname, 'fde.js'))
}

if (!raw && askedVersion) {
  console.log(require(path.join(__dirname, '..', 'package.json')).version)
} else if (!raw && askedHelp) {
  handOffToCli('help')
} else if (arg === 'init') {
  cmdInit(positional[1])
} else if (arg === 'adapters') {
  cmdAdapters(positional[1], { force })
} else if (arg && arg !== 'install') {
  handOffToCli(arg)
} else {
  cmdInstall({ force })
}
