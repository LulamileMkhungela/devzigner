// ProdOps — developed by Lulamike Mkhungela.
//
// Roles: a workspace runs as one or more roles, and every role owns its
// process from start to finish. Nothing from another role leaks in — a
// Business Analysis workspace shows the BA process and never the design
// stages, and database design is its own role rather than a BA step.
//
// Each role is made of *tracks* (the disciplines inside it) and each track of
// numbered *steps*. A step asks its clarifying questions before it can be
// approved, names the deliverables it leaves behind (a spec, a process map, a
// roadmap, a visual), and carries the same three review actions as every other
// step: approved / rejected / can proceed but needs a revisit.
//
// The whole thing is data, so the rail, the gates, the inspector, the docs and
// the export all read from this one list and cannot drift apart.

import type { Project, RoleArtifact } from '../types'
import { toolById, vendoredSkillPhases } from '../tools'

export type { ReviewDecision, StepReview } from '../types'

/** A question a step must ask before it can be signed off. */
export interface ClarifyingQuestion {
  /** The question, in the voice of the role asking it. */
  question: string
  /** Why it is asked — so the builder can answer well, not guess. */
  why: string
}

/** The kinds of document a step can generate and save into the spec folder. */
export type DeliverableKind = 'spec' | 'process' | 'roadmap' | 'markdown' | 'visual'

export interface Deliverable {
  kind: DeliverableKind
  /** The file it writes under the handoff, e.g. `spec/business-analysis/01-vision-outcome.md`. */
  file: string
  label: string
}

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
  /** The discipline inside the role this step belongs to. */
  track: string
  /** Asked before the step can be approved. */
  questions: ClarifyingQuestion[]
  /** What this step can generate and save into the spec folder. */
  deliverables: Deliverable[]
  /** Steps that open a visual surface rather than a page. */
  surface?: 'visual' | 'tokens'
  /** Are the artefacts (independent of the questions) here? */
  ready: (p: Project) => boolean
  /** What still stands between the artefacts and a reviewable step. */
  blockers: (p: Project) => string[]
}

export interface RoleTrack {
  id: string
  label: string
  blurb: string
  icon: string
  /** The step ids in this track, in order. */
  steps: string[]
}

export interface RoleSkill {
  /** The toolkit entry whose SKILL.md (or template) guides this role. */
  toolId: string
  name: string
  path: string
  /** Extra instruction files that make up the role's playbook. */
  more?: string[]
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
  /** The role's disciplines, in the order they run. */
  tracks: RoleTrack[]
  steps: RoleStep[]
  /** ProdOps phase ids this role may open directly. */
  phases: string[]
  /** Workspace track pages this role may open. */
  track: string[]
  skill: RoleSkill
  /** Does this role design the interface (and so get the visual editor)? */
  designRole?: boolean
}

/** Shorthand so a step's blockers read like the phase blockers they mirror. */
function missing(...checks: [ok: boolean, what: string][]): string[] {
  return checks.filter(([ok]) => !ok).map(([, what]) => what)
}

/** Shorthand for a pair of clarifying questions. */
function q(question: string, why: string): ClarifyingQuestion {
  return { question, why }
}

/** A markdown deliverable the step writes into the spec folder. */
function doc(kind: DeliverableKind, file: string, label: string): Deliverable {
  return { kind, file, label }
}

/** The review decision key: reviews are per role *and* step. */
export function reviewKey(roleId: string, stepId: string): string {
  return `${roleId}.${stepId}`
}

/** The answer key: a question belongs to a role, a step and its index. */
export function answerKey(roleId: string, stepId: string, index: number): string {
  return `${roleId}.${stepId}.q${index + 1}`
}

/* ==========================================================================
   The roles
   ========================================================================== */

const BA_SKILL: RoleSkill = {
  toolId: 'business-analysis',
  name: 'Business Analysis skill',
  path: '.agents/skills/business-analysis/SKILL.md',
  created: true, // no tool on the toolkit covered BA, so one was created
}

const DB_SKILL: RoleSkill = {
  toolId: 'database-design',
  name: 'Database Design skill',
  path: '.agents/skills/database-design/SKILL.md',
  created: true,
}

const PRODUCT_DESIGN_SKILL: RoleSkill = {
  toolId: 'product-design',
  name: 'Product Design skill',
  path: '.agents/skills/product-design/SKILL.md',
  more: [
    '.agents/skills/design-system/SKILL.md',
    '.agents/skills/frontend-design/SKILL.md',
    '.agents/skills/ux-research/SKILL.md',
  ],
  created: true,
}

const RESEARCH_SKILL: RoleSkill = {
  toolId: 'ux-research',
  name: 'UX Research skill',
  path: '.agents/skills/ux-research/SKILL.md',
  created: true,
}

const CX_SKILL: RoleSkill = {
  toolId: 'cx-design',
  name: 'Customer Experience skill',
  path: '.agents/skills/cx-design/SKILL.md',
  created: true,
}

const QA_SKILL: RoleSkill = {
  toolId: 'qa-testing',
  name: 'QA & testing skill',
  path: '.agents/skills/qa-testing/SKILL.md',
  created: true,
}

const DEVOPS_SKILL: RoleSkill = {
  toolId: 'devops',
  name: 'DevOps skill',
  path: '.agents/skills/devops/SKILL.md',
  created: true,
}

const PM_SKILL: RoleSkill = {
  toolId: 'project-management',
  name: 'Project Management skill',
  path: '.agents/skills/project-management/SKILL.md',
  created: true,
}

const DATA_SKILL: RoleSkill = {
  toolId: 'data-analysis',
  name: 'Data Analysis skill',
  path: '.agents/skills/data-analysis/SKILL.md',
  created: true,
}

const UI_SKILL: RoleSkill = {
  toolId: 'ui-design',
  name: 'UI Design skill',
  path: '.agents/skills/ui-design/SKILL.md',
  created: true,
  more: ['.agents/skills/design-system/SKILL.md', '.agents/skills/frontend-design/SKILL.md'],
}

const ENG_SKILL: RoleSkill = {
  toolId: 'starter',
  name: 'Starter template',
  path: 'template/starter/',
  more: ['.agents/skills/agents-repo/SKILL.md', '.agents/skills/agents-manifest/SKILL.md'],
}

/** Has the builder answered every clarifying question on this step? */
export function stepAnswers(project: Project, role: RoleDef, step: RoleStep): string[] {
  return step.questions.map((_, i) => (project.answers ?? {})[answerKey(role.id, step.id, i)] ?? '')
}

export function stepQuestionsAnswered(project: Project, role: RoleDef, step: RoleStep): number {
  return stepAnswers(project, role, step).filter((a) => a.trim().length > 0).length
}

export const ROLES: RoleDef[] = [
  /* ------------------------------------------------------------------ BA -- */
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
    skill: BA_SKILL,
    tracks: [
      {
        id: 'discovery',
        label: 'Discovery',
        blurb: 'Vision, people and the problem as it stands today.',
        icon: 'Search',
        steps: ['vision-outcome', 'stakeholders', 'current-state'],
      },
      {
        id: 'definition',
        label: 'Definition',
        blurb: 'Requirements, priorities and the future state they imply.',
        icon: 'ClipboardList',
        steps: ['requirements', 'prioritisation', 'solution-flows'],
      },
      {
        id: 'handoff',
        label: 'Validate & hand off',
        blurb: 'Prove the analysis holds and write it down for the next role.',
        icon: 'ClipboardCheck',
        steps: ['handoff'],
      },
    ],
    steps: [
      {
        id: 'vision-outcome',
        title: 'Vision & outcome',
        icon: 'Target',
        path: '',
        track: 'discovery',
        decides: 'What the product is, who it is for, and what success looks like.',
        produces: ['Brief summary and elevator pitch', 'Success measures', 'The product name and tagline'],
        questions: [
          q('In one sentence, what changes for the person you are building this for?', 'A vision that names a change rather than a feature is the one everybody can agree on.'),
          q('What number or event proves it worked, and by when?', 'A success measure with a date turns the vision into something a review can approve or reject.'),
        ],
        deliverables: [doc('spec', 'spec/business-analysis/01-vision-outcome.md', 'Vision spec')],
        ready: (p) => Boolean(p.brief.summary) && p.brief.metrics.length > 0,
        blockers: (p) =>
          missing(
            [Boolean(p.brief.summary), 'the brief has no summary'],
            [p.brief.metrics.length > 0, 'no success measures yet'],
          ),
      },
      {
        id: 'stakeholders',
        title: 'Stakeholders & scope',
        icon: 'Users',
        path: 'personas',
        track: 'discovery',
        decides: 'Who the product serves, who decides, and what is explicitly out of scope.',
        produces: ['Personas with goals, pains and quotes', 'Decision makers', 'Non-goals'],
        questions: [
          q('Who signs this off, and who will be annoyed by it?', 'The decision maker and the objector both shape scope — one funds it, the other blocks it.'),
          q('What is deliberately out of scope for the first release?', 'Explicit non-goals stop the build from quietly growing.'),
        ],
        deliverables: [doc('spec', 'spec/business-analysis/02-stakeholders.md', 'Stakeholder & scope spec')],
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
        track: 'discovery',
        decides: 'The problem as it exists today, what it costs, and what could go wrong.',
        produces: ['Problem statements with costs', 'Risks and mitigations', 'The as-is process'],
        questions: [
          q('How is this done today, step by step?', 'The as-is process is the baseline the to-be process is measured against.'),
          q('What is the cost of getting it wrong — money, time, or trust?', 'A cost makes the problem worth solving and sizes the risk appetite.'),
        ],
        deliverables: [
          doc('process', 'spec/business-analysis/03-current-state-process.md', 'As-is process'),
          doc('spec', 'spec/business-analysis/03-current-state.md', 'Problem & risk spec'),
        ],
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
        track: 'definition',
        decides: 'Every requirement the product must meet, per section, prioritised must/should/could.',
        produces: ['Section specs with prioritised requirements'],
        questions: [
          q('Which requirement would you cut if the budget halved?', 'Forcing a cut separates the must-haves from the nice-to-haves.'),
          q('Which rule must the system never break?', 'One hard rule per product catches most of the expensive late surprises.'),
        ],
        deliverables: [doc('spec', 'spec/business-analysis/04-requirements.md', 'Requirements spec')],
        ready: (p) => p.sections.length > 0 && p.sections.every((s) => s.requirements.length > 0),
        blockers: (p) =>
          missing(
            [p.sections.length > 0, 'no sections yet'],
            [p.sections.every((s) => s.requirements.length > 0), 'a section has no requirements'],
          ),
      },
      {
        id: 'prioritisation',
        title: 'Analysis & prioritisation',
        icon: 'ListChecks',
        path: '',
        track: 'definition',
        decides: 'The roadmap: what ships first, what it costs, and what makes the product different.',
        produces: ['Roadmap phases with outcomes', 'Differentiators', 'Scope decisions'],
        questions: [
          q('What has to be true before the first release can ship?', 'A release gate is what stops “just one more feature” from delaying everything.'),
          q('What can the team do that a competitor could not copy in a month?', 'The answer is the positioning, and it belongs in the roadmap rather than a slide.'),
        ],
        deliverables: [
          doc('roadmap', 'spec/business-analysis/05-roadmap.md', 'Roadmap'),
          doc('spec', 'spec/business-analysis/05-prioritisation.md', 'Prioritisation spec'),
        ],
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
        track: 'definition',
        decides: 'The user journeys the solution has to support, end to end.',
        produces: ['User flows with steps, success and failure paths'],
        questions: [
          q('Walk the main journey from trigger to done — where could it break?', 'A flow is only useful if its failure path is designed too.'),
          q('Which step needs a human decision, and who makes it?', 'The human handoffs are where a future state is won or lost.'),
        ],
        deliverables: [doc('process', 'spec/business-analysis/06-future-state-process.md', 'To-be process')],
        ready: (p) => p.flows.length >= 2,
        blockers: (p) => missing([p.flows.length >= 2, 'fewer than two user flows']),
      },
      {
        id: 'handoff',
        title: 'Validation & handoff',
        icon: 'ClipboardCheck',
        path: 'wiki',
        track: 'handoff',
        decides: 'That the analysis holds together, and that it is written down for the roles that follow.',
        produces: ['The product wiki', 'The saved spec folder', 'A passing audit'],
        questions: [
          q('Which assumption would sink this if it turned out to be wrong?', 'The riskiest assumption is what validation should test first.'),
          q('Who picks this up next, and what do they need first?', 'A handoff is written for a named reader, not for the file system.'),
        ],
        deliverables: [doc('spec', 'spec/business-analysis/07-handoff.md', 'Handoff brief')],
        ready: (p) => p.audit.score >= 80,
        blockers: (p) => missing([p.audit.score >= 80, `audit is ${p.audit.score}/100 — below 80`]),
      },
    ],
  },

  /* -------------------------------------------------------- data analysis -- */
  {
    id: 'data-analysis',
    name: 'Data analysis',
    tag: 'Data',
    icon: 'Gauge',
    blurb: 'From the question to the recommendation: metrics, sources, the analysis model and the insight that changes a decision.',
    processLabel: 'DATA ANALYSIS PROCESS · 5 STEPS',
    phases: ['product', 'data-shape'],
    track: ['wiki'],
    skill: DATA_SKILL,
    tracks: [
      {
        id: 'frame',
        label: 'Frame the question',
        blurb: 'What decision the analysis has to inform.',
        icon: 'Target',
        steps: ['question', 'metrics'],
      },
      {
        id: 'analyse',
        label: 'Analyse',
        blurb: 'Sources, the model, and the evidence.',
        icon: 'Database',
        steps: ['sources', 'model'],
      },
      {
        id: 'decide',
        label: 'Recommend',
        blurb: 'The insight, its confidence, and what to do next.',
        icon: 'TrendingUp',
        steps: ['recommendation'],
      },
    ],
    steps: [
      {
        id: 'question',
        title: 'The decision question',
        icon: 'Target',
        path: '',
        track: 'frame',
        decides: 'The decision this analysis informs, and what answer would change it.',
        produces: ['A written decision question', 'The stakeholders who will act on it'],
        questions: [
          q('What decision will this analysis change?', 'Analysis without a decision attached is trivia with charts.'),
          q('What answer would make you do something different?', 'Naming the trigger conditions stops the analysis from being unfalsifiable.'),
        ],
        deliverables: [doc('spec', 'spec/data-analysis/01-decision-question.md', 'Decision question spec')],
        ready: (p) => Boolean(p.brief.summary) && p.brief.metrics.length > 0,
        blockers: (p) => missing([Boolean(p.brief.summary), 'no decision question written']),
      },
      {
        id: 'metrics',
        title: 'Metrics & KPIs',
        icon: 'ListChecks',
        path: '',
        track: 'frame',
        decides: 'The measures that answer the question, their definitions and their targets.',
        produces: ['A metric tree with definitions', 'Baselines and targets'],
        questions: [
          q('How is each metric defined, exactly — what counts and what does not?', 'Two teams with different definitions produce two different answers for the same question.'),
          q('What is the baseline today, and what would good look like?', 'Without a baseline a target is a wish.'),
        ],
        deliverables: [doc('spec', 'spec/data-analysis/02-metrics.md', 'Metrics definition')],
        ready: (p) => p.brief.metrics.length >= 2,
        blockers: (p) => missing([p.brief.metrics.length >= 2, 'fewer than two metrics defined']),
      },
      {
        id: 'sources',
        title: 'Data sources & quality',
        icon: 'Database',
        path: 'data-shape',
        track: 'analyse',
        decides: 'Where the numbers come from, how fresh they are, and where they are wrong.',
        produces: ['A source inventory', 'Known gaps and biases'],
        questions: [
          q('Which source is the system of record, and which is a copy?', 'A copy that everyone trusts instead of the source is how two dashboards disagree.'),
          q('Where is the data known to be missing or biased?', 'Naming the gap keeps the conclusion honest.'),
        ],
        deliverables: [doc('spec', 'spec/data-analysis/03-sources.md', 'Source inventory')],
        ready: (p) => p.data.entities.length > 0,
        blockers: (p) => missing([p.data.entities.length > 0, 'no entities to source data from']),
      },
      {
        id: 'model',
        title: 'Analysis model',
        icon: 'Link2',
        path: 'data-shape',
        track: 'analyse',
        decides: 'The joins, segments and cohorts that turn raw tables into an answer.',
        produces: ['Documented joins and segments', 'The query shape, in words'],
        questions: [
          q('Which segments must be compared, and why those?', 'A segment that cannot change a decision is a table nobody reads.'),
          q('What would a false positive look like here?', 'Naming the failure mode keeps the analysis from confirming what you hoped.'),
        ],
        deliverables: [doc('spec', 'spec/data-analysis/04-model.md', 'Analysis model')],
        ready: (p) => p.data.relationships.length > 0,
        blockers: (p) => missing([p.data.relationships.length > 0, 'no relationships documented yet']),
      },
      {
        id: 'recommendation',
        title: 'Insight & recommendation',
        icon: 'TrendingUp',
        path: 'wiki',
        track: 'decide',
        decides: 'The answer, its confidence, and the recommendation that follows.',
        produces: ['The insight, with confidence', 'A recommendation and its owner'],
        questions: [
          q('What is the single sentence you would say to the decision maker?', 'If the finding cannot survive one sentence it is not ready.'),
          q('How confident are you, and what would raise that confidence?', 'Confidence plus the next cheap test is what makes a recommendation actionable.'),
        ],
        deliverables: [doc('spec', 'spec/data-analysis/05-recommendation.md', 'Insight & recommendation')],
        ready: (p) => p.audit.score >= 70,
        blockers: (p) => missing([p.audit.score >= 70, `audit is ${p.audit.score}/100 — below 70`]),
      },
    ],
  },

  /* --------------------------------------------------------- ux research -- */
  {
    id: 'ux-research',
    name: 'UX research',
    tag: 'UX',
    icon: 'MessagesSquare',
    blurb: 'The research half of the design process: what to learn, who to ask, what they said, and what it means.',
    processLabel: 'UX RESEARCH PROCESS · 5 STEPS',
    phases: ['product', 'sections'],
    track: ['personas', 'flows', 'wiki'],
    skill: RESEARCH_SKILL,
    tracks: [
      {
        id: 'plan',
        label: 'Plan',
        blurb: 'The questions and the people.',
        icon: 'ClipboardList',
        steps: ['research-plan', 'participants'],
      },
      {
        id: 'learn',
        label: 'Learn',
        blurb: 'Interviews, observation and the evidence.',
        icon: 'MessagesSquare',
        steps: ['interviews', 'synthesis'],
      },
      {
        id: 'apply',
        label: 'Apply',
        blurb: 'The opportunity map the design is built against.',
        icon: 'Route',
        steps: ['opportunities'],
      },
    ],
    steps: [
      {
        id: 'research-plan',
        title: 'Research plan',
        icon: 'ClipboardList',
        path: '',
        track: 'plan',
        decides: 'The learning goals, the method, and what would count as an answer.',
        produces: ['Learning goals', 'Method and sample size', 'A discussion guide outline'],
        questions: [
          q('What do you need to learn that you cannot learn from the analytics?', 'Research earns its cost by answering what data cannot.'),
          q('Which decision will this research unblock?', 'A study nobody acts on is a cost with a report attached.'),
        ],
        deliverables: [doc('spec', 'spec/ux-research/01-plan.md', 'Research plan')],
        ready: (p) => p.brief.personas.length > 0,
        blockers: (p) => missing([p.brief.personas.length > 0, 'no user groups described yet']),
      },
      {
        id: 'participants',
        title: 'Participants',
        icon: 'Users',
        path: 'personas',
        track: 'plan',
        decides: 'Who is recruited, how, and how their consent is handled.',
        produces: ['A recruitment profile', 'Screening questions', 'Consent handling'],
        questions: [
          q('Who is the one person you most need to hear from?', 'Recruiting for the hardest case beats recruiting for convenience.'),
          q('Who is at risk of being excluded by this study?', 'The people missing from research are the people the design fails.'),
        ],
        deliverables: [doc('spec', 'spec/ux-research/02-participants.md', 'Participant plan')],
        ready: (p) => p.brief.personas.length > 0,
        blockers: (p) => missing([p.brief.personas.length > 0, 'no personas to recruit against']),
      },
      {
        id: 'interviews',
        title: 'Interviews & observation',
        icon: 'Mic',
        path: 'wiki',
        track: 'learn',
        decides: 'What was actually said and seen, recorded while it is fresh.',
        produces: ['Session notes with quotes', 'Observed workarounds'],
        questions: [
          q('What did someone do that surprised you?', 'Surprise is where the current design assumption is wrong.'),
          q('Which quote would you put on the wall?', 'The sharpest quote travels further than a summary.'),
        ],
        deliverables: [doc('markdown', 'spec/ux-research/03-session-notes.md', 'Session notes')],
        ready: (p) => p.brief.problems.length > 0,
        blockers: (p) => missing([p.brief.problems.length > 0, 'no problem statements to research against']),
      },
      {
        id: 'synthesis',
        title: 'Synthesis',
        icon: 'Layers',
        path: 'personas',
        track: 'learn',
        decides: 'The patterns across sessions: themes, jobs to be done and where people give up.',
        produces: ['Themes with evidence counts', 'Jobs to be done', 'Drop-off points'],
        questions: [
          q('Which theme appeared in more than half of the sessions?', 'Frequency is the cheapest honest signal in qualitative work.'),
          q('What did you expect to hear and did not?', 'The absent theme is often the finding.'),
        ],
        deliverables: [doc('spec', 'spec/ux-research/04-synthesis.md', 'Synthesis')],
        ready: (p) => p.brief.personas.length >= 2 && p.brief.problems.length >= 2,
        blockers: (p) =>
          missing(
            [p.brief.personas.length >= 2, 'fewer than two personas'],
            [p.brief.problems.length >= 2, 'fewer than two problem statements'],
          ),
      },
      {
        id: 'opportunities',
        title: 'Opportunity map',
        icon: 'Route',
        path: 'flows',
        track: 'apply',
        decides: 'Where the design should intervene, ranked by evidence and effort.',
        produces: ['An opportunity map', 'The flows worth redesigning first'],
        questions: [
          q('Which opportunity is worth the next sprint?', 'Ranking is the point of the map.'),
          q('Where will people give up if we do nothing?', 'The drop-off is the business case.'),
        ],
        deliverables: [doc('roadmap', 'spec/ux-research/05-opportunities.md', 'Opportunity map')],
        ready: (p) => p.flows.length >= 1,
        blockers: (p) => missing([p.flows.length >= 1, 'no flows mapped yet']),
      },
    ],
  },

  /* ---------------------------------------------------------- ui design -- */
  {
    id: 'ui-design',
    name: 'UI & interface design',
    tag: 'UI',
    icon: 'LayoutList',
    blurb: 'The interface process, end to end: inventory, layout, components and states, accessibility, and the prototype handoff.',
    processLabel: 'UI DESIGN PROCESS · 5 STEPS',
    phases: ['design', 'sections'],
    track: ['prototype', 'editor', 'wiki'],
    skill: UI_SKILL,
    designRole: true,
    tracks: [
      {
        id: 'structure',
        label: 'Structure',
        blurb: 'What exists, and how the page is organised.',
        icon: 'Layout',
        steps: ['inventory', 'layout'],
      },
      {
        id: 'craft',
        label: 'Craft',
        blurb: 'Components, states and accessibility.',
        icon: 'Palette',
        steps: ['components', 'accessibility'],
      },
      {
        id: 'handoff',
        label: 'Handoff',
        blurb: 'The working prototype and its contract.',
        icon: 'Play',
        steps: ['handoff'],
      },
    ],
    steps: [
      {
        id: 'inventory',
        title: 'Interface inventory',
        icon: 'LayoutDashboard',
        path: 'sections',
        track: 'structure',
        decides: 'Every screen the product needs, and what each one is for.',
        produces: ['A screen inventory', 'The primary route per screen'],
        questions: [
          q('Which screen does the work the person came for?', 'One screen carries the job; everything else supports it.'),
          q('Which screen could be removed entirely?', 'Subtraction is the cheapest improvement in an interface.'),
        ],
        deliverables: [doc('spec', 'spec/ui-design/01-inventory.md', 'Interface inventory')],
        ready: (p) => p.sections.length > 0,
        blockers: (p) => missing([p.sections.length > 0, 'no sections to inventory yet']),
      },
      {
        id: 'layout',
        title: 'Layout & grid',
        icon: 'Ruler',
        path: 'shell',
        track: 'structure',
        decides: 'The frame, the grid and the shell every screen sits inside.',
        produces: ['Shell regions and navigation', 'Grid and spacing rules'],
        questions: [
          q('What stays on screen no matter where the person is?', 'The persistent frame is what makes the product feel like one place.'),
          q('Where does the layout break on a phone?', 'The narrowest width decides whether the layout is real.'),
        ],
        deliverables: [doc('spec', 'spec/ui-design/02-layout.md', 'Layout & shell spec')],
        ready: (p) => p.design.layout.nav.length > 0,
        blockers: (p) => missing([p.design.layout.nav.length > 0, 'the shell has no navigation']),
      },
      {
        id: 'components',
        title: 'Components & states',
        icon: 'Grid3x3',
        path: 'design',
        track: 'craft',
        decides: 'The component set and every state each one can be in.',
        produces: ['The registry inventory', 'Empty, loading, error and success states'],
        questions: [
          q('What does this look like with zero records?', 'The empty state is the first thing a new user sees.'),
          q('What does it look like when the request fails?', 'An error state designed once is designed everywhere.'),
        ],
        deliverables: [doc('visual', 'spec/ui-design/03-components.html', 'Component states sheet')],
        ready: (p) => p.system.components.length > 0,
        blockers: (p) => missing([p.system.components.length > 0, 'no registry components yet']),
      },
      {
        id: 'accessibility',
        title: 'Accessibility',
        icon: 'UserRound',
        path: 'sections',
        track: 'craft',
        decides: 'Contrast, focus order, targets and labels — checked, not assumed.',
        produces: ['Contrast results per colour role', 'Focus and keyboard notes'],
        questions: [
          q('Can the whole flow be completed with a keyboard?', 'If it cannot, it is not finished.'),
          q('Which text is below 4.5:1 against its background?', 'Contrast is measurable, so there is no reason to guess.'),
        ],
        deliverables: [doc('spec', 'spec/ui-design/04-accessibility.md', 'Accessibility report')],
        ready: (p) => p.design.colors.length >= 3,
        blockers: (p) => missing([p.design.colors.length >= 3, 'fewer than three colour roles to check']),
      },
      {
        id: 'handoff',
        title: 'Prototype & handoff',
        icon: 'Play',
        path: 'prototype',
        track: 'handoff',
        decides: 'The screens running as one app, ready for engineering.',
        produces: ['A walkable prototype', 'A component contract per screen'],
        questions: [
          q('Which flow must work end to end in the prototype?', 'The prototype is a promise, so it should promise the right thing.'),
          q('What must engineering not change?', 'Handoff is where the non-negotiables are written down.'),
        ],
        deliverables: [doc('spec', 'spec/ui-design/05-handoff.md', 'UI handoff spec')],
        ready: (p) => p.sections.some((s) => s.screens.length > 0),
        blockers: (p) => missing([p.sections.some((s) => s.screens.length > 0), 'no screens designed yet']),
      },
    ],
  },

  /* ------------------------------------------------------------ cx design -- */
  {
    id: 'cx-design',
    name: 'Customer experience',
    tag: 'CX',
    icon: 'HeartPulse',
    blurb: 'The whole journey around the product: touchpoints, the service blueprint, the moments of truth and how they are measured.',
    processLabel: 'CUSTOMER EXPERIENCE PROCESS · 5 STEPS',
    phases: ['product', 'sections'],
    track: ['personas', 'flows', 'wiki'],
    skill: CX_SKILL,
    tracks: [
      {
        id: 'journey',
        label: 'Journey',
        blurb: 'From first touch to habit.',
        icon: 'Route',
        steps: ['journey-map', 'touchpoints'],
      },
      {
        id: 'service',
        label: 'Service',
        blurb: 'What has to happen behind the scenes.',
        icon: 'Building2',
        steps: ['blueprint', 'moments'],
      },
      {
        id: 'measure',
        label: 'Measure',
        blurb: 'The experience metric and its owner.',
        icon: 'Gauge',
        steps: ['measurement'],
      },
    ],
    steps: [
      {
        id: 'journey-map',
        title: 'Journey map',
        icon: 'Route',
        path: 'flows',
        track: 'journey',
        decides: 'Every stage the customer moves through, and how they feel at each one.',
        produces: ['A stage-by-stage journey map', 'Emotions and pain points per stage'],
        questions: [
          q('Where does the journey actually start — before your product exists?', 'The journey starts at the first thought, not at the first login.'),
          q('Which stage has the biggest gap between expectation and reality?', 'That gap is where experience work pays back.'),
        ],
        deliverables: [doc('process', 'spec/cx-design/01-journey-map.md', 'Journey map')],
        ready: (p) => p.flows.length >= 2,
        blockers: (p) => missing([p.flows.length >= 2, 'fewer than two flows to map']),
      },
      {
        id: 'touchpoints',
        title: 'Touchpoints',
        icon: 'MapPin',
        path: 'flows',
        track: 'journey',
        decides: 'Every place the customer meets the product: screen, email, call, invoice.',
        produces: ['A touchpoint inventory', 'Owner per touchpoint'],
        questions: [
          q('Which touchpoint do you not control today?', 'The uncontrolled touchpoints are where experience quietly breaks.'),
          q('Which one carries the most trust?', 'Trust concentrates in a few moments; protect those first.'),
        ],
        deliverables: [doc('spec', 'spec/cx-design/02-touchpoints.md', 'Touchpoint inventory')],
        ready: (p) => p.flows.length >= 1,
        blockers: (p) => missing([p.flows.length >= 1, 'no flows yet']),
      },
      {
        id: 'blueprint',
        title: 'Service blueprint',
        icon: 'Building2',
        path: 'wiki',
        track: 'service',
        decides: 'The front stage, back stage and support processes behind each touchpoint.',
        produces: ['A blueprint with the line of visibility', 'Fail points and their owners'],
        questions: [
          q('What has to happen behind the scenes for the customer to see that?', 'Every visible promise is a backstage obligation.'),
          q('Where does the process depend on one person?', 'A single-person dependency is a fail point waiting to happen.'),
        ],
        deliverables: [doc('process', 'spec/cx-design/03-service-blueprint.md', 'Service blueprint')],
        ready: (p) => p.flows.length >= 2 && p.data.entities.length > 0,
        blockers: (p) => missing([p.data.entities.length > 0, 'no entities to blueprint against']),
      },
      {
        id: 'moments',
        title: 'Moments of truth',
        icon: 'Zap',
        path: 'wiki',
        track: 'service',
        decides: 'The handful of moments that decide whether the customer stays.',
        produces: ['Named moments of truth', 'The design response to each'],
        questions: [
          q('What is the moment the customer decides to trust you?', 'One made moment beats ten polished screens.'),
          q('What happens in the first five minutes?', 'The first five minutes predict the next five months.'),
        ],
        deliverables: [doc('spec', 'spec/cx-design/04-moments-of-truth.md', 'Moments of truth')],
        ready: (p) => p.brief.personas.length > 0,
        blockers: (p) => missing([p.brief.personas.length > 0, 'no personas yet']),
      },
      {
        id: 'measurement',
        title: 'Experience measurement',
        icon: 'Gauge',
        path: 'wiki',
        track: 'measure',
        decides: 'How the experience is measured, and who owns the number.',
        produces: ['The experience metric set', 'A sampling and review cadence'],
        questions: [
          q('Which single number would tell you the experience is improving?', 'One owned number beats a dashboard nobody reads.'),
          q('How often will you look at it, and with whom?', 'A metric with a meeting attached is a metric that moves.'),
        ],
        deliverables: [doc('spec', 'spec/cx-design/05-measurement.md', 'Experience measurement plan')],
        ready: (p) => p.brief.metrics.length > 0,
        blockers: (p) => missing([p.brief.metrics.length > 0, 'no metrics defined yet']),
      },
    ],
  },

  /* ------------------------------------------------------ product design -- */
  {
    id: 'product-design',
    name: 'Product design',
    tag: 'Design',
    icon: 'Palette',
    blurb: 'Tokens, shell, section screens, the visual editor and the prototype — the design role owns the interface end to end.',
    processLabel: 'PRODUCT DESIGN PROCESS · 6 STEPS',
    phases: ['design', 'sections'],
    track: ['prototype', 'editor', 'personas', 'flows', 'wiki'],
    // The role runs its own six-step playbook; the upstream Design System skill
    // is the implementation reference it points at, not the process itself.
    skill: PRODUCT_DESIGN_SKILL,
    designRole: true,
    tracks: [
      {
        id: 'foundations',
        label: 'Foundations',
        blurb: 'Brief and tokens before pixels.',
        icon: 'Palette',
        steps: ['design-brief', 'design-tokens'],
      },
      {
        id: 'screens',
        label: 'Screens',
        blurb: 'The shell and every section screen.',
        icon: 'LayoutList',
        steps: ['app-shell', 'section-screens'],
      },
      {
        id: 'craft',
        label: 'Visual craft',
        blurb: 'The editor, the prototype and the final tuning.',
        icon: 'Wand2',
        steps: ['visual-editor', 'prototype'],
      },
    ],
    steps: [
      {
        id: 'design-brief',
        title: 'Design brief',
        icon: 'FileText',
        path: '',
        track: 'foundations',
        decides: 'What the interface must feel like, for whom, and what it must never look like.',
        produces: ['A written design brief', 'Reference direction and anti-references'],
        questions: [
          q('Name three products whose interface you would be happy to be compared to.', 'References turn taste into something a team can discuss.'),
          q('What must this never look like?', 'Anti-references prevent the generic default.'),
        ],
        deliverables: [doc('spec', 'spec/product-design/01-design-brief.md', 'Design brief')],
        ready: (p) => Boolean(p.brief.summary),
        blockers: (p) => missing([Boolean(p.brief.summary), 'the brief has no summary to design against']),
      },
      {
        id: 'design-tokens',
        title: 'Design tokens',
        icon: 'Palette',
        path: 'design',
        track: 'foundations',
        decides: 'Colour roles, type roles, scale, radii, elevation and motion — as tokens, not screenshots.',
        produces: ['DTCG tokens.json and tokens.css', 'Contrast-checked colour roles'],
        questions: [
          q('Which colour carries action, and is it used for anything else?', 'One colour, one job — or the product teaches the wrong habit.'),
          q('What is the type scale, in rem, and why those steps?', 'A scale that is written down is a scale that is followed.'),
        ],
        deliverables: [doc('spec', 'spec/product-design/02-tokens.md', 'Token spec')],
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
        track: 'screens',
        decides: 'The frame every screen sits inside: navigation, header, page frame.',
        produces: ['Shell regions and navigation', 'Light and dark preview'],
        questions: [
          q('What is in the navigation, in order of how often it is used?', 'Navigation order is a statement about what matters.'),
          q('What does the shell look like on a 375px phone?', 'The shell is the part most likely to break first on mobile.'),
        ],
        deliverables: [doc('spec', 'spec/product-design/03-shell.md', 'Shell spec')],
        ready: (p) => p.design.layout.nav.length > 0,
        blockers: (p) => missing([p.design.layout.nav.length > 0, 'the shell has no navigation']),
      },
      {
        id: 'section-screens',
        title: 'Section screens',
        icon: 'LayoutList',
        path: 'sections',
        track: 'screens',
        decides: 'The designed screen for every section, from the registry components only.',
        produces: ['One props-based component per screen', 'States and acceptance checks'],
        questions: [
          q('Which screen carries the product’s main job?', 'Design the one screen that matters most, first and best.'),
          q('What is above the fold at 1440px?', 'The fold is where the promise is made.'),
        ],
        deliverables: [doc('visual', 'spec/product-design/04-screens.html', 'Screen sheets')],
        ready: (p) => p.sections.length > 0 && p.sections.every((s) => s.screens.length > 0),
        blockers: (p) => missing([p.sections.some((s) => s.screens.length > 0), 'no screens designed yet']),
      },
      {
        id: 'visual-editor',
        title: 'Visual editor',
        icon: 'Wand2',
        path: 'editor',
        track: 'craft',
        surface: 'visual',
        decides: 'The interface edited directly: pick a system, or bring Figma in, then tune type, colour and spacing.',
        produces: ['A chosen design system', 'Imported Figma/PDF/image references', 'Recorded overrides'],
        questions: [
          q('Start from the generated system, or bring your own?', 'Importing an existing system is often faster than rebuilding one.'),
          q('Which three changes would make the biggest difference?', 'Naming three keeps the edit session short and decisive.'),
        ],
        deliverables: [doc('spec', 'spec/product-design/05-editor-notes.md', 'Editor decisions')],
        ready: (p) => p.design.colors.length >= 3,
        blockers: () => [],
      },
      {
        id: 'prototype',
        title: 'Prototype & QA',
        icon: 'Play',
        path: 'prototype',
        track: 'craft',
        decides: 'The screens running as one app with real routes and seeded records.',
        produces: ['A walkable prototype', 'A design QA checklist'],
        questions: [
          q('Which flow must be clickable end to end?', 'A prototype is judged by the flow it completes.'),
          q('What would make you reject your own design?', 'Writing the rejection test first keeps the review honest.'),
        ],
        deliverables: [doc('spec', 'spec/product-design/06-prototype.md', 'Prototype notes')],
        ready: (p) => p.flows.length >= 1 && p.sections.length > 0,
        blockers: (p) => missing([p.sections.length > 0, 'no sections to prototype']),
      },
    ],
  },

  /* ---------------------------------------------------------- database --- */
  {
    id: 'database-design',
    name: 'Data & database design',
    tag: 'DB',
    icon: 'Database',
    blurb:
      'Database design lives here, not in the BA role: entities, fields, relationships, schema and constraints, seeded data, and the backend contract.',
    processLabel: 'DATABASE DESIGN PROCESS · 6 STEPS',
    phases: ['data-shape', 'sections', 'export'],
    track: ['system', 'wiki'],
    skill: DB_SKILL,
    tracks: [
      {
        id: 'model',
        label: 'Model',
        blurb: 'Entities, fields and how they relate.',
        icon: 'Boxes',
        steps: ['entities', 'fields-types', 'relationships'],
      },
      {
        id: 'build',
        label: 'Build the schema',
        blurb: 'DDL, constraints and real rows.',
        icon: 'FileCode',
        steps: ['schema-constraints', 'sample-data'],
      },
      {
        id: 'contract',
        label: 'Contract',
        blurb: 'What the backend promises.',
        icon: 'ShieldCheck',
        steps: ['backend-contract'],
      },
    ],
    steps: [
      {
        id: 'entities',
        title: 'Entities',
        icon: 'Boxes',
        path: 'data-shape',
        track: 'model',
        decides: 'The things the product has to remember.',
        produces: ['Named entities with descriptions'],
        questions: [
          q('What are the three things this product must never forget?', 'Those three are the core entities; everything else hangs off them.'),
          q('Which entity is really a status on another one?', 'Most “missing tables” are states, not entities.'),
        ],
        deliverables: [doc('spec', 'spec/database-design/01-entities.md', 'Entity spec')],
        ready: (p) => p.data.entities.length > 0,
        blockers: (p) => missing([p.data.entities.length > 0, 'no entities yet']),
      },
      {
        id: 'fields-types',
        title: 'Fields & types',
        icon: 'List',
        path: 'data-shape',
        track: 'model',
        decides: 'Every field, its type, whether it is required, and an example value.',
        produces: ['Typed fields per entity, with notes'],
        questions: [
          q('Which field must be unique, and what happens on a duplicate?', 'Uniqueness is a rule, and rules belong in the schema.'),
          q('Which field is money or time, and in what unit?', 'Unit mistakes are the most expensive kind of silent bug.'),
        ],
        deliverables: [doc('spec', 'spec/database-design/02-fields.md', 'Field dictionary')],
        ready: (p) => p.data.entities.every((e) => e.fields.length >= 3),
        blockers: (p) => missing([p.data.entities.every((e) => e.fields.length >= 3), 'an entity has fewer than three fields']),
      },
      {
        id: 'relationships',
        title: 'Relationships',
        icon: 'Link2',
        path: 'data-shape',
        track: 'model',
        decides: 'How the entities relate, enforced by the database rather than the UI.',
        produces: ['1:1 / 1:N / N:M relationships with labels'],
        questions: [
          q('When a parent record is deleted, what happens to its children?', 'Cascade versus restrict is a decision, never a default.'),
          q('Which two records are joined most often, and how?', 'The hot join decides the indexes.'),
        ],
        deliverables: [doc('spec', 'spec/database-design/03-relationships.md', 'Relationship map')],
        ready: (p) => p.data.relationships.length > 0,
        blockers: (p) => missing([p.data.relationships.length > 0, 'no relationships yet']),
      },
      {
        id: 'schema-constraints',
        title: 'Schema & constraints',
        icon: 'FileCode',
        path: 'data-shape',
        track: 'build',
        decides: 'The generated schema: tables, keys, indexes on status and date columns, and the rules.',
        produces: ['schema.sql', 'Data-layer notes'],
        questions: [
          q('Which queries must stay under 100ms as data grows?', 'That list becomes the index list.'),
          q('Which rule must the database enforce even if the app has a bug?', 'Constraints are the last line of defence.'),
        ],
        deliverables: [doc('spec', 'spec/database-design/04-schema.md', 'Schema notes')],
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
        track: 'build',
        decides: 'Seeded rows, so every screen has something real to render.',
        produces: ['Seeded rows per entity'],
        questions: [
          q('What does a realistic record look like, in this domain?', 'Fake data that looks real finds layout bugs fake data hides.'),
          q('Which edge case must be seeded on purpose?', 'The long name, the empty field, the zero amount.'),
        ],
        deliverables: [doc('spec', 'spec/database-design/05-sample-data.md', 'Sample data notes')],
        ready: (p) => p.data.entities.length > 0 && p.data.entities.every((e) => e.rows.length > 0),
        blockers: (p) => missing([p.data.entities.every((e) => e.rows.length > 0), 'an entity has no seeded rows']),
      },
      {
        id: 'backend-contract',
        title: 'Backend contract',
        icon: 'ShieldCheck',
        path: 'export',
        track: 'contract',
        decides: 'The API contract and its rules the backend must honour.',
        produces: ['openapi.json', 'Status machine rules', 'Contract tests'],
        questions: [
          q('Which write path is the most dangerous, and what guards it?', 'The dangerous write deserves the explicit guard.'),
          q('What does a client get when it sends an invalid state change?', 'Error shape is part of the contract.'),
        ],
        deliverables: [doc('spec', 'spec/database-design/06-contract.md', 'Backend contract')],
        ready: (p) => p.audit.checks.every((c) => c.status !== 'fail'),
        blockers: (p) =>
          missing([p.audit.checks.every((c) => c.status !== 'fail'), `${p.audit.checks.filter((c) => c.status === 'fail').length} audit checks failing`]),
      },
    ],
  },

  /* -------------------------------------------------------- engineering -- */
  {
    id: 'software-engineering',
    name: 'Software engineering',
    tag: 'Eng',
    icon: 'FileCode',
    blurb: 'Architecture, contract, implementation and tests — the build process a coding agent runs from the handoff.',
    processLabel: 'ENGINEERING PROCESS · 6 STEPS',
    phases: ['sections', 'export'],
    track: ['system', 'wiki', 'coverage'],
    skill: ENG_SKILL,
    tracks: [
      {
        id: 'design',
        label: 'Design the build',
        blurb: 'Architecture and the API contract.',
        icon: 'Layers',
        steps: ['architecture', 'api-contract'],
      },
      {
        id: 'build',
        label: 'Build it',
        blurb: 'Front end, back end and the tests.',
        icon: 'Wrench',
        steps: ['frontend', 'backend', 'tests'],
      },
      {
        id: 'ship',
        label: 'Ship it',
        blurb: 'Review, package and handover.',
        icon: 'Package',
        steps: ['review'],
      },
    ],
    steps: [
      {
        id: 'architecture',
        title: 'Architecture',
        icon: 'Layers',
        path: 'system',
        track: 'design',
        decides: 'The stack, the boundaries and what is deliberately not built.',
        produces: ['A stack decision with reasons', 'Module boundaries'],
        questions: [
          q('What is the smallest architecture that will survive a year?', 'Small and boring outlives clever and fragile.'),
          q('What would you have to rewrite if the data outgrew this?', 'Naming the escape hatch makes the shortcut safe.'),
        ],
        deliverables: [doc('spec', 'spec/software-engineering/01-architecture.md', 'Architecture spec')],
        ready: (p) => p.system.stack.length > 0,
        blockers: (p) => missing([p.system.stack.length > 0, 'no stack decisions recorded yet']),
      },
      {
        id: 'api-contract',
        title: 'API contract',
        icon: 'ShieldCheck',
        path: 'export',
        track: 'design',
        decides: 'Every endpoint, its payload and its error shape.',
        produces: ['openapi.json', 'The status transition rules'],
        questions: [
          q('Which endpoint does the whole app depend on?', 'That one gets the most care and the most tests.'),
          q('How does the client learn that something failed, and why?', 'A contract without errors is half a contract.'),
        ],
        deliverables: [doc('spec', 'spec/software-engineering/02-api-contract.md', 'API contract')],
        ready: (p) => p.audit.checks.some((c) => c.status === 'pass'),
        blockers: (p) => missing([p.audit.checks.some((c) => c.status === 'pass'), 'the audit has not run yet']),
      },
      {
        id: 'frontend',
        title: 'Front end',
        icon: 'LayoutList',
        path: 'sections',
        track: 'build',
        decides: 'The screens implemented from the registry, tokens only.',
        produces: ['Components per section', 'Wired routes and states'],
        questions: [
          q('Which component is doing too much?', 'The component that knows about everything is where the next bug lives.'),
          q('Where does the UI assume a network round trip?', 'Every assumption is a loading state waiting to be forgotten.'),
        ],
        deliverables: [doc('spec', 'spec/software-engineering/03-frontend.md', 'Frontend notes')],
        ready: (p) => p.sections.length > 0,
        blockers: (p) => missing([p.sections.length > 0, 'no sections to implement']),
      },
      {
        id: 'backend',
        title: 'Back end',
        icon: 'Database',
        path: 'export',
        track: 'build',
        decides: 'The server, the rules that live there, and the data layer.',
        produces: ['The server and its routes', 'Rules tests'],
        questions: [
          q('Which rule must never live in the client?', 'Anything a client can skip must be enforced server-side.'),
          q('What happens on a retry?', 'Idempotency is decided at the contract, not at the incident.'),
        ],
        deliverables: [doc('spec', 'spec/software-engineering/04-backend.md', 'Backend notes')],
        ready: (p) => p.data.entities.length > 0,
        blockers: (p) => missing([p.data.entities.length > 0, 'no entities to serve']),
      },
      {
        id: 'tests',
        title: 'Tests',
        icon: 'ClipboardCheck',
        path: 'sections',
        track: 'build',
        decides: 'What is tested, at which level, and what must never regress.',
        produces: ['Per-section test specs', 'The non-regression list'],
        questions: [
          q('Which behaviour would you be most embarrassed to break?', 'That is the first test to write.'),
          q('What is tested by hand forever, and why?', 'Naming it stops the hand-test from being invisible work.'),
        ],
        deliverables: [doc('spec', 'spec/software-engineering/05-tests.md', 'Test plan')],
        ready: (p) => p.sections.every((s) => s.tests.length > 0),
        blockers: (p) => missing([p.sections.every((s) => s.tests.length > 0), 'a section has no tests']),
      },
      {
        id: 'review',
        title: 'Review & package',
        icon: 'Package',
        path: 'export',
        track: 'ship',
        decides: 'The handoff package is complete, and a reviewer can check it.',
        produces: ['The ZIP package', 'A review checklist'],
        questions: [
          q('What would a reviewer need to check this in an hour?', 'Reviewability is a feature of the package.'),
          q('What is deliberately left for a later milestone?', 'An honest remainder beats a silent gap.'),
        ],
        deliverables: [doc('spec', 'spec/software-engineering/06-review.md', 'Review checklist')],
        ready: (p) => p.audit.checks.every((c) => c.status !== 'fail'),
        blockers: (p) =>
          missing([p.audit.checks.every((c) => c.status !== 'fail'), `${p.audit.checks.filter((c) => c.status === 'fail').length} audit checks failing`]),
      },
    ],
  },

  /* ---------------------------------------------------------------- QA --- */
  {
    id: 'qa-testing',
    name: 'QA & testing',
    tag: 'QA',
    icon: 'ClipboardCheck',
    blurb: 'The verification process: plan, cases, functional and regression runs, and the release sign-off.',
    processLabel: 'QA PROCESS · 5 STEPS',
    phases: ['sections', 'export'],
    track: ['coverage', 'wiki', 'sections'],
    skill: QA_SKILL,
    tracks: [
      {
        id: 'plan',
        label: 'Plan',
        blurb: 'Scope, risks and cases.',
        icon: 'ClipboardList',
        steps: ['test-plan', 'test-cases'],
      },
      {
        id: 'run',
        label: 'Run',
        blurb: 'Functional and regression passes.',
        icon: 'Play',
        steps: ['functional', 'regression'],
      },
      {
        id: 'sign',
        label: 'Sign off',
        blurb: 'The release decision, with evidence.',
        icon: 'ShieldCheck',
        steps: ['signoff'],
      },
    ],
    steps: [
      {
        id: 'test-plan',
        title: 'Test plan',
        icon: 'ClipboardList',
        path: 'sections',
        track: 'plan',
        decides: 'What is in scope for testing, at which levels, and what is explicitly not.',
        produces: ['A test plan', 'The environments and data it runs on'],
        questions: [
          q('What is the riskiest part of this release?', 'Testing effort follows risk, not the file tree.'),
          q('What will not be tested, and who accepts that?', 'An accepted gap is a decision; an unaccepted one is a surprise.'),
        ],
        deliverables: [doc('spec', 'spec/qa-testing/01-test-plan.md', 'Test plan')],
        ready: (p) => p.sections.length > 0,
        blockers: (p) => missing([p.sections.length > 0, 'no sections to test yet']),
      },
      {
        id: 'test-cases',
        title: 'Test cases',
        icon: 'ListChecks',
        path: 'sections',
        track: 'plan',
        decides: 'The cases, their steps, and the expected result that makes pass/fail objective.',
        produces: ['Cases per section', 'Boundary and permission cases'],
        questions: [
          q('What is the exact expected result of the main flow?', '“It works” is not a pass criterion.'),
          q('Which boundary value is most likely to break?', 'Boundaries break first: zero, one, many, none.'),
        ],
        deliverables: [doc('spec', 'spec/qa-testing/02-test-cases.md', 'Test cases')],
        ready: (p) => p.sections.every((s) => s.tests.length > 0),
        blockers: (p) => missing([p.sections.every((s) => s.tests.length > 0), 'a section has no test cases']),
      },
      {
        id: 'functional',
        title: 'Functional pass',
        icon: 'Play',
        path: 'prototype',
        track: 'run',
        decides: 'That every case was run against a real build, with evidence.',
        produces: ['A results log', 'Reproduction steps per defect'],
        questions: [
          q('Which defects are open right now, and how bad?', 'A defect list with severity is the honest state of the release.'),
          q('Can each defect be reproduced from the notes?', 'An unreproducible bug is a rumour.'),
        ],
        deliverables: [doc('spec', 'spec/qa-testing/03-functional.md', 'Functional results')],
        ready: (p) => p.sections.some((s) => s.screens.length > 0),
        blockers: (p) => missing([p.sections.some((s) => s.screens.length > 0), 'no screens to run against']),
      },
      {
        id: 'regression',
        title: 'Regression pass',
        icon: 'RefreshCw',
        path: 'coverage',
        track: 'run',
        decides: 'That what worked before still works.',
        produces: ['A regression checklist', 'The automated coverage list'],
        questions: [
          q('What broke last time, and is it covered now?', 'Regressions repeat unless the test is written.'),
          q('Which automated checks must gate every merge?', 'A gate nobody can skip is a gate that holds.'),
        ],
        deliverables: [doc('spec', 'spec/qa-testing/04-regression.md', 'Regression plan')],
        ready: (p) => p.audit.checks.length > 0,
        blockers: (p) => missing([p.audit.checks.length > 0, 'the audit has no checks to regress against']),
      },
      {
        id: 'signoff',
        title: 'Release sign-off',
        icon: 'ShieldCheck',
        path: 'export',
        track: 'sign',
        decides: 'Whether this release ships, and on what evidence.',
        produces: ['A sign-off record', 'Known issues shipped deliberately'],
        questions: [
          q('Would you ship this to your own team tomorrow?', 'The question that cuts through a green dashboard.'),
          q('Which known issue are you shipping, and why is that acceptable?', 'Written down, a known issue is a decision.'),
        ],
        deliverables: [doc('spec', 'spec/qa-testing/05-signoff.md', 'Release sign-off')],
        ready: (p) => p.audit.score >= 80,
        blockers: (p) => missing([p.audit.score >= 80, `audit is ${p.audit.score}/100 — below 80`]),
      },
    ],
  },

  /* ------------------------------------------------------------ devops --- */
  {
    id: 'devops',
    name: 'DevOps & platform',
    tag: 'Ops',
    icon: 'GitBranch',
    blurb: 'Environments, pipelines, observability, security and the runbook — the path from commit to production.',
    processLabel: 'DEVOPS PROCESS · 5 STEPS',
    phases: ['export'],
    track: ['system', 'wiki', 'coverage'],
    skill: DEVOPS_SKILL,
    tracks: [
      {
        id: 'setup',
        label: 'Set up',
        blurb: 'Environments and the pipeline.',
        icon: 'Cog',
        steps: ['environments', 'pipeline'],
      },
      {
        id: 'operate',
        label: 'Operate',
        blurb: 'Visibility, safety and the runbook.',
        icon: 'Monitor',
        steps: ['observability', 'security'],
      },
      {
        id: 'respond',
        label: 'Respond',
        blurb: 'What happens at 2am.',
        icon: 'ShieldAlert',
        steps: ['runbook'],
      },
    ],
    steps: [
      {
        id: 'environments',
        title: 'Environments',
        icon: 'Cog',
        path: 'system',
        track: 'setup',
        decides: 'Which environments exist, what differs between them, and how config is kept out of code.',
        produces: ['An environment matrix', 'The secrets policy'],
        questions: [
          q('What differs between staging and production?', 'Every difference is a bug that only appears in one place.'),
          q('Where do secrets live, and who can read them?', 'The answer is the security posture, in one line.'),
        ],
        deliverables: [doc('spec', 'spec/devops/01-environments.md', 'Environment matrix')],
        ready: (p) => p.system.stack.length > 0,
        blockers: (p) => missing([p.system.stack.length > 0, 'no stack decisions yet']),
      },
      {
        id: 'pipeline',
        title: 'Pipeline',
        icon: 'GitBranch',
        path: 'coverage',
        track: 'setup',
        decides: 'What runs on every commit, and what must pass before a merge.',
        produces: ['A pipeline definition', 'The merge gates'],
        questions: [
          q('What must be green before anyone merges?', 'Gates are only real when they block.'),
          q('How long may the pipeline take before people route around it?', 'A slow gate is a skipped gate.'),
        ],
        deliverables: [doc('spec', 'spec/devops/02-pipeline.md', 'Pipeline spec')],
        ready: (p) => p.audit.checks.some((c) => c.status === 'pass'),
        blockers: (p) => missing([p.audit.checks.some((c) => c.status === 'pass'), 'no checks to gate on yet']),
      },
      {
        id: 'observability',
        title: 'Observability',
        icon: 'Gauge',
        path: 'wiki',
        track: 'operate',
        decides: 'The logs, metrics and alerts that tell you something is wrong before a customer does.',
        produces: ['An alert list with thresholds', 'The dashboards worth opening'],
        questions: [
          q('Which signal fires first when the app is broken?', 'One leading signal beats twenty trailing graphs.'),
          q('Who is paged, and how?', 'An alert with no owner is a notification.'),
        ],
        deliverables: [doc('spec', 'spec/devops/03-observability.md', 'Observability plan')],
        ready: (p) => p.brief.metrics.length > 0,
        blockers: (p) => missing([p.brief.metrics.length > 0, 'no metrics defined yet']),
      },
      {
        id: 'security',
        title: 'Security & access',
        icon: 'Lock',
        path: 'wiki',
        track: 'operate',
        decides: 'Who can reach what, what is logged, and how data is protected.',
        produces: ['An access matrix', 'The audit-log rules'],
        questions: [
          q('What is the worst thing an attacker could read or change?', 'Start protection at the worst case.'),
          q('Which actions must be logged, and for how long?', 'Audit logs are a product requirement, not a nice-to-have.'),
        ],
        deliverables: [doc('spec', 'spec/devops/04-security.md', 'Security notes')],
        ready: (p) => p.data.entities.length > 0,
        blockers: (p) => missing([p.data.entities.length > 0, 'no entities to protect yet']),
      },
      {
        id: 'runbook',
        title: 'Runbook',
        icon: 'ShieldAlert',
        path: 'coverage',
        track: 'respond',
        decides: 'What to do when it breaks: who looks, what they check, how it is communicated.',
        produces: ['A runbook', 'A rollback procedure', 'The incident template'],
        questions: [
          q('What is the first command you run when it is down?', 'A runbook written before the incident is worth ten written after.'),
          q('How does the rollback work, and has it been tried?', 'An untried rollback is a hope.'),
        ],
        deliverables: [doc('spec', 'spec/devops/05-runbook.md', 'Runbook')],
        ready: (p) => p.audit.checks.every((c) => c.status !== 'fail'),
        blockers: (p) =>
          missing([p.audit.checks.every((c) => c.status !== 'fail'), `${p.audit.checks.filter((c) => c.status === 'fail').length} audit checks failing`]),
      },
    ],
  },

  /* ---------------------------------------------------- project mgmt ---- */
  {
    id: 'project-management',
    name: 'Project management',
    tag: 'PM',
    icon: 'CalendarCheck',
    blurb: 'Charter, plan, schedule, risks and the status report — the delivery process that keeps the other roles honest.',
    processLabel: 'PROJECT DELIVERY PROCESS · 5 STEPS',
    phases: ['product', 'export'],
    track: ['wiki', 'coverage'],
    skill: PM_SKILL,
    tracks: [
      {
        id: 'charter',
        label: 'Charter',
        blurb: 'Why, who and by when.',
        icon: 'FileText',
        steps: ['charter', 'plan'],
      },
      {
        id: 'deliver',
        label: 'Deliver',
        blurb: 'The schedule and the risks.',
        icon: 'CalendarDays',
        steps: ['schedule', 'risks'],
      },
      {
        id: 'report',
        label: 'Report',
        blurb: 'Progress the sponsors can read.',
        icon: 'Presentation',
        steps: ['status'],
      },
    ],
    steps: [
      {
        id: 'charter',
        title: 'Charter',
        icon: 'FileText',
        path: '',
        track: 'charter',
        decides: 'The goal, the sponsor, the budget envelope and the definition of done.',
        produces: ['A one-page charter', 'The definition of done'],
        questions: [
          q('Who is the sponsor, and what do they get for the money?', 'A charter without a sponsor is a wish list.'),
          q('What does “done” mean, in a sentence?', 'Done must be checkable by someone outside the team.'),
        ],
        deliverables: [doc('spec', 'spec/project-management/01-charter.md', 'Project charter')],
        ready: (p) => Boolean(p.brief.summary),
        blockers: (p) => missing([Boolean(p.brief.summary), 'the brief has no summary to charter']),
      },
      {
        id: 'plan',
        title: 'Work breakdown',
        icon: 'ListChecks',
        path: 'sections',
        track: 'charter',
        decides: 'The work, decomposed into pieces small enough to estimate and finish.',
        produces: ['A work breakdown structure', 'An owner per workstream'],
        questions: [
          q('Which workstream has no owner yet?', 'Unowned work is the work that slips.'),
          q('What is the first thing you would cut to save two weeks?', 'The pre-agreed cut is the one that actually happens.'),
        ],
        deliverables: [doc('spec', 'spec/project-management/02-work-breakdown.md', 'Work breakdown')],
        ready: (p) => p.sections.length > 0,
        blockers: (p) => missing([p.sections.length > 0, 'no sections to break down yet']),
      },
      {
        id: 'schedule',
        title: 'Schedule & milestones',
        icon: 'CalendarDays',
        path: '',
        track: 'deliver',
        decides: 'The dates, their dependencies, and what has to be true at each milestone.',
        produces: ['A milestone schedule', 'The critical path'],
        questions: [
          q('Which dependency could delay everything?', 'The critical path deserves a name and a date.'),
          q('What is the first milestone that proves the plan is real?', 'One early proof-of-plan beats a detailed year-end date.'),
        ],
        deliverables: [doc('roadmap', 'spec/project-management/03-schedule.md', 'Milestone schedule')],
        ready: (p) => p.roadmap.phases.length >= 2,
        blockers: (p) => missing([p.roadmap.phases.length >= 2, 'the roadmap has fewer than two milestones']),
      },
      {
        id: 'risks',
        title: 'Risks & issues',
        icon: 'ShieldAlert',
        path: 'wiki',
        track: 'deliver',
        decides: 'What could go wrong, how likely, how bad, and who is watching it.',
        produces: ['A risk register', 'Issues with owners and dates'],
        questions: [
          q('What is the one risk that would stop the project?', 'A stop-risk gets a mitigation and a named owner today.'),
          q('Which “issue” is actually a risk wearing a costume?', 'Issues are happening; risks are not yet.'),
        ],
        deliverables: [doc('spec', 'spec/project-management/04-risks.md', 'Risk register')],
        ready: (p) => p.brief.risks.length > 0,
        blockers: (p) => missing([p.brief.risks.length > 0, 'no risks recorded']),
      },
      {
        id: 'status',
        title: 'Status report',
        icon: 'Presentation',
        path: 'wiki',
        track: 'report',
        decides: 'Progress, blockers and the next decision — in a form a sponsor reads in two minutes.',
        produces: ['A status report', 'The decisions needed this week'],
        questions: [
          q('What is the one number the sponsor looks at?', 'One number, consistently reported, builds trust.'),
          q('What decision do you need from them this week?', 'A status without an ask is a newsletter.'),
        ],
        deliverables: [doc('spec', 'spec/project-management/05-status.md', 'Status report')],
        ready: (p) => p.audit.score >= 70,
        blockers: (p) => missing([p.audit.score >= 70, `audit is ${p.audit.score}/100 — below 70`]),
      },
    ],
  },
]

export function roleById(id?: string): RoleDef | undefined {
  return ROLES.find((role) => role.id === id)
}

/** Every role this workspace runs as: the primary plus any active extras. */
export function activeRoles(project: Project): RoleDef[] {
  const ids = [...(project.roleId ? [project.roleId] : []), ...((project.roles ?? []).filter((id) => id !== project.roleId) ?? [])]
  return ids.map((id) => roleById(id)).filter((role): role is RoleDef => Boolean(role))
}

export function stepReview(project: Project, role: RoleDef, step: RoleStep): import('../types').StepReview | undefined {
  return project.stepReviews?.[reviewKey(role.id, step.id)]
}

export type StepState = import('../types').ReviewDecision | 'ready' | 'todo'

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

/** The track a step belongs to, for the grouped rail and the inspector. */
export function trackOf(role: RoleDef, step: RoleStep): RoleTrack | undefined {
  return role.tracks.find((track) => track.id === step.track)
}

/** The steps of a track, in order, resolved against the role's step list. */
export function trackSteps(role: RoleDef, track: RoleTrack): RoleStep[] {
  return track.steps.map((id) => role.steps.find((step) => step.id === id)).filter((s): s is RoleStep => Boolean(s))
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
  more: string[]
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
    more: role.skill.more ?? [],
  }
}

/* ---------------------------------------------------------------- docs --- */

/** The artefacts already saved for a role. */
export function roleArtifacts(project: Project, roleId: string): RoleArtifact[] {
  return (project.artifacts ?? []).filter((artifact) => artifact.roleId === roleId)
}

/** One saved artefact for a step, by kind. */
export function artifactFor(project: Project, roleId: string, stepId: string, kind: DeliverableKind): RoleArtifact | undefined {
  return (project.artifacts ?? []).find((a) => a.roleId === roleId && a.stepId === stepId && a.kind === kind)
}

/** The spec folder a role writes into, as the export lays it out. */
export function roleSpecFolder(role: RoleDef): string {
  return `spec/${role.id}/`
}

/** Every step of every active role, in process order — what the export writes. */
export function processIndex(project: Project): { role: RoleDef; track: RoleTrack; step: RoleStep; index: number }[] {
  const rows: { role: RoleDef; track: RoleTrack; step: RoleStep; index: number }[] = []
  for (const role of activeRoles(project)) {
    role.steps.forEach((step, index) => {
      const track = trackOf(role, step)
      if (track) rows.push({ role, track, step, index })
    })
  }
  return rows
}
