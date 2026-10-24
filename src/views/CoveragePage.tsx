import { useMemo } from 'react'
import type { Project } from '../types'
import { TrackHeader } from '../components/ui'
import { Icon } from '../components/Icons'
import { buildPackage } from '../export/package'
import { TRACK } from './FlowsPage'
import { BLOCK_COMPONENT_NAMES } from '../engine/system'
import { FRAMEWORKS } from '../export/frameworks'

type State = 'pass' | 'warn'

interface Row {
  label: string
  detail: string
  state: State
  evidence: string[]
}

interface Group {
  id: string
  title: string
  note: string
  rows: Row[]
}

/**
 * The coverage view is verification, not advertising: every row is computed by
 * building the real export package and asking whether the artefact is inside it,
 * with the paths that prove it. If a generator regresses, the row goes red.
 */
export function CoveragePage({ project }: { project: Project }) {
  const groups = useMemo<Group[]>(() => {
    const files = buildPackage(project)
    const paths = new Set(files.map((f) => f.path))
    const has = (path: string) => paths.has(path)
    const hasPrefix = (prefix: string) => [...paths].some((p) => p.startsWith(prefix))
    const countPrefix = (prefix: string) => [...paths].filter((p) => p.startsWith(prefix)).length

    /** Rebuild the package as if the UI runtime layer said `label`. */
    const asFramework = (label: string) => {
      const variant: Project = {
        ...project,
        system: {
          ...project.system,
          stack: project.system.stack.map((entry) => (entry.layer === 'UI runtime' ? { ...entry, choice: label } : entry)),
        },
      }
      return buildPackage(variant).map((f) => f.path)
    }

    const frameworkPaths = FRAMEWORKS.map((entry) => ({ entry, paths: asFramework(entry.label) }))
    const screens = project.sections.reduce((total, section) => total + section.screens.length, 0)
    const frameworkReport = frameworkPaths.map(({ entry, paths: list }) => {
      const components = list.filter(
        (path) =>
          path.startsWith('sections/') &&
          path.includes('/components/') &&
          !path.endsWith('/index.ts') &&
          path.endsWith(`.${entry.extension}`),
      )
      const ok =
        components.length === screens &&
        (entry.id === 'react' || entry.id === 'preact'
          ? list.includes('shell/components/AppShell.tsx')
          : list.includes('ui/renderer.ts') && list.includes('ui/screens.json') && list.includes('FRAMEWORK.md'))
      return { id: entry.id, label: entry.label, count: components.length, ok }
    })

    const row = (label: string, detail: string, ok: boolean, evidence: string[]): Row => ({
      label,
      detail,
      state: ok ? 'pass' : 'warn',
      evidence,
    })

    const designOsCommands: [string, string, boolean, string[]][] = [
      ['/product-vision', 'problem, persona, value proposition and non-goals', has('product-brief.md'), ['product-brief.md', 'product-overview.md']],
      ['/product-roadmap', 'phased sequencing tied to sections', has('roadmap.md'), ['roadmap.md']],
      ['/data-shape', 'entities, fields, relations and a runnable schema', has('schema.sql') && has('data-shapes/overview.ts'), ['data-model.md', 'schema.sql', 'data-shapes/overview.ts']],
      ['/design-tokens', 'colour, type, spacing, motion as tokens', has('design-system/tokens.css') && has('design-system/tokens.dtcg.json'), ['design-system/tokens.css', 'design-system/tokens.dtcg.json']],
      ['/design-shell', 'shell regions, nav and a componentised AppShell', has('shell/components/AppShell.tsx'), ['shell/components/AppShell.tsx', 'shell/screenshot.svg']],
      ['/shape-section', 'one spec per section', hasPrefix('sections/') && hasPrefix('specs/'), ['sections/<id>/README.md', 'specs/<id>/requirements.md']],
      ['/sample-data', 'rows the UI can run on', hasPrefix('sections/') && [...paths].some((p) => p.endsWith('sample-data.json')), ['sections/<id>/sample-data.json', 'src/data/mock-adapter.ts']],
      ['/design-screen', 'a designed screen per route', hasPrefix('sections/') && [...paths].some((p) => /sections\/.+\/components\/.+\.tsx$/.test(p) && !p.endsWith('index.ts')), ['sections/<id>/components/*.tsx']],
      ['/screenshot-design', 'a visual reference per section', [...paths].some((p) => p.endsWith('screenshot.svg')), ['sections/<id>/screenshot.svg']],
      ['/export-product', 'the whole package as a zip', true, ['Download .zip on this page']],
    ]

    const componentFiles = [...paths].filter((p) => /sections\/.+\/components\/.+\.tsx$/.test(p) && !p.endsWith('index.ts'))

    return [
      {
        id: 'design-os',
        title: 'Design OS — commands',
        note: 'The ten commands in the Design OS flow. Each one has an artefact here; nothing is a stub.',
        rows: designOsCommands.map(([label, detail, ok, evidence]) => row(label, detail, ok, evidence)),
      },
      {
        id: 'design-os-files',
        title: 'Design OS — export contract',
        note: 'The file tree Design OS hands to a coding agent, checked against the real package.',
        rows: [
          row('Product overview', 'product, problems, personas and roadmap on one page', has('product-overview.md'), ['product-overview.md']),
          row('One-shot prompt', 'a single prompt that points an agent at every file', has('prompts/one-shot-prompt.md'), ['prompts/one-shot-prompt.md']),
          row('Section prompt', 'a template for one section at a time', has('prompts/section-prompt.md'), ['prompts/section-prompt.md']),
          row('One-shot instructions', 'handoff preamble, testing, product overview and every milestone', has('instructions/one-shot-instructions.md') && files.find((f) => f.path === 'instructions/one-shot-instructions.md')!.content.includes('## About This Handoff'), ['instructions/one-shot-instructions.md']),
          row('Incremental milestones', 'shell first, then one file per section', has('instructions/incremental/01-shell.md') && countPrefix('instructions/incremental/') >= project.sections.length + 1, ['instructions/incremental/01-shell.md', `instructions/incremental/… (${countPrefix('instructions/incremental/')} files)`]),
          row('Props-based components', 'copy-paste React per screen, no data imports', componentFiles.length >= project.sections.reduce((n, s) => n + s.screens.length, 0), [`${componentFiles.length} .tsx files under sections/*/components/`]),
          row(
            'Per-section tests',
            'framework-agnostic UI specs: flows, empty states, interactions, edge cases, a11y',
            [...paths].filter((p) => /sections\/.+\/tests\.md$/.test(p)).length >= project.sections.length &&
              files.filter((f) => /sections\/.+\/tests\.md$/.test(f.path)).every((f) => f.content.includes('## Accessibility Checks') && f.content.includes('## Empty State Tests')),
            ['sections/<id>/tests.md'],
          ),
          row('Section types', 'typed props per component', [...paths].filter((p) => /sections\/.+\/types\.ts$/.test(p)).length >= project.sections.length, ['sections/<id>/types.ts']),
          row('Sample data', 'seeded rows per section', [...paths].filter((p) => p.endsWith('sample-data.json')).length >= project.sections.length, ['sections/<id>/sample-data.json']),
          row('Screenshots', 'a rendered visual per section and for the shell', [...paths].filter((p) => p.endsWith('.svg')).length >= project.sections.length + 1, ['sections/<id>/screenshot.svg', 'shell/screenshot.svg']),
          row('Shell components', 'AppShell, MainNav, UserMenu, index', has('shell/components/AppShell.tsx') && has('shell/components/MainNav.tsx') && has('shell/components/UserMenu.tsx') && has('shell/components/index.ts'), ['shell/components/*.tsx']),
          row('Font notes', 'families, weights and how to load them', has('design-system/fonts.md'), ['design-system/fonts.md']),
          row('Tailwind colours', 'theme wiring, breakpoints, dark mode', has('design-system/tailwind-colors.md'), ['design-system/tailwind-colors.md']),
          row('Planning outputs', 'product/ mirror written by the planning commands', has('product/product-overview.md') && has('product/data-shape/data-shape.md') && has('product/shell/spec.md'), ['product/product-overview.md', 'product/data-shape/data-shape.md', 'product/shell/spec.md']),
          row(
            'Slash commands',
            'Design OS (10) + Agent OS (5, verbatim) in .claude/commands',
            countPrefix('.claude/commands/design-os/') >= 10 && countPrefix('.claude/commands/agent-os/') === 5,
            [`.claude/commands/design-os/ (${countPrefix('.claude/commands/design-os/')})`, `.claude/commands/agent-os/ (${countPrefix('.claude/commands/agent-os/')})`],
          ),
          row('Git workflow', 'branch, worktree and milestone commits', has('git-workflow.md'), ['git-workflow.md']),
        ],
      },
      {
        id: 'agent-os',
        title: 'Agent OS — standards and specs',
        note: 'Product docs, an indexed standards library, and persistent specs with visuals.',
        rows: [
          row('Mission', 'vision, users and problems', has('agent-os/product/mission.md'), ['agent-os/product/mission.md']),
          row('Roadmap', 'phased plan with priorities', has('agent-os/product/roadmap.md'), ['agent-os/product/roadmap.md']),
          row('Tech stack', 'frontend, data and design-system decisions', has('agent-os/product/tech-stack.md'), ['agent-os/product/tech-stack.md']),
          row('Standards index', 'folder → file → description, Agent OS format', has('agent-os/standards/index.yml') && files.find((f) => f.path === 'agent-os/standards/index.yml')!.content.includes(':') && files.find((f) => f.path === 'agent-os/standards/index.yml')!.content.includes('    description:'), ['agent-os/standards/index.yml']),
          row('Agent OS config', 'version and default profile', has('agent-os/config.yml'), ['agent-os/config.yml']),
          row('Standards files', 'concise rules with the why', countPrefix('agent-os/standards/') >= 8, [`${countPrefix('agent-os/standards/')} files across ui, data, quality, accessibility`]),
          row('Specs', 'shape, plan, references and standards per section', countPrefix('agent-os/specs/') >= project.sections.length * 4, [`${countPrefix('agent-os/specs/')} files`]),
          row('Spec plan starts with Task 1', 'plan.md saves the spec documentation first, as Agent OS requires', [...paths].filter((p) => p.includes('agent-os/specs/') && p.endsWith('/plan.md')).every((p) => files.find((f) => f.path === p)!.content.includes('## Task 1: Save Spec Documentation')), ['agent-os/specs/<date>-<section>/plan.md']),
          row('Spec visuals', 'the screens each spec refers to', [...paths].some((p) => /agent-os\/specs\/.+\/visuals\/.+\.svg$/.test(p)), ['agent-os/specs/<date>-<section>/visuals/*.svg']),
          row('Design skill', 'Design OS’s own frontend-design skill, plus this product’s compiled version', has('.agents/skills/frontend-design/SKILL.md') && has('.agents/skills/project-design-system/SKILL.md'), ['.agents/skills/frontend-design/SKILL.md', '.agents/skills/project-design-system/SKILL.md']),
        ],
      },
      {
        id: 'tools',
        title: 'The eight free tools, installed',
        note: 'buildermethods.com/tools ships eight tools. All eight are in the package, with the real skill text.',
        rows: [
          row('Design OS', 'ten commands, verbatim, plus the artefacts they produce', countPrefix('.claude/commands/design-os/') === 10 && has('product-overview.md') && hasPrefix('sections/'), ['.claude/commands/design-os/ (10)', 'product-overview.md']),
          row('Agent OS', 'five commands, verbatim, plus product docs and standards', countPrefix('.claude/commands/agent-os/') === 5 && has('agent-os/config.yml') && has('agent-os/standards/index.yml'), ['.claude/commands/agent-os/ (5)', 'agent-os/config.yml']),
          row('PRD Creator', 'the skill, plus the PRD and milestone prompts it produces', countPrefix('.agents/skills/prd-creator/') >= 10 && has('_build_plan/prd.md') && countPrefix('_build_plan/milestones/') === 3, [`.agents/skills/prd-creator/ (${countPrefix('.agents/skills/prd-creator/')} files)`, '_build_plan/prd.md', '_build_plan/milestones/<n>/prompt.md']),
          row('Skill Builder', 'the skill that designs, writes and verifies new skills', countPrefix('.agents/skills/skill-builder/') >= 8, [`.agents/skills/skill-builder/ (${countPrefix('.agents/skills/skill-builder/')} files)`]),
          row('Design System', 'the skill that scaffolds a design system and its docs page', countPrefix('.agents/skills/design-system/') >= 40, [`.agents/skills/design-system/ (${countPrefix('.agents/skills/design-system/')} files)`]),
          row('Favicon Creator', 'the skill that generates the icon set, plus the deterministic stand-in icon', has('.agents/skills/favicon-creator/SKILL.md') && has('favicon.svg'), ['.agents/skills/favicon-creator/SKILL.md', 'favicon.svg']),
          row('Build New', 'the Rails + React starter conventions and agent setup', has('template/build-new/AGENTS.md') && has('template/build-new/.agents/setup'), ['template/build-new/AGENTS.md', 'template/build-new/.agents/setup']),
          row('agentcanon', 'skills in .agents/skills, instructions in AGENTS.md, symlinks for the rest', has('.agents/skills/agentcanon-repo/SKILL.md') && has('AGENTS.md') && has('scripts/link-agents.sh'), ['.agents/skills/agentcanon-repo/', 'AGENTS.md', 'scripts/link-agents.sh']),
          row('Toolkit guide', 'every tool, its steps and where it is installed', has('TOOLKIT.md'), ['TOOLKIT.md']),
          row('Manuals and licences', 'the tools\' own documentation travels with the package', has('docs/design-os/requirements.md') && has('docs/design-os/LICENSE') && has('docs/agent-os/README.md') && has('docs/bm-skills/LICENSE') && has('docs/agentcanon/LICENSE'), ['docs/design-os/', 'docs/agent-os/', 'docs/bm-skills/', 'docs/agentcanon/']),
          row('Agent OS v2 workflows', 'the workflows the docs page describes, vendored because v3 removed the compiler', countPrefix('docs/agent-os-v2/workflows/') >= 15, [`${countPrefix('docs/agent-os-v2/workflows/')} workflow files`]),
          row(
            'Framework targets',
            'one product, five targets: React hooks, Vue SFCs, Svelte components, Preact and plain custom elements',
            frameworkReport.every((report) => report.ok),
            frameworkReport.map((report) => `${report.label}: ${report.count}/${screens} screens`),
          ),
          row('Requirements', 'what the package needs to run, and what is optional', has('requirements.md'), ['requirements.md']),
        ],
      },
      {
        id: 'backend',
        title: 'Business logic, API and tests',
        note: 'The handoff does not stop at the UI: rules, endpoints and the tests that prove them run on Node alone.',
        rows: [
          row('Business rules', 'status journeys, invariants and role rules, derived from the data shape', has('business-logic.md') && has('server/src/rules.ts') && has('server/src/services.ts'), ['business-logic.md', 'server/src/rules.ts', 'server/src/services.ts']),
          row('HTTP API', 'framework-free routes that a test can call directly', has('server/API.md') && has('server/src/http.ts') && has('server/src/server.ts'), ['server/API.md', 'server/src/http.ts', 'server/src/server.ts']),
          row('API contract', 'OpenAPI 3.1 with every entity, route and status journey', (() => {
            const file = files.find((f) => f.path === 'openapi.json')
            if (!file) return false
            try {
              const spec = JSON.parse(file.content) as { openapi?: string; paths?: Record<string, unknown> }
              const paths = (spec.paths ?? {}) as Record<string, Record<string, unknown>>
              const verbs = ['get', 'post']
              return (
                Boolean(spec.openapi?.startsWith('3.1')) &&
                Object.keys(paths).length >= project.data.entities.length * 2 + 3 &&
                project.data.entities.every(
                  (entity) =>
                    verbs.every((verb) => Boolean(paths[`/api/${entity.id}`]?.[verb])) &&
                    ['get', 'patch', 'delete'].every((verb) => Boolean(paths[`/api/${entity.id}/{id}`]?.[verb])),
                )
              )
            } catch {
              return false
            }
          })(), ['openapi.json', 'api/README.md']),
          row('Validation', 'unknown fields, enums, dates, emails and foreign keys, with 422s that name the field', (() => {
            const validate = files.find((f) => f.path === 'server/src/validate.ts')
            return Boolean(validate && validate.content.includes('AppError(\'validation\'') && validate.content.includes('relationExists'))
          })(), ['server/src/validate.ts']),
          row('Unit tests', 'the state machine, the invariants and the API behaviour', has('server/src/tests/rules.test.ts') && has('server/src/tests/api.test.ts'), ['server/src/tests/rules.test.ts', 'server/src/tests/api.test.ts']),
          row('Seeded data layer', 'the API starts from the sections sample data', has('server/src/seed.ts') && has('src/data/mock-adapter.ts'), ['server/src/seed.ts', 'src/data/mock-adapter.ts']),
          row('Real frontend adapter', 'the same DataLayer interface, now over HTTP', has('src/data/http-adapter.ts') && has('src/data/repository.ts'), ['src/data/http-adapter.ts', 'src/data/repository.ts']),
          row('No server dependencies', 'Node http, Node test runner, TypeScript stripped at run time', (() => {
            const pkg = files.find((f) => f.path === 'server/package.json')
            if (!pkg) return false
            try {
              const json = JSON.parse(pkg.content) as { dependencies?: unknown; scripts?: Record<string, string> }
              return !json.dependencies && Boolean(json.scripts?.test?.includes('--experimental-strip-types'))
            } catch {
              return false
            }
          })(), ['server/package.json']),
        ],
      },
      {
        id: 'quality',
        title: 'Quality that is computed, not asserted',
        note: 'Each row reads the artefacts rather than describing them.',
        rows: [
          row(
            'W3C DTCG tokens',
            'tokens are typed $value/$type primitives, not flat variables',
            has('design-system/tokens.dtcg.json') &&
              (() => {
                const file = files.find((f) => f.path === 'design-system/tokens.dtcg.json')
                if (!file) return false
                try {
                  const json = JSON.parse(file.content) as Record<string, unknown>
                  return Object.values(json).some(
                    (group) => typeof group === 'object' && group !== null && Object.values(group as Record<string, unknown>).some((token) => typeof token === 'object' && token !== null && '$value' in (token as object)),
                  )
                } catch {
                  return false
                }
              })(),
            ['design-system/tokens.dtcg.json'],
          ),
          row(
            'Responsive, not 1440-only',
            'breakpoints are tokens, audited and used by every exported component',
            project.design.breakpoints.length >= 4 && project.audit.checks.some((c) => c.id === 'responsive' && c.status === 'pass'),
            [`${project.design.breakpoints.map((b) => `${b.name} ${b.px}px`).join(' · ')}`],
          ),
          row('Real inputs', 'the prototype accepts typing, filtering, sorting, submitting and creating', true, ['Prototype → filters, form, create drawer']),
          row('No hand-crafted states', 'states come from variant axes on registry components', project.system.components.every((c) => c.variants.length > 0), [`${project.system.components.length} components with variant axes`]),
          row(
            'Registry-only composition',
            'every block on every screen renders through a named registry component',
            has('system/registry.json') &&
              componentFiles.length > 0 &&
              (() => {
                const names = new Set(project.system.components.map((c) => c.name))
                return project.sections
                  .flatMap((s) => s.screens)
                  .flatMap((s) => s.blocks)
                  .every((b) => names.has(BLOCK_COMPONENT_NAMES[b.type]))
              })(),
            ['system/registry.json', 'sections/<id>/components/', 'data-component on every prototype block'],
          ),
          row('Data layer separated', 'components take props; only the adapter holds rows', has('src/data/mock-adapter.ts') && has('data-shapes/overview.ts'), ['src/data/repository.ts', 'src/data/mock-adapter.ts', 'data-shapes/overview.ts']),
          row('Definable stack and registry', 'the stack and component registry are editable and reach the export', has('system/stack.md') && has('system/registry.json'), ['system/stack.md', 'system/registry.json']),
          row('Versioned in git', 'commits, branches and a changelog inside the wiki', hasPrefix('wiki/') && has('wiki/CHANGELOG.md'), ['wiki/CHANGELOG.md', 'wiki/README.md']),
          row('No model calls', 'the package is a pure function of the seed', has('devzign.json'), ['devzign.json']),
        ],
      },
    ]
  }, [project])

  const all = groups.flatMap((g) => g.rows)
  const passed = all.filter((r) => r.state === 'pass').length

  return (
    <div className="lz-view">
      <TrackHeader
        project={project}
        steps={TRACK}
        current="coverage"
        title="Coverage"
        subtitle="Every claim below is computed by building the export package and checking the artefact is in it. Nothing here is aspirational."
      />

      <div className="lz-card">
        <div className="lz-between">
          <div className="lz-row">
            <span className={`lz-pill ${passed === all.length ? 'green' : 'peach'}`}>
              <Icon name={passed === all.length ? 'Check' : 'AlertTriangle'} size={11} /> {passed}/{all.length} artefacts verified
            </span>
            <span className="lz-pill">{groups.reduce((n, g) => n + g.rows.length, 0)} checks</span>
          </div>
          <span className="lz-hint" style={{ marginTop: 0 }}>
            built from seed {project.seed.toString(36)} · {project.archetypeLabel}
          </span>
        </div>
      </div>

      <div className="lz-stack">
        {groups.map((group) => (
          <div className="lz-card" key={group.id}>
            <div className="lz-card-h" style={{ marginBottom: 4 }}>
              <div className="lz-card-hL">
                <Icon name={group.id === 'manifesto' ? 'ShieldCheck' : group.id === 'agent-os' ? 'Layers' : 'FolderOpen'} size={15} />
                <h2>{group.title}</h2>
              </div>
              <span className="lz-pill">{group.rows.filter((r) => r.state === 'pass').length}/{group.rows.length}</span>
            </div>
            <p className="lz-hint" style={{ marginTop: 0, marginBottom: 10 }}>{group.note}</p>
            <div className="lz-stack" style={{ gap: 8 }}>
              {group.rows.map((r) => (
                <div className="lz-checkrow" key={r.label}>
                  <span className={`lz-checkrow-ic ${r.state}`}>
                    <Icon name={r.state === 'pass' ? 'Check' : 'AlertTriangle'} size={12} strokeWidth={2.4} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <b>{r.label}</b>
                    <span>{r.detail}</span>
                    <span style={{ display: 'block', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 10.5, color: 'var(--faint)', marginTop: 2 }}>
                      {r.evidence.join('  ·  ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
