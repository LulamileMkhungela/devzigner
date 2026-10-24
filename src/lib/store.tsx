import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Genome, ModuleKey, Project, Section } from '../types'
import { compileProject, defaultModuleSeeds, genomeFromSeed, remixSeed, type CompileOptions } from '../engine'

const STORAGE_KEY = 'lula.devzign.projects.v1'
const THEME_KEY = 'lula.devzign.theme.v1'
const CAPTURE_KEY = 'lula.devzign.captures.v1'
const ACTIVE_KEY = 'lula.devzign.active.v1'

/** The install ships with one finished product, so the flow is walkable on
 *  first paint with no prompt, key, seed or paste. */
export const STARTER: CompileOptions = {
  idea: 'A marketplace where township artisans sell directly to buyers across South Africa',
  archetypeId: 'marketplace',
  seed: 112233,
}

type Theme = 'light' | 'dark'
type CaptureMap = Record<string, string[]>

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
  toast: string
  notify: (message: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full — the session still works in memory */
  }
}

export function screenIdsOf(section: Section): string[] {
  return section.screens.map((s) => s.id)
}

export function allScreenIds(project: Project): string[] {
  return project.sections.flatMap(screenIdsOf)
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => {
    const stored = readJson<Project[]>(STORAGE_KEY, [])
    if (Array.isArray(stored) && stored.length) return stored
    return [compileProject(STARTER)]
  })
  const [theme, setThemeState] = useState<Theme>(() => (readJson<string>(THEME_KEY, 'light') === 'dark' ? 'dark' : 'light'))
  const [activeId, setActiveId] = useState<string>(() => readJson<string>(ACTIVE_KEY, ''))
  const [captures, setCaptures] = useState<CaptureMap>(() => {
    const stored = readJson<CaptureMap>(CAPTURE_KEY, {})
    if (stored && Object.keys(stored).length) return stored
    // First run: the product on screen arrives with its screens already
    // captured, so Section and Export are complete the moment the app opens.
    const first = projects[0]
    return first ? { [first.id]: allScreenIds(first) } : {}
  })
  const [toast, setToast] = useState('')

  const active = projects.find((p) => p.id === activeId) ?? projects[0]

  useEffect(() => {
    writeJson(STORAGE_KEY, projects)
  }, [projects])
  useEffect(() => {
    writeJson(CAPTURE_KEY, captures)
  }, [captures])
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

  const create = useCallback((opts: CompileOptions) => {
    const project = compileProject(opts)
    setProjects((prev) => [project, ...prev].slice(0, 24))
    setActiveId(project.id)
    // A fresh product starts with no captures: the screenshot step is the one
    // artefact a designer still has to take.
    setCaptures((prev) => ({ ...prev, [project.id]: [] }))
    return project
  }, [])

  const regenerate = useCallback((project: Project, module?: ModuleKey, patch: Partial<CompileOptions> = {}) => {
    const base: CompileOptions = {
      idea: project.idea,
      seed: project.seed,
      archetypeId: project.archetypeId,
      genome: project.genome,
      currency: project.currency,
      moduleSeeds: { ...project.moduleSeeds },
      nameOverride: project.name,
      createdAt: project.createdAt,
      ...patch,
    }
    if (module) {
      base.moduleSeeds = { ...(base.moduleSeeds as Record<ModuleKey, number>) }
      const current = base.moduleSeeds[module]
      base.moduleSeeds[module] = remixSeed(current, `${module}`, Math.floor(Math.random() * 9999))
    }
    const next = compileProject(base)
    next.id = project.id
    next.createdAt = project.createdAt
    next.updatedAt = Date.now()
    setProjects((prev) => prev.map((p) => (p.id === project.id ? next : p)))
    return next
  }, [])

  const remove = useCallback((id: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id)
      return next.length ? next : [compileProject(STARTER)]
    })
  }, [])

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

  const reset = useCallback(() => {
    const starter = compileProject(STARTER)
    setProjects([starter])
    setActiveId(starter.id)
    setCaptures({ [starter.id]: allScreenIds(starter) })
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
      toast,
      notify,
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
