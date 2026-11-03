/**
 * Does the role system work in the *production bundle*?
 *
 * A workspace can run as one role, and a role owns its process from start to
 * finish: the left panel shows "BUSINESS ANALYSIS PROCESS · 7 STEPS" and
 * nothing from the other roles, every step carries the same three review
 * actions (approved / rejected / proceed-revisit), the project history is a
 * dropdown that pulls a project's data when clicked, and the role's skill.md
 * can be integrated optionally.
 *
 * Same boot method as browser-check: the real bundle in a fresh jsdom per
 * scenario, with the localStorage a returning builder actually has.
 */
import { build } from 'vite'
import { compileProject } from '../src/engine'
import react from '@vitejs/plugin-react'
import { JSDOM } from 'jsdom'
import { readFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

const OUT = 'node_modules/.role-check'
const STORAGE_KEY = 'prodops.projects.v1'
const ACTIVE_KEY = 'prodops.active.v1'

await rm(OUT, { recursive: true, force: true })
await build({
  configFile: false,
  logLevel: 'error',
  plugins: [react()],
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    outDir: OUT,
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: false,
    target: 'es2019',
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
  },
})

const assets = await readdir(join(OUT, 'assets'))
const jsName = assets.find((name) => name.endsWith('.js'))!
const code = await readFile(join(OUT, 'assets', jsName), 'utf8')

/** A described product, optionally running as a role. */
function describedProject(id: string, roleId?: string, idea = 'A tool for scheduling volunteer shifts at a food bank') {
  const project = compileProject({ idea, seed: 777 })
  const record = JSON.parse(JSON.stringify(project)) as Record<string, unknown>
  record.id = id
  record.described = true
  if (roleId) record.roleId = roleId
  return record
}

let failures = 0
function check(label: string, ok: boolean, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'ERR'} ${label}${detail ? ` — ${detail}` : ''}`)
}

async function boot(storage: Record<string, string>): Promise<(Window & typeof globalThis) & { dom: JSDOM }> {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:5173/',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  })
  const w = dom.window as unknown as Window & typeof globalThis & { dom: JSDOM }
  w.dom = dom
  for (const [key, value] of Object.entries(storage)) w.localStorage.setItem(key, value)
  const problems: string[] = []
  w.addEventListener('error', (event) => problems.push(`window error: ${(event as ErrorEvent).message}`))
  w.eval(code)
  await new Promise((resolve) => setTimeout(resolve, 900))
  ;(w as unknown as { problems: string[] }).problems = problems
  return w
}

const text = (w: Window & typeof globalThis) => (w.document.getElementById('root')?.textContent ?? '').replace(/\s+/g, ' ').trim()
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const buttons = (w: Window & typeof globalThis) => [...w.document.querySelectorAll('button')] as HTMLElement[]
const findButton = (w: Window & typeof globalThis, re: RegExp) => buttons(w).find((b) => re.test(b.textContent ?? ''))

/* ---- scenario 1: a workspace running as Business Analysis ---------------- */

const ba = describedProject('ba-project', 'business-analysis')
const w1 = await boot({ [STORAGE_KEY]: JSON.stringify([ba]), [ACTIVE_KEY]: JSON.stringify('ba-project') })

check('BA workspace · mounts with no errors', (w1.document.getElementById('root')?.querySelectorAll('*').length ?? 0) > 20)

await sleep(400)
check('BA workspace · lands on the first step of its own process', w1.location.hash === '#/role/vision-outcome', w1.location.hash)

const rail1 = text(w1)
check('BA workspace · the left panel names the process and its step count', /BUSINESS ANALYSIS PROCESS · 7 STEPS/.test(rail1))
const stepLinks = [...new Set([...w1.document.querySelectorAll('a[href^="#/role/"]')].map((a) => a.getAttribute('href')))]
check('BA workspace · all seven steps are listed start to finish', stepLinks.length === 7, stepLinks.join(','))
check('BA workspace · the design stage is not in the rail', ![...w1.document.querySelectorAll('.lz-nav a')].some((a) => a.getAttribute('href') === '#/design'))
check('BA workspace · the five-stage rail is gone', !/Data Shape/.test(w1.document.querySelector('.lz-nav')?.textContent ?? ''))
check('BA workspace · the inspector offers the three review actions', ['Approve', 'Reject', 'Proceed — revisit'].every((label) => Boolean(findButton(w1, new RegExp(label)))))
check('BA workspace · the role skill is named with its path', rail1.includes('.agents/skills/business-analysis/SKILL.md') || text(w1).includes('.agents/skills/business-analysis/SKILL.md'))
check('BA workspace · skill starts optional (not integrated)', !rail1.includes('Integrated') && Boolean(findButton(w1, /\bIntegrate\b/)))

// Approval is gated on the clarifying questions: pressing Approve with none
// answered must not store a decision.
findButton(w1, /\bApprove\b/)?.click()
await sleep(300)
const gated = JSON.parse(w1.localStorage.getItem(STORAGE_KEY) ?? '[]')[0]
check('BA workspace · approval is refused until the questions are answered', !gated?.stepReviews?.['business-analysis.vision-outcome'])

// Answer them, then approve → the decision stores and the next step is named.
const answerAll = async (w: Window & typeof globalThis) => {
  const boxes = [...w.document.querySelectorAll('.lz-insp-q textarea')] as HTMLTextAreaElement[]
  for (const [i, box] of boxes.entries()) {
    box.focus()
    const setter = Object.getOwnPropertyDescriptor(w.HTMLTextAreaElement.prototype, 'value')!.set!
    setter.call(box, `Answer ${i + 1} — a real decision from the builder`)
    box.dispatchEvent(new (w as unknown as { Event: typeof Event }).Event('input', { bubbles: true }))
    await sleep(60)
  }
  await sleep(250)
}
await answerAll(w1)
findButton(w1, /\bApprove\b/)?.click()
await sleep(400)
const stored1 = JSON.parse(w1.localStorage.getItem(STORAGE_KEY) ?? '[]')[0]
check('BA workspace · approving a step stores the decision on the project', stored1?.stepReviews?.['business-analysis.vision-outcome']?.decision === 'approved')
check('BA workspace · the answers are stored with the project', Object.keys(stored1?.answers ?? {}).filter((k) => k.startsWith('business-analysis.vision-outcome')).length === 2)
check('BA workspace · approving writes the step documents into the spec folder', (stored1?.artifacts ?? []).some((a: { file: string }) => a.file.startsWith('spec/business-analysis/')))
check('BA workspace · after approval the rail names what is next', /Next:\s*Stakeholders & scope/.test(text(w1)), text(w1).match(/Next:.*?·/)?.[0] ?? '')

// Integrate the skill → its own seven steps show.
findButton(w1, /\bIntegrate\b/)?.click()
await sleep(350)
check('BA workspace · integrating the skill lists the skill\'s own steps', /Vision & outcome/.test(text(w1)) && /Validation & handoff/.test(text(w1)))
const stored1b = JSON.parse(w1.localStorage.getItem(STORAGE_KEY) ?? '[]')[0]
check('BA workspace · the integration choice is stored', stored1b?.integratedSkills?.includes('business-analysis'))

// A route outside the role is gated — no design stuff on BA.
w1.location.hash = '#/design'
await sleep(300)
check('BA workspace · the design route is gated, not shown', /Not in the Business Analysis process/.test(text(w1)))
w1.location.hash = '#/data-shape'
await sleep(300)
check('BA workspace · database design is gated too (it is not a BA step)', /Not in the Business Analysis process/.test(text(w1)))
w1.location.hash = '#/sections'
await sleep(300)
check('BA workspace · its own stages still open (sections holds the requirements)', !/Not in the Business Analysis process/.test(text(w1)))

// The spec folder lists what was written, and the visual editor is reachable
// from the design role.
w1.location.hash = '#/specs'
await sleep(400)
check('spec folder · the saved documents are listed', /Vision & outcome/.test(text(w1)) && /spec\/business-analysis/.test(text(w1)))
check('spec folder · the markdown renders as real prose', Boolean(w1.document.querySelector('.lz-md h1')))
check('spec folder · the reviewer can download the folder', Boolean(findButton(w1, /Download spec folder/)))

// Reject and proceed-revisit actions store too.
w1.location.hash = '#/role/requirements'
await sleep(300)
findButton(w1, /\bReject\b/)?.click()
await sleep(300)
let stored1c = JSON.parse(w1.localStorage.getItem(STORAGE_KEY) ?? '[]')[0]
check('BA workspace · reject stores on the step', stored1c?.stepReviews?.['business-analysis.requirements']?.decision === 'rejected')
findButton(w1, /Proceed — revisit/)?.click()
await sleep(300)
stored1c = JSON.parse(w1.localStorage.getItem(STORAGE_KEY) ?? '[]')[0]
check('BA workspace · proceed-but-revisit stores on the step', stored1c?.stepReviews?.['business-analysis.requirements']?.decision === 'proceed-revisit')
check('BA workspace · the step is flagged in the rail', w1.document.querySelector('.lz-role-step[data-state="proceed-revisit"]') !== null)

w1.close()

/* ---- scenario 2: project history dropdown -------------------------------- */

const plain = describedProject('plain-project', undefined, 'A booking board for a community hall')
const w2 = await boot({
  [STORAGE_KEY]: JSON.stringify([ba, plain]),
  [ACTIVE_KEY]: JSON.stringify('ba-project'),
})
await sleep(400)
const projectsBtn = buttons(w2).find((b) => /Workspace projects/.test(b.title ?? ''))
check('history · the dropdown shows the active project', projectsBtn?.textContent?.includes(ba.name) ?? false)
projectsBtn?.click()
await sleep(250)
const menuText = w2.document.querySelector('.lz-dd-menu')?.textContent ?? ''
check('history · the dropdown lists every workspace project', menuText.includes(ba.name) && menuText.includes(plain.name), menuText.slice(0, 80))
const openPlain = [...w2.document.querySelectorAll('.lz-dd-item-open')].find((el) => el.textContent?.includes(plain.name)) as HTMLElement | undefined
openPlain?.click()
await sleep(500)
const storedActive = JSON.parse(w2.localStorage.getItem(ACTIVE_KEY) ?? '""')
check('history · clicking a project pulls all of its data', storedActive === 'plain-project' && text(w2).includes(plain.name), storedActive)
check('history · the other project has no role, so the five-stage rail is back', /Data Shape/.test(w2.document.querySelector('.lz-nav')?.textContent ?? '') && !/BUSINESS ANALYSIS PROCESS/.test(text(w2)))
w2.close()

/* ---- scenario 3: picking a role on a plain project ------------------------- */

const w3 = await boot({ [STORAGE_KEY]: JSON.stringify([plain]), [ACTIVE_KEY]: JSON.stringify('plain-project') })
await sleep(400)
const roleBtn = buttons(w3).find((b) => /role this workspace runs as/i.test(b.title ?? ''))
roleBtn?.click()
await sleep(250)
const roleMenu = [...w3.document.querySelectorAll('.lz-dd-role')].map((el) => el.textContent ?? '')
check('role picker · every role is offered', roleMenu.some((t) => /Business Analysis/.test(t)) && roleMenu.some((t) => /Data & database design/.test(t)) && roleMenu.some((t) => /All five stages/.test(t)), roleMenu.join(' | ').slice(0, 100))
const pickBa = [...w3.document.querySelectorAll('.lz-dd-role')].find((el) => /Business Analysis/.test(el.textContent ?? '')) as HTMLElement | undefined
pickBa?.click()
await sleep(500)
const stored3 = JSON.parse(w3.localStorage.getItem(STORAGE_KEY) ?? '[]')[0]
check('role picker · choosing a role stores it and opens the role process', stored3?.roleId === 'business-analysis' && w3.location.hash.startsWith('#/role/'), `${stored3?.roleId} ${w3.location.hash}`)
check('role picker · the rail now shows the BA process label', /BUSINESS ANALYSIS PROCESS · 7 STEPS/.test(text(w3)))
w3.close()

/* ---- scenario 4: the design role and its visual editor --------------------- */

const designer = describedProject('design-project', 'product-design')
designer.roles = ['qa-testing']
const w4 = await boot({ [STORAGE_KEY]: JSON.stringify([designer]), [ACTIVE_KEY]: JSON.stringify('design-project') })
await sleep(500)
check('design role · mounts and opens its first step', w4.location.hash.startsWith('#/role/'), w4.location.hash)
const designRail = text(w4)
check('design role · the rail groups the process by discipline', /FOUNDATIONS/.test(designRail) || /Foundations/.test(designRail))
check('design role · the whole design process is listed', /Foundations/.test(designRail) && /Screens/.test(designRail) && /Visual craft/.test(designRail))
check('design role · an extra role is shown as also running', /Also running/.test(designRail) && /QA/.test(designRail))

w4.location.hash = '#/editor'
await sleep(600)
const editor = text(w4)
check('visual editor · opens for the design role', /Visual editor/.test(editor) && /Where the look comes from/.test(editor))
check('visual editor · offers the generated system, token import and Figma', /Generated/.test(editor) && /Import tokens/.test(editor) && /Figma/.test(editor))
check('visual editor · renders the real screen beside the controls', Boolean(w4.document.querySelector('.lz-ved-frame')))

findButton(w4, /\bFigma\b/)?.click()
await sleep(200)
const figmaInput = w4.document.querySelector('input[aria-label="Figma file URL"]') as HTMLInputElement | undefined
check('visual editor · a Figma file can be linked', Boolean(figmaInput))

w4.location.hash = '#/specs'
await sleep(400)
check('spec folder · the BA spec folder is not shown to a workspace with no BA documents', Boolean(w4.document.querySelector('.lz-specs')))
w4.close()

await rm(OUT, { recursive: true, force: true })

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nrole check passed')
