import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { handleStudio, studioConfig } from './studio'
import { handleGithubReference } from './github-reference'
import { figmaConfig, handleFigmaReference } from './figma-reference'

const types: Record<string,string> = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml',
  '.woff2':'font/woff2', '.woff':'font/woff', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.ico':'image/x-icon',
}

/** Serve only the built workspace and its API. The captured marketing site is not served. */
export function createWorkspaceServer(distDirectory = resolve(process.cwd(), 'dist'), env: NodeJS.ProcessEnv = process.env) {
  const root = resolve(distDirectory)
  async function sendFile(req: IncomingMessage, res: ServerResponse, filename: string) {
    try {
      const file = resolve(root, filename)
      if (file !== root && !file.startsWith(root + sep)) return false
      if (!(await stat(file)).isFile()) return false
      const body = await readFile(file)
      res.writeHead(200, { 'content-type':types[extname(file)] ?? 'application/octet-stream', 'cache-control':extname(file) === '.html' ? 'no-store' : 'no-cache', 'x-content-type-options':'nosniff' })
      res.end(req.method === 'HEAD' ? undefined : body)
      return true
    } catch { return false }
  }
  return createServer(async (req, res) => {
    let path: string
    try { path = decodeURIComponent(new URL(req.url ?? '/', 'http://workspace.local').pathname) }
    catch { res.writeHead(400, {'content-type':'text/plain; charset=utf-8'}); return res.end('Invalid request.') }

    if (path === '/api/figma-reference') return void handleFigmaReference(req, res, figmaConfig(env))
    if (path === '/api/github-reference') return void handleGithubReference(req, res)
    if (path === '/api/studio') return void handleStudio(req, res, studioConfig(env))
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, {allow:'GET, HEAD'}); return res.end() }

    // Keep the old workspace URL working so existing bookmarks and local projects remain accessible.
    if (path === '/' || path === '/index.html' || path === '/workspace' || path === '/workspace/') {
      if (await sendFile(req, res, 'index.html')) return
      res.writeHead(503, {'content-type':'text/plain; charset=utf-8'}); return res.end('Workspace build not found. Run npm run build first.')
    }

    // Vite's built assets are rooted at /assets, /fonts, and the public asset paths.
    // Never serve other HTML pages or anything from the old site directory.
    const filePath = path.startsWith('/workspace/') ? path.slice('/workspace/'.length) : path.slice(1)
    if (filePath && !/^site(?:\/|$)/i.test(filePath) && !filePath.split('/').includes('..') && !filePath.toLowerCase().endsWith('.html') && await sendFile(req, res, filePath)) return
    res.writeHead(404, {'content-type':'text/plain; charset=utf-8'}); res.end('Not found.')
  })
}
