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
import react from '@vitejs/plugin-react'
import { JSDOM } from 'jsdom'
import { readFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

const OUT = 'node_modules/.browser-check'
const STORAGE_KEY = 'lula.devzign.projects.v1'

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
  check(`${scenario.name} · no console errors`, problems.length === 0, problems.slice(0, 2).join(' | '))

  w.close()
}

await rm(OUT, { recursive: true, force: true })

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log(`\nthe production bundle mounts in all ${scenarios.length} storage scenarios, with no errors`)
