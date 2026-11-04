/** Build isolated browser previews without exposing the host workspace. */
import type { FileItem } from './model'
/** Static, script-free preview only. External resources are blocked by CSP and sandbox. */
export function staticPreview(files: FileItem[], interactive = false, selectedHtml?: string): string | null {
  // A selected HTML file gets its own preview; CSS still comes from the same project area.
  const entry = (selectedHtml?.endsWith('.html') ? files.find(f => f.path === selectedHtml && (f.path.startsWith('solution/') || f.path.startsWith('design/components/'))) : undefined) ?? files.find(f => f.path === 'solution/index.html') ?? files.find(f => f.path === 'design/components/preview.html')
  if (!entry) return null
  const document = new DOMParser().parseFromString(entry.content, 'text/html')
  document.querySelectorAll('script,iframe,object,embed,base,link,meta[http-equiv]').forEach(el => el.remove())
  document.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      if (name.startsWith('on') || ['srcdoc','action','formaction','href','srcset'].includes(name) || (name === 'src' && !attr.value.startsWith('data:image/'))) el.removeAttribute(attr.name)
    }
  })
  const scriptFile = interactive && entry.path === 'solution/index.html' ? files.find(f => f.path === 'solution/app.js') : undefined
  const meta = document.createElement('meta'); meta.setAttribute('http-equiv','Content-Security-Policy'); meta.setAttribute('content', `default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'none'${scriptFile ? "; script-src 'unsafe-inline'" : ''}`); document.head.prepend(meta)
  const css = files.filter(f=>f.path.startsWith(entry.path.startsWith('solution/') ? 'solution/' : 'design/components/') && f.path.endsWith('.css')).map(f=>f.content).join('\n').slice(0,100000)
  if (css) { const style=document.createElement('style'); style.textContent=css.replace(/<\/style/gi,'<\\/style'); document.head.append(style) }
  if (scriptFile) { const script = document.createElement('script'); script.textContent = scriptFile.content.replace(/<\/script/gi, '<\\/script'); document.body.append(script) }
  return '<!doctype html>' + document.documentElement.outerHTML
}
