/**
 * Runs the handoff prompt for real.
 *
 * Compiles a product, takes its exported package, and follows the one-shot
 * instructions: wire the tokens, mount the shell, drop in every section
 * component, feed it the sample data — then build the result with Vite and
 * Tailwind. If the export were hollow, this build would fail.
 *
 * The example app is written to node_modules/.example-app so it is never
 * committed, and is deleted again unless --keep is passed.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileProject, type ArchetypeId } from '../src/engine'
import { buildPackage } from '../src/export/package'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'node_modules', '.example-app')
const keep = process.argv.includes('--keep')
const archetype = (process.argv.find((a) => a.startsWith('--archetype='))?.split('=')[1] ?? 'clinic') as ArchetypeId

const project = compileProject({ archetypeId: archetype, seed: 4242, overrides: { primaryHue: 28, radius: 6 } })
const files = buildPackage(project)
const byPath = new Map(files.map((f) => [f.path, f.content]))

function write(path: string, content: string) {
  const target = join(out, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
}

function componentName(sectionName: string, screenName: string) {
  const pascal = (value: string) =>
    value.replace(/[^a-zA-Z0-9]+/g, ' ').split(' ').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('')
  const a = pascal(sectionName)
  const b = pascal(screenName)
  return b.startsWith(a) ? b : `${a}${b}`
}

rmSync(out, { recursive: true, force: true })

/* ---- 1. copy what the instructions say to copy -------------------------- */

for (const [path, content] of byPath) {
  if (!/^(design-system\/tokens\.css|shell\/components\/|sections\/|data-shapes\/overview\.ts)/.test(path)) continue
  if (!/\.(tsx?|css|json)$/.test(path)) continue
  write(`src/product-plan/${path}`, content)
}

/* ---- 2. tokens + fonts --------------------------------------------------- */

write('src/index.css', `@import "tailwindcss";\n@import "./product-plan/design-system/tokens.css";\n\ntable { border-collapse: collapse; }\n`)

/* ---- 3. one screen module per section ------------------------------------ */

for (const section of project.sections) {
  const imports = section.screens
    .map((screen) => `import { ${componentName(section.name, screen.name)} } from '../product-plan/sections/${section.id}/components'`)
    .join('\n')
  const dataKeys = section.entityIds.map((id) => id)
  const components = section.screens
    .map((screen) => {
      const key = dataKeys[0] ?? 'rows'
      return `      <section key="${screen.id}" data-route="${screen.route}">
        <p className="mb-2 text-xs uppercase tracking-wide text-[var(--ink-faint)]">${screen.route}</p>
        <${componentName(section.name, screen.name)} rows={(sample.${key} ?? sample[Object.keys(sample)[0]] ?? []) as never} />
      </section>`
    })
    .join('\n')

  write(
    `src/sections/${section.id}.tsx`,
    `import sample from '../product-plan/sections/${section.id}/sample-data.json'\n${imports}\n\nexport function ${section.name.replace(/[^a-zA-Z0-9]/g, '')}Section() {\n  return (\n    <div className="flex flex-col gap-10">\n${components}\n    </div>\n  )\n}\n`,
  )
}

/* ---- 4. shell + app ------------------------------------------------------ */

write(
  'src/App.tsx',
  `import { useState } from 'react'
import { AppShell } from './product-plan/shell/components'
${project.sections.map((s) => `import { ${s.name.replace(/[^a-zA-Z0-9]/g, '')}Section } from './sections/${s.id}'`).join('\n')}

const PAGES: { label: string; render: () => JSX.Element }[] = [
${project.sections
  .map((s) => `  { label: ${JSON.stringify(s.name)}, render: () => <${s.name.replace(/[^a-zA-Z0-9]/g, '')}Section /> },`)
  .join('\n')}
]

export default function App() {
  const [current, setCurrent] = useState(PAGES[0]?.label ?? '')
  const page = PAGES.find((p) => p.label === current) ?? PAGES[0]

  return (
    <AppShell
      current={current}
      user={{ name: 'Ops lead', email: 'ops@example.com' }}
      onNavigate={(label) => setCurrent(label)}
    >
      {page ? page.render() : null}
    </AppShell>
  )
}
`,
)

write(
  'src/main.tsx',
  `import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(<App />)
`,
)

write('index.html', `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>${project.name} — generated from the handoff</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n`)

write(
  'vite.config.ts',
  `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nimport tailwindcss from '@tailwindcss/vite'\n\nexport default defineConfig({\n  plugins: [react(), tailwindcss()],\n  build: { outDir: 'dist', emptyOutDir: true },\n})\n`,
)

write(
  'package.json',
  JSON.stringify(
    {
      name: `example-${project.id}`,
      private: true,
      type: 'module',
      scripts: { build: 'vite build --logLevel warn' },
    },
    null,
    2,
  ),
)

write(
  'README.md',
  `# ${project.name} — built from the handoff\n\nGenerated by \`npm run example-app\`.\n\nThis app was not written by hand: it follows \`prompts/one-shot-prompt.md\` from the exported package — tokens, shell, section components, sample data — and is then built with Vite + Tailwind to prove the package compiles and runs.\n`,
)

/* ---- 5. build it --------------------------------------------------------- */

const vite = join(root, 'node_modules', '.bin', 'vite')
let ok = true
try {
  execFileSync(vite, ['build', '--logLevel', 'warn'], { cwd: out, stdio: 'pipe', encoding: 'utf8' })
  console.log(`ok  ${project.name}: shell + ${project.sections.length} sections built with vite + tailwind`)
} catch (error) {
  ok = false
  const err = error as { stdout?: string; stderr?: string }
  console.log('ERR the generated app did not build')
  console.log(String(err.stdout ?? '') + String(err.stderr ?? ''))
}

if (ok) {
  console.log(
    keep
      ? `\nexample app built at ${out}`
      : `\nexample app built and cleaned up (pass --keep to inspect ${out})`,
  )
}
if (!keep && ok) rmSync(out, { recursive: true, force: true })
if (!ok) console.log('\nexample app failed')
process.exit(ok ? 0 : 1)
