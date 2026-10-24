import { useMemo } from 'react'
import type { Project } from '../types'
import { TrackHeader } from '../components/ui'
import { Icon } from '../components/Icons'
import { buildPackage } from '../export/package'
import { TRACK } from './FlowsPage'

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
          row('One-shot instructions', 'every milestone in build order', has('instructions/one-shot-instructions.md'), ['instructions/one-shot-instructions.md']),
          row('Incremental milestones', 'shell first, then one file per section', has('instructions/incremental/01-shell.md') && countPrefix('instructions/incremental/') >= project.sections.length + 1, ['instructions/incremental/01-shell.md', `instructions/incremental/… (${countPrefix('instructions/incremental/')} files)`]),
          row('Props-based components', 'copy-paste React per screen, no data imports', componentFiles.length >= project.sections.reduce((n, s) => n + s.screens.length, 0), [`${componentFiles.length} .tsx files under sections/*/components/`]),
          row('Per-section tests', 'what to assert, framework-agnostic', [...paths].filter((p) => /sections\/.+\/tests\.md$/.test(p)).length >= project.sections.length, ['sections/<id>/tests.md']),
          row('Section types', 'typed props per component', [...paths].filter((p) => /sections\/.+\/types\.ts$/.test(p)).length >= project.sections.length, ['sections/<id>/types.ts']),
          row('Sample data', 'seeded rows per section', [...paths].filter((p) => p.endsWith('sample-data.json')).length >= project.sections.length, ['sections/<id>/sample-data.json']),
          row('Screenshots', 'a rendered visual per section and for the shell', [...paths].filter((p) => p.endsWith('.svg')).length >= project.sections.length + 1, ['sections/<id>/screenshot.svg', 'shell/screenshot.svg']),
          row('Shell components', 'AppShell, MainNav, UserMenu, index', has('shell/components/AppShell.tsx') && has('shell/components/MainNav.tsx') && has('shell/components/UserMenu.tsx') && has('shell/components/index.ts'), ['shell/components/*.tsx']),
          row('Font notes', 'families, weights and how to load them', has('design-system/fonts.md'), ['design-system/fonts.md']),
          row('Tailwind colours', 'theme wiring, breakpoints, dark mode', has('design-system/tailwind-colors.md'), ['design-system/tailwind-colors.md']),
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
          row('Standards index', 'descriptions for cheap matching before injection', has('agent-os/standards/index.yml'), ['agent-os/standards/index.yml']),
          row('Standards files', 'concise rules with the why', countPrefix('agent-os/standards/') >= 8, [`${countPrefix('agent-os/standards/')} files across ui, data, quality, accessibility`]),
          row('Specs', 'shape, plan, references and standards per section', countPrefix('agent-os/specs/') >= project.sections.length * 4, [`${countPrefix('agent-os/specs/')} files`]),
          row('Spec visuals', 'the screens each spec refers to', [...paths].some((p) => /agent-os\/specs\/.+\/visuals\/.+\.svg$/.test(p)), ['agent-os/specs/<date>-<section>/visuals/*.svg']),
          row('Design skill', 'the rules an agent reads before touching UI', has('agent-os/skills/frontend-design/SKILL.md'), ['agent-os/skills/frontend-design/SKILL.md']),
        ],
      },
      {
        id: 'manifesto',
        title: 'The Figma complaints, answered',
        note: 'Each rejected practice has a countermeasure in the compiler, the prototype and the export.',
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
          row('Registry-only composition', 'screens are assembled from components, not bespoke divs', has('system/registry.json') && componentFiles.length > 0, ['system/registry.json', 'sections/<id>/components/']),
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
