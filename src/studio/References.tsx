/** Reference uploads are stored locally and attributed to a role and step. */
import { useState } from 'react'
import { FileImage, FileText, Upload, X } from 'lucide-react'
import type { Reference, Role, StudioProject } from './model'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { readPdfText } from './pdf-text'
import { GithubReference } from './GithubReference'
import { FigmaReference } from './FigmaReference'

async function encode(file: File) { const bytes = new Uint8Array(await file.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(binary) }
async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise
  return readPdfText(pdf)
}
export function References({ project, setProject, role, step, figmaToken, onFigmaVerified }: { project: StudioProject; setProject: React.Dispatch<React.SetStateAction<StudioProject>>; role: Role; step: string; figmaToken?: string; onFigmaVerified:(token:string)=>void }) {
  const [status, setStatus] = useState('')
  const refs = project.references.filter(r => r.role === role && r.step === step)
  async function add(files: File[]) {
    setStatus('')
    const current = [...project.references]; let error = ''
    for (const file of files) {
      const textFile = /\.(md|txt|json|ts|tsx|js|jsx|css|scss|sass|less|html|sql|yml|yaml)$/i.test(file.name)
      if (!textFile && !['application/pdf','image/png','image/jpeg','image/webp'].includes(file.type)) { error = 'Some files were skipped: choose text, PDF, PNG, JPEG or WebP.'; continue }
      if (textFile && file.size > 20000) { error = 'Some text files were skipped: each must be under 20 KB.'; continue }
      if (file.size > 2000000 || current.length >= 12 || current.reduce((n,r) => n+r.data.length,0) + Math.ceil(file.size / 3)*4 > 3400000) { error = 'Some files were skipped: use up to 12 references, 2 MB each and 2.5 MB total.'; continue }
      if (file.type.startsWith('image/') && current.filter(r=>r.role===role && r.step===step && r.mime.startsWith('image/')).length >= 4) { error = 'A step can include up to four images.'; continue }
      try {
        const [data, text] = await Promise.all([encode(file), file.type === 'application/pdf' ? extractPdf(file) : textFile ? file.text() : Promise.resolve('')])
        current.push({ id:crypto.randomUUID(), name:file.name.replace(/[\\/]/g, '-').slice(0,120), mime:textFile ? 'text/plain' : file.type as Reference['mime'], data, text, role, step })
        if (file.type === 'application/pdf' && !text) error = 'A PDF has no extractable text. For scanned pages, add an image instead.'
      } catch { error = 'Some files could not be read. Check that PDFs are not encrypted.' }
    }
    const added = current.slice(project.references.length)
    if (added.length) setProject(p => {
      const refs = [...p.references]
      for (const item of added) {
        if (refs.length >= 12 || refs.reduce((n,r)=>n+r.data.length,0) + item.data.length > 3400000) break
        if (item.mime.startsWith('image/') && refs.filter(r=>r.role===role && r.step===step && r.mime.startsWith('image/')).length >= 4) continue
        refs.push(item)
      }
      return { ...p, references:refs, businessApproved:role==='business' ? false : p.businessApproved, designStale:role==='business' ? true : p.designStale, developmentStale:role==='business' || role==='design' ? true : p.developmentStale }
    })
    setStatus(error || (added.length ? `${added.length} reference${added.length===1?'':'s'} added to this process.` : 'No references were added.'))
  }
  return <div className="references-box"><div className="references-head"><div><b>Reference materials</b><p>Attach visuals, documents or code for this process.</p></div><label className="reference-upload"><Upload size={14}/> Add<input type="file" multiple accept=".pdf,image/png,image/jpeg,image/webp,.md,.txt,.json,.ts,.tsx,.js,.jsx,.html,.css,.scss,.sass,.less,.sql,.yml,.yaml" onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) void add(files); e.target.value = '' }}/></label></div>{refs.map(r => <div className="reference-item" key={r.id}>{r.mime.startsWith('image/') ? <FileImage size={15}/> : <FileText size={15}/>}<span title={r.source || undefined}>{r.name}<small>{r.mime === 'application/pdf' ? 'PDF text' : r.mime === 'text/plain' ? 'Text file' : 'Image'}</small></span><button aria-label={`Remove ${r.name}`} onClick={() => setProject(p => ({ ...p, references: p.references.filter(x => x.id !== r.id), businessApproved: role === 'business' ? false : p.businessApproved, designStale: role === 'business' ? true : p.designStale, developmentStale: role === 'business' || role === 'design' ? true : p.developmentStale }))}><X size={14}/></button></div>)}<p className="reference-hint">Up to 12 files, 2 MB each and 2.5 MB total; text and component files up to 20 KB each. Up to 4 images per step. Text and PDF references are shared with the AI across the project. This step’s images also go to the provider and require a vision-capable model. Scanned PDFs need an image instead.</p>{status && <p role="status" className="reference-status">{status}</p>}<FigmaReference key={`figma-${role}/${step}`} project={project} setProject={setProject} role={role} step={step} token={figmaToken} onVerified={onFigmaVerified}/><GithubReference key={`${role}/${step}`} project={project} setProject={setProject} role={role} step={step}/></div>
}
