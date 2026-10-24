import type { CompileInput, Genome, ModuleKey, Project } from '../types'
import { getPack } from './packs'
import { hashString, makeRng, moduleSeed, seedFrom, slugify } from './rng'
import { compileBrief } from './brief'
import { compileDataModel } from './dataModel'
import { compileDesign } from './design'
import { compileSections } from './sections'
import { compileRoadmap } from './roadmap'
import { compileAudit } from './audit'

export const DEFAULT_CURRENCY = 'ZAR'

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
  createdAt?: number
}

export function compileProject(opts: CompileOptions = {}): Project {
  const idea = (opts.idea ?? '').trim()
  const seed = opts.seed ?? seedFrom(idea || 'lula-devzign')
  const archetypeId = opts.archetypeId ?? 'marketplace'
  const pack = getPack(archetypeId)
  const genome = opts.genome ?? genomeFromSeed(seed)
  const moduleSeeds = opts.moduleSeeds ?? defaultModuleSeeds(seed, archetypeId)

  const nameRng = makeRng(hashString(`name:${seed}:${archetypeId}`))
  const name = opts.nameOverride?.trim() || nameRng.pick(pack.names)

  const brief = compileBrief(pack, makeRng(moduleSeeds.brief), name, idea)
  const data = compileDataModel(pack, makeRng(moduleSeeds.data))
  const design = compileDesign(pack, makeRng(moduleSeeds.design), genome, name)
  const sections = compileSections(pack, data.entities, makeRng(moduleSeeds.sections), opts.currency ?? DEFAULT_CURRENCY)
  const roadmap = compileRoadmap(sections, '')
  const audit = compileAudit(brief, data, design, sections)

  const now = Date.now()
  const input: CompileInput = {
    idea,
    seed,
    genome,
    archetypeId,
    currency: opts.currency ?? DEFAULT_CURRENCY,
    moduleSeeds,
    nameOverride: opts.nameOverride,
  }

  return {
    ...input,
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
    audit,
    engineNotes: engineNotesFor(pack.label, name, pack.names, genome, audit.score),
  }
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
export { contrastRatio } from './color'
