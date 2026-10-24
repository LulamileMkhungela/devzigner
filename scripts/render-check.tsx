import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { App } from '../src/App'
import { StoreProvider } from '../src/lib/store'
import { compileProject } from '../src/engine'
import { BriefView } from '../src/views/BriefView'
import { RoadmapView } from '../src/views/RoadmapView'
import { DataView } from '../src/views/DataView'
import { DesignView } from '../src/views/DesignView'
import { SectionsView, SectionDetail } from '../src/views/SectionsView'
import { ScreensView } from '../src/views/ScreensView'
import { ScreenView } from '../src/views/ScreenView'
import { AuditView } from '../src/views/AuditView'
import { HandoffView } from '../src/views/HandoffView'

const store: Record<string, string> = {}
;(globalThis as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
}
;(globalThis as any).location = { hash: '' }
;(globalThis as any).window = { addEventListener: () => {}, removeEventListener: () => {}, scrollTo: () => {}, location: { hash: '' } }
;(globalThis as any).confirm = () => false

const project = compileProject({ archetypeId: 'marketplace', seed: 112233, idea: 'a marketplace for township artisans' })
const wrap = (node: ReactNode) => renderToString(<StoreProvider>{node}</StoreProvider>)

const views: [string, () => string][] = [
  ['home', () => renderToString(<StoreProvider><App /></StoreProvider>)],
  ['brief', () => wrap(<BriefView project={project} />)],
  ['roadmap', () => wrap(<RoadmapView project={project} />)],
  ['data', () => wrap(<DataView project={project} />)],
  ['design', () => wrap(<DesignView project={project} />)],
  ['sections', () => wrap(<SectionsView project={project} />)],
  ['section-detail', () => wrap(<SectionDetail project={project} section={project.sections[0]} />)],
  ['screens', () => wrap(<ScreensView project={project} />)],
  ['screen', () => wrap(<ScreenView project={project} sectionId={project.sections[0].id} screenIndex={0} />)],
  ['audit', () => wrap(<AuditView project={project} />)],
  ['handoff', () => wrap(<HandoffView project={project} />)],
]

let failed = 0
for (const [name, fn] of views) {
  try {
    const html = fn()
    console.log(`ok  ${name.padEnd(15)} ${html.length} chars`)
  } catch (e) {
    failed++
    console.error(`ERR ${name}:`, (e as Error).message)
  }
}

// high-density genome should surface real audit warnings
const dense = compileProject({ archetypeId: 'logistics', seed: 5, genome: { density: 92, warmth: 18, contrast: 88, expression: 94, geometry: 4 } })
console.log(`\ndense genome audit: ${dense.audit.score}  warnings: ${dense.audit.checks.filter(c => c.status === 'warn').map(c => c.label).join(', ') || 'none'}`)
console.log(`soft genome audit:  ${compileProject({ archetypeId: 'clinic', seed: 5, genome: { density: 20, warmth: 80, contrast: 20, expression: 20, geometry: 90 } }).audit.score}`)
console.log(failed ? `\n${failed} view(s) failed` : '\nall views render')
process.exit(failed ? 1 : 0)
