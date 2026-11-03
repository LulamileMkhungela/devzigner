// ProdOps — developed by Lulamile Mkhungela.
//
// Roles: the workspace can be run as one role, and a role owns a process from
// start to finish. The Business Analysis role shows the seven-step BA process
// and nothing else — not the design stages, and not database design, which
// lives in the data role. The rail, the page gates and the review actions all
// read from this one list, so every role gets the same start-to-finish
// treatment and the same three review actions on every step.

import type { Project } from '../types'
import type { ReviewDecision, StepReview } from '../types'
import { toolById, vendoredSkillPhases } from '../tools'

export type { ReviewDecision, StepReview } from '../types'

export interface RoleStep {
  id: string
  title: string
  /** What this step decides, in one sentence. */
  decides: string
  /** The artefacts the step leaves behind. */
  produces: string[]
  /** The page the step opens in the work area. */
  path: string
  icon: string
  /** Artefacts only: is there enough here to review? */
  ready: (p: Project) => boolean
  /** What still stands between the artefacts and a reviewable step. */
  blockers: (p: Project) => string[]
}

export interface RoleSkill {
  /** The toolkit entry whose SKILL.md (or template) guides this role. */
  toolId: string
  name: string
  path: string
  /** True when no skill existed for the role and one was created for it. */
  created?: boolean
}

export interface RoleDef {
  id: string
  name: string
  tag: string
  icon: string
  blurb: string
  /** The label the left panel prints under the role name, e.g. "… PROCESS · 7 STEPS". */
  processLabel: string
  steps: RoleStep[]
  /** ProdOps phase ids this role may open directly (design and data-shape are NOT in BA). */
  phases: string[]
  /** Workspace track pages this role may open. */
  track: string[]
  skill: RoleSkill
}

/** Shorthand so a step's blockers read like the phase blockers they mirror. */
function missing(...checks: [ok: boolean, what: string][]): string[] {
  return checks.filter(([ok]) => !ok).map(([, what]) => what)
}

export const ROLES: RoleDef[] = [
  {
    id: 'business-analysis',
    name: 'Business Analysis',
    tag: 'BA',
    icon: 'Briefcase',
    blurb:
      'The full analysis process, start to finish: vision to validated handoff. Design and database design belong to other roles and are not shown here.',
    processLabel: 'BUSINESS ANALYSIS PROCESS · 7 STEPS',
    phases: ['product', 'sections'],
    track: ['personas', 'flows', 'wiki'],
    skill: {
      toolId: 'business-analysis',
      name: 'Business Analysis skill',
      path: '.agents/skills/business-analysis/SKILL.md',
      created: true, // no tool on the toolkit covered BA, so one was created
    },
    steps: [
      {
        id: 'vision-outcome',
        title: 'Vision & outcome',
        icon: 'Target',
        path: '',
        decides: 'What the product is, who it is for, and what success looks like.',
        produces: ['Brief summary and elevator pitch', 'Success measures', 'The product name and tagline'],
        ready: (p) => Boolean(p.brief.summary) && p.brief.metrics.length > 0,
        blockers: (p) =>
          missing(
            [Boolean(p.brief.summary), 'the brief has no summary'],
            [p.brief.metrics.length > 0, 'no success measures yet'],
          ),
      },
      {
        id: 'stakeholders-scope',
        title: 'Stakeholders & scope',
        icon: 'Users',
        path: 'personas',
        decides: 'Who the product serves, and what is explicitly out of scope.',
        produces: ['Personas with goals, pains and quotes', 'Non-goals'],
        ready: (p) => p.brief.personas.length > 0 && p.brief.nonGoals.length > 0,
        blockers: (p) =>
          missing(
            [p.brief.personas.length > 0, 'no personas yet'],
            [p.brief.nonGoals.length > 0, 'nothing is marked out of scope'],
          ),
      },
      {
        id: 'current-state',
        title: 'Current state & problem',
        icon: 'Search',
        path: '',
        decides: 'The problem as it exists today, and what it costs.',
        produces: ['Problem statements with costs', 'Risks and mitigations'],
        ready: (p) => p.brief.problems.length >= 2 && p.brief.risks.length > 0,
        blockers: (p) =>
          missing(
            [p.brief.problems.length >= 2, 'fewer than two problem statements'],
            [p.brief.risks.length > 0, 'no risks recorded'],
          ),
      },
      {
        id: 'requirements',
        title: 'Requirements elicitation',
        icon: 'ClipboardList',
        path: 'sections',
        decides: 'Every requirement the product must meet, per section, prioritised must/should/could.',
        produces: ['Section specs with prioritised requirements'],
        ready: (p) => p.sections.length > 0 && p.sections.every((s) => s.requirements.length > 0),
        blockers: (p) =>
          missing(
            [p.sections.length > 0, 'no sections yet'],
            [p.sections.every((s) => s.requirements.length > 0), 'a section has no requirements'],
          ),
      },
      {
        id: 'analysis-prioritisation',
        title: 'Analysis & prioritisation',
        icon: 'ListChecks',
        path: '',
        decides: 'The roadmap: what ships first, and what makes the product different.',
        produces: ['Roadmap phases with outcomes', 'Differentiators', 'Scope decisions'],
        ready: (p) => p.roadmap.phases.length >= 2 && p.brief.differentiators.length > 0,
        blockers: (p) =>
          missing(
            [p.roadmap.phases.length >= 2, 'the roadmap has fewer than two milestones'],
            [p.brief.differentiators.length > 0, 'no differentiators'],
          ),
      },
      {
        id: 'solution-flows',
        title: 'Solution & future state',
        icon: 'Route',
        path: 'flows',
        decides: 'The user journeys the solution has to support, end to end.',
        produces: ['User flows with steps, success and failure paths'],
        ready: (p) => p.flows.length >= 2,
        blockers: (p) => missing([p.flows.length >= 2, 'fewer than two user flows']),
      },
      {
        id: 'validation-handoff',
        title: 'Validation & handoff',
        icon: 'ClipboardCheck',
        path: 'wiki',
        decides: 'That the analysis holds together and is written down for the next role.',
        produces: ['The product wiki', 'A passing audit'],
        ready: (p) => p.audit.score >= 80,
        blockers: (p) => missing([p.audit.score >= 80, `audit is ${p.audit.score}/100 — below 80`]),
      },
    ],
  },
  {
    id: 'data-design',
    name: 'Data & database design',
    tag: 'DB',
    icon: 'Database',
    blurb:
      'Database design lives here, not in the BA role: entities, fields, relationships, schema and constraints, seeded data, and the backend contract.',
    processLabel: 'DATABASE DESIGN PROCESS · 6 STEPS',
    phases: ['data-shape', 'sections', 'export'],
    track: ['system', 'wiki'],
    skill: {
      toolId: 'database-design',
      name: 'Database Design skill',
      path: '.agents/skills/database-design/SKILL.md',
      created: true, // no tool on the toolkit covered database design, so one was created
    },
    steps: [
      {
        id: 'entities',
        title: 'Entities',
        icon: 'Boxes',
        path: 'data-shape',
        decides: 'The things the product has to remember.',
        produces: ['Named entities with descriptions'],
        ready: (p) => p.data.entities.length > 0,
        blockers: (p) => missing([p.data.entities.length > 0, 'no entities yet']),
      },
      {
        id: 'fields-types',
        title: 'Fields & types',
        icon: 'List',
        path: 'data-shape',
        decides: 'Every field, its type, whether it is required, and an example value.',
        produces: ['Typed fields per entity, with notes'],
        ready: (p) => p.data.entities.every((e) => e.fields.length >= 3),
        blockers: (p) => missing([p.data.entities.every((e) => e.fields.length >= 3), 'an entity has fewer than three fields']),
      },
      {
        id: 'relationships',
        title: 'Relationships',
        icon: 'Link2',
        path: 'data-shape',
        decides: 'How the entities relate, enforced by the database rather than the UI.',
        produces: ['1:1 / 1:N / N:M relationships with labels'],
        ready: (p) => p.data.relationships.length > 0,
        blockers: (p) => missing([p.data.relationships.length > 0, 'no relationships yet']),
      },
      {
        id: 'schema-constraints',
        title: 'Schema & constraints',
        icon: 'FileCode',
        path: 'data-shape',
        decides: 'The generated schema: tables, keys, indexes on status and date columns, and the rules.',
        produces: ['schema.sql', 'Data-layer notes'],
        ready: (p) => p.data.sql.includes('create table') && p.data.notes.length > 0,
        blockers: (p) =>
          missing(
            [p.data.sql.includes('create table'), 'no schema generated'],
            [p.data.notes.length > 0, 'no data-layer notes'],
          ),
      },
      {
        id: 'sample-data',
        title: 'Sample data',
        icon: 'Layers',
        path: 'sections',
        decides: 'Seeded rows, so every screen has something real to render.',
        produces: ['Seeded rows per entity'],
        ready: (p) => p.data.entities.length > 0 && p.data.entities.every((e) => e.rows.length > 0),
        blockers: (p) => missing([p.data.entities.every((e) => e.rows.length > 0), 'an entity has no seeded rows']),
      },
      {
        id: 'backend-contract',
        title: 'Backend contract',
        icon: 'ShieldCheck',
        path: 'export',
        decides: 'The API contract and its rules the backend must honour.',
        produces: ['openapi.json', 'Status machine rules', 'Contract tests'],
        ready: (p) => p.audit.checks.every((c) => c.status !== 'fail'),
        blockers: (p) =>
          missing([p.audit.checks.every((c) => c.status !== 'fail'), `${p.audit.checks.filter((c) => c.status === 'fail').length} audit checks failing`]),
      },
    ],
  },
  {
    id: 'product-design',
    name: 'Product design',
    tag: 'Design',
    icon: 'Palette',
    blurb: 'Tokens, shell, section screens and the prototype — the design process from start to finish, on the design-system skill.',
    processLabel: 'DESIGN PROCESS · 5 STEPS',
    phases: ['design', 'sections'],
    track: ['prototype', 'editor', 'personas', 'flows', 'wiki'],
    skill: { toolId: 'design-system', name: 'Design System skill', path: '.agents/skills/design-system/SKILL.md' },
    steps: [
      {
        id: 'design-tokens',
        title: 'Design tokens',
        icon: 'Palette',
        path: 'design',
        decides: 'Colour roles, type roles, scale, radii, elevation and motion — as tokens, not screenshots.',
        produces: ['DTCG tokens.json and tokens.css', 'Contrast-checked colour roles'],
        ready: (p) => p.design.colors.length >= 3 && p.design.typography.length >= 3,
        blockers: (p) =>
          missing(
            [p.design.colors.length >= 3, 'fewer than three colour roles'],
            [p.design.typography.length >= 3, 'fewer than three type roles'],
          ),
      },
      {
        id: 'app-shell',
        title: 'App shell',
        icon: 'Layout',
        path: 'shell',
        decides: 'The frame every screen sits inside: navigation, header, page frame.',
        produces: ['Shell regions and navigation', 'Light and dark preview'],
        ready: (p) => p.design.layout.nav.length > 0,
        blockers: (p) => missing([p.design.layout.nav.length > 0, 'the shell has no navigation']),
      },
      {
        id: 'section-screens',
        title: 'Section screens',
        icon: 'LayoutList',
        path: 'sections',
        decides: 'The designed screen for every section, from the registry components only.',
        produces: ['One props-based component per screen', 'States and acceptance checks'],
        ready: (p) => p.sections.length > 0 && p.sections.every((s) => s.screens.length > 0),
        blockers: (p) => missing([p.sections.some((s) => s.screens.length > 0), 'no screens designed yet']),
      },
      {
        id: 'prototype',
        title: 'Prototype',
        icon: 'Play',
        path: 'prototype',
        decides: 'The screens running as one working app with real routes and seeded records.',
        produces: ['A walkable prototype'],
        ready: (p) => p.flows.length >= 1 && p.sections.length > 0,
        blockers: (p) => missing([p.sections.length > 0, 'no sections to prototype']),
      },
      {
        id: 'token-editor',
        title: 'Token editor',
        icon: 'Sliders',
        path: 'editor',
        decides: 'The final tuning of hue, radius, spacing and shell — every change recompiles downstream.',
        produces: ['Recorded overrides', 'A live preview of the effect'],
        ready: (p) => p.design.colors.length >= 3,
        blockers: () => [],
      },
    ],
  },
  {
    id: 'engineering',
    name: 'Engineering & handoff',
    tag: 'Eng',
    icon: 'Wrench',
    blurb: 'From approved design to a buildable handoff: specs, sample data, screenshots, the export package and the audit.',
    processLabel: 'BUILD & HANDOFF PROCESS · 5 STEPS',
    phases: ['sections', 'export'],
    track: ['system', 'wiki', 'coverage'],
    skill: { toolId: 'starter', name: 'Starter template', path: 'template/starter/' },
    steps: [
      {
        id: 'section-specs',
        title: 'Section specs',
        icon: 'FileText',
        path: 'sections',
        decides: 'The spec and tests each section must pass before it is built.',
        produces: ['Specs with requirements', 'tests.md per section'],
        ready: (p) => p.sections.length > 0 && p.sections.every((s) => s.requirements.length > 0 && s.tests.length > 0),
        blockers: (p) => missing([p.sections.every((s) => s.tests.length > 0), 'a section has no tests']),
      },
      {
        id: 'sample-data',
        title: 'Sample data',
        icon: 'Database',
        path: 'sections',
        decides: 'The seeded data the implementation renders against.',
        produces: ['sample-data.json per section'],
        ready: (p) => p.data.entities.length > 0 && p.data.entities.every((e) => e.rows.length > 0),
        blockers: (p) => missing([p.data.entities.every((e) => e.rows.length > 0), 'an entity has no seeded rows']),
      },
      {
        id: 'screens-shots',
        title: 'Screens & screenshots',
        icon: 'Image',
        path: 'sections',
        decides: 'Every designed screen captured, so the build can be checked against the design.',
        produces: ['One screenshot per screen'],
        ready: (p) => p.sections.length > 0 && p.sections.every((s) => s.screens.length > 0),
        blockers: (p) => missing([p.sections.some((s) => s.screens.length > 0), 'no screens designed yet']),
      },
      {
        id: 'export-package',
        title: 'Export package',
        icon: 'Package',
        path: 'export',
        decides: 'The complete handoff package a coding agent builds from.',
        produces: ['The ZIP: brief, data, tokens, sections, backend, wiki, toolkit'],
        ready: (p) => p.audit.checks.every((c) => c.status !== 'fail'),
        blockers: (p) =>
          missing([p.audit.checks.every((c) => c.status !== 'fail'), `${p.audit.checks.filter((c) => c.status === 'fail').length} audit checks failing`]),
      },
      {
        id: 'audit-coverage',
        title: 'Audit & coverage',
        icon: 'ShieldCheck',
        path: 'coverage',
        decides: 'That every artefact really is in the package — checked, not asserted.',
        produces: ['The parity audit'],
        ready: (p) => p.audit.score >= 80,
        blockers: (p) => missing([p.audit.score >= 80, `audit is ${p.audit.score}/100 — below 80`]),
      },
    ],
  },
]

export function roleById(id?: string): RoleDef | undefined {
  return ROLES.find((role) => role.id === id)
}

/** Reviews are keyed per role, so two roles never share a step id's decision. */
export function reviewKey(roleId: string, stepId: string): string {
  return `${roleId}.${stepId}`
}

export function stepReview(project: Project, role: RoleDef, step: RoleStep): StepReview | undefined {
  return project.stepReviews?.[reviewKey(role.id, step.id)]
}

export type StepState = ReviewDecision | 'ready' | 'todo'

/**
 * Where a step stands: the builder's review decision if there is one, else
 * 'ready' when the artefacts are there to review, else 'todo'.
 */
export function stepState(project: Project, role: RoleDef, step: RoleStep): StepState {
  const review = stepReview(project, role, step)
  if (review) return review.decision
  return step.ready(project) ? 'ready' : 'todo'
}

/** The first step that is not approved — what the rail points at next. */
export function nextRoleStep(project: Project, role: RoleDef): RoleStep {
  return role.steps.find((step) => stepReview(project, role, step)?.decision !== 'approved') ?? role.steps[role.steps.length - 1]
}

export function roleProgress(project: Project, role: RoleDef): { approved: number; total: number } {
  const approved = role.steps.filter((step) => stepReview(project, role, step)?.decision === 'approved').length
  return { approved, total: role.steps.length }
}

/** Pages of the canon (tools, library, kits) open under every role. */
const CANON = ['tools', 'library', 'kits']
const PHASE_BY_PATH: Record<string, string> = {
  'data-shape': 'data-shape',
  design: 'design',
  shell: 'design',
  sections: 'sections',
  export: 'export',
}

/**
 * May this role open the route whose first segment is `top`? '' is the
 * Product stage. A role never opens another role's stages — that is why a
 * BA workspace does not show design stuff.
 */
export function roleAllows(role: RoleDef, top: string): boolean {
  if (top === '') return role.phases.includes('product')
  if (top === 'role') return true
  if (CANON.includes(top)) return true
  const phase = PHASE_BY_PATH[top]
  if (phase) return role.phases.includes(phase)
  return role.track.includes(top)
}

/** The skill that guides a role: its parsed steps come from its own instruction file. */
export function roleSkill(role: RoleDef): {
  toolId: string
  name: string
  path: string
  created: boolean
  blurb: string
  steps: string[]
  stepFiles?: string[]
} {
  const tool = toolById(role.skill.toolId)
  const parsed = vendoredSkillPhases(role.skill.toolId)
  return {
    toolId: role.skill.toolId,
    name: role.skill.name ?? tool?.name ?? role.skill.toolId,
    path: role.skill.path,
    created: role.skill.created ?? false,
    blurb: tool?.blurb ?? '',
    steps: parsed.steps.length ? parsed.steps : tool?.steps ?? [],
    stepFiles: parsed.stepFiles ?? tool?.stepFiles,
  }
}
