import { compileProject, ARCHETYPES } from '../src/engine'
import { buildPackage } from '../src/export/package'

let bad = 0
for (const a of ARCHETYPES) {
  for (const seed of [112233, 998877, 4242]) {
    const p = compileProject({ archetypeId: a.id, seed })
    const screens = p.sections.reduce((n, s) => n + s.screens.length, 0)
    const reqs = p.sections.reduce((n, s) => n + s.requirements.length, 0)
    const files = buildPackage(p)
    const sql = p.data.sql
    const nullish = p.data.entities.some((e) => e.rows.some((r) => e.fields.some((f) => r[f.name] === undefined)))
    const screenIds = new Set(p.sections.flatMap((s) => s.screens.map((sc) => sc.id)))
    const flowsOk =
      p.flows.length >= 4 &&
      p.flows.every((f) => f.steps.length >= 3 && f.steps.every((st) => !st.screenId || screenIds.has(st.screenId)))
    const systemOk =
      p.system.components.length >= 12 &&
      p.system.stack.length >= 8 &&
      p.system.shell.routes.length === screenIds.size &&
      p.system.dataLayer.interfaces.length === p.data.entities.length
    const paths = new Set(files.map((f) => f.path))
    const filesOk =
      paths.has('src/data/repository.ts') &&
      paths.has('src/data/mock-adapter.ts') &&
      paths.has('src/components/app-shell.tsx') &&
      paths.has('system/registry.json') &&
      paths.has('wiki/product.md') &&
      paths.has('wiki/flows.md') &&
      paths.has('flows.md')
    if (p.audit.score < 80 || nullish || !sql.includes('create table') || files.length < 30 || !flowsOk || !systemOk || !filesOk) bad++
    if (seed === 112233) {
      console.log(`${a.id.padEnd(13)} ${p.name.padEnd(16)} audit ${p.audit.score}  sec ${p.sections.length} scr ${String(screens).padStart(2)} req ${String(reqs).padStart(3)} ent ${p.data.entities.length} flows ${p.flows.length} comp ${p.system.components.length} files ${files.length}  fails ${p.audit.checks.filter(c=>c.status==='fail').length} warns ${p.audit.checks.filter(c=>c.status==='warn').length}`)
    }
  }
}
console.log('bad:', bad)

const p = compileProject({ archetypeId: 'marketplace', seed: 112233 })
console.log('\n---', p.name, p.brief.tagline)
console.log(p.design.name, '|', p.design.typography.map(t=>t.family).join(' + '), '| shell', p.design.layout.shell, '| primary', p.design.colors[0].base)
console.log('\nvendors rows:')
console.log(p.data.entities[0].rows.slice(0,3))
console.log('\norders rows:')
console.log(p.data.entities[2].rows.slice(0,2))
console.log('\nsection 2:', p.sections[1].name, '->', p.sections[1].screens.map(s=>`${s.name} [${s.kind}] ${s.blocks.length}b`).join(' | '))
console.log('\nchecks:')
for (const c of p.audit.checks) console.log(c.status.toUpperCase().padEnd(5), c.group.padEnd(14), c.label, '—', c.detail.slice(0,90))
console.log('\nbrief risks:', p.brief.risks.length, 'metrics:', p.brief.metrics.length, 'jobs:', p.brief.jobs.length)
console.log('requirements sample:', p.sections[0].requirements.slice(0,3))
