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
const routes = ['/', '/data-shape', '/design', '/shell/design', '/sections', '/export']

await wait(150)
const store = w.localStorage.getItem('lula.devzign.projects.v1')
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

// a freshly compiled product must start with the capture empty state, and the
// capture action must fill it
const newBtn = Array.from(w.document.querySelectorAll('.lz-nav-item')).find((b) => b.textContent?.includes('New product'))
click(newBtn ?? null)
await wait(40)
const modal = w.document.querySelector('.lz-modal')
console.log(`${modal ? 'ok ' : 'ERR'} new-product dialog opens`)
if (modal) {
  click(modal.querySelector('.lz-btn.primary'))
  await wait(120)
  const fresh = JSON.parse(w.localStorage.getItem('lula.devzign.projects.v1') ?? '[]')
  const freshProject = fresh[0]
  w.location.hash = `#/sections/${freshProject.sections[0].id}`
  await wait(90)
  const empty = w.document.querySelector('.lz-empty')
  console.log(`${empty ? 'ok ' : 'ERR'} fresh product shows the screenshot empty state`)
  const captureBtn = empty?.querySelector('.lz-btn.primary') ?? null
  click(captureBtn)
  await wait(90)
  const gone = w.document.querySelector('.lz-empty')
  const grid = w.document.querySelectorAll('.lz-stage, .lz-cols-2 .lz-card').length
  console.log(`${!gone && grid > 0 ? 'ok ' : 'ERR'} capture fills the screenshot grid (${grid} tiles)`)
  console.log(`${/.*/.test(w.location.hash) ? 'ok ' : ''} route after capture: ${w.location.hash}`)
}

console.log(errors.length ? `\nconsole errors:\n${errors.join('\n')}` : '\nno console errors')
process.exit(failed || errors.length ? 1 : 0)
