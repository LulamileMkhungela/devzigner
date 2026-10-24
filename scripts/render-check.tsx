import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { App } from '../src/App'
import { StoreProvider } from '../src/lib/store'
import { compileProject } from '../src/engine'
import { ProductPage } from '../src/views/ProductPage'
import { DataShapePage } from '../src/views/DataShapePage'
import { DesignPage } from '../src/views/DesignPage'
import { ShellDesignPage } from '../src/views/ShellDesignPage'
import { SectionsPage } from '../src/views/SectionsPage'
import { SectionPage } from '../src/views/SectionPage'
import { ScreenDesignPage } from '../src/views/ScreenDesignPage'
import { ExportPage } from '../src/views/ExportPage'

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
]
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
