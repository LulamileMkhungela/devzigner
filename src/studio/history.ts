/** Browser-local project history and non-destructive example migration. */
import { makeDashboardProject } from './dashboard'
import { starterDesignFiles } from './tokens'
import { starterRequirements } from './templates'
import { initialProject, readProject, type StudioProject } from './model'
export const HISTORY_KEY = 'prodops.role-studio.projects.v2'
const DASHBOARD_ID = 'example-orbit-dashboard-v1'
function withDashboard(history: History): History {
  if (history.projects.some(p => p.id === DASHBOARD_ID) || history.projects.length >= 100) return history
  // Keep any old example as a normal saved project rather than deleting users' edits.
  const projects = history.projects.map(entry => entry.id === 'example-casa-v1' ? {...entry, project:{...entry.project,sample:false}} : entry)
  return { ...history, activeId: history.activeId === 'example-casa-v1' || !projects.length ? DASHBOARD_ID : history.activeId, projects: [{id:DASHBOARD_ID,project:makeDashboardProject()},...projects] }
}
export const LEGACY_KEY = 'prodops.role-studio.v1'
export interface History { version: 2; activeId: string; projects: { id: string; project: StudioProject }[] }
export const freshProject = (): StudioProject => ({ ...initialProject, files: [...starterDesignFiles(), ...starterRequirements()], references: [], answers: {}, stepDecisions: {} })
const id = () => globalThis.crypto?.randomUUID?.() ?? `p-${Date.now()}-${Math.random().toString(36).slice(2)}`
export function makeEntry(project = freshProject()) { return { id: id(), project } }
export function loadHistory(storage: Storage): History {
  try {
    const raw = storage.getItem(HISTORY_KEY)
    if (raw) {
      const data = JSON.parse(raw) as History
      if (data.version === 2 && Array.isArray(data.projects) && data.projects.length > 0 && data.projects.length <= 100 && typeof data.activeId === 'string') {
        const projects = data.projects.map(e => ({ id: typeof e.id === 'string' ? e.id : '', project: readProject(e.project) })).filter((e): e is { id: string; project: StudioProject } => !!e.id && e.project !== null)
        if (projects.length === data.projects.length && new Set(projects.map(p => p.id)).size === projects.length && projects.some(p => p.id === data.activeId)) return withDashboard({ version: 2, activeId: data.activeId, projects })
      }
      // Preserve an invalid history rather than silently replacing it with a fresh one.
      throw new Error('Project history could not be read')
    }
    const legacyRaw = storage.getItem(LEGACY_KEY)
    const legacy = legacyRaw ? readProject(JSON.parse(legacyRaw)) : null
    if (legacyRaw && !legacy) throw new Error('Previous project could not be read')
    const entry = makeEntry(legacy ?? freshProject())
    return withDashboard({ version: 2, activeId: entry.id, projects: legacy ? [entry] : [] })
  } catch (error) {
    if (storage.getItem(HISTORY_KEY) || storage.getItem(LEGACY_KEY)) throw error
    const entry = makeEntry(); return { version: 2, activeId: entry.id, projects: [entry] }
  }
}
