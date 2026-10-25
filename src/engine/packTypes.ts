import type { FieldType, ScreenKind } from '../types'

export interface FieldDef {
  name: string
  type: FieldType
  required?: boolean
  options?: string[]
  note?: string
}

export interface EntityDef {
  id: string
  name: string
  plural: string
  icon: string
  description: string
  primaryField: string
  secondaryField: string
  statusField?: string
  valueField?: string
  fields: FieldDef[]
}

export interface ScreenDef {
  kind: ScreenKind
  name: string
}

export interface SectionDef {
  id: string
  name: string
  purpose: string
  priority: 'MVP' | 'Next' | 'Later'
  /**
   * Part of the archetype's spine: a product of this kind cannot work without
   * it. Everything without `core` is only compiled when the builder's own
   * description asks for it by name — see `src/engine/scope.ts`.
   */
  core?: boolean
  icon: string
  entityIds: string[]
  screens: ScreenDef[]
  extraJobs?: string[]
  extraRequirements?: string[]
  outOfScope?: string[]
}

export interface Pack {
  id: string
  label: string
  category: string
  blurb: string
  names: string[]
  taglines: string[]
  problems: { title: string; detail: string; cost: string }[]
  personas: { name: string; role: string; segment: string; goal: string; pain: string; quote: string }[]
  metrics: { label: string; target: string; why: string }[]
  differentiators: { title: string; detail: string }[]
  integrations: string[]
  nonGoals: string[]
  principles: string[]
  moodWords: string[]
  voice: { tone: string; say: string[]; avoid: string[] }
  hues: number[]
  actors: string[]
  objects: string[]
  entities: EntityDef[]
  sections: SectionDef[]
}

export const f = (name: string, type: FieldType, extra: Partial<FieldDef> = {}): FieldDef => ({
  name,
  type,
  required: true,
  ...extra,
})

export const enumOpts = (...values: string[]) => ({ type: 'status' as FieldType, options: values })
