import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Genome, ModuleKey, Project } from '../types'
import { compileProject, defaultModuleSeeds, genomeFromSeed, remixSeed, type CompileOptions } from '../engine'

const STORAGE_KEY = 'lula.devzign.projects.v1'
const THEME_KEY = 'lula.devzign.theme.v1'

interface StoreValue {
  projects: Project[]
  create: (opts: CompileOptions) => Project
  regenerate: (project: Project, module?: ModuleKey, patch?: Partial<CompileOptions>) => Project
  remove: (id: string) => void
  get: (id: string) => Project | undefined
  theme: 'dark' | 'light'
  toggleTheme: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

function load(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Project[]
  } catch {
    return []
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => load())
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem(THEME_KEY)
    return stored === 'light' ? 'light' : 'dark'
  })

  useEffect(() => {
    const write = (list: Project[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    try {
      write(projects)
    } catch {
      // Quota exceeded: keep the most recent compiles and retry once.
      try {
        write(projects.slice(0, 4))
      } catch {
        /* storage unavailable — the in-memory session still works */
      }
    }
  }, [projects])

  useEffect(() => {
    document.documentElement.dataset.appTheme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const create = useCallback((opts: CompileOptions) => {
    const project = compileProject(opts)
    setProjects((prev) => [project, ...prev].slice(0, 24))
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
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const get = useCallback((id: string) => projects.find((p) => p.id === id), [projects])

  const value = useMemo<StoreValue>(
    () => ({ projects, create, regenerate, remove, get, theme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }),
    [projects, create, regenerate, remove, get, theme],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}

export { defaultModuleSeeds, genomeFromSeed }
export type { Genome }
