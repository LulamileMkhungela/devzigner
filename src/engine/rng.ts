/** Deterministic pseudo-randomness. Same input → same product, forever. */

export function hashString(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

export interface Rng {
  next: () => number
  int: (min: number, max: number) => number
  pick: <T>(arr: readonly T[]) => T
  picks: <T>(arr: readonly T[], n: number) => T[]
  chance: (p: number) => boolean
  shuffled: <T>(arr: readonly T[]) => T[]
  weighted: <T>(arr: readonly { value: T; weight: number }[]) => T
}

/** mulberry32 */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0
  const next = () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  const pick = <T>(arr: readonly T[]): T => arr[int(0, arr.length - 1)]
  const shuffled = <T>(arr: readonly T[]): T[] => {
    const out = [...arr]
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i)
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
  const picks = <T>(arr: readonly T[], n: number): T[] => shuffled(arr).slice(0, Math.min(n, arr.length))
  const chance = (p: number) => next() < p
  const weighted = <T>(arr: readonly { value: T; weight: number }[]): T => {
    const total = arr.reduce((s, a) => s + a.weight, 0)
    let r = next() * total
    for (const a of arr) {
      r -= a.weight
      if (r <= 0) return a.value
    }
    return arr[arr.length - 1].value
  }
  return { next, int, pick, picks, chance, shuffled, weighted }
}

export function seedFrom(text: string): number {
  return hashString(text.trim().toLowerCase() || 'prodops')
}

export function moduleSeed(base: number, module: string, version = 0): number {
  return hashString(`${base}:${module}:${version}`)
}

/** Human-friendly, pronounceable seed phrase (stable per number). */
const SEED_LEFT = ['amber', 'cobalt', 'lunar', 'delta', 'ivory', 'north', 'solar', 'quiet', 'rapid', 'velvet', 'copper', 'harbor', 'indigo', 'maple', 'orbit', 'cedar', 'slate', 'mint', 'ember', 'onyx']
const SEED_RIGHT = ['atlas', 'ember', 'harbor', 'signal', 'lattice', 'meadow', 'vector', 'canyon', 'pilot', 'summit', 'quartz', 'drift', 'forge', 'willow', 'pixel', 'delta', 'orbit', 'prism', 'river', 'grove']

export function seedPhrase(seed: number): string {
  const rng = makeRng(seed)
  return `${rng.pick(SEED_LEFT)}-${rng.pick(SEED_RIGHT)}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function titleCase(text: string): string {
  return text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1))
}

export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}
