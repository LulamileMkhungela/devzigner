// ProdOps — developed by Lulamile Mkhungela.
//
// The one store: projects, screenshots, version books, the active project and
// the theme, persisted to this browser and migrated on the way in. Everything a
// view can change goes through here, and every compile keeps the stages the
// builder has confirmed — unless the description itself changed.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { DesignOverrides, Genome, ModuleKey, Project, RegistryComponent, Section, SystemOverrides, UserFlow, Version } from '../types'
import { compileProject, defaultModuleSeeds, genomeFromSeed, remixSeed, type CompileOptions } from '../engine'
import { migrateProjects } from './migrate'
import { KEYS, readJson, writeJson } from './storage'

const STORAGE_KEY = KEYS.projects
const THEME_KEY = KEYS.theme
const CAPTURE_KEY = KEYS.captures
const ACTIVE_KEY = KEYS.active
const VERSION_KEY = KEYS.versions

/** The install ships with one finished product, so the flow is walkable on
 *  first paint with no prompt, key, seed or paste. */
export const STARTER: CompileOptions = {
  idea: 'A marketplace where township artisans sell directly to buyers across South Africa',
  archetypeId: 'marketplace',
  seed: 112233,
}

type Theme = 'light' | 'dark'
type CaptureMap = Record<string, string[]>
interface VersionBook {
  branch: string
  versions: Version[]
}
type VersionMap = Record<string, VersionBook>

interface StoreValue {
  projects: Project[]
  active: Project
  create: (opts: CompileOptions) => Project
  regenerate: (project: Project, module?: ModuleKey, patch?: Partial<CompileOptions>) => Project
  remove: (id: string) => void
  setActive: (id: string) => void
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  captures: string[]
  isCaptured: (screenId: string) => boolean
  capture: (screenIds: string[]) => void
  clearCaptures: () => void
  reset: () => void
  /* ---- staged progress ---- */
  confirmed: string[]
  confirmStage: (id: string) => void
  unconfirmStage: (id: string) => void
  setBrief: (idea: string) => Project
  toast: string
  notify: (message: string) => void
  /* ---- inline design editor ---- */
  overrides: DesignOverrides
  setOverride: (key: keyof DesignOverrides, value: DesignOverrides[keyof DesignOverrides] | undefined) => void
  clearOverrides: () => void
  /* ---- iterative flows ---- */
  addFlow: (flow: UserFlow) => void
  removeFlow: (id: string) => void
  /* ---- definable system ---- */
  systemOverrides: SystemOverrides
  setStack: (layer: string, choice: string) => void
  addComponent: (component: RegistryComponent) => void
  removeComponent: (id: string) => void
  resetSystem: () => void
  /* ---- versioned wiki ---- */
  versions: Version[]
  branch: string
  branches: string[]
  commit: (message: string) => Version
  restore: (id: string) => void
  createBranch: (name: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

function initialVersion(project: Project): Version {
  return {
    id: `v1-${project.seed.toString(36)}`,
    branch: 'main',
    message: 'Initial compile',
    at: project.createdAt,
    parent: null,
    stats: {
      sections: project.sections.length,
      screens: project.sections.reduce((n, s) => n + s.screens.length, 0),
      flows: project.flows.length,
      score: project.audit.score,
      primary: project.design.colors[0].base,
      radius: project.design.radii.md,
    },
    snapshot: {
      seed: project.seed,
      archetypeId: project.archetypeId,
      genome: project.genome,
      overrides: project.overrides ?? {},
      customFlows: [],
    },
  }
}

export function screenIdsOf(section: Section): string[] {
  return section.screens.map((s) => s.id)
}

export function allScreenIds(project: Project): string[] {
  return (project.sections ?? []).flatMap(screenIdsOf)
}

function withCustomFlows(next: Project, previous: Project): Project {
  // `previous` may come straight from storage, where older builds stored no
  // flows at all — an unguarded `.filter` here is a blank page on first paint.
  const custom = (previous.flows ?? []).filter((f) => f?.custom)
  return custom.length ? { ...next, flows: [...next.flows, ...custom] } : next
}

/**
 * Recompile the same project with one thing changed.
 *
 * `fresh` is for a rewritten description: none of the compiled inputs (seed,
 * archetype, name, module seeds) survive, because they describe the old idea.
 * Use it with a new `idea` and the compiler derives everything again.
 */
function compileLikeProject(project: Project, patch: Partial<CompileOptions> = {}, fresh = false): Project {
  const kept: CompileOptions = fresh
    ? { currency: project.currency, createdAt: project.createdAt }
    : {
        idea: project.idea,
        seed: project.seed,
        archetypeId: project.archetypeId,
        genome: project.genome,
        currency: project.currency,
        moduleSeeds: { ...project.moduleSeeds },
        nameOverride: project.name,
        overrides: { ...(project.overrides ?? {}) },
        systemOverrides: { ...(project.systemOverrides ?? {}) },
        createdAt: project.createdAt,
      }
  const options: CompileOptions = { ...kept, ...patch }
  const next = compileProject(options)
  next.id = project.id
  next.createdAt = project.createdAt
  next.updatedAt = Date.now()
  // A recompile keeps the stages the builder already confirmed — unless the
  // idea changed, in which case every stage has to be reviewed again.
  const reworded = patch.idea !== undefined && patch.idea.trim() !== project.idea.trim()
  next.progress = { confirmed: reworded ? [] : project.progress?.confirmed ?? [] }
  // Hand-written flows belong to the product that was described; a rewrite
  // starts without them rather than importing a flow nobody asked for.
  return reworded ? next : withCustomFlows(next, project)
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => {
    // Nothing from storage is trusted: a record from an older build is either
    // complete, rebuilt from its own inputs, or dropped. A throw here would
    // happen before React mounts, which reads as a blank page.
    try {
      const stored = migrateProjects(readJson<unknown>(STORAGE_KEY, []))
      if (stored.length) return stored
    } catch {
      /* unreadable storage — fall through to a fresh compile */
    }
    return [compileProject(STARTER)]
  })
  const [theme, setThemeState] = useState<Theme>(() => (readJson<string>(THEME_KEY, 'dark') === 'light' ? 'light' : 'dark'))
  const [activeId, setActiveId] = useState<string>(() => readJson<string>(ACTIVE_KEY, ''))
  const [captures, setCaptures] = useState<CaptureMap>(() => {
    const stored = readJson<CaptureMap>(CAPTURE_KEY, {})
    if (stored && Object.keys(stored).length) return stored
    const first = projects[0]
    return first ? { [first.id]: allScreenIds(first) } : {}
  })
  const [books, setBooks] = useState<VersionMap>(() => {
    const stored = readJson<VersionMap>(VERSION_KEY, {})
    if (Object.keys(stored).length) return stored
    const first = projects[0]
    return first ? { [first.id]: { branch: 'main', versions: [initialVersion(first)] } } : {}
  })
  const [toast, setToast] = useState('')

  const active = projects.find((p) => p.id === activeId) ?? projects[0]
  const book: VersionBook = (active && books[active.id]) || { branch: 'main', versions: [] }

  useEffect(() => {
    writeJson(STORAGE_KEY, projects)
  }, [projects])
  useEffect(() => {
    writeJson(CAPTURE_KEY, captures)
  }, [captures])
  useEffect(() => {
    writeJson(VERSION_KEY, books)
  }, [books])
  useEffect(() => {
    document.documentElement.dataset.appTheme = theme
    writeJson(THEME_KEY, theme)
  }, [theme])
  useEffect(() => {
    if (active) writeJson(ACTIVE_KEY, active.id)
  }, [active])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(t)
  }, [toast])

  const notify = useCallback((message: string) => setToast(message), [])

  const replace = useCallback((next: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === next.id ? next : p)))
  }, [])

  const create = useCallback((opts: CompileOptions) => {
    const project = compileProject(opts)
    setProjects((prev) => [project, ...prev].slice(0, 24))
    setActiveId(project.id)
    setCaptures((prev) => ({ ...prev, [project.id]: [] }))
    setBooks((prev) => ({ ...prev, [project.id]: { branch: 'main', versions: [initialVersion(project)] } }))
    return project
  }, [])

  const regenerate = useCallback((project: Project, module?: ModuleKey, patch: Partial<CompileOptions> = {}) => {
    // A rewritten description is a new product: the archetype it reads as, the
    // name it earns and the seeds behind it all have to be re-derived, or the
    // old shape would survive under the new words.
    const reworded = patch.idea !== undefined && patch.idea.trim() !== project.idea.trim()

    const base: CompileOptions = reworded
      ? {
          idea: patch.idea,
          currency: project.currency,
          overrides: { ...(project.overrides ?? {}) },
          systemOverrides: { ...(project.systemOverrides ?? {}) },
          createdAt: project.createdAt,
        }
      : {
          idea: project.idea,
          seed: project.seed,
          archetypeId: project.archetypeId,
          genome: project.genome,
          currency: project.currency,
          moduleSeeds: { ...project.moduleSeeds },
          nameOverride: project.name,
          overrides: { ...(project.overrides ?? {}) },
          systemOverrides: { ...(project.systemOverrides ?? {}) },
          createdAt: project.createdAt,
        }
    const options: CompileOptions = { ...base, ...patch }
    if (module) {
      options.moduleSeeds = { ...(options.moduleSeeds ?? project.moduleSeeds) } as Record<ModuleKey, number>
      options.moduleSeeds[module] = remixSeed(options.moduleSeeds[module], `${module}`, Math.floor(Math.random() * 9999))
    }
    const next = compileLikeProject(project, options, reworded)
    replace(next)
    return next
  }, [replace])

  const setOverride = useCallback(
    (key: keyof DesignOverrides, value: DesignOverrides[keyof DesignOverrides] | undefined) => {
      if (!active) return
      const overrides: DesignOverrides = { ...(active.overrides ?? {}) }
      if (value === undefined) delete overrides[key]
      else (overrides as Record<string, unknown>)[key] = value
      replace(compileLikeProject(active, { overrides }))
    },
    [active, replace],
  )

  const clearOverrides = useCallback(() => {
    if (!active) return
    replace(compileLikeProject(active, { overrides: {} }))
  }, [active, replace])

  const addFlow = useCallback(
    (flow: UserFlow) => {
      if (!active) return
      setProjects((prev) => prev.map((p) => (p.id === active.id ? { ...p, flows: [...p.flows, flow] } : p)))
    },
    [active],
  )

  const removeFlow = useCallback(
    (id: string) => {
      if (!active) return
      setProjects((prev) => prev.map((p) => (p.id === active.id ? { ...p, flows: p.flows.filter((f) => f.id !== id) } : p)))
    },
    [active],
  )

  const setStack = useCallback(
    (layer: string, choice: string) => {
      if (!active) return
      const next: SystemOverrides = { ...(active.systemOverrides ?? {}), stack: { ...(active.systemOverrides?.stack ?? {}) } }
      if (choice) next.stack![layer] = choice
      else delete next.stack![layer]
      replace(compileLikeProject(active, { systemOverrides: next }))
    },
    [active, replace],
  )

  const addComponent = useCallback(
    (component: RegistryComponent) => {
      if (!active) return
      const current = active.systemOverrides ?? {}
      const next: SystemOverrides = {
        ...current,
        components: [...(current.components ?? []).filter((c) => c.id !== component.id), component],
        removed: (current.removed ?? []).filter((id) => id !== component.id),
      }
      replace(compileLikeProject(active, { systemOverrides: next }))
    },
    [active, replace],
  )

  const removeComponent = useCallback(
    (id: string) => {
      if (!active) return
      const current = active.systemOverrides ?? {}
      const custom = (current.components ?? []).some((c) => c.id === id)
      const next: SystemOverrides = custom
        ? { ...current, components: (current.components ?? []).filter((c) => c.id !== id) }
        : { ...current, removed: Array.from(new Set([...(current.removed ?? []), id])) }
      replace(compileLikeProject(active, { systemOverrides: next }))
    },
    [active, replace],
  )

  const resetSystem = useCallback(() => {
    if (!active) return
    replace(compileLikeProject(active, { systemOverrides: {} }))
  }, [active, replace])

  const remove = useCallback((id: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id)
      return next.length ? next : [compileProject(STARTER)]
    })
    setBooks((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const confirmStage = useCallback(
    (id: string) => {
      if (!active) return
      const confirmed = active.progress?.confirmed ?? []
      if (confirmed.includes(id)) return
      replace({ ...active, progress: { confirmed: [...confirmed, id] } })
    },
    [active, replace],
  )

  const unconfirmStage = useCallback(
    (id: string) => {
      if (!active) return
      const confirmed = (active.progress?.confirmed ?? []).filter((entry) => entry !== id)
      replace({ ...active, progress: { confirmed } })
    },
    [active, replace],
  )

  /** Rewrite the product from the builder's own description. */
  const setBrief = useCallback(
    (idea: string) => {
      if (!active) return active
      return regenerate(active, undefined, { idea })
    },
    [active, regenerate],
  )

  const setActive = useCallback((id: string) => setActiveId(id), [])
  const setTheme = useCallback((t: Theme) => setThemeState(t), [])
  const toggleTheme = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), [])

  const projectCaptures = useMemo(() => (active ? captures[active.id] ?? [] : []), [captures, active])
  const isCaptured = useCallback((screenId: string) => projectCaptures.includes(screenId), [projectCaptures])

  const capture = useCallback(
    (screenIds: string[]) => {
      if (!active) return
      setCaptures((prev) => {
        const current = new Set(prev[active.id] ?? [])
        screenIds.forEach((id) => current.add(id))
        return { ...prev, [active.id]: Array.from(current) }
      })
    },
    [active],
  )

  const clearCaptures = useCallback(() => {
    if (!active) return
    setCaptures((prev) => ({ ...prev, [active.id]: [] }))
  }, [active])

  const commit = useCallback(
    (message: string) => {
      const target = active
      const branch = book.branch
      const head = book.versions[0]
      const version: Version = {
        id: `v${book.versions.length + 1}-${target.seed.toString(36)}-${Math.floor(Math.random() * 1296).toString(36)}`,
        branch,
        message: message.trim() || 'Snapshot',
        at: Date.now(),
        parent: head?.id ?? null,
        stats: {
          sections: target.sections.length,
          screens: target.sections.reduce((n, s) => n + s.screens.length, 0),
          flows: target.flows.length,
          score: target.audit.score,
          primary: target.design.colors[0].base,
          radius: target.design.radii.md,
        },
        snapshot: {
          seed: target.seed,
          archetypeId: target.archetypeId,
          genome: target.genome,
          overrides: { ...(target.overrides ?? {}) },
          customFlows: target.flows.filter((f) => f.custom),
        },
      }
      setBooks((prev) => {
        const current = prev[target.id] ?? { branch, versions: [] }
        return { ...prev, [target.id]: { branch, versions: [version, ...current.versions] } }
      })
      return version
    },
    [active, book],
  )

  const restore = useCallback(
    (id: string) => {
      const target = active
      const version = book.versions.find((v) => v.id === id)
      if (!target || !version) return
      const next = compileProject({
        idea: target.idea,
        seed: version.snapshot.seed,
        archetypeId: version.snapshot.archetypeId,
        genome: version.snapshot.genome,
        currency: target.currency,
        moduleSeeds: defaultModuleSeeds(version.snapshot.seed, version.snapshot.archetypeId),
        nameOverride: target.name,
        overrides: version.snapshot.overrides,
        createdAt: target.createdAt,
      })
      next.id = target.id
      next.createdAt = target.createdAt
      next.flows = [...next.flows, ...version.snapshot.customFlows]
      replace(next)
    },
    [active, book, replace],
  )

  const createBranch = useCallback(
    (name: string) => {
      if (!active) return
      const clean = name.trim().toLowerCase().replace(/[^a-z0-9/_-]+/g, '-').replace(/^-|-$/g, '') || 'branch'
      setBooks((prev) => {
        const current = prev[active.id] ?? { branch: 'main', versions: [] }
        return { ...prev, [active.id]: { ...current, branch: clean } }
      })
    },
    [active],
  )

  const branches = useMemo(() => Array.from(new Set(['main', ...book.versions.map((v) => v.branch), book.branch])), [book])

  const reset = useCallback(() => {
    const starter = compileProject(STARTER)
    setProjects([starter])
    setActiveId(starter.id)
    setCaptures({ [starter.id]: allScreenIds(starter) })
    setBooks({})
    setThemeState('light')
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      projects,
      active,
      create,
      regenerate,
      remove,
      setActive,
      theme,
      setTheme,
      toggleTheme,
      captures: projectCaptures,
      isCaptured,
      capture,
      clearCaptures,
      reset,
    confirmed: active?.progress?.confirmed ?? [],
    confirmStage,
    unconfirmStage,
    setBrief,
      toast,
      notify,
      overrides: active?.overrides ?? {},
      setOverride,
      clearOverrides,
      addFlow,
      removeFlow,
      systemOverrides: active?.systemOverrides ?? {},
      setStack,
      addComponent,
      removeComponent,
      resetSystem,
      versions: book.versions,
      branch: book.branch,
      branches,
      commit,
      restore,
      createBranch,
    }),
    [
      projects,
      active,
      create,
      regenerate,
      remove,
      setActive,
      theme,
      setTheme,
      toggleTheme,
      projectCaptures,
      isCaptured,
      capture,
      clearCaptures,
      reset,
      toast,
      notify,
      setOverride,
      clearOverrides,
      addFlow,
      removeFlow,
      setStack,
      addComponent,
      removeComponent,
      resetSystem,
      book,
      branches,
      commit,
      restore,
      createBranch,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}

export { defaultModuleSeeds, genomeFromSeed }
export type { Genome, Theme }
