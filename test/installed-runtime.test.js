const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { spawnSync, spawn } = require('node:child_process')
const repo = path.resolve(__dirname, '..')
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fde-runtime-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const home = path.join(dir, 'home'), workspace = path.join(dir, 'workspace')
  fs.mkdirSync(home); fs.mkdirSync(workspace)
  const env = { ...process.env, HOME: home, USERPROFILE: home,
    FDEOPS_ENGAGEMENT: '', FDEOS_ENGAGEMENT: '', FDEOPS_ENGAGEMENTS_ROOT: '' }
  const run = (file, args, extra = {}) => spawnSync(process.execPath, [file, ...args], {
    cwd: workspace, env: { ...env, ...extra }, encoding: 'utf8', timeout: 20000,
  })
  return { dir, home, workspace, env, run }
}
const installer = path.join(repo, 'bin/install.js'), cli = path.join(repo, 'bin/fde.js')
test('installed privacy uses its own version and tolerates missing legacy metadata', t => {
  const f = fixture(t)
  const installed = f.run(installer, [])
  assert.equal(installed.status, 0, installed.stderr)
  const target = path.join(f.home, '.claude/fdeops/fde.js')
  fs.writeFileSync(path.join(f.home, '.claude/package.json'), '{"name":"another-app","version":"99.99.99"}')
  const current = f.run(target, ['privacy'])
  assert.equal(current.status, 0, current.stderr)
  assert.ok(current.stdout.includes(`FDEOps ${require('../package.json').version} -`))
  fs.unlinkSync(path.join(f.home, '.claude/fdeops/package.json'))
  const legacy = f.run(target, ['privacy'])
  assert.equal(legacy.status, 0, legacy.stderr)
  assert.match(legacy.stdout, /identifier masking enabled/)
  assert.doesNotMatch(legacy.stdout, /99\.99\.99/)
})
for (const tilde of [false, true]) {
  test(`installer init and CLI bind share a ${tilde ? 'tilde' : 'custom'} root`, t => {
    const f = fixture(t), actual = path.join(f.home, 'custom clients')
    const env = { FDEOPS_ENGAGEMENTS_ROOT: tilde ? ' ~/custom clients ' : actual }
    const init = f.run(installer, ['init', 'atlas'], env)
    assert.equal(init.status, 0, init.stderr)
    const record = path.join(actual, 'atlas/.fde/context.md')
    assert.ok(fs.existsSync(record))
    fs.appendFileSync(record, '\nKEPT_CUSTOMER_CONTEXT\n')
    const bind = f.run(cli, ['resume', '--init', 'atlas'], env)
    assert.equal(bind.status, 0, bind.stderr)
    const resumed = f.run(cli, ['resume'], env)
    assert.equal(resumed.status, 0, resumed.stderr)
    assert.match(resumed.stdout, /KEPT_CUSTOMER_CONTEXT/)
    assert.equal(fs.existsSync(path.join(f.home, 'fde-engagements/atlas')), false)
  })
}
for (const concurrent of [false, true]) {
  test(`same-second staging preserves every ${concurrent ? 'concurrent' : 'sequential'} note`, async t => {
    const f = fixture(t), eng = path.join(f.dir, 'client/.fde')
    fs.mkdirSync(eng, { recursive: true }); fs.writeFileSync(path.join(eng, 'context.md'), '# Fictional client\n')
    const preload = path.join(f.dir, 'clock.cjs')
    // Fix ID timestamps; keep Date.now advancing for lock deadlines.
    fs.writeFileSync(preload, `const D=Date;global.Date=class extends D { constructor(...a){ super(...(a.length?a:['2026-09-22T10:00:00.100Z'])) } };`)
    const barrier = path.join(f.dir, 'barrier')
    fs.mkdirSync(barrier)
    if (concurrent) fs.appendFileSync(preload, `
      const fs=require('node:fs'),path=require('node:path'),stat=fs.lstatSync;
      let waited=false;
      fs.lstatSync=function(file,...args){
        try { return stat.call(this,file,...args) }
        catch(error){
          if(!waited && error.code==='ENOENT' && path.basename(String(file))==='.inbox'){
            waited=true;
            fs.writeFileSync(path.join(process.env.STAGE_BARRIER,process.env.STAGE_INDEX),'ready');
            const deadline=Date.now()+5000;
            while(fs.readdirSync(process.env.STAGE_BARRIER).length<4){
              if(Date.now()>deadline) throw Error('barrier timeout');
              Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10);
            }
          }
          throw error;
        }
      };
    `)
    const stage = index => new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--require', preload, cli, 'ingest', 'stage', '--source', 'manual', '--title', 'meeting'], {
        cwd: f.workspace, env: { ...f.env, FDEOPS_ENGAGEMENT: eng, STAGE_BARRIER: barrier, STAGE_INDEX: String(index) }, timeout: 10000,
      })
      let stdout = '', stderr = ''
      child.stdout.on('data', b => { stdout += b }); child.stderr.on('data', b => { stderr += b })
      child.on('error', reject)
      child.on('close', code => code === 0 ? resolve(stdout) : reject(new Error(stderr || `exit ${code}`)))
      child.stdin.end(`NOTE_${index}_SENTINEL`)
    })
    const results = []
    if (concurrent) {
      const settled = await Promise.allSettled([0, 1, 2, 3].map(stage))
      for (const result of settled) {
        assert.equal(result.status, 'fulfilled', result.reason?.message)
        results.push(result.value)
      }
    }
    else for (let i = 0; i < 4; i++) results.push(await stage(i))
    const box = path.join(f.dir, 'client/.inbox'), files = fs.readdirSync(box)
    assert.equal(files.length, 4)
    assert.equal(new Set(results.map(r => r.match(/^id: (.+)$/m)[1])).size, 4)
    for (let i = 0; i < 4; i++) assert.equal(files.filter(file => fs.readFileSync(path.join(box, file), 'utf8').includes(`NOTE_${i}_SENTINEL`)).length, 1)
  })
}
