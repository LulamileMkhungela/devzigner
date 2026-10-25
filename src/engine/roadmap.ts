import type { Roadmap, RoadmapPhase, Section } from '../types'

export function compileRoadmap(sections: Section[], rngSeedNote: string): Roadmap {
  const mvp = sections.filter((s) => s.priority === 'MVP')
  const next = sections.filter((s) => s.priority === 'Next')
  const later = sections.filter((s) => s.priority === 'Later')

  const phase1 = mvp.slice(0, 2)
  const phase2 = mvp.slice(2)
  const phase3 = next
  const phase4 = later

  const phases: RoadmapPhase[] = [
    {
      id: 'phase-1',
      name: 'Foundation',
      horizon: 'Weeks 1–4',
      goal: 'Prove the core loop end to end with real data in it.',
      outcomes: [
        'Workspace shell, auth and role presets shipped',
        'Data model migrated with seed data and one import path',
        `First usable workflow: ${phase1[0]?.name ?? 'core workspace'}`,
        'Design tokens wired into the codebase and enforced in review',
      ].filter(Boolean),
      sectionIds: phase1.map((s) => s.id),
      risk: 'Trying to polish the shell before the core loop works.',
    },
    {
      id: 'phase-2',
      name: 'Core operations',
      horizon: 'Weeks 5–9',
      goal: 'Make the daily job faster than the spreadsheet it replaces.',
      outcomes: [
        ...phase2.map((s) => `${s.name}: ${s.purpose}`),
        'Bulk actions, saved filters and CSV import/export in place',
        'Audit log recording every state change with actor',
      ].slice(0, 5),
      sectionIds: phase2.map((s) => s.id),
      risk: 'Feature breadth outrunning data quality.',
    },
    {
      id: 'phase-3',
      name: 'Depth & trust',
      horizon: 'Weeks 10–16',
      goal: 'Close the commercial loop: reporting, permissions and integrations.',
      outcomes: [
        ...phase3.map((s) => `${s.name}: ${s.purpose}`),
        'Analytics derived from the same tables as the workflow',
        'Record-level permissions tested against the role matrix',
      ].slice(0, 5),
      sectionIds: phase3.map((s) => s.id),
      risk: 'Reporting built on assumptions rather than observed usage.',
    },
    {
      id: 'phase-4',
      name: 'Scale',
      horizon: 'Quarter 2 and beyond',
      goal: 'Make the product legible to teams who did not build it.',
      outcomes: [
        ...phase4.map((s) => `${s.name}: ${s.purpose}`),
        'Settings and onboarding self-serve without a call',
        'Performance budget held at 400ms for primary views',
      ].slice(0, 4),
      sectionIds: phase4.map((s) => s.id),
      risk: 'Admin features rebuilt as an afterthought instead of designed.',
    },
  ].filter((p) => p.sectionIds.length > 0)

  return {
    phases,
    sequencingNote:
      // One line, because the phases underneath already say the rest.
      `Ordered by dependency: foundation first, then ${phase2[0]?.name ?? 'the core loop'}. ` +
      `A phase is done when its sections are usable with real data. ` +
      rngSeedNote,
  }
}
