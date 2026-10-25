/**
 * Serves the real site, and the workspace beside it.
 *
 * `site/` is an HTTrack clone of the captured site that was pushed to `main`:
 * 155 files, server-rendered HTML, so every page has its content in the markup
 * and does not need a client, a websocket or a backend to display.
 *
 *   /                 the cloned site, page for page
 *   /workspace        ProdOps — the workspace the tools actually run in
 *
 * Two things are fixed at serve time rather than by editing 155 files:
 *
 *   1. Absolute links to the original host become local paths, so
 *      the copy is genuinely offline instead of bouncing the visitor online.
 *   2. Every page gets one small pill pointing at the workspace. The clone's
 *      tool pages are behind an email gate; this copy is not, so the pill is how
 *      a page leads to the working tool.
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { adaptPage, blockedPage, isBlocked } from './lib/clone'

const ROOT = process.cwd()
const SITE = join(ROOT, 'site')
const APP = join(ROOT, 'dist')
const PORT = Number(process.env.PORT ?? 5173)

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

async function sendText(response: import('node:http').ServerResponse, body: string, type: string) {
  response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store', 'access-control-allow-origin': '*' })
  response.end(body)
}

async function sendFile(response: import('node:http').ServerResponse, path: string) {
  const body = await readFile(path)
  response.writeHead(200, {
    'content-type': TYPES[extname(path)] ?? 'application/octet-stream',
    'cache-control': extname(path) === '.html' ? 'no-store' : 'no-cache',
    'access-control-allow-origin': '*',
  })
  response.end(body)
}

const inside = (parent: string, child: string) => child === parent || child.startsWith(parent + sep)

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  let path = decodeURIComponent(url.pathname)

  // The workspace: the compiled app, with hash routing inside it.
  if (path === '/workspace' || path.startsWith('/workspace/')) {
    const rest = path.slice('/workspace'.length) || '/'
    const candidate = normalize(join(APP, rest))
    if (inside(APP, candidate)) {
      try {
        const info = await stat(candidate)
        if (info.isFile()) return sendFile(response, candidate)
      } catch {
        /* fall through to the SPA entry point */
      }
    }
    try {
      return sendText(response, await readFile(join(APP, 'index.html'), 'utf8'), TYPES['.html'])
    } catch {
      return sendText(response, 'No workspace build yet — run `npm run build`.', TYPES['.txt'])
    }
  }

  // The cloned site. A directory means its index.html.
  const clean = path.endsWith('/') ? `${path}index.html` : path
  for (const candidatePath of [clean, `${clean}.html`, `${clean}/index.html`]) {
    const candidate = normalize(join(SITE, candidatePath))
    if (!inside(SITE, candidate)) continue
    try {
      const info = await stat(candidate)
      if (!info.isFile()) continue
      if (candidate.endsWith('.html')) {
        const markup = await readFile(candidate, 'utf8')
        if (isBlocked(markup)) return sendText(response, blockedPage(path), TYPES['.html'])
        return sendText(response, adaptPage(markup, path), TYPES['.html'])
      }
      return sendFile(response, candidate)
    } catch {
      /* try the next form */
    }
  }

  // Everything else is the workspace's own standalone builds.
  for (const candidatePath of [clean, `${clean}.html`]) {
    const candidate = normalize(join(APP, candidatePath))
    if (!inside(APP, candidate)) continue
    try {
      const info = await stat(candidate)
      if (info.isFile()) return sendFile(response, candidate)
    } catch {
      /* keep going */
    }
  }

  response.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
  response.end(
    `<!doctype html><meta charset="utf-8"><title>Not found</title>
     <div style="font:14px/1.6 system-ui;padding:40px">
       <p><strong>${path}</strong> is not in the cloned site.</p>
       <p><a href="/">Home</a> · <a href="/workspace/">Workspace</a></p>
     </div>`,
  )
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`site/ at http://0.0.0.0:${PORT}/ · workspace at /workspace/ · no websocket, no backend`)
})
