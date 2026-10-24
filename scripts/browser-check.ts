/**
 * Does the *production bundle* actually mount in a DOM?
 *
 * `npm run smoke` mounts the source in jsdom through tsx, which never exercises
 * the bundle the browser receives: module graph, minification, dynamic imports,
 * `process.env` replacement, StrictMode double-rendering. A build can pass every
 * other gate and still ship a blank page. This builds the app the way `vite
 * build` does, evaluates it as one classic script in jsdom, and fails if
 * `#root` is still empty or anything logged an error.
 */
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { JSDOM } from 'jsdom'
import { readFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

const OUT = 'node_modules/.browser-check'

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

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/',
  pretendToBeVisual: true,
  runScripts: 'outside-only',
})
const w = dom.window as unknown as Window & typeof globalThis

const problems: string[] = []
w.addEventListener('error', (event) => problems.push(`window error: ${(event as ErrorEvent).message}`))
w.addEventListener('unhandledrejection', (event) =>
  problems.push(`unhandled rejection: ${String((event as PromiseRejectionEvent).reason)}`),
)

const origError = console.error
console.error = (...args: unknown[]) => {
  const line = args.map(String).join(' ')
  if (!/not wrapped in act/i.test(line)) problems.push(`console.error: ${line}`)
  origError(...args)
}

try {
  w.eval(code)
} catch (error) {
  problems.push(`threw on evaluate: ${(error as Error).message}`)
}

await new Promise((resolve) => setTimeout(resolve, 1500))
console.error = origError

const root = w.document.getElementById('root')!
const text = (root.textContent ?? '').replace(/\s+/g, ' ').trim()
const nodes = root.querySelectorAll('*').length

const checks: [string, boolean][] = [
  ['bundle evaluates without throwing', !problems.some((p) => p.startsWith('threw'))],
  ['#root has DOM nodes', nodes > 20],
  ['#root has visible text', text.length > 200],
  ['the shell rendered its nav', /Design OS|Data Shape|Sections/i.test(text)],
  ['no console errors', problems.length === 0],
]

for (const [label, ok] of checks) console.log(`${ok ? 'ok  ' : 'ERR '} ${label}`)
if (text) console.log(`\nroot text (${text.length} chars): ${text.slice(0, 220)}…`)
for (const problem of problems) console.log(`  - ${problem}`)

await rm(OUT, { recursive: true, force: true })

const failures = checks.filter(([, ok]) => !ok).length
if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nthe production bundle mounts: #root filled, no errors')
