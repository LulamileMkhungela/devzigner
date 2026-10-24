/**
 * Stored projects age. New versions of the compiler add arrays — `flows`,
 * `system`, `audit`, per-section screens — and a record saved by an older build
 * simply does not have them. Trusting such a record is what turns a working app
 * into a blank page: the first `.filter` on a missing array throws before React
 * can render anything.
 *
 * So nothing from storage is trusted. A record is either structurally complete
 * (every array that the views iterate is present and is an array), or it is
 * recompiled from the inputs it did store — the compiler is deterministic, so a
 * rebuild loses nothing but the arrays that were missing — or it is dropped.
 */
import type { Project, UserFlow } from '../types'
import { compileProject, type CompileOptions } from '../engine'

/** Every array the views and the export iterate over. Missing one is a crash. */
function isComplete(value: Partial<Project>): boolean {
  const sections = value.sections
  const data = value.data
  const design = value.design
  const system = value.system
  const brief = value.brief

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    Array.isArray(sections) &&
    sections.every(
      (section) =>
        section &&
        typeof section.id === 'string' &&
        Array.isArray(section.screens) &&
        section.screens.every((screen) => screen && Array.isArray(screen.blocks)) &&
        Array.isArray(section.entityIds),
    ) &&
    Array.isArray(value.flows) &&
    Array.isArray(value.roadmap) &&
    Boolean(brief) &&
    Array.isArray(brief?.problems) &&
    Array.isArray(brief?.personas) &&
    Boolean(data) &&
    Array.isArray(data?.entities) &&
    data!.entities.every((entity) => entity && Array.isArray(entity.fields) && Array.isArray(entity.rows)) &&
    Boolean(design) &&
    Array.isArray(design?.colors) &&
    Array.isArray(design?.typography) &&
    Array.isArray(design?.breakpoints) &&
    Boolean(system) &&
    Array.isArray(system?.stack) &&
    Array.isArray(system?.components) &&
    Boolean(system?.shell) &&
    Array.isArray(system?.shell?.routes) &&
    Boolean(value.audit) &&
    Array.isArray(value.audit?.checks)
  )
}

/**
 * The compiler options a stored record still carries. Anything it does not
 * have is left to the compiler's defaults.
 */
function optionsFrom(record: Partial<Project>): CompileOptions | null {
  if (typeof record.seed !== 'number' || typeof record.archetypeId !== 'string') return null

  const options: CompileOptions = {
    idea: typeof record.idea === 'string' ? record.idea : '',
    seed: record.seed,
    archetypeId: record.archetypeId,
  }
  if (record.genome) options.genome = record.genome
  if (record.currency) options.currency = record.currency
  if (record.moduleSeeds) options.moduleSeeds = record.moduleSeeds
  if (typeof record.name === 'string') options.nameOverride = record.name
  if (record.overrides) options.overrides = record.overrides
  if (record.systemOverrides) options.systemOverrides = record.systemOverrides
  if (typeof record.createdAt === 'number') options.createdAt = record.createdAt
  return options
}

/** Returns a project that is safe to render, or `null` if the record is junk. */
export function migrateProject(value: unknown): Project | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Partial<Project>

  if (isComplete(record)) return record as Project

  const options = optionsFrom(record)
  if (!options) return null

  try {
    const rebuilt = compileProject(options)
    if (typeof record.id === 'string') rebuilt.id = record.id
    if (typeof record.createdAt === 'number') rebuilt.createdAt = record.createdAt

    // Hand-written flows are the one thing a rebuild cannot invent.
    const custom = Array.isArray(record.flows) ? (record.flows as UserFlow[]).filter((flow) => flow?.custom) : []
    if (custom.length) rebuilt.flows = [...rebuilt.flows, ...custom]

    return rebuilt
  } catch {
    return null
  }
}

/** A whole stored library, with the unusable records dropped. */
export function migrateProjects(value: unknown): Project[] {
  if (!Array.isArray(value)) return []
  return value.map(migrateProject).filter((project): project is Project => project !== null)
}
