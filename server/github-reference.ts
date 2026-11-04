/** Read-only public GitHub file retrieval with origin and path checks. */
import type { IncomingMessage, ServerResponse } from 'node:http'
function reply(res: ServerResponse, status: number, body: object) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(body)) }
/** Optional read-only import of a single public GitHub file. No credentials or arbitrary URLs. */
export async function handleGithubReference(req: IncomingMessage, res: ServerResponse, fetcher: typeof fetch = fetch) {
  if (req.method !== 'POST') return reply(res, 405, { error: 'Method not supported.' })
  try { const origin = new URL(req.headers.origin || ''); if (!['http:', 'https:'].includes(origin.protocol) || origin.host !== req.headers.host) return reply(res, 403, { error: 'Request must come from this workspace.' }) } catch { return reply(res, 403, { error: 'Invalid origin.' }) }
  if (!req.headers['content-type']?.startsWith('application/json')) return reply(res, 415, { error: 'Expected JSON.' })
  let data: { repo?: unknown; ref?: unknown; path?: unknown }
  try { let raw = ''; for await (const chunk of req) { raw += chunk.toString(); if (raw.length > 4000) throw new Error() } data = JSON.parse(raw) } catch { return reply(res, 400, { error: 'Invalid request.' }) }
  if (!data || typeof data.repo !== 'string' || typeof data.ref !== 'string' || typeof data.path !== 'string') return reply(res, 400, { error: 'Provide the repository URL, branch and file path.' })
  let owner: string, repo: string
  try {
    const url = new URL(data.repo)
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash || !/^\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/.test(url.pathname)) throw new Error()
    ;[owner, repo] = url.pathname.split('/').filter(Boolean); repo = repo.replace(/\.git$/, '')
    if (!repo || owner === '.' || owner === '..' || repo === '.' || repo === '..') throw new Error()
  } catch { return reply(res, 400, { error: 'Enter a public repository URL like https://github.com/owner/project.' }) }
  const ref = data.ref.trim(), path = data.path.trim()
  if (!/^[a-zA-Z0-9_.\/-]{1,100}$/.test(ref) || !/^[a-zA-Z0-9_.\/-]{1,300}$/.test(path) || [ref, path].some(v => v.split('/').some(part => !part || part === '.' || part === '..'))) return reply(res, 400, { error: 'Enter a valid branch and file path.' })
  try {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`
    const response = await fetcher(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'ProdOps-reference-import' }, redirect: 'error', signal: AbortSignal.timeout(15000) })
    if (!response.ok) return reply(res, 502, { error: `GitHub could not provide that public file (${response.status}). Check the repository, branch and path.` })
    const result = await response.json() as { type?: string; encoding?: string; content?: string; size?: number }
    if (result.type !== 'file' || result.encoding !== 'base64' || typeof result.content !== 'string' || typeof result.size !== 'number' || result.size > 20000 || result.content.length > 30000) throw new Error()
    const bytes = Buffer.from(result.content.replace(/\s/g, ''), 'base64')
    if (bytes.length !== result.size || bytes.includes(0)) throw new Error()
    const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return reply(res, 200, { name: path.split('/').at(-1), content, source: `https://github.com/${owner}/${repo}/blob/${ref.split('/').map(encodeURIComponent).join('/')}/${path.split('/').map(encodeURIComponent).join('/')}` })
  } catch { return reply(res, 502, { error: 'Could not import that file. Use a public UTF-8 text file under 20 KB.' }) }
}
