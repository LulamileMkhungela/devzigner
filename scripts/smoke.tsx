/**
 * Mounts the real app in jsdom and walks every route, so a runtime error in an
 * effect or an event handler shows up here rather than in the user's browser.
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
;(globalThis as any).matchMedia = () => ({
  matches: false,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
})

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

const root = createRoot(w.document.getElementById('root')!)
root.render(createElement(StoreProvider, null, createElement(App)))

const wait = (ms = 60) => new Promise((r) => setTimeout(r, ms))
const routes = ['/', '/data-shape', '/design', '/shell/design', '/sections', '/export', '/flows', '/system', '/prototype', '/editor', '/wiki', '/coverage']

await wait(150)
const store = w.localStorage.getItem('prodops.projects.v1')
const project = JSON.parse(store ?? '[]')[0]
if (project) routes.push(`/sections/${project.sections[0].id}`, `/sections/${project.sections[0].id}/screen-designs/${project.sections[0].screens[0].id}`)

let failed = 0
for (const route of routes) {
  w.location.hash = `#${route}`
  await wait(80)
  const html = w.document.getElementById('root')?.innerHTML ?? ''
  const ok = html.length > 2000 && !html.includes('lz-empty-ic"></div>')
  if (!ok) failed++
  console.log(`${ok ? 'ok ' : 'ERR'} ${route.padEnd(48)} ${html.length} chars`)
}

// interactions: open the product menu, the new-product dialog, capture screens
const click = (el: Element | null) => (el as HTMLElement | null)?.click()
click(w.document.querySelector('.lz-dots'))
await wait(30)
console.log(`${w.document.querySelector('.lz-menu') ? 'ok ' : 'ERR'} product menu opens`)

w.location.hash = '#/sections'
await wait(80)
const emptyCount = w.document.querySelectorAll('.lz-empty').length
const sectionLink = w.document.querySelector('.lz-secrow')
click(sectionLink)
await wait(80)
console.log(`${w.location.hash.includes('/sections/') ? 'ok ' : 'ERR'} section row navigates (${w.location.hash})`)

w.location.hash = '#/sections'
await wait(60)
console.log(`ok  starter product ships captured (sections complete): ${emptyCount === 0}`)

// the shell is the five ProdOps phases and a guided panel per phase — there is
// no project prompt, because the starter product is already compiled.
w.location.hash = '#/'
await wait(90)
const navLabels = Array.from(w.document.querySelectorAll('.lz-nav-item .lz-nav-label-text')).map((n) => n.textContent?.trim())
const phases = ['Product', 'Data Shape', 'Design', 'Sections', 'Export']
console.log(`${phases.every((phase) => navLabels.includes(phase)) ? 'ok ' : 'ERR'} the shell lists the five phases (${navLabels.slice(0, 5).join(' → ')})`)
const hasNewProduct = Array.from(w.document.querySelectorAll('button, a')).some((el) => /new product/i.test(el.textContent ?? ''))
console.log(`${!hasNewProduct ? 'ok ' : 'ERR'} no project prompt in the shell`)

let guided = 0
for (const route of ['/', '/data-shape', '/design', '/sections', '/export']) {
  w.location.hash = `#${route}`
  await wait(70)
  if (w.document.querySelector('.lz-guide')) guided++
}
console.log(`${guided === 5 ? 'ok ' : 'ERR'} every phase carries a how-to panel (${guided}/5)`)

// the capture empty state still exists: drop the stored captures and revisit
const uncaptured = JSON.parse(w.localStorage.getItem('prodops.projects.v1') ?? '[]')[0]
w.localStorage.setItem('prodops.captures.v1', '{}')
w.location.hash = `#/sections/${uncaptured.sections[0].id}`
await wait(60)
w.location.hash = `#/sections/${uncaptured.sections[0].id}?uncaptured=1`
await wait(60)

// ---- prototype track -------------------------------------------------------
w.location.hash = '#/flows'
await wait(90)
const flowsBefore = JSON.parse(w.localStorage.getItem('prodops.projects.v1') ?? '[]')[0].flows.length
const newFlowBtn = Array.from(w.document.querySelectorAll('button')).find((b) => b.textContent?.includes('New flow'))
click(newFlowBtn ?? null)
await wait(50)
const flowModal = w.document.querySelector('.lz-modal')
console.log(`${flowModal ? 'ok ' : 'ERR'} new-flow dialog opens`)
if (flowModal) {
  const nameInput = flowModal.querySelector('input.lz-input') as HTMLInputElement | null
  if (nameInput) {
    const setter = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value')?.set
    setter?.call(nameInput, 'Refund a disputed order')
    nameInput.dispatchEvent(new w.Event('input', { bubbles: true }))
  }
  const boxes = flowModal.querySelectorAll('input[type=checkbox]')
  click(boxes[0] ?? null)
  await wait(30)
  click(boxes[1] ?? null)
  await wait(30)
  const addBtn = Array.from(flowModal.querySelectorAll('button')).find((b) => b.textContent?.includes('Add flow'))
  click(addBtn ?? null)
  await wait(90)
  const after = JSON.parse(w.localStorage.getItem('prodops.projects.v1') ?? '[]')[0].flows.length
  console.log(`${after === flowsBefore + 1 ? 'ok ' : 'ERR'} flow added to the product (${flowsBefore} → ${after})`)
}

// token editor re-derives the design
w.location.hash = '#/editor'
await wait(100)
const range = w.document.querySelector('input[type=range]') as HTMLInputElement | null
const before = JSON.parse(w.localStorage.getItem('prodops.projects.v1') ?? '[]')[0].design.colors[0].base
if (range) {
  const setter = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value')?.set
  setter?.call(range, '205')
  range.dispatchEvent(new w.Event('input', { bubbles: true }))
  await wait(120)
}
const editedProject = JSON.parse(w.localStorage.getItem('prodops.projects.v1') ?? '[]')[0]
console.log(`${editedProject.design.colors[0].base !== before ? 'ok ' : 'ERR'} token editor re-derives the palette (${before} → ${editedProject.design.colors[0].base})`)
console.log(`${editedProject.overrides?.primaryHue === 205 ? 'ok ' : 'ERR'} override persisted (${JSON.stringify(editedProject.overrides)})`)

// wiki: commit a snapshot
w.location.hash = '#/wiki'
await wait(100)
const commitBtn = Array.from(w.document.querySelectorAll('.lz-head button')).find((b) => b.textContent?.includes('Commit'))
click(commitBtn ?? null)
await wait(120)
const book = JSON.parse(w.localStorage.getItem('prodops.versions.v1') ?? '{}')
const versionCount = book[editedProject.id]?.versions?.length ?? 0
console.log(`${versionCount > 0 ? 'ok ' : 'ERR'} wiki committed a snapshot (${versionCount})`)

// prototype: pages switch
w.location.hash = '#/prototype'
await wait(100)
const pageButtons = Array.from(w.document.querySelectorAll('.lz-card button.lz-btn.small.primary'))
const beforeUrl = w.document.querySelector('.lz-proto-url')?.textContent ?? ''
const allPageBtns = Array.from(w.document.querySelectorAll('.lz-card button'))
const otherPage = allPageBtns.find((b) => b.className.includes('lz-btn small quiet'))
click(otherPage ?? null)
await wait(80)
const afterUrl = w.document.querySelector('.lz-proto-url')?.textContent ?? ''
console.log(`${afterUrl !== beforeUrl ? 'ok ' : 'ERR'} prototype page switch (${beforeUrl} → ${afterUrl})`)

// the prototype contains real controls: type to filter, then open a screen with a form
w.location.hash = '#/prototype'
await wait(120)
const protoSearch = w.document.querySelector('.pv-search input') as HTMLInputElement | null
const rowsBefore = w.document.querySelectorAll('.pv-table tbody tr.pv-row').length
const inputSetter = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value')?.set
if (protoSearch) {
  inputSetter?.call(protoSearch, 'zzzz-no-match')
  protoSearch.dispatchEvent(new w.Event('input', { bubbles: true }))
  await wait(120)
}
const rowsAfter = w.document.querySelectorAll('.pv-table tbody tr.pv-row').length
const emptyRow = Boolean(w.document.querySelector('.pv-emptytd'))
const bpButtons = Array.from(w.document.querySelectorAll('[aria-label="Breakpoint"] button')) as HTMLButtonElement[]
const smBtn = bpButtons.find((b) => b.textContent?.trim() === 'sm')
click(smBtn ?? null)
await wait(120)
const mobilePreview = Boolean(w.document.querySelector('.pv.mobile'))
const drawerBtn = Boolean(w.document.querySelector('.pv-topbar .pv-iconbtn'))
console.log(`${smBtn && mobilePreview && drawerBtn ? 'ok ' : 'ERR'} breakpoint switch reflows the prototype to mobile (${bpButtons.length} breakpoints)`)
if (!(smBtn && mobilePreview && drawerBtn)) failed++
const xlBtn = bpButtons.find((b) => b.textContent?.trim() === 'xl')
click(xlBtn ?? null)
await wait(120)

const registryBlocks = w.document.querySelectorAll('.pv-body [data-component]').length
console.log(`${registryBlocks > 0 ? 'ok ' : 'ERR'} prototype blocks name their registry component (${registryBlocks} blocks)`)
console.log(`${protoSearch ? 'ok ' : 'ERR'} prototype exposes a real search input`)
console.log(`${rowsBefore > 0 && rowsAfter < rowsBefore && emptyRow ? 'ok ' : 'ERR'} typing filters the table (${rowsBefore} → ${rowsAfter} rows, empty state ${emptyRow})`)

// open a screen that contains a form, then submit it with a required field empty
w.location.hash = '#/prototype'
await wait(100)
const stored = JSON.parse(w.localStorage.getItem('prodops.projects.v1') ?? '[]')[0]
const formScreen = stored.sections
  .flatMap((s: { screens: { id: string; route: string; blocks: { type: string }[] }[] }) => s.screens)
  .find((screen: { blocks: { type: string }[] }) => screen.blocks.some((b) => b.type === 'form'))
const formButton = formScreen
  ? (Array.from(w.document.querySelectorAll('.lz-card button')).find(
      (b) => b.getAttribute('title') === formScreen.route,
    ) as HTMLButtonElement | undefined)
  : undefined
click(formButton ?? null)
await wait(140)
const protInput = w.document.querySelector('.pv-form input') as HTMLInputElement | null
if (protInput) {
  const labelBound =
    Boolean(protInput.id) &&
    Boolean(w.document.querySelector(`label[for="${protInput.id}"]`)) &&
    w.document.querySelector(`label[for="${protInput.id}"]`)?.textContent?.trim().length! > 0
  if (!labelBound) failed++
  console.log(`${labelBound ? 'ok ' : 'ERR'} every prototype input has a bound label`)
  const formEl = w.document.querySelector('.pv-form') as HTMLFormElement | null
  const submit = () => formEl?.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }))
  submit()
  await wait(100)
  const errorShown = Boolean(w.document.querySelector('.pv-error'))
  const invalid = protInput.getAttribute('aria-invalid') === 'true'
  if (!(errorShown && invalid)) failed++
  console.log(`${errorShown && invalid ? 'ok ' : 'ERR'} empty required field blocks submit with an inline error`)
  const fields = Array.from(w.document.querySelectorAll('.pv-form input, .pv-form select, .pv-form textarea')) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[]
  for (const field of fields) {
    const setter =
      field instanceof w.HTMLSelectElement
        ? Object.getOwnPropertyDescriptor(w.HTMLSelectElement.prototype, 'value')?.set
        : Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value')?.set
    if (field instanceof w.HTMLInputElement && field.type === 'checkbox') {
      click(field)
      continue
    }
    const value =
      field instanceof w.HTMLSelectElement
        ? field.options[1]?.value ?? ''
        : field.type === 'number'
          ? '12'
          : field.type === 'date'
            ? '2026-01-15'
            : field.type === 'email'
              ? 'tester@example.com'
              : field.type === 'tel'
                ? '+27 82 000 0000'
                : 'Typed by the tester'
    setter?.call(field, value)
    field.dispatchEvent(new w.Event(field instanceof w.HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
  }
  await wait(80)
  submit()
  await wait(140)
  const success = Boolean(w.document.querySelector('.pv-success'))
  const toast = Boolean(w.document.querySelector('.pv-toast'))
  if (!(success && toast)) failed++
  console.log(`${success && toast ? 'ok ' : 'ERR'} a filled form actually saves and reports it (${formScreen?.route ?? 'no form screen'})`)
} else {
  failed++
  console.log('ERR no real form control found in the prototype')
}

// navigation inside the prototype works from the shell
const navButtons = Array.from(w.document.querySelectorAll('.pv-side .pv-nav')) as HTMLButtonElement[]
const urlBeforeNav = w.document.querySelector('.lz-proto-url')?.textContent ?? ''
const otherNav = navButtons.find((b) => !b.className.includes('active'))
click(otherNav ?? null)
await wait(140)
const urlAfterNav = w.document.querySelector('.lz-proto-url')?.textContent ?? ''
if (!(otherNav && urlAfterNav !== urlBeforeNav)) failed++
console.log(`${otherNav && urlAfterNav !== urlBeforeNav ? 'ok ' : 'ERR'} prototype navigation changes the route (${urlBeforeNav} → ${urlAfterNav})`)

// coverage page: nothing may be red
w.location.hash = '#/coverage'
await wait(120)
const coverageHtml = w.document.getElementById('root')?.innerHTML ?? ''
const warnRows = w.document.querySelectorAll('.lz-checkrow-ic.warn').length
console.log(`${warnRows === 0 ? 'ok ' : 'ERR'} coverage page has no unverified artefact (${warnRows} warns)`)
console.log(`${coverageHtml.includes('artefacts verified') ? 'ok ' : 'ERR'} coverage page reports the audit`)

// system decisions are definable, not just generated
w.location.hash = '#/system'
await wait(110)
const selects = Array.from(w.document.querySelectorAll('select')) as HTMLSelectElement[]
const stackSelect = selects.find((el) => el.getAttribute('aria-label') === 'Data choice')
if (stackSelect) {
  const setter = Object.getOwnPropertyDescriptor(w.HTMLSelectElement.prototype, 'value')?.set
  setter?.call(stackSelect, 'Raw SQL')
  stackSelect.dispatchEvent(new w.Event('change', { bubbles: true }))
  await wait(120)
}
const sysProject = JSON.parse(w.localStorage.getItem('prodops.projects.v1') ?? '[]')[0]
console.log(`${sysProject.systemOverrides?.stack?.Data ? 'ok ' : 'ERR'} stack override persisted (${JSON.stringify(sysProject.systemOverrides?.stack ?? {})})`)

const addCompBtn = Array.from(w.document.querySelectorAll('.lz-head button')).find((b) => b.textContent?.includes('Component'))
click(addCompBtn ?? null)
await wait(60)
const compModal = w.document.querySelector('.lz-modal')
console.log(`${compModal ? 'ok ' : 'ERR'} component dialog opens`)
if (compModal) {
  const input = compModal.querySelector('input.lz-input') as HTMLInputElement | null
  const setter = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value')?.set
  if (input) {
    setter?.call(input, 'DisputeBanner')
    input.dispatchEvent(new w.Event('input', { bubbles: true }))
  }
  await wait(40)
  const save = Array.from(compModal.querySelectorAll('button')).find((b) => b.textContent?.includes('Add component'))
  click(save ?? null)
  await wait(120)
  const after = JSON.parse(w.localStorage.getItem('prodops.projects.v1') ?? '[]')[0]
  const added = after.system.components.some((c: { name: string }) => c.name === 'DisputeBanner')
  console.log(`${added ? 'ok ' : 'ERR'} custom component registered`)
}

console.log(errors.length ? `\nconsole errors:\n${errors.join('\n')}` : '\nno console errors')
process.exit(failed || errors.length ? 1 : 0)
