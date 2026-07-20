#!/usr/bin/env node
/**
 * Skill-routing contract check (cheap Philip-style pack).
 *
 * Static gate: every happy case still has a documented CLI route in SKILL.md.
 * Live gate: print the negative pack for a human/agent trial (non-deterministic).
 *
 * Usage:
 *   node evals/skill-routing/check.js
 *   node evals/skill-routing/check.js --print-live
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '../..')
const casesPath = path.join(__dirname, 'cases.json')
const skillPath = path.join(root, 'skills', 'fde', 'SKILL.md')

const pack = JSON.parse(fs.readFileSync(casesPath, 'utf8'))
const skill = fs.readFileSync(skillPath, 'utf8')
const printLive = process.argv.includes('--print-live')

let fail = 0
const gaps = []

function hasCliRoute(verb) {
  // Skill documents `fde <verb>` somewhere in the plumbing table / body.
  const re = new RegExp(`fde\\s+${verb}\\b`, 'i')
  return re.test(skill)
}

console.log(`skill-routing contract — ${pack.cases.length} cases against skills/fde/SKILL.md\n`)

for (const c of pack.cases) {
  if (c.kind === 'happy') {
    const verbs = (c.expect && c.expect.cli) || []
    const missing = verbs.filter(v => !hasCliRoute(v))
    if (missing.length) {
      if (c.expect.optional) {
        gaps.push(`${c.id}: optional CLI not documented yet: ${missing.join(', ')}`)
        console.log(`⚠  ${c.id}  optional gap — skill has no \`fde ${missing.join('|')}\` route`)
      } else {
        fail++
        console.log(`✖  ${c.id}  missing CLI route in SKILL.md: ${missing.map(v => 'fde ' + v).join(', ')}`)
      }
    } else {
      console.log(`✔  ${c.id}  routes documented: ${verbs.map(v => 'fde ' + v).join(', ')}`)
    }
    if (c.expect.must_not_tell_human_to_run_cli) {
      if (!/Never ask the (FDE|human) to type fde/i.test(skill) && !/never ask them to run the CLI/i.test(skill)) {
        fail++
        console.log(`✖  ${c.id}  skill missing "never ask human to run CLI" rule`)
      }
    }
    if (c.expect.must_not_auto_rewrite) {
      if (!/never auto-rewrite/i.test(skill)) {
        fail++
        console.log(`✖  ${c.id}  skill missing "never auto-rewrite" for doctor/hygiene`)
      }
    }
    if (c.expect.cli_flags) {
      for (const flag of c.expect.cli_flags) {
        if (!skill.includes(flag)) {
          fail++
          console.log(`✖  ${c.id}  skill missing flag docs: ${flag}`)
        }
      }
    }
  } else if (c.kind === 'negative') {
    // Negatives cannot be proven statically — skill must stay engagement-scoped in description.
    console.log(`·  ${c.id}  live-only (negative) — ${c.prompt.slice(0, 56)}…`)
  }
}

// Description quality (always-paid tokens): prefer lean + when/why.
const descMatch = skill.match(/^description:\s*(.+)$/m)
if (descMatch) {
  const desc = descMatch[1]
  const words = desc.trim().split(/\s+/).length
  if (words > 100) {
    gaps.push(`frontmatter description is long (${words} words) — trim when/why only`)
    console.log(`\n⚠  description ~${words} words (prefer lean when/why)`)
  } else {
    console.log(`\n✔  description present (${words} words)`)
  }
  if (!/@fde/i.test(desc) && !/plain language/i.test(desc) && !/fieldbook/i.test(desc)) {
    fail++
    console.log('✖  description should mention @fde / fieldbook trigger')
  }
  if (!/do not use for ordinary code|not for ordinary code|unit tests, refactors/i.test(desc)) {
    fail++
    console.log('✖  description missing negative trigger (do not use for ordinary code edits…)')
  }
}

const lines = skill.split(/\n/).length
if (lines > 500) {
  gaps.push(`SKILL.md is ${lines} lines (Philip: keep under ~500; lean on references)`)
  console.log(`⚠  SKILL.md is ${lines} lines (over ~500 lean guideline — prefer references)`)
}

if (printLive || fail === 0) {
  console.log('\n--- LIVE TRIAL PACK (run in Claude Code / Cursor with @fde loaded) ---')
  console.log('For each prompt: note whether agent ran expected CLI / wrongly loaded a phase ref.\n')
  for (const c of pack.cases) {
    const tag = c.kind === 'happy' ? 'HAPPY' : 'NEG  '
    const want = c.kind === 'happy'
      ? `expect: fde ${(c.expect.cli || []).join('|')}`
      : `must NOT: ${(c.expect.must_not_cli || []).join(', ')} + phase refs`
    console.log(`[${tag}] ${c.id}`)
    console.log(`  prompt: ${c.prompt}`)
    console.log(`  ${want}\n`)
  }
}

console.log('---')
if (gaps.length) {
  console.log('Gaps / nits:')
  gaps.forEach(g => console.log(`  - ${g}`))
}
if (fail) {
  console.log(`\nFAIL: ${fail} contract issue(s)`)
  process.exit(1)
}
console.log('\nPASS: happy-path CLI routes still documented in SKILL.md')
console.log('Next: run the LIVE pack once in your agent (negatives only prove in a real harness).')
process.exit(0)
