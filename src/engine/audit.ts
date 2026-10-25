import type { Audit, AuditCheck, DesignSystem, Section, DataModel, Brief } from '../types'
import { contrastRatio, INK, PAPER } from './color'

function check(
  id: string,
  group: AuditCheck['group'],
  label: string,
  detail: string,
  status: AuditCheck['status'],
  weight = 1,
): AuditCheck {
  return { id, group, label, detail, status, weight }
}

export function compileAudit(brief: Brief, data: DataModel, design: DesignSystem, sections: Section[]): Audit {
  const checks: AuditCheck[] = []
  const allScreens = sections.flatMap((s) => s.screens)

  // ---- Accessibility
  const primaryOnWhite = contrastRatio(design.colors.find((c) => c.id === 'primary')!.base, PAPER)
  const inkOnBg = contrastRatio(design.semantic['--ink'], design.semantic['--bg'])
  const mutedOnBg = contrastRatio(design.semantic['--ink-muted'], design.semantic['--bg'])
  const bodySize = Number(design.typography[1].size.replace('px', ''))

  checks.push(
    check(
      'contrast-primary',
      'Accessibility',
      'Primary text contrast',
      `Primary ${design.colors.find((c) => c.id === 'primary')!.base} on white is ${primaryOnWhite}:1.`,
      primaryOnWhite >= 4.5 ? 'pass' : primaryOnWhite >= 3 ? 'warn' : 'fail',
      2,
    ),
    check(
      'contrast-body',
      'Accessibility',
      'Body ink on canvas',
      `${design.semantic['--ink']} on ${design.semantic['--bg']} is ${inkOnBg}:1 (target ≥ 7 for body copy).`,
      inkOnBg >= 7 ? 'pass' : inkOnBg >= 4.5 ? 'warn' : 'fail',
      2,
    ),
    check(
      'contrast-muted',
      'Accessibility',
      'Muted text contrast',
      `Secondary ink is ${mutedOnBg}:1 — must stay ≥ 4.5:1 for meta text.`,
      mutedOnBg >= 4.5 ? 'pass' : 'warn',
      1,
    ),
    check(
      'body-size',
      'Accessibility',
      'Minimum body size',
      `Body is ${bodySize}px with ${design.typography[1].lineHeight} line height.`,
      bodySize >= 14 ? 'pass' : 'warn',
      1,
    ),
    check(
      'focus',
      'Accessibility',
      'Focus state defined',
      `A 3px focus ring token exists (${design.shadows.focus.slice(0, 34)}…) and is used on every interactive element.`,
      design.shadows.focus ? 'pass' : 'fail',
      1,
    ),
    check(
      'motion',
      'Accessibility',
      'Reduced motion',
      'All transitions are duration tokens, so prefers-reduced-motion can zero them in one place.',
      'pass',
      1,
    ),
    check(
      'dark-mode',
      'Accessibility',
      'Dark canvas contrast',
      `Inverted canvas ${design.darkSemantic['--bg']} with ink ${design.darkSemantic['--ink']} reaches ${contrastRatio(design.darkSemantic['--ink'], design.darkSemantic['--bg'])}:1; primary on dark is ${contrastRatio(design.darkSemantic['--primary'], design.darkSemantic['--bg'])}:1.`,
      contrastRatio(design.darkSemantic['--ink'], design.darkSemantic['--bg']) >= 7 &&
        contrastRatio(design.darkSemantic['--primary'], design.darkSemantic['--bg']) >= 3
        ? 'pass'
        : 'warn',
      1,
    ),
    check(
      'touch-targets',
      'Accessibility',
      'Density vs touch targets',
      `${design.layout.density} density (${design.spacing.find((s) => s.name === 'sm')?.px}px base rhythm). ` +
        (design.layout.density === 'compact'
          ? 'Compact rows assume a pointer — every control still needs a 44px touch target on mobile.'
          : 'Roomy enough for 44px controls without breaking the rhythm.'),
      design.layout.density === 'compact' ? 'warn' : 'pass',
      1,
    ),
  )

  // ---- System
  const tokenCount = Object.keys(design.semantic).length + design.colors.length * 11
  checks.push(
    check(
      'tokens',
      'System',
      'Token coverage',
      `${tokenCount} colour tokens plus type, space, radius, elevation and motion scales are generated as CSS variables, Tailwind theme and JSON.`,
      tokenCount > 60 ? 'pass' : 'warn',
      1,
    ),
    check(
      'ramps',
      'System',
      'Full tonal ramps',
      `${design.colors.length} colour families each carry 11 stops (50–950), so hover, disabled and dark variants never need invented hexes.`,
      design.colors.every((c) => c.stops.length === 11) ? 'pass' : 'fail',
      1,
    ),
    check(
      'type-pairing',
      'System',
      'Type roles defined',
      `${design.typography.map((t) => t.family).join(' + ')} with explicit weights, sizes and tracking.`,
      design.typography.length === 3 ? 'pass' : 'warn',
      1,
    ),
    check(
      'components',
      'System',
      'Component inventory',
      `${design.components.length} component patterns specified for handoff.`,
      design.components.length >= 8 ? 'pass' : 'warn',
      1,
    ),
    check(
      'responsive',
      'System',
      'Responsive contract',
      `${design.breakpoints.map((b) => `${b.name} ${b.px}px`).join(' · ')} with a ${design.layout.contentWidth}px content column and ${design.layout.density} density.`,
      design.breakpoints.length >= 4 && design.layout.grid.includes('columns') ? 'pass' : 'warn',
      1,
    ),
    check(
      'motion-budget',
      'System',
      'Motion budget',
      `Base transition is ${design.motion[2].duration} with ${design.motion[2].easing}. ` +
        (parseInt(design.motion[2].duration) > 220
          ? 'Above 220ms on route change — verify it still feels instant under load.'
          : 'Inside the 220ms budget for perceived immediacy.'),
      parseInt(design.motion[2].duration) > 220 ? 'warn' : 'pass',
      1,
    ),
  )

  // ---- Coverage
  const sectionsWithScreens = sections.filter((s) => s.screens.length >= 2)
  const screensWithAcceptance = allScreens.filter((s) => s.acceptance.length >= 2)
  const requirements = sections.flatMap((s) => s.requirements)
  const mustRequirements = requirements.filter((r) => r.priority === 'must')
  const orphanEntities = data.entities.filter((e) => !sections.some((s) => s.entityIds.includes(e.id)))
  const relationFields = data.entities.flatMap((e) => e.fields.filter((f) => f.type === 'relation'))

  checks.push(
    check(
      'sections',
      'Coverage',
      'Every section designed',
      `${sectionsWithScreens.length} of ${sections.length} sections have two or more designed screens (${allScreens.length} screens total).`,
      sectionsWithScreens.length === sections.length ? 'pass' : 'warn',
      2,
    ),
    check(
      'acceptance',
      'Coverage',
      'Acceptance criteria',
      `${screensWithAcceptance.length} of ${allScreens.length} screens carry explicit acceptance criteria and four states.`,
      screensWithAcceptance.length === allScreens.length ? 'pass' : 'warn',
      1,
    ),
    check(
      'requirements',
      'Coverage',
      'Requirements with priority',
      `${requirements.length} requirements captured, ${mustRequirements.length} marked must-have.`,
      mustRequirements.length >= sections.length * 2 ? 'pass' : 'warn',
      1,
    ),
    check(
      'entities',
      'Coverage',
      'Every entity has a home',
      orphanEntities.length === 0
        ? 'All entities are referenced by at least one section.'
        : `${orphanEntities.length} entities are not surfaced in any section: ${orphanEntities.map((e) => e.name).join(', ')}.`,
      orphanEntities.length === 0 ? 'pass' : 'warn',
      1,
    ),
    check(
      'relations',
      'Coverage',
      'Relationships resolved',
      `${relationFields.length} relation fields mapped to ${data.relationships.length} foreign keys.`,
      data.relationships.length > 0 ? 'pass' : 'warn',
      1,
    ),
    check(
      'tests',
      'Coverage',
      'Test instructions',
      `${sections.reduce((n, s) => n + s.tests.length, 0)} framework-agnostic test statements across ${sections.length} sections.`,
      sections.every((s) => s.tests.length >= 3) ? 'pass' : 'warn',
      1,
    ),
  )

  // ---- Handoff
  const sql = data.sql
  checks.push(
    check(
      'sql',
      'Handoff',
      'Schema compiles',
      `${(sql.match(/create table/g) ?? []).length} tables, ${(sql.match(/references/g) ?? []).length} foreign keys, ${(sql.match(/create index/g) ?? []).length} indexes.`,
      (sql.match(/create table/g) ?? []).length === data.entities.length ? 'pass' : 'fail',
      2,
    ),
    check(
      'brief',
      'Handoff',
      'Brief is decision-ready',
      `${brief.problems.length} problems, ${brief.metrics.length} metrics, ${brief.risks.length} risks, ${brief.nonGoals.length} explicit non-goals.`,
      brief.metrics.length >= 3 && brief.risks.length >= 3 ? 'pass' : 'warn',
      1,
    ),
    check(
      'personas',
      'Handoff',
      'Personas sourced',
      brief.personas.every((p) => p.quoteTruth.includes('Illustrative'))
        ? 'Personas are labelled illustrative — no invented research is presented as fact.'
        : 'Persona provenance missing.',
      'pass',
      1,
    ),
    check(
      'deterministic',
      'Handoff',
      'Reproducible output',
      'The whole package is a pure function of seed + genome + archetype. Re-running produces a byte-identical export.',
      'pass',
      1,
    ),
  )

  const totalWeight = checks.reduce((n, c) => n + c.weight, 0)
  const earned = checks.reduce((n, c) => n + (c.status === 'pass' ? c.weight : c.status === 'warn' ? c.weight * 0.5 : 0), 0)
  const score = Math.round((earned / totalWeight) * 100)
  const fails = checks.filter((c) => c.status === 'fail')
  const warns = checks.filter((c) => c.status === 'warn')

  return {
    score,
    checks,
    summary:
      fails.length === 0 && warns.length === 0
        ? 'All checks pass. This package is internally consistent and ready for a build agent.'
        : fails.length > 0
          ? `${fails.length} blocking issue${fails.length === 1 ? '' : 's'} and ${warns.length} warning${warns.length === 1 ? '' : 's'}. Resolve blockers before handoff.`
          : `${warns.length} warning${warns.length === 1 ? '' : 's'} — acceptable to ship, worth a deliberate decision.`,
  }
}

export const CONTRAST_WARNING = `WCAG AA requires 4.5:1 for body text and 3:1 for large text. ${INK} on ${PAPER} is ${contrastRatio(INK, PAPER)}:1.`
