/**
 * Unit tests for the compiler and the handoff generators.
 *
 * These are the assertions that used to live only in a script's console output:
 * determinism, data integrity, the status machine, and the promise that every
 * one of the eight free tools is really in the package.
 *
 *   node --import tsx --test scripts/unit.test.ts
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { ARCHETYPES, compileProject } from '../src/engine'
import { describeIntake, intakeGaps, profileIdea } from '../src/engine/intake'
import { BLOCK_COMPONENT_NAMES } from '../src/engine/system'
import { buildPackage } from '../src/export/package'
import { ROLE_SKILLS, TOOLS, vendoredSkillPhases } from '../src/tools'
import { ARTICLES, COUNTS, COURSES, KITS, SERIES, SESSIONS, VIDEOS } from '../src/data/builderMethods'
import { FRAMEWORKS } from '../src/export/frameworks'
import { migrateProject } from '../src/lib/migrate'
import { migrateProject, migrateProjects } from '../src/lib/migrate'
import { OLD_BRAND, rebrand } from './lib/brand'
import { PHASES, completedPhases, confirmedPhases, isStageDone, nextStage, phaseBlockers, phaseReady } from '../src/lib/progress'
import {
  ROLES,
  answerKey,
  nextRoleStep,
  reviewKey,
  reviewSide,
  roleAllows,
  roleById,
  roleSkill,
  stepAnswers,
  stepQuestionsAnswered,
  stepState,
} from '../src/lib/roles'
import { renderDeliverable, roleSpecFiles } from '../src/lib/documents'

const input = { archetypeId: 'clinic', seed: 4242, now: 1_760_000_000_000 } as const

function hash(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 12)
}

test('the same inputs compile to a byte-identical package', () => {
  const a = buildPackage(compileProject(input as never))
  const b = buildPackage(compileProject(input as never))
  assert.equal(a.length, b.length)
  assert.equal(hash(a.map((f) => f.path + f.content).join('\n')), hash(b.map((f) => f.path + f.content).join('\n')))
})

test('a different seed is a different product', () => {
  const a = compileProject({ archetypeId: 'clinic', seed: 4242 } as never)
  const b = compileProject({ archetypeId: 'clinic', seed: 4243 } as never)
  assert.notEqual(hash(JSON.stringify(a.data.entities)), hash(JSON.stringify(b.data.entities)))
})

test('every entity has an id, seeded rows and typed fields', () => {
  for (const archetype of ARCHETYPES) {
    const project = compileProject({ archetypeId: archetype.id, seed: 99 } as never)
    for (const entity of project.data.entities) {
      assert.ok(entity.rows.length > 0, `${archetype.id}/${entity.id} has no rows`)
      assert.ok(entity.fields.length >= 4, `${archetype.id}/${entity.id} has too few fields`)
      for (const row of entity.rows) {
        assert.ok(String(row.id).length > 0, `${archetype.id}/${entity.id} row without id`)
      }
      if (entity.statusField) {
        const field = entity.fields.find((f) => f.name === entity.statusField)
        assert.ok(field?.options?.length, `${archetype.id}/${entity.id} status field has no options`)
        assert.equal(new Set(field!.options).size, field!.options!.length, 'status options must be unique')
      }
    }
  }
})

test('every block on every screen renders through a registry component', () => {
  const project = compileProject(input as never)
  const names = new Set(project.system.components.map((c) => c.name))
  for (const section of project.sections) {
    for (const screen of section.screens) {
      for (const block of screen.blocks) {
        assert.ok(names.has(BLOCK_COMPONENT_NAMES[block.type]), `no registry component for ${block.type}`)
      }
    }
  }
})

test('the default genome passes its own audit at 100', () => {
  const project = compileProject(input as never)
  assert.equal(project.audit.score, 100)
  assert.equal(project.audit.checks.filter((c) => c.status === 'fail').length, 0)
})

test('every tool lists the steps its own instruction file defines', () => {
  // The step list is parsed, not hand-written, and the drift it prevents is
  // real: PRD Creator runs eleven phases upstream and once showed four here.
  // Each step must also name a file that exists in the vendored skill.
  for (const tool of TOOLS) {
    assert.ok(tool.steps.length >= 4, `${tool.id} exposes only ${tool.steps.length} steps`)
    if (!tool.stepFiles) continue
    assert.equal(tool.stepFiles.length, tool.steps.length, `${tool.id} files do not line up with its steps`)
    const prefix = `.agents/skills/${tool.id}/`
    const files = buildPackage(compileProject(input as never)).map((f) => f.path)
    for (const file of tool.stepFiles) {
      assert.ok(files.includes(prefix + file), `${tool.id} names ${file}, which is not in the package`)
    }
  }
  const prd = TOOLS.find((t) => t.id === 'prd-creator')!
  assert.equal(prd.steps.length, 11, 'PRD Creator has eleven phases upstream')
  assert.equal(prd.steps[0], 'Brain dump intake')
  assert.equal(prd.steps.at(-1), 'Write files')
  const skillBuilder = TOOLS.find((t) => t.id === 'skill-builder')!
  assert.deepEqual(
    skillBuilder.steps,
    ['Understand the process', 'Interview the user', 'Design the shape', 'Build it', 'Save it', 'Verify & hand off'],
  )
})

test('all eight free tools are in the package', () => {
  const files = buildPackage(compileProject(input as never))
  const paths = new Set(files.map((f) => f.path))
  assert.equal(TOOLS.length, 8)
  for (const skill of ['prd-creator', 'skill-builder', 'design-system', 'favicon-creator', 'agents-repo', 'agents-manifest']) {
    assert.ok([...paths].some((p) => p.startsWith(`.agents/skills/${skill}/`)), `${skill} missing`)
  }
  assert.ok(paths.has('template/starter/AGENTS.md'))
  // Ten phase commands, five standards commands and five workflow commands,
  // in one folder so an agent that reads markdown commands needs a single path.
  assert.equal([...paths].filter((p) => p.startsWith('.agents/commands/prodops/')).length, 20)
  assert.ok(paths.has('AGENTS.md') && paths.has('TOOLKIT.md') && paths.has('scripts/link-agents.sh'))
  assert.ok(paths.has('_build_plan/prd.md'), 'PRD Creator should leave a PRD behind')
  assert.ok([...paths].filter((p) => p.startsWith('_build_plan/milestones/')).length >= 3, 'one prompt per milestone')
  assert.equal([...paths].filter((p) => p.startsWith('.claude/skills/')).length, 0, 'skills must live in the canon')
})

test('the builder canon is complete and honest about its counts', () => {
  assert.equal(SERIES.length, 6, 'six series')
  assert.equal(KITS.length, 6, 'six build kits')
  assert.equal(COURSES.length, 4, 'four Pro courses')
  assert.equal(ARTICLES.length, 21, 'twenty-one articles')
  assert.ok(SESSIONS.length >= 14, 'the workshop calendar')
  assert.ok(VIDEOS.length >= 20, 'the catalogue snapshot')

  // The totals the library page prints are the arrays, not prose beside them.
  assert.equal(COUNTS.kits, KITS.length)
  assert.equal(COUNTS.series, SERIES.length)
  assert.equal(COUNTS.courses, COURSES.length)
  assert.equal(COUNTS.sessions, SESSIONS.length)
  assert.equal(COUNTS.articles, ARTICLES.length)
  assert.equal(new Set(KITS.map((kit) => kit.id)).size, KITS.length, 'no kit appears twice')

  // Every kit compiles: the archetype it names has to exist in the engine.
  for (const kit of KITS) {
    assert.ok(
      ARCHETYPES.some((entry) => entry.id === kit.archetypeId),
      `${kit.id} names a missing archetype`,
    )
    assert.ok(kit.idea.trim().split(/\s+/).length >= 8, `${kit.id} has no usable description`)
  }
})

test('the backend carries a rule for every status field', () => {
  const project = compileProject(input as never)
  const files = buildPackage(project)
  const rules = files.find((f) => f.path === 'server/src/types.ts')?.content ?? ''
  for (const entity of project.data.entities) {
    if (!entity.statusField) continue
    assert.ok(rules.includes(`"${entity.id}"`), `${entity.id} missing from the API's entity map`)
    for (const option of entity.fields.find((f) => f.name === entity.statusField)?.options ?? []) {
      assert.ok(rules.includes(option), `${entity.id} status ${option} missing from the flow`)
    }
  }
})

test('the handoff always includes the backend contract and its tests', () => {
  const paths = new Set(buildPackage(compileProject(input as never)).map((f) => f.path))
  for (const path of [
    'business-logic.md',
    'server/API.md',
    'server/README.md',
    'server/package.json',
    'server/src/rules.ts',
    'server/src/services.ts',
    'server/src/validate.ts',
    'server/src/http.ts',
    'server/src/server.ts',
    'server/src/tests/rules.test.ts',
    'server/src/tests/api.test.ts',
    'src/data/http-adapter.ts',
  ]) {
    assert.ok(paths.has(path), `${path} missing from the package`)
  }
})

test('design tokens keep their contrast contract', () => {
  const project = compileProject(input as never)
  const primary = project.design.colors.find((c) => c.role === 'primary')!
  assert.ok(primary.stops.some((stop) => stop.onWhite >= 4.5), 'no primary stop clears 4.5:1 on white')
  assert.equal(project.design.breakpoints.length, 4)
})

test('every generated component file has a props contract', () => {
  const files = buildPackage(compileProject(input as never))
  const components = files.filter((f) => /sections\/.+\/components\/.+\.tsx$/.test(f.path) && !f.path.endsWith('index.ts'))
  assert.ok(components.length >= 10)
  for (const file of components) {
    assert.match(file.content, /export (function|const) [A-Z]/, `${file.path} exports no component`)
  }
})

test('openapi.json describes every entity and its status journey', () => {
  const project = compileProject(input as never)
  const file = buildPackage(project).find((f) => f.path === 'openapi.json')
  assert.ok(file, 'openapi.json missing from the package')
  const spec = JSON.parse(file!.content) as {
    openapi: string
    info: { title: string; version: string }
    paths: Record<string, Record<string, { responses?: Record<string, unknown> }>>
    components: { schemas: Record<string, unknown> }
  }
  assert.match(spec.openapi, /^3\.1\./)
  assert.ok(spec.info.title.length > 0)
  for (const entity of project.data.entities) {
    assert.ok(spec.components.schemas[entity.name], `${entity.name} has no schema`)
    assert.ok(spec.paths[`/api/${entity.id}`]?.get, `GET /api/${entity.id} missing`)
    assert.ok(spec.paths[`/api/${entity.id}`]?.post, `POST /api/${entity.id} missing`)
    const one = spec.paths[`/api/${entity.id}/{id}`]
    assert.ok(one?.get && one.patch && one.delete, `/api/${entity.id}/{id} is incomplete`)
    if (entity.statusField) {
      const transition = spec.paths[`/api/${entity.id}/{id}/transition`]?.post
      assert.ok(transition, `${entity.name} has no transition route`)
    }
  }
  assert.ok(spec.paths['/api/health']?.get, 'no health route')
})

test('the package documents itself and carries its licences', () => {
  const files = buildPackage(compileProject(input as never))
  const paths = new Set(files.map((f) => f.path))
  for (const path of [
    'requirements.md',
    'docs/README.md',
    'docs/LICENSES.md',
    'docs/guides/process.md',
    'docs/guides/commands.md',
    'docs/guides/toolkit.md',
    'docs/guides/standards.md',
    'docs/guides/tokens.md',
    'docs/guides/codebase-implementation.md',
    'docs/guides/versioning.md',
  ]) {
    assert.ok(paths.has(path), `${path} missing from the package`)
  }

  // A guide that points at a file which is not in the package is worse than no
  // guide, so the pages are checked against what actually ships.
  for (const file of files.filter((f) => f.path.startsWith('docs/guides/'))) {
    for (const [, target] of file.content.matchAll(/\]((\.\.\/)?[\w./-]+\.md)/g)) {
      const resolved = target.startsWith('../') ? target.slice(3) : `docs/guides/${target}`
      assert.ok(paths.has(resolved), `${file.path} links to ${target}, which is not in the package`)
    }
  }
})

test('the only third-party name in the package is in the licences', () => {
  // The product carries its own name throughout: files, commands, guides, code.
  // MIT requires the notices to travel, so they live in one file and nowhere
  // else.
  const suspects = /builder\s?methods|buildermethods|design\s?os|agent\s?os|bm-skills|agentcanon|casjam/i
  const leaks = buildPackage(compileProject(input as never))
    .filter((file) => file.path !== 'docs/LICENSES.md' && suspects.test(file.content))
    .map((file) => file.path)
  assert.deepEqual(leaks, [])
  assert.ok(buildPackage(compileProject(input as never)).some((file) => file.path === 'docs/LICENSES.md' && /MIT/i.test(file.content)))
})

test('every framework target emits a component for every screen', () => {
  const base = compileProject(input as never)
  const screens = base.sections.reduce((total, section) => total + section.screens.length, 0)

  for (const framework of FRAMEWORKS) {
    const project = {
      ...base,
      system: {
        ...base.system,
        stack: base.system.stack.map((entry) => (entry.layer === 'UI runtime' ? { ...entry, choice: framework.label } : entry)),
      },
    }
    const files = buildPackage(project)
    const components = files.filter(
      (file) =>
        /^sections\/.+\/components\/[^/]+$/.test(file.path) &&
        !file.path.endsWith('index.ts') &&
        file.path.endsWith(`.${framework.extension}`),
    )
    assert.equal(components.length, screens, `${framework.label} has ${components.length} components for ${screens} screens`)

    // The section index must point at files that were actually written.
    for (const section of project.sections) {
      const index = files.find((file) => file.path === `sections/${section.id}/components/index.ts`)
      assert.ok(index, `${framework.label}: ${section.id} has no components/index.ts`)
      for (const line of index!.content.split('\n').filter(Boolean)) {
        const target = line.match(/from '\.\/(.+)'/)?.[1]
        assert.ok(target, `${section.id}: unparsable export line: ${line}`)
        // React/Vue/Svelte index a bare name; Angular and Lit append a suffix.
        const prefix = `sections/${section.id}/components/${target}`
        assert.ok(
          files.some(
            (existing) =>
              existing.path === prefix ||
              existing.path === `${prefix}.${framework.extension}` ||
              (existing.path.startsWith(`${prefix}.`) && existing.path.endsWith(`.${framework.extension}`)),
          ),
          `${framework.label}: ${section.id}/index.ts points at a missing ${target}`,
        )
      }
    }

    if (framework.id === 'react') continue
    assert.ok(files.some((file) => file.path === 'FRAMEWORK.md'), `${framework.label} ships no FRAMEWORK.md`)
    if (framework.id === 'preact') {
      const component = components[0]
      assert.match(component!.content, /from 'preact\/hooks'/, 'Preact must import preact/hooks')
      assert.doesNotMatch(component!.content, /from 'react'/, 'Preact must not import react')
    } else {
      const renderer = files.find((file) => file.path === 'ui/renderer.ts')
      assert.ok(renderer, `${framework.label} ships no renderer`)
      const imports = renderer!.content.match(/^import .*$/gm) ?? []
      assert.deepEqual(imports, ["import screens from './screens.json'"], 'the renderer must stay framework-free')
      assert.ok(files.some((file) => file.path === 'ui/screens.json'), `${framework.label} ships no screen IR`)
    }
  }
})

test('a framework component carries no data, only props', () => {
  const base = compileProject(input as never)
  const project = {
    ...base,
    system: {
      ...base.system,
      stack: base.system.stack.map((entry) => (entry.layer === 'UI runtime' ? { ...entry, choice: 'Vue 3' } : entry)),
    },
  }
  const files = buildPackage(project)
  const component = files.find((file) => file.path.startsWith('sections/') && file.path.endsWith('.vue'))!
  assert.ok(component, 'no Vue component emitted')
  assert.doesNotMatch(component!.content, /sample-data|fetch\(/, 'a component must not import data or fetch')
  assert.match(component!.content, /defineProps/, 'Vue components declare their props')
  assert.match(component!.content, /renderScreen\(/, 'Vue components render through the shared renderer')
})

test('a project saved by an older version is rebuilt, not trusted', () => {
  // This is the shape that shipped before flows and the system record existed.
  const legacy = {
    id: 'legacy-1',
    name: 'Old Careline',
    idea: 'a clinic front desk',
    seed: 4242,
    archetypeId: 'clinic',
    createdAt: 1_700_000_000_000,
    // Proof that a description produced it: only then is it the builder's.
    described: true,
  }

  const migrated = migrateProject(legacy)
  assert.ok(migrated, 'a legacy record must migrate, not disappear')
  assert.equal(migrated!.id, 'legacy-1')
  assert.ok(Array.isArray(migrated!.flows), 'flows must exist after migration')
  assert.ok(migrated!.sections.length > 0, 'sections must be recompiled')
  assert.ok(migrated!.sections.every((section) => Array.isArray(section.screens)))
  assert.ok(Array.isArray(migrated!.data.entities) && migrated!.data.entities.length > 0)
  assert.ok(Array.isArray(migrated!.design.colors) && migrated!.design.colors.length > 0)
  assert.ok(Array.isArray(migrated!.system.stack) && migrated!.system.stack.length > 0)

  // Records that cannot be rebuilt are dropped, and junk never reaches a view.
  assert.equal(migrateProject({ id: 'no-seed' }), null)
  assert.equal(migrateProject('nope'), null)
  assert.deepEqual(migrateProjects([null, 42, { id: 'x' }, legacy]).map((project) => project.id), ['legacy-1'])
})

/* -------------------------------------------------------------------------
   a tick means the stage is done
   ---------------------------------------------------------------------- */

test('a freshly compiled product has no completed stage', () => {
  const project = compileProject(input as never)
  const captured = project.sections.flatMap((s) => s.screens.map((x) => x.id))
  assert.deepEqual(confirmedPhases(project), [], 'nothing is confirmed on a new project')
  for (const phase of PHASES) {
    assert.equal(isStageDone(project, captured, phase.id), false, `${phase.id} must not be ticked`)
  }
  assert.equal(Object.values(completedPhases(project, captured)).filter(Boolean).length, 0)
})

test('complete artefacts are not the same as a completed stage', () => {
  const project = compileProject(input as never)
  const captured = project.sections.flatMap((s) => s.screens.map((x) => x.id))
  for (const phase of PHASES) {
    assert.equal(phaseReady(project, captured, phase.id), true, `${phase.id} artefacts should be complete`)
    assert.equal(phaseBlockers(project, captured, phase.id).length, 0)
    assert.equal(isStageDone(project, captured, phase.id), false, `${phase.id} still needs confirming`)
  }
})

test('confirming a stage ticks exactly that stage, in order', () => {
  const project = compileProject(input as never)
  const captured = project.sections.flatMap((s) => s.screens.map((x) => x.id))

  assert.equal(nextStage(project, captured).id, 'product')

  const confirmed = { ...project, progress: { confirmed: ['product'] } }
  assert.equal(isStageDone(confirmed, captured, 'product'), true)
  assert.equal(isStageDone(confirmed, captured, 'data-shape'), false)
  assert.equal(nextStage(confirmed, captured).id, 'data-shape')
  assert.equal(Object.values(completedPhases(confirmed, captured)).filter(Boolean).length, 1)

  // A confirmation for a stage whose artefacts are gone does not count.
  const broken = { ...confirmed, progress: { confirmed: ['data-shape'] }, data: { ...project.data, entities: [] } }
  assert.equal(isStageDone(broken, captured, 'data-shape'), false, 'an emptied stage loses its tick')
  assert.deepEqual(phaseBlockers(broken, captured, 'data-shape'), ['no entities yet'])
})

test('a described product nobody asked for is dropped, not reopened', () => {
  // The workspace used to open on a sample product. A browser that still holds
  // one was showing a marketplace with sections, a design system and an export
  // that the builder never asked for — every reload. A described record now has
  // to prove a description produced it; the samples never could.
  const sample = {
    id: 'artisan-flow-2ell',
    name: 'Stall & Co',
    idea: 'A marketplace where township artisans sell directly to buyers across South Africa',
    seed: 112233,
    archetypeId: 'marketplace',
    createdAt: 1_700_000_000_000,
    sections: [],
  }
  assert.equal(migrateProject(sample), null, 'an unmarked description is not the builder\'s product')
  assert.equal(
    migrateProject({ ...sample, described: false }),
    null,
    'and saying so does not make it theirs',
  )
  // Undescribed records are kept: they are empty, and dropping them would give
  // the workspace a new id on every reload for no reason.
  const blank = migrateProject({ id: 'untitled', name: 'Untitled product', idea: '', seed: 1111, archetypeId: 'saas' })
  assert.ok(blank, 'an empty record survives')
  assert.equal(blank!.idea, '')
})

test('migration keeps earned ticks and never invents new ones', () => {
  const legacy = {
    id: 'legacy-2',
    idea: 'a clinic front desk',
    seed: 4242,
    archetypeId: 'clinic',
    createdAt: 1_700_000_000_000,
    described: true,
    progress: { confirmed: ['product', 42, null] },
  }
  const migrated = migrateProject(legacy)
  assert.ok(migrated)
  assert.deepEqual(migrated!.progress?.confirmed, ['product'], 'string confirmations survive, junk is dropped')

  const withoutProgress = migrateProject({ ...legacy, progress: undefined })
  assert.deepEqual(withoutProgress!.progress?.confirmed, [], 'a record with no confirmations gets none')
})

/* -------------------------------------------------------------------------
   the builder's own description drives the build
   ---------------------------------------------------------------------- */

test('the description decides the archetype', () => {
  const cases: [string, string][] = [
    ['A booking tool for mobile dog groomers: owners pick a slot, groomers see the day route.', 'clinic'],
    ['A clinic front desk that registers patients and keeps each visit notes in one place.', 'clinic'],
    ['A marketplace where township artisans list products and buyers pay into escrow.', 'marketplace'],
    ['A tool for scheduling volunteer shifts at a food bank.', 'peopleops'],
    ['A deliveries tracker for a courier company with drivers on the road all day.', 'logistics'],
    ['A conference ticketing site for a design events company.', 'events'],
    ['A learner portal where students follow courses and teachers set assignments.', 'learning'],
  ]
  for (const [idea, expected] of cases) {
    const intake = profileIdea(idea)
    assert.equal(intake.archetypeId, expected, `${idea} → ${intake.archetypeId}`)
    assert.equal(compileProject({ idea }).archetypeId, expected, 'the compiler follows the reading')
  }
})

test('a product named from the description replaces the stock name', () => {
  const idea = 'A booking tool for mobile dog groomers: owners pick a slot.'
  const project = compileProject({ idea })
  assert.match(project.name, /^Groomer /, `read the name as ${project.name}`)
  assert.notEqual(project.name, compileProject({ archetypeId: 'clinic', seed: 4242 }).name)
  assert.equal(project.id.startsWith('groomer-'), true)
})

test('the brief quotes the description instead of hiding it in a footnote', () => {
  const idea = 'A booking tool for mobile dog groomers: owners pick a slot, groomers see the day route.'
  const brief = compileProject({ idea }).brief
  assert.ok(brief.summary.startsWith('A booking tool for mobile dog groomers'), brief.summary.slice(0, 60))
  // Quoted once, at the top. The elevator and the problems are copy, not the
  // builder's paragraph pasted back at them a second and third time.
  assert.equal(brief.elevator.split('. ').length <= 3, true, brief.elevator)
  assert.ok(!brief.problems[0].detail.includes('own words'), 'the problem does not re-quote the brief')
  assert.equal(brief.personas[0].segment, 'mobile dog groomers')
})

test('other archetypes keep their own briefs, untouched', () => {
  // A pack's objects are shared module state; a project must not mutate them.
  const before = JSON.stringify(compileProject({ archetypeId: 'clinic', seed: 7 }).brief.problems)
  compileProject({ idea: 'A clinic front desk that registers patients.' })
  const after = JSON.stringify(compileProject({ archetypeId: 'clinic', seed: 7 }).brief.problems)
  assert.equal(before, after)
})

test('an unreadable description still compiles, and says so', () => {
  const intake = profileIdea('Something for my team')
  assert.equal(intake.archetypeId, '')
  assert.match(describeIntake(intake), /no category words were recognised/)
  const project = compileProject({ idea: 'Something for my team' })
  assert.ok(project.sections.length > 0, 'the starter shape is still built')
  assert.equal(profileIdea('').used, false)
})

/* ---- branding the captured site ------------------------------------------ */

test('rebranding a served page leaves no trace of the site it was captured from', () => {
  const page = [
    '<html><head><title inertia>Builder Methods | Stay ahead</title></head><body>',
    '<a href="/about" aria-label="Builder Methods"><img src="images/logos/prodops-wordmark.svg" alt=""></a>',
    '<p>Brian Casel writes about Agent OS at buildermethods.com.</p>',
    '<script type="application/ld+json">{"@type":"Person","name":"Brian Casel","url":"https://briancasel.com"}</script>',
    '</body></html>',
  ].join('\n')
  const out = rebrand(page, '/')
  assert.doesNotMatch(out, OLD_BRAND)
  assert.doesNotMatch(out, /Agent OS/)
  assert.match(out, /ProdOps/)
  assert.match(out, /Lulamile Mkhungela/)
  // The wordmark is inlined, so the logo costs no request and survives file://
  assert.match(out, /src="data:image\/svg\+xml;base64,/)
  assert.doesNotMatch(out, /images\/logos\//)
  // Not just the words: no URL in the page may still name the old brand.
  assert.doesNotMatch(out, /buildermethods/i)
})

test('rebranding renames the products but never rewrites the capture’s own links', () => {
  const page =
    '<html><head><title>Design OS</title></head><body>' +
    '<a href="/agent-os/installation">Agent OS installation</a>' +
    '<code>~/agent-os/standards/index.yml</code></body></html>'
  const out = rebrand(page, '/agent-os/installation')
  // Display names are ProdOps's.
  assert.match(out, /<title>ProdOps<\/title>/)
  assert.match(out, /Standards installation/)
  // Slugs are the mirror's own paths: every link in the capture points at them.
  assert.match(out, /href="\/agent-os\/installation"/)
  assert.match(out, /agent-os\/standards\/index\.yml/)
})

test('a photograph slot gets the square mark, not a wordmark', () => {
  const page =
    '<html><head><title>About</title></head><body>' +
    '<img class="avatar" src="../images/marks/prodops-mark.svg" alt="">' +
    '<img class="hero" src="https://buildermethods-production.s3.us-east-2.amazonaws.com/abc"></body></html>'
  const out = rebrand(page, '/articles/one.html')
  const sources = [...out.matchAll(/src="(data:image\/svg\+xml;base64,[^"]+)"/g)].map((m) => m[1])
  const mark = `data:image/svg+xml;base64,${readFileSync(new URL('../public/prodops-mark.svg', import.meta.url)).toString('base64')}`
  const wordmark = `data:image/svg+xml;base64,${readFileSync(new URL('../public/prodops-wordmark.svg', import.meta.url)).toString('base64')}`
  assert.equal(sources.length, 2)
  // Both slots are 40px circles or blurred heroes: a wordmark would be unreadable.
  assert.ok(sources.every((src) => src === mark))
  assert.ok(!out.includes(wordmark))
  assert.doesNotMatch(out, /\.\.\/data:/)
})

test('a page with no title is given one that names the product', () => {
  const out = rebrand('<html><head></head><body><p>Nothing yet</p></body></html>', '/tools.html')
  assert.match(out, /<title>Tools — ProdOps<\/title>/)
})

test('rebranding never renames a path — only the words on the page', () => {
  const page =
    '<html><head><title>tools</title><link rel="canonical" href="agentcanon.html"></head><body>' +
    '<a class="ds-listing" href="agentcanon.html">agentcanon</a>' +
    '<img src="../images/logos/prodops-wordmark-light.svg" alt="Builder Methods"></body></html>'
  const out = rebrand(page, '/tools.html')
  // The link still points at the page it named, and the words are ProdOps's.
  assert.match(out, /href="agentcanon\.html"/)
  assert.match(out, />Agents canon</)
  // A relative wordmark is inlined whole: no "../data:" prefix survives.
  assert.doesNotMatch(out, /\.\.\/data:/)
  assert.match(out, /src="data:image\/svg\+xml;base64,/)
  assert.match(out, /alt="ProdOps"/)
})

/* ---- scope: nothing is compiled that the builder did not ask for --------- */

test('a described product compiles only the sections the description asks for', () => {
  const product = compileProject({ idea: 'a marketplace for township artisans' })
  const ids = product.sections.map((section) => section.id)
  assert.ok(ids.length >= 2, 'a marketplace still has a usable spine')
  // The ops dashboard was the complaint that started this: it is not in a
  // one-sentence artisan marketplace, and it is not in the nav either.
  assert.equal(ids.includes('control-room'), false)
  assert.equal(product.design.layout.nav.includes('Control room'), false)
  assert.deepEqual(
    product.design.layout.nav,
    product.sections.map((section) => section.name),
    'the shell navigates to the sections that exist, nothing else',
  )
})

test('everything the pack offered is reported, kept or not, with a reason', () => {
  const product = compileProject({ idea: 'a marketplace for township artisans' })
  const scope = product.scope ?? []
  assert.ok(scope.length > product.sections.length, 'the dropped sections are listed too')
  for (const decision of scope) {
    assert.ok(decision.why.length > 0, `${decision.name} says why`)
    assert.equal(
      product.sections.some((section) => section.id === decision.id),
      decision.included,
      `${decision.name}: the report matches what compiled`,
    )
  }
})

test('a description that asks for ops gets the control room', () => {
  const product = compileProject({
    idea: 'an ops dashboard for our marketplace: what is blocked, what is late, plus payouts and disputes',
  })
  assert.ok(product.sections.some((section) => section.id === 'control-room'))
})

test('the builder can add and remove a section by hand', () => {
  const base = compileProject({ idea: 'a marketplace for township artisans' })
  const dropped = (base.scope ?? []).find((decision) => !decision.included)
  assert.ok(dropped, 'the plain idea leaves something out')
  const added = compileProject({
    idea: base.idea,
    seed: base.seed,
    archetypeId: base.archetypeId,
    scopeChoice: { include: [dropped.id] },
  })
  assert.ok(added.sections.some((section) => section.id === dropped.id))
  const removed = compileProject({
    idea: base.idea,
    seed: base.seed,
    archetypeId: base.archetypeId,
    scopeChoice: { exclude: [base.sections[0].id] },
  })
  assert.equal(removed.sections.some((section) => section.id === base.sections[0].id), false)
})

test('an undescribed product still compiles its archetype as chosen', () => {
  // With no words to read there is nothing to filter by: the builder picked the
  // pack, so the pack stands — and the UI shows none of it until they describe.
  const product = compileProject({ archetypeId: 'clinic', seed: 99 })
  assert.equal(product.sections.length, 6)
})

test('the brief asks what the description did not answer', () => {
  const thin = profileIdea('a marketplace')
  const gaps = intakeGaps(thin, 'a marketplace')
  assert.ok(gaps.some((gap) => /who is this for/i.test(gap)))
  assert.ok(gaps.some((gap) => /main thing/i.test(gap)))
  const answered = profileIdea(
    'A booking tool for mobile dog groomers: owners pick a slot and pay on arrival. It must work on a phone, offline, because the groomer is on the road all day. We charge R99 a month.',
  )
  const remaining = intakeGaps(answered, 'A booking tool for mobile dog groomers: owners pick a slot and pay on arrival. It must work on a phone, offline, because the groomer is on the road all day. We charge R99 a month.')
  assert.equal(remaining.some((gap) => /who is this for|earn or save|where is it used|kind of product/i.test(gap)), false, remaining.join(' | '))
})

/* ---- a stored product is recompiled when the compiler moves on ----------- */

test('a product compiled by an older version is recompiled, not trusted', () => {
  // What a builder's browser actually held after the previous release: a
  // complete marketplace record, six sections, Control room included.
  const old = compileProject({ idea: 'a marketplace for township artisans', seed: 112233 })
  const stored = JSON.parse(JSON.stringify(old)) as Record<string, unknown>
  delete stored.compiler
  stored.sections = compileProject({ archetypeId: 'marketplace', seed: 112233 }).sections

  const migrated = migrateProject(stored)
  assert.ok(migrated, 'the record is rebuilt')
  assert.ok(
    migrated!.sections.some((section) => section.id === 'control-room') === false,
    'and the sections follow the description again',
  )
  // The builder's own work survives the rebuild.
  assert.equal(migrated!.id, old.id)
  assert.equal(migrated!.name, old.name)
})

test('a product compiled by this version is left exactly as it is', () => {
  const product = compileProject({ idea: 'a marketplace for township artisans' })
  const stored = JSON.parse(JSON.stringify(product))
  const migrated = migrateProject(stored)
  // Compared after the same round-trip: JSON drops `undefined` keys, and that
  // is the only difference a trusted record may have.
  assert.deepEqual(migrated, JSON.parse(JSON.stringify(product)))
})

test('the auto-seeded sample is not treated as the builder’s product', () => {
  // What every browser held before the workspace opened on an empty product.
  const sample = compileProject({
    idea: 'A marketplace where township artisans sell directly to buyers across South Africa',
    archetypeId: 'marketplace',
    seed: 112233,
  })
  assert.equal(migrateProject(JSON.parse(JSON.stringify(sample))), null)
})

/* -------------------------------------------------------------------------
   roles: a workspace runs as one role, with that role's process start to finish
   ---------------------------------------------------------------------- */

test('every role owns a process from start to finish, and the rail can show it', () => {
  assert.ok(ROLES.length >= 3, 'there is more than one role')
  for (const role of ROLES) {
    assert.ok(role.steps.length >= 5, `${role.id} has a real process, not a stub`)
    assert.ok(/PROCESS · \d+ STEPS$/.test(role.processLabel), `${role.id} names its process and step count`)
    assert.equal(role.processLabel.match(/(\d+) STEPS$/)?.[1], String(role.steps.length), `${role.id} label matches its steps`)
    for (const step of role.steps) {
      assert.ok(step.title && step.decides && step.produces.length > 0, `${role.id}.${step.id} says what it decides and produces`)
      assert.equal(typeof step.ready, 'function')
      assert.equal(typeof step.blockers, 'function')
    }
  }
})

test('the BA role does not see design or database pages', () => {
  const ba = roleById('business-analysis')!
  assert.equal(ba.steps.length, 7, 'the BA process is seven steps, matching its skill file')
  assert.equal(ba.steps[0].title, 'Vision & outcome', 'BA starts at vision & outcome')
  assert.ok(!ba.phases.includes('design'), 'design is not a BA stage')
  assert.ok(!ba.phases.includes('data-shape'), 'database design is not in the BA role')
  assert.ok(!roleAllows(ba, 'design'), 'the design route is gated for BA')
  assert.ok(!roleAllows(ba, 'data-shape'), 'the data route is gated for BA')
  assert.ok(roleAllows(ba, ''), 'BA can open the product stage')
  assert.ok(roleAllows(ba, 'sections'), 'requirements live on the sections stage')
  assert.ok(roleAllows(ba, 'tools'), 'the canon opens under every role')
  const db = roleById('database-design')!
  assert.ok(db.phases.includes('data-shape'), 'database design lives in its own role')
  assert.ok(!roleAllows(db, 'design'))
})

test('every role step carries the same three review actions', () => {
  const project = compileProject(input as never)
  for (const role of ROLES) {
    const key = reviewKey(role.id, role.steps[0].id)
    const approved = { ...project, stepReviews: { [key]: { decision: 'approved' as const, at: 1 } } }
    assert.equal(stepState(approved, role, role.steps[0]), 'approved')
    assert.equal(nextRoleStep(approved, role).id, role.steps[1].id, 'an approved step makes the next one current')
    const rejected = { ...project, stepReviews: { [key]: { decision: 'rejected' as const, at: 1 } } }
    assert.equal(stepState(rejected, role, role.steps[0]), 'rejected')
    assert.equal(nextRoleStep(rejected, role).id, role.steps[0].id, 'a rejected step is still the next thing to do')
    const revisit = { ...project, stepReviews: { [key]: { decision: 'proceed-revisit' as const, at: 1 } } }
    assert.equal(stepState(revisit, role, role.steps[0]), 'proceed-revisit')
    assert.equal(nextRoleStep(revisit, role).id, role.steps[0].id, 'a revisit flag keeps the step open')
  }
})

test('roles with no skill on the toolkit got one, and it ships in the package', () => {
  const files = buildPackage(compileProject(input as never)).map((f) => f.path)
  for (const role of ROLES) {
    const skill = roleSkill(role)
    assert.ok(skill.steps.length >= 5, `${role.id} skill parses at least five steps from its own file`)
    if (skill.created) {
      assert.ok(files.includes(skill.path), `${role.id}'s created skill ${skill.path} is in the package`)
    }
  }
  assert.ok(files.includes('.agents/skills/business-analysis/SKILL.md'))
  assert.ok(files.includes('.agents/skills/database-design/SKILL.md'))
  const baSkill = roleSkill(roleById('business-analysis')!)
  // The skill file carries the full set of phases a BA runs; the role's rail
  // groups them into six reviewable steps. Both start and end at the same place.
  assert.equal(baSkill.steps[0], 'Vision & outcome')
  assert.equal(baSkill.steps.at(-1), 'Validation & handoff')
  assert.ok(baSkill.steps.includes('Requirements elicitation'))
})

test('a rebuilt record keeps its role, its reviews and its integrated skills', () => {
  const legacy = {
    id: 'legacy-3',
    idea: 'a clinic front desk',
    seed: 4242,
    archetypeId: 'clinic',
    createdAt: 1_700_000_000_000,
    described: true,
    roleId: 'business-analysis',
    stepReviews: { 'business-analysis.vision-outcome': { decision: 'approved', note: 'vision locked', at: 5 } },
    integratedSkills: ['business-analysis', 42],
  }
  const migrated = migrateProject(legacy)!
  assert.ok(migrated)
  assert.equal(migrated.roleId, 'business-analysis')
  assert.equal(migrated.stepReviews?.['business-analysis.vision-outcome']?.decision, 'approved')
  assert.deepEqual(migrated.integratedSkills, ['business-analysis'], 'junk entries are dropped')
})

/* -------------------------------------------------------------------------
   roles: disciplines, questions, documents, references and the spec folder
   ---------------------------------------------------------------------- */

test('the design role runs the whole design discipline, end to end', () => {
  const design = roleById('product-design')!
  assert.deepEqual(
    design.tracks.map((track) => track.id),
    ['foundations', 'screens', 'craft'],
    'foundations, screens, then visual craft',
  )
  // Every step belongs to a declared track, and every track resolves to steps.
  for (const role of ROLES) {
    const ids = new Set(role.tracks.flatMap((track) => track.steps))
    for (const step of role.steps) {
      assert.ok(ids.has(step.id), `${role.id}.${step.id} is in no track`)
      assert.ok(role.tracks.some((track) => track.id === step.track), `${role.id}.${step.id} names a missing track`)
    }
    assert.equal(ids.size, role.steps.length, `${role.id} tracks cover every step exactly once`)
  }
  // The design disciplines are separate roles, and the designer owns the editor.
  for (const id of ['ux-research', 'ui-design', 'cx-design', 'product-design']) {
    assert.ok(roleById(id), `${id} exists as a design discipline`)
  }
  assert.equal(design.designRole, true, 'the product design role owns the visual editor')
  assert.ok(design.steps.some((step) => step.surface === 'visual'), 'the editor is a step of the process')
})

test('the SDLC is covered: analysis, data, design, engineering, QA, ops and delivery', () => {
  const ids = ROLES.map((role) => role.id)
  for (const required of [
    'business-analysis',
    'data-analysis',
    'ux-research',
    'ui-design',
    'cx-design',
    'product-design',
    'database-design',
    'software-engineering',
    'qa-testing',
    'devops',
    'project-management',
  ]) {
    assert.ok(ids.includes(required), `${required} is a role`)
  }
  // Database design is its own role and never a BA step.
  const ba = roleById('business-analysis')!
  assert.ok(!ba.steps.some((step) => /database|schema|entit/i.test(step.title)), 'no database step inside BA')
})

test('every step asks clarifying questions, and every question explains why', () => {
  for (const role of ROLES) {
    for (const step of role.steps) {
      assert.ok(step.questions.length >= 2, `${role.id}.${step.id} asks at least two questions`)
      for (const question of step.questions) {
        assert.ok(question.question.length > 10, `${role.id}.${step.id} has a real question`)
        assert.ok(question.why.length > 10, `${role.id}.${step.id} explains why it asks`)
      }
      assert.ok(step.deliverables.length >= 1, `${role.id}.${step.id} writes at least one document`)
      for (const deliverable of step.deliverables) {
        assert.ok(deliverable.file.startsWith(`spec/${role.id}/`), `${deliverable.file} lives in the role's spec folder`)
        assert.ok(/\.(md|html)$/.test(deliverable.file), `${deliverable.file} is a document`)
      }
    }
  }
})

test('a step cannot be approved until its questions are answered — the document says so', () => {
  const project = compileProject(input as never)
  const role = roleById('business-analysis')!
  const step = role.steps[0]
  const unanswered = renderDeliverable(project, role, step, step.deliverables[0])
  assert.ok(unanswered.includes('_Not answered yet._'), 'an unanswered question is marked, not invented')

  const answered = {
    ...project,
    answers: {
      [answerKey(role.id, step.id, 0)]: 'A clinic front desk that books, reminds and records',
      [answerKey(role.id, step.id, 1)]: 'No-shows below 10% within one quarter',
    },
  }
  const doc = renderDeliverable(answered, role, step, step.deliverables[0])
  assert.ok(doc.includes('A clinic front desk that books, reminds and records'), 'the answer is in the spec')
  assert.ok(!doc.includes('_Not answered yet._'), 'nothing is left unanswered')
  assert.equal(stepAnswers(answered, role, step).filter((a) => a.trim()).length, 2)
  assert.equal(stepQuestionsAnswered(project, role, step), 0)
})

test('the spec folder writes spec, process and roadmap documents for every role', () => {
  const project = compileProject(input as never)
  const withRole = { ...project, roleId: 'business-analysis', roles: ['product-design'] }
  const files = roleSpecFiles(withRole).map((file) => file.path)
  assert.ok(files.some((path) => path.includes('business-analysis') && path.endsWith('.md')))
  assert.ok(files.some((path) => path.includes('product-design')))
  assert.ok(files.some((path) => /\.html$/.test(path)), 'a visual sheet is HTML, not markdown')
  // The handoff carries the spec folder, the reviews and the answers.
  const pkg = buildPackage(withRole).map((file) => file.path)
  assert.ok(pkg.includes('spec/README.md'), 'the spec folder has a README')
  assert.ok(pkg.includes('product/reviews.md'), 'the reviews are written down')
  assert.ok(pkg.includes('spec/business-analysis/01-vision-outcome.md'), 'step one of BA ships')
  assert.ok(pkg.some((path) => path.startsWith('spec/product-design/')), 'the design role ships too')
})

test('every role skill is a real file, parsed, and shipped — created where none existed', () => {
  const pkg = new Set(buildPackage(compileProject(input as never)).map((file) => file.path))
  for (const role of ROLES) {
    const skill = roleSkill(role)
    assert.ok(pkg.has(skill.path) || role.skill.toolId === 'starter', `${role.id} ships ${skill.path}`)
    if (role.skill.toolId !== 'starter') {
      const parsed = vendoredSkillPhases(role.skill.toolId)
      assert.ok(parsed.steps.length >= 4, `${role.id} parses its own steps from ${role.skill.path}`)
      assert.equal(parsed.steps.length, role.steps.length, `${role.id} skill and process agree on the step count`)
    }
  }
  // The eight free tools stay exactly eight; role playbooks are a separate list.
  assert.equal(TOOLS.length, 8)
  assert.ok(ROLE_SKILLS.length >= 11, 'every role ships a playbook')
})

test('references and the design source survive a reload, like the rest of the record', () => {
  const legacy = {
    id: 'legacy-4',
    idea: 'a clinic front desk',
    seed: 4242,
    archetypeId: 'clinic',
    createdAt: 1_700_000_000_000,
    described: true,
    roleId: 'product-design',
    roles: ['qa-testing', 7],
    answers: { 'product-design.design-brief.q1': 'Linear, Stripe' },
    references: [
      { id: 'ref-1', name: 'research.pdf', type: 'application/pdf', size: 10, kind: 'pdf', data: 'data:', addedAt: 1 },
      null,
    ],
    artifacts: [
      { id: 'a1', roleId: 'product-design', stepId: 'design-brief', kind: 'spec', file: 'spec/x.md', title: 't', body: '# hi', createdAt: 1 },
      { id: 42 },
    ],
    designSource: { kind: 'figma', label: 'Figma — Acme', url: 'https://figma.com/file/x', setAt: 2 },
  }
  const migrated = migrateProject(legacy)!
  assert.ok(migrated)
  assert.deepEqual(migrated.roles, ['qa-testing'], 'junk role ids are dropped')
  assert.equal(migrated.answers?.['product-design.design-brief.q1'], 'Linear, Stripe')
  assert.equal(migrated.references?.length, 1, 'a null reference is dropped')
  assert.equal(migrated.artifacts?.length, 1, 'an artifact without a body is dropped')
  assert.equal(migrated.designSource?.kind, 'figma')
})
