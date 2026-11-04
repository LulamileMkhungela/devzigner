import { JSDOM } from 'jsdom'
import { strict as assert } from 'node:assert'
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173', pretendToBeVisual: true })
const win = dom.window
Object.assign(globalThis, { window: win, document: win.document, HTMLElement: win.HTMLElement, Element: win.Element, Node: win.Node, localStorage: win.localStorage, IS_REACT_ACT_ENVIRONMENT: true })
win.scrollTo = () => {}
win.confirm = () => true
let payload: any
const oldFetch = globalThis.fetch
globalThis.fetch = async (_input, init) => {
  if (!init?.method) return new Response(JSON.stringify({ configured: true }))
  payload = JSON.parse(String(init.body))
  return new Response(JSON.stringify({ reply: 'A simple tool for a small team to manage contacts and sales deals.' }))
}
const { createRoot } = await import('react-dom/client')
const { act, createElement } = await import('react')
const { StoreProvider } = await import('../src/lib/store')
const { App } = await import('../src/App')
const root = createRoot(win.document.getElementById('root')!)
await act(async () => root.render(createElement(StoreProvider, null, createElement(App))))
async function click(text: string) {
  const button = Array.from(win.document.querySelectorAll('button')).find(b => b.textContent?.includes(text))
  assert.ok(button, `Missing button: ${text}`)
  await act(async () => { button.click(); await new Promise(r => setTimeout(r, 0)) })
}
try {
  await click('Get help')
  assert.match(win.document.body.textContent!, /Assistant access password/)
  await click('Help me with this step')
  assert.match(payload.messages[0].content, /clarify my idea/)
  assert.match(win.document.body.textContent!, /A simple tool for a small team/)
  await click('Use as description draft')
  assert.match(win.document.body.textContent!, /Review your description/)
  await click('Update description')
  assert.match(win.document.body.textContent!, /Make the plan yours/)
  assert.ok(win.localStorage.getItem('prodops.projects.v1')?.includes('manage contacts and sales deals'))
  console.log('Assistant smoke test passed: in-app chat, reviewed draft and project update.')
} finally { await act(async () => root.unmount()); globalThis.fetch = oldFetch }
