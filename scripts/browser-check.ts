/**
 * Does the *production bundle* mount — including with the storage a returning
 * visitor actually has?
 *
 * `npm run smoke` mounts the source in jsdom through tsx, which never exercises
 * the bundle the browser receives (module graph, minification, dynamic imports,
 * `process.env` replacement, StrictMode) and always starts from empty storage.
 * A build can pass every other gate and still ship a blank page: a record saved
 * by an older version is enough, because the first `.filter` on an array that
 * did not exist yet throws before React mounts.
 *
 * So each scenario boots the real bundle in a fresh DOM with a different
 * `localStorage` payload and fails if `#root` stays empty or anything logged.
 */
import { build } from 'vite'
import { compileProject } from '../src/engine'
import react from '@vitejs/plugin-react'
import { JSDOM } from 'jsdom'
import { readFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

const OUT = 'node_modules/.browser-check'
const STORAGE_KEY = 'prodops.projects.v1'

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

/** A record written by a build that predates flows, the system record and specs. */
const legacyProject = {
  id: 'legacy-1',
  name: 'Old Careline',
  archetypeLabel: 'Clinic',
  idea: 'a clinic front desk',
  seed: 4242,
  archetypeId: 'clinic',
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
}

/* The product the previous release auto-seeded: a complete marketplace record
   compiled before sections were scoped, so it still carries Control room. The
   workspace must open on the description field instead of recompiling it. */
const previousSample = (() => {
  const sample = compileProject({
    idea: 'A marketplace where township artisans sell directly to buyers across South Africa',
    archetypeId: 'marketplace',
    seed: 112233,
  })
  const record = JSON.parse(JSON.stringify(sample)) as Record<string, unknown>
  delete record.compiler
  return record
})()

const scenarios: { name: string; storage: Record<string, string> }[] = [
  { name: 'first visit (empty storage)', storage: {} },
  {
    name: 'a project saved by an older version',
    storage: { [STORAGE_KEY]: JSON.stringify([legacyProject]) },
  },
  {
    name: 'half-migrated project (flows missing, system present)',
    storage: { [STORAGE_KEY]: JSON.stringify([{ ...legacyProject, system: { stack: [] } }]) },
  },
  {
    name: 'a project whose sections were saved empty',
    storage: { [STORAGE_KEY]: JSON.stringify([{ ...legacyProject, flows: [], sections: [] }]) },
  },
  {
    // ProdOps was Lula DevZign until this release. A returning visitor still has
    // the old keys; the rename must read them, not silently start empty.
    name: 'a workspace saved under the old name',
    storage: { 'lula.devzign.projects.v1': JSON.stringify([{ ...legacyProject, id: 'legacy-old', name: 'Old Careline' }]) },
  },
  {
    name: 'the sample product the last release opened on',
    storage: { [STORAGE_KEY]: JSON.stringify([previousSample]) },
  },
  { name: 'corrupt JSON in storage', storage: { [STORAGE_KEY]: '{"broken": ' } },
  { name: 'junk in storage', storage: { [STORAGE_KEY]: JSON.stringify([null, 42, 'nope', { id: 'x' }]) } },
]

let failures = 0
function check(label: string, ok: boolean, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'ERR'} ${label}${detail ? ` — ${detail}` : ''}`)
}

for (const scenario of scenarios) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:5173/',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  })
  const w = dom.window as unknown as Window & typeof globalThis

  for (const [key, value] of Object.entries(scenario.storage)) w.localStorage.setItem(key, value)

  const problems: string[] = []
  w.addEventListener('error', (event) => problems.push(`window error: ${(event as ErrorEvent).message}`))
  w.addEventListener('unhandledrejection', (event) =>
    problems.push(`unhandled rejection: ${String((event as PromiseRejectionEvent).reason)}`),
  )

  const origError = console.error
  console.error = (...args: unknown[]) => {
    const line = args.map(String).join(' ')
    if (!/not wrapped in act/i.test(line)) problems.push(`console.error: ${line}`)
  }

  try {
    w.eval(code)
  } catch (error) {
    problems.push(`threw on evaluate: ${(error as Error).message}`)
  }

  await new Promise((resolve) => setTimeout(resolve, 1200))
  console.error = origError

  const root = w.document.getElementById('root')!
  const text = (root.textContent ?? '').replace(/\s+/g, ' ').trim()
  const nodes = root.querySelectorAll('*').length
  const detail = `${nodes} nodes, ${text.length} chars${problems.length ? `, ${problems.length} error(s)` : ''}`

  check(`${scenario.name} · mounts`, nodes > 20 && text.length > 200 && !problems.some((p) => p.startsWith('threw')), detail)
  check(`${scenario.name} · renders the shell`, /Data Shape|Sections/i.test(text))
  if (scenario.name === 'the sample product the last release opened on') {
    // Somebody else's marketplace is not the builder's product: the workspace
    // opens on the description field, with no Control room in sight.
    check(
      'the old auto-seeded sample opens on the description field',
      /what happens when you build/i.test(text) && !/Control room/.test(text),
      text.slice(0, 60),
    )
  }
  if (scenario.name === 'a workspace saved under the old name') {
    check('the pre-rename workspace survives the rename', text.includes('Old Careline'), 'project name shown in the shell')
  }
  check(`${scenario.name} · no console errors`, problems.length === 0, problems.slice(0, 2).join(' | '))

  // A tick means the stage is done, so a freshly compiled product has none —
  // artefacts exist, but nobody has reviewed them yet.
  check(`${scenario.name} · no stage is ticked for free`, root.querySelectorAll('.lz-step.is-done').length === 0)

  if (Object.keys(scenario.storage).length === 0) {
    // The builder's own words are the first thing on the Product phase.
    const brief = root.querySelector('textarea') as HTMLTextAreaElement | null
    check('first visit · the brief field exists', Boolean(brief))
    check(
      'first visit · the brief field carries a placeholder',
      Boolean(brief?.placeholder && brief.placeholder.length > 40),
      brief?.placeholder?.slice(0, 48),
    )
    check('first visit · the brief field is labelled for assistive tech', Boolean(root.querySelector('label .sr-only')))

    check('first visit · nothing is marked complete yet', root.querySelectorAll('.lz-stage-done').length === 0)

    // Nothing has been described, so there is nothing to review and nothing to
    // complete: the first visit is the description field and an honest list of
    // what the five stages will hold.
    const confirmEarly = [...root.querySelectorAll('button')].find((b) => /mark stage complete/i.test(b.textContent ?? ''))
    check(
      'first visit · nothing is confirmable before a description',
      !confirmEarly || confirmEarly.disabled,
      confirmEarly ? 'control disabled' : 'no control',
    )
    check('first visit · the stages are described, not filled in', /what happens when you build/i.test(text))

    // Personas, flows, prototype, wiki and coverage are all derived from a
    // product. Offering them before one exists is offering empty pages.
    const navLabels = [...root.querySelectorAll('.lz-nav-item')].map((item) => (item.textContent ?? '').trim())
    check(
      'first visit · the pages that need a product are not offered',
      !navLabels.some((label) => /Personas|Prototype|Wiki|Coverage|Tech Stack|Token editor/i.test(label)),
      navLabels.join(', '),
    )
    check('first visit · the tools stay open', navLabels.some((label) => /Tools/i.test(label)), navLabels.join(', '))

    // Design, data shape and the rest are derived. Before a description they
    // must not show the archetype's own tokens as if they were this product's.
    w.location.hash = '#/design'
    await new Promise((resolve) => setTimeout(resolve, 160))
    const designText = (root.textContent ?? '').replace(/\s+/g, ' ')
    check(
      'first visit · Design shows no system until one is compiled',
      /Nothing here yet/i.test(designText) && !/tokens\.css|Draftline|#[0-9a-f]{6}/i.test(designText),
      designText.slice(0, 70),
    )
    w.location.hash = '#/'
    await new Promise((resolve) => setTimeout(resolve, 120))
  }

  if (Object.keys(scenario.storage).length === 0) {
    // Writing your own description is the point of the field: it must rebuild
    // the product, not decorate the starter.
    const area = root.querySelector('textarea') as HTMLTextAreaElement
    const setValue = Object.getOwnPropertyDescriptor(w.HTMLTextAreaElement.prototype, 'value')!.set!
    setValue.call(area, 'A tool for scheduling volunteer shifts at a food bank')
    area.dispatchEvent(new w.Event('input', { bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 200))

    const readBack = root.querySelector('.lz-compose-read')?.textContent ?? ''
    check('the composer reads the description back before compiling', /peopleops/i.test(readBack) && /volunteer shifts/i.test(readBack), readBack.slice(0, 80))

    const build = [...root.querySelectorAll('button')].find((b) => /build from this/i.test(b.textContent ?? ''))
    check('a rewritten description can be rebuilt', Boolean(build) && !build!.disabled)
    ;(build as HTMLElement | undefined)?.click()
    await new Promise((resolve) => setTimeout(resolve, 600))

    const rebuilt = (root.textContent ?? '').replace(/\s+/g, ' ').trim()
    const saved = JSON.parse(w.localStorage.getItem('prodops.projects.v1') ?? '[]')[0]
    check('the description is stored verbatim', saved?.idea === 'A tool for scheduling volunteer shifts at a food bank', saved?.idea)
    check('and it decided the product', saved?.archetypeId === 'peopleops', saved?.archetypeId)
    check('the name follows the description', /^Shift /.test(saved?.name ?? ''), saved?.name)
    check('the rebuild clears the ticks it had earned', saved?.progress?.confirmed?.length === 0)
    check(
      'the Product page shows the rebuilt product',
      rebuilt.includes(saved?.name ?? '\u0000') && rebuilt.includes(saved?.archetypeLabel ?? '\u0000'),
      `${saved?.name} / ${saved?.archetypeLabel}`,
    )

    // Now that there is a product, the stage control exists — and behaves.
    /* The scope is the builder's to change: a section the compiler kept can be
       taken out, and the product recompiles without it. */
    const remove = [...root.querySelectorAll('.lz-scope-remove')][0] as HTMLButtonElement | undefined
    const before = saved?.sections?.length ?? 0
    check('a compiled section can be removed from the scope', Boolean(remove), remove?.textContent?.trim())
    remove?.click()
    await new Promise((resolve) => setTimeout(resolve, 400))
    const afterRemove = JSON.parse(w.localStorage.getItem('prodops.projects.v1') ?? '[]')[0]
    check(
      'removing a section recompiles the product without it',
      (afterRemove?.sections?.length ?? 0) === before - 1 && (afterRemove?.scope ?? []).some((d: { included: boolean }) => !d.included),
      `${before} → ${afterRemove?.sections?.length} sections`,
    )

    const confirm = [...root.querySelectorAll('button')].find((b) => /mark stage complete/i.test(b.textContent ?? ''))
    check('a described product can be completed', Boolean(confirm) && !confirm!.disabled)
    ;(confirm as HTMLElement | undefined)?.click()
    await new Promise((resolve) => setTimeout(resolve, 250))
    const done = root.querySelector('.lz-stage-done')
    check('confirming a stage marks it complete', Boolean(done), done?.textContent?.replace(/\s+/g, ' ').slice(0, 48))
    check('the completed stage points at the next one', /Next:\s*Data Shape/.test(done?.textContent ?? ''))

    const reopened = [...root.querySelectorAll('button')].find((b) => /reopen/i.test(b.textContent ?? ''))
    check('a completed stage can be reopened', Boolean(reopened))
    ;(reopened as HTMLElement | undefined)?.click()
    await new Promise((resolve) => setTimeout(resolve, 250))
    check('reopening clears the completion', root.querySelectorAll('.lz-stage-done').length === 0)
  }

  w.close()
}

await rm(OUT, { recursive: true, force: true })

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log(`\nthe production bundle mounts in all ${scenarios.length} storage scenarios, with no errors`)
