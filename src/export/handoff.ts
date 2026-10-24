import type { Block, Entity, Project, Screen, Section } from '../types'
import type { PackageFile } from './package'
import { screenScreenshot, shellScreenshot } from './screenshots'

/**
 * The handoff package, matching the shape Design OS produces:
 *
 *   product-overview.md
 *   prompts/{one-shot-prompt,section-prompt}.md
 *   instructions/one-shot-instructions.md + incremental/01-shell.md, 02-*.md
 *   design-system/{tokens.css,tokens.dtcg.json,fonts.md,tailwind-colors.md}
 *   data-shapes/{README.md,overview.ts}
 *   shell/components/{AppShell,MainNav,UserMenu,index}
 *   sections/<id>/{README.md,tests.md,types.ts,sample-data.json,components/*}
 *   standards/*            (Agent OS)
 *   specs/<id>/{requirements,plan,tasks}.md   (Agent OS)
 *
 * Components are props-based, Tailwind-styled from the exported tokens, and
 * never import sample data — the same contract Design OS hands to an agent.
 */

const TYPES: Record<string, string> = {
  text: 'string',
  longtext: 'string',
  number: 'number',
  money: 'number',
  date: 'string',
  status: 'string',
  email: 'string',
  phone: 'string',
  boolean: 'boolean',
  relation: 'string',
  rating: 'number',
  image: 'string',
  location: 'string',
  tag: 'string[]',
  percent: 'number',
}

function pascal(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('')
}

function camel(value: string): string {
  const p = pascal(value)
  return p[0]?.toLowerCase() + p.slice(1)
}

function kebab(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function bullet(items: string[]): string {
  return items.map((i) => `- ${i}`).join('\n')
}

function entityType(entity: Entity): string {
  return `{\n${['id: string', ...entity.fields.map((f) => `${f.name}${f.required ? '' : '?'}: ${f.type === 'status' && f.options?.length ? f.options.map((o) => `'${o}'`).join(' | ') : TYPES[f.type]}`)].join('\n')}\n}`
}

function primaryEntity(project: Project, screen: Screen, section: Section): Entity | undefined {
  const id = screen.entityIds[0] ?? section.entityIds[0]
  return project.data.entities.find((e) => e.id === id)
}

/* -------------------------------------------------------------------------
   block → JSX
   ------------------------------------------------------------------------- */

function blockJsx(block: Block, rowsType: string): string {
  switch (block.type) {
    case 'pageHeader':
      return `      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[var(--ink)]">${block.title}</h1>
          <p className="mt-1 max-w-[70ch] text-sm text-[var(--ink-muted)]">${block.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
${block.actions.map((a, i) => `          <button type="button"${i === 0 ? ' onClick={onCreate}' : ''} className="${i === 0 ? 'rounded-[var(--radius-sm)] bg-[var(--primary)] px-3 py-2 text-sm font-medium text-[var(--on-primary)] hover:bg-[var(--primary-hover)]' : 'rounded-[var(--radius-sm)] border border-[var(--border-strong)] px-3 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-2)]'}">${a}</button>`).join('\n')}
        </div>
      </header>`
    case 'stats':
      return `      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
${block.items.map((i) => `        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">${i.label}</dt>
          <dd className="mt-1 text-[22px] font-semibold text-[var(--ink)]">${i.value}</dd>
          <dd className="mt-1 text-xs text-[var(--ink-muted)]">${i.delta}</dd>
        </div>`).join('\n')}
      </dl>`
    case 'filters':
      return `      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); onSearch?.(event.target.value) }}
          placeholder="${block.search}"
          className="w-full max-w-xs rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--primary)] focus:outline-none"
        />
${block.chips.map((chip, i) => {
          const literal = chip.replace(/'/g, "\\'")
          return `        <button type="button" onClick={() => setChip('${literal}')} className={activeChip === '${literal}' ? 'rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-medium text-[var(--on-primary)]' : 'rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-2)]'}>${chip}</button>`
        }).join('\n')}
      </div>`
    case 'table':
      return `      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
${block.columns.map((c) => `              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">${c}</th>`).join('\n')}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={String(row.id)} onClick={() => onOpen?.(String(row.id))} className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
${block.columns.map((c, i) => `                <td className="px-3 py-2 text-[var(--ink-2)]">${i === 0 ? `<span className="font-medium text-[var(--ink)]">{cell(row, '${kebab(c)}')}</span>` : `{cell(row, '${kebab(c)}')}`}</td>`).join('\n')}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={${block.columns.length}} className="px-3 py-10 text-center text-sm text-[var(--ink-muted)]">No records match this view.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>`
    case 'list':
      return `      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--ink)]">${block.title}</div>
        <ul className="divide-y divide-[var(--border)]">
          {visible.map((row) => (
            <li key={String(row.id)}>
              <button type="button" onClick={() => onOpen?.(String(row.id))} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-[var(--surface-2)]">
                <span className="truncate text-sm font-medium text-[var(--ink)]">{cell(row, 'name')}</span>
                <span className="shrink-0 text-xs text-[var(--ink-muted)]">{cell(row, '${kebab(block.metaField)}')}</span>
              </button>
            </li>
          ))}
        </ul>
        {visible.length === 0 && <p className="px-4 py-10 text-center text-sm text-[var(--ink-muted)]">Nothing here yet.</p>}
      </div>`
    case 'chart': {
      const max = Math.max(1, ...block.series)
      return `      <figure className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
        <figcaption className="mb-3 text-sm font-semibold text-[var(--ink)]">${block.title}</figcaption>
        <div className="flex h-40 items-end gap-1.5" role="img" aria-label="${block.title}">
${block.series.map((v, i) => `          <div className="flex-1 rounded-t bg-[var(--${i % 2 === 0 ? 'primary' : 'accent'})]" style={{ height: '${Math.max(4, Math.round((v / max) * 100))}%' }} title="${block.labels[i] ?? ''}: ${v}" />`).join('\n')}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-[var(--ink-faint)]">
${block.labels.slice(0, 6).map((l) => `          <span>${l}</span>`).join('\n')}
        </div>
      </figure>`
    }
    case 'form':
      return `      <form onSubmit={(event) => { event.preventDefault(); onSubmit?.(values) }} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-base font-semibold text-[var(--ink)]">${block.title}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
${block.fields.map((f) => `          <label className="flex flex-col gap-1 text-sm text-[var(--ink-2)]">
            <span className="font-medium">${pascal(f)}</span>
            <input value={String(values.${camel(f)} ?? '')} onChange={(event) => setValues((prev) => ({ ...prev, ${camel(f)}: event.target.value }))} className="rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--primary)] focus:outline-none" />
          </label>`).join('\n')}
        </div>
        <button type="submit" className="mt-4 rounded-[var(--radius-sm)] bg-[var(--primary)] px-3 py-2 text-sm font-medium text-[var(--on-primary)] hover:bg-[var(--primary-hover)]">${block.submit}</button>
      </form>`
    case 'board':
      return `      <div className="grid gap-3 md:grid-cols-${Math.min(4, Math.max(2, block.columns.length))}">
${block.columns.map((col) => `        <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">${col.name}</h2>
          <div className="flex flex-col gap-2">
${col.cards.map((card) => `            <article className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
              <p className="text-sm font-medium text-[var(--ink)]">${card.title}</p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">${card.meta}</p>
            </article>`).join('\n')}
          </div>
        </section>`).join('\n')}
      </div>`
    case 'detail':
      return `      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-wrap gap-1 border-b border-[var(--border)] p-2">
${block.tabs.map((tab, i) => `          <button type="button" onClick={() => setTab(${i})} className={tab === ${i} ? 'rounded-[var(--radius-xs)] bg-[var(--surface-2)] px-3 py-1.5 text-sm font-medium text-[var(--ink)]' : 'rounded-[var(--radius-xs)] px-3 py-1.5 text-sm text-[var(--ink-muted)] hover:bg-[var(--surface-2)]'}>${tab}</button>`).join('\n')}
        </div>
        <dl className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-2">
${block.fields.map((f) => `          <div>
            <dt className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">${f}</dt>
            <dd className="text-sm text-[var(--ink)]">{cell(row, '${kebab(f)}')}</dd>
          </div>`).join('\n')}
        </dl>
      </div>`
    case 'callout':
      return `      <aside className="rounded-[var(--radius-sm)] border border-[var(--${block.tone === 'warn' ? 'warning' : block.tone === 'good' ? 'success' : 'info'})] bg-[var(--${block.tone === 'warn' ? 'warning-soft' : block.tone === 'good' ? 'success-soft' : 'info-soft'})] p-3">
        <p className="text-sm font-semibold text-[var(--ink)]">${block.title}</p>
        <p className="mt-1 text-sm text-[var(--ink-2)]">${block.body}</p>
      </aside>`
    case 'empty':
      return `      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] p-10 text-center">
        <h2 className="text-base font-semibold text-[var(--ink)]">${block.title}</h2>
        <p className="mx-auto mt-2 max-w-[46ch] text-sm text-[var(--ink-muted)]">${block.body}</p>
        <button type="button" onClick={onCreate} className="mt-4 rounded-[var(--radius-sm)] bg-[var(--primary)] px-3 py-2 text-sm font-medium text-[var(--on-primary)]">${block.action}</button>
      </div>`
    case 'timeline':
      return `      <ol className="flex flex-col gap-3">
${block.events.map((e) => `        <li className="flex gap-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--${e.tone === 'good' ? 'success' : e.tone === 'warn' ? 'warning' : 'border-strong'})]" />
          <div>
            <p className="text-sm font-medium text-[var(--ink)]">${e.title}</p>
            <p className="text-xs text-[var(--ink-muted)]">${e.time} · ${e.detail}</p>
          </div>
        </li>`).join('\n')}
      </ol>`
    case 'calendar':
      return `      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3">
        <h2 className="mb-2 text-sm font-semibold text-[var(--ink)]">${block.month}</h2>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[var(--ink-faint)]">
${Array.from({ length: 28 }, (_, day) => (`          <div className="min-h-10 rounded-[var(--radius-xs)] border border-[var(--border)] p-1 text-left"><span>${day + 1}</span>${block.events.filter((e) => e.day === day + 1).map((e) => `<i className="mt-0.5 block truncate not-italic text-[9px] text-[var(--primary)]">${e.label}</i>`).join('')}</div>`)).join('\n')}
        </div>
      </div>`
    case 'activity':
      return `      <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
${block.items.map((i) => `        <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm"><span className="text-[var(--ink)]">${i.who} ${i.what}</span><span className="text-xs text-[var(--ink-faint)]">${i.when}</span></li>`).join('\n')}
      </ul>`
    case 'profile':
      return `      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold text-[var(--ink)]">${block.name}</h2>
        <p className="text-sm text-[var(--ink-muted)]">${block.role}</p>
        <div className="mt-3 flex flex-wrap gap-2">${block.meta.map((m) => `<span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--ink-muted)]">${m}</span>`).join('')}</div>
        <dl className="mt-4 grid grid-cols-3 gap-3">${block.stats.map((s) => `<div><dt className="text-[11px] uppercase text-[var(--ink-faint)]">${s.label}</dt><dd className="text-base font-semibold text-[var(--ink)]">${s.value}</dd></div>`).join('')}</dl>
      </section>`
    case 'map':
      return `      <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]">
        <p className="absolute left-3 top-2 text-xs text-[var(--ink-muted)]">${block.title}</p>
${block.pins.map((p) => `        <span className="absolute h-2.5 w-2.5 rounded-full bg-[var(--${p.tone === 'good' ? 'success' : p.tone === 'warn' ? 'warning' : 'primary'})]" style={{ left: '${p.x}%', top: '${p.y}%' }} title="${p.label}" />`).join('\n')}
      </div>`
    case 'steps':
      return `      <ol className="flex flex-col gap-3">
${block.steps.map((s) => `        <li className="flex gap-3">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--${s.state === 'done' ? 'success' : s.state === 'current' ? 'primary' : 'border'})] text-[11px] font-semibold text-[var(--ink)]">${s.state === 'done' ? '✓' : s.title.slice(0, 1)}</span>
          <div><p className="text-sm font-medium text-[var(--ink)]">${s.title}</p><p className="text-xs text-[var(--ink-muted)]">${s.detail}</p></div>
        </li>`).join('\n')}
      </ol>`
    case 'split':
      return `      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-sm font-semibold text-[var(--ink)]">${block.leftTitle}</h2>
          <p className="mt-1 text-sm text-[var(--ink-2)]">${block.leftBody}</p>
        </section>
        <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-sm font-semibold text-[var(--ink)]">${block.rightTitle}</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-[var(--ink-2)]">${block.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>
        </section>
      </div>`
    default:
      return `      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--ink-muted)]">
        Block type <code>${(block as Block).type}</code> — compose this from the registry in the target codebase.
      </div>`
  }
}

/* -------------------------------------------------------------------------
   per-screen component
   ------------------------------------------------------------------------- */

function componentName(section: Section, screen: Screen): string {
  const sectionName = pascal(section.name)
  const screenName = pascal(screen.name)
  return sectionName && screenName.startsWith(sectionName) ? screenName : `${sectionName}${screenName}`
}

function screenComponent(project: Project, section: Section, screen: Screen): string {
  const name = componentName(section, screen)
  const entity = primaryEntity(project, screen, section)
  const rowsType = entity ? entity.name : 'Record<string, unknown>'
  const needsDetail = screen.blocks.some((b) => b.type === 'detail')

  const imports: string[] = [`import { useMemo, useState } from 'react'`]
  if (entity) imports.push(`import type { ${entity.name} } from '../types'`)

  const body = screen.blocks.map((b) => blockJsx(b, rowsType)).join('\n\n')

  return `// ${name} — exported by Lula DevZign.
// Props only: no data imports, no routing, no fetch. Wire the callbacks.

${imports.join('\n')}

export interface ${name}Props {
  rows: ${rowsType}[]
  onOpen?: (id: string) => void
  onCreate?: () => void
  onSearch?: (value: string) => void
  onSubmit?: (values: Record<string, string>) => void
  className?: string
}

function cell(row: object, key: string): string {
  const record = row as Record<string, unknown>
  const direct = record[key]
  if (direct !== undefined && direct !== null && direct !== '') return String(direct)
  const flat = Object.entries(record).find(([k]) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === key.replace(/[^a-z0-9]/g, ''))
  return flat ? String(flat[1]) : '—'
}

export function ${name}({ rows, onOpen, onCreate, onSearch, onSubmit, className = '' }: ${name}Props) {
  const [query, setQuery] = useState('')
  const [activeChip, setChip] = useState('all')
  const [values, setValues] = useState<Record<string, string>>({})
${needsDetail ? `  const [tab, setTab] = useState(0)\n` : ''}  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(needle)))
  }, [rows, query])
${needsDetail ? `\n  const row = rows[0] ?? {}\n` : ''}
  return (
    <div className={\`flex flex-col gap-4 \${className}\`}>
${body}
    </div>
  )
}
`
}

/* -------------------------------------------------------------------------
   section files
   ------------------------------------------------------------------------- */

function sectionTypes(project: Project, section: Section): string {
  const entities = project.data.entities.filter((e) => section.entityIds.includes(e.id))
  const lines = [
    '// Types for this section, generated from the data shape.',
    '// UI code imports these; it never imports sample data.',
    '',
  ]
  for (const entity of entities) {
    lines.push(`export interface ${entity.name} ${entityType(entity)}`, '')
  }
  for (const screen of section.screens) {
    const name = componentName(section, screen)
    const entity = primaryEntity(project, screen, section)
    lines.push(
      `export interface ${name}Props {`,
      `  rows: ${entity ? `${entity.name}[]` : 'Record<string, unknown>[]'}`,
      '  onOpen?: (id: string) => void',
      '  onCreate?: () => void',
      '  onSearch?: (value: string) => void',
      '  onSubmit?: (values: Record<string, string>) => void',
      '}',
      '',
    )
  }
  return lines.join('\n')
}

function sectionTests(section: Section): string {
  return `# ${section.name} — test instructions

Write these as failing tests first, then implement until they pass. Framework-agnostic: they describe what to assert, not which runner.

## User flows

${section.tests.map((t) => `- ${t}`).join('\n')}

## Screen behaviour

${section.screens
  .map(
    (screen) =>
      `### ${screen.name}\n\n- Renders with the sample records in \`sample-data.json\`.\n- Empty state: with \`rows={[]}\` the screen still explains what to do next.\n${screen.acceptance.map((a) => `- ${a}`).join('\n')}`,
  )
  .join('\n\n')}

## Boundaries

- Every interactive element is a real control (input, button, select), never a styled div.
- Keyboard: tab order follows the visual order; focus is always visible.
- Responsive: 640 / 768 / 1024 / ${section.screens.length ? 1280 : 1280}px breakpoints hold without horizontal scroll.
`
}

function sectionReadme(project: Project, section: Section): string {
  const flows = project.flows.filter((f) => f.steps.some((s) => s.sectionId === section.id))
  return `# ${section.name}

${section.purpose}

**Priority.** ${section.priority}

## Screens

${section.screens.map((s) => `- **${componentName(section, s)}** — ${s.name} \`${s.route}\` (${s.kind})`).join('\n')}

## User flows that touch this section

${flows.length ? flows.map((f) => `- ${f.name} — ${f.persona}`).join('\n') : '- None recorded.'}

## Data

${section.entityIds.map((id) => {
  const e = project.data.entities.find((x) => x.id === id)
  return e ? `- **${e.name}** — ${e.fields.length} fields, sample rows in \`sample-data.json\`` : ''
}).join('\n')}

## Components

\`components/\` holds one file per screen. They accept \`rows\` and callbacks only; sample data lives in \`sample-data.json\`.
`
}

/* -------------------------------------------------------------------------
   shell, design system, prompts, instructions
   ------------------------------------------------------------------------- */

function shellFiles(project: Project): PackageFile[] {
  const design = project.design
  const nav = project.system.shell.nav.map((n) => n.label)
  const shell = design.layout.shell
  const files: PackageFile[] = []

  files.push({
    path: 'shell/README.md',
    content: `# Application shell\n\n${project.system.shell.frame}\n\n## Regions\n\n${project.system.shell.regions
      .map((r) => `### ${r.region}\n\n${r.description}\n\nComponents: ${r.components.join(', ')}`)
      .join('\n\n')}\n\n## Navigation\n\n${bullet(nav)}\n\n\`AppShell\` wraps every section screen. It owns layout only: no data fetching, no auth logic.\n`,
  })

  files.push({
    path: 'shell/components/AppShell.tsx',
    content: `// AppShell — exported by Lula DevZign. Layout and navigation only.
import type { ReactNode } from 'react'
import { MainNav } from './MainNav'
import { UserMenu } from './UserMenu'

export interface AppShellProps {
  current: string
  user?: { name: string; email: string }
  onNavigate?: (label: string) => void
  children: ReactNode
}

export function AppShell({ current, user, onNavigate, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--ink)]${shell === 'topbar' ? ' flex-col' : ''}">
      ${shell === 'topbar'
        ? `<header className="flex items-center justify-between gap-6 border-b border-[var(--border)] px-5 py-3">
        <span className="text-base font-semibold tracking-tight">${project.name}</span>
        <MainNav current={current} onNavigate={onNavigate} />
        <UserMenu user={user} />
      </header>`
        : `<aside className="hidden w-[248px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-4 md:flex">
        <span className="mb-6 text-base font-semibold tracking-tight">${project.name}</span>
        <MainNav current={current} onNavigate={onNavigate} />
        <div className="mt-auto pt-6"><UserMenu user={user} /></div>
      </aside>`}
      <main className="flex-1 px-5 py-6" style={{ maxWidth: ${design.layout.contentWidth} }}>
        {children}
      </main>
    </div>
  )
}
`,
  })

  files.push({
    path: 'shell/components/MainNav.tsx',
    content: `// Primary navigation — labels come from the shell design.
export interface MainNavProps {
  current: string
  onNavigate?: (label: string) => void
}

const ITEMS = ${JSON.stringify(nav, null, 2)} as const

export function MainNav({ current, onNavigate }: MainNavProps) {
  return (
    <nav aria-label="Primary" className="flex flex-col gap-1${shell === 'topbar' ? ' flex-row items-center' : ''}">
      {ITEMS.map((item) => {
        const active = item === current
        return (
          <button
            key={item}
            type="button"
            onClick={() => onNavigate?.(item)}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'rounded-[var(--radius-sm)] bg-[var(--primary-soft)] px-3 py-2 text-left text-sm font-medium text-[var(--primary)]'
                : 'rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]'
            }
          >
            {item}
          </button>
        )
      })}
    </nav>
  )
}
`,
  })

  files.push({
    path: 'shell/components/UserMenu.tsx',
    content: `// Account menu — wire sign-out and settings to your auth layer.
export interface UserMenuProps {
  user?: { name: string; email: string }
  onSettings?: () => void
  onSignOut?: () => void
}

export function UserMenu({ user, onSettings, onSignOut }: UserMenuProps) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-sm)] px-1 py-1">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--primary)] text-xs font-semibold text-[var(--on-primary)]">
        {(user?.name ?? 'U').slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm text-[var(--ink)]">{user?.name ?? 'Account'}</span>
        <span className="block truncate text-xs text-[var(--ink-faint)]">{user?.email ?? 'you@example.com'}</span>
      </span>
      <button type="button" onClick={onSettings} aria-label="Settings" className="ml-auto rounded px-2 text-[var(--ink-muted)] hover:text-[var(--ink)]">⚙</button>
      <button type="button" onClick={onSignOut} aria-label="Sign out" className="rounded px-2 text-[var(--ink-muted)] hover:text-[var(--ink)]">→</button>
    </div>
  )
}
`,
  })

  const shellShot = shellScreenshot(project)
  if (shellShot) {
    files.push({ path: 'shell/screenshot.svg', content: shellShot })
    files.push({
      path: 'shell/screenshot.md',
      content: `# Shell screenshot\n\n\`screenshot.svg\` is the rendered shell at 1280×800, drawn from the same compiled tokens and navigation as the live prototype. Open it in any browser or embed it in a PR description.\n`,
    })
  }

  files.push({
    path: 'shell/components/index.ts',
    content: `export { AppShell } from './AppShell'\nexport { MainNav } from './MainNav'\nexport { UserMenu } from './UserMenu'\nexport type { AppShellProps } from './AppShell'\nexport type { MainNavProps } from './MainNav'\nexport type { UserMenuProps } from './UserMenu'\n`,
  })

  return files
}

function dtcg(project: Project): string {
  const design = project.design
  const color: Record<string, unknown> = {}
  for (const role of design.colors) {
    color[role.id] = { $type: 'color', $value: role.base, $description: role.rationale }
    for (const stop of role.stops) color[`${role.id}-${stop.step}`] = { $type: 'color', $value: stop.hex }
  }
  const dimension: Record<string, unknown> = {}
  for (const [name, px] of Object.entries(design.radii)) dimension[`radius-${name}`] = { $type: 'dimension', $value: name === 'pill' ? '999px' : `${px}px` }
  for (const space of design.spacing) dimension[`space-${space.name}`] = { $type: 'dimension', $value: `${space.px}px` }
  for (const bp of design.breakpoints) dimension[`breakpoint-${bp.name}`] = { $type: 'dimension', $value: `${bp.px}px` }

  return JSON.stringify(
    {
      $schema: 'https://tr.designtokens.org/format/',
      $description: `${project.name} design tokens, W3C Design Tokens Community Group format.`,
      color,
      dimension,
      fontFamily: Object.fromEntries(design.typography.map((t) => [t.role, { $type: 'fontFamily', $value: t.stack }])),
      fontSize: Object.fromEntries(design.typography.map((t) => [t.role, { $type: 'dimension', $value: t.size }])),
      duration: Object.fromEntries(design.motion.map((m) => [m.name, { $type: 'duration', $value: m.duration }])),
      semantic: Object.fromEntries(
        Object.entries(design.semantic).map(([key, value]) => [
          key.replace(/^--/, ''),
          { $type: 'color', $value: value, $description: key },
        ]),
      ),
    },
    null,
    2,
  )
}

function designSystemFiles(project: Project): PackageFile[] {
  const design = project.design
  return [
    {
      path: 'design-system/tokens.css',
      content: design.tokensCss,
    },
    {
      path: 'design-system/tokens.dtcg.json',
      content: dtcg(project),
    },
    {
      path: 'design-system/fonts.md',
      content: `# Fonts\n\n${design.typography
        .map((t) => `## ${t.role}\n\n- Family: **${t.family}**\n- Stack: \`${t.stack}\`\n- Weights: ${t.weights.join(', ')}\n- Size: ${t.size} / ${t.lineHeight}, tracking ${t.tracking}\n- Usage: ${t.usage}`)
        .join('\n\n')}\n\nLoad only the weights above. With Next.js:\n\n\`\`\`tsx\nimport { ${design.typography.map((t) => t.family.replace(/ /g, '_')).join(', ')} } from 'next/font/google'\n\`\`\`\n`,
    },
    {
      path: 'design-system/tailwind-colors.md',
      content: `# Tailwind setup\n\n\`\`\`css\n@import "tailwindcss";\n@import "./tokens.css";\n@config "../tailwind.config.ts";\n\`\`\`\n\nComponents use arbitrary values that read the tokens directly, e.g. \`bg-[var(--primary)]\`, so the palette is never duplicated:\n\n${design.colors
        .map((c) => `- \`${c.base}\` → \`var(--${c.id})\` (on-colour: \`var(--on-${c.id})\`)`)
        .join('\n')}\n\n## Breakpoints\n\n${design.breakpoints.map((b) => `- \`${b.name}\`: ${b.px}px — \`sm:\`/\`md:\`/\`lg:\`/\`xl:\` utilities, also exported as \`--breakpoint-${b.name}\``).join('\n')}\n\nLayout contract: content column max ${design.layout.contentWidth}px, ${design.layout.density} density, ${design.layout.grid}. Every exported component is written mobile-first against these breakpoints.\n\n## Dark mode\n\nSemantic tokens are re-declared under \`[data-theme="dark"]\` in \`tokens.css\`. Use the semantic names, never a ramp step, in components.\n`,
    },
    {
      path: 'design-system/README.md',
      content: `# Design system\n\n${design.rationale}\n\n${design.colors.map((c) => `- **${c.role}** \`${c.base}\` — ${c.rationale}`).join('\n')}\n\nFiles:\n\n- \`tokens.css\` — CSS custom properties (light + dark)\n- \`tokens.dtcg.json\` — W3C DTCG format, for Figma/other token tools\n- \`fonts.md\` — families, weights and loading\n- \`tailwind-colors.md\` — theme wiring and breakpoints\n`,
    },
  ]
}

function dataShapeFiles(project: Project): PackageFile[] {
  return [
    {
      path: 'data-shapes/README.md',
      content: `# UI data contracts\n\nEvery component takes data as props. These are the shapes they expect.\n\n${project.data.entities
        .map((e) => `## ${e.name}\n\n${e.description}\n\n${e.fields.map((f) => `- \`${f.name}\`: ${f.type}${f.options?.length ? ` (${f.options.join(' | ')})` : ''}`).join('\n')}`)
        .join('\n\n')}\n\nThe mock adapter in \`src/data/mock-adapter.ts\` returns these shapes with seeded rows; the real adapter must return the same.\n`,
    },
    {
      path: 'data-shapes/overview.ts',
      content: `// Combined UI data contracts.\n\n${project.data.entities.map((e) => `export interface ${e.name} ${entityType(e)}`).join('\n\n')}\n\nexport type EntityMap = {\n${project.data.entities.map((e) => `  ${camel(e.name)}: ${e.name}`).join('\n')}\n}\n`,
    },
  ]
}

function promptsAndInstructions(project: Project): PackageFile[] {
  const milestones = project.sections.map((s, i) => `${String(i + 2).padStart(2, '0')}-${s.id}`)
  const files: PackageFile[] = []

  files.push({
    path: 'prompts/one-shot-prompt.md',
    content: `# One-shot implementation prompt

Copy everything below into your coding agent.

---

You are implementing **${project.name}**, a ${project.archetypeLabel.toLowerCase()} product.

Read these files before writing code, in this order:

1. \`product-overview.md\` — what the product is and why
2. \`instructions/one-shot-instructions.md\` — every milestone in order
3. \`design-system/tokens.css\` and \`design-system/tailwind-colors.md\` — the only source of colour, type and spacing
4. \`shell/components/\` — the shell is already designed; wire it, do not rebuild it
5. \`data-shapes/overview.ts\` and \`src/data/repository.ts\` — the contracts components expect
6. \`sections/*/components/\` — finished components, props-based
7. \`sections/*/tests.md\` — write these tests first

Rules:

- Use the exported components as they are. They are styled and responsive; rebuild nothing.
- Never hardcode a colour, radius, spacing value or font. Use the tokens.
- Every input is a real input; every interactive element is a button or a link.
- Empty, loading and error states are part of the work, not a follow-up.
- Ask clarifying questions about auth, tenancy and backend before starting.

Definition of done: every section's tests pass, the shell renders at ${project.design.breakpoints.map((b) => `${b.px}px`).join(' / ')}, and no component imports sample data.
`,
  })

  files.push({
    path: 'prompts/section-prompt.md',
    content: `# Section implementation prompt (template)

Fill the variables, then paste into your coding agent.

---

Implement the **{{SECTION_NAME}}** section of **${project.name}}**.

- Section id: \`{{SECTION_ID}}\`
- Milestone: \`{{NN}}\`
- Instruction file: \`instructions/incremental/{{NN}}-{{SECTION_ID}}.md\`
- Components: \`sections/{{SECTION_ID}}/components/\`
- Tests to write first: \`sections/{{SECTION_ID}}/tests.md\`

Context: \`product-overview.md\` and \`design-system/tokens.css\` are required reading.

Constraints:

- Wire the exported components; do not restyle them.
- Use \`sample-data.json\` for the first pass, then the repository interface for real data.
- Cover empty, loading and error states.
- Report which acceptance criteria you verified and how.

Ask me anything that blocks you before writing code.
`,
  })

  files.push({
    path: 'instructions/one-shot-instructions.md',
    content: `# One-shot implementation instructions

Implement the whole product in one pass, milestone by milestone. Run the tests after each milestone.

## Milestone 01 — Shell and tokens

${bullet([
  'Install Tailwind v4 and import design-system/tokens.css.',
  'Wire the fonts in design-system/fonts.md.',
  'Drop shell/components into the app, then mount AppShell around routes.',
  'Verify: navigation, account menu, keyboard focus and the 640/768/1024/1280 breakpoints.',
])}

${project.sections
  .map(
    (section, i) => `## Milestone ${String(i + 2).padStart(2, '0')} — ${section.name}

${section.purpose}

${bullet([
  `Build from sections/${section.id}/components (${section.screens.map((s) => componentName(section, s)).join(', ')}).`,
  `Data: ${section.entityIds.map((id) => project.data.entities.find((e) => e.id === id)?.name ?? id).join(', ')}.`,
  `Write the tests in sections/${section.id}/tests.md first.`,
  `Requirements: ${section.requirements.length} (${section.requirements.filter((r) => r.priority === 'must').length} must).`,
])}
`,
  )
  .join('\n')}

## Final pass

- Replace the mock adapter with the real one; the UI must not change.
- Confirm every screen has empty, loading and error states.
- Re-read audit.md and close any warning.
`,
  })

  files.push({
    path: 'instructions/incremental/01-shell.md',
    content: `# Milestone 01 — Shell and tokens

## Files

- \`design-system/tokens.css\`
- \`design-system/fonts.md\`
- \`shell/components/{AppShell,MainNav,UserMenu}.tsx\`
- \`src/data/repository.ts\` (contracts) and \`src/data/mock-adapter.ts\` (temporary data)

## Steps

1. Import tokens.css at the app root and set \`data-theme\` for dark mode.
2. Load the fonts listed in fonts.md, weights only.
3. Mount \`<AppShell current={...} user={...}>{children}</AppShell>\`.
4. Route the navigation labels to real pages (${project.system.shell.nav.map((n) => n.label).join(', ')}).
5. Keep the mock adapter behind \`DataLayer\` so section work never touches fixtures.

## Done when

- Shell renders at every breakpoint without horizontal scroll.
- Focus is visible on every control.
- No component imports sample data.
`,
  })

  project.sections.forEach((section, i) => {
    files.push({
      path: `instructions/incremental/${String(i + 2).padStart(2, '0')}-${section.id}.md`,
      content: `# Milestone ${String(i + 2).padStart(2, '0')} — ${section.name}

**Priority.** ${section.priority}

${section.purpose}

## Components

${section.screens.map((s) => `- \`${componentName(section, s)}\` — ${s.name} (\`${s.route}\`)`).join('\n')}

## Data

${section.entityIds
  .map((id) => {
    const e = project.data.entities.find((x) => x.id === id)
    return e ? `- **${e.name}** — \`${e.fields.length}\` fields; sample rows in \`sections/${section.id}/sample-data.json\`` : ''
  })
  .join('\n')}

## Requirements

${bullet(section.requirements.map((r) => `(${r.priority}) ${r.text}`))}

## Tests

${bullet(section.tests)}

## Out of scope

${bullet(section.outOfScope)}

## Done when

- Every requirement above is implemented or explicitly deferred in writing.
- The section's tests pass, including empty and error states.
`,
    })
  })

  files.push({
    path: `milestones.txt`,
    content: ['01-shell', ...milestones].join('\n') + '\n',
  })

  return files
}

function standards(project: Project): PackageFile[] {
  return [
    {
      path: 'standards/index.md',
      content: `# Engineering standards\n\nThese are the standards the implementation is reviewed against (Agent OS style).\n\n- [Tech stack](./tech-stack.md)\n- [Code style](./code-style.md)\n- [Testing](./testing.md)\n`,
    },
    {
      path: 'standards/tech-stack.md',
      content: `# Tech stack\n\n| Layer | Choice | Version | Why |\n| --- | --- | --- | --- |\n${project.system.stack.map((s) => `| ${s.layer} | ${s.choice} | ${s.version} | ${s.reason} |`).join('\n')}\n`,
    },
    {
      path: 'standards/code-style.md',
      content: `# Code style

- TypeScript strict; no \`any\` in exported component props.
- Components accept data and callbacks only. No fetching, no global stores in a component file.
- Styling comes from tokens: \`var(--primary)\`, \`var(--radius-md)\`, \`var(--space-md)\`. No raw hexes.
- One component per file, named export, props interface immediately above it.
- Interactive elements are \`button\`, \`input\`, \`select\`, \`a\` — never a div with a click handler.
- Every component handles empty and loading states.
- Accessibility: labels on every input, visible focus, 44px minimum touch targets.
`,
    },
    {
      path: 'standards/testing.md',
      content: `# Testing

- Write the section tests first (\`sections/<id>/tests.md\`), then implement.
- Each screen needs: renders with sample data, empty state, keyboard path.
- Each flow in \`flows.md\` becomes one end-to-end test.
- Assert user-visible outcomes, not implementation details.
- Suggested runner: Vitest for units, Playwright for flows.
`,
    },
  ]
}

function specs(project: Project): PackageFile[] {
  return project.sections.flatMap((section) => {
    const entityNames = section.entityIds.map((id) => project.data.entities.find((e) => e.id === id)?.name ?? id)
    const tasks = [
      ...section.requirements.map((r, i) => `- [ ] \`T${String(i + 1).padStart(2, '0')}\` ${r.text} _(${r.priority})_`),
      ...section.screens.map((s, i) => `- [ ] \`S${String(i + 1).padStart(2, '0')}\` Build \`${componentName(section, s)}\` with sample data, empty and loading states`),
      ...section.tests.map((t, i) => `- [ ] \`Q${String(i + 1).padStart(2, '0')}\` Test: ${t}`),
    ]
    return [
      {
        path: `specs/${section.id}/requirements.md`,
        content: `# ${section.name} — requirements\n\n${section.purpose}\n\n## Must / should / could\n\n${bullet(section.requirements.map((r) => `**${r.priority}** — ${r.text}`))}\n\n## Out of scope\n\n${bullet(section.outOfScope)}\n\n## Data\n\n${bullet(entityNames)}\n`,
      },
      {
        path: `specs/${section.id}/plan.md`,
        content: `# ${section.name} — implementation plan

## Approach

1. Add the section types (\`sections/${section.id}/types.ts\`) to the app's type module.
2. Wire the repository interface for ${entityNames.join(', ') || 'this section'} to the mock adapter.
3. Drop in the exported components and mount them on their routes.
4. Replace sample data with repository calls behind the same props.
5. Add empty, loading and error states.
6. Implement the interactions: ${section.screens.flatMap((s) => s.blocks.filter((b) => b.type === 'filters' || b.type === 'form' || b.type === 'detail').map((b) => b.type)).join(', ') || 'navigation only'}.

## Routes

${bullet(section.screens.map((s) => `\`${s.route}\` — ${s.name}`))}

## Risks

${bullet(section.screens.filter((s) => s.states.length).map((s) => `${s.name}: ${s.states.map((st) => st.name).join(', ')}`))}
`,
      },
      {
        path: `specs/${section.id}/tasks.md`,
        content: `# ${section.name} — tasks

${tasks.join('\n')}

## Definition of done

- All tasks above checked or explicitly deferred.
- \`sections/${section.id}/tests.md\` green.
- No raw colour, spacing or font value in the diff.
`,
      },
    ]
  })
}

function gitWorkflow(project: Project): PackageFile {
  return {
    path: 'git-workflow.md',
    content: `# Git workflow

The package is meant to live beside the code, so design and implementation share history.

## One folder, committed with the app

\`\`\`bash
git checkout -b feat/${project.id}
cp -R product-plan/ ./docs/product-plan   # or keep it at the repo root
git add docs/product-plan && git commit -m "Add ${project.name} design package"
\`\`\`

## One worktree per exploration

Design OS iterations are cheap; give each its own working tree so a prototype never blocks a fix.

\`\`\`bash
git worktree add ../${project.id}-explore explorer
cd ../${project.id}-explore
# edit the wiki, re-export, commit on the explorer branch
git worktree remove ../${project.id}-explore
\`\`\`

## Milestones as commits

\`instructions/incremental/\` is already ordered; commit after each one so a review can see the shell land before the first section.

\`\`\`bash
git commit -m "01 shell: tokens, fonts, AppShell"
git commit -m "02 ${project.sections[0]?.id ?? 'section'}: ${project.sections[0]?.name ?? 'first section'}"
\`\`\`

## Review checkpoints

- The diff touches no raw colour, radius, spacing or font value.
- \`sections/*/tests.md\` statements exist as tests.
- Screenshots in \`sections/*/screenshot.svg\` still match the components (regenerate by re-exporting).
- \`agent-os/standards/index.yml\` is unchanged, or the change is deliberate.
`,
  }
}

export function buildHandoff(project: Project): PackageFile[] {
  const files: PackageFile[] = []
  files.push(gitWorkflow(project))

  files.push({
    path: 'product-overview.md',
    content: `# ${project.name}

${project.brief.tagline}

${project.brief.summary}

## Value proposition

${project.brief.elevator}

## Problems

${project.brief.problems.map((p) => `### ${p.title}\n\n${p.detail}\n\nCost of inaction: ${p.cost}`).join('\n\n')}

## Features

${bullet(project.sections.map((s) => `${s.name} — ${s.purpose}`))}

## Roadmap

${project.roadmap.phases.map((p) => `### ${p.name} (${p.horizon})\n\n${p.goal}\n\n${bullet(p.outcomes)}`).join('\n\n')}

## Who it is for

${project.brief.personas.map((p) => `**${p.name}** — ${p.role}. Goal: ${p.goal}. Pain: ${p.pain}.`).join('\n\n')}
`,
  })

  files.push(...promptsAndInstructions(project))
  files.push(...designSystemFiles(project))
  files.push(...dataShapeFiles(project))
  files.push(...shellFiles(project))
  files.push(...standards(project))
  files.push(...specs(project))

  for (const section of project.sections) {
    files.push({ path: `sections/${section.id}/README.md`, content: sectionReadme(project, section) })
    if (section.screens[0]) {
      files.push({
        path: `sections/${section.id}/screenshot.svg`,
        content: screenScreenshot(project, section, section.screens[0]),
      })
    }
    files.push({ path: `sections/${section.id}/tests.md`, content: sectionTests(section) })
    files.push({ path: `sections/${section.id}/types.ts`, content: sectionTypes(project, section) })
    files.push({
      path: `sections/${section.id}/sample-data.json`,
      content: JSON.stringify(
        Object.fromEntries(
          project.data.entities
            .filter((e) => section.entityIds.includes(e.id))
            .map((e) => [camel(e.plural || e.name), e.rows]),
        ),
        null,
        2,
      ),
    })
    for (const screen of section.screens) {
      files.push({
        path: `sections/${section.id}/components/${componentName(section, screen)}.tsx`,
        content: screenComponent(project, section, screen),
      })
    }
    files.push({
      path: `sections/${section.id}/components/index.ts`,
      content: section.screens.map((s) => `export { ${componentName(section, s)} } from './${componentName(section, s)}'`).join('\n') + '\n',
    })
  }

  return files
}
