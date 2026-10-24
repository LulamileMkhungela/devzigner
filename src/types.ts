/**
 * Lula DevZign — core domain types.
 *
 * A "Project" is fully derivable from {idea, archetypeId, seed, genome, pins}.
 * Nothing here depends on a network call or an LLM. The compiler is pure.
 */

export type ModuleKey = 'brief' | 'roadmap' | 'data' | 'design' | 'sections'
export type ModuleSeeds = Record<ModuleKey, number>

export interface Genome {
  /** 0 = airy, 100 = compact */
  density: number
  /** 0 = cool/technical, 100 = warm/editorial */
  warmth: number
  /** 0 = soft/low contrast, 100 = bold/high contrast */
  contrast: number
  /** 0 = restrained, 100 = expressive */
  expression: number
  /** 0 = sharp, 100 = rounded */
  geometry: number
}

export interface TraitMeta {
  key: keyof Genome
  label: string
  low: string
  high: string
  help: string
}

export type FieldType =
  | 'text'
  | 'longtext'
  | 'number'
  | 'money'
  | 'date'
  | 'status'
  | 'email'
  | 'phone'
  | 'boolean'
  | 'relation'
  | 'rating'
  | 'image'
  | 'location'
  | 'tag'
  | 'percent'

export interface EntityField {
  name: string
  type: FieldType
  required: boolean
  example: string | number | boolean
  options?: string[]
  note: string
  references?: string
}

export interface Entity {
  id: string
  name: string
  plural: string
  icon: string
  description: string
  fields: EntityField[]
  rows: SampleRow[]
  primaryField: string
  secondaryField: string
  statusField?: string
  valueField?: string
}

export type SampleValue = string | number | boolean
export type SampleRow = Record<string, SampleValue>

export interface Relationship {
  from: string
  to: string
  kind: '1:1' | '1:N' | 'N:M'
  label: string
  via?: string
}

export interface DataModel {
  entities: Entity[]
  relationships: Relationship[]
  notes: string[]
  sql: string
}

export interface Persona {
  name: string
  role: string
  segment: string
  goal: string
  pain: string
  quote: string
  quoteTruth: string
}

export interface Metric {
  label: string
  target: string
  why: string
}

export interface Problem {
  title: string
  detail: string
  cost: string
}

export interface Differentiator {
  title: string
  detail: string
}

export interface Risk {
  risk: string
  mitigation: string
}

export interface Brief {
  name: string
  category: string
  tagline: string
  summary: string
  elevator: string
  problems: Problem[]
  personas: Persona[]
  jobs: string[]
  metrics: Metric[]
  differentiators: Differentiator[]
  risks: Risk[]
  principles: string[]
  voice: { tone: string; say: string[]; avoid: string[] }
  nonGoals: string[]
  integrations: string[]
}

export interface RoadmapPhase {
  id: string
  name: string
  horizon: string
  goal: string
  outcomes: string[]
  sectionIds: string[]
  risk: string
}

export interface Roadmap {
  phases: RoadmapPhase[]
  sequencingNote: string
}

export type ScreenKind =
  | 'overview'
  | 'collection'
  | 'detail'
  | 'editor'
  | 'board'
  | 'calendar'
  | 'analytics'
  | 'settings'
  | 'onboarding'
  | 'profile'
  | 'map'
  | 'inbox'

export type Block =
  | { type: 'pageHeader'; title: string; subtitle: string; actions: string[] }
  | { type: 'stats'; items: { label: string; value: string; delta: string; trend: 'up' | 'down' | 'flat' }[] }
  | { type: 'chart'; kind: 'bar' | 'line' | 'area' | 'donut'; title: string; labels: string[]; series: number[]; series2?: number[] }
  | { type: 'filters'; chips: string[]; search: string }
  | { type: 'table'; entityId: string; columns: string[]; rows: string[]; caption: string }
  | { type: 'list'; entityId: string; rows: string[]; title: string; metaField: string }
  | { type: 'detail'; entityId: string; recordId: string; tabs: string[]; fields: string[] }
  | { type: 'form'; entityId: string; fields: string[]; submit: string; title: string }
  | { type: 'board'; title: string; columns: { name: string; cards: { title: string; meta: string; tag: string }[] }[] }
  | { type: 'timeline'; title: string; events: { time: string; title: string; detail: string; tone: 'neutral' | 'good' | 'warn' }[] }
  | { type: 'calendar'; month: string; events: { day: number; label: string }[] }
  | { type: 'activity'; title: string; items: { who: string; what: string; when: string }[] }
  | { type: 'profile'; name: string; role: string; meta: string[]; stats: { label: string; value: string }[] }
  | { type: 'map'; title: string; pins: { x: number; y: number; label: string; tone: 'good' | 'warn' | 'neutral' }[]; legend: string[] }
  | { type: 'steps'; title: string; steps: { title: string; detail: string; state: 'done' | 'current' | 'todo' }[] }
  | { type: 'empty'; title: string; body: string; action: string; icon: string }
  | { type: 'callout'; tone: 'info' | 'warn' | 'good'; title: string; body: string }
  | { type: 'split'; leftTitle: string; leftBody: string; rightTitle: string; bullets: string[] }

export interface Screen {
  id: string
  name: string
  kind: ScreenKind
  route: string
  intent: string
  blocks: Block[]
  states: { name: string; detail: string }[]
  acceptance: string[]
  entityIds: string[]
}

export interface Requirement {
  id: string
  text: string
  priority: 'must' | 'should' | 'could'
}

export interface Section {
  id: string
  name: string
  purpose: string
  priority: 'MVP' | 'Next' | 'Later'
  icon: string
  jobs: string[]
  requirements: Requirement[]
  entityIds: string[]
  screens: Screen[]
  tests: string[]
  outOfScope: string[]
}

export interface ColorStop {
  step: number
  hex: string
  onWhite: number
  onInk: number
}

export interface ColorRole {
  id: string
  name: string
  role: 'primary' | 'accent' | 'neutral' | 'success' | 'warning' | 'danger' | 'info'
  hue: number
  saturation: number
  lightness: number
  base: string
  contrastText: string
  stops: ColorStop[]
  rationale: string
}

export interface TypographyRole {
  role: 'display' | 'body' | 'mono'
  family: string
  stack: string
  weights: number[]
  size: string
  lineHeight: string
  tracking: string
  usage: string
}

export interface DesignSystem {
  name: string
  mood: string[]
  rationale: string
  colors: ColorRole[]
  semantic: Record<string, string>
  darkSemantic: Record<string, string>
  typography: TypographyRole[]
  scale: { name: string; px: number; usage: string }[]
  radii: Record<string, number>
  spacing: { name: string; px: number }[]
  shadows: Record<string, string>
  motion: { name: string; duration: string; easing: string; usage: string }[]
  layout: {
    shell: 'sidebar' | 'rail' | 'topbar' | 'split'
    nav: string[]
    contentWidth: number
    cardStyle: 'flat' | 'outlined' | 'elevated' | 'glass'
    density: 'airy' | 'balanced' | 'compact'
    grid: string
  }
  components: string[]
  tokensCss: string
  tailwindTheme: string
  tokensJson: string
}

export interface AuditCheck {
  id: string
  group: 'Accessibility' | 'System' | 'Coverage' | 'Handoff'
  label: string
  detail: string
  status: 'pass' | 'warn' | 'fail'
  weight: number
}

export interface Audit {
  score: number
  checks: AuditCheck[]
  summary: string
}

export interface CompileInput {
  idea: string
  seed: number
  genome: Genome
  archetypeId: string
  currency: string
  moduleSeeds: ModuleSeeds
  nameOverride?: string
}

export interface Project extends CompileInput {
  id: string
  name: string
  archetypeLabel: string
  createdAt: number
  updatedAt: number
  brief: Brief
  roadmap: Roadmap
  data: DataModel
  design: DesignSystem
  sections: Section[]
  audit: Audit
  engineNotes: string[]
}

export interface ArchetypeSummary {
  id: string
  label: string
  category: string
  blurb: string
}
