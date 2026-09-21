const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { spawnSync } = require('node:child_process')
const root = path.join(__dirname, '..')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'hooks/hooks.json'), 'utf8'))

// Exercise the configured command, not just the hook script directly.
for (const pluginName of ['plugin', 'plugin with spaces']) {
  for (const [event, expected] of [
    ['SessionStart', ['resume']],
    ['PreCompact', ['preserve']],
    ['SessionEnd', ['capture', 'dashboard']],
  ]) {
    test(`${event} resolves the configured command from ${pluginName}`, t => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fde-plugin-hook-'))
      t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
      const plugin = path.join(dir, pluginName)
      const home = path.join(dir, 'home')
      const engagement = path.join(dir, 'customer', '.fde')
      const calls = path.join(dir, 'calls.jsonl')
      for (const folder of [home, engagement, path.join(plugin, 'bin')]) fs.mkdirSync(folder, { recursive: true })
      fs.cpSync(path.join(root, 'hooks'), path.join(plugin, 'hooks'), { recursive: true })
      fs.writeFileSync(path.join(engagement, 'context.md'), '# Fictional customer\n')
      fs.writeFileSync(path.join(plugin, 'bin/fde.js'), `
        const fs = require('node:fs');
        fs.appendFileSync(process.env.HOOK_CALLS, JSON.stringify({
          command: process.argv[2], engagement: process.env.FDEOPS_ENGAGEMENT
        }) + '\\n');
        if (process.argv[2] === 'resume') console.log('FICTIONAL_CONTEXT');
      `)
      const command = manifest.hooks[event][0].hooks[0].command
      const result = spawnSync('bash', ['-c', command], {
        cwd: home, input: '{}', encoding: 'utf8', timeout: 15000,
        env: { ...process.env, HOME: home, USERPROFILE: home, PWD: home,
          PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin`,
          CLAUDE_PLUGIN_ROOT: plugin, FDEOPS_ENGAGEMENT: engagement,
          FDEOS_ENGAGEMENT: '', FDEOPS_ENGAGEMENTS_ROOT: path.join(dir, 'customer'),
          HOOK_CALLS: calls },
      })
      assert.equal(result.status, 0, result.stderr)
      const recorded = fs.readFileSync(calls, 'utf8').trim().split('\n').map(JSON.parse)
      assert.deepEqual(recorded.map(call => call.command), expected)
      assert.ok(recorded.every(call => call.engagement === engagement))
      if (event === 'SessionStart') assert.match(result.stdout, /FICTIONAL_CONTEXT/)
    })
  }
}
