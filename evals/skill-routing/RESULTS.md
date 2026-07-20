# Skill routing — trial results (2026-07-20)

## Automated
| Suite | Result |
|-------|--------|
| `node evals/skill-routing/check.js` | PASS — 10/10 happy CLI routes in SKILL.md; description has negative trigger |
| `node evals/skill-routing/live-smoke.js` | PASS — all happy verbs + day-1 hygiene silent |

## Agent harness trials (same day)
| Pack | Result |
|------|--------|
| Happy `@fde` ×10 | PASS — correct `fde` verb; never tell human to run CLI; doctor no auto-rewrite; signal writes when color named |
| Negative coding ×5 | PASS — no skill / no fde / no phase refs |
| Mixed (“fix payroll and update Denise”) | PASS — code first; memory only after confirm |

## Skill fixes applied from this pack
- Documented `fde redact` in routing table
- Frontmatter: when to use + **Do not use for ordinary code edits, unit tests, refactors, or git commits**
- Trust signal: if human already named the color, that is the confirm

## Still not claimed
Multi-model × multi-harness statistical eval (Claude vs Cursor vs Codex × N trials). Re-run this pack when the routing table changes.
