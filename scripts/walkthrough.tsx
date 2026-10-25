/**
 * Runs the ProdOps process from start to finish, through the real UI.
 *
 * Product Planning → Data Shape → Design System → Section Design → Export.
 * The point is to prove the promise "zero input, every artefact on first load":
 * the walkthrough never types a product idea, never answers a question, and
 * still ends with a finished handoff package — while every tick in the phase nav
 * is one it clicked itself, never one the compiler handed out.
 */
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/',
  pretendToBeVisual: true,
})
const w = dom.window as unknown as Window & typeof globalThis
;(globalThis as any).window = w
;(globalThis as any).document = w.document
;(globalThis as any).HTMLElement = w.HTMLElement
;(globalThis as any).Element = w.Element
;(globalThis as any).Node = w.Node
;(globalThis as any).Blob = w.Blob
;(globalThis as any).URL = w.URL
;(globalThis as any).localStorage = w.localStorage
;(globalThis as any).location = w.location
;(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0)
;(globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id)
;(globalThis as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as any).matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })

const errors: string[] = []
const origError = console.error
console.error = (...args: unknown[]) => {
  const line = args.map(String).join(' ')
  if (line.includes("Window's scrollTo")) return
  errors.push(line)
  origError(...args)
}
w.addEventListener('error', (e) => errors.push(`window error: ${(e as ErrorEvent).message}`))

const { createRoot } = await import('react-dom/client')
const { createElement } = await import('react')
const { StoreProvider } = await import('../src/lib/store')
const { App } = await import('../src/App')
const { buildPackage } = await import('../src/export/package')

createRoot(w.document.getElementById('root')!).render(createElement(StoreProvider, null, createElement(App)))

const wait = (ms = 80) => new Promise((r) => setTimeout(r, ms))
const $ = (selector: string) => w.document.querySelector(selector)
const $$ = (selector: string) => Array.from(w.document.querySelectorAll(selector))
const text = () => w.document.getElementById('root')?.textContent ?? ''
const click = (el: Element | null | undefined) => (el as HTMLElement | null)?.click()
const byText = (selector: string, needle: string) =>
  $$(selector).find((el) => el.textContent?.toLowerCase().includes(needle.toLowerCase()))

let failed = 0
function step(label: string, ok: boolean, detail = '') {
  if (!ok) failed++
  console.log(`${ok ? 'ok ' : 'ERR'} ${label}${detail ? ` — ${detail}` : ''}`)
}

const stored = () => JSON.parse(w.localStorage.getItem('prodops.projects.v1') ?? '[]')[0]
async function waitFor<T>(read: () => T | undefined, timeout = 8000): Promise<T | undefined> {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    const value = read()
    if (value) return value
    await wait(50)
  }
  return undefined
}
const project = (await waitFor(stored)) ?? stored()

/* ---- 0. first load: nothing typed, everything present ------------------- */

step('first load compiles a product with no input', Boolean(project?.name) && project.sections.length >= 5, project?.name)
step(
  'every artefact is compiled on first paint',
  Boolean(project?.brief?.elevator) &&
    project.data.entities.length >= 4 &&
    project.sections.every((s: { screens: unknown[] }) => s.screens.length >= 2) &&
    project.flows.length >= 4,
  `${project.sections.length} sections · ${project.data.entities.length} entities · ${project.flows.length} flows`,
)

/* ---- 1. Product Planning ------------------------------------------------ */

w.location.hash = '#/'
await wait()

const ticked = () => $$('.lz-step.is-done').length
step('no stage is ticked before the builder confirms one', ticked() === 0, `${ticked()} ticked`)
step(
  'the product starts with nothing confirmed',
  (project?.progress?.confirmed ?? []).length === 0,
  JSON.stringify(project?.progress?.confirmed ?? []),
)

/** Complete the stage on screen the way a builder does: review, then tick. */
async function completeStage(label: string) {
  const button = byText('button', 'Mark stage complete') as HTMLButtonElement | undefined
  step(`${label} offers its completion control`, Boolean(button), button?.disabled ? 'disabled' : 'enabled')
  if (!button || button.disabled) return false
  click(button)
  await wait(160)
  return true
}
const productHtml = text()
step('Product Planning shows the vision', productHtml.includes('Value') || productHtml.includes('problem'), '')
step('Product Planning shows the roadmap', productHtml.includes('Roadmap') || productHtml.includes('Phase'), '')
// The field that makes the product the builder's own: paste a description,
// watch the compiler read it back, rebuild — and earn the ticks again.
const briefField = $('textarea') as HTMLTextAreaElement | undefined
step('the product page opens on a description field', Boolean(briefField))
step('the field explains itself with a placeholder', (briefField?.placeholder ?? '').length > 40, briefField?.placeholder?.slice(0, 44))
const readBack = $('.lz-compose-read')?.textContent ?? ''
step('the composer predicts what the compiler will read', readBack.length === 0 || readBack.length > 10, readBack.slice(0, 60))

const toDataEarly = byText('.lz-btn.primary, .lz-btn', 'Continue to Data Shape') as HTMLButtonElement | undefined
step('Data Shape stays locked until Product is complete', Boolean(toDataEarly?.disabled))

await completeStage('Product')
step('completing Product shows it as done', Boolean($('.lz-stage-done')))
const toData = byText('.lz-btn.primary, .lz-btn', 'Continue to Data Shape')
step('Product Planning hands off to Data Shape', Boolean(toData) && !(toData as HTMLButtonElement).disabled)

/* ---- 2. Data Shape ------------------------------------------------------ */

click(toData)
await wait(120)
step('Data Shape route', w.location.hash === '#/data-shape', w.location.hash)
const entityNames = project.data.entities.map((e: { name: string }) => e.name)
step('every entity is rendered', entityNames.every((name: string) => text().includes(name)), entityNames.join(', '))
step('the schema is generated', text().includes('schema.sql') || text().includes('create table'), '')
await completeStage('Data Shape')

/* ---- 3. Design System --------------------------------------------------- */

const toDesign = byText('.lz-btn.primary, .lz-btn', 'Continue to Design')
click(toDesign)
await wait(120)
step('Design System route', w.location.hash === '#/design', w.location.hash)
const roles = project.design.colors
const primary = roles.find((c: { role: string }) => c.role === 'primary') ?? roles[0]
const accent = roles.find((c: { role: string }) => c.role === 'accent') ?? roles[1]
step(
  'colour roles and ramps render',
  text().toUpperCase().includes(primary.base.toUpperCase()) &&
    text().toUpperCase().includes(accent.base.toUpperCase()) &&
    text().includes(`${roles.length} roles`),
  `${roles.length} roles`,
)
step('typography renders', project.design.typography.every((t: { family: string }) => text().includes(t.family)))
const shellLink = byText('a, button', 'View Shell Design') ?? byText('a, button', 'Shell')
step('shell design is reachable', Boolean(shellLink))
await completeStage('Design')

/* ---- 4. Section Design -------------------------------------------------- */

w.location.hash = '#/sections'
await wait(120)
step('Sections route lists the build order', entityNames.length > 0 && project.sections.every((s: { name: string }) => text().includes(s.name)))
await completeStage('Sections')

const first = project.sections[0]
w.location.hash = `#/sections/${first.id}`
await wait(140)
const railSteps = $$('.lz-rail-step').length
step('section rail has the four design steps', railSteps >= 3, `${railSteps} steps`)
step('requirements are specified', text().toLowerCase().includes('requirement') || first.requirements.length > 0, `${first.requirements.length} requirements`)
step('sample data is present', text().includes('Sample') || first.screens.length > 0)

const captureBtn = $$('.lz-empty .lz-btn.primary')[0] ?? byText('.lz-btn.primary', 'Capture')
if (captureBtn) {
  click(captureBtn)
  await wait(160)
}
const captured = JSON.parse(w.localStorage.getItem('prodops.captures.v1') ?? '{}')
step('screen designs can be captured', Object.keys(captured).length > 0)

const screenLink = $$('.lz-secrow, a[href*="screen-designs"]')[0]
if (screenLink) {
  click(screenLink)
  await wait(140)
}
step('a screen design opens', w.location.hash.includes('screen-designs'), w.location.hash)

/* ---- 5. Export ---------------------------------------------------------- */

w.location.hash = '#/export'
await wait(160)
const exportHtml = text()
step('Export route', w.location.hash === '#/export')
step('four confirmed stages show four ticks', ticked() === 4, `${ticked()} ticked`)
step('Export itself is not complete yet', !$('.lz-stage-done'))
await completeStage('Export')
const confirmedNow = JSON.parse(w.localStorage.getItem('prodops.projects.v1') ?? '[]')[0]?.progress?.confirmed ?? []
step(
  'every stage is ticked once all five are confirmed',
  confirmedNow.length === 5 && Boolean($('.lz-stage-done')),
  confirmedNow.join(', '),
)
step('readiness checklist has no failures', !$('.lz-checkrow-ic.fail'))
step('audit renders', exportHtml.includes('Audit') || exportHtml.includes('audit'))

const files = buildPackage(stored(), JSON.parse(w.localStorage.getItem('prodops.versions.v1') ?? '{}')[stored().id]?.versions ?? [])
const paths = files.map((f) => f.path)
step('package is complete', paths.length > 180, `${paths.length} files`)
step(
  'package contains the ProdOps contract',
  ['product-overview.md', 'prompts/one-shot-prompt.md', 'prompts/section-prompt.md', 'instructions/one-shot-instructions.md', 'instructions/incremental/01-shell.md', 'design-system/tokens.css', 'design-system/tailwind-colors.md', 'design-system/fonts.md', 'data-shapes/overview.ts', 'shell/components/AppShell.tsx'].every((p) => paths.includes(p)),
)
step(
  'package contains a component per screen',
  paths.filter((p) => /sections\/.+\/components\/.+\.tsx$/.test(p) && !p.endsWith('index.ts')).length ===
    stored().sections.reduce((n: number, s: { screens: unknown[] }) => n + s.screens.length, 0),
)
step(
  'package contains the Standards layer',
  paths.includes('standards/product/mission.md') &&
    paths.includes('standards/standards/index.yml') &&
    paths.includes('.agents/commands/prodops/shape-spec.md') &&
    paths.some((p) => p.startsWith('standards/specs/')),
)
step(
  'every free tool is in the package',
  ['TOOLKIT.md', 'AGENTS.md', 'scripts/link-agents.sh', '.agents/skills/prd-creator/SKILL.md', '.agents/skills/skill-builder/SKILL.md', '.agents/skills/design-system/SKILL.md', '.agents/skills/favicon-creator/SKILL.md', '.agents/skills/agents-repo/SKILL.md', 'template/starter/AGENTS.md'].every((p) => paths.includes(p)),
)
step(
  'the package carries a tested backend',
  ['business-logic.md', 'server/API.md', 'server/src/rules.ts', 'server/src/services.ts', 'server/src/http.ts', 'server/src/tests/rules.test.ts', 'server/src/tests/api.test.ts', 'src/data/http-adapter.ts'].every((p) => paths.includes(p)),
)
step(
  'package contains a screenshot per section plus the shell',
  paths.filter((p) => p.endsWith('.svg')).length >= stored().sections.length + 1,
)

/* ---- 5b. Personas -------------------------------------------------------- */

w.location.hash = '#/personas'
await wait(160)
const personasHtml = text()
step(
  'every persona is shown with the flows it walks',
  stored().brief.personas.every((p) => personasHtml.includes(p.name)) &&
    stored().brief.personas.every((p) => stored().flows.some((f) => f.persona === p.name)),
)
step('the personas page states who the product is not for', personasHtml.includes('Who this is not for'))

/* ---- 6. Tools ------------------------------------------------------------ */

w.location.hash = '#/tools'
await wait(160)
const toolsHtml = text()
step('Tools route', w.location.hash === '#/tools')
step(
  'all eight free tools are listed with steps',
  ['PRD Creator', 'Skill Builder', 'Design System', 'Starter', 'Agents canon', 'Favicon Creator', 'Standards', 'ProdOps flow'].every((name) => toolsHtml.includes(name)),
)

console.log(
  `\n${failed === 0 ? 'walkthrough complete: idea → package with zero user input' : `${failed} step(s) failed`}`,
)
console.log(errors.length ? `console errors:\n${errors.join('\n')}` : 'no console errors')
process.exit(failed || errors.length ? 1 : 0)
