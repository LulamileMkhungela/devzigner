/** Optional Figma frame import controls for the current process step. */
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { addFigmaReference, fetchFigmaReference } from './figma'
import type { Role, StudioProject } from './model'
export function FigmaReference({ project, setProject, role, step, token, onVerified }: { project: StudioProject; setProject: Dispatch<SetStateAction<StudioProject>>; role: Role; step: string; token?:string; onVerified:(token:string)=>void }) {
  const [url, setUrl] = useState(''); const [configured, setConfigured] = useState<boolean | null>(null); const [busy, setBusy] = useState(false); const [status, setStatus] = useState('')
  useEffect(() => { fetch('/api/figma-reference').then(r=>r.json()).then(data=>setConfigured(data.configured === true)).catch(()=>setConfigured(false)) }, [])
  async function read() {
    setBusy(true); setStatus('')
    try { const item = await fetchFigmaReference(url, role, step, token); if (token) onVerified(token); addFigmaReference(project, item); setProject(p => { try { return addFigmaReference(p, item) } catch { return p } }); setStatus(item.text.includes('[Some frame details were truncated') ? 'Frame imported, but some details were truncated. Choose a smaller frame if needed.' : 'Frame imported. The AI can use its layout and styles. Import again to refresh.') }
    catch(e) { setStatus(e instanceof Error ? e.message : 'Could not read the frame.') } finally { setBusy(false) }
  }
  return <div className="figma-reference"><div className="integration-row"><b>Figma frame</b><span>{token ? 'Key added' : configured === null ? 'Checking…' : configured ? 'Configured' : 'Not connected'}</span></div><p>Paste a link to a selected frame. Its layout and styles are imported read-only; a screenshot is not fetched.</p><label htmlFor="figma-link">Frame link</label><input id="figma-link" type="url" placeholder="https://www.figma.com/design/…?node-id=…" value={url} onChange={e=>setUrl(e.target.value)}/><button className="button outline small" onClick={()=>void read()} disabled={busy}>{busy ? 'Reading…' : 'Import or refresh frame'}</button>{configured === false && !token && <p>Add your read-only token in Connect Claude &amp; Figma above.</p>}{status && <p role="status">{status}</p>}</div>
}
