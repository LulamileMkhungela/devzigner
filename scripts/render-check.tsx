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
  ['design-os + agent-os commands exported', pkgPrefix('commands/') >= 14],
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
    return !html.includes('lz-checkrow-ic warn') && html.includes('artefacts verified')
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
