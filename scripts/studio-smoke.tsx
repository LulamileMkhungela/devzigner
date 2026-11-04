import { JSDOM } from 'jsdom'
import { strict as assert } from 'node:assert'
import { createServer } from 'vite'
import JSZip from 'jszip'
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173/workspace/', pretendToBeVisual: true })
const win = dom.window
Object.assign(globalThis, { window: win, document: win.document, HTMLElement: win.HTMLElement, Element: win.Element, Node: win.Node, DOMParser:win.DOMParser, localStorage: win.localStorage, IS_REACT_ACT_ENVIRONMENT: true })
win.confirm = () => true
const oldFetch = globalThis.fetch
let request: any
let figmaRequests = 0
let figmaHeaders: any
let aiHeaders: any
let exported: Blob | undefined
URL.createObjectURL = blob => { exported = blob; return 'blob:test' }
URL.revokeObjectURL = () => {}
win.HTMLAnchorElement.prototype.click = function () {}
globalThis.fetch = async (_input, init) => {
  if (!init?.method) return new Response(JSON.stringify({ configured: false }))
  if (String(_input).includes('figma-reference')) { figmaRequests++; figmaHeaders=init?.headers; return new Response(JSON.stringify({ name:'figma-ABC-1-2.md', source:'https://www.figma.com/design/ABC/file?node-id=1-2', text:'# Figma frame\nLogin frame, itemSpacing: 16, color: terracotta' })) }
  if (String(_input).includes('github-reference')) return new Response(JSON.stringify({ name:'README.md', content:'Existing system architecture', source:'https://github.com/example/project/blob/main/README.md' }))
  request = JSON.parse(String(init.body))
  aiHeaders=init.headers
  if (request.testConnection) return new Response(JSON.stringify(aiHeaders['X-ProdOps-Claude-Key'] === 'sk-ant-valid-test-key' ? {connected:true} : {error:'Claude could not connect (401). Check your key, model access and billing.'}), {status:aiHeaders['X-ProdOps-Claude-Key'] === 'sk-ant-valid-test-key' ? 200 : 502})
  if (request.role === 'business' && !request.answer) return new Response(JSON.stringify({ question:'Who will use this product?' }))
  return new Response(JSON.stringify({ files:['shape.md','references.md','standards.md','plan.md'].map(name => ({ path:`specs/${request.role}/${request.step}/${name}`,content:request.role === 'business' ? '# The PRD\nReal content' : 'Design draft' })) }))
}
const vite = await createServer({ server:{ middlewareMode:true }, appType:'custom', logLevel:'error' })
const { Studio } = await vite.ssrLoadModule('/src/studio/Studio.tsx')
const { createRoot } = await import('react-dom/client')
const { act, createElement } = await import('react')
const root = createRoot(win.document.getElementById('root')!)
await act(async () => { root.render(createElement(Studio)); await new Promise(r => setTimeout(r,0)) })
async function click(text: string) {
  const b = Array.from(win.document.querySelectorAll('button')).find(x => x.textContent?.includes(text) && !x.disabled)
  assert.ok(b, `Missing enabled button: ${text}`)
  await act(async () => { b.click(); await new Promise(r => setTimeout(r,20)) })
}
async function clickRole(text: string) {
  const nav = win.document.querySelector('nav[aria-label="Choose your role"]')!
  const button = Array.from(nav.querySelectorAll('button')).find(x => x.textContent?.includes(text))
  assert.ok(button, `Missing role ${text}`)
  await act(async () => { button.click(); await new Promise(r => setTimeout(r,0)) })
}
async function input(element: HTMLInputElement | HTMLTextAreaElement, value:string) {
  assert.ok(element)
  const proto = element.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto,'value')!.set!.call(element,value)
  await act(async () => { element.dispatchEvent(new win.Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,0)) })
}
async function select(selector:string,value:string) {
  const element=win.document.querySelector(selector) as HTMLSelectElement; assert.ok(element)
  await act(async()=>{element.value=value;element.dispatchEvent(new win.Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,0))})
}
try {
  const openDeliverable = async (path:string) => {
    const button=Array.from(win.document.querySelectorAll('.deliverables button')).find(b=>b.textContent?.includes(path)) as HTMLButtonElement
    assert.ok(button, `Missing deliverable ${path}`); await act(async()=>{button.click();await new Promise(r=>setTimeout(r,0))})
  }
  const roleText=()=>win.document.querySelector('.deliverables')!.textContent!
  assert.match(win.document.body.textContent!, /Orbit dashboard · fictional example/)
  for (const role of ['Business analysis','Design','Development','Quality assurance','Delivery & operations']) assert.match(win.document.querySelector('nav[aria-label="Choose your role"]')!.textContent!,new RegExp(role))
  assert.match(roleText(),/business-requirements.md/);assert.match(roleText(),/functional-requirements.md/);assert.doesNotMatch(roleText(),/design-tokens|solution\/|Application code/)
  assert.equal(win.document.querySelector('[role=dialog]'), null, 'connections are inline, not a password popup')
  await input(win.document.querySelector('#claude-api-key')!,'wrong-key-123')
  await click('Connect Claude'); assert.match(win.document.body.textContent!,/Claude could not connect/)
  await input(win.document.querySelector('#claude-api-key')!,'sk-ant-valid-test-key'); await click('Connect Claude')
  assert.match(win.document.body.textContent!,/Claude connected for this tab/);assert.equal(aiHeaders['X-ProdOps-Claude-Model'],'claude-sonnet-4-6')
  await input(win.document.querySelector('#figma-api-token')!,'figma-valid-token-123');await click('Connect Figma')
  assert.match(win.document.body.textContent!,/Key added · not verified/)
  await input(win.document.querySelector('#figma-test-link')!,'https://www.figma.com/design/ABC/Login?node-id=1-2');await click('Test Figma frame')
  assert.match(win.document.body.textContent!,/Figma connected/);assert.equal(figmaHeaders['X-ProdOps-Figma-Token'],'figma-valid-token-123');assert.equal(figmaHeaders['X-ProdOps-Claude-Key'],undefined)
  assert.doesNotMatch(win.localStorage.getItem('prodops.role-studio.projects.v2')!,/sk-ant-valid-test-key|figma-valid-token-123/)

  await clickRole('Design')
  assert.match(roleText(),/design-tokens.json/);assert.match(roleText(),/design-requirements.md/);assert.doesNotMatch(roleText(),/solution\/|Application code/)
  assert.match(win.document.querySelector('.role-handoff')!.textContent!,/delivery dashboard/)
  assert.match(win.document.querySelector('.role-handoff')!.textContent!,/business requirements/)
  await openDeliverable('design/design-tokens.json')
  assert.match(win.document.body.textContent!,/Review design system & tokens/)
  const primary=win.document.querySelector('input[aria-label="primary color"]') as HTMLInputElement
  await input(primary,'#123456')
  assert.match(win.document.querySelector('iframe[title="Live HTML and CSS preview"]')!.getAttribute('srcdoc')!,/--color-primary: #123456/)
  await input(win.document.querySelector('input[aria-label="New color name"]')!,'warning');await click('Add color')
  assert.ok(win.document.querySelector('input[aria-label="warning color"]'))
  await clickRole('Development')
  assert.match(roleText(),/solution\/index.html/);assert.doesNotMatch(roleText(),/design-tokens.json|business-requirements.md/)
  assert.match(win.document.querySelector('.role-handoff')!.textContent!,/functional requirements/)
  await openDeliverable('solution/index.html')
  const codeEditor=win.document.querySelector('textarea[aria-label="Edit solution/index.html"]') as HTMLTextAreaElement
  await input(codeEditor,codeEditor.value.replace('Delivery overview','My updated dashboard'))
  assert.match(win.document.querySelector('iframe[title="Live HTML and CSS preview"]')!.getAttribute('srcdoc')!,/My updated dashboard/)
  await click('Try the dashboard')
  const iframe = win.document.querySelector('iframe[title="Interactive application preview"]')!
  assert.equal(iframe.getAttribute('sandbox'),'allow-scripts');assert.match(iframe.getAttribute('srcdoc')!,/My updated dashboard/)
  await act(async()=>{(win.document.querySelector('.preview-modal button[aria-label="Close"]') as HTMLButtonElement).click()})
  await click('Choose what to download'); await click('Application code only'); await act(async()=>{await new Promise(r=>setTimeout(r,150))})
  assert.ok(exported); const demoZip=await JSZip.loadAsync(await exported.arrayBuffer()); assert.match(await demoZip.file('index.html')!.async('string'),/My updated dashboard/); assert.match(await demoZip.file('styles.css')!.async('string'),/--color-primary: #123456/)
  await clickRole('Quality assurance'); assert.doesNotMatch(roleText(),/solution\/|design-tokens/)
  await clickRole('Delivery & operations'); assert.doesNotMatch(roleText(),/solution\/|design-tokens/)
  await clickRole('Business analysis'); await click('Next step'); assert.match(win.document.body.textContent!,/Review Discovery & stakeholders/); await click('Back'); assert.match(win.document.body.textContent!,/Review Vision & outcomes/)

  const newButton=win.document.querySelector('button[aria-label="New project"]') as HTMLButtonElement
  await act(async()=>{newButton.click();await new Promise(r=>setTimeout(r,0))})
  assert.match((win.document.querySelector('textarea[aria-label="Project context"]') as HTMLTextAreaElement).placeholder,/What problem are you solving/)
  await click('Use example template');assert.match((win.document.querySelector('textarea[aria-label="Project context"]') as HTMLTextAreaElement).value,/EXAMPLE/);await click('Clear context')
  await input(win.document.querySelector('#project-name')!,'First project');await select('#project-mode','existing')
  await input(win.document.querySelector('textarea[aria-label="Project context"]')!,'A service for small teams to manage their work and coordinate projects.')
  await click('Approve');assert.match(win.document.body.textContent!,/APPROVED/)
  await openDeliverable('specs/business/requirements/functional-requirements.md')
  await input(win.document.querySelector('textarea[aria-label="Edit specs/business/requirements/functional-requirements.md"]')!,'# Functional requirements\nThe team can assign work.')
  await click('Approve')
  await clickRole('Design')
  assert.match(win.document.querySelector('.role-handoff')!.textContent!,/small teams/);assert.match(win.document.querySelector('.role-handoff')!.textContent!,/The team can assign work/)
  assert.match(win.document.querySelector('.role-handoff')!.textContent!,/VISION: APPROVED/)
  await input(win.document.querySelector('#role-context')!,'Use the existing design system.')
  await openDeliverable('design/design-tokens.json')
  await click('Remove design system'); assert.doesNotMatch(roleText(),/design-tokens.json/)
  const tokenInput=win.document.querySelector('input[accept=".json,application/json"]')! as HTMLInputElement
  Object.defineProperty(tokenInput,'files',{configurable:true,value:[new File(['{"brand":{"$value":"#123456"},"warning":{"$value":"#ffcc00"}}'],'tokens.json',{type:'application/json'})]})
  await act(async()=>{tokenInput.dispatchEvent(new win.Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,50))});await click('Save design tokens')
  assert.ok(win.document.querySelector('input[aria-label="warning color"]'))
  await clickRole('Business analysis')
  const referenceInput=win.document.querySelector('input[accept^=".pdf,"]')! as HTMLInputElement
  Object.defineProperty(referenceInput,'files',{configurable:true,value:[new File([new Uint8Array([1,2,3])],'reference.png',{type:'image/png'})]})
  await act(async()=>{referenceInput.dispatchEvent(new win.Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,50))})
  await input(win.document.querySelector('input[placeholder="https://github.com/owner/project"]')!,'https://github.com/example/project'); await click('Import file')
  await click('Create Vision & outcomes');assert.match(win.document.body.textContent!, /Who will use this product\?/)
  await input(win.document.querySelector('#clarifying-answer')!,'Small teams.');await click('Send answer')
  assert.match(request.answer,/Small teams/);assert.match(request.context,/Existing system architecture/);assert.match(request.context,/Use the existing design system/);assert.equal(request.images[0],'data:image/png;base64,AQID')
  await click('Approve');await clickRole('Design');assert.equal((win.document.querySelector('#role-context') as HTMLTextAreaElement).value,'Use the existing design system.')
  await select('#target-framework','Angular')
  const componentInput=win.document.querySelector('input[accept^=".pdf,"]')! as HTMLInputElement
  Object.defineProperty(componentInput,'files',{configurable:true,value:[new File(['<button class="primary">Save</button>'],'button.component.html',{type:'text/html'}),new File(['.primary { color: coral; }'],'button.component.scss',{type:'text/plain'}),new File(['export class ButtonComponent {}'],'button.component.ts',{type:'text/plain'})]})
  await act(async()=>{componentInput.dispatchEvent(new win.Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,60))})
  await input(win.document.querySelector('#extra-direction')!, 'Match https://www.figma.com/design/ABC/Login?node-id=1-2 using the existing components.')
  await click('Create Research & CX'); await act(async()=>{await new Promise(r=>setTimeout(r,80))})
  assert.equal(figmaRequests,2); assert.equal(figmaHeaders['X-ProdOps-Figma-Token'],'figma-valid-token-123');assert.equal(aiHeaders['X-ProdOps-Claude-Key'],'sk-ant-valid-test-key');assert.equal(aiHeaders['X-ProdOps-Figma-Token'],undefined); assert.match(request.context,/Login frame/); assert.match(request.context,/button.component.scss/); assert.match(request.context,/ButtonComponent/); assert.match(request.instruction,/Angular/);assert.match(request.context,/# The PRD/)
  await clickRole('Development')
  const codeImport=win.document.querySelector('.code-import input') as HTMLInputElement
  Object.defineProperty(codeImport,'files',{configurable:true,value:[new File(['export class ImportedComponent {}'],'imported.component.ts',{type:'text/plain'}),new File(['<h1>Imported screen</h1>'],'another.html',{type:'text/html'})]})
  await act(async()=>{codeImport.dispatchEvent(new win.Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,60))})
  assert.match((win.document.querySelector('textarea[aria-label="Edit solution/imported.component.ts"]') as HTMLTextAreaElement).value,/ImportedComponent/);assert.match(win.document.body.textContent!,/needs a framework compiler/)
  await openDeliverable('solution/another.html');assert.match(win.document.querySelector('iframe[title="Live HTML and CSS preview"]')!.getAttribute('srcdoc')!,/Imported screen/)
  await click('New code file'); await input(win.document.querySelector('input[aria-label="New file path"]')!, 'solution/example.js')
  await act(async()=>{(win.document.querySelector('#new-file-form .button') as HTMLButtonElement).click();await new Promise(r=>setTimeout(r,0))});await input(win.document.querySelector('textarea[aria-label="Edit solution/example.js"]')!, '// Created in ProdOps')
  await act(async()=>{newButton.click();await new Promise(r=>setTimeout(r,0))});await input(win.document.querySelector('#project-name')!,'Second project');await input(win.document.querySelector('textarea[aria-label="Project context"]')!,'A different product with separate project information.')
  const picker=win.document.querySelector('[aria-label="Choose project"]') as HTMLSelectElement;assert.equal(picker.options.length,3)
  await select('[aria-label="Choose project"]',Array.from(picker.options).find(o=>o.text==='First project')!.value)
  assert.equal((win.document.querySelector('#project-name') as HTMLInputElement).value,'First project');assert.match((win.document.querySelector('textarea[aria-label="Project context"]') as HTMLTextAreaElement).value,/small teams/)
  await click('Choose what to download');await click('Full project');await act(async()=>{await new Promise(r=>setTimeout(r,300))})
  assert.ok(exported);const zip=await JSZip.loadAsync(await exported.arrayBuffer());assert.equal(await zip.file('specs/business/vision/shape.md')!.async('string'),'# The PRD\nReal content')
  assert.doesNotMatch(await zip.file('.prodops/project.json')!.async('string'),/sk-ant-valid-test-key|figma-valid-token-123/);assert.ok(zip.file('.agents/skills/prd-creator/SKILL.md'));assert.match(await zip.file('handoff/design-context.md')!.async('string'),/existing design system/);assert.match(await zip.file('design/design-tokens.json')!.async('string'),/#123456/);assert.ok(zip.file('solution/imported.component.ts'));assert.equal(await zip.file('solution/example.js')!.async('string'),'// Created in ProdOps')
  assert.ok(Object.keys(zip.files).some(name=>name.endsWith('button.component.scss')));assert.ok(Object.keys(zip.files).some(name=>name.endsWith('figma-ABC-1-2.md')))
  const reference=Object.keys(zip.files).find(name=>name.endsWith('-reference.png'));assert.ok(reference);assert.deepEqual([...await zip.file(reference)!.async('uint8array')],[1,2,3]);assert.match(await zip.file('specs/business/vision/review.md')!.async('string'),/approved/)
  await select('[aria-label="Choose project"]',Array.from(picker.options).find(o=>o.text==='Orbit dashboard')!.value);await click('Choose what to download');await click('Application code only');await act(async()=>{await new Promise(r=>setTimeout(r,150))})
  const codeZip=await JSZip.loadAsync(await exported!.arrayBuffer());assert.ok(codeZip.file('index.html'));assert.ok(codeZip.file('app.js'));assert.equal(codeZip.file('.prodops/project.json'),null)
  await click('Disconnect Claude'); await click('Disconnect Figma'); assert.match(win.document.body.textContent!,/Claude disconnected from this tab/);assert.match(win.document.body.textContent!,/Figma disconnected from this tab/)
  console.log('Studio smoke passed: role workbenches, dashboard, handoffs, templates, tokens, previews, imports and exports.')
} finally { await act(async()=>root.unmount()); await vite.close(); globalThis.fetch=oldFetch }
