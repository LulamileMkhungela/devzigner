/** Role-based workspace orchestration: project history, handoffs, editing, preview and export. */
import { useCallback, useEffect, useRef, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import JSZip from 'jszip'
import { ArrowDownToLine, ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Code2, FileCode2, FileText, Folder, LayoutGrid, LoaderCircle, LockKeyhole, Menu, PenTool, Plus, Sparkles, Upload, Users, X, Trash2 } from 'lucide-react'
import { applyGenerated, contextFor, isSafeFile, readProject, reconcileStepChanges, roleOf, updateFile, type FileItem, type Role, type StepStatus, type StudioProject } from './model'
import { skillFiles, commandFiles } from './skills'
import { workflows, specPrefix } from './workflows'
import { References } from './References'
import { DesignEditor } from './DesignEditor'
import { addFigmaReference, fetchFigmaReference } from './figma'
import { findFigmaLink, parseFigmaLink } from './figma-link'
import { staticPreview } from './static-preview'
import { briefTemplate, roleTemplates } from './templates'
import { Connections, type ClaudeConnection, type FigmaConnection } from './Connections'
import { HISTORY_KEY, LEGACY_KEY, freshProject, loadHistory, makeEntry } from './history'

const roles: { id: Role; label: string; detail: string; icon: typeof Users; number: string }[] = [
  { id: 'business', label: 'Business analysis', detail: 'Shape the requirements', icon: Users, number: '01' },
  { id: 'design', label: 'Design', detail: 'Create the experience', icon: PenTool, number: '02' },
  { id: 'development', label: 'Development', detail: 'Plan and build', icon: Code2, number: '03' },
  { id: 'quality', label: 'Quality assurance', detail: 'Verify the experience', icon: CheckCircle2, number: '04' },
  { id: 'delivery', label: 'Delivery & operations', detail: 'Release and improve', icon: LayoutGrid, number: '05' },
]
const descriptions: Record<Role, { title: string; description: string; skill: string; next: string }> = {
  business: { title: 'Start with the big picture.', description: 'Paste your brief or requirements. We’ll help turn your ideas into a clear plan your whole team can build from.', skill: 'PRD creator', next: 'Generate business plan' },
  design: { title: 'Bring the experience to life.', description: 'Create a consistent design direction, user flows, and reusable interface components using the context available.', skill: 'Design system + frontend design', next: 'Generate design files' },
  development: { title: 'Turn the plan into a product.', description: 'Build from the business and design work. Generate a starter and implementation plan, or take the skills to your own IDE.', skill: 'Repository + design system', next: 'Generate development files' },
  quality: { title: 'Build confidence in every release.', description: 'Plan quality, accessibility and regression checks around your team’s shared requirements.', skill: 'Quality engineering', next: 'Generate quality files' },
  delivery: { title: 'Make the launch count.', description: 'Plan delivery, release, operations and the outcomes that matter.', skill: 'Delivery & operations', next: 'Generate delivery files' },
}
function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
function safeSlug(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product' }
function saveZip(zip: JSZip, name: string) { return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }).then(blob => download(blob, name)) }
function prdHtml(markdown: string): string {
  const escaped = markdown.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const blocks = escaped.split('\n').map(line => {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) return `<h${heading[1].length}>${heading[2]}</h${heading[1].length}>`
    if (/^[-*]\s/.test(line)) return `<p class="bullet">• ${line.slice(2)}</p>`
    return line ? `<p>${line}</p>` : ''
  }).join('\n')
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Product requirements</title><style>body{font:16px/1.7 system-ui;color:#263b32;max-width:800px;margin:3rem auto;padding:0 1.5rem}h1,h2,h3{line-height:1.2;margin-top:2rem}p{white-space:pre-wrap}.bullet{padding-left:1rem}</style><main>${blocks}</main></html>`
}
function projectZip(project: StudioProject, mode: 'all' | 'skills' | 'code') {
  const zip = new JSZip()
  if (mode !== 'code') { for (const [path, content] of Object.entries(skillFiles)) zip.file(path, content); for (const [path, content] of Object.entries(commandFiles)) zip.file(path, content) }
  if (mode === 'all') {
    zip.file('.prodops/project.json', JSON.stringify(project, null, 2))
    zip.file('business/original-spec.md', project.spec)
    for (const r of roles) { const notes = project.answers[`context/${r.id}`]; if (notes?.trim()) zip.file(`handoff/${r.id}-context.md`, `# ${r.label} context\n\n${notes}\n`) }
    for (const file of project.files) { zip.file(file.path, file.content); if (file.path.startsWith('specs/') && file.path.endsWith('/shape.md')) zip.file(file.path.replace(/shape\.md$/, 'shape.html'), prdHtml(file.content)) }
    for (const [key, decision] of Object.entries(project.stepDecisions)) { const [r, step] = key.split('/'); const path = `specs/${r}/${step}/review.md`; if (!project.files.some(f => f.path === path)) zip.file(path, `# Review decision\n\nStatus: ${decision.status}\n\n${decision.note || 'No note added.'}\n`) }
    for (const ref of project.references) zip.file(`${specPrefix(ref.role, ref.step)}${ref.mime.startsWith('image/') ? 'visuals' : 'references'}/${ref.id}-${ref.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`, ref.data, { base64: true })
    const prd = project.files.find(f => f.path.toLowerCase() === 'business/prd.md')
    if (prd && !project.files.some(f => f.path.toLowerCase() === 'business/prd.html')) zip.file('business/PRD.html', prdHtml(prd.content))
    zip.file('README.md', `# ${project.name}\n\nStart with business/original-spec.md and the reviewed business files. Design and development files may be drafts; review and test all generated code. The .agents/skills folder contains skill instructions and references for your coding agent. Import this ZIP into ProdOps to continue editing.\n`)
  }
  if (mode === 'code') {
    for (const file of project.files.filter(f => f.path.startsWith('solution/'))) zip.file(file.path.slice('solution/'.length), file.content)
  }
  return zip
}
const fileIcon = (path: string) => path.endsWith('.md') ? <FileText size={15}/> : <FileCode2 size={15}/>
function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) { return <span className={`studio-tag ${tone}`}>{children}</span> }
export function Studio() {
  const [historyLoadError] = useState(() => { try { loadHistory(localStorage); return false } catch { return true } })
  const [history, setHistory] = useState(() => { try { return loadHistory(localStorage) } catch { const entry = makeEntry(); return { version: 2 as const, activeId: entry.id, projects: [entry] } } })
  const activeId = history.activeId
  const project = history.projects.find(p => p.id === activeId)!.project
  const setProject: Dispatch<SetStateAction<StudioProject>> = useCallback(update => setHistory(h => ({ ...h, projects: h.projects.map(entry => {
    if (entry.id !== activeId) return entry
    const next = typeof update === 'function' ? update(entry.project) : update
    return { ...entry, project: reconcileStepChanges(entry.project, next) }
  }) })), [activeId])
  const [role, setRole] = useState<Role>('business')
  const [stepId, setStepId] = useState(workflows.business[0].id)
  const latest = useRef({ project, role, stepId, activeId })
  latest.current = { project, role, stepId, activeId }
  const [selected, setSelected] = useState(project.sample ? 'specs/business/vision/shape.md' : 'business/original-spec.md')
  const [instruction, setInstruction] = useState('')
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
  const [claude, setClaude] = useState<ClaudeConnection | null>(null)
  const [figma, setFigma] = useState<FigmaConnection | null>(null)
  const markFigmaVerified = (token:string) => setFigma(current=>current?.token===token ? {...current,verified:true} : current)
  const [showStaticPreview, setShowStaticPreview] = useState(false)
  const [previewImageId, setPreviewImageId] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showEditorPreview, setShowEditorPreview] = useState(true)
  const [clarification, setClarification] = useState<{ projectId: string; role: Role; step: string; question: string; snapshot: StudioProject } | null>(null)
  const [clarificationAnswer, setClarificationAnswer] = useState('')
  const [resume, setResume] = useState<{ projectId: string; role: Role; step: string } | null>(null)
  const [mobileNav, setMobileNav] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newPath, setNewPath] = useState('')
  const [saved, setSaved] = useState(true)
  const meta = descriptions[role]
  const stage = workflows[role].find(s => s.id === stepId) ?? workflows[role][0]
  const answerKey = `${role}/${stage.id}`
  const answer = project.answers[answerKey] ?? ''
  const files = project.files.filter(f => roleOf(f.path) === role)
  const stepFiles = files.filter(f => f.path.startsWith(specPrefix(role, stage.id)) || !f.path.startsWith('specs/'))
  const allCount = project.files.length + (project.spec.trim() ? 1 : 0)
  const selectedFile = project.files.find(f => f.path === selected)
  const stale = role === 'design' ? project.designStale : role === 'development' ? project.developmentStale : false
  const stepIndex = workflows[role].findIndex(s => s.id === stage.id)
  const nextStep = workflows[role][stepIndex + 1]
  const previousStep = workflows[role][stepIndex - 1]
  const currentQuestion = clarification && clarification.projectId === activeId && clarification.role === role && clarification.step === stage.id && clarification.snapshot === project ? clarification.question : null
  const decision = project.stepDecisions[answerKey] ?? { status: 'not_started' as StepStatus, note: '' }
  const previewAvailable = project.files.some(f => f.path === 'solution/index.html' || f.path === 'design/components/preview.html')
  const framework = project.answers['preferences/stack'] || 'existing'
  const codeCount = project.files.filter(f => f.path.startsWith('solution/')).length
  // Each role gets its own workbench; cross-role information is shown as a handoff below.
  const deliverableGroups = role === 'business' ? [
    { title:'Business & functional requirements', description:'Define the business need and what the product must do.', files:project.files.filter(f => f.path === 'business/PRD.md' || f.path === 'specs/business/requirements/prd.md' || f.path === 'specs/business/requirements/business-requirements.md' || f.path === 'specs/business/requirements/functional-requirements.md') },
  ] : role === 'design' ? [
    { title:'Design & tokens', description:'Review the visual system, components and screen requirements.', files:project.files.filter(f => f.path.startsWith('design/') || f.path === 'specs/design/screens/design-requirements.md' || f.path === 'specs/design/screens/screens.md') },
  ] : role === 'development' ? [
    { title:'Application code', description:'Edit source files and preview supported HTML and CSS.', files:project.files.filter(f => f.path.startsWith('solution/')) },
  ] : role === 'quality' ? [
    {title:'Quality work',description:'Review acceptance checks and test cases.',files:project.files.filter(f=>f.path.startsWith('specs/quality/cases/') && !f.path.endsWith('/references.md') && !f.path.endsWith('/standards.md'))},
  ] : [
    {title:'Delivery work',description:'Review the release plan and delivery decisions.',files:project.files.filter(f=>f.path.startsWith('specs/delivery/release/') && !f.path.endsWith('/references.md') && !f.path.endsWith('/standards.md'))},
  ]
  const selectedIsHtml = Boolean(selectedFile && /\.html$/i.test(selectedFile.path) && /^(solution|design\/components)\//.test(selectedFile.path))
  const selectedIsPreviewable = Boolean(selectedFile && (/^solution\/.*\.(html|css|js)$/i.test(selectedFile.path) || /^design\/.*\.(html|css|json)$/i.test(selectedFile.path)))
  const editorPreview = (role === 'design' || role === 'development') && selectedIsPreviewable ? staticPreview(project.files, false, selectedIsHtml ? selected : undefined) : null
  const handoffPaths = role === 'development' || role === 'quality' ? ['specs/business/requirements/business-requirements.md','specs/business/requirements/functional-requirements.md','specs/design/screens/design-requirements.md'] : ['specs/business/requirements/business-requirements.md','specs/business/requirements/functional-requirements.md']
  const canRun = project.files.some(f => f.path === 'solution/index.html') && project.files.some(f => f.path === 'solution/app.js')
  function openDeliverable(path: string) {
    const nextRole = roleOf(path)
    if (!nextRole) return
    const parts = path.split('/')
    const nextStep = parts[0] === 'specs' ? parts[2] : nextRole === 'design' ? 'system' : nextRole === 'development' ? 'implementation' : 'requirements'
    setRole(nextRole); setStepId(nextStep); setSelected(path); setInstruction(''); setMobileNav(false)
    document.getElementById('file-workspace')?.scrollIntoView?.({behavior:'smooth',block:'start'})
  }
  useEffect(() => { if (historyLoadError) { setSaved(false); return } try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); localStorage.removeItem(LEGACY_KEY); setSaved(true) } catch { setSaved(false) } }, [history, historyLoadError])
  useEffect(() => { fetch('/api/studio').then(r => { if (!r.ok) throw new Error(); return r.json() }).then(d => { setConfigured(d.configured === true); setProvider(typeof d.provider === 'string' ? d.provider : null) }).catch(() => setConfigured(false)) }, [])
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(''), 6500); return () => window.clearTimeout(timer) }, [message])
  function chooseRole(next: Role) { setRole(next); setStepId(workflows[next][0].id); setSelected(project.files.find(f => f.path === specPrefix(next, workflows[next][0].id) + 'shape.md')?.path ?? (next === 'business' ? 'business/original-spec.md' : '')); setInstruction(''); setMobileNav(false) }
  async function generate() {
    if (!project.spec.trim()) { setMessage('Add a brief or project context before asking the AI.'); return }
    if (!configured && !claude) { setMessage('Connect Claude above, or ask your administrator to configure an AI provider.'); return }
    const link = findFigmaLink(`${instruction}\n${project.spec}`)
    if (link) {
      const parsed = parseFigmaLink(link)
      if (!parsed) { setMessage('Use a Figma frame link containing a node-id, or remove the link before generating.'); return }
      if (!project.references.some(r => r.source === parsed.source)) {
        setBusy(true); setMessage('Reading your Figma frame…')
        try {
          const frame = await fetchFigmaReference(link, role, stage.id, figma?.token)
          if (latest.current.project !== project || latest.current.role !== role || latest.current.stepId !== stage.id || latest.current.activeId !== activeId) throw new Error('The project changed while importing. Please try again.')
          if (figma) markFigmaVerified(figma.token)
          const updated = addFigmaReference(project, frame)
          setProject(updated); setResume({ projectId: activeId, role, step: stage.id }); setMessage('Figma frame imported. Creating your draft…')
        } catch(e) { setMessage(e instanceof Error ? e.message : 'Could not read the Figma frame.') } finally { setBusy(false) }
        return
      }
    }
    const refs = project.references.filter(r => r.role === role && r.step === stage.id)
    const context = `PROJECT TYPE: ${project.mode === 'existing' ? 'Existing product or change' : 'New product'}\n` + contextFor(project, role) + refs.filter(r => r.mime.startsWith('image/')).map(r => `\n--- Image reference: ${r.name} ---\nImage attached to this request.`).join('')
    const images = refs.filter(r => r.mime.startsWith('image/')).map(r => `data:${r.mime};base64,${r.data}`)
    if (context.length > 120000) { setMessage('Your handoff is too large. Shorten the earlier files before generating.'); return }
    setBusy(true); setMessage('')
    try {
      const res = await fetch('/api/studio', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(claude ? {'X-ProdOps-Claude-Key':claude.key,'X-ProdOps-Claude-Model':claude.model} : {}) }, body: JSON.stringify({ role, step: stage.id, answer, spec: project.spec, context, instruction: `${framework === 'existing' ? 'Follow the supplied component files and existing stack.' : `Target frontend framework: ${framework}. Respect provided component styles and conventions.`}\n${instruction}`, images }) })
      const data = await res.json() as { files?: FileItem[]; question?: string; error?: string }
      if (!res.ok) throw new Error(data.error || 'Could not generate files.')
      if (latest.current.project !== project || latest.current.role !== role || latest.current.stepId !== stage.id || latest.current.activeId !== activeId) throw new Error('The project changed while generating. The response was not applied; please try again.')
      if (typeof data.question === 'string' && data.question.trim()) { setClarification({ projectId: activeId, role, step: stage.id, question: data.question, snapshot: project }); setClarificationAnswer(''); return }
      if (!Array.isArray(data.files)) throw new Error('The AI response did not contain files.')
      const generated = data.files
      if (generated.some(f => project.files.some(existing => existing.path === f.path)) && !window.confirm('Replace the existing files with this new draft? Choose Cancel to keep the current files.')) { setMessage('Your existing files were kept.'); return }
      const nextProject = applyGenerated(project, role, generated)
      setProject({ ...nextProject, stepDecisions: { ...nextProject.stepDecisions, [answerKey]: { status: 'in_progress', note: nextProject.stepDecisions[answerKey]?.note ?? '' } } })
      setSelected(generated[0]?.path ?? '')
      setMessage('Draft files are ready. Review and edit them before continuing.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Generation failed. Your files were not changed.') } finally { setBusy(false) }
  }
  useEffect(() => { if (!resume) return; setResume(null); if (resume.projectId === activeId && resume.role === role && resume.step === stage.id) void generate() }, [resume])
  function answerQuestion() {
    if (!currentQuestion || !clarificationAnswer.trim()) { setMessage('Add an answer, or say you are not sure yet.'); return }
    const transcript = `${answer ? answer + '\n' : ''}Q: ${currentQuestion}\nA: ${clarificationAnswer.trim()}`
    if (transcript.length > 4000) { setMessage('The clarification history is too long. Start a new step or shorten the answer.'); return }
    setProject(p => ({ ...p, answers: { ...p.answers, [answerKey]: transcript } }))
    setClarification(null); setClarificationAnswer(''); setResume({ projectId: activeId, role, step: stage.id })
  }
  async function exportZip(mode: 'all' | 'skills' | 'code') {
    if (mode === 'code' && !codeCount) { setMessage('There are no solution files yet. Generate or add code files first.'); return }
    try { await saveZip(projectZip(project, mode), `${safeSlug(project.name)}-${mode === 'all' ? 'workspace' : mode}.zip`); setMessage('Your download is ready.') } catch { setMessage('Could not create the download. Please try again.') }
  }
  async function importZip(file: File) {
    try { if (file.size > 10_000_000) throw new Error(); const zip = await JSZip.loadAsync(file); const entry = zip.file('.prodops/project.json'); if (!entry) throw new Error(); const raw = await entry.async('string'); if (raw.length > 5_000_000) throw new Error(); const data = readProject(JSON.parse(raw)); if (!data) throw new Error(); if (history.projects.length >= 100) throw new Error('Project history is full.'); const imported = makeEntry(data); setHistory(h => ({ ...h, activeId: imported.id, projects: [...h.projects, imported] })); setRole('business'); setStepId(workflows.business[0].id); setSelected('business/original-spec.md'); setMessage('Workspace imported as a separate project.'); } catch { setMessage('Could not import this file. Choose a workspace ZIP exported from ProdOps.') }
  }
  function removeFile(path: string) {
    if (!window.confirm(`Delete ${path}? This cannot be undone.`)) return
    setProject(p => ({ ...p, files: p.files.filter(f => f.path !== path), businessApproved: role === 'business' ? false : p.businessApproved, designStale: role === 'business' ? true : p.designStale, developmentStale: role === 'business' || role === 'design' ? true : p.developmentStale }))
    setSelected(role === 'business' ? 'business/original-spec.md' : project.files.find(f => roleOf(f.path) === role && f.path !== path)?.path ?? '')
  }
  function startDeliverableFile(kind: 'design' | 'development') {
    setRole(kind); setStepId(kind === 'design' ? 'system' : 'implementation'); setSelected(''); setCreating(true); setNewPath(kind === 'design' ? 'design/' : 'solution/'); setMobileNav(false)
    window.setTimeout(() => document.getElementById('new-file-form')?.scrollIntoView?.({ behavior:'smooth', block:'center' }), 0)
  }
  async function importCodeFiles(input: FileList) {
    const selectedFiles = Array.from(input)
    if (!selectedFiles.length) return
    try {
      if (selectedFiles.length > 30 || selectedFiles.some(f => f.size > 50000 || !/\.(html|css|scss|js|ts|jsx|tsx|json|md)$/i.test(f.name))) throw new Error('Choose up to 30 HTML, CSS, SCSS, JavaScript, TypeScript, JSON or Markdown files, each under 50 KB.')
      const files = await Promise.all(selectedFiles.map(async file => ({path:`solution/${file.name}`, content:await file.text()})))
      if (latest.current.project !== project || latest.current.activeId !== activeId) throw new Error('The project changed while importing. Please try again.')
      if (!files.every(isSafeFile) || new Set(files.map(f => f.path)).size !== files.length) throw new Error('Use unique file names containing only letters, numbers, dots, hyphens and underscores.')
      if (files.some(f => project.files.some(existing => existing.path === f.path)) && !window.confirm('Replace the existing files with the same names?')) return
      setProject(applyGenerated(project, 'development', files)); openDeliverable(files[0].path)
      setMessage('Files added to application code. Review them before running the preview.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not import these files.') }
  }
  function createStepTemplates() {
    const prefix = specPrefix(role, stage.id)
    const candidates = [
      {path:prefix+'shape.md',content:`# ${stage.label}\n\n> Example template — replace before approval.\n\n## Goal and scope\nExample: ${stage.purpose}\n\n## Requirements or decisions\nExample: Describe the work, who it serves and the intended result.\n\n## Acceptance criteria\nExample: Describe how the team will know this work is complete.\n\n## Assumptions and open questions\nExample: Record what has not yet been confirmed.\n`},
      {path:prefix+'references.md',content:'# References\n\n> Example template — replace before approval.\n\n- Example: Link the brief, source materials or related work.\n'},
      {path:prefix+'standards.md',content:'# Standards\n\n> Example template — replace before approval.\n\n- Example: List supplied standards; distinguish assumptions from agreed rules.\n'},
      {path:prefix+'plan.md',content:`# ${stage.label} plan\n\n> Example template — replace before approval.\n\n1. Example: Review the shared context and ${stage.label.toLowerCase()} inputs.\n2. Example: Describe the actions, dependencies and owner.\n3. Example: Review the result and record evidence.\n`},
    ].filter(f=>!project.files.some(existing=>existing.path===f.path))
    if (!candidates.length) { setSelected(prefix+'shape.md'); setMessage('The step already has a template or draft; your files were kept.'); return }
    try { setProject(applyGenerated(project,role,candidates)); setSelected(project.files.some(f=>f.path===prefix+'shape.md') ? prefix+'shape.md' : candidates[0].path); setMessage('Example templates added. Replace the examples with your project details.') } catch { setMessage('Could not add templates: the project may have reached its file limit.') }
  }
  function addFile() {
    if (project.files.length >= 300) { setMessage('The project has reached its file limit.'); return }
    const path = newPath.trim(); const item = { path, content: '' }
    if (!isSafeFile(item) || roleOf(path) !== role || path === 'business/original-spec.md') { setMessage(`Use a safe path for this role, for example ${specPrefix(role, stage.id)}notes.md.`); return }
    if (project.files.some(f => f.path === path)) { setMessage('A file with that name already exists.'); return }
    setProject(p => ({ ...p, files: [...p.files, item], businessApproved: role === 'business' ? false : p.businessApproved, designStale: role === 'business' ? true : p.designStale, developmentStale: role === 'business' || role === 'design' ? true : p.developmentStale }))
    setSelected(path); setCreating(false); setNewPath('')
  }
  return <div className="studio-app">{historyLoadError && <div className="history-error" role="alert">Your saved project history could not be read. It has not been overwritten; export any work in this temporary session and restore from a backup.</div>}
    <aside className={`studio-sidebar ${mobileNav ? 'show' : ''}`}>
      <div className="studio-brand"><span className="studio-mark"><LayoutGrid size={18}/></span><div><b>ProdOps</b><small>PRODUCT WORKSPACE</small></div><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="studio-side-label">YOUR PROJECTS <span>{history.projects.length}</span></div><div className="studio-project project-picker"><span className="project-avatar">{project.name.slice(0,1).toUpperCase() || 'P'}</span><div><label htmlFor="project-picker">Current project</label><select id="project-picker" aria-label="Choose project" value={activeId} onChange={e => { const id = e.target.value; setHistory(h => ({ ...h, activeId: id })); setRole('business'); setStepId(workflows.business[0].id); setSelected(history.projects.find(p => p.id === id)?.project.sample ? 'specs/business/vision/shape.md' : 'business/original-spec.md'); setInstruction(''); setMobileNav(false) }}>{history.projects.map(p => <option value={p.id} key={p.id}>{p.project.name || 'Untitled project'}</option>)}</select></div><button aria-label="New project" title="New project" onClick={() => { if (history.projects.length >= 100) { setMessage('The project history is full. Export a backup before adding more.'); return } const entry = makeEntry(freshProject()); setHistory(h => ({ ...h, activeId: entry.id, projects: [...h.projects, entry] })); setRole('business'); setStepId(workflows.business[0].id); setSelected('business/original-spec.md'); setInstruction(''); setMessage('New project created. Name it and add context to get started.') }}><Plus size={16}/></button></div>
      <div className="studio-side-label journey-label">CHOOSE YOUR ROLE</div><nav className="visible-roles" aria-label="Choose your role">{roles.map(r => <button key={r.id} className={role === r.id ? 'active' : ''} aria-current={role === r.id ? 'page' : undefined} onClick={() => chooseRole(r.id)}><r.icon size={16}/><span>{r.label}</span><ChevronRight size={13}/></button>)}</nav>
      <div className="sidebar-divider"/><div className="studio-side-label">{roles.find(r => r.id === role)?.label.toUpperCase()} PROCESS <span>{workflows[role].length} STEPS</span></div><nav className="process-nav" aria-label="Process steps">{workflows[role].map((item, i) => <button key={item.id} className={stage.id === item.id ? 'active' : ''} onClick={() => { setStepId(item.id); setSelected(project.files.find(f => f.path === specPrefix(role, item.id) + 'shape.md')?.path ?? (role === 'business' ? 'business/original-spec.md' : '')); setMobileNav(false) }}><span>{String(i + 1).padStart(2, '0')}</span>{item.label}<small className={`process-state ${project.stepDecisions[`${role}/${item.id}`]?.status ?? 'not_started'}`}>{({approved:'Approved', rejected:'Rejected', revisit:'Revisit', in_progress:'In progress', not_started:''} as const)[project.stepDecisions[`${role}/${item.id}`]?.status ?? 'not_started']}</small></button>)}</nav>
      <div className="sidebar-divider"/><div className="studio-side-label">SPEC FOLDERS</div><div className="spec-tree">{workflows[role].filter(item => project.files.some(f => f.path.startsWith(specPrefix(role, item.id)))).map(item => <details key={item.id} open={stage.id === item.id}><summary><Folder size={13}/>{item.id}</summary>{project.files.filter(f => f.path.startsWith(specPrefix(role, item.id))).map(f => <button key={f.path} onClick={() => { setStepId(item.id); setSelected(f.path); setMobileNav(false) }} className={selected === f.path ? 'active' : ''}><FileText size={12}/>{f.path.slice(specPrefix(role, item.id).length)}</button>)}</details>)}{!project.files.some(f => f.path.startsWith(`specs/${role}/`)) && <p>Generated spec folders appear here.</p>}</div>
      <div className="sidebar-divider"/><div className="studio-side-label">PROJECT</div><button className="studio-side-action" onClick={() => setShowExport(true)}><ArrowDownToLine size={16}/> Download project</button><label className="studio-side-action import-label"><Upload size={16}/> Import workspace<input type="file" accept=".zip,application/zip" onChange={e => { const file = e.target.files?.[0]; if (file) void importZip(file); e.target.value = '' }}/></label><a className="studio-side-action" href="/"><ArrowLeft size={16}/> Back to website</a>
    </aside>
    {mobileNav && <button className="studio-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}
    <div className="studio-main"><header className="studio-top"><div className="top-breadcrumb"><button className="menu-toggle" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={19}/></button><span>Workspace</span><ChevronRight size={14}/><b>{roles.find(r => r.id === role)?.label}</b></div><div className="top-actions"><span className="save-status"><span/> {saved ? 'Saved in this browser' : 'Not saved'}</span><button className="export-top" onClick={() => setShowExport(true)}><ArrowDownToLine size={15}/> Download <ChevronDown size={13}/></button></div></header>
      <main className="studio-content"><div className="studio-page"><div className="studio-heading"><div><div className="eyebrow"><span/> YOUR PRODUCT, ONE STEP AT A TIME</div><h1>{meta.title}</h1><p>{meta.description}</p></div><div className="heading-progress"><span>YOUR PROGRESS</span><div><b>{workflows[role].filter(item => project.stepDecisions[`${role}/${item.id}`]?.status === 'approved').length}</b><small> / {workflows[role].length} approved</small></div><div className="progress-bar"><span style={{width: `${workflows[role].filter(item => project.stepDecisions[`${role}/${item.id}`]?.status === 'approved').length / workflows[role].length * 100}%`}}/></div><small>Roles can work in parallel</small></div></div>
      
      <Connections claude={claude} setClaude={setClaude} figma={figma} setFigma={setFigma} serverConfigured={configured} serverProvider={provider}/>
      {project.sample && <div className="sample-banner"><div><b>{project.name} · fictional example</b><p>Explore the work for this role. Example approvals and research are not real evidence.</p></div>{role === 'development' && canRun && <button className="button outline small" onClick={() => setShowPreview(true)}>Try the dashboard <ArrowRight size={14}/></button>}</div>}
      <section className="deliverables" aria-labelledby="deliverables-title"><div className="deliverables-head"><div><span className="small-kicker">YOUR ROLE’S WORK</span><h2 id="deliverables-title">{roles.find(r=>r.id===role)?.label} deliverables</h2><p>Open a file to work on it here. Your changes are saved in this browser; downloading is optional.</p></div><div className="step-buttons">{(role === 'design' || role === 'development') && previewAvailable && <button className="button outline small" onClick={() => setShowStaticPreview(true)}>Compare UI</button>}{role === 'development' && !project.sample && canRun && <button className="button outline small" onClick={() => setShowPreview(true)}>Run current preview</button>}</div></div><div className="deliverables-grid">{deliverableGroups.map(group => <div className="deliverable-group" key={group.title}><h3>{group.title}</h3><p>{group.description}</p>{group.title === 'Design & tokens' && <button className="new-deliverable" onClick={() => startDeliverableFile('design')}><Plus size={13}/> New design file</button>}{group.title === 'Application code' && <button className="new-deliverable" onClick={() => startDeliverableFile('development')}><Plus size={13}/> New code file</button>}{group.title === 'Application code' && <label className="code-import"><Upload size={13}/> Import code files<input type="file" multiple accept=".html,.css,.scss,.js,.ts,.jsx,.tsx,.json,.md" onChange={e => { const files = e.target.files; if (files) void importCodeFiles(files); e.target.value = '' }}/></label>}{group.files.length ? group.files.map(f => <button key={f.path} onClick={() => openDeliverable(f.path)}>{fileIcon(f.path)}<span><b>{f.path.split('/').pop()}</b><small>{f.path}</small></span><ChevronRight size={14}/></button>) : <span className="deliverable-empty">Nothing here yet. Create or generate files in the relevant role.</span>}</div>)}</div></section>
      <div className="work-grid"><section className="workspace-card" id="file-workspace"><div className="card-head"><div className="card-head-icon">{role === 'business' ? <FileText size={19}/> : role === 'design' ? <PenTool size={19}/> : <Code2 size={19}/>}</div><div><h2>{stage.label}</h2><p>{`Step ${stepIndex + 1} of ${workflows[role].length} · ${roles.find(r => r.id === role)?.label}`}</p></div><Tag tone={decision.status === 'approved' ? 'green' : 'peach'}>{decision.status.replace('_', ' ').toUpperCase()}</Tag></div><div className="card-divider"/>
      {stale && files.length > 0 && <div className="stale-alert"><CircleHelp size={16}/><span>Earlier work has changed. Review these files and regenerate if needed; your edits are still here.</span></div>}
      {role === 'design' && stage.id === 'system' && <DesignEditor key={activeId} project={project} setProject={setProject}/>}
      {role === 'business' && <div className="project-meta"><div className="project-name-field"><label htmlFor="project-name">Project name</label><input id="project-name" value={project.name} maxLength={120} onChange={e => setProject(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Orbit dashboard"/></div><div className="project-name-field"><label htmlFor="project-mode">Type of work</label><select id="project-mode" value={project.mode} onChange={e => setProject(p => ({ ...p, mode: e.target.value === 'existing' ? 'existing' : 'new' }))}><option value="new">New product</option><option value="existing">Existing product or change</option></select></div></div>}
      {role !== 'business' && <section className="role-handoff"><div className="handoff-header"><div><span className="small-kicker">SHARED FROM BUSINESS ANALYSIS</span><h3>Shared project context</h3></div><Tag>{`VISION: ${(project.stepDecisions['business/vision']?.status ?? 'not_started').replace('_', ' ').toUpperCase()}`}</Tag></div><p className="handoff-copy">{project.spec || 'No shared context yet. Business analysis can add it at Vision & outcomes.'}</p><p className="handoff-hint">These are the current source files, including drafts. Approval status belongs to the relevant step; changes are reflected here automatically.</p>{handoffPaths.map(path=>{const file=project.files.find(f=>f.path===path); if(!file)return null; const design=path.startsWith('specs/design/'); return <details className="handoff-document" key={path} open><summary>{path.split('/').pop()?.replace('.md','').replaceAll('-',' ')} <span>{(project.stepDecisions[design ? 'design/screens' : 'business/requirements']?.status ?? 'not_started').replace('_',' ')}</span></summary><pre>{file.content}</pre></details>})}<label htmlFor="role-context">Additional {roles.find(r=>r.id===role)?.label.toLowerCase()} context <span>OPTIONAL</span></label><textarea id="role-context" maxLength={4000} value={project.answers[`context/${role}`] ?? ''} placeholder={roleTemplates[role]} onChange={e=>setProject(p=>({...p,answers:{...p.answers,[`context/${role}`]:e.target.value}}))}/><div className="template-actions"><button onClick={()=>{if (!project.answers[`context/${role}`] || window.confirm('Replace your role context with the example template?')) setProject(p=>({...p,answers:{...p.answers,[`context/${role}`]:roleTemplates[role]}}))}}>Use example template</button><button onClick={()=>setProject(p=>({...p,answers:{...p.answers,[`context/${role}`]:''}}))}>Clear</button></div></section>}
      <div className="editor-heading"><div><b>{selected === 'business/original-spec.md' ? 'Shared project context' : selectedFile ? selectedFile.path.split('/').pop() : 'Your files'}</b><p>{selected === 'business/original-spec.md' ? project.mode === 'existing' ? 'Describe the current product, the change, constraints and known references.' : 'Describe the idea, problem and users in your own words.' : selectedFile ? selectedFile.path : 'Generate files or add your own to get started.'}</p></div>{selectedFile ? <button className="delete-file" onClick={() => removeFile(selectedFile.path)} aria-label={`Delete ${selectedFile.path}`}><Trash2 size={14}/> Delete</button> : selected && <Tag>{selected.endsWith('.md') ? 'MARKDOWN' : 'FILE'}</Tag>}</div>
      {selected === 'business/original-spec.md' && role === 'business' && <div className="template-actions"><button onClick={()=>{if (!project.spec || window.confirm('Replace your project context with the example template?')) setProject(p=>({...p,spec:briefTemplate,businessApproved:false,designStale:true,developmentStale:true}))}}>Use example template</button><button onClick={()=>setProject(p=>({...p,spec:'',businessApproved:false,designStale:true,developmentStale:true}))}>Clear context</button></div>}
      {editorPreview && <div className="editor-preview-toggle"><button onClick={() => setShowEditorPreview(!showEditorPreview)}>{showEditorPreview ? 'Hide live HTML/CSS preview' : 'Show live HTML/CSS preview'}</button><span>{selectedFile?.path.endsWith('.js') ? 'Shows the related page; scripts are disabled' : 'Updates as you edit · scripts disabled'}</span></div>}
      <div className={editorPreview && showEditorPreview ? 'editor-with-preview' : undefined}><div>{selected === 'business/original-spec.md' ? <textarea className="studio-editor spec-editor" aria-label="Project context" maxLength={30000} placeholder={briefTemplate} value={project.spec} onChange={e => setProject(p => ({ ...p, spec: e.target.value, businessApproved: false, designStale: true, developmentStale: true }))}/> : selectedFile ? <textarea className="studio-editor file-editor" maxLength={50000} aria-label={`Edit ${selectedFile.path}`} value={selectedFile.content} onChange={e => setProject(p => updateFile(p, selectedFile.path, e.target.value))}/> : <div className="editor-empty"><Folder size={22}/><p>No file selected yet.</p><span>Generate your first draft or create a file below.</span></div>}</div>{editorPreview && showEditorPreview && <div className="inline-preview"><b>{selectedIsHtml ? `PREVIEW · ${selected.split('/').pop()}` : 'LIVE HTML/CSS PREVIEW'}</b><iframe title="Live HTML and CSS preview" sandbox="" srcDoc={editorPreview}/></div>}</div>
      {selectedFile && /\.(ts|tsx|jsx|scss)$/i.test(selectedFile.path) && role === 'development' && <p className="preview-limitation">This file needs a framework compiler or preprocessor; it cannot be rendered here. Open an HTML file for a static preview.</p>}
      <div className="editor-footer"><span><span className="saved-dot"/> {saved ? 'Changes saved locally' : 'Could not save locally — export a copy'}</span><span>{selected === 'business/original-spec.md' ? `${project.spec.length.toLocaleString()} / 30,000 characters` : selectedFile ? `${selectedFile.content.length.toLocaleString()} characters` : ''}</span></div>
      <div className="files-heading"><div><h3>Files for this step</h3><span>{stepFiles.length + (role === 'business' ? 1 : 0)} files</span></div><div className="step-buttons"><button onClick={createStepTemplates}>Use step template</button><button onClick={() => { setCreating(!creating); setNewPath(specPrefix(role, stage.id)) }}><Plus size={14}/> Add file</button></div></div>{creating && <div className="create-file" id="new-file-form"><input aria-label="New file path" value={newPath} onChange={e => setNewPath(e.target.value)}/><button className="button outline small" onClick={addFile}>Create</button><button className="plain-icon" aria-label="Cancel" onClick={() => setCreating(false)}><X size={15}/></button></div>}
      <div className="file-list">{role === 'business' && <button className={selected === 'business/original-spec.md' ? 'selected' : ''} onClick={() => setSelected('business/original-spec.md')}>{fileIcon('spec.md')}<span><b>Shared project context</b><small>business/original-spec.md</small></span><ChevronRight size={15}/></button>}{stepFiles.map(f => <button key={f.path} className={selected === f.path ? 'selected' : ''} onClick={() => setSelected(f.path)}>{fileIcon(f.path)}<span><b>{f.path.split('/').pop()}</b><small>{f.path}</small></span><ChevronRight size={15}/></button>)}</div>
      <div className="step-review"><div className="review-title"><div><span className="small-kicker">STEP {stepIndex + 1} OF {workflows[role].length}</span><h3>Review {stage.label}</h3><p>Choose the outcome after reviewing your work. You can return to any step at any time.</p></div><Tag tone={decision.status === 'approved' ? 'green' : 'peach'}>{decision.status.replace('_', ' ').toUpperCase()}</Tag></div><label htmlFor="decision-note">Decision note <span>OPTIONAL</span></label><textarea id="decision-note" maxLength={2000} value={decision.note} placeholder="Example: Reviewed with the team; confirm the remaining open question." onChange={e => { const note = e.target.value; setProject(p => ({ ...p, stepDecisions: { ...p.stepDecisions, [answerKey]: { status: p.stepDecisions[answerKey]?.status ?? 'not_started', note } } })) }}/><div className="decision-actions">{([['approved','Approve'],['revisit','Proceed, revisit'],['rejected','Reject'],['in_progress','In progress']] as const).map(([status,label]) => <button key={status} className={decision.status === status ? 'selected' : ''} onClick={() => { if (status === 'approved' && !(role === 'business' && stage.id === 'vision' && project.spec.trim()) && !project.files.some(f => f.path.startsWith(specPrefix(role, stage.id))) && !(role === 'design' && stage.id === 'system' && project.files.some(f=>f.path.startsWith('design/')))) { setMessage('Add or generate a file for this step before approving it.'); return } setProject(p => ({ ...p, stepDecisions: { ...p.stepDecisions, [answerKey]: { status, note: p.stepDecisions[answerKey]?.note ?? '' } } })); setMessage(status === 'rejected' ? 'Step rejected. Update the work and review it again.' : status === 'revisit' ? 'Marked for a later revisit. You can continue.' : status === 'approved' ? 'Step approved. You can continue to the next step.' : 'Step marked in progress.') }}>{label}</button>)}</div><div className="next-step"><div><small>{decision.status === 'rejected' ? 'NEEDS YOUR ATTENTION' : 'UP NEXT'}</small><b>{decision.status === 'rejected' ? 'Revise this step before approval' : nextStep ? nextStep.label : 'You reached the end of this role’s process'}</b></div><div className="step-buttons"><button className="button outline small" disabled={!previousStep} onClick={() => { if (previousStep) { setStepId(previousStep.id); setSelected(project.files.find(f => f.path === specPrefix(role, previousStep.id) + 'shape.md')?.path ?? (role === 'business' ? 'business/original-spec.md' : '')) } }}><ArrowLeft size={14}/> Back</button>{nextStep && <button className="button outline small" onClick={() => { setStepId(nextStep.id); setSelected(project.files.find(f => f.path === specPrefix(role, nextStep.id) + 'shape.md')?.path ?? (role === 'business' ? 'business/original-spec.md' : '')) }}>Next step <ArrowRight size={14}/></button>}</div></div></div>
      </section><aside className="studio-aside"><div className="ai-card"><div className="ai-card-top"><div className="ai-icon"><Sparkles size={18}/></div><Tag tone={claude || configured ? 'green' : 'neutral'}>{claude ? 'CLAUDE CONNECTED' : configured ? (provider === 'anthropic' ? 'CLAUDE CONFIGURED' : 'AI CONFIGURED') : configured === null ? 'CHECKING' : 'NOT CONNECTED'}</Tag></div><div className="small-kicker">PROCESS · {String(workflows[role].indexOf(stage) + 1).padStart(2, '0')}</div><h3>{stage.label}</h3><p>{stage.purpose}</p>{currentQuestion ? <div className="clarification"><div className="small-kicker">THE AI NEEDS ONE DETAIL</div><label htmlFor="clarifying-answer">{currentQuestion}</label><textarea id="clarifying-answer" maxLength={2000} placeholder="Your answer, or say you’re not sure yet…" value={clarificationAnswer} onChange={e => setClarificationAnswer(e.target.value)}/><button className="button accent full" disabled={busy} onClick={answerQuestion}>Send answer <ArrowRight size={14}/></button></div> : <p className="assistant-explain">The AI will only ask a question if it needs more detail. It uses your project files and the skill instructions.</p>}<details className="reference-details"><summary>Add a reference (optional)</summary><References project={project} setProject={setProject} role={role} step={stage.id} figmaToken={figma?.token} onFigmaVerified={markFigmaVerified}/></details>{(role === 'design' || role === 'development') && <label className="framework-picker" htmlFor="target-framework">Frontend style<select id="target-framework" value={framework} onChange={e => { const value = e.target.value; setProject(p => ({ ...p, answers:{...p.answers, 'preferences/stack':value} })) }}><option value="existing">Follow imported components</option><option value="Angular">Angular</option><option value="React">React</option><option value="HTML and CSS">HTML and CSS</option></select></label>}<label htmlFor="extra-direction">Tell the AI what you need <span>OPTIONAL</span></label><textarea id="extra-direction" maxLength={3600} placeholder={`Example — replace or leave blank: ${stage.purpose} Use the shared context and highlight anything that still needs confirmation.`} value={instruction} onChange={e => setInstruction(e.target.value)}/><div className="template-actions"><button onClick={()=>{if (!instruction || window.confirm('Replace your instruction with an example?')) setInstruction(`EXAMPLE — replace before sending: ${stage.purpose} Use the shared context and flag unknowns.`)}}>Use example instruction</button><button onClick={()=>setInstruction('')}>Clear</button></div>{!currentQuestion && <button className="button accent full" onClick={() => void generate()} disabled={busy}>{busy ? <LoaderCircle className="spin" size={16}/> : <Sparkles size={16}/>} {busy ? 'Working…' : `Create ${stage.label}`}</button>}{configured === false && !claude && <p className="ai-unavailable">Connect Claude above with your API key, or continue editing without AI.</p>}<div className="ai-note"><LockKeyhole size={13}/><span>Generation sends your brief, project Markdown, design and solution files, skills, text references and this step’s images to your configured AI provider.</span></div></div>
      <div className="handoff-card"><div className="small-kicker">TAKE YOUR WORK WITH YOU</div><h3>What gets downloaded?</h3><p>The full project includes your brief, all role files, references, review decisions, skills and any solution code.</p><button onClick={() => setShowExport(true)}><span><ArrowDownToLine size={16}/> Choose what to download</span><ChevronRight size={15}/></button></div><div className="tips"><Sparkles size={15}/><span>Review AI drafts before using them. Nothing is run or deployed automatically.</span></div></aside></div>
      <footer className="studio-footer"><span>ProdOps · project by Lulamile Mkhungela.</span><span>{allCount} project file{allCount === 1 ? '' : 's'} · {Object.keys(skillFiles).filter(p => p.endsWith('/SKILL.md')).length} skills included</span></footer></div></main></div>
    {showExport && <div className="modal-backdrop" onClick={() => setShowExport(false)}><section className="studio-modal download-modal" role="dialog" aria-modal="true" aria-labelledby="download-title" onClick={e => e.stopPropagation()}><div className="modal-title"><div><span className="small-kicker">DOWNLOAD</span><h2 id="download-title">What would you like to take?</h2></div><button className="plain-icon" aria-label="Close" onClick={() => setShowExport(false)}><X size={19}/></button></div><p>Each download is a ZIP file. Choose the one that fits what you want to do next.</p><button className="download-choice" onClick={() => { void exportZip('all'); setShowExport(false) }}><b>Full project</b><span>Brief, all {project.files.length} files, references, decisions, skills and any code. You can import it back into ProdOps.</span><ArrowDownToLine size={16}/></button><button className="download-choice" disabled={!codeCount} onClick={() => { void exportZip('code'); setShowExport(false) }}><b>Application code only</b><span>{codeCount ? `${codeCount} solution files to open in an editor. Excludes project documents and skills.` : 'No application code has been added to this project yet.'}</span><ArrowDownToLine size={16}/></button><button className="download-choice" onClick={() => { void exportZip('skills'); setShowExport(false) }}><b>AI skills and instructions</b><span>Markdown skill files and commands for an AI coding editor. No project information.</span><ArrowDownToLine size={16}/></button></section></div>}
    {showStaticPreview && previewAvailable && <div className="modal-backdrop" onClick={() => setShowStaticPreview(false)}><section className="studio-modal preview-modal compare-modal" role="dialog" aria-modal="true" aria-labelledby="ui-preview-title" onClick={e => e.stopPropagation()}><div className="modal-title"><div><span className="small-kicker">VISUAL REVIEW</span><h2 id="ui-preview-title">Preview the interface</h2></div><button className="plain-icon" aria-label="Close" onClick={() => setShowStaticPreview(false)}><X size={19}/></button></div><p>Static HTML and CSS only. JavaScript, external assets and Figma rendering are not run here; upload a screenshot to compare.</p><div className="compare-content"><div><b>Current UI</b><iframe title="Static UI preview" sandbox="" srcDoc={staticPreview(project.files) ?? ''}/></div><div><b>Reference screenshot</b>{project.references.some(r=>r.mime.startsWith('image/')) ? <><label className="preview-image-choice">Choose screenshot<select value={project.references.some(r=>r.id===previewImageId && r.mime.startsWith('image/')) ? previewImageId : project.references.find(r=>r.mime.startsWith('image/'))!.id} onChange={e=>setPreviewImageId(e.target.value)}>{project.references.filter(r=>r.mime.startsWith('image/')).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>{(() => { const image = project.references.find(r=>r.id===previewImageId && r.mime.startsWith('image/')) ?? project.references.find(r=>r.mime.startsWith('image/'))!; return <img alt={`Uploaded design reference ${image.name}`} src={`data:${image.mime};base64,${image.data}`}/> })()}</> : <p>Add a screenshot under “Add a reference” to compare it here.</p>}</div></div></section></div>}
    {showPreview && canRun && <div className="modal-backdrop" onClick={() => setShowPreview(false)}><section className="studio-modal preview-modal" role="dialog" aria-modal="true" aria-labelledby="preview-title" onClick={e => e.stopPropagation()}><div className="modal-title"><div><span className="small-kicker">INTERACTIVE PREVIEW</span><h2 id="preview-title">Try the current application</h2></div><button className="plain-icon" aria-label="Close" onClick={() => setShowPreview(false)}><X size={19}/></button></div><p>This runs your current index.html, styles.css and app.js in an isolated browser frame. Only run code you trust: it can still consume resources or navigate its own frame. External resources are restricted, browser storage is unavailable and the preview resets when closed. Framework builds and other scripts are not supported.</p><iframe title="Interactive application preview" sandbox="allow-scripts" srcDoc={staticPreview(project.files, true) ?? ''}/></section></div>}
    {message && <div className="studio-toast" role="status">{message}</div>}
  </div>
}
