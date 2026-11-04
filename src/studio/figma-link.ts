/** Parse selected Figma frame links without accepting arbitrary network hosts. */
export interface FigmaLink { fileKey: string; nodeId: string; source: string }
/** Accept only a link to a particular Figma design node. Strip other query parameters. */
export function parseFigmaLink(input: string): FigmaLink | null {
  try {
    const url = new URL(input.trim())
    if (url.protocol !== 'https:' || !['figma.com', 'www.figma.com'].includes(url.hostname) || url.username || url.password || url.port) return null
    const match = /^\/(?:design|file)\/([a-zA-Z0-9]{1,128})(?:\/[^/]*)?\/?$/.exec(url.pathname)
    const rawId = url.searchParams.get('node-id') || ''
    if (!match || !/^\d+[:-]\d+$/.test(rawId)) return null
    const nodeId = rawId.replace('-', ':')
    return { fileKey: match[1], nodeId, source: `https://www.figma.com/design/${match[1]}/file?node-id=${nodeId.replace(':', '-')}` }
  } catch { return null }
}
export function findFigmaLink(text: string): string | null {
  return text.match(/https:\/\/(?:www\.)?figma\.com\/(?:design|file)\/[^\s<>"']+/i)?.[0]?.replace(/[),.;]+$/, '') ?? null
}
