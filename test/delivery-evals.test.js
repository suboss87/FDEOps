const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

const root = path.join(__dirname, '..')
const { materialize, MANIFEST } = require('../evals/delivery/setup.js')

const SCORING = /critical failure|observe:|full-credit behavior|scoring notes|invented agreement|not launch evidence|flattering number|second backlog/i

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(abs, acc)
    else acc.push(abs)
  }
  return acc
}

test('delivery eval setup materializes isolated D1-D5 fixtures without scoring notes', () => {
  const a = fs.mkdtempSync(path.join(os.tmpdir(), 'fdeops-deliv-a-'))
  const b = fs.mkdtempSync(path.join(os.tmpdir(), 'fdeops-deliv-b-'))
  const first = materialize(a)
  const second = materialize(b)
  assert.deepEqual(first.cases.map(c => c.id), MANIFEST.cases.map(c => c.id))
  assert.deepEqual(['D1', 'D2', 'D3', 'D4', 'D5'], first.cases.map(c => c.id))

  const d1 = path.join(a, 'D1')
  assert.equal(fs.existsSync(path.join(d1, 'src/reconcile.js')), true)
  assert.equal(fs.existsSync(path.join(d1, 'config/alerts.json')), true)
  assert.match(fs.readFileSync(path.join(d1, 'prompt.txt'), 'utf8'), /AI agent by Friday/)
  assert.match(fs.readFileSync(path.join(d1, 'src/reconcile.js'), 'utf8'), /enqueueReview/)

  const d2 = path.join(a, 'D2')
  assert.match(fs.readFileSync(path.join(d2, '.fde/decisions.md'), 'utf8'), /CSV upload retained/)
  assert.match(fs.readFileSync(path.join(d2, '.fde/notes.md'), 'utf8'), /Devon requested/)
  assert.match(fs.readFileSync(path.join(d2, '.fde/terrain.md'), 'utf8'), /ERP API access/)

  assert.match(fs.readFileSync(path.join(a, 'D3/.fde/delivery.md'), 'utf8'), /Local demo only/)
  assert.match(fs.readFileSync(path.join(a, 'D4/.fde/delivery.md'), 'utf8'), /Priya - looks good/)
  assert.match(fs.readFileSync(path.join(a, 'D5/implementation-plan.md'), 'utf8'), /npm test/)

  for (const file of walk(a)) {
    const body = fs.readFileSync(file, 'utf8')
    assert.doesNotMatch(body, SCORING, file)
  }
  assert.equal(fs.existsSync(path.join(a, 'D1/README.md')), false)
  const destManifest = JSON.parse(fs.readFileSync(path.join(a, 'MANIFEST.json'), 'utf8'))
  assert.equal('title' in destManifest.cases[0], false)

  fs.writeFileSync(path.join(a, 'D1', 'prompt.txt'), 'MUTATED\n')
  assert.doesNotMatch(fs.readFileSync(path.join(b, 'D1', 'prompt.txt'), 'utf8'), /MUTATED/)
  assert.equal(second.root, path.resolve(b))
})
