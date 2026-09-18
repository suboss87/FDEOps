#!/usr/bin/env node
'use strict'
// Provider-neutral preparation and evidence capture. Never starts an AI host.
const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const { spawnSync } = require('child_process')
const catalog = require('./field-cases.json')
const digest = body => crypto.createHash('sha256').update(body).digest('hex')
function inventory(dir, prefix = '', result = {}) {
  for (const entry of fs.readdirSync(path.join(dir, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name)
    if (entry.isSymbolicLink()) throw new Error(`symlink is not supported: ${relative}`)
    if (entry.isDirectory()) inventory(dir, relative, result)
    else if (entry.isFile()) result[relative] = digest(fs.readFileSync(path.join(dir, relative)))
    else throw new Error(`unsupported file: ${relative}`)
  }
  return result
}
function prepare(dest, id, variant) {
  const item = catalog.cases.find(c => c.id === id)
  if (!item || !['baseline', 'fdeops'].includes(variant)) throw new Error('known case and baseline|fdeops variant required')
  const root = path.resolve(dest)
  fs.mkdirSync(root) // Refuse reuse: failed runs must survive.
  const workspace = path.join(root, 'executor')
  fs.cpSync(path.join(__dirname, 'field-fixtures', id), workspace, { recursive: true, errorOnExist: true })
  let prompt = item.prompt
  if (variant === 'fdeops') {
    fs.cpSync(path.resolve(__dirname, '../../skills', item.skill), path.join(workspace, 'skill'), { recursive: true })
    prompt = `Read skill/SKILL.md and follow that FDEOps task skill.\n\n${prompt}`
  }
  if (id === 'F19') {
    // Exercise a real pending proposal, isolated from the evaluator's own records.
    const runtime = path.join(workspace, '.fdeops-runtime')
    for (const dir of ['bin', 'templates']) fs.cpSync(path.resolve(__dirname, '../..', dir), path.join(runtime, dir), { recursive: true })
    fs.copyFileSync(path.resolve(__dirname, '../../package.json'), path.join(runtime, 'package.json'))
    fs.writeFileSync(path.join(workspace, 'fde.cjs'), `const {spawnSync}=require('node:child_process'); const path=require('node:path');
const env={...process.env,HOME:path.join(__dirname,'.home'),USERPROFILE:path.join(__dirname,'.home'),FDEOPS_ENGAGEMENT:'',FDEOS_ENGAGEMENT:'',FDEOPS_ENGAGEMENTS_ROOT:path.join(__dirname,'clients')};
const r=spawnSync(process.execPath,[path.join(__dirname,'.fdeops-runtime/bin/fde.js'),...process.argv.slice(2)],{cwd:__dirname,env,stdio:'inherit'}); process.exit(r.status ?? 1);
`)
    const run = args => {
      const result = spawnSync(process.execPath, [path.join(workspace, 'fde.cjs'), ...args], { cwd: workspace, encoding: 'utf8', timeout: 10000 })
      if (result.status !== 0) throw new Error(`F19 preparation failed: ${result.stderr}`)
    }
    run(['resume', '--init', 'atlas'])
    const record = path.join(workspace, 'clients/atlas/.fde')
    fs.appendFileSync(path.join(record, 'decisions.md'), '\n- [2026-09-02] Morgan approved CSV upload only; ERP sync excluded this phase [source: kickoff:12]\n')
    run(['ingest', 'stage', '--source', 'workshop-17', '--title', 'routing', path.join(workspace, 'notes.md')])
    const inbox = path.join(workspace, 'clients/atlas/.inbox')
    run(['ingest', 'propose', fs.readdirSync(inbox).find(name => name.endsWith('.md'))])
  }
  fs.writeFileSync(path.join(workspace, 'prompt.txt'), prompt + '\n')
  fs.mkdirSync(path.join(root, 'reviewer'))
  fs.writeFileSync(path.join(root, 'reviewer', 'rubric.md'), item.rubric + '\n')
  const receipt = { version: 1, case: id, variant, preparedAt: new Date().toISOString(), workspace,
    execution: 'not recorded', host: null, model: null, settings: null, otherSkills: null,
    sourceRevision: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: __dirname, encoding: 'utf8' }).stdout.trim() || null,
    budget: null, elapsed: null, tokens: null, transcript: null, reviewer: null, judgment: 'pending',
    inputHashes: inventory(workspace) }
  fs.writeFileSync(path.join(root, 'run.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' })
  return receipt
}
function check(dest, options = {}) {
  const root = path.resolve(dest)
  const receipt = JSON.parse(fs.readFileSync(path.join(root, 'run.json'), 'utf8'))
  if (!catalog.cases.some(c => c.id === receipt.case)) throw new Error('unknown case')
  const workspace = path.join(root, 'executor')
  const hashes = inventory(workspace)
  const result = { checkedAt: new Date().toISOString(), case: receipt.case,
    execution: 'not established by checker', judgment: 'pending human review',
    answerPresent: Object.hasOwn(hashes, 'answer.md'),
    changedInputs: Object.keys(receipt.inputHashes).filter(f => hashes[f] !== receipt.inputHashes[f]),
    addedFiles: Object.keys(hashes).filter(f => !Object.hasOwn(receipt.inputHashes, f)), hashes,
    contract: { status: 'not applicable', note: 'No automated judgment scoring' } }
  if (receipt.case === 'F3') result.contract = { status: 'not run', note: 'Inspect candidate code, then opt in with --execute-contract inside a restricted environment' }
  if (receipt.case === 'F3' && options.executeContract === true) {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'fde-contract-'))
    const copy = path.join(temporary, 'executor')
    let run
    try {
      fs.cpSync(workspace, copy, { recursive: true })
      run = spawnSync(process.execPath, [path.join(__dirname, 'field-contract.js'), path.join(copy, 'adapter.js')],
        { cwd: copy, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 })
    } finally { fs.rmSync(temporary, { recursive: true, force: true }) }
    const completed = (run.stdout || '').split(/\r?\n/).includes('FDEOPS_FIELD_CONTRACT_COMPLETE')
    result.contract = { status: run.status === 0 && completed ? 'passed' : 'failed', completed, exitStatus: run.status,
      stdout: run.stdout, stderr: run.stderr, error: run.error ? run.error.message : null,
      note: 'Local adapter contract only; does not establish a model run or real backend guarantees' }
  }
  const output = path.join(root, 'reviewer', `check-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`)
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
  return { output, ...result }
}
module.exports = { prepare, check }
if (require.main === module) {
  try {
    const [command, dest, id, variant] = process.argv.slice(2)
    if (!dest || !['prepare', 'check'].includes(command)) throw new Error('usage: field.js prepare <new-run-dir> <case-id> <baseline|fdeops> OR field.js check <run-dir> [--execute-contract]')
    if (command === 'check' && (variant || (id && id !== '--execute-contract'))) throw new Error('unknown check option')
    const result = command === 'prepare' ? prepare(dest, id, variant) : check(dest, { executeContract: id === '--execute-contract' })
    console.log(JSON.stringify(result, null, 2))
    if (result.contract && result.contract.status === 'failed') process.exitCode = 1
  } catch (error) { console.error(error.message); process.exitCode = 2 }
}
