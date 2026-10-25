/**
 * Browser storage, with one rename handled honestly.
 *
 * ProdOps was called ProdOps until this release, and the keys it wrote
 * carry that name (`prodops.projects.v1`). Renaming a key without a
 * migration is how a workspace loses every project it has — so every read
 * checks the current key first and the old one second, and every write goes to
 * the current key. A reader who opens ProdOps after the rename keeps their
 * product, their screenshots, their versions and their theme.
 */

/** Keys ProdOps writes. One prefix, one version suffix, nothing ad hoc. */
export const KEYS = {
  projects: 'prodops.projects.v1',
  captures: 'prodops.captures.v1',
  versions: 'prodops.versions.v1',
  active: 'prodops.active.v1',
  theme: 'prodops.theme.v1',
  banner: (projectId: string) => `prodops.banner.${projectId}`,
} as const

/**
 * The keys this app wrote before it was called ProdOps. Spelled out in full on
 * purpose: these strings must never follow a rename, or the migration has
 * nothing to migrate from.
 */
const LEGACY: Record<string, string> = {
  'prodops.projects.v1': 'lula.devzign.projects.v1',
  'prodops.captures.v1': 'lula.devzign.captures.v1',
  'prodops.versions.v1': 'lula.devzign.versions.v1',
  'prodops.active.v1': 'lula.devzign.active.v1',
  'prodops.theme.v1': 'lula.devzign.theme.v1',
}

function legacyFor(key: string): string | undefined {
  if (LEGACY[key]) return LEGACY[key]
  if (key.startsWith('prodops.banner.')) return key.replace('prodops.banner.', 'lula.banner.')
  return undefined
}

/** Read a raw string, current key first, pre-rename key second. */
export function readRaw(key: string): string | null {
  try {
    const current = localStorage.getItem(key)
    if (current !== null) return current
    const legacy = legacyFor(key)
    return legacy ? localStorage.getItem(legacy) : null
  } catch {
    return null
  }
}

export function writeRaw(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage full or blocked — the session still works in memory */
  }
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = readRaw(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  writeRaw(key, JSON.stringify(value))
}
