/** Project validation and change tracking for locally stored role work. */
import { workflows, type Role } from './workflows'
export type { Role } from './workflows'
export interface FileItem { path: string; content: string }
export interface Reference { id: string; name: string; mime: 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf' | 'text/plain'; source?: string; data: string; text: string; role: Role; step: string }
export type StepStatus = 'not_started' | 'in_progress' | 'approved' | 'rejected' | 'revisit'
export interface StepDecision { status: StepStatus; note: string }
export interface StudioProject { version: 1; name: string; sample?: boolean; mode: 'new' | 'existing'; stepDecisions: Record<string, StepDecision>; spec: string; businessApproved: boolean; designStale: boolean; developmentStale: boolean; files: FileItem[]; references: Reference[]; answers: Record<string, string> }
export const initialProject: StudioProject = { version: 1, name: 'Untitled project', mode: 'new', stepDecisions: {}, spec: '', businessApproved: false, designStale: false, developmentStale: false, files: [], references: [], answers: {} }
const roleNames: Role[] = ['business', 'design', 'development', 'quality', 'delivery']
export const roleOf = (path: string): Role | null => {
  const spec = /^specs\/(business|design|development|quality|delivery)\//.exec(path)
  if (spec) return spec[1] as Role
  return path.startsWith('business/') ? 'business' : path.startsWith('design/') ? 'design' : path.startsWith('implementation/') || path.startsWith('solution/') ? 'development' : null
}
export function isSafeFile(file: unknown): file is FileItem {
  if (!file || typeof file !== 'object') return false
  const f = file as FileItem
  return typeof f.path === 'string' && f.path !== 'business/original-spec.md' && f.path.length <= 160 && /^(business|design|implementation|solution|specs)\/[a-zA-Z0-9_.\/-]+$/.test(f.path) && roleOf(f.path) !== null && !f.path.split('/').some(part => !part || part === '.' || part === '..') && typeof f.content === 'string' && f.content.length <= 50000
}
function safeReference(r: unknown): r is Reference {
  if (!r || typeof r !== 'object') return false
  const v = r as Reference
  return typeof v.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(v.id) && typeof v.name === 'string' && v.name.length <= 120 && !/[\\/]/.test(v.name) && ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain'].includes(v.mime) && (v.source === undefined || typeof v.source === 'string' && v.source.length <= 600) && typeof v.data === 'string' && v.data.length <= 2700000 && /^[A-Za-z0-9+/]*={0,2}$/.test(v.data) && typeof v.text === 'string' && v.text.length <= 20000 && roleNames.includes(v.role) && typeof v.step === 'string' && /^[a-z0-9-]{1,40}$/.test(v.step)
}
export function readProject(value: unknown): StudioProject | null {
  if (!value || typeof value !== 'object') return null
  const v = value as StudioProject
  if (v.version !== 1 || typeof v.name !== 'string' || v.name.length > 120 || typeof v.spec !== 'string' || v.spec.length > 30000 || !Array.isArray(v.files) || v.files.length > 300 || !v.files.every(isSafeFile) || new Set(v.files.map(f => f.path)).size !== v.files.length) return null
  const references = v.references ?? []
  if (!Array.isArray(references) || references.length > 12 || !references.every(safeReference) || references.reduce((n, r) => n + r.data.length, 0) > 3400000) return null
  const answers = v.answers ?? {}
  if (!answers || typeof answers !== 'object' || Array.isArray(answers) || Object.keys(answers).length > 100 || Object.entries(answers).some(([k, val]) => !/^[a-z-]+\/[a-z-]+$/.test(k) || typeof val !== 'string' || val.length > 4000)) return null
  const decisions = v.stepDecisions ?? {}
  if (!decisions || typeof decisions !== 'object' || Array.isArray(decisions) || Object.keys(decisions).length > 100 || Object.entries(decisions).some(([key, d]) => !/^[a-z-]+\/[a-z-]+$/.test(key) || !d || typeof d !== 'object' || !['not_started','in_progress','approved','rejected','revisit'].includes(d.status) || typeof d.note !== 'string' || d.note.length > 2000)) return null
  return { version: 1, name: v.name, sample: v.sample === true, mode: v.mode === 'existing' ? 'existing' : 'new', stepDecisions: decisions, spec: v.spec, businessApproved: v.businessApproved === true && v.files.some(f => roleOf(f.path) === 'business') && v.spec.trim().length >= 20, designStale: v.designStale === true, developmentStale: v.developmentStale === true, files: v.files, references, answers }
}
export function updateFile(project: StudioProject, path: string, content: string): StudioProject {
  const role = roleOf(path)
  return { ...project, files: project.files.map(file => file.path === path ? { ...file, content } : file), businessApproved: role === 'business' ? false : project.businessApproved, designStale: role === 'business' ? true : project.designStale, developmentStale: role === 'business' || role === 'design' ? true : project.developmentStale }
}
export function applyGenerated(project: StudioProject, role: Role, incoming: FileItem[]): StudioProject {
  if (!incoming.length || !incoming.every(f => isSafeFile(f) && roleOf(f.path) === role) || new Set(incoming.map(f => f.path)).size !== incoming.length || project.files.length + incoming.length > 330) throw new Error('Invalid generated files')
  const incomingPaths = new Set(incoming.map(f => f.path))
  const files = [...project.files.filter(f => !incomingPaths.has(f.path)), ...incoming]
  if (files.length > 300) throw new Error('The project has reached its file limit.')
  return { ...project, files, businessApproved: role === 'business' ? false : project.businessApproved, designStale: role === 'business' ? true : role === 'design' ? false : project.designStale, developmentStale: role === 'business' || role === 'design' ? true : role === 'development' ? false : project.developmentStale }
}
export function contextFor(project: StudioProject, _role: Role): string {
  // Project Markdown and editable design/solution files are carried into every request.
  const files = project.files.filter(f => f.path.toLowerCase().endsWith('.md') || f.path.startsWith('design/') || f.path.startsWith('solution/')).map(f => `--- ${f.path} ---\n${f.content}`)
  const references = project.references.filter(r => (r.mime === 'text/plain' || r.mime === 'application/pdf') && r.text.trim()).map(r => `--- Reference ${r.name}${r.source ? ` (${r.source})` : ''} ---\n${r.text}`)
  const roleNotes = roleNames.filter(role => project.answers[`context/${role}`]?.trim()).map(role => `--- ${role} additional context ---\n${project.answers[`context/${role}`]}`)
  return [...files, ...references, ...roleNotes].join('\n\n')
}

/** Any approved step affected by an edit returns to a review-needed state. */
export function reconcileStepChanges(before: StudioProject, next: StudioProject): StudioProject {
  let decisions = next.stepDecisions
  for (const [key, decision] of Object.entries(before.stepDecisions)) {
    if (decision.status !== 'approved' || next.stepDecisions[key]?.status !== 'approved') continue
    const [role, step] = key.split('/')
    const prefix = `specs/${role}/${step}/`
    const previousFiles = before.files.filter(f => f.path.startsWith(prefix))
    const nextFiles = next.files.filter(f => f.path.startsWith(prefix))
    const previousRefs = before.references.filter(r => r.role === role && r.step === step)
    const nextRefs = next.references.filter(r => r.role === role && r.step === step)
    const roleIndex = roleNames.indexOf(role as Role)
    const previousSteps = workflows[role as Role]?.map(s => s.id) ?? []
    const stepIndex = previousSteps.indexOf(step)
    const upstreamRole = (r: Role | null) => r !== null && roleNames.indexOf(r) < roleIndex
    const upstreamFilesBefore = before.files.filter(f => upstreamRole(roleOf(f.path)) || (f.path.startsWith(`specs/${role}/`) && previousSteps.indexOf(f.path.split('/')[2]) >= 0 && previousSteps.indexOf(f.path.split('/')[2]) < stepIndex))
    const upstreamFilesAfter = next.files.filter(f => upstreamRole(roleOf(f.path)) || (f.path.startsWith(`specs/${role}/`) && previousSteps.indexOf(f.path.split('/')[2]) >= 0 && previousSteps.indexOf(f.path.split('/')[2]) < stepIndex))
    const relevantAssets = (f: FileItem) => role === 'design' && stepIndex >= previousSteps.indexOf('system') && f.path.startsWith('design/') || role === 'development' && stepIndex >= previousSteps.indexOf('implementation') && f.path.startsWith('solution/')
    const notesChanged = roleNames.some(r => roleNames.indexOf(r) <= roleIndex && before.answers[`context/${r}`] !== next.answers[`context/${r}`])
    const assetsChanged = JSON.stringify(before.files.filter(relevantAssets)) !== JSON.stringify(next.files.filter(relevantAssets))
    if (notesChanged || assetsChanged || before.spec !== next.spec || before.mode !== next.mode || (role !== 'business' && before.answers['preferences/stack'] !== next.answers['preferences/stack']) || before.answers[key] !== next.answers[key] || JSON.stringify(previousFiles) !== JSON.stringify(nextFiles) || JSON.stringify(previousRefs) !== JSON.stringify(nextRefs) || JSON.stringify(upstreamFilesBefore) !== JSON.stringify(upstreamFilesAfter)) {
      if (decisions === next.stepDecisions) decisions = { ...decisions }
      decisions[key] = { ...decision, status: 'revisit' }
    }
  }
  return decisions === next.stepDecisions ? next : { ...next, stepDecisions: decisions }
}
