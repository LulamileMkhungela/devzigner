import type {
  AppShellSpec,
  SystemOverrides,
  Block,
  DataLayerSpec,
  DesignSystem,
  PrototypeSystem,
  RegistryComponent,
  Section,
  StackChoice,
} from '../types'
import { hashString, makeRng } from './rng'

/**
 * The system layer: what the prototype is built from. The UI is assembled only
 * from the registry below, and every registry entry names the tokens it may
 * use — so the design system stays the single source of truth.
 */

interface ComponentSpec {
  name: string
  group: RegistryComponent['group']
  variants: string[]
  tokens: string[]
  props: { name: string; type: string }[]
}

const BLOCK_COMPONENTS: Record<Block['type'], ComponentSpec> = {
  pageHeader: {
    name: 'PageHeader',
    group: 'Composite',
    variants: ['default', 'with-actions', 'with-breadcrumb'],
    tokens: ['--ink', '--ink-muted', '--space-sm', '--text-h2'],
    props: [{ name: 'title', type: 'string' }, { name: 'subtitle', type: 'string' }, { name: 'actions', type: 'ReactNode' }],
  },
  stats: {
    name: 'KpiRow',
    group: 'Composite',
    variants: ['2-up', '3-up', '4-up', 'with-delta'],
    tokens: ['--surface', '--border', '--ink', '--success', '--danger', '--radius-md'],
    props: [{ name: 'items', type: 'Kpi[]' }, { name: 'columns', type: '2 | 3 | 4' }],
  },
  chart: {
    name: 'ChartPanel',
    group: 'Composite',
    variants: ['bar', 'line', 'area', 'donut', 'empty'],
    tokens: ['--primary', '--accent', '--border', '--ink-muted'],
    props: [{ name: 'kind', type: "'bar' | 'line' | 'area' | 'donut'" }, { name: 'series', type: 'number[][]' }],
  },
  filters: {
    name: 'FilterBar',
    group: 'Pattern',
    variants: ['chips', 'saved-views', 'search-only'],
    tokens: ['--surface', '--border', '--primary-soft', '--radius-pill'],
    props: [{ name: 'chips', type: 'string[]' }, { name: 'value', type: 'string' }, { name: 'onChange', type: '(v: string) => void' }],
  },
  table: {
    name: 'DataTable',
    group: 'Composite',
    variants: ['default', 'dense', 'selectable', 'loading', 'empty'],
    tokens: ['--surface', '--border', '--ink', '--ink-muted', '--space-2xs', '--space-sm'],
    props: [{ name: 'columns', type: 'Column[]' }, { name: 'rows', type: 'Row[]' }, { name: 'density', type: "'cozy' | 'dense'" }],
  },
  list: {
    name: 'RecordList',
    group: 'Composite',
    variants: ['default', 'with-meta', 'empty'],
    tokens: ['--surface', '--border', '--primary', '--radius-md'],
    props: [{ name: 'rows', type: 'Row[]' }, { name: 'metaField', type: 'string' }],
  },
  detail: {
    name: 'RecordDetail',
    group: 'Pattern',
    variants: ['drawer', 'page', 'with-tabs'],
    tokens: ['--surface-raised', '--border-strong', '--ink', '--shadow-lg'],
    props: [{ name: 'record', type: 'Row' }, { name: 'tabs', type: 'string[]' }, { name: 'fields', type: 'Field[]' }],
  },
  form: {
    name: 'EntityForm',
    group: 'Pattern',
    variants: ['create', 'edit', 'with-validation', 'read-only'],
    tokens: ['--surface', '--border-strong', '--danger', '--focus-ring'],
    props: [{ name: 'fields', type: 'Field[]' }, { name: 'submit', type: 'string' }, { name: 'onSubmit', type: '(v: Record<string, unknown>) => void' }],
  },
  board: {
    name: 'KanbanBoard',
    group: 'Pattern',
    variants: ['default', 'with-wip-limits', 'swimlanes'],
    tokens: ['--surface', '--border', '--primary', '--warning', '--radius-md'],
    props: [{ name: 'columns', type: 'Column[]' }, { name: 'onMove', type: '(id: string, to: string) => void' }],
  },
  timeline: {
    name: 'Timeline',
    group: 'Composite',
    variants: ['default', 'grouped-by-day'],
    tokens: ['--border', '--ink-muted', '--success', '--warning'],
    props: [{ name: 'events', type: 'Event[]' }],
  },
  calendar: {
    name: 'CalendarGrid',
    group: 'Pattern',
    variants: ['month', 'week', 'agenda'],
    tokens: ['--surface', '--border', '--primary-soft', '--radius-sm'],
    props: [{ name: 'month', type: 'string' }, { name: 'events', type: 'Event[]' }],
  },
  activity: {
    name: 'ActivityFeed',
    group: 'Composite',
    variants: ['compact', 'with-avatar'],
    tokens: ['--ink-muted', '--border', '--space-2xs'],
    props: [{ name: 'items', type: 'Activity[]' }],
  },
  profile: {
    name: 'ProfileCard',
    group: 'Composite',
    variants: ['default', 'with-stats'],
    tokens: ['--surface', '--border', '--ink', '--radius-lg'],
    props: [{ name: 'name', type: 'string' }, { name: 'meta', type: 'string[]' }],
  },
  map: {
    name: 'MapCanvas',
    group: 'Pattern',
    variants: ['pins', 'clusters', 'heat'],
    tokens: ['--surface-2', '--success', '--warning', '--danger'],
    props: [{ name: 'pins', type: 'Pin[]' }, { name: 'legend', type: 'string[]' }],
  },
  steps: {
    name: 'StepList',
    group: 'Composite',
    variants: ['vertical', 'horizontal', 'with-status'],
    tokens: ['--primary', '--success', '--ink-faint'],
    props: [{ name: 'steps', type: 'Step[]' }, { name: 'current', type: 'string' }],
  },
  empty: {
    name: 'EmptyState',
    group: 'Pattern',
    variants: ['no-records', 'no-results', 'permission'],
    tokens: ['--surface', '--border', '--ink-muted', '--radius-lg'],
    props: [{ name: 'title', type: 'string' }, { name: 'body', type: 'string' }, { name: 'action', type: 'ReactNode' }],
  },
  callout: {
    name: 'Callout',
    group: 'Primitive',
    variants: ['info', 'warning', 'success', 'danger'],
    tokens: ['--info-soft', '--warning-soft', '--success-soft', '--danger-soft'],
    props: [{ name: 'tone', type: "'info' | 'warning' | 'success' | 'danger'" }, { name: 'title', type: 'string' }],
  },
  split: {
    name: 'SplitPanel',
    group: 'Pattern',
    variants: ['detail-aside', 'form-aside', 'even'],
    tokens: ['--surface', '--border', '--space-lg'],
    props: [{ name: 'left', type: 'ReactNode' }, { name: 'right', type: 'ReactNode' }],
  },
}

const PRIMITIVES: ComponentSpec[] = [
  {
    name: 'Button',
    group: 'Primitive',
    variants: ['primary', 'secondary', 'ghost', 'destructive', 'loading'],
    tokens: ['--primary', '--on-primary', '--primary-hover', '--radius-sm', '--space-xs'],
    props: [{ name: 'variant', type: 'Variant' }, { name: 'size', type: "'sm' | 'md'" }],
  },
  {
    name: 'Input',
    group: 'Primitive',
    variants: ['text', 'textarea', 'with-error', 'disabled'],
    tokens: ['--surface', '--border-strong', '--focus-ring', '--danger'],
    props: [{ name: 'value', type: 'string' }, { name: 'invalid', type: 'boolean' }],
  },
  {
    name: 'Select',
    group: 'Primitive',
    variants: ['single', 'multi', 'combobox'],
    tokens: ['--surface', '--border-strong', '--radius-sm'],
    props: [{ name: 'options', type: 'Option[]' }, { name: 'value', type: 'string' }],
  },
  {
    name: 'Badge',
    group: 'Primitive',
    variants: ['neutral', 'primary', 'success', 'warning', 'danger'],
    tokens: ['--surface-2', '--success', '--warning', '--danger', '--radius-pill'],
    props: [{ name: 'tone', type: 'Tone' }, { name: 'label', type: 'string' }],
  },
  {
    name: 'Card',
    group: 'Primitive',
    variants: ['flat', 'outlined', 'elevated', 'glass'],
    tokens: ['--surface', '--border', '--shadow-sm', '--radius-md'],
    props: [{ name: 'padding', type: "'sm' | 'md' | 'lg'" }],
  },
]

/** The registry component that renders a given block type. */
export function blockComponent(type: Block['type']): ComponentSpec {
  return BLOCK_COMPONENTS[type]
}

export const BLOCK_COMPONENT_NAMES: Record<Block['type'], string> = Object.fromEntries(
  Object.entries(BLOCK_COMPONENTS).map(([type, spec]) => [type, spec.name]),
) as Record<Block['type'], string>

function uniqueBlocks(sections: Section[]): { type: Block['type']; screens: string[] }[] {
  const map = new Map<Block['type'], Set<string>>()
  for (const section of sections) {
    for (const screen of section.screens) {
      for (const block of screen.blocks) {
        const set = map.get(block.type) ?? new Set<string>()
        set.add(screen.name)
        map.set(block.type, set)
      }
    }
  }
  return Array.from(map.entries()).map(([type, screens]) => ({ type, screens: Array.from(screens) }))
}

export function applySystemOverrides(system: PrototypeSystem, overrides: SystemOverrides = {}): PrototypeSystem {
  const stack = system.stack.map((entry) =>
    overrides.stack?.[entry.layer] && overrides.stack[entry.layer] !== entry.choice
      ? { ...entry, choice: overrides.stack[entry.layer]!, reason: `${overrides.stack[entry.layer]!} — chosen in the System page. ${entry.reason}` }
      : entry,
  )
  const removed = new Set(overrides.removed ?? [])
  const components = [...system.components.filter((c) => !removed.has(c.id)), ...(overrides.components ?? [])]
  return { ...system, stack, components }
}

export function compileSystem(input: {
  archetypeId: string
  design: DesignSystem
  sections: Section[]
  entities: { id: string; name: string }[]
  seed: number
}): PrototypeSystem {
  const { design, sections, entities, seed, archetypeId } = input
  const rng = makeRng(hashString(`system:${seed}:${archetypeId}`))

  const dataOptions = ['Drizzle ORM', 'Prisma', 'Kysely'] as const
  const registryOptions = ['Radix UI primitives', 'Base UI', 'Ark UI'] as const
  const chartOptions = ['Recharts', 'visx', 'Chart primitives (generated)'] as const

  const stack: StackChoice[] = [
    { layer: 'Framework', choice: 'Next.js', version: '15 · App Router', reason: 'Server components by default; the prototype and the production app share one routing model.' },
    { layer: 'Language', choice: 'TypeScript', version: '5.9 · strict', reason: 'The generated data layer and component props are typed, so a contract break fails at build time.' },
    { layer: 'UI runtime', choice: 'React', version: '19', reason: 'Matches the AppShell and the component registry the prototype renders from.' },
    { layer: 'Styling', choice: 'Tailwind CSS', version: '4 + generated @theme', reason: 'tokens.css and tailwind-theme.css come from the same compiled design system.' },
    { layer: 'Registry', choice: registryOptions[rng.int(0, registryOptions.length - 1)], version: 'headless', reason: 'Behaviour without opinions, so every visual decision still comes from tokens.' },
    { layer: 'Data', choice: dataOptions[rng.int(0, dataOptions.length - 1)], version: 'Postgres 16', reason: 'The dummy data layer sits behind repository interfaces; swapping the adapter is a one-file change.' },
    { layer: 'Validation', choice: 'Zod', version: '4', reason: 'Form and API inputs share one schema, derived from the entity fields.' },
    { layer: 'Charts', choice: chartOptions[rng.int(0, chartOptions.length - 1)], version: 'latest', reason: 'Chart props are already normalised into labels + series by the screen compiler.' },
    { layer: 'Tests', choice: 'Vitest + Playwright', version: 'latest', reason: 'Acceptance criteria in each section spec map to one Playwright spec.' },
    { layer: 'Knowledge', choice: 'Wiki in Git', version: 'branches / worktrees', reason: 'Every iteration snapshots the product, design and flow knowledge next to the code.' },
  ]

  const used = uniqueBlocks(sections)
  const components: RegistryComponent[] = [
    ...PRIMITIVES.map((p) => ({
      id: p.name.toLowerCase(),
      name: p.name,
      group: p.group,
      variants: p.variants,
      tokens: p.tokens,
      usedBy: ['Every screen'],
      props: p.props,
    })),
    ...used
      .map(({ type, screens }) => {
        const spec = BLOCK_COMPONENTS[type]
        if (!spec) return null
        return {
          id: spec.name.toLowerCase(),
          name: spec.name,
          group: spec.group,
          variants: spec.variants,
          tokens: spec.tokens,
          usedBy: screens.slice(0, 5),
          props: spec.props,
        }
      })
      .filter((c): c is RegistryComponent => Boolean(c)),
  ]

  const routes = sections.flatMap((section) =>
    section.screens.map((screen) => ({ path: screen.route, name: screen.name, sectionId: section.id })),
  )

  const navSource = design.layout.nav.length ? design.layout.nav : sections.map((s) => s.name)
  const nav = navSource.slice(0, 6).map((label) => {
    const section = sections.find((s) => s.name === label)
    return { label, screenId: section?.screens[0]?.id }
  })

  const shell: AppShellSpec = {
    frame: `${design.layout.shell} shell · ${design.layout.contentWidth}px content · ${design.layout.cardStyle} cards`,
    regions: [
      { region: 'Brand rail', description: 'Product mark, workspace switcher and primary navigation.', components: ['Button', 'Badge', 'NavItem'] },
      { region: 'Top bar', description: 'Search, saved views, notifications and the account menu.', components: ['Input', 'Select', 'Badge'] },
      { region: 'Page', description: 'One routed screen, assembled from registry components only.', components: ['PageHeader', 'KpiRow', 'DataTable'] },
      { region: 'Overlay', description: 'Record drawers, confirms and toasts.', components: ['RecordDetail', 'Toast'] },
    ],
    routes,
    nav,
  }

  const dataLayer: DataLayerSpec = {
    pattern: 'Repository interface per entity, one mock adapter, one Postgres adapter.',
    separation: [
      'UI imports types and hooks only — never a table or a query.',
      'Every read goes through a repository method; screens never hold their own fixtures.',
      'The mock adapter returns the seeded rows from the data shape, so the prototype runs with no database.',
      'Swapping to Postgres changes the adapter, not the screens.',
      'Mutations are typed once in the repository and reused by forms and the API layer.',
    ],
    interfaces: entities.map((entity) => ({
      entity: entity.name,
      methods: ['list(filter)', 'byId(id)', 'create(input)', 'update(id, patch)', 'archive(id)'],
    })),
  }

  return { stack, components, shell, dataLayer }
}
