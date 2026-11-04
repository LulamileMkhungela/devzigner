import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { createServer } from 'node:http'
import { handleStudio, loadRoleSkills, loadAllSkillMarkdown, parseFiles, studioConfig } from '../server/studio'
import { applyGenerated, contextFor, initialProject, readProject, reconcileStepChanges, updateFile } from '../src/studio/model'
import { handleGithubReference } from '../server/github-reference'
import { HISTORY_KEY, LEGACY_KEY, loadHistory } from '../src/studio/history'
import { makeDashboardProject } from '../src/studio/dashboard'
import { JSDOM } from 'jsdom'
import { workflows } from '../src/studio/workflows'
import { readdir } from 'node:fs/promises'
import { readPdfText } from '../src/studio/pdf-text'
import type { PDFDocumentProxy } from 'pdfjs-dist'

test('actual relevant skills and referenced PRD phases are loaded', async () => {
  const business = await loadRoleSkills('business')
  assert.match(business, /prd-creator\/SKILL\.md/)
  assert.match(business, /prd-creator\/steps\/brain-dump\.md/)
  const design = await loadRoleSkills('design')
  assert.match(design, /frontend-design\/SKILL\.md/)
  assert.match(design, /design-system\/references\/agent-instructions\.md/)
  assert.match(await loadRoleSkills('development'), /agents-repo\/SKILL\.md/)
  assert.match(await loadRoleSkills('quality'), /quality-engineering\/SKILL\.md/)
  assert.match(await loadRoleSkills('delivery'), /delivery-operations\/SKILL\.md/)
})
test('all Agent OS commands are mapped to workflow steps', async () => {
  const commands = (await readdir('.agents/commands/prodops')).filter(x => x.endsWith('.md')).map(x => x.slice(0, -3))
  const mapped = Object.values(workflows).flatMap(steps => steps.flatMap(step => step.commands))
  assert.deepEqual(commands.filter(x => !mapped.includes(x)), [])
})
test('PDF extraction respects page limit and reports scanned pages as empty', async () => {
  let pages = 0; let destroyed = false
  const fake = { numPages: 30, getPage: async () => { pages++; return { getTextContent: async () => ({ items: [{ str: 'Reference text' }] }) } }, destroy: async () => { destroyed = true } } as unknown as PDFDocumentProxy
  assert.match(await readPdfText(fake), /Page 12: Reference text/)
  assert.equal(pages, 12); assert.equal(destroyed, true)
  const scanned = { numPages: 1, getPage: async () => ({ getTextContent: async () => ({ items: [] }) }), destroy: async () => {} } as unknown as PDFDocumentProxy
  assert.equal(await readPdfText(scanned), '')
})
test('file response and project validation reject traversal, reserved and duplicate paths', () => {
  assert.deepEqual(parseFiles('```json\n[{"path":"business/PRD.md","content":"Draft"}]\n```'), [{ path: 'business/PRD.md', content: 'Draft' }])
  for (const path of ['business/../bad', 'business/original-spec.md', '/business/a.md', 'business//a.md']) assert.throws(() => parseFiles(JSON.stringify([{ path, content: 'x' }])))
  assert.throws(() => parseFiles(JSON.stringify([{ path: 'business/a.md', content: '' }, { path: 'business/a.md', content: '' }])))
  assert.equal(readProject({ ...initialProject, files: [{ path: '../bad', content: '' }] }), null)
})
test('business edits revoke approval and mark downstream files stale', () => {
  const project = { ...initialProject, spec: 'A sufficiently detailed product specification.', businessApproved: true, files: [{ path: 'business/PRD.md', content: 'Old' }, { path: 'design/brief.md', content: 'Design' }] }
  const changed = updateFile(project, 'business/PRD.md', 'New')
  assert.equal(changed.businessApproved, false)
  assert.equal(changed.designStale, true)
  assert.equal(changed.developmentStale, true)
  assert.match(contextFor(changed, 'development'), /Design/)
  assert.throws(() => applyGenerated(changed, 'business', [{ path: 'solution/hack.js', content: '' }]))
})
test('AI requests use skill Markdown, handle optional questions and protect provider credentials', async () => {
  let prompt = ''; let user: any = ''; let auth = ''; let ask = true
  const generated = ['shape.md','references.md','standards.md','plan.md'].map(name => ({ path: `specs/business/vision/${name}`, content: '# Draft' }))
  const mock: typeof fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body)); prompt = body.messages[0].content; user = body.messages[1].content; auth = (options?.headers as Record<string, string>).Authorization
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(ask ? { question: 'Who will use it?' } : { files: generated }) } }] }))
  }
  const server = createServer((req, res) => void handleStudio(req, res, req.url === '/off' ? null : { url: 'https://example.com', model: 'test', apiKey: 'secret' }, mock))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const address = server.address(); assert.ok(address && typeof address !== 'string')
    const base = `http://127.0.0.1:${address.port}`
    assert.deepEqual(await (await fetch(base + '/off')).json(), { configured: false, provider: null })
    const req = { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ role: 'business', step: 'vision', answer: '', images: [], spec: 'A project idea.', context: 'A markdown note', instruction: '' }) }
    assert.equal((await fetch(base + '/off', req)).status, 503)
    assert.equal((await fetch(base, { ...req, headers: { ...req.headers, Origin: 'https://evil.example' } })).status, 403)
    assert.deepEqual(await (await fetch(base, req)).json(), { question: 'Who will use it?' })
    assert.match(prompt, /prd-creator\/SKILL.md/); assert.match(prompt, /quality-engineering\/SKILL.md/); assert.match(prompt, /steps\/brain-dump.md/); assert.match(user, /A markdown note/); assert.equal(auth, 'Bearer secret')
    ask = false
    assert.deepEqual(await (await fetch(base, req)).json(), { files: generated }, 'a clear brief can produce files without asking')
    const imageRequest = { role:'business', step:'vision', answer:'Q: Who?\nA: Team', images:['data:image/png;base64,aGVsbG8='], spec:'A detailed project specification.', context:'PDF extracted text', instruction:'' }
    assert.equal((await fetch(base, { ...req, body: JSON.stringify(imageRequest) })).status, 200)
    assert.equal(user[1].image_url.url, imageRequest.images[0]); assert.match(user[0].text, /PDF extracted text/)
    assert.equal((await fetch(base, { ...req, body: JSON.stringify({ role: 'development', step: 'standards', answer: '', images: [], spec: 'A detailed project specification.', context: '', instruction: '' }) })).status, 502)
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
})
test('AI server setup requires explicit trusted-mode opt in and supports Anthropic', async () => {
  const env = { PRODOPS_AI_URL: 'https://api.example.com/v1/messages', PRODOPS_AI_MODEL: 'claude-test', PRODOPS_AI_API_KEY: 'secret', PRODOPS_AI_PROVIDER: 'anthropic' }
  assert.equal(studioConfig(env), null)
  const config = studioConfig({ ...env, PRODOPS_AI_TRUSTED_LOCAL: '1' }); assert.ok(config); assert.equal(config.provider, 'anthropic')
  let body: any, headers: any
  const mock: typeof fetch = async (_url, options) => { body = JSON.parse(String(options?.body)); headers = options?.headers; return new Response(JSON.stringify({ content: [{ type:'text', text:'{"question":"Which users?"}' }] })) }
  const server = createServer((req,res) => void handleStudio(req,res,config,mock))
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve))
  try { const address = server.address(); assert.ok(address && typeof address !== 'string'); const base = `http://127.0.0.1:${address.port}`
    const response = await fetch(base,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({role:'business',step:'vision',answer:'',spec:'A product idea',context:'',instruction:'',images:['data:image/png;base64,aGVsbG8=']})})
    assert.deepEqual(await response.json(),{question:'Which users?'}); assert.equal(headers['x-api-key'],'secret'); assert.equal(body.messages[0].content[1].source.media_type,'image/png')
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
})

test('PDF.js extracts a real text PDF into the reference context', async () => {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    '<< /Length 49 >>\nstream\nBT /F1 12 Tf 20 200 Td (Reference example) Tj ET\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let source = '%PDF-1.4\n'; const offsets = [0]
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(source)); source += `${i + 1} 0 obj\n${object}\nendobj\n` })
  const start = Buffer.byteLength(source)
  source += `xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map(x => `${String(x).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(Buffer.from(source)), isEvalSupported: false, useSystemFonts: true }).promise
  assert.match(await readPdfText(pdf), /Reference example/)
})


test('project history migrates the prior project and refuses to overwrite invalid data', () => {
  const values = new Map<string, string>()
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } as unknown as Storage
  values.set(LEGACY_KEY, JSON.stringify({ ...initialProject, name: 'Existing work', spec: 'Stored project context' }))
  const migrated = loadHistory(storage)
  assert.ok(migrated.projects.some(x => x.project.name === 'Existing work')); assert.equal(migrated.projects[0].project.name, 'Orbit dashboard')
  values.set(HISTORY_KEY, JSON.stringify(migrated))
  assert.equal(loadHistory(storage).activeId, migrated.activeId)
  values.set(HISTORY_KEY, '{broken')
  assert.throws(() => loadHistory(storage)); assert.equal(values.get(HISTORY_KEY), '{broken')
})
test('editing an approved step or its upstream context marks it for revisit', () => {
  const base = { ...initialProject, stepDecisions: { 'business/vision': { status: 'approved' as const, note: 'OK' }, 'design/research': { status: 'approved' as const, note: '' } }, files: [{ path: 'specs/business/vision/shape.md', content: 'Original' }] }
  const edited = reconcileStepChanges(base, { ...base, files: [{ path: 'specs/business/vision/shape.md', content: 'Changed' }] })
  assert.equal(edited.stepDecisions['business/vision'].status, 'revisit')
  assert.equal(edited.stepDecisions['design/research'].status, 'revisit')
  assert.equal(reconcileStepChanges(base, { ...base, name: 'Renamed' }).stepDecisions['business/vision'].status, 'approved')
})
test('optional GitHub import permits only public repository files and checks the origin', async () => {
  let requested = ''
  const mock: typeof fetch = async url => { requested = String(url); return new Response(JSON.stringify({ type: 'file', encoding: 'base64', size: 5, content: 'aGVsbG8=' })) }
  const server = createServer((req, res) => void handleGithubReference(req, res, mock))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const address = server.address(); assert.ok(address && typeof address !== 'string'); const base = `http://127.0.0.1:${address.port}`
    const headers = { 'Content-Type': 'application/json', Origin: base }
    const body = { repo: 'https://github.com/owner/project', ref: 'main', path: 'docs/spec.md' }
    assert.equal((await fetch(base, { method: 'POST', headers: { ...headers, Origin: 'https://evil.example' }, body: JSON.stringify(body) })).status, 403)
    assert.equal((await fetch(base, { method: 'POST', headers, body: JSON.stringify({ ...body, repo: 'https://evil.example/a/b' }) })).status, 400)
    assert.equal((await fetch(base, { method: 'POST', headers, body: JSON.stringify({ ...body, path: '../secret' }) })).status, 400)
    const response = await fetch(base, { method: 'POST', headers, body: JSON.stringify(body) })
    assert.equal(response.status, 200); assert.match(requested, /^https:\/\/api\.github\.com\/repos\/owner\/project\/contents\/docs\/spec.md/)
    assert.deepEqual(await response.json(), { name: 'spec.md', content: 'hello', source: 'https://github.com/owner/project/blob/main/docs/spec.md' })
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
})


test('dashboard example contains complete role work, requirements, design system and code', async () => {
  const project = makeDashboardProject()
  assert.equal(project.sample, true)
  for (const [role, stages] of Object.entries(workflows)) for (const stage of stages) {
    assert.equal(project.stepDecisions[`${role}/${stage.id}`].status, 'approved')
    for (const name of ['shape.md','plan.md','references.md','standards.md']) assert.ok(project.files.some(f => f.path === `specs/${role}/${stage.id}/${name}`))
  }
  for (const path of ['specs/business/requirements/business-requirements.md','specs/business/requirements/functional-requirements.md','specs/design/screens/design-requirements.md','design/design-tokens.json','design/components.md','solution/index.html','solution/styles.css','solution/app.js']) assert.ok(project.files.some(f=>f.path===path),path)
  assert.match(contextFor(project,'business'), /specs\/delivery\/operations\/shape.md/)
  assert.match(await loadAllSkillMarkdown(), /database-engineering\/SKILL.md/)
})
test('dashboard app filters tasks and updates status and metrics', () => {
  const project=makeDashboardProject(), js=project.files.find(f=>f.path==='solution/app.js')!.content, html=project.files.find(f=>f.path==='solution/index.html')!.content
  const dom=new JSDOM(html.replace('<script src="app.js"></script>',''),{url:'https://dashboard.example/',runScripts:'outside-only'});const w=dom.window;w.eval(js)
  assert.equal(w.document.getElementById('total')!.textContent,'4');assert.equal(w.document.getElementById('completed')!.textContent,'1')
  const filter=w.document.getElementById('priority-filter') as HTMLSelectElement;filter.value='High';filter.dispatchEvent(new w.Event('change',{bubbles:true}));assert.match(w.document.getElementById('work-items')!.textContent!,/Finalize onboarding/);assert.doesNotMatch(w.document.getElementById('work-items')!.textContent!,/Review analytics/)
  ;(w.document.querySelector('button[aria-label="Mark done Finalize onboarding"]') as HTMLButtonElement).click();assert.equal(w.document.getElementById('completed')!.textContent,'2');w.close()
})

test('Figma connector validates links and imports bounded read-only frame context without exposing the token', async () => {
  const { figmaConfig, handleFigmaReference } = await import('../server/figma-reference')
  const { parseFigmaLink } = await import('../src/studio/figma-link')
  assert.equal(figmaConfig({ PRODOPS_FIGMA_TOKEN:'secret' }), null)
  assert.ok(figmaConfig({ PRODOPS_FIGMA_TOKEN:'secret', PRODOPS_FIGMA_TRUSTED_LOCAL:'1' }))
  assert.equal(parseFigmaLink('https://evil.example/design/ABC/x?node-id=1-2'), null)
  assert.equal(parseFigmaLink('https://figma.com/design/ABC/x'), null)
  assert.deepEqual(parseFigmaLink('https://www.figma.com/design/ABC/Test?node-id=1-2&secret=discard'), { fileKey:'ABC', nodeId:'1:2', source:'https://www.figma.com/design/ABC/file?node-id=1-2' })
  let requested = '', header = ''
  const mock: typeof fetch = async (url, options) => { requested=String(url); header=(options?.headers as Record<string,string>)['X-Figma-Token']; return new Response(JSON.stringify({ nodes: { '1:2': { document: { id:'1:2', name:'Login', type:'FRAME', layoutMode:'VERTICAL', itemSpacing:16, fills:[{type:'SOLID',color:{r:1,g:0,b:0}}], children:[{id:'3:4',name:'Title',type:'TEXT',characters:'Welcome',style:{fontFamily:'Inter',fontSize:24}}] } } } }), { headers:{'Content-Type':'application/json'} }) }
  const server=createServer((req,res)=>void handleFigmaReference(req,res,req.url==='/off'?null:{token:'secret'},mock))
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
  try { const address=server.address();assert.ok(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`
    assert.deepEqual(await (await fetch(base+'/off')).json(),{configured:false})
    const options={method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({url:'https://www.figma.com/design/ABC/Test?node-id=1-2&secret=discard'})}
    assert.equal((await fetch(base+'/off',options)).status,503)
    assert.equal((await fetch(base,{...options,headers:{...options.headers,Origin:'https://evil.example'}})).status,403)
    assert.equal((await fetch(base,{...options,body:JSON.stringify({url:'https://evil.example/design/ABC/x?node-id=1-2'})})).status,400)
    const response=await fetch(base,options);const data=await response.json();assert.equal(response.status,200);assert.match(data.text,/Login/);assert.match(data.text,/itemSpacing/);assert.match(data.text,/Welcome/);assert.doesNotMatch(JSON.stringify(data),/secret/);assert.equal(header,'secret');assert.match(requested,/^https:\/\/api\.figma\.com\/v1\/files\/ABC\/nodes\?/);assert.ok(!requested.includes('discard'))
  } finally {await new Promise<void>(resolve=>server.close(()=>resolve()))}
})

test('static preview strips scripts, external links and handlers and applies a restrictive policy', async () => {
  const dom = new JSDOM('');const original=globalThis.DOMParser;Object.assign(globalThis,{DOMParser:dom.window.DOMParser})
  try {const {staticPreview}=await import('../src/studio/static-preview');const src=staticPreview([{path:'solution/index.html',content:'<html><head><meta http-equiv="refresh" content="0;url=https://evil.example"></head><body><script>evil()</script><a href="https://evil.example" onclick="evil()">Hello</a><iframe src="https://evil.example"></iframe></body></html>'},{path:'solution/styles.css',content:'body{color:red}'}])!
    assert.doesNotMatch(src,/<script|onclick=|<iframe|evil\.example/i);assert.match(src,/Content-Security-Policy/i);assert.match(src,/default-src &#39;none&#39;|default-src 'none'/);assert.match(src,/color:red/)
  } finally {Object.assign(globalThis,{DOMParser:original});dom.window.close()}
})

test('Figma errors and oversized responses fail safely, with redirects disabled', async () => {
  const {handleFigmaReference}=await import('../server/figma-reference')
  let mode='missing', redirect: RequestRedirect | undefined
  const mock:typeof fetch=async (_url,options)=>{redirect=options?.redirect;if(mode==='missing') return Response.json({nodes:{}});if(mode==='denied')return new Response('private provider details',{status:403});if(mode==='large')return new Response('x',{headers:{'Content-Length':'2000001'}});throw new Error('secret upstream exception')}
  const server=createServer((req,res)=>void handleFigmaReference(req,res,{token:'supersecret'},mock));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
  try {const address=server.address();assert.ok(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;const post=()=>fetch(base,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({url:'https://figma.com/design/ABC/x?node-id=1-2'})})
    let response=await post();assert.equal(response.status,404);assert.equal(redirect,'error')
    for (mode of ['denied','large','throw']) {response=await post();assert.equal(response.status,502);assert.doesNotMatch(await response.text(),/supersecret|private provider details|secret upstream exception/)}
  } finally {await new Promise<void>(resolve=>server.close(()=>resolve()))}
})

test('history preserves an edited old example when adding the dashboard', () => {
  const old={...initialProject,name:'CASA',sample:true,spec:'My saved changes',files:[{path:'solution/app.js',content:'my code'}]}
  const values=new Map([[HISTORY_KEY,JSON.stringify({version:2,activeId:'example-casa-v1',projects:[{id:'example-casa-v1',project:old}]})]])
  const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)} as unknown as Storage
  const history=loadHistory(storage);assert.equal(history.projects[0].project.name,'Orbit dashboard');assert.equal(history.activeId,'example-orbit-dashboard-v1');const preserved=history.projects.find(p=>p.id==='example-casa-v1')!.project;assert.equal(preserved.sample,false);assert.equal(preserved.spec,'My saved changes');assert.equal(preserved.files[0].content,'my code')
  assert.match(contextFor(makeDashboardProject(),'design'),/solution\/app.js/)
})

test('editing design assets and solution code invalidates related approved steps', () => {
  const project=makeDashboardProject()
  const design=reconcileStepChanges(project,updateFile(project,'design/design-tokens.json','{}'))
  assert.equal(design.stepDecisions['design/system'].status,'revisit');assert.equal(design.stepDecisions['design/screens'].status,'revisit');assert.equal(design.stepDecisions['development/implementation'].status,'revisit')
  const code=reconcileStepChanges(project,updateFile(project,'solution/app.js','// changed'))
  assert.equal(code.stepDecisions['development/implementation'].status,'revisit');assert.equal(code.stepDecisions['development/verification'].status,'revisit');assert.equal(code.stepDecisions['design/system'].status,'approved')
})

test('interactive preview uses current code and retains the sandbox content restrictions', async () => {
  const dom = new JSDOM('');const original=globalThis.DOMParser;Object.assign(globalThis,{DOMParser:dom.window.DOMParser})
  try { const {staticPreview}=await import('../src/studio/static-preview');const project=makeDashboardProject();const files=project.files.map(f=>f.path==='solution/index.html'?{...f,content:f.content.replace('Delivery overview','Current changes')}:f)
    const preview=staticPreview(files,true)!;assert.match(preview,/Current changes/);assert.match(preview,/work-items/);assert.match(preview,/script-src/);assert.match(preview,/default-src 'none'/);assert.doesNotMatch(preview,/<script src=/)
    const app=new JSDOM(preview,{runScripts:'dangerously',url:'https://isolated.example/'});assert.match(app.window.document.getElementById('work-items')!.textContent!,/Finalize onboarding/);app.window.close()
  } finally {Object.assign(globalThis,{DOMParser:original});dom.window.close()}
})


test('HTML previews follow the selected file and design tokens use named CSS variables', async () => {
  const dom=new JSDOM('');const old=globalThis.DOMParser;Object.assign(globalThis,{DOMParser:dom.window.DOMParser})
  try {const {staticPreview}=await import('../src/studio/static-preview');const {tokenCss,replaceTokenBlock,defaultTokens}=await import('../src/studio/tokens');const files=[{path:'solution/index.html',content:'<p>Home</p>'},{path:'solution/other.html',content:'<p>Other page</p>'},{path:'solution/styles.css',content:tokenCss(defaultTokens)+'\n.card{color:var(--color-primary)}'}];assert.match(staticPreview(files,false,'solution/other.html')!,/Other page/);assert.doesNotMatch(staticPreview(files,false,'solution/other.html')!,/>Home</);const changed=replaceTokenBlock(files[2].content,{...defaultTokens,primary:'#123456',colors:{warning:'#feab45'}})!;assert.match(changed,/--color-primary: #123456/);assert.match(changed,/--color-warning: #feab45/);assert.match(changed,/color:var\(--color-primary\)/)} finally {Object.assign(globalThis,{DOMParser:old});dom.window.close()}
})

test('AI requirement steps require separate business, functional and design requirements files', async () => {
  let requestedRole='business', includeRequirements=false, system=''
  const mock:typeof fetch=async (_url,options)=>{const body=JSON.parse(String(options?.body));system=body.messages[0].content;const prefix=requestedRole==='business'?'specs/business/requirements/':'specs/design/screens/';const names=['shape.md','references.md','standards.md','plan.md',...(includeRequirements?(requestedRole==='business'?['business-requirements.md','functional-requirements.md']:['design-requirements.md']):[])];return Response.json({choices:[{message:{content:JSON.stringify({files:names.map(name=>({path:prefix+name,content:'Draft'}))})}}]})}
  const server=createServer((req,res)=>void handleStudio(req,res,{url:'https://example.com',model:'test'},mock));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
  try {const address=server.address();assert.ok(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;const post=(role:string,step:string)=>fetch(base,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({role,step,answer:'',spec:'A delivery dashboard',context:'',instruction:'',images:[]})})
    assert.equal((await post('business','requirements')).status,502);includeRequirements=true;assert.equal((await post('business','requirements')).status,200);assert.match(system,/functional-requirements.md/)
    requestedRole='design';includeRequirements=false;assert.equal((await post('design','screens')).status,502);includeRequirements=true;assert.equal((await post('design','screens')).status,200);assert.match(system,/design-requirements.md/)
  } finally {await new Promise<void>(resolve=>server.close(()=>resolve()))}
})

test('personal Claude credentials are request-scoped, fixed-host, validated and never returned', async () => {
  let calls=0, destination='', receivedKey='', redirect:RequestRedirect|undefined, receivedModel=''
  const mock:typeof fetch=async (url,options)=>{calls++;destination=String(url);receivedKey=(options?.headers as Record<string,string>)['x-api-key'];redirect=options?.redirect;receivedModel=JSON.parse(String(options?.body)).model;return Response.json({content:[{type:'text',text:'{"question":"Which users?"}'}]})}
  const server=createServer((req,res)=>void handleStudio(req,res,null,mock));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
  try {const address=server.address();assert.ok(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`
    const headers={Origin:base,'Content-Type':'application/json','X-ProdOps-Claude-Key':'sk-ant-test-secret','X-ProdOps-Claude-Model':'claude-sonnet-4-6'}
    const options={method:'POST',headers,body:JSON.stringify({testConnection:true})}
    assert.equal((await fetch(base,{...options,headers:{...headers,Origin:'https://evil.example'}})).status,403)
    assert.equal((await fetch(base,{...options,headers:{...headers,Host:'example.com',Origin:'http://example.com'}})).status,403)
    assert.equal((await fetch(base,{...options,headers:{...headers,'X-ProdOps-Claude-Model':'https://evil.example'}})).status,400)
    assert.equal((await fetch(base,{...options,headers:{...headers,'X-ProdOps-Claude-Key':'bad'}})).status,400)
    let response=await fetch(base,options);assert.equal(response.status,200);assert.doesNotMatch(await response.text(),/secret/);assert.equal(destination,'https://api.anthropic.com/v1/messages');assert.equal(receivedKey,'sk-ant-test-secret');assert.equal(receivedModel,'claude-sonnet-4-6');assert.equal(redirect,'error')
    const body={role:'business',step:'vision',answer:'',images:[],spec:'A brief',context:'',instruction:''};response=await fetch(base,{...options,body:JSON.stringify(body)});assert.equal(response.status,200);assert.deepEqual(await response.json(),{question:'Which users?'})
    response=await fetch(base,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(response.status,503);assert.equal(calls,2)
  } finally {await new Promise<void>(resolve=>server.close(()=>resolve()))}
})

test('personal Figma token is request-scoped and forwarded only to the fixed Figma host', async () => {
  const {handleFigmaReference}=await import('../server/figma-reference');let destination='',key='',redirect:RequestRedirect|undefined
  const mock:typeof fetch=async (url,options)=>{destination=String(url);key=(options?.headers as Record<string,string>)['X-Figma-Token'];redirect=options?.redirect;return Response.json({nodes:{'1:2':{document:{id:'1:2',type:'FRAME',name:'Example'}}}})}
  const server=createServer((req,res)=>void handleFigmaReference(req,res,null,mock));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
  try {const address=server.address();assert.ok(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;const body=JSON.stringify({url:'https://www.figma.com/design/ABC/file?node-id=1-2'});const headers={Origin:base,'Content-Type':'application/json','X-ProdOps-Figma-Token':'figma-secret-token'}
    assert.equal((await fetch(base,{method:'POST',headers:{...headers,Host:'example.com',Origin:'http://example.com'},body})).status,403)
    assert.equal((await fetch(base,{method:'POST',headers:{...headers,'X-ProdOps-Figma-Token':'bad'},body})).status,400)
    let response=await fetch(base,{method:'POST',headers,body});assert.equal(response.status,200);assert.doesNotMatch(await response.text(),/figma-secret-token/);assert.match(destination,/^https:\/\/api\.figma\.com\//);assert.equal(key,'figma-secret-token');assert.equal(redirect,'error')
    response=await fetch(base,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body});assert.equal(response.status,503)
  } finally {await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
