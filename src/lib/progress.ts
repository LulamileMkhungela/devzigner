import type { Project, Section } from '../types'

export interface PhaseDef {
  id: string
  label: string
  path: string
  icon: string
}

/** The five phases of the ProdOps flow, in order. */
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

/**
 * Artefacts only: is there enough for the stage to be reviewable?
 * This is what the readiness checklist and the confirm button's enabled state
 * ask. It is not what draws the tick.
 */
export function phaseReady(project: Project, captured: string[], phaseId: string): boolean {
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

/** What still stands between the artefacts and a stage the builder can confirm. */
export function phaseBlockers(project: Project, captured: string[], phaseId: string): string[] {
  const stats = sectionStats(project, captured)
  switch (phaseId) {
    case 'product':
      return [
        project.brief.summary ? '' : 'the brief needs a summary',
        project.roadmap.phases.length ? '' : 'the roadmap needs at least one milestone',
      ].filter(Boolean)
    case 'data-shape':
      return [
        project.data.entities.length ? '' : 'no entities yet',
        project.data.relationships.length ? '' : 'no relationships yet',
      ].filter(Boolean)
    case 'design':
      return [
        project.design.colors.length >= 3 ? '' : 'fewer than three colour roles',
        project.design.typography.length >= 3 ? '' : 'fewer than three type roles',
        project.design.layout.nav.length ? '' : 'the shell has no navigation',
      ].filter(Boolean)
    case 'sections': {
      const open = stats.total - stats.done
      return open === 0 ? [] : [`${open} of ${stats.total} sections still have steps open`]
    }
    case 'export': {
      const blockers = phaseBlockers(project, captured, 'sections')
      const fails = project.audit.checks.filter((check) => check.status === 'fail').length
      if (fails) blockers.push(`${fails} audit check${fails === 1 ? '' : 's'} failing`)
      return blockers
    }
    default:
      return []
  }
}

/** Ticks the builder has actually earned: artefacts complete *and* confirmed. */
export function confirmedPhases(project: Project): string[] {
  return project.progress?.confirmed ?? []
}

export function isStageDone(project: Project, captured: string[], phaseId: string): boolean {
  return phaseReady(project, captured, phaseId) && confirmedPhases(project).includes(phaseId)
}

export function completedPhases(project: Project, captured: string[]): Record<string, boolean> {
  return Object.fromEntries(PHASES.map((p) => [p.id, isStageDone(project, captured, p.id)]))
}

/** The first stage that is not confirmed yet — what the shell points at next. */
export function nextStage(project: Project, captured: string[]): PhaseDef {
  return PHASES.find((phase) => !isStageDone(project, captured, phase.id)) ?? PHASES[PHASES.length - 1]
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
      state: phaseReady(project, captured, 'product') ? 'pass' : 'fail',
    },
    {
      label: 'Data shape',
      detail: `${project.data.entities.length} entities · ${project.data.relationships.length} relationships · schema.sql`,
      state: phaseReady(project, captured, 'data-shape') ? 'pass' : 'fail',
    },
    {
      label: 'Design tokens & shell',
      detail: `${project.design.colors.length} colour roles · ${project.design.typography.length} type roles · ${project.design.layout.shell} shell`,
      state: phaseReady(project, captured, 'design') ? 'pass' : 'fail',
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
