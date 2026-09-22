const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { spawnSync } = require('node:child_process')
const installer = path.resolve(__dirname, '../bin/install.js')

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fdeops-install-safe-')))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const home = path.join(root, 'home')
  const workspace = path.join(root, 'workspace')
  fs.mkdirSync(home)
  fs.mkdirSync(workspace)
  const outside = path.join(root, 'outside')
  fs.mkdirSync(outside)
  const sentinel = path.join(outside, 'sentinel.md')
  fs.writeFileSync(sentinel, 'user-owned evidence\n')
  const run = (...args) => spawnSync(process.execPath, [installer, ...args], {
    cwd: workspace, env: { ...process.env, HOME: home, USERPROFILE: home }, encoding: 'utf8',
  })
  return { root, home, workspace, outside, sentinel, run }
}

for (const nested of ['SKILL.md', 'references', '.fdeops-managed']) {
  test(`install refuses nested ${nested} symlinks and completes independent components`, t => {
    const f = fixture(t)
    const skill = path.join(f.home, '.claude/skills/fde')
    fs.mkdirSync(skill, { recursive: true })
    if (nested !== '.fdeops-managed') fs.writeFileSync(path.join(skill, '.fdeops-managed'), 'managed-by: fdeops\n')
    fs.symlinkSync(nested === 'references' ? f.outside : f.sentinel, path.join(skill, nested))
    for (const args of [[], ['--force']]) {
      const result = f.run(...args)
      assert.equal(result.status, 1, result.stdout + result.stderr)
      assert.match(result.stdout + result.stderr, /unsafe.*path|symlink/i)
      assert.doesNotMatch(result.stderr, /node:internal|at Object/)
      assert.equal(fs.readFileSync(f.sentinel, 'utf8'), 'user-owned evidence\n')
      assert.deepEqual(fs.readdirSync(f.outside), ['sentinel.md'])
      assert.equal(fs.existsSync(path.join(f.home, '.claude/fdeops/fde.js')), true)
      assert.equal(fs.lstatSync(path.join(skill, nested)).isSymbolicLink(), true)
    }
  })
}

for (const dest of ['.claude', '.claude/skills', '.claude/hooks', '.claude/fdeops', 'fde-engagements']) {
  test(`installer refuses parent link ${dest}`, t => {
    const f = fixture(t)
    const link = path.join(f.home, dest)
    fs.mkdirSync(path.dirname(link), { recursive: true })
    fs.symlinkSync(f.outside, link)
    const result = dest === 'fde-engagements' ? f.run('init', 'example') : f.run('--force')
    assert.equal(result.status, 1, result.stdout + result.stderr)
    assert.match(result.stdout + result.stderr, /symlink/i)
    assert.deepEqual(fs.readdirSync(f.outside), ['sentinel.md'])
  })
}

for (const dest of ['AGENTS.md', '.github', '.cursor/rules']) {
  test(`adapters preserves linked ${dest}, reports partial error, and can recover`, t => {
    const f = fixture(t)
    const link = path.join(f.workspace, dest)
    fs.mkdirSync(path.dirname(link), { recursive: true })
    fs.symlinkSync(dest.endsWith('.md') ? f.sentinel : f.outside, link)
    const result = f.run('adapters', f.workspace)
    assert.equal(result.status, 1, result.stdout + result.stderr)
    assert.match(result.stderr, /symlink/i)
    assert.equal(fs.readFileSync(f.sentinel, 'utf8'), 'user-owned evidence\n')
    assert.deepEqual(fs.readdirSync(f.outside), ['sentinel.md'])
    assert.equal(fs.existsSync(path.join(f.workspace, 'GEMINI.md')), true)
    fs.unlinkSync(link)
    assert.equal(f.run('adapters', f.workspace).status, 0)
    const first = fs.readFileSync(path.join(f.workspace, 'AGENTS.md'), 'utf8')
    assert.equal(f.run('adapters', f.workspace).status, 0)
    assert.equal(fs.readFileSync(path.join(f.workspace, 'AGENTS.md'), 'utf8'), first)
  })
}

test('repeated install and init preserve personal notes and merge missing templates', t => {
  const f = fixture(t)
  assert.equal(f.run().status, 0)
  const notes = path.join(f.home, '.claude/skills/fde/personal-notes.md')
  fs.writeFileSync(notes, 'my notes')
  assert.equal(f.run().status, 0)
  assert.equal(fs.readFileSync(notes, 'utf8'), 'my notes')
  assert.equal(f.run('init', 'example').status, 0)
  const memory = path.join(f.home, 'fde-engagements/example/.fde')
  const files = fs.readdirSync(memory).filter(name => fs.statSync(path.join(memory, name)).isFile())
  const kept = path.join(memory, files[0])
  const missing = path.join(memory, files[1])
  fs.writeFileSync(kept, 'client notes')
  fs.unlinkSync(missing)
  assert.equal(f.run('init', 'example').status, 0)
  assert.equal(fs.readFileSync(kept, 'utf8'), 'client notes')
  assert.equal(fs.existsSync(missing), true)
})

test('a symlinked ownership marker does not authorize deleting a legacy skill', t => {
  const f = fixture(t)
  const legacy = path.join(f.home, '.claude/skills/fde-land')
  fs.mkdirSync(legacy, { recursive: true })
  fs.writeFileSync(path.join(legacy, 'SKILL.md'), 'user skill')
  fs.symlinkSync(f.sentinel, path.join(legacy, '.fdeops-managed'))
  assert.equal(f.run().status, 1)
  assert.equal(fs.readFileSync(path.join(legacy, 'SKILL.md'), 'utf8'), 'user skill')
  assert.equal(fs.readFileSync(f.sentinel, 'utf8'), 'user-owned evidence\n')
})

for (const dest of ['.claude/hooks/fdeops-session-start', '.claude/FDEOPS-CLAUDE.md.template', '.claude/fdeops/fde.js']) {
  test(`install protects symlinked file ${dest}`, t => {
    const f = fixture(t)
    const link = path.join(f.home, dest)
    fs.mkdirSync(path.dirname(link), { recursive: true })
    fs.symlinkSync(f.sentinel, link)
    const result = f.run('--force')
    assert.equal(result.status, 1, result.stdout + result.stderr)
    assert.match(result.stdout + result.stderr, /symlink/i)
    assert.equal(fs.readFileSync(f.sentinel, 'utf8'), 'user-owned evidence\n')
    assert.equal(fs.lstatSync(link).isSymbolicLink(), true)
  })
}

test('init refuses dangling template symlinks without creating their target', t => {
  const f = fixture(t)
  assert.equal(f.run('init', 'example').status, 0)
  const memory = path.join(f.home, 'fde-engagements/example/.fde')
  const template = fs.readdirSync(memory).find(name => fs.statSync(path.join(memory, name)).isFile())
  const dest = path.join(memory, template)
  const outside = path.join(f.outside, 'must-not-create.md')
  fs.unlinkSync(dest)
  fs.symlinkSync(outside, dest)
  const result = f.run('init', 'example')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /symlink/i)
  assert.equal(fs.existsSync(outside), false)
})

test('adapter writes refuse hard links to files outside the workspace', t => {
  const f = fixture(t)
  fs.linkSync(f.sentinel, path.join(f.workspace, 'AGENTS.md'))
  const result = f.run('adapters', f.workspace)
  assert.equal(result.status, 1)
  assert.equal(fs.readFileSync(f.sentinel, 'utf8'), 'user-owned evidence\n')
  assert.match(result.stderr, /non-regular path/i)
})

test('adapters refuse an existing brain reached through a linked parent', t => {
  const f = fixture(t)
  assert.equal(f.run().status, 0)
  const skills = path.join(f.home, '.claude/skills')
  const moved = path.join(f.outside, 'skills')
  fs.renameSync(skills, moved)
  fs.symlinkSync(moved, skills)
  const result = f.run('adapters', f.workspace)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /symlink/i)
  assert.deepEqual(fs.readdirSync(f.workspace), [])
})


test('macOS system temporary-directory aliases remain usable', { skip: process.platform !== 'darwin' }, t => {
  const f = fixture(t)
  const { checkPath } = require('../bin/lib/install-paths')
  const temp = fs.mkdtempSync('/tmp/fdeops-os-alias-')
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }))
  assert.doesNotThrow(() => checkPath(path.join(temp, 'new-file')))
  assert.doesNotThrow(() => checkPath(path.join(os.tmpdir(), 'fdeops-new-file')))
  const child = path.join(temp, 'client')
  fs.symlinkSync(f.outside, child)
  assert.throws(() => checkPath(path.join(child, 'new-file')), /unsafe/)
})

test('reintroduced standalone entries survive reinstall without deleting personal additions', t => {
  const f = fixture(t)
  assert.equal(f.run().status, 0)
  const skill = path.join(f.home, '.claude/skills/build')
  const notes = path.join(skill, 'personal-notes.md')
  fs.writeFileSync(notes, 'retain my field checklist')
  assert.equal(f.run().status, 0)
  assert.equal(fs.readFileSync(notes, 'utf8'), 'retain my field checklist')
  assert.ok(fs.existsSync(path.join(skill, 'references/build.md')))
  assert.ok(fs.existsSync(path.join(skill, 'references/task-context.md')))
})

test('standalone catalog preserves a conflicting user-owned skill', t => {
  const f = fixture(t)
  const skill = path.join(f.home, '.claude/skills/build')
  fs.mkdirSync(skill, { recursive: true })
  fs.writeFileSync(path.join(skill, 'SKILL.md'), '# My personal builder\n')
  const result = f.run()
  assert.equal(fs.readFileSync(path.join(skill, 'SKILL.md'), 'utf8'), '# My personal builder\n')
  assert.match(result.stdout + result.stderr, /build/)
  assert.equal(fs.existsSync(path.join(skill, 'references')), false)
})


function previousTask(f, name, managed = true) {
  const dir = path.join(f.home, '.claude/skills', `fde-${name}`)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `personalized old ${name}`)
  fs.mkdirSync(path.join(dir, 'personal'))
  fs.writeFileSync(path.join(dir, 'personal/notes.md'), 'retain all my notes')
  if (managed) fs.writeFileSync(path.join(dir, '.fdeops-managed'), 'managed-by: fdeops\nversion: 4.1.1\n')
  return dir
}

test('upgrade archives all fourteen managed names and personalized files after successful replacement', t => {
  const f = fixture(t)
  // Historical release fixture: intentionally independent of today's catalog.
  const previousNames = ['discover', 'scope', 'options', 'poc', 'build', 'integrate', 'debug', 'review', 'evaluate', 'qa', 'ship', 'readout', 'handoff', 'feedback']
  for (const name of previousNames) previousTask(f, name)
  const result = f.run()
  assert.equal(result.status, 0, result.stdout + result.stderr)
  const backups = path.join(f.home, '.claude/fdeops/skill-backups')
  const archives = fs.readdirSync(backups)
  assert.equal(archives.length, 14)
  for (const name of previousNames) {
    assert.equal(fs.existsSync(path.join(f.home, '.claude/skills', `fde-${name}`)), false)
    assert.ok(fs.existsSync(path.join(f.home, '.claude/skills', name, 'SKILL.md')))
    const archived = path.join(backups, archives.find(entry => entry.startsWith(`fde-${name}-`)), `fde-${name}`)
    assert.equal(fs.readFileSync(path.join(archived, 'SKILL.md'), 'utf8'), `personalized old ${name}`)
    assert.equal(fs.readFileSync(path.join(archived, 'personal/notes.md'), 'utf8'), 'retain all my notes')
  }
  assert.equal(f.run().status, 0)
  assert.deepEqual(fs.readdirSync(backups), archives)
})

test('new catalog names do not claim unrelated prefixed skills or mark installation incomplete', t => {
  const f = fixture(t)
  const unrelated = previousTask(f, 'connect', false)
  for (const args of [[], ['--force']]) {
    const result = f.run(...args)
    assert.equal(result.status, 0, result.stdout + result.stderr)
    assert.equal(fs.readFileSync(path.join(unrelated, 'SKILL.md'), 'utf8'), 'personalized old connect')
    assert.equal(fs.readFileSync(path.join(unrelated, 'personal/notes.md'), 'utf8'), 'retain all my notes')
    assert.ok(fs.existsSync(path.join(f.home, '.claude/skills/connect/SKILL.md')))
    assert.equal(fs.existsSync(path.join(f.home, '.claude/fdeops/skill-backups')), false)
    assert.doesNotMatch(result.stdout, /ownership unknown/)
  }
})

for (const name of ['build', 'review', 'discover']) {
  test(`generic ${name} collision preserves both user skill and old managed task`, t => {
    const f = fixture(t)
    const old = previousTask(f, name)
    const dest = path.join(f.home, '.claude/skills', name)
    fs.mkdirSync(dest)
    fs.writeFileSync(path.join(dest, 'SKILL.md'), 'my existing task')
    const result = f.run()
    assert.equal(result.status, 1)
    assert.equal(fs.readFileSync(path.join(dest, 'SKILL.md'), 'utf8'), 'my existing task')
    assert.equal(fs.readFileSync(path.join(old, 'personal/notes.md'), 'utf8'), 'retain all my notes')
    assert.ok(fs.existsSync(path.join(old, 'SKILL.md')))
    assert.equal(fs.existsSync(path.join(f.home, '.claude/fdeops/skill-backups')), false)
  })
}

for (const kind of ['symlink', 'hardlink', 'file']) {
  test(`refused ${kind} replacement preserves the old managed task`, t => {
    const f = fixture(t)
    const old = previousTask(f, 'build')
    const dest = path.join(f.home, '.claude/skills/build')
    if (kind === 'file') fs.writeFileSync(dest, 'user file')
    else {
      fs.mkdirSync(dest)
      fs.writeFileSync(path.join(dest, '.fdeops-managed'), 'managed-by: fdeops\n')
      if (kind === 'symlink') fs.symlinkSync(f.sentinel, path.join(dest, 'SKILL.md'))
      else fs.linkSync(f.sentinel, path.join(dest, 'SKILL.md'))
    }
    const result = f.run()
    assert.equal(result.status, 1, result.stdout + result.stderr)
    assert.equal(fs.readFileSync(path.join(old, 'SKILL.md'), 'utf8'), 'personalized old build')
    assert.equal(fs.readFileSync(path.join(old, 'personal/notes.md'), 'utf8'), 'retain all my notes')
    assert.equal(fs.readFileSync(f.sentinel, 'utf8'), 'user-owned evidence\n')
  })
}

test('unmarked prefixed skills require manual cleanup even with force', t => {
  const f = fixture(t)
  const old = previousTask(f, 'build', false)
  for (const args of [[], ['--force']]) {
    const result = f.run(...args)
    assert.equal(result.status, 1)
    assert.match(result.stdout, /ownership unknown.*manually/)
    assert.equal(fs.readFileSync(path.join(old, 'SKILL.md'), 'utf8'), 'personalized old build')
  }
})

for (const kind of ['symlink', 'hardlink']) {
  test(`migration leaves unsafe old ${kind} content untouched`, t => {
    const f = fixture(t)
    const old = previousTask(f, 'build')
    const target = path.join(old, 'personal/external.md')
    if (kind === 'symlink') fs.symlinkSync(f.sentinel, target)
    else fs.linkSync(f.sentinel, target)
    const result = f.run()
    assert.equal(result.status, 1)
    assert.ok(fs.existsSync(path.join(old, 'SKILL.md')))
    assert.equal(fs.readFileSync(f.sentinel, 'utf8'), 'user-owned evidence\n')
  })
}


test('a permission failure during copy never retires the old task', { skip: process.getuid?.() === 0 }, t => {
  const f = fixture(t)
  const old = previousTask(f, 'build')
  const dest = path.join(f.home, '.claude/skills/build')
  fs.mkdirSync(dest)
  fs.writeFileSync(path.join(dest, '.fdeops-managed'), 'managed-by: fdeops\n')
  fs.chmodSync(dest, 0o500)
  try {
    const result = f.run()
    assert.equal(result.status, 1)
    assert.match(result.stdout, /permission denied/)
    assert.equal(fs.readFileSync(path.join(old, 'SKILL.md'), 'utf8'), 'personalized old build')
    assert.equal(fs.readFileSync(path.join(old, 'personal/notes.md'), 'utf8'), 'retain all my notes')
  } finally { fs.chmodSync(dest, 0o700) }
})

for (const kind of ['file', 'symlink']) {
  test(`install and force preserve a personal skills README (${kind})`, t => {
    const f = fixture(t)
    const dest = path.join(f.home, '.claude/skills/README.md')
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    if (kind === 'symlink') fs.symlinkSync(f.sentinel, dest)
    else fs.writeFileSync(dest, 'personal skill catalog\n')
    const before = fs.readFileSync(dest, 'utf8')
    for (const args of [[], ['--force']]) {
      const result = f.run(...args)
      assert.equal(result.status, 0, result.stdout + result.stderr)
      assert.equal(fs.readFileSync(dest, 'utf8'), before)
      assert.equal(fs.lstatSync(dest).isSymbolicLink(), kind === 'symlink')
      assert.equal(fs.readFileSync(f.sentinel, 'utf8'), 'user-owned evidence\n')
      assert.ok(fs.existsSync(path.join(f.home, '.claude/skills/discover/SKILL.md')))
    }
  })
}

test('a brand mention or orphaned marker does not count as an installed adapter', t => {
  const f = fixture(t)
  const files = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.github/copilot-instructions.md']
  const notes = '# Project\nWe are evaluating FDEOps.\n<!-- fdeops adapter - points your AI tool at @fde; safe to keep -->\n'
  for (const name of files) {
    const dest = path.join(f.workspace, name)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, notes)
  }
  const result = f.run('adapters', f.workspace)
  assert.equal(result.status, 0, result.stdout + result.stderr)
  const first = files.map(name => fs.readFileSync(path.join(f.workspace, name), 'utf8'))
  for (const text of first) {
    assert.ok(text.startsWith(notes.trimEnd()))
    assert.match(text, /skills\/fde\/SKILL\.md/)
  }
  assert.equal(f.run('adapters', f.workspace).status, 0)
  assert.deepEqual(files.map(name => fs.readFileSync(path.join(f.workspace, name), 'utf8')), first)
})

for (const identity of ['# fdeops - existing workspace adapter', '<!-- fdeops adapter - points your AI tool at @fde; safe to keep -->']) {
  test(`adapter wording changes preserve an existing branded skill pointer: ${identity.slice(0, 12)}`, t => {
    const f = fixture(t)
    const names = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.github/copilot-instructions.md']
    const existing = `# Personal instructions\nRetain my guidance.\n\n${identity}\nUse @fde and read ~/.claude/skills/fde/SKILL.md for client work.\nOlder or customised wording stays mine.\n`
    for (const name of names) {
      const dest = path.join(f.workspace, name)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.writeFileSync(dest, existing)
    }
    assert.equal(f.run('adapters', f.workspace).status, 0)
    for (const name of names) assert.equal(fs.readFileSync(path.join(f.workspace, name), 'utf8'), existing)
  })
}
