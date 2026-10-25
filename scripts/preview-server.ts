/**
 * Serves the production build on 0.0.0.0 so the sandbox preview has something
 * static to look at.
 *
 * The dev server is the better tool for editing, but it needs a websocket for
 * HMR and a proxy that forwards it. When a preview pane is blank behind a
 * proxy, the usual cause is that socket, not the app. This server has no
 * socket, no module graph and no transform step: it hands the browser the same
 * files `vite build` produced, with `index.html` as the fallback so hash routes
 * and deep links both work.
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const ROOT = join(process.cwd(), 'dist')
const PORT = Number(process.env.PORT ?? 5173)

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

async function send(response: import('node:http').ServerResponse, path: string) {
  const body = await readFile(path)
  response.writeHead(200, {
    'content-type': TYPES[extname(path)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  })
  response.end(body)
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  const requested = decodeURIComponent(url.pathname)

  // Everything is inside dist/; `normalize` plus the prefix test stops `..`.
  const candidate = normalize(join(ROOT, requested))
  if (!candidate.startsWith(ROOT)) {
    response.writeHead(403).end('forbidden')
    return
  }

  try {
    const info = await stat(candidate)
    if (info.isFile()) {
      await send(response, candidate)
      return
    }
  } catch {
    /* fall through to the SPA entry point */
  }

  try {
    await send(response, join(ROOT, 'index.html'))
  } catch {
    response.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('No build yet — run `npm run build` first.\n')
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`serving dist/ on http://0.0.0.0:${PORT} — no dev server, no websocket`)
})
