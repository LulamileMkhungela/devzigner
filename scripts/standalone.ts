/**
 * One self-contained HTML file with the whole workspace inside it.
 *
 * The live preview is the normal way to look at the app, but a dev server can
 * be unreachable (VPN, proxy, a sleeping sandbox). `npm run standalone` bundles
 * the app into a single file — script, styles and fonts inlined — that renders
 * from `file://` with no server at all. It writes `public/lula-devzign-standalone.html`,
 * which the dev server also serves at `/lula-devzign-standalone.html`.
 */
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const OUT = 'preview/.standalone'
const TARGET = 'public/lula-devzign-standalone.html'

await rm(OUT, { recursive: true, force: true })

await build({
  configFile: false,
  logLevel: 'warn',
  plugins: [react()],
  build: {
    outDir: OUT,
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
})

const html = await readFile(join(OUT, 'index.html'), 'utf8')
const assets = await readdir(join(OUT, 'assets'))
const jsName = assets.find((name) => name.endsWith('.js'))!
const cssName = assets.find((name) => name.endsWith('.css'))!

const script = await readFile(join(OUT, 'assets', jsName), 'utf8')
const style = await readFile(join(OUT, 'assets', cssName), 'utf8')

/** Fonts live in `public/fonts`; inline them so the file has no siblings. */
const fontFiles = await readdir('public/fonts')
let css = style
for (const name of fontFiles) {
  if (!name.endsWith('.woff2')) continue
  const bytes = await readFile(join('public/fonts', name))
  const data = `data:font/woff2;base64,${bytes.toString('base64')}`
  css = css.replaceAll(`/fonts/${name}`, data)
}

const favicon = await readFile('public/favicon.svg', 'utf8')
const faviconData = `data:image/svg+xml;base64,${Buffer.from(favicon).toString('base64')}`

// Function replacements: minified JS is full of `$&`, `$\`` and `$1`, which
// `String.replace` would expand as capture references and corrupt the bundle.
const out = html
  .replace(/<script type="module"[^>]*src="[^"]*"[^>]*><\/script>/, '')
  .replace(/<link rel="stylesheet"[^>]*>/, '')
  .replace('</head>', () => `<style>${css}</style>\n  </head>`)
  .replace('</body>', () => `<script type="module">${script.replaceAll('</script', '<\\/script')}</script>\n  </body>`)
  .replace('href="/favicon.svg"', () => `href="${faviconData}"`)
  .replace('src="/favicon.svg"', () => `src="${faviconData}"`)

await mkdir('public', { recursive: true })
await writeFile(TARGET, out)
await rm(OUT, { recursive: true, force: true })

const kb = Math.round(Buffer.byteLength(out) / 1024)
console.log(`${TARGET} — ${kb} KB, no server needed`)
