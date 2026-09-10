#!/usr/bin/env node
'use strict'

/**
 * Materialize fictional D1-D5 trial workspaces.
 * Copies only agent-visible fixtures + prompt.txt. Never copies README scoring notes.
 *
 *   node evals/delivery/setup.js <dest-dir>
 */
const fs = require('fs')
const path = require('path')

const ROOT = __dirname
const FIXTURES = path.join(ROOT, 'fixtures')
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'))

const SCORING_LEAK = /critical failure|observe:|full-credit behavior|scoring notes/i

function listFiles(dir, base = dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name)
    if (ent.isDirectory()) listFiles(abs, base, out)
    else out.push(path.relative(base, abs))
  }
  return out
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const rel of listFiles(src)) {
    const from = path.join(src, rel)
    const to = path.join(dest, rel)
    fs.mkdirSync(path.dirname(to), { recursive: true })
    const body = fs.readFileSync(from)
    if (SCORING_LEAK.test(body.toString('utf8'))) {
      throw new Error(`refusing to copy scoring notes in ${rel}`)
    }
    fs.writeFileSync(to, body)
  }
}

function materialize(destRoot) {
  if (!destRoot) throw new Error('destination directory required')
  const root = path.resolve(destRoot)
  fs.mkdirSync(root, { recursive: true })
  const written = []
  for (const c of MANIFEST.cases) {
    const src = path.join(FIXTURES, c.id)
    if (!fs.existsSync(src)) throw new Error(`missing fixtures for ${c.id}`)
    const dir = path.join(root, c.id)
    fs.mkdirSync(dir, { recursive: true })
    copyDir(src, dir)
    fs.writeFileSync(path.join(dir, 'prompt.txt'), c.prompt + '\n')
    written.push({ id: c.id, dir })
  }
  fs.writeFileSync(
    path.join(root, 'MANIFEST.json'),
    JSON.stringify({
      id: MANIFEST.id,
      version: MANIFEST.version,
      cases: MANIFEST.cases.map(c => ({ id: c.id, promptFile: 'prompt.txt' })),
    }, null, 2) + '\n'
  )
  return { root, cases: written }
}

module.exports = { materialize, MANIFEST }

if (require.main === module) {
  const dest = process.argv[2]
  if (!dest) {
    console.error('usage: node evals/delivery/setup.js <dest-dir>')
    process.exit(2)
  }
  const result = materialize(dest)
  console.log(`materialized ${result.cases.map(c => c.id).join(', ')} → ${result.root}`)
}
