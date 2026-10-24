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
import { ARCHETYPES, compileProject } from '../src/engine'
import { BLOCK_COMPONENT_NAMES } from '../src/engine/system'
import { buildPackage } from '../src/export/package'
import { TOOLS } from '../src/tools'
import { FRAMEWORKS } from '../src/export/frameworks'

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

test('all eight free tools are in the package', () => {
  const files = buildPackage(compileProject(input as never))
  const paths = new Set(files.map((f) => f.path))
  assert.equal(TOOLS.length, 8)
  for (const skill of ['prd-creator', 'skill-builder', 'design-system', 'favicon-creator', 'agentcanon-repo', 'agentcanon-manifest']) {
    assert.ok([...paths].some((p) => p.startsWith(`.agents/skills/${skill}/`)), `${skill} missing`)
  }
  assert.ok(paths.has('template/build-new/AGENTS.md'))
  assert.equal([...paths].filter((p) => p.startsWith('.claude/commands/design-os/')).length, 10)
  assert.equal([...paths].filter((p) => p.startsWith('.claude/commands/agent-os/')).length, 5)
  assert.ok(paths.has('AGENTS.md') && paths.has('TOOLKIT.md') && paths.has('scripts/link-agents.sh'))
  assert.ok(paths.has('_build_plan/prd.md'), 'PRD Creator should leave a PRD behind')
  assert.ok([...paths].filter((p) => p.startsWith('_build_plan/milestones/')).length >= 3, 'one prompt per milestone')
  assert.equal([...paths].filter((p) => p.startsWith('.claude/skills/')).length, 0, 'skills must live in the canon')
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

test('the manuals, licences and requirements travel with the package', () => {
  const paths = new Set(buildPackage(compileProject(input as never)).map((f) => f.path))
  for (const path of [
    'requirements.md',
    'docs/README.md',
    'docs/design-os/requirements.md',
    'docs/design-os/LICENSE',
    'docs/agent-os/README.md',
    'docs/agent-os/LICENSE',
    'docs/agent-os-v2/README.md',
    'docs/agent-os-v2/UPSTREAM-README.md',
    'docs/bm-skills/LICENSE',
    'docs/agentcanon/LICENSE',
  ]) {
    assert.ok(paths.has(path), `${path} missing from the package`)
  }
  requireWorkflows(paths)
})

function requireWorkflows(paths: Set<string>) {
  const workflows = [...paths].filter((p) => p.startsWith('docs/agent-os-v2/workflows/'))
  assert.equal(workflows.length, 15, 'the v2 workflow set is incomplete')
}

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
        const file = target.includes('.') ? target : `${target}.${framework.extension}`
        assert.ok(
          files.some((existing) => existing.path === `sections/${section.id}/components/${file}`),
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
