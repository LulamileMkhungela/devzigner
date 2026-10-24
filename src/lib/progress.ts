import type { Project, Section } from '../types'

export interface PhaseDef {
  id: string
  label: string
  path: string
  icon: string
}

/** The five phases of the Design OS flow, in order. */
export const PHASES: PhaseDef[] = [
  { id: 'product', label: 'Product', path: '', icon: 'FileText' },
  { id: 'data-shape', label: 'Data Shape', path: 'data-shape', icon: 'Boxes' },
  { id: 'design', label: 'Design', path: 'design', icon: 'Layout' },
  { id: 'sections', label: 'Sections', path: 'sections', icon: 'LayoutList' },
  { id: 'export', label: 'Export', path: 'export', icon: 'Package' },
]

export function phaseIndex(id: string): number {
  return PHASES.findIndex((p) => p.id === id)
}

export interface SectionProgress {
  spec: boolean
  data: boolean
  screens: boolean
  screenshots: boolean
  captured: number
  total: number
  complete: boolean
}

export function sectionProgress(section: Section, captured: string[]): SectionProgress {
  const total = section.screens.length
  const shots = section.screens.filter((s) => captured.includes(s.id)).length
  const spec = section.jobs.length > 0 && section.requirements.length > 0
  const data = section.entityIds.length > 0
  const screens = total > 0
  const screenshots = total > 0 && shots === total
  return { spec, data, screens, screenshots, captured: shots, total, complete: spec && data && screens && screenshots }
}

export function sectionStats(project: Project, captured: string[]) {
  const done = project.sections.filter((s) => sectionProgress(s, captured).complete).length
  return { done, total: project.sections.length, all: done === project.sections.length }
}

export function phaseComplete(project: Project, captured: string[], phaseId: string): boolean {
  switch (phaseId) {
    case 'product':
      return Boolean(project.brief.summary && project.roadmap.phases.length)
    case 'data-shape':
      return project.data.entities.length > 0 && project.data.relationships.length > 0
    case 'design':
      return project.design.colors.length >= 3 && project.design.typography.length >= 3 && project.design.layout.nav.length > 0
    case 'sections':
      return sectionStats(project, captured).all
    case 'export':
      return sectionStats(project, captured).all && project.audit.checks.every((c) => c.status !== 'fail')
    default:
      return false
  }
}

export function completedPhases(project: Project, captured: string[]): Record<string, boolean> {
  return Object.fromEntries(PHASES.map((p) => [p.id, phaseComplete(project, captured, p.id)]))
}

/** Which artefacts exist, used by the Export readiness checklist. */
export function readiness(project: Project, captured: string[]) {
  const stats = sectionStats(project, captured)
  const screens = project.sections.reduce((n, s) => n + s.screens.length, 0)
  const shots = captured.length
  const fails = project.audit.checks.filter((c) => c.status === 'fail').length
  const warns = project.audit.checks.filter((c) => c.status === 'warn').length
  return [
    {
      label: 'Product brief',
      detail: `${project.brief.problems.length} problems · ${project.brief.personas.length} personas · ${project.brief.metrics.length} success measures`,
      state: phaseComplete(project, captured, 'product') ? 'pass' : 'fail',
    },
    {
      label: 'Data shape',
      detail: `${project.data.entities.length} entities · ${project.data.relationships.length} relationships · schema.sql`,
      state: phaseComplete(project, captured, 'data-shape') ? 'pass' : 'fail',
    },
    {
      label: 'Design tokens & shell',
      detail: `${project.design.colors.length} colour roles · ${project.design.typography.length} type roles · ${project.design.layout.shell} shell`,
      state: phaseComplete(project, captured, 'design') ? 'pass' : 'fail',
    },
    {
      label: `${project.sections.length} sections specified`,
      detail: `${project.sections.reduce((n, s) => n + s.requirements.length, 0)} requirements across the build order`,
      state: project.sections.length ? 'pass' : 'fail',
    },
    {
      label: `${screens} screen designs`,
      detail: `${shots} of ${screens} captured · ${stats.done} of ${stats.total} sections complete`,
      state: stats.all ? 'pass' : 'warn',
    },
    {
      label: 'Prototype system',
      detail: `${project.flows.length} flows · ${project.system.components.length} registry components · mock data layer`,
      state: project.flows.length >= 4 && project.system.components.length >= 10 ? 'pass' : 'warn',
    },
    {
      label: 'Audit',
      detail: `${project.audit.score}/100 · ${fails} fail · ${warns} warn`,
      state: fails ? 'fail' : warns ? 'warn' : 'pass',
    },
  ] as { label: string; detail: string; state: 'pass' | 'warn' | 'fail' }[]
}
