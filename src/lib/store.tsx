// ProdOps — developed by Lulamile Mkhungela.
//
// The one store: projects, screenshots, version books, the active project and
// the theme, persisted to this browser and migrated on the way in. Everything a
// view can change goes through here, and every compile keeps the stages the
// builder has confirmed — unless the description itself changed.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  DesignOverrides,
  DesignSource,
  Genome,
  ModuleKey,
  Project,
  ProjectReference,
  RegistryComponent,
  ReviewDecision,
  RoleArtifact,
  Section,
  SystemOverrides,
  UserFlow,
  Version,
} from '../types'
import { compileProject, defaultModuleSeeds, emptyProject, genomeFromSeed, remixSeed, type CompileOptions } from '../engine'
import { migrateProjects } from './migrate'
import { roleById } from './roles'
import { renderDeliverable, stepDocuments } from './documents'
import { KEYS, readJson, writeJson } from './storage'

const STORAGE_KEY = KEYS.projects
const THEME_KEY = KEYS.theme
const CAPTURE_KEY = KEYS.captures
const ACTIVE_KEY = KEYS.active
const VERSION_KEY = KEYS.versions

/**
 * The sample product, and when it is allowed to exist.
 *
 * It used to be what the workspace opened on: a finished marketplace with six
 * sections, a design system and a prototype — presented as if it were the
 * builder's own. It is now reachable only by *asking* for it ("Show me a
 * finished example"), because a sample you browse is a sample you know the
 * provenance of, and a sample that is already loaded is a product somebody else
 * described.
 */
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
  /** Start an empty project — history keeps the old ones in the dropdown. */
  newProject: () => Project
  /* ---- roles: the process the workspace runs, and its reviews ---- */
  setRole: (roleId: string | null) => void
  /** Engages another role on top of the primary one — a project can run several. */
  toggleRole: (roleId: string) => void
  reviewStep: (key: string, decision: ReviewDecision, note?: string) => void
  /**
   * Review *and* save the step's documents in one state update. Approving a step
   * writes its spec, so the decision and the documents must not be two writes —
   * the second would read a stale project and drop the first.
   */
  reviewStepAndSave: (roleId: string, stepId: string, decision: ReviewDecision, note?: string) => RoleArtifact[]
  toggleSkill: (toolId: string) => void
  /** Answer (or clear) one clarifying question: key is `${roleId}.${stepId}.q{n}`. */
  setAnswer: (key: string, answer: string) => void
  /** Generate every document a step defines and save it into the spec folder. */
  saveStepDocuments: (roleId: string, stepId: string) => RoleArtifact[]
  /** Save one document by kind. */
  saveDocument: (roleId: string, stepId: string, kind: RoleArtifact['kind']) => RoleArtifact | undefined
  removeArtifact: (id: string) => void
  /** Bring a PDF, image, document or link into the workspace as reference material. */
  addReference: (reference: Omit<ProjectReference, 'id' | 'addedAt'>) => void
  removeReference: (id: string) => void
  setDesignSource: (source: DesignSource) => void
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
  /* ---- scope: which of the pack's sections this product is ---- */
  setSectionScope: (id: string, included: boolean) => void
  toast: string
  /**
   * A message, and — when there is an obvious next thing to do — the button
   * that does it. "Rebuilt" alone tells the builder nothing; "Rebuilt" with a
   * way back to the first stage tells them exactly where to go.
   */
  toastAction: { label: string; to: string } | null
  notify: (message: string, action?: { label: string; to: string }) => void
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
        scopeChoice: { ...(project.scopeChoice ?? {}) },
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
  // The workspace chrome is the builder's, not the compiler's: the role the
  // workspace runs as, the reviews it has earned and the skills it integrated
  // all survive a recompile, exactly like the stage confirmations.
  next.roleId = project.roleId
  next.stepReviews = project.stepReviews
  next.integratedSkills = project.integratedSkills
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
    // Nothing has been described yet, so the workspace opens on an empty
    // product: no sections, no screens, no tokens on show, no sample rows.
    return [emptyProject()]
  })
  const [theme, setThemeState] = useState<Theme>(() => (readJson<string>(THEME_KEY, 'dark') === 'light' ? 'light' : 'dark'))
  const [activeId, setActiveId] = useState<string>(() => readJson<string>(ACTIVE_KEY, ''))
  const [captures, setCaptures] = useState<CaptureMap>(() => {
    const stored = readJson<CaptureMap>(CAPTURE_KEY, {})
    if (stored && Object.keys(stored).length) return stored
    // A screenshot is something the builder takes, not something that arrives
    // with the page: an empty project starts with an empty capture set.
    return {}
  })
  const [books, setBooks] = useState<VersionMap>(() => {
    const stored = readJson<VersionMap>(VERSION_KEY, {})
    if (Object.keys(stored).length) return stored
    // The first version is written when the builder first builds, not by the
    // install: a history that starts with a commit nobody made is fiction.
    return {}
  })
  const [toast, setToast] = useState('')
  const [toastAction, setToastAction] = useState<{ label: string; to: string } | null>(null)

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
    // Long enough to read a sentence and reach the button.
    const t = window.setTimeout(() => {
      setToast('')
      setToastAction(null)
    }, 6000)
    return () => window.clearTimeout(t)
  }, [toast])

  const notify = useCallback((message: string, action?: { label: string; to: string }) => {
    setToast(message)
    setToastAction(action ?? null)
  }, [])

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
          scopeChoice: { ...(project.scopeChoice ?? {}) },
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

  /**
   * Add or remove one section, from the Product stage's scope list.
   *
   * The choice is stored as compile input and the product is recompiled, so the
   * roadmap, flows, screens and audit all follow. A section that has been added
   * or removed changes what Sections and Export are made of, so those two
   * confirmations are dropped and have to be earned again — the earlier three
   * stages are untouched.
   */
  const setSectionScope = useCallback(
    (id: string, included: boolean) => {
      if (!active) return
      const include = new Set((active.scopeChoice?.include ?? []).filter((x) => x !== id))
      const exclude = new Set((active.scopeChoice?.exclude ?? []).filter((x) => x !== id))
      ;(included ? include : exclude).add(id)
      const next = compileLikeProject(active, {
        scopeChoice: { include: [...include], exclude: [...exclude] },
      })
      next.progress = {
        confirmed: (active.progress?.confirmed ?? []).filter((stage) => stage !== 'sections' && stage !== 'export'),
      }
      replace(next)
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
      return next.length ? next : [emptyProject()]
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

  const newProject = useCallback(() => {
    // A blank project with its own id: the history dropdown keeps every
    // project the builder has, so a new one is added, never a replacement.
    const blank = emptyProject()
    blank.id = `p-${Date.now().toString(36)}-${Math.floor(Math.random() * 1296).toString(36)}`
    blank.updatedAt = Date.now()
    setProjects((prev) => [blank, ...prev].slice(0, 24))
    setActiveId(blank.id)
    setBooks((prev) => ({ ...prev, [blank.id]: { branch: 'main', versions: [] } }))
    return blank
  }, [])

  /** Run this workspace as a role — its process replaces the five-stage rail. */
  const setRole = useCallback(
    (roleId: string | null) => {
      if (!active) return
      replace({ ...active, roleId: roleId ?? undefined })
    },
    [active, replace],
  )

  /** One of the three review actions on a role step: approve / reject / proceed-but-revisit. */
  const reviewStep = useCallback(
    (key: string, decision: ReviewDecision, note?: string) => {
      if (!active) return
      const stepReviews = { ...(active.stepReviews ?? {}), [key]: { decision, note, at: Date.now() } }
      replace({ ...active, stepReviews })
    },
    [active, replace],
  )

  /**
   * One review plus the documents it writes, in a single replace. This is the
   * path the inspector uses for approve and proceed: a decision is never
   * recorded without the paperwork that belongs with it.
   */
  const reviewStepAndSave = useCallback(
    (roleId: string, stepId: string, decision: ReviewDecision, note?: string) => {
      if (!active) return []
      const role = roleById(roleId)
      const step = role?.steps.find((s) => s.id === stepId)
      if (!role || !step) return []
      const saved: RoleArtifact[] = stepDocuments(active, role, step).map(({ deliverable, body }) => ({
        id: `${role.id}.${step.id}.${deliverable.kind}`,
        roleId: role.id,
        stepId: step.id,
        kind: deliverable.kind,
        file: deliverable.file,
        title: `${step.title} — ${deliverable.label}`,
        body,
        createdAt: Date.now(),
      }))
      const keep = (active.artifacts ?? []).filter((artifact) => !saved.some((entry) => entry.id === artifact.id))
      const stepReviews = {
        ...(active.stepReviews ?? {}),
        [`${role.id}.${step.id}`]: { decision, note, at: Date.now() },
      }
      replace({ ...active, stepReviews, artifacts: [...keep, ...saved] })
      return saved
    },
    [active, replace],
  )

  /** Integrate (or drop) the role's skill — the builder's choice, never forced. */
  const toggleSkill = useCallback(
    (toolId: string) => {
      if (!active) return
      const current = active.integratedSkills ?? []
      const next = current.includes(toolId) ? current.filter((id) => id !== toolId) : [...current, toolId]
      replace({ ...active, integratedSkills: next })
    },
    [active, replace],
  )
  /** Engage (or disengage) a second role on this project. */
  const toggleRole = useCallback(
    (roleId: string) => {
      if (!active) return
      const current = active.roles ?? []
      const next = current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]
      replace({ ...active, roles: next })
    },
    [active, replace],
  )

  /** One clarifying answer. An empty answer clears the key rather than storing "". */
  const setAnswer = useCallback(
    (key: string, answer: string) => {
      if (!active) return
      const answers = { ...(active.answers ?? {}) }
      if (answer.trim()) answers[key] = answer
      else delete answers[key]
      replace({ ...active, answers })
    },
    [active, replace],
  )

  /** Save every document a step defines. Re-saving replaces the same path. */
  const saveStepDocuments = useCallback(
    (roleId: string, stepId: string) => {
      if (!active) return []
      const project = active
      const role = roleById(roleId)
      const step = role?.steps.find((s) => s.id === stepId)
      if (!role || !step) return []
      const documents = stepDocuments(project, role, step)
      const saved: RoleArtifact[] = documents.map(({ deliverable, body }) => ({
        id: `${role.id}.${step.id}.${deliverable.kind}`,
        roleId: role.id,
        stepId: step.id,
        kind: deliverable.kind,
        file: deliverable.file,
        title: `${step.title} — ${deliverable.label}`,
        body,
        createdAt: Date.now(),
      }))
      const others = (project.artifacts ?? []).filter(
        (artifact) => !saved.some((entry) => entry.roleId === artifact.roleId && entry.stepId === artifact.stepId && entry.kind === artifact.kind),
      )
      replace({ ...project, artifacts: [...others, ...saved] })
      return saved
    },
    [active, replace],
  )

  const saveDocument = useCallback(
    (roleId: string, stepId: string, kind: RoleArtifact['kind']) => {
      if (!active) return undefined
      const role = roleById(roleId)
      const step = role?.steps.find((s) => s.id === stepId)
      const deliverable = step?.deliverables.find((d) => d.kind === kind)
      if (!role || !step || !deliverable) return undefined
      const artifact: RoleArtifact = {
        id: `${role.id}.${step.id}.${deliverable.kind}`,
        roleId: role.id,
        stepId: step.id,
        kind: deliverable.kind,
        file: deliverable.file,
        title: `${step.title} — ${deliverable.label}`,
        body: renderDeliverable(active, role, step, deliverable),
        createdAt: Date.now(),
      }
      const others = (active.artifacts ?? []).filter((entry) => entry.id !== artifact.id)
      replace({ ...active, artifacts: [...others, artifact] })
      return artifact
    },
    [active, replace],
  )

  const removeArtifact = useCallback(
    (id: string) => {
      if (!active) return
      replace({ ...active, artifacts: (active.artifacts ?? []).filter((artifact) => artifact.id !== id) })
    },
    [active, replace],
  )

  /** Reference material: a PDF, an image, a document or a link, kept with the project. */
  const addReference = useCallback(
    (reference: Omit<ProjectReference, 'id' | 'addedAt'>) => {
      if (!active) return
      const entry: ProjectReference = {
        ...reference,
        id: `ref-${Date.now().toString(36)}-${Math.floor(Math.random() * 1296).toString(36)}`,
        addedAt: Date.now(),
      }
      replace({ ...active, references: [entry, ...(active.references ?? [])].slice(0, 40) })
    },
    [active, replace],
  )

  const removeReference = useCallback(
    (id: string) => {
      if (!active) return
      replace({ ...active, references: (active.references ?? []).filter((reference) => reference.id !== id) })
    },
    [active, replace],
  )

  const setDesignSource = useCallback(
    (source: DesignSource) => {
      if (!active) return
      replace({ ...active, designSource: source })
    },
    [active, replace],
  )

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
    const empty = emptyProject()
    setProjects([empty])
    setActiveId(empty.id)
    setCaptures({})
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
      newProject,
      setRole,
      toggleRole,
      reviewStep,
      reviewStepAndSave,
      toggleSkill,
      setAnswer,
      saveStepDocuments,
      saveDocument,
      removeArtifact,
      addReference,
      removeReference,
      setDesignSource,
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
      toastAction,
      overrides: active?.overrides ?? {},
      setOverride,
      clearOverrides,
      setSectionScope,
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
      newProject,
      setRole,
      toggleRole,
      reviewStep,
      reviewStepAndSave,
      toggleSkill,
      setAnswer,
      saveStepDocuments,
      saveDocument,
      removeArtifact,
      addReference,
      removeReference,
      setDesignSource,
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
