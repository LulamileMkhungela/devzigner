/**
 * A static snapshot of every page, as one HTML file with no JavaScript.
 *
 * The live app needs a browser with modules and storage; a preview pane, a
 * mail client, a code review tool or a PDF printer may have neither. This
 * renders the real components to markup, inlines the real stylesheet and the
 * real fonts, and writes `public/prodops-snapshot.html`. What you see is
 * the app's own DOM, not a screenshot and not a mock-up.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { compileProject } from '../src/engine'
import { StoreProvider } from '../src/lib/store'
import { ProductPage } from '../src/views/ProductPage'
import { DataShapePage } from '../src/views/DataShapePage'
import { DesignPage } from '../src/views/DesignPage'
import { ShellDesignPage } from '../src/views/ShellDesignPage'
import { SectionsPage } from '../src/views/SectionsPage'
import { SectionPage } from '../src/views/SectionPage'
import { ScreenDesignPage } from '../src/views/ScreenDesignPage'
import { ExportPage } from '../src/views/ExportPage'
import { ToolsPage } from '../src/views/ToolsPage'
import { FlowsPage } from '../src/views/FlowsPage'
import { SystemPage } from '../src/views/SystemPage'
import { PrototypePage } from '../src/views/PrototypePage'
import { EditorPage } from '../src/views/EditorPage'
import { WikiPage } from '../src/views/WikiPage'
import { CoveragePage } from '../src/views/CoveragePage'

/* The views read storage and location; give them the smallest world that works. */
const store: Record<string, string> = {}
;(globalThis as any).localStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value
  },
  removeItem: (key: string) => {
    delete store[key]
  },
}
;(globalThis as any).location = { hash: '#/' }
;(globalThis as any).window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {},
  location: { hash: '#/' },
}
;(globalThis as any).document = {
  documentElement: { dataset: {} },
  body: { classList: { toggle: () => {}, remove: () => {} } },
  addEventListener: () => {},
  removeEventListener: () => {},
}
;(globalThis as any).confirm = () => false

const project = compileProject({ archetypeId: 'marketplace', seed: 112233, idea: 'a marketplace for township artisans' })
const section = project.sections[0]
const screen = section.screens[0]

const pages: [string, string, ReactNode][] = [
  ['product', 'Product', <ProductPage project={project} />],
  ['data-shape', 'Data shape', <DataShapePage project={project} />],
  ['design', 'Design system', <DesignPage project={project} />],
  ['shell', 'Shell', <ShellDesignPage project={project} fullscreen={false} />],
  ['sections', 'Sections', <SectionsPage project={project} />],
  ['section', `${section.name}`, <SectionPage project={project} section={section} />],
  ['screen-design', `${screen.name}`, <ScreenDesignPage project={project} section={section} screenId={screen.id} fullscreen={false} />],
  ['export', 'Export', <ExportPage project={project} />],
  ['tools', 'Tools', <ToolsPage project={project} />],
  ['flows', 'Flows', <FlowsPage project={project} />],
  ['system', 'System', <SystemPage project={project} />],
  ['prototype', 'Prototype', <PrototypePage project={project} />],
  ['editor', 'Token editor', <EditorPage project={project} />],
  ['wiki', 'Wiki', <WikiPage project={project} />],
  ['coverage', 'Coverage', <CoveragePage project={project} />],
]

/* The built stylesheet is the app's own; no second copy to drift. */
const assets = readdirSync('dist/assets')
const cssName = assets.find((name) => name.endsWith('.css'))
if (!cssName) {
  console.error('No stylesheet in dist/assets — run `npm run build` first.')
  process.exit(1)
}

let css = readFileSync(join('dist/assets', cssName), 'utf8')
for (const font of readdirSync('public/fonts')) {
  if (!font.endsWith('.woff2')) continue
  const data = readFileSync(join('public/fonts', font)).toString('base64')
  css = css.replaceAll(`/fonts/${font}`, `data:font/woff2;base64,${data}`)
}

const render = (node: ReactNode) => renderToString(<StoreProvider>{node}</StoreProvider>)

const nav = pages
  .map(([id, label]) => `<a href="#${id}" style="padding:6px 10px;border-radius:8px;border:1px solid #d6d3d1;background:#fff;color:#1c1917;text-decoration:none;font-size:13px">${label}</a>`)
  .join('')

const body = pages
  .map(
    ([id, label, node], index) => `<section id="${id}" style="margin:${index === 0 ? '0' : '40px'} 0 0;padding-top:${index === 0 ? '0' : '24px'};border-top:${index === 0 ? '0' : '1px dashed #d6d3d1'}">
  <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#a8a29e">${label}</p>
  ${render(node)}
</section>`,
  )
  .join('\n')

/** The masthead is the only branding in here: mark, name, who built it. */
const mark = readFileSync('public/prodops-mark.svg', 'utf8')
const markData = `data:image/svg+xml;base64,${Buffer.from(mark).toString('base64')}`

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ProdOps — static snapshot of every page</title>
    <style>${css}</style>
    <style>
      body { margin: 0; background: #fafaf9; color: #1c1917; font-family: 'DM Sans', system-ui, sans-serif; }
      .snapshot { max-width: 1080px; margin: 0 auto; padding: 28px 20px 80px; }
      .snapshot-brand { display: flex; align-items: center; gap: 12px; padding-bottom: 16px; }
      .snapshot-brand strong { display: block; font-size: 17px; letter-spacing: -.02em; }
      .snapshot-brand span { display: block; font-size: 12px; color: #78716c; }
      .snapshot-nav { position: sticky; top: 0; z-index: 5; display: flex; flex-wrap: wrap; gap: 6px;
        padding: 10px 0 14px; background: rgba(250,250,249,.94); backdrop-filter: blur(6px);
        border-bottom: 1px solid #e7e5e4; }
    </style>
  </head>
  <body>
    <div class="snapshot">
      <header class="snapshot-brand">
        <img src="${markData}" alt="" width="34" height="34" />
        <div>
          <strong>ProdOps</strong>
          <span>Every page, rendered as static markup. Developed by Lulamile Mkhungela.</span>
        </div>
      </header>
      <nav class="snapshot-nav">${nav}</nav>
      <p style="margin:14px 0 4px;font-size:12px;color:#78716c">
        A static render of the real components — no JavaScript, no server. The live app is at <code>/</code>.
      </p>
      ${body}
    </div>
  </body>
</html>
`

// No filesystem siblings in a snapshot: every mark reference travels inside it.
const withMark = html.replaceAll('/prodops-mark.svg', markData)

mkdirSync('public', { recursive: true })
writeFileSync('public/prodops-snapshot.html', withMark)
console.log(`public/prodops-snapshot.html — ${Math.round(Buffer.byteLength(html) / 1024)} KB, ${pages.length} pages, no JavaScript`)
