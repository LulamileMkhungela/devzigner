// ProdOps — developed by Lulamile Mkhungela.
//
// The compiler entry point. One call, `compileProject`, turns a description (or
// a seed) into a complete, internally consistent product: brief, data model,
// design system, sections, screens, roadmap, flows, system record and audit.
// Pure functions only — no React, no storage, no network — so the same inputs
// always produce the same package.

import type { CompileInput, DesignOverrides, Genome, ModuleKey, Project, SystemOverrides } from '../types'
import { getPack } from './packs'
import { hashString, makeRng, moduleSeed, seedFrom, slugify } from './rng'
import { compileBrief } from './brief'
import { compileDataModel } from './dataModel'
import { compileDesign } from './design'
import { compileSections } from './sections'
import { compileRoadmap } from './roadmap'
import { compileAudit } from './audit'
import { compileFlows } from './flows'
import { applySystemOverrides, compileSystem } from './system'
import { profileIdea } from './intake'
import { readScope } from './scope'

export const DEFAULT_CURRENCY = 'ZAR'

/**
 * The compiler's own version, bumped whenever a change alters what a given
 * description compiles to.
 *
 * A stored product is a compiled artefact: sections, screens, flows, nav. A
 * builder who described a product last week still had Control room in their
 * workspace this week, because the record was structurally complete and
 * therefore trusted. That is how a fix ships and nobody sees it. The version
 * makes that impossible: a record compiled by another version is recompiled
 * from the inputs it stored, and the description decides again.
 */
export const COMPILER_VERSION = '2026-10-25-scope-2'

export const GENOME_PRESETS: { id: string; label: string; genome: Genome }[] = [
  { id: 'editorial', label: 'Editorial calm', genome: { density: 44, warmth: 68, contrast: 54, expression: 44, geometry: 30 } },
  { id: 'technical', label: 'Technical precision', genome: { density: 62, warmth: 22, contrast: 78, expression: 36, geometry: 14 } },
  { id: 'warm', label: 'Warm utility', genome: { density: 52, warmth: 74, contrast: 42, expression: 56, geometry: 60 } },
  { id: 'operator', label: 'Bold operator', genome: { density: 72, warmth: 38, contrast: 88, expression: 82, geometry: 22 } },
  { id: 'soft', label: 'Soft product', genome: { density: 36, warmth: 56, contrast: 32, expression: 48, geometry: 84 } },
  { id: 'industrial', label: 'Industrial', genome: { density: 76, warmth: 28, contrast: 70, expression: 42, geometry: 6 } },
]

export function genomeFromSeed(seed: number): Genome {
  const rng = makeRng(hashString(`genome:${seed}`))
  const preset = GENOME_PRESETS[rng.int(0, GENOME_PRESETS.length - 1)].genome
  const jitter = (v: number) => Math.max(0, Math.min(100, v + rng.int(-8, 8)))
  return {
    density: jitter(preset.density),
    warmth: jitter(preset.warmth),
    contrast: jitter(preset.contrast),
    expression: jitter(preset.expression),
    geometry: jitter(preset.geometry),
  }
}

export function defaultModuleSeeds(seed: number, archetypeId = ''): Record<ModuleKey, number> {
  const base = archetypeId ? hashString(`${seed}:${archetypeId}`) : seed
  return {
    brief: moduleSeed(base, 'brief'),
    roadmap: moduleSeed(base, 'roadmap'),
    data: moduleSeed(base, 'data'),
    design: moduleSeed(base, 'design'),
    sections: moduleSeed(base, 'sections'),
  }
}

export interface CompileOptions {
  idea?: string
  seed?: number
  archetypeId?: string
  genome?: Genome
  currency?: string
  moduleSeeds?: Record<ModuleKey, number>
  nameOverride?: string
  overrides?: DesignOverrides
  systemOverrides?: SystemOverrides
  /** Sections the builder added or removed by hand — see `readScope`. */
  scopeChoice?: { include?: string[]; exclude?: string[] }
  createdAt?: number
  /** Pin the clock so a package can be rebuilt byte for byte. */
  now?: number
}

/**
 * A product that has not been described yet.
 *
 * The workspace used to open on a finished sample — a marketplace with six
 * sections, screens, sample data and a design system — so the first thing a
 * new builder saw was somebody else's product presented as theirs. This is the
 * opposite: the same project shape, with nothing in it. The description is
 * empty, the brief has no problems or personas, and there are no sections,
 * screens, flows, entities or phases, because none of those can be derived from
 * a sentence that has not been written.
 *
 * The design tokens and the system are still compiled, because every view
 * renders through them the moment there *is* a product; they are simply not
 * shown while the product is empty. See `started()` in src/lib/state.ts.
 */
export function emptyProject(now = Date.now()): Project {
  const project = compileProject({ idea: '', archetypeId: 'saas', seed: 1111, now })
  return {
    ...project,
    id: 'untitled',
    name: 'Untitled product',
    idea: '',
    archetypeLabel: 'Not started',
    brief: {
      ...project.brief,
      summary: '',
      tagline: '',
      elevator: '',
      category: '',
      problems: [],
      personas: [],
      differentiators: [],
      metrics: [],
      principles: [],
      nonGoals: [],
      voice: { tone: '', say: [], avoid: [] },
    },
    roadmap: { ...project.roadmap, phases: [] },
    data: { ...project.data, entities: [], relationships: [] },
    sections: [],
    // Nothing was read, so there is no scope to report and no hand-made
    // choice to remember.
    scope: [],
    scopeChoice: {},
    flows: [],
    audit: { ...project.audit, checks: [], score: 0 },
    progress: { confirmed: [] },
    engineNotes: [],
  }
}

export function compileProject(opts: CompileOptions = {}): Project {
  const idea = (opts.idea ?? '').trim()
  // Read the description before anything is compiled: it decides the archetype
  // and contributes a name. Explicit options still win — a recompile of an
  // existing project must not silently become a different product.
  const intake = profileIdea(idea)
  const seed = opts.seed ?? seedFrom(idea || 'prodops')
  const archetypeId = opts.archetypeId ?? (intake.archetypeId || 'marketplace')
  const pack = getPack(archetypeId)
  const genome = opts.genome ?? genomeFromSeed(seed)
  const moduleSeeds = opts.moduleSeeds ?? defaultModuleSeeds(seed, archetypeId)

  const nameRng = makeRng(hashString(`name:${seed}:${archetypeId}`))
  const name = opts.nameOverride?.trim() || (intake.name || nameRng.pick(pack.names))

  // What the description asks for decides which of the pack's sections exist.
  // The whole pack is still reported in `scope`, so the Product stage can show
  // the builder what was left out and let them add it back.
  const scope = readScope(pack, idea, opts.scopeChoice ?? {})
  const inScope = pack.sections.filter((s) => scope.some((d) => d.id === s.id && d.included))
  const brief = compileBrief(pack, makeRng(moduleSeeds.brief), name, idea, intake)
  const data = compileDataModel(pack, makeRng(moduleSeeds.data))
  const design = compileDesign(
    pack,
    makeRng(moduleSeeds.design),
    genome,
    name,
    opts.overrides ?? {},
    inScope.map((s) => s.name),
  )
  const sections = uniqueScreenAddresses(
    compileSections(pack, data.entities, makeRng(moduleSeeds.sections), opts.currency ?? DEFAULT_CURRENCY, scope),
  )
  const roadmap = compileRoadmap(sections, '')
  const flows = compileFlows(sections, brief, moduleSeeds.sections)
  const system = applySystemOverrides(
    compileSystem({
      archetypeId,
      design,
      sections,
      entities: data.entities.map((e) => ({ id: e.id, name: e.name })),
      seed: moduleSeeds.design,
    }),
    opts.systemOverrides ?? {},
  )
  const audit = compileAudit(brief, data, design, sections)

  const now = opts.now ?? Date.now()
  const input: CompileInput = {
    idea,
    seed,
    genome,
    archetypeId,
    currency: opts.currency ?? DEFAULT_CURRENCY,
    moduleSeeds,
    nameOverride: opts.nameOverride,
    overrides: opts.overrides ?? {},
    systemOverrides: opts.systemOverrides ?? {},
    scopeChoice: opts.scopeChoice ?? {},
  }

  return {
    ...input,
    compiler: COMPILER_VERSION,
    id: `${slugify(name)}-${seed.toString(36).slice(0, 6)}`,
    name,
    archetypeLabel: pack.label,
    createdAt: opts.createdAt ?? now,
    updatedAt: now,
    brief,
    roadmap,
    data,
    design,
    sections,
    flows,
    system,
    audit,
    scope,
    engineNotes: engineNotesFor(pack.label, name, pack.names, genome, audit.score),
  }
}

/** Screens must be addressable: the prototype routes to them and screenshots are
 *  captured by id, so a duplicate gets a stable suffix rather than silently
 *  shadowing its twin. */
function uniqueScreenAddresses(sections: Project['sections']): Project['sections'] {
  const seenIds = new Map<string, number>()
  const seenRoutes = new Map<string, number>()
  return sections.map((section) => ({
    ...section,
    screens: section.screens.map((screen) => {
      const idCount = seenIds.get(screen.id) ?? 0
      seenIds.set(screen.id, idCount + 1)
      const routeCount = seenRoutes.get(screen.route) ?? 0
      seenRoutes.set(screen.route, routeCount + 1)
      if (idCount === 0 && routeCount === 0) return screen
      return {
        ...screen,
        id: idCount === 0 ? screen.id : `${screen.id}-${idCount + 1}`,
        route: routeCount === 0 ? screen.route : `${screen.route}-${routeCount + 1}`,
      }
    }),
  }))
}

function engineNotesFor(
  archetype: string,
  name: string,
  pool: string[],
  genome: Genome,
  score: number,
): string[] {
  const preset = GENOME_PRESETS.reduce<{ label: string; dist: number }>((best, p) => {
    const dist = Object.keys(genome).reduce(
      (n, k) => n + Math.abs(genome[k as keyof Genome] - p.genome[k as keyof Genome]),
      0,
    )
    return dist < best.dist ? { label: p.label, dist } : best
  }, { label: GENOME_PRESETS[0].label, dist: Infinity })
  return [
    `Archetype pack: ${archetype}. ${pool.length} name candidates were in the pool; the seed stream selected “${name}”.`,
    `Genome derived from preset “${preset.label}” with deterministic jitter — density ${genome.density}, warmth ${genome.warmth}, contrast ${genome.contrast}, expression ${genome.expression}, geometry ${genome.geometry}.`,
    `Each module (brief, roadmap, data, design, sections) runs on its own derived seed, so re-rolling the colour system cannot change a requirement.`,
    `Design tokens are computed with WCAG contrast maths, not chosen by taste: ${score}/100 of the audit checks pass.`,
    `Zero network requests, zero model calls. The same seed, archetype and genome produce a byte-identical export.`,
  ]
}

export function remixSeed(seed: number, module?: ModuleKey, version = 1): number {
  return module ? moduleSeed(seed, `${module}:remix`, version) : hashString(`${seed}:remix:${version}`)
}

export { getPack, ARCHETYPES, PACKS } from './packs'
export { seedFrom, seedPhrase, slugify, makeRng } from './rng'
export { compileBrief } from './brief'
export { compileDataModel, generateSql } from './dataModel'
export { compileDesign } from './design'
export { compileSections } from './sections'
export { compileRoadmap } from './roadmap'
export { compileAudit } from './audit'
export { compileFlows } from './flows'
export { compileSystem, applySystemOverrides } from './system'
export { contrastRatio } from './color'
