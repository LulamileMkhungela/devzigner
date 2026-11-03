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
import { COMPILER_VERSION, compileProject, type CompileOptions } from '../engine'
import { started } from './state'

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
    // The roadmap is an object holding phases, not an array: the old check asked
    // the wrong question, so every load silently recompiled every product and
    // rewrote its `updatedAt`.
    Array.isArray(value.roadmap?.phases) &&
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
  // The builder's own scope choices are theirs; a recompile must not silently
  // put a section back that they removed.
  if (record.scopeChoice) options.scopeChoice = record.scopeChoice
  return options
}

/**
 * The sample product the workspace used to open on.
 *
 * It was compiled, not described: seed 112233 on the marketplace pack, with a
 * sentence nobody typed. A builder whose browser still holds it has never given
 * a product, so the honest thing is to drop it and open on the description
 * field — not to recompile somebody else's marketplace and call it theirs.
 */
const SAMPLE_IDEA = /^a marketplace where township artisans sell directly to buyers across south africa$/i

function wasTheSample(record: Partial<Project>): boolean {
  return record.seed === 112233 && typeof record.idea === 'string' && SAMPLE_IDEA.test(record.idea.trim())
}

/** Returns a project that is safe to render, or `null` if the record is junk. */
export function migrateProject(value: unknown): Project | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Partial<Project>
  // Never the builder's own words: an auto-seeded sample is not a product.
  if (wasTheSample(record)) return null

  // A described product must carry proof that a description produced it. Every
  // record from before this flag existed is dropped, because those records came
  // from the sample the workspace used to open on — the product the builder
  // never asked for. Undescribed records are kept: they are empty anyway, and
  // dropping them would churn the id on every reload.
  if (record.described !== true && started(record as Project)) return null

  // A complete record is only trusted if *this* compiler built it. The shape can
  // be right and the content stale: a product compiled before sections were
  // scoped still carries an ops dashboard nobody asked for.
  const current = record.compiler === COMPILER_VERSION
  if (current && isComplete(record)) return record as Project

  const options = optionsFrom(record)
  if (!options) return null

  try {
    const rebuilt = compileProject(options)
    if (typeof record.id === 'string') rebuilt.id = record.id
    if (typeof record.createdAt === 'number') rebuilt.createdAt = record.createdAt

    // Confirmations are the builder's own judgement; a rebuild must not hand
    // them back for free, nor take earned ticks away.
    const confirmed = Array.isArray(record.progress?.confirmed)
      ? record.progress!.confirmed.filter((id): id is string => typeof id === 'string')
      : []
    rebuilt.progress = { confirmed }

    // Hand-written flows are the one thing a rebuild cannot invent.
    const custom = Array.isArray(record.flows) ? (record.flows as UserFlow[]).filter((flow) => flow?.custom) : []
    if (custom.length) rebuilt.flows = [...rebuilt.flows, ...custom]

    // The workspace chrome is the builder's judgement, not compiled content:
    // the role the workspace runs as, the reviews on its steps and the skills
    // it integrated all survive a rebuild, like the confirmations above.
    if (typeof record.roleId === 'string') rebuilt.roleId = record.roleId
    if (record.stepReviews && typeof record.stepReviews === 'object' && !Array.isArray(record.stepReviews)) {
      rebuilt.stepReviews = record.stepReviews as Project['stepReviews']
    }
    if (Array.isArray(record.integratedSkills)) {
      rebuilt.integratedSkills = record.integratedSkills.filter((id): id is string => typeof id === 'string')
    }
    // Same rule for the rest of the workspace's own record: answers to the
    // clarifying questions, the specs already saved, the reference material the
    // builder brought in, the extra roles, and the design source. A rebuild
    // recompiles the product; it must not throw away the builder's thinking.
    if (Array.isArray(record.roles)) {
      rebuilt.roles = record.roles.filter((id): id is string => typeof id === 'string')
    }
    if (record.answers && typeof record.answers === 'object' && !Array.isArray(record.answers)) {
      rebuilt.answers = record.answers as Project['answers']
    }
    if (Array.isArray(record.references)) {
      rebuilt.references = record.references.filter((reference) => reference && typeof reference.id === 'string')
    }
    if (Array.isArray(record.artifacts)) {
      rebuilt.artifacts = record.artifacts.filter(
        (artifact) => artifact && typeof artifact.id === 'string' && typeof artifact.body === 'string',
      )
    }
    if (record.designSource && typeof record.designSource === 'object') {
      rebuilt.designSource = record.designSource as Project['designSource']
    }

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
