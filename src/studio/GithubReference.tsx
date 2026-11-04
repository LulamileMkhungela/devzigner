/** Optional import controls for a single public GitHub text file. */
import { useState, type Dispatch, type SetStateAction } from 'react'
import type { Role, StudioProject } from './model'

export function GithubReference({ project, setProject, role, step }: { project: StudioProject; setProject: Dispatch<SetStateAction<StudioProject>>; role: Role; step: string }) {
  const [repo, setRepo] = useState(''); const [branch, setBranch] = useState('main'); const [path, setPath] = useState('README.md'); const [status, setStatus] = useState(''); const [busy, setBusy] = useState(false)
  async function importFile() {
    if (project.references.length >= 12) { setStatus('The project already has twelve references. Remove one first.'); return }
    setBusy(true); setStatus('')
    try {
      const response = await fetch('/api/github-reference', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repo, ref: branch, path }) })
      const result = await response.json() as { name?: string; content?: string; source?: string; error?: string }
      if (!response.ok || typeof result.name !== 'string' || typeof result.content !== 'string' || typeof result.source !== 'string') throw new Error(result.error || 'Could not import this file.')
      const bytes = new TextEncoder().encode(result.content); let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192)); const data = btoa(binary)
      if (project.references.reduce((n, r) => n + r.data.length, 0) + data.length > 3400000) throw new Error('The project reference storage limit was reached.')
      const item = { id: crypto.randomUUID(), name: result.name.replace(/[\\/]/g, '-').slice(0, 120), mime: 'text/plain' as const, data, text: result.content.slice(0, 20000), source: result.source, role, step }
      setProject(p => ({ ...p, references: [...p.references, item], businessApproved: role === 'business' ? false : p.businessApproved, designStale: role === 'business' ? true : p.designStale, developmentStale: role === 'business' || role === 'design' ? true : p.developmentStale }))
      setStatus('Public file imported as a reference. It will not sync automatically.')
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not import the file.') } finally { setBusy(false) }
  }
  return <details className="github-import"><summary>Optional: import a public GitHub file</summary><p>Read one public text file from an existing project. GitHub receives this request; no token is needed. Nothing is changed in the repository.</p><label>Repository URL<input type="url" placeholder="https://github.com/owner/project" value={repo} onChange={e => setRepo(e.target.value)}/></label><label>Branch or tag<input value={branch} onChange={e => setBranch(e.target.value)}/></label><label>File path<input value={path} onChange={e => setPath(e.target.value)}/></label><button className="button outline small" onClick={() => void importFile()} disabled={busy}>{busy ? 'Importing…' : 'Import file'}</button>{status && <p role="status">{status}</p>}</details>
}
