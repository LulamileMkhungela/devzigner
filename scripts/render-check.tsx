import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { App } from '../src/App'
import { StoreProvider } from '../src/lib/store'
import { compileProject } from '../src/engine'
import { buildPackage } from '../src/export/package'
import { BLOCK_COMPONENT_NAMES } from '../src/engine/system'
import { ProductPage } from '../src/views/ProductPage'
import { DataShapePage } from '../src/views/DataShapePage'
import { DesignPage } from '../src/views/DesignPage'
import { ShellDesignPage } from '../src/views/ShellDesignPage'
import { SectionsPage } from '../src/views/SectionsPage'
import { SectionPage } from '../src/views/SectionPage'
import { ScreenDesignPage } from '../src/views/ScreenDesignPage'
import { ExportPage } from '../src/views/ExportPage'
import { FlowsPage } from '../src/views/FlowsPage'
import { SystemPage } from '../src/views/SystemPage'
import { PrototypePage } from '../src/views/PrototypePage'
import { EditorPage } from '../src/views/EditorPage'
import { WikiPage } from '../src/views/WikiPage'
import { CoveragePage } from '../src/views/CoveragePage'
import { ToolsPage } from '../src/views/ToolsPage'
import { TOOLS } from '../src/tools'

const store: Record<string, string> = {}
;(globalThis as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
}
;(globalThis as any).location = { hash: '' }
;(globalThis as any).window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {},
  location: { hash: '' },
}
;(globalThis as any).document = {
  documentElement: { dataset: {} },
  body: { classList: { toggle: () => {}, remove: () => {} } },
  addEventListener: () => {},
  removeEventListener: () => {},
}
;(globalThis as any).confirm = () => false

const project = compileProject({ archetypeId: 'marketplace', seed: 112233, idea: 'a marketplace for township artisans' })
const section = project.sections[0]
const screen = section.screens[0]
const wrap = (node: ReactNode) => renderToString(<StoreProvider>{node}</StoreProvider>)

const views: [string, () => string][] = [
  ['app (product)', () => renderToString(<StoreProvider><App /></StoreProvider>)],
  ['product', () => wrap(<ProductPage project={project} />)],
  ['data-shape', () => wrap(<DataShapePage project={project} />)],
  ['design', () => wrap(<DesignPage project={project} />)],
  ['design-shell', () => wrap(<ShellDesignPage project={project} fullscreen={false} />)],
  ['design-shell-full', () => wrap(<ShellDesignPage project={project} fullscreen />)],
  ['sections', () => wrap(<SectionsPage project={project} />)],
  ['section', () => wrap(<SectionPage project={project} section={section} />)],
  ['screen-design', () => wrap(<ScreenDesignPage project={project} section={section} screenId={screen.id} fullscreen={false} />)],
  ['screen-design-full', () => wrap(<ScreenDesignPage project={project} section={section} screenId={screen.id} fullscreen />)],
  ['export', () => wrap(<ExportPage project={project} />)],
  ['flows', () => wrap(<FlowsPage project={project} />)],
  ['system', () => wrap(<SystemPage project={project} />)],
  ['prototype', () => wrap(<PrototypePage project={project} />)],
  ['editor', () => wrap(<EditorPage project={project} />)],
  ['wiki', () => wrap(<WikiPage project={project} />)],
  ['coverage', () => wrap(<CoveragePage project={project} />)],
]

let failed = 0
for (const [name, fn] of views) {
  try {
    const html = fn()
    if (html.length < 400) throw new Error(`suspiciously small render (${html.length} chars)`)
    console.log(`ok  ${name.padEnd(20)} ${html.length} chars`)
  } catch (e) {
    failed++
    console.error(`ERR ${name}:`, (e as Error).message)
  }
}

// the flow must be walkable without a single byte of user input
const starterHtml = wrap(<ProductPage project={project} />)
const checks = [
  ['phase stepper present', starterHtml.includes('Data Shape') && starterHtml.includes('Continue to Data Shape')],
  ['step rail present', starterHtml.includes('lz-rail-step')],
  ['collapsibles present', starterHtml.includes('lz-fold')],
  ['export checklist present', wrap(<ExportPage project={project} />).includes('Readiness')],
  ['flows derived', project.flows.length >= 4 && project.flows.every((f) => f.steps.length >= 3)],
  ['registry populated', project.system.components.length >= 10],
  ['data layer separated', wrap(<ExportPage project={project} />).includes('src/data/mock-adapter.ts')],
  ['wiki generated', wrap(<WikiPage project={project} />).includes('wiki/') && wrap(<WikiPage project={project} />).includes('Component registry')],
  ['token editor present', wrap(<EditorPage project={project} />).includes('Primary hue')],

  /* ---- layout order: the same anatomy on every phase page ---------------- */
  /**
   * Each phase page reads top to bottom: header (where you are), guide (what to
   * do), content (the artefacts), confirm (the tick). Anything else is an
   * alignment bug a reader sees as a panel floating out of place, so the order
   * is asserted rather than eyeballed.
   */
  ...(
    [
      ['product', () => wrap(<ProductPage project={project} />)],
      ['data-shape', () => wrap(<DataShapePage project={project} />)],
      ['design', () => wrap(<DesignPage project={project} />)],
      ['sections', () => wrap(<SectionsPage project={project} />)],
      ['export', () => wrap(<ExportPage project={project} />)],
    ] as [string, () => string][]
  ).map(([phase, html]) => {
    const out = html()
    const at = (needle: string) => out.indexOf(needle)
    const order = [at('lz-pagehead'), at('lz-guide'), at('lz-stage'), at('lz-stage-done')]
    const confirmAt = Math.max(order[2], order[3])
    return [`${phase}: header → guide → content → confirm`, order[0] > -1 && order[1] > order[0] && confirmAt > order[1]] as [string, boolean]
  }),

  /* ---- the composer is the first thing on the Product page --------------- */
  ['product: the description field leads', (() => {
    const out = wrap(<ProductPage project={project} />)
    const compose = out.indexOf('lz-compose')
    return compose > -1 && compose < out.indexOf('lz-rail') && out.includes('What do you want built?')
  })()],
  ['product: the field carries a placeholder and guidance', (() => {
    const out = wrap(<ProductPage project={project} />)
    return (
      /placeholder="e\.g\. A booking tool/.test(out) &&
      ['Name the problem', 'Say who uses it', 'State the must-haves', 'Mention constraints'].every((line) => out.includes(line)) &&
      out.includes('Or start from an example') &&
      out.includes('Write at least a sentence')
    )
  })()],
  ['product: every phase ends with a completion control', ['product', 'data-shape', 'design', 'sections', 'export'].every((phase) => {
    const out = { product: wrap(<ProductPage project={project} />), 'data-shape': wrap(<DataShapePage project={project} />), design: wrap(<DesignPage project={project} />), sections: wrap(<SectionsPage project={project} />), export: wrap(<ExportPage project={project} />) }[phase]!
    return /Mark stage complete|Stage \d complete/.test(out)
  })],

  /* ---- the tools page shows every step of every tool --------------------- */
  ['tools: each tool lists its full step sequence', (() => {
    const out = wrap(<ToolsPage project={project} />)
    // Rendered text escapes ampersands, so compare the way the page contains it.
    const shown = (text: string) => out.includes(text.replace(/&/g, '&amp;'))
    const missing = TOOLS.filter((tool) => tool.steps.some((step) => !shown(step)))
    return missing.length === 0 && TOOLS.every((tool) => tool.steps.length >= 4) && out.includes('steps/write-files.md')
  })()],

  /* ---- branding -------------------------------------------------------- */
  ['the brand mark is the product one', (() => {
    const app = renderToString(<StoreProvider><App /></StoreProvider>)
    return app.includes('/prodops-mark.svg') && !app.includes('lz-brand-dot')
  })()],
  ['the credit is in the document', (() => {
    const app = renderToString(<StoreProvider><App /></StoreProvider>)
    return app.includes('developed by') && app.includes('Lulamile Mkhungela')
  })()],
  ['the starter shows no earned tick', (starterHtml.match(/lz-step is-done/g) ?? []).length === 0],

  /* ---- alignment: the tick comes before the button it unlocks ------------ */
  /**
   * "Mark this stage complete above to unlock the next phase" is only true if
   * the control really is above the button. Rendering order is the fix, so the
   * order is what the check asserts.
   */
  ...(
    [
      ['product', () => wrap(<ProductPage project={project} />)],
      ['data-shape', () => wrap(<DataShapePage project={project} />)],
      ['design', () => wrap(<DesignPage project={project} />)],
      ['sections', () => wrap(<SectionsPage project={project} />)],
    ] as [string, () => string][]
  ).map(([phase, html]) => {
    const out = html()
    const confirmAt = out.indexOf('lz-stage')
    const nextAt = out.indexOf('Continue to')
    return [`${phase}: confirm sits above the continue button`, confirmAt > -1 && nextAt > -1 && confirmAt < nextAt] as [string, boolean]
  }),

  /* ---- stat tiles stack, and never overflow their card ------------------ */
  ['stat tiles are label-above-value', (() => {
    const out = wrap(<ProductPage project={project} />)
    return (out.match(/lz-stat-label/g) ?? []).length === 4 && out.includes('lz-stat-value')
  })()],
  ['the composer keeps its idea line to one ellipsis', wrap(<ProductPage project={project} />).includes('lz-compose-current-idea')],
]

// inline token edits must re-derive tokens, screens and audit together
const edited = compileProject({ archetypeId: 'marketplace', seed: 112233, overrides: { primaryHue: 205, radius: 4, spacing: 1.15 } })
const original = compileProject({ archetypeId: 'marketplace', seed: 112233 })
checks.push(['token edit re-derives colour', edited.design.colors[0].base !== original.design.colors[0].base])
checks.push(['token edit re-derives radius', edited.design.radii.md === 4 && original.design.radii.md !== 4])
checks.push(['token edit keeps audit honest', edited.audit.checks.length === original.audit.checks.length])
checks.push(['token edit does not move requirements', JSON.stringify(edited.sections) === JSON.stringify(original.sections)])
checks.push(['mock data rows unchanged by restyle', JSON.stringify(edited.data.entities) === JSON.stringify(original.data.entities)])

// the system is definable: stack decisions and registry additions survive a compile
const custom = compileProject({
  archetypeId: 'saas',
  seed: 4242,
  systemOverrides: {
    stack: { Data: 'Raw SQL' },
    components: [
      { id: 'disputebanner', name: 'DisputeBanner', group: 'Pattern', variants: ['warning'], tokens: ['--warning-soft'], usedBy: ['Billing'], props: [] },
    ],
  },
})
checks.push(['stack override applied', custom.system.stack.find((s) => s.layer === 'Data')?.choice === 'Raw SQL'])
checks.push(['custom component registered', custom.system.components.some((c) => c.name === 'DisputeBanner')])
checks.push(['custom component reaches the package', buildPackage(custom).some((f) => f.path === 'system/registry.json' && f.content.includes('DisputeBanner'))])
// Design OS + Agent OS parity, proven from the package rather than asserted
const pkg = buildPackage(project)
const pkgPaths = new Set(pkg.map((f) => f.path))
const pkgHas = (path: string) => pkgPaths.has(path)
const pkgPrefix = (prefix: string) => [...pkgPaths].filter((p) => p.startsWith(prefix)).length
checks.push(
  ['one-shot and section prompts exported', pkgHas('prompts/one-shot-prompt.md') && pkgHas('prompts/section-prompt.md')],
  ['one-shot + incremental instructions exported', pkgHas('instructions/one-shot-instructions.md') && pkgHas('instructions/incremental/01-shell.md') && pkgPrefix('instructions/incremental/') === project.sections.length + 1],
  ['props-based components exported per screen', pkgPrefix('sections/') > 0 && pkg.filter((f) => /sections\/.+\/components\/.+\.tsx$/.test(f.path) && !f.path.endsWith('index.ts')).length === project.sections.reduce((n, s) => n + s.screens.length, 0)],
  ['per-section tests, types and sample data exported', pkg.filter((f) => /sections\/.+\/tests\.md$/.test(f.path)).length === project.sections.length && pkg.filter((f) => /sections\/.+\/types\.ts$/.test(f.path)).length === project.sections.length && pkg.filter((f) => f.path.endsWith('sample-data.json')).length === project.sections.length],
  ['shell components exported', pkgHas('shell/components/AppShell.tsx') && pkgHas('shell/components/MainNav.tsx') && pkgHas('shell/components/UserMenu.tsx') && pkgHas('shell/components/index.ts')],
  ['screenshots exported', pkgPrefix('sections/') > 0 && [...pkgPaths].filter((p) => p.endsWith('.svg')).length >= project.sections.length + 1],
  ['product overview exported', pkgHas('product-overview.md')],
  ['DTCG tokens are typed primitives', (() => {
    const file = pkg.find((f) => f.path === 'design-system/tokens.dtcg.json')
    if (!file) return false
    const json = JSON.parse(file.content) as Record<string, unknown>
    const groups = Object.entries(json).filter(([key]) => key !== '$schema' && key !== '$description')
    return groups.length >= 4 && groups.every(([, group]) => typeof group === 'object' && group !== null && Object.values(group as Record<string, unknown>).every((token) => typeof token === 'object' && token !== null && ('$value' in (token as object)) && ('$type' in (token as object))))
  })()],
  ['breakpoints are tokens and audited', project.design.breakpoints.length >= 4 && project.audit.checks.some((c) => c.id === 'responsive' && c.status === 'pass')],
  ['breakpoint tokens documented for Tailwind', pkg.find((f) => f.path === 'design-system/tailwind-colors.md')!.content.includes('--breakpoint')],
  ['agent-os product docs exported', pkgHas('agent-os/product/mission.md') && pkgHas('agent-os/product/roadmap.md') && pkgHas('agent-os/product/tech-stack.md')],
  ['agent-os standards indexed', pkgHas('agent-os/standards/index.yml') && pkgPrefix('agent-os/standards/') >= 8],
  ['agent-os specs with visuals', pkgPrefix('agent-os/specs/') >= project.sections.length * 4],
  ['product planning outputs exported', pkgHas('product/product-overview.md') && pkgHas('product/product-roadmap.md') && pkgHas('product/data-shape/data-shape.md') && pkgHas('product/design-system/colors.json') && pkgHas('product/design-system/typography.json') && pkgHas('product/shell/spec.md')],
  ['design-os commands installed verbatim', pkgPrefix('.claude/commands/design-os/') === 10 && pkg.find((f) => f.path === '.claude/commands/design-os/product-vision.md')!.content.startsWith('# Product Vision\n\nYou are helping the user define their product vision for Design OS') && pkg.find((f) => f.path === '.claude/commands/design-os/export-product.md')!.content.includes('product-plan/instructions/incremental/01-shell.md')],
  ['design-os skill vendored into the canon', pkg.find((f) => f.path === '.agents/skills/frontend-design/SKILL.md')!.content.startsWith('---\nname: frontend-design') && pkg.some((f) => f.path === '.agents/skills/project-design-system/SKILL.md')],
  ['manuals and licences ship with the package', ['docs/design-os/requirements.md', 'docs/design-os/LICENSE', 'docs/agent-os/README.md', 'docs/agent-os/CHANGELOG.md', 'docs/agent-os/LICENSE', 'docs/bm-skills/README.md', 'docs/bm-skills/LICENSE', 'docs/agentcanon/LICENSE', 'requirements.md'].every((path) => pkgHas(path))],
  ['agent-os v2 workflows are kept', pkgPrefix('docs/agent-os-v2/workflows/') >= 15 && pkg.find((f) => f.path === 'docs/agent-os-v2/README.md')!.content.includes('v3 does not compile')],
  ['openapi describes every entity', (() => {
    const file = pkg.find((f) => f.path === 'openapi.json')
    if (!file) return false
    const spec = JSON.parse(file.content) as { openapi: string; paths: Record<string, Record<string, unknown>>; components: { schemas: Record<string, unknown> } }
    return (
      spec.openapi.startsWith('3.1') &&
      Object.keys(spec.paths).length >= project.data.entities.length * 2 + 3 &&
      project.data.entities.every(
        (e) =>
          Boolean(spec.components.schemas[e.name]) &&
          ['get', 'post'].every((verb) => Boolean(spec.paths[`/api/${e.id}`]?.[verb])) &&
          ['get', 'patch', 'delete'].every((verb) => Boolean(spec.paths[`/api/${e.id}/{id}`]?.[verb])),
      )
    )
  })()],
  ['prd-creator output is real', pkgHas('_build_plan/prd.md') && pkgPrefix('_build_plan/milestones/') === 3 && pkg.find((f) => f.path.startsWith('_build_plan/milestones/'))!.content.includes('milestone-log.md') && pkgHas('favicon.svg')],
  ['all eight free tools installed', ['prd-creator', 'skill-builder', 'design-system', 'favicon-creator', 'agentcanon-repo', 'agentcanon-manifest'].every((skill) => pkg.some((f) => f.path.startsWith('.agents/skills/' + skill + '/'))) && pkgHas('template/build-new/AGENTS.md') && pkgHas('.claude/commands/design-os/product-vision.md') && pkgHas('.claude/commands/agent-os/plan-product.md') && pkgHas('TOOLKIT.md')],
  ['agentcanon convention wired', pkg.find((f) => f.path === 'AGENTS.md')!.content.includes('## Rules') && pkg.find((f) => f.path === 'CLAUDE.md')!.content.includes('AGENTS.md') && pkg.find((f) => f.path === 'scripts/link-agents.sh')!.content.includes('ln -sfn ../.agents/skills .claude/skills') && !pkg.some((f) => f.path.startsWith('.claude/skills/'))],
  ['backend ships rules, API and tests', pkgHas('business-logic.md') && pkgHas('server/src/rules.ts') && pkgHas('server/src/services.ts') && pkgHas('server/src/http.ts') && pkgHas('server/src/validate.ts') && pkgHas('server/src/tests/rules.test.ts') && pkgHas('server/src/tests/api.test.ts') && pkgHas('server/API.md')],
  ['backend is dependency-free and wired to the UI', pkg.find((f) => f.path === 'server/package.json')!.content.includes('--experimental-strip-types') && !pkg.find((f) => f.path === 'server/package.json')!.content.includes('dependencies') && pkgHas('src/data/http-adapter.ts')],
  ['agent-os commands installed verbatim', pkgPrefix('.claude/commands/agent-os/') === 5 && pkg.find((f) => f.path === '.claude/commands/agent-os/shape-spec.md')!.content.includes('agent-os/specs/{YYYY-MM-DD-HHMM-feature-slug}')],
  ['agent-os index uses folder → file → description', (() => {
    const index = pkg.find((f) => f.path === 'agent-os/standards/index.yml')!.content
    return /^ui:\n  components-from-registry:\n    description: /m.test(index) && index.includes('global:') && index.includes('    description: ')
  })()],
  ['agent-os spec plan saves documentation first', pkg.filter((f) => /agent-os\/specs\/.+\/plan\.md$/.test(f.path)).every((f) => f.content.includes('## Task 1: Save Spec Documentation'))],
  ['agent-os shape follows the shaping questions', pkg.filter((f) => /agent-os\/specs\/.+\/shape\.md$/.test(f.path)).every((f) => f.content.includes('## Scope') && f.content.includes('## Decisions') && f.content.includes('## Standards Applied'))],
  ['handoff instructions carry the preamble', pkg.find((f) => f.path === 'instructions/incremental/01-shell.md')!.content.includes('## About This Handoff') && pkg.find((f) => f.path === 'instructions/one-shot-instructions.md')!.content.includes('## About This Handoff')],
  ['section tests follow the design-os spec format', pkg.filter((f) => /sections\/.+\/tests\.md$/.test(f.path)).every((f) => f.content.includes('## User Flow Tests') && f.content.includes('## Empty State Tests') && f.content.includes('## Accessibility Checks'))],
  ['planning JSON is valid', (() => {
    try {
      const colors = JSON.parse(pkg.find((f) => f.path === 'product/design-system/colors.json')!.content)
      const type = JSON.parse(pkg.find((f) => f.path === 'product/design-system/typography.json')!.content)
      return Object.keys(colors.families).length >= 5 && type.families.length === 3
    } catch {
      return false
    }
  })()],
  ['every block renders through a registry component', project.sections.flatMap((s) => s.screens).flatMap((s) => s.blocks).every((b) => project.system.components.some((c) => c.name === BLOCK_COMPONENT_NAMES[b.type]))],
  ['coverage page verifies every artefact', (() => {
    const html = wrap(<CoveragePage project={project} />)
    return (
      !html.includes('lz-checkrow-ic warn') &&
      html.includes('artefacts verified') &&
      html.includes('Framework targets') &&
      html.includes('Vue 3: ') &&
      html.includes('Web Components: ')
    )
  })()],
)

for (const [label, ok] of checks) {
  if (!ok) failed++
  console.log(`${ok ? 'ok ' : 'ERR'} ${label}`)
}

// high-density genome should surface real audit warnings
const dense = compileProject({ archetypeId: 'logistics', seed: 5, genome: { density: 92, warmth: 18, contrast: 88, expression: 94, geometry: 4 } })
console.log(`\ndense genome audit: ${dense.audit.score}  warnings: ${dense.audit.checks.filter(c => c.status === 'warn').map(c => c.label).join(', ') || 'none'}`)
console.log(`soft genome audit:  ${compileProject({ archetypeId: 'clinic', seed: 5, genome: { density: 20, warmth: 80, contrast: 20, expression: 20, geometry: 90 } }).audit.score}`)
console.log(failed ? `\n${failed} check(s) failed` : '\nall views render')
process.exit(failed ? 1 : 0)
