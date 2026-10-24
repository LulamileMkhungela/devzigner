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

function sectionTests(project: Project, section: Section): string {
  const formScreens = section.screens.filter((screen) => screen.blocks.some((b) => b.type === 'form'))
  const listScreens = section.screens.filter((screen) => screen.blocks.some((b) => b.type === 'table' || b.type === 'list'))
  const primary = section.screens[0]
  const entity = project.data.entities.find((e) => section.entityIds.includes(e.id))

  return `# Test Specs: ${section.name}

These test specs are **framework-agnostic**. Adapt them to your testing setup (Jest, Vitest, Playwright, Cypress, React Testing Library, etc.).

## Overview

${section.purpose}

The section ships ${section.screens.length} screen${section.screens.length === 1 ? '' : 's'} (${section.screens.map((s) => `${s.name} \`${s.route}\``).join(', ')}) with one component per screen, built from the registry. Test the user-facing behaviour, not the implementation.

---

## User Flow Tests

${section.tests
  .map(
    (test, index) => `### Flow ${index + 1}: ${test}

**Scenario:** A user completes this step of the ${section.name.toLowerCase()} workflow.

#### Success Path

**Setup:**
- The app is on \`${primary?.route ?? '/'}\` with the rows from \`sample-data.json\`
- Signed in as a user with access to ${section.name.toLowerCase()}

**Steps:**
1. User opens \`${primary?.route ?? '/'}\`
2. User sees the section heading and its primary record list
3. User acts on the flow above (filter, open, edit or create as the screen allows)
4. User confirms the action

**Expected Results:**
- [ ] The expected records are visible with real values, not placeholders
- [ ] The action completes and the list reflects the change
- [ ] A confirmation is visible (inline success or toast)
- [ ] The URL still addresses the current view

#### Failure Path: Empty result set

**Steps:**
1. User filters or searches so that no record matches

**Expected Results:**
- [ ] An empty state explains what happened rather than showing an empty table
- [ ] A "clear filters" affordance is available and works
`,
  )
  .join('\n---\n\n')}

${formScreens.length
  ? `### Flow ${section.tests.length + 1}: Create a ${entity?.name.toLowerCase() ?? 'record'}

**Scenario:** A user adds a new record through the form.

#### Success Path

**Steps:**
1. User opens \`${formScreens[0].route}\`
2. User fills every required field
3. User presses the submit button

**Expected Results:**
- [ ] The submit button is a real button inside a form
- [ ] The new record appears in the list above without a reload
- [ ] The form reports success rather than silently closing

#### Failure Path: Validation Error

**Steps:**
1. User leaves a required field empty
2. User presses submit

**Expected Results:**
- [ ] The field is marked invalid (\`aria-invalid\`) and shows a message
- [ ] The form is not submitted and no record is created
- [ ] The message is announced to assistive technology
`
  : ''}

---

## Empty State Tests

### Primary Empty State

**Scenario:** No ${entity?.plural?.toLowerCase() ?? 'records'} exist yet.

**Setup:**
- The collection is empty (\`rows={[]}\`)

**Expected Results:**
- [ ] The empty state heading and body are visible
- [ ] The primary call to action is visible and functional
- [ ] Nothing renders as a broken table with headers only

### Related Records Empty State

**Scenario:** A parent record exists but has no children yet.

**Expected Results:**
- [ ] The parent still renders its own data
- [ ] The child area shows a "nothing here yet" message with a next step

---

## Component Interaction Tests

${section.screens
  .map(
    (screen) => `### ${componentName(section, screen)}

**Renders correctly:**
- [ ] Displays \`${screen.name}\` with the rows from \`sample-data.json\`
- [ ] Status values render as labelled badges, not bare strings

**User interactions:**
${screen.blocks
  .flatMap((block) => {
    if (block.type === 'filters') return ['- [ ] Typing in the search field filters rows as you type', '- [ ] Clicking a chip narrows the list and the active chip is marked']
    if (block.type === 'table') return ['- [ ] Clicking a column header sorts, and the header reports the sort state', '- [ ] Clicking a row opens the record']
    if (block.type === 'form') return ['- [ ] Each field has a bound label', '- [ ] Submitting an invalid form shows inline errors and keeps the values']
    if (block.type === 'detail') return ['- [ ] Tabs switch the visible panel and the active tab is marked']
    if (block.type === 'board') return ['- [ ] A card can be added to the first column']
    return []
  })
  .join('\n')}
- [ ] Every interactive element is reachable by keyboard with a visible focus ring
`,
  )
  .join('\n')}

---

## Edge Cases

- [ ] Long names truncate instead of breaking the layout
- [ ] A single row and 100+ rows both render without layout shift
- [ ] Filtering to zero then clearing restores the full list
- [ ] Creating the first record transitions the empty state to a populated one

---

## Accessibility Checks

- [ ] All interactive elements are keyboard accessible
- [ ] Form fields have associated labels
- [ ] Error messages are announced to screen readers
- [ ] Focus returns sensibly after closing a drawer or dialog

---

## Sample Test Data

Use \`sample-data.json\`, or the inline shape below:

\`\`\`typescript
// Populated state
const mockRows = [
  { id: "test-1", ${entity?.fields.slice(0, 3).map((f) => `${f.name}: ${JSON.stringify(f.example)}`).join(', ') ?? 'name: "Sample"'} },
];

// Empty state
const mockEmpty: typeof mockRows = [];
\`\`\`

${listScreens.length ? `The list and table screens above are the ones to exercise first: \`${listScreens[0].route}\`.` : ''}
`
}

function sectionReadme(project: Project, section: Section): string {
  const flows = project.flows.filter((f) => f.steps.some((s) => s.sectionId === section.id))
  return `# ${section.name}

## Overview

${section.purpose}

**Priority.** ${section.priority}

## User Flows

${flows.length ? flows.map((f) => `### ${f.name}\n\n${f.persona} · ${f.steps.length} steps\n\n${f.steps.map((s, i) => `${i + 1}. **${s.title}** — ${s.detail}`).join('\n')}\n\n**Success:** ${f.success}`).join('\n\n') : 'No flow crosses this section yet.'}

## Design Decisions

${bullet(section.screens.flatMap((screen) => screen.acceptance.slice(0, 2).map((a) => `${screen.name}: ${a}`)).slice(0, 6))}

- Blocks are composed from the registry; the ${section.screens.length} components are listed below.
- Every colour, radius and space value comes from the tokens.

## Data Shapes

**Entities:** ${section.entityIds.map((id) => project.data.entities.find((e) => e.id === id)?.name ?? id).join(', ')}

**From global entities:** ${section.entityIds
    .map((id) => {
      const entity = project.data.entities.find((e) => e.id === id)
      return entity ? `${entity.name} (${entity.fields.length} fields)` : ''
    })
    .filter(Boolean)
    .join(', ')}

## Visual Reference

See \`screenshot.svg\` for the target UI design — rendered from the compiled screen, not hand-drawn.

## Components Provided

${section.screens.map((screen) => `- \`${componentName(section, screen)}\` — ${screen.name} (${screen.kind})`).join('\n')}

## Screens

${section.screens.map((s) => `- **${s.name}** \`${s.route}\``).join('\n')}

## Callback Props

| Callback | Triggered When |
| --- | --- |
| \`onOpen\` | User clicks a row or card to open the record |
| \`onCreate\` | User clicks the primary action |
| \`onSearch\` | User types in the search field |
| \`onSubmit\` | User submits the form with valid values |

## Placeholders and states

Every component handles empty and populated data. Loading and error states are the page's responsibility — see \`tests.md\`.
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
      content: `# Typography Configuration

## Google Fonts Import

Add to your HTML \`<head>\` or CSS:

\`\`\`html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${design.typography.map((t) => `family=${t.family.replace(/ /g, '+')}:wght@${t.weights.join(';')}`).join('&')}&display=swap" rel="stylesheet">
\`\`\`

Self-host for production and drop the network dependency:

\`\`\`bash
npx @fontsource/${(design.typography[0]?.family ?? 'inter').toLowerCase().replace(/ /g, '-')}
\`\`\`

## Font Usage

${design.typography
  .map((t) => `- **${t.role}:** ${t.family} — ${t.weights.join(', ')} · ${t.size} / ${t.lineHeight}, tracking ${t.tracking} (\`${t.stack}\`)`)
  .join('\n')}

## Tokens

\`\`\`css
${design.typography.map((t) => `--font-${t.role}: ${t.stack};`).join('\n')}
\`\`\`
`,
    },
    {
      path: 'design-system/tailwind-colors.md',
      content: `# Tailwind Color Configuration

## Color Choices

${design.colors
  .map((colour) => `- **${colour.role}:** \`${colour.base}\` — ${colour.rationale}`)
  .join('\n')}

## Setup

\`\`\`css
@import "tailwindcss";
@import "./tokens.css";
\`\`\`

Components use arbitrary values that read the tokens directly, so the palette is never duplicated.

## Usage Examples

| Element | Classes |
| --- | --- |
| Primary button | \`bg-[var(--primary)] text-[var(--on-primary)] rounded-[var(--radius-sm)] px-3 py-2\` |
| Secondary badge | \`bg-[var(--surface-2)] text-[var(--ink-muted)] rounded-full px-2 py-1\` |
| Neutral text | \`text-[var(--ink)]\`; muted: \`text-[var(--ink-muted)]\` |
| Card | \`bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)]\` |

## Breakpoints

${design.breakpoints.map((b) => `- \`${b.name}\`: ${b.px}px — \`sm:\`/\`md:\`/\`lg:\`/\`xl:\` utilities, also exported as \`--breakpoint-${b.name}\``).join('\n')}

Layout contract: content column max ${design.layout.contentWidth}px, ${design.layout.density} density, ${design.layout.grid}. Every exported component is written mobile-first against these breakpoints.

## Dark mode

Semantic tokens are re-declared under \`[data-theme="dark"]\` in \`tokens.css\`. Use the semantic names, never a ramp step, in components.
`,
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
      content: `# UI Data Shapes\n\nThese types define the shape of data that the UI components expect to receive as props. They represent the **frontend contract** — what the components need to render correctly.\n\nHow you model, store, and fetch this data on the backend is an implementation decision. You may combine, split, or extend these types to fit your architecture.\n\n## Entities\n\n${project.data.entities
        .map((e) => `- **${e.name}** — ${e.description} (used in: ${project.sections.filter((s) => s.entityIds.includes(e.id)).map((s) => s.name).join(', ') || 'shared'})`)
        .join('\n')}\n\n## Per-Section Types\n\nEach section includes its own \`types.ts\` with the full interface definitions:\n\n${project.sections.map((s) => `- \`sections/${s.id}/types.ts\``).join('\n')}\n\n## Combined Reference\n\nSee \`overview.ts\` for all entity types aggregated in one file.\n`,
    },
    {
      path: 'data-shapes/overview.ts',
      content: `// =============================================================================\n// UI Data Shapes — Combined Reference\n//\n// These types define the data that UI components expect to receive as props.\n// They are a frontend contract, not a database schema. How you model, store,\n// and fetch this data is an implementation decision.\n// =============================================================================\n\n${project.data.entities.map((e) => `// -----------------------------------------------------------------------------\n// ${e.name}\n// -----------------------------------------------------------------------------\n\nexport interface ${e.name} ${entityType(e)}`).join('\n\n')}\n\nexport type EntityMap = {\n${project.data.entities.map((e) => `  ${camel(e.name)}: ${e.name}`).join('\n')}\n}\n`,
    },
  ]
}

const HANDOFF_PREAMBLE = `---

## About This Handoff

**What you're receiving:**
- Finished UI designs (React components with full styling)
- Product requirements and user flow specifications
- Design system tokens (colors, typography)
- Sample data showing the shape of data components expect
- Test specs focused on user-facing behavior

**Your job:**
- Integrate these components into your application
- Wire up callback props to your routing and business logic
- Replace sample data with real data from your backend
- Implement loading, error, and empty states

The components are props-based — they accept data and fire callbacks. How you architect the backend, data layer, and business logic is up to you.

---`

function milestonePreamble(index: number, total: number): string {
  return `> **Provide alongside:** \`product-overview.md\`
> **Prerequisites:** ${index === 1 ? 'None' : `Milestone ${index - 1} complete`}
> **Milestone:** ${index} of ${total}`
}

function productOverview(project: Project): string {
  const primary = project.design.colors.find((c) => c.role === 'primary') ?? project.design.colors[0]
  const secondary = project.design.colors.find((c) => c.role === 'accent') ?? project.design.colors[1]
  const neutral = project.design.colors.find((c) => c.role === 'neutral') ?? project.design.colors[2]
  return `# ${project.name} — Product Overview

## Summary

${project.brief.tagline}

${project.brief.summary}

## Planned Sections

${project.sections.map((section, i) => `${i + 1}. **${section.name}** — ${section.purpose}`).join('\n')}

## Product Entities

${project.data.entities.map((entity) => `- **${entity.name}** — ${entity.description}`).join('\n')}

## Design System

**Colors:**
- Primary: ${primary?.base ?? 'Not defined'}
- Secondary: ${secondary?.base ?? 'Not defined'}
- Neutral: ${neutral?.base ?? 'Not defined'}

**Typography:**
${project.design.typography.map((t) => `- ${t.role}: ${t.family}`).join('\n')}

## Implementation Sequence

Build this product in milestones:

1. **Shell** — Set up design tokens and application shell
${project.sections.map((section, i) => `${i + 2}. **${section.name}** — ${section.purpose}`).join('\n')}

Each milestone has a dedicated instruction document in \`instructions/incremental/\`.
`
}

function promptsAndInstructions(project: Project): PackageFile[] {
  const files: PackageFile[] = []
  const total = project.sections.length + 1
  const first = project.sections[0]

  files.push({
    path: 'prompts/one-shot-prompt.md',
    content: `# One-Shot Implementation Prompt

I need you to implement a complete web application based on detailed UI designs and product specifications I'm providing.

## Instructions

Please carefully read and analyze the following files:

1. **@product-plan/product-overview.md** — Product summary with sections and entity overview
2. **@product-plan/instructions/one-shot-instructions.md** — Complete implementation instructions for all milestones

After reading these, also review:
- **@product-plan/design-system/** — Color and typography tokens
- **@product-plan/data-shapes/** — UI data contracts (the shapes of data the components expect)
- **@product-plan/shell/** — Application shell components
- **@product-plan/sections/** — All section components, types, sample data, and test specs

## Before You Begin

Review all the provided files, then ask me clarifying questions about:

1. **My tech stack** — What framework, language, and tools I'm using, and any existing codebase conventions
2. **Authentication & users** — How users should sign up, log in, and what permissions exist
3. **Product requirements** — Anything in the specs or user flows that needs clarification
4. **Anything else** — Whatever you need to know before implementing

Lastly, ask me if I have any additional notes for this implementation.

Once I answer your questions, create a comprehensive implementation plan before coding.

---

### This package in one line

**${project.name}** is a ${project.archetypeLabel.toLowerCase()} product with ${project.sections.length} sections, ${project.sections.reduce((n, s) => n + s.screens.length, 0)} designed screens and ${project.data.entities.length} entities. Start with the shell milestone, then follow the sections in order.
`,
  })

  files.push({
    path: 'prompts/section-prompt.md',
    content: `# Section Implementation Prompt

## Define Section Variables

- **SECTION_NAME** = [Human-readable name, e.g., "${first?.name ?? 'Invoices'}"]
- **SECTION_ID** = [Folder name in sections/, e.g., "${first?.id ?? 'invoices'}"]
- **NN** = [Milestone number, e.g., "02" or "03" — sections start at 02 since 01 is Shell]

---

I need you to implement the **SECTION_NAME** section of my application.

## Instructions

Please carefully read and analyze the following files:

1. **@product-plan/product-overview.md** — Product summary for overall context
2. **@product-plan/instructions/incremental/NN-SECTION_ID.md** — Specific instructions for this section

Also review the section assets:
- **@product-plan/sections/SECTION_ID/README.md** — Feature overview and design intent
- **@product-plan/sections/SECTION_ID/tests.md** — UI behavior test specs
- **@product-plan/sections/SECTION_ID/components/** — React components to integrate
- **@product-plan/sections/SECTION_ID/types.ts** — TypeScript interfaces
- **@product-plan/sections/SECTION_ID/sample-data.json** — Test data

## Before You Begin

Review all the provided files, then ask me clarifying questions about:

1. **Integration** — How this section connects to existing features and any APIs already built
2. **Product requirements** — Anything in the specs or user flows that needs clarification
3. **Anything else** — Whatever you need to know before implementing

Lastly, ask me if I have any additional notes for this implementation.

Once I answer your questions, proceed with implementation.
`,
  })

  files.push({
    path: 'instructions/incremental/01-shell.md',
    content: `# Milestone 1: Shell

${milestonePreamble(1, total)}

${HANDOFF_PREAMBLE}

## Goal

Set up the design tokens and application shell — the persistent chrome that wraps all sections.

## What to Implement

### 1. Design Tokens

Configure your styling system with these tokens:

- See \`design-system/tokens.css\` for CSS custom properties (light and dark)
- See \`design-system/tokens.dtcg.json\` for the W3C DTCG version (Figma, Tokens Studio, Style Dictionary)
- See \`design-system/tailwind-colors.md\` for Tailwind configuration and breakpoints
- See \`design-system/fonts.md\` for font loading

### 2. Application Shell

Copy the shell components from \`shell/components/\` to your project:

- \`AppShell.tsx\` — main layout wrapper
- \`MainNav.tsx\` — navigation component
- \`UserMenu.tsx\` — user menu with avatar

**Wire Up Navigation:**

${bullet(project.system.shell.nav.map((n) => `\`${n.label}\` → its route`))}

**User Menu:**

The user menu expects:
- User name
- Avatar URL (optional)
- Logout callback

## Files to Reference

- \`design-system/\` — Design tokens
- \`shell/README.md\` — Shell design intent
- \`shell/components/\` — Shell React components
- \`shell/screenshot.svg\` — Shell visual reference

## Done When

- [ ] Design tokens are configured
- [ ] Shell renders with navigation
- [ ] Navigation links to the correct routes
- [ ] User menu shows user info
- [ ] Responsive at ${project.design.breakpoints.map((b) => `${b.px}px`).join(', ')}
`,
  })

  project.sections.forEach((section, i) => {
    const index = i + 2
    const flows = project.flows.filter((f) => f.steps.some((s) => s.sectionId === section.id))
    files.push({
      path: `instructions/incremental/${String(index).padStart(2, '0')}-${section.id}.md`,
      content: `# Milestone ${index}: ${section.name}

${milestonePreamble(index, total)}

${HANDOFF_PREAMBLE}

## Goal

Implement the ${section.name} feature — ${section.purpose}

## Overview

${section.purpose} Users reach it at ${section.screens.map((s) => `\`${s.route}\``).join(', ')}.

**Key Functionality:**
${bullet(
  section.requirements.filter((r) => r.priority !== 'could').slice(0, 6).map((r) => r.text),
)}

## Components Provided

Copy the section components from \`sections/${section.id}/components/\`:

${bullet(section.screens.map((screen) => `\`${componentName(section, screen)}\` — ${screen.name} (${screen.kind})`))}

## Props Reference

The components expect these data shapes (see \`types.ts\` for full definitions):

**Data props:**

\`\`\`typescript
${section.entityIds
  .map((id) => {
    const entity = project.data.entities.find((e) => e.id === id)
    return entity ? `interface ${entity.name} {\n${['id: string', ...entity.fields.slice(0, 8).map((f) => `  ${f.name}${f.required ? '' : '?'}: ${f.type === 'status' && f.options?.length ? f.options.map((o) => `'${o}'`).join(' | ') : 'string | number | boolean'}`)].join('\n')}\n}` : ''
  })
  .join('\n\n')}
\`\`\`

**Callback props:**

| Callback | Triggered When |
| --- | --- |
| \`onOpen\` | User clicks a row or card to open the record |
| \`onCreate\` | User clicks the primary action |
| \`onSearch\` | User types in the search field |
| \`onSubmit\` | User submits the form with valid values |

## Expected User Flows

${flows.length
  ? flows.map((flow, f) => `### Flow ${f + 1}: ${flow.name}

${flow.steps.map((step, si) => `${si + 1}. ${step.title} — ${step.detail}`).join('\n')}

**Outcome:** ${flow.success}`).join('\n\n')
  : `### Flow 1: Review the section\n\n1. User opens \`${section.screens[0]?.route ?? '/'}\`\n2. User scans the list and filters it\n3. **Outcome:** the relevant records are visible`}

## Empty States

The components include empty state designs. Make sure to handle:

- **No data yet:** show the empty state when the primary list/collection is empty
- **No related records:** handle cases where associated records don't exist
- **First-time experience:** guide users to create their first item with clear CTAs

## Testing

See \`sections/${section.id}/tests.md\` for UI behavior test specs covering:
- User flow success and failure paths
- Empty state rendering
- Component interactions and edge cases

## Requirements

${bullet(section.requirements.map((r) => `(${r.priority}) ${r.text}`))}

## Out of Scope

${bullet(section.outOfScope)}

## Files to Reference

- \`sections/${section.id}/README.md\` — Feature overview and design intent
- \`sections/${section.id}/tests.md\` — UI behavior test specs
- \`sections/${section.id}/components/\` — React components
- \`sections/${section.id}/types.ts\` — TypeScript interfaces
- \`sections/${section.id}/sample-data.json\` — Test data
- \`sections/${section.id}/screenshot.svg\` — Visual reference

## Done When

- [ ] Components render with real data
- [ ] Empty states display properly when no records exist
- [ ] All callback props are wired to working functionality
- [ ] User can complete all expected flows end-to-end
- [ ] Matches the visual design (see screenshot)
- [ ] Responsive on mobile
`,
    })
  })

  files.push({
    path: 'instructions/one-shot-instructions.md',
    content: `# ${project.name} — Complete Implementation Instructions

${HANDOFF_PREAMBLE}

## Testing

Each section includes a \`tests.md\` file with UI behavior test specs. These are **framework-agnostic** — adapt them to your testing setup.

**For each section:**
1. Read \`sections/[section-id]/tests.md\`
2. Write tests for key user flows (success and failure paths)
3. Implement the feature to make tests pass
4. Refactor while keeping tests green

---

${productOverview(project)}

---

# Milestone 1: Shell

${bullet([
  'Configure design tokens from `design-system/tokens.css`',
  'Copy `shell/components/{AppShell,MainNav,UserMenu}.tsx`',
  `Wire navigation: ${project.system.shell.nav.map((n) => n.label).join(', ')}`,
  'Wire the user menu to your auth layer',
])}

---

${project.sections
  .map(
    (section, i) => `# Milestone ${i + 2}: ${section.name}

${section.purpose}

${bullet(section.requirements.filter((r) => r.priority !== 'could').slice(0, 4).map((r) => r.text))}

Components: ${section.screens.map((s) => `\`${componentName(section, s)}\``).join(', ')}.
Tests: \`sections/${section.id}/tests.md\`.
Visual: \`sections/${section.id}/screenshot.svg\`.`,
  )
  .join('\n\n---\n\n')}

---

## Final Pass

- Replace the mock adapter with the real one; the UI must not change.
- Confirm every screen has empty, loading and error states.
- Re-read \`audit.md\` and close any warning.
`,
  })

  files.push({
    path: 'milestones.txt',
    content: ['01-shell', ...project.sections.map((s, i) => `${String(i + 2).padStart(2, '0')}-${s.id}`)].join('\n') + '\n',
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

  files.push({ path: 'product-overview.md', content: productOverview(project) })

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
    files.push({ path: `sections/${section.id}/tests.md`, content: sectionTests(project, section) })
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
