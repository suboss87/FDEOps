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
