import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Block, DesignSystem, Entity, Project, SampleRow, Screen } from '../types'
import { formatField, humanize } from '../lib/format'
import { blockComponent } from '../engine/system'
import { Icon } from './Icons'

export function tokenVars(design: DesignSystem, theme: 'light' | 'dark'): CSSProperties {
  const semantic = theme === 'dark' ? design.darkSemantic : design.semantic
  const display = design.typography[0]
  const body = design.typography[1]
  const mono = design.typography[2]
  const vars: Record<string, string> = {
    ...semantic,
    '--font-display': display.stack,
    '--font-body': body.stack,
    '--font-mono': mono.stack,
    '--radius-xs': `${design.radii.xs}px`,
    '--radius-sm': `${design.radii.sm}px`,
    '--radius-md': `${design.radii.md}px`,
    '--radius-lg': `${design.radii.lg}px`,
    '--radius-xl': `${design.radii.xl}px`,
    '--shadow-xs': design.shadows.xs,
    '--shadow-sm': design.shadows.sm,
    '--shadow-md': design.shadows.md,
    '--shadow-lg': design.shadows.lg,
    '--shadow-focus': design.shadows.focus,
  }
  return vars as CSSProperties
}

const GOOD = /active|paid|complete|completed|delivered|healthy|live|on track|approved|confirmed|final|done|won|settled|accepted|resolved|available|occupied|on duty|on shift|signed|above benchmark|stable|in service|delivered|cleared|connected|current|hired|strong yes/i
const BAD = /churn|overdue|fail|reject|cancel|no.?show|lost|frozen|off road|off rail|escalat|critical|arrears|out of stock|declined|faulty|withdrawn|suspended|below benchmark|needs reauth|exiting|no response|abandoned/i
const WARN = /pending|watch|review|hold|risk|awaiting|late|delayed|unconfirmed|in progress|open|draft|due|packing|quoting|scheduled|planned|enrolling|investigating|on hold|in review|needs|requested|notice|restricted|resubmitted|amended|sent|proposed|invited|interviewing|offer|scripted|todo|backlog|doing|allocated|vacant|qualified|negotiation|discovery|proposal|verbal|trialing/i

export function statusTone(value: string): 'good' | 'warn' | 'bad' | 'brand' {
  if (GOOD.test(value)) return 'good'
  if (BAD.test(value)) return 'bad'
  if (WARN.test(value)) return 'warn'
  return 'brand'
}

function statusBadge(value: string) {
  return <span className={`pv-badge ${statusTone(value)}`}>{value}</span>
}

function entityOf(project: Project, id: string): Entity | undefined {
  return project.data.entities.find((e) => e.id === id)
}

/**
 * Interactive state for the prototype. Every control in a preview mutates this,
 * so the prototype behaves like a working app rather than a picture of one.
 */
interface ProtoCtl {
  query: string
  setQuery: (value: string) => void
  chip: string
  setChip: (value: string) => void
  sort: { key: string; dir: 1 | -1 } | null
  toggleSort: (key: string) => void
  values: Record<string, string>
  setValue: (key: string, value: string) => void
  errors: Record<string, string>
  submit: (entity?: Entity, fields?: string[]) => void
  reset: () => void
  submitted: boolean
  tab: number
  setTab: (index: number) => void
  extraRows: Record<string, SampleRow[]>
  addRow: (entityId: string, row: SampleRow) => void
  addedCards: { title: string; meta: string; tag: string }[]
  addCard: () => void
  toast: string | null
  say: (message: string) => void
  nav: string
  navigate: (label: string) => void
  openDrawer: () => void
  drawer: boolean
  closeDrawer: () => void
  mobileNav: boolean
  toggleMobileNav: () => void
}

function matchesQuery(row: SampleRow, needle: string): boolean {
  if (!needle) return true
  return Object.values(row).some((value) => String(value).toLowerCase().includes(needle))
}

function matchesChip(row: SampleRow, chip: string): boolean {
  if (!chip || chip.toLowerCase() === 'all' || chip.toLowerCase() === 'everyone') return true
  const needle = chip.toLowerCase()
  return Object.values(row).some((value) => {
    const text = String(value).toLowerCase()
    return text === needle || text.includes(needle)
  })
}

function rowsFor(block: Extract<Block, { type: 'table' | 'list' }>, entity: Entity, ctl: ProtoCtl): SampleRow[] {
  const base = block.rows
    .map((id) => entity.rows.find((r) => String(r.id) === id))
    .filter(Boolean) as SampleRow[]
  const extra = ctl.extraRows[entity.id] ?? []
  return [...extra, ...base].filter((row) => matchesQuery(row, ctl.query.trim().toLowerCase()) && matchesChip(row, ctl.chip))
}

function Chart({ block }: { block: Extract<Block, { type: 'chart' }> }) {
  const max = Math.max(1, ...block.series, ...(block.series2 ?? []))
  if (block.kind === 'donut') {
    const total = block.series.reduce((a, b) => a + b, 0) || 1
    let acc = 0
    const palette = ['var(--primary)', 'var(--accent)', 'var(--success)', 'var(--warning)', 'var(--info)', 'var(--border-strong)']
    const gradient = block.series
      .map((v, i) => {
        const start = (acc / total) * 100
        acc += v
        const end = (acc / total) * 100
        return `${palette[i % palette.length]} ${start}% ${end}%`
      })
      .join(', ')
    return (
      <div className="pv-donut">
        <div className="pv-donut-ring" style={{ background: `conic-gradient(${gradient})` }} />
        <div className="pv-legend">
          {block.labels.map((l, i) => (
            <span key={l}>
              <i className="dot" style={{ background: palette[i % palette.length] }} />
              {l} <span className="mono" style={{ color: 'var(--ink-faint)' }}>· {block.series[i]}</span>
            </span>
          ))}
        </div>
      </div>
    )
  }
  if (block.kind === 'line' || block.kind === 'area') {
    const w = 320
    const h = 100
    const pointsFor = (series: number[]) =>
      series.map((v, i) => `${(i / Math.max(1, series.length - 1)) * w},${h - (v / max) * (h - 8)}`).join(' ')
    return (
      <div>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 112 }}>
          {block.kind === 'area' && (
            <polygon points={`0,${h} ${pointsFor(block.series)} ${w},${h}`} fill="var(--primary)" opacity="0.12" />
          )}
          {block.series2 && (
            <polyline points={pointsFor(block.series2)} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.75" />
          )}
          <polyline points={pointsFor(block.series)} fill="none" stroke="var(--primary)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="pv-chart-labels">
          {block.labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div>
      <div className="pv-chart">
        {block.series.map((v, i) => (
          <div key={i} className={`pv-bar${i % 3 === 2 ? ' alt' : ''}`} style={{ height: `${(v / max) * 100}%` }} />
        ))}
      </div>
      <div className="pv-chart-labels">
        {block.labels.map((l) => (
          <span key={l}>{l.length > 8 ? l.slice(0, 8) : l}</span>
        ))}
      </div>
    </div>
  )
}

function TableBlock({ block, project, ctl }: { block: Extract<Block, { type: 'table' }>; project: Project; ctl: ProtoCtl }) {
  const entity = entityOf(project, block.entityId)
  if (!entity) return null
  const total = block.rows.length + (ctl.extraRows[entity.id]?.length ?? 0)
  const rows = rowsFor(block, entity, ctl)
  const sorted = ctl.sort
    ? [...rows].sort((a, b) => {
        const av = a[ctl.sort!.key]
        const bv = b[ctl.sort!.key]
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * ctl.sort!.dir
        return String(av ?? '').localeCompare(String(bv ?? '')) * ctl.sort!.dir
      })
    : rows
  return (
    <div className="pv-card">
      <div className="pv-card-head">
        <span className="pv-card-title">{block.caption}</span>
        <span className="mono" style={{ fontSize: 9, color: 'var(--ink-faint)' }}>
          {sorted.length} of {total} rows{ctl.query ? ` · “${ctl.query}”` : ''}
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="pv-table">
          <thead>
            <tr>
              {block.columns.map((c) => (
                <th key={c}>
                  <button
                    type="button"
                    onClick={() => ctl.toggleSort(c)}
                    className="pv-sort"
                    aria-label={`Sort by ${humanize(c)}`}
                    aria-pressed={ctl.sort?.key === c}
                  >
                    {humanize(c)}
                    {ctl.sort?.key === c && <span className="caret">{ctl.sort.dir === 1 ? '▲' : '▼'}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={String(row.id)} onClick={() => ctl.say(`${entity.name} ${String(row[entity.primaryField] ?? row.id)} opened`)} className="pv-row">
                {block.columns.map((c) => {
                  const field = entity.fields.find((f) => f.name === c)
                  const value = row[c]
                  const numeric = field?.type === 'money' || field?.type === 'number' || field?.type === 'percent'
                  return (
                    <td key={c} className={numeric ? 'num' : undefined}>
                      {field?.type === 'status' ? statusBadge(String(value)) : formatField(field, value, project.currency)}
                    </td>
                  )
                })}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={block.columns.length} className="pv-emptytd">
                  Nothing matches these filters.
                  <button
                    type="button"
                    className="pv-btn"
                    onClick={() => {
                      ctl.setQuery('')
                      ctl.setChip('all')
                    }}
                  >
                    Clear filters
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BlockView({ block, project, ctl }: { block: Block; project: Project; ctl: ProtoCtl }) {
  switch (block.type) {
    case 'pageHeader':
      return (
        <div className="pv-head">
          <div>
            <h2 className="pv-title">{block.title}</h2>
            <p className="pv-sub">{block.subtitle}</p>
          </div>
          <div className="pv-actions">
            {block.actions.map((a, i) => (
              <button key={a} type="button" onClick={() => (i === 0 ? ctl.openDrawer() : ctl.say(`${a} · export queued`))} className={`pv-btn${i === 0 ? ' primary' : ''}`}>
                {i === 0 && <Icon name="Plus" size={11} />}
                {a}
              </button>
            ))}
          </div>
        </div>
      )
    case 'stats':
      return (
        <div className="pv-stats">
          {block.items.map((s) => (
            <div className="pv-stat" key={s.label}>
              <div className="lab">{s.label}</div>
              <div className="val">{s.value}</div>
              <div className={`delta ${s.trend}`}>
                <Icon name={s.trend === 'up' ? 'TrendingUp' : s.trend === 'down' ? 'TrendingDown' : 'Circle'} size={9} />
                {s.delta}
              </div>
            </div>
          ))}
        </div>
      )
    case 'chart':
      return (
        <div className="pv-card">
          <div className="pv-card-head">
            <span className="pv-card-title">{block.title}</span>
            <span className="pv-badge">Last 6 periods</span>
          </div>
          <Chart block={block} />
        </div>
      )
    case 'filters':
      return (
        <div className="pv-filters">
          {block.chips.map((c, i) => (
            <button
              key={c}
              type="button"
              onClick={() => ctl.setChip(i === 0 ? 'all' : c)}
              aria-pressed={ctl.chip === c || (i === 0 && ctl.chip === 'all')}
              className={`pv-chip${ctl.chip === c || (i === 0 && ctl.chip === 'all') ? ' active' : ''}`}
            >
              {c}
            </button>
          ))}
          <label className="pv-searchbox">
            <Icon name="Search" size={10} />
            <input
              type="search"
              value={ctl.query}
              onChange={(event) => ctl.setQuery(event.target.value)}
              placeholder={block.search}
              aria-label={block.search}
            />
          </label>
        </div>
      )
    case 'table':
      return <TableBlock block={block} project={project} ctl={ctl} />
    case 'list': {
      const entity = entityOf(project, block.entityId)
      if (!entity) return null
      const rows = rowsFor(block, entity, ctl)
      return (
        <div className="pv-card">
          <div className="pv-card-head">
            <span className="pv-card-title">{block.title}</span>
            <span className="pv-badge brand">{rows.length} in this view</span>
          </div>
          {rows.map((row) => {
            const metaField = entity.fields.find((f) => f.name === block.metaField)
            return (
              <button type="button" className="pv-listrow" key={String(row.id)} onClick={() => ctl.say(`${String(row[entity.primaryField] ?? entity.name)} opened`)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t">{String(row[entity.primaryField] ?? '')}</div>
                  <div className="m">{formatField(entity.fields.find((f) => f.name === entity.secondaryField), row[entity.secondaryField], project.currency)}</div>
                </div>
                {metaField?.type === 'status' ? statusBadge(String(row[metaField.name])) : <span className="pv-badge">{String(row[block.metaField] ?? '')}</span>}
              </button>
            )
          })}
          {rows.length === 0 && <p className="pv-empty">Nothing matches these filters.</p>}
        </div>
      )
    }
    case 'detail': {
      const entity = entityOf(project, block.entityId)
      if (!entity) return null
      const row = entity.rows.find((r) => String(r.id) === block.recordId)
      return (
        <div className="pv-card">
          <div className="pv-tabs" role="tablist">
            {block.tabs.map((t, i) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={ctl.tab === i}
                onClick={() => ctl.setTab(i)}
                className={`pv-tab${ctl.tab === i ? ' active' : ''}`}
              >
                {t}
              </button>
            ))}
          </div>
          <dl className="pv-detail">
            {block.fields.map((f) => {
              const field = entity.fields.find((x) => x.name === f)
              const value = row?.[f]
              return (
                <div key={f} style={{ display: 'contents' }}>
                  <dt>{humanize(f)}</dt>
                  <dd>{field?.type === 'status' ? statusBadge(String(value ?? '—')) : formatField(field, value, project.currency)}</dd>
                </div>
              )
            })}
          </dl>
        </div>
      )
    }
    case 'form': {
      const entity = entityOf(project, block.entityId)
      const done = ctl.submitted
      return (
        <div className="pv-card">
          <div className="pv-card-head">
            <span className="pv-card-title">{block.title}</span>
            <span className="pv-badge">{block.fields.length} fields</span>
          </div>
          {done ? (
            <div className="pv-success" role="status">
              <b>Saved</b>
              <p>{entity ? `${entity.name} created from this form.` : 'Record created.'} The list above now includes it.</p>
              <button type="button" className="pv-btn" onClick={ctl.reset}>
                Add another
              </button>
            </div>
          ) : (
            <form
              className="pv-form"
              onSubmit={(event) => {
                event.preventDefault()
                ctl.submit(entity, block.fields)
              }}
            >
              {block.fields.map((f) => {
                const field = entity?.fields.find((x) => x.name === f)
                const wide = field?.type === 'longtext'
                const value = ctl.values[f] ?? ''
                const error = ctl.errors[f]
                const common = {
                  id: `pv-${block.entityId}-${f}`,
                  name: f,
                  value,
                  onChange: (event: { target: { value: string } }) => ctl.setValue(f, event.target.value),
                  'aria-invalid': error ? true : undefined,
                  'aria-describedby': error ? `pv-err-${f}` : undefined,
                  required: field?.required,
                }
                return (
                  <div className={`pv-field${wide ? ' wide' : ''}`} key={f}>
                    <label htmlFor={common.id}>
                      {humanize(f)}
                      {field?.required ? ' *' : ''}
                    </label>
                    {field?.type === 'longtext' ? (
                      <textarea {...common} rows={3} />
                    ) : field?.type === 'status' && field.options?.length ? (
                      <select {...common}>
                        <option value="">Choose…</option>
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field?.type === 'boolean' ? (
                      <label className="pv-switch">
                        <input type="checkbox" checked={value === 'yes'} onChange={(event) => ctl.setValue(f, event.target.checked ? 'yes' : 'no')} />
                        <span>{value === 'yes' ? 'Yes' : 'No'}</span>
                      </label>
                    ) : (
                      <input
                        {...common}
                        type={field?.type === 'email' ? 'email' : field?.type === 'phone' ? 'tel' : field?.type === 'number' || field?.type === 'money' || field?.type === 'percent' || field?.type === 'rating' ? 'number' : field?.type === 'date' ? 'date' : 'text'}
                        placeholder={field?.example ? String(field.example) : undefined}
                      />
                    )}
                    {error && (
                      <span className="pv-error" id={`pv-err-${f}`} role="alert">
                        {error}
                      </span>
                    )}
                  </div>
                )
              })}
              <div className="pv-formfoot">
                <button type="submit" className="pv-btn primary">
                  {block.submit}
                </button>
                <button type="button" className="pv-btn" onClick={ctl.reset}>
                  Cancel
                </button>
                <span className="pv-hint">{entity ? `${entity.name} · required fields marked *` : ''}</span>
              </div>
            </form>
          )}
        </div>
      )
    }
    case 'board':
      return (
        <div className="pv-card">
          <div className="pv-card-head">
            <span className="pv-card-title">{block.title}</span>
            <button type="button" className="pv-btn" onClick={ctl.addCard}>
              <Icon name="Plus" size={10} /> Add card
            </button>
          </div>
          <div className="pv-board">
            {block.columns.map((col) => (
              <div className="pv-col" key={col.name}>
                <div className="pv-colhead">
                  {col.name}
                  <span className="n">{col.cards.length}</span>
                </div>
                {[...col.cards, ...(col.name === block.columns[0]?.name ? ctl.addedCards : [])].map((card, i) => (
                  <div className="pv-kcard" key={`${card.title}-${i}`}>
                    <div className="t">{card.title}</div>
                    <div className="m">
                      <span>{card.meta}</span>
                      <span>{card.tag}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )
    case 'timeline':
      return (
        <div className="pv-card">
          <div className="pv-card-head">
            <span className="pv-card-title">{block.title}</span>
          </div>
          <div className="pv-timeline">
            {block.events.map((e, i) => (
              <div className="pv-tl-item" key={i}>
                <div className="pv-tl-time">{e.time}</div>
                <div className={`pv-tl-dot ${e.tone}`} />
                <div className="pv-tl-body">
                  <b>{e.title}</b>
                  <span>{e.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    case 'calendar': {
      const byDay = new Map<number, { label: string; alt: boolean }[]>()
      block.events.forEach((e, i) => {
        const arr = byDay.get(e.day) ?? []
        arr.push({ label: e.label, alt: i % 2 === 1 })
        byDay.set(e.day, arr)
      })
      return (
        <div className="pv-card">
          <div className="pv-card-head">
            <span className="pv-card-title">{block.month}</span>
            <div className="row" style={{ gap: 5 }}>
              <span className="pv-badge">Month</span>
              <span className="pv-badge">Week</span>
            </div>
          </div>
          <div className="pv-cal">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div className="pv-cal-head" key={i}>
                {d}
              </div>
            ))}
            {Array.from({ length: 35 }, (_, i) => {
              const day = i - 2
              const events = byDay.get(day) ?? []
              return (
                <div className={`pv-cal-cell${day < 1 || day > 31 ? ' out' : ''}`} key={i}>
                  {day >= 1 && day <= 31 ? day : ''}
                  {events.slice(0, 2).map((e, j) => (
                    <div className={`pv-cal-ev${e.alt ? ' alt' : ''}`} key={j}>
                      {e.label}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )
    }
    case 'activity':
      return (
        <div className="pv-card">
          <div className="pv-card-head">
            <span className="pv-card-title">{block.title}</span>
            <span className="pv-badge">Live</span>
          </div>
          <div className="pv-activity">
            {block.items.map((a, i) => (
              <div className="pv-act" key={i}>
                <span className="who">{a.who.slice(0, 1)}</span>
                <span>
                  <b style={{ color: 'var(--ink)', fontWeight: 500 }}>{a.who}</b> {a.what}
                </span>
                <span className="when">{a.when}</span>
              </div>
            ))}
          </div>
        </div>
      )
    case 'profile':
      return (
        <div className="pv-card">
          <div className="pv-profile">
            <div className="big">{block.name.slice(0, 1)}</div>
            <div>
              <div className="name">{block.name}</div>
              <div className="role">{block.role}</div>
            </div>
            <div style={{ marginLeft: 'auto' }} className="pv-actions">
              <button type="button" className="pv-btn" onClick={() => ctl.say(`Message composer opened for ${block.name}`)}>
                Message
              </button>
              <button type="button" className="pv-btn primary" onClick={() => ctl.say(`Editing ${block.name}`)}>
                Edit
              </button>
            </div>
          </div>
          <div className="pv-pstat">
            {block.stats.map((s) => (
              <div key={s.label}>
                <span>{s.label}</span>
                <b>{s.value}</b>
              </div>
            ))}
          </div>
        </div>
      )
    case 'map':
      return (
        <div className="pv-card">
          <div className="pv-card-head">
            <span className="pv-card-title">{block.title}</span>
            <span className="pv-badge">{block.pins.length} locations</span>
          </div>
          <div className="pv-map">
            {block.pins.map((p, i) => (
              <span className={`pv-pin ${p.tone}`} key={i} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                <i />
                {i < 4 && <em>{p.label.slice(0, 14)}</em>}
              </span>
            ))}
          </div>
          <div className="pv-legend" style={{ flexDirection: 'row', gap: 14, marginTop: 9, fontSize: 9.5 }}>
            <span>
              <i className="dot" style={{ background: 'var(--success)' }} />
              {block.legend[0]}
            </span>
            <span>
              <i className="dot" style={{ background: 'var(--warning)' }} />
              {block.legend[1]}
            </span>
            <span>
              <i className="dot" style={{ background: 'var(--primary)' }} />
              {block.legend[2]}
            </span>
          </div>
        </div>
      )
    case 'steps':
      return (
        <div className="pv-card">
          <div className="pv-card-head">
            <span className="pv-card-title">{block.title}</span>
            <span className="pv-badge brand">
              {block.steps.filter((s) => s.state === 'done').length}/{block.steps.length}
            </span>
          </div>
          <div className="pv-steps">
            {block.steps.map((s, i) => (
              <div className={`pv-step ${s.state}`} key={i}>
                <span className="mark">{s.state === 'done' ? '✓' : i + 1}</span>
                <div>
                  <div className="t">{s.title}</div>
                  <div className="d">{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    case 'split':
      return (
        <div className="pv-split">
          <div className="pv-card">
            <div className="pv-card-head">
              <span className="pv-card-title">{block.leftTitle}</span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', lineHeight: 1.6 }}>{block.leftBody}</p>
          </div>
          <div className="pv-card">
            <div className="pv-card-head">
              <span className="pv-card-title">{block.rightTitle}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 15, fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.7 }}>
              {block.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        </div>
      )
    case 'callout':
      return (
        <div className={`pv-callout ${block.tone}`}>
          <span className="ic">
            <Icon name={block.tone === 'warn' ? 'AlertTriangle' : block.tone === 'good' ? 'Check' : 'Sparkles'} size={14} />
          </span>
          <div>
            <b>{block.title}</b>
            <p>{block.body}</p>
          </div>
        </div>
      )
    case 'empty':
      return (
        <div className="pv-card" style={{ textAlign: 'center', padding: 28 }}>
          <b>{block.title}</b>
          <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', margin: '6px 0 12px' }}>{block.body}</p>
          <button type="button" className="pv-btn primary" onClick={() => ctl.say(`${block.action} · draft started`)}>
            {block.action}
          </button>
        </div>
      )
    default:
      return null
  }
}

function NavIcon({ index }: { index: number }) {
  const names = ['LayoutDashboard', 'FolderKanban', 'Users', 'CalendarCheck', 'TrendingUp', 'Settings', 'FileText', 'Package']
  return <Icon name={names[index % names.length]} size={14} />
}

export function AppPreview({
  project,
  screen,
  theme = 'light',
  device = 'desktop',
  onNavigate,
}: {
  project: Project
  screen: Screen
  theme?: 'light' | 'dark'
  device?: 'desktop' | 'mobile'
  onNavigate?: (screenId: string) => void
}) {
  const design = project.design
  const shell = design.layout.shell
  const nav = design.layout.nav.length ? design.layout.nav : project.sections.map((s) => s.name).slice(0, 5)
  const mobile = device === 'mobile'
  const activeSection = project.sections.find((s) => s.screens.some((x) => x.id === screen.id))

  const [query, setQuery] = useState('')
  const [chip, setChip] = useState('all')
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [tab, setTab] = useState(0)
  const [extraRows, setExtraRows] = useState<Record<string, SampleRow[]>>({})
  const [addedCards, setAddedCards] = useState<{ title: string; meta: string; tag: string }[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [navLabel, setNavLabel] = useState(activeSection?.name ?? nav[0] ?? '')
  const [drawer, setDrawer] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)

  const entityForScreen = useMemo(() => {
    const id = screen.entityIds[0] ?? activeSection?.entityIds[0]
    return project.data.entities.find((e) => e.id === id)
  }, [project.data.entities, screen.entityIds, activeSection])

  const ctl: ProtoCtl = {
    query,
    setQuery: (value) => {
      setQuery(value)
      setChip('all')
    },
    chip,
    setChip,
    sort,
    toggleSort: (key) => setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 })),
    values,
    setValue: (key, value) => {
      setValues((prev) => ({ ...prev, [key]: value }))
      setErrors((prev) => {
        if (!prev[key]) return prev
        const next = { ...prev }
        delete next[key]
        return next
      })
    },
    errors,
    submit: (entity, fieldNames) => {
      const filled: Record<string, string> = {}
      if (entity) {
        const visible = fieldNames ? entity.fields.filter((f) => fieldNames.includes(f.name)) : entity.fields
        for (const field of visible) {
          if (field.required && !String(values[field.name] ?? '').trim()) filled[field.name] = `${humanize(field.name)} is required.`
        }
      }
      setErrors(filled)
      if (Object.keys(filled).length > 0) {
        setToast('Fix the highlighted fields')
        return
      }
      if (entity) {
        const row: SampleRow = { id: `${entity.id}-new-${Date.now()}`, ...values }
        for (const field of entity.fields) if (row[field.name] === undefined) row[field.name] = String(field.example ?? '')
        setExtraRows((prev) => ({ ...prev, [entity.id]: [row, ...(prev[entity.id] ?? [])] }))
      }
      setSubmitted(true)
      setToast(entity ? `${entity.name} saved` : 'Saved')
    },
    reset: () => {
      setValues({})
      setErrors({})
      setSubmitted(false)
    },
    submitted,
    tab,
    setTab,
    extraRows,
    addRow: (entityId, row) => setExtraRows((prev) => ({ ...prev, [entityId]: [row, ...(prev[entityId] ?? [])] })),
    addedCards,
    addCard: () => {
      setAddedCards((prev) => [{ title: `New item ${prev.length + 1}`, meta: 'Added in this session', tag: 'draft' }, ...prev])
      setToast('Card added')
    },
    toast,
    say: (message) => setToast(message),
    nav: navLabel,
    navigate: (label) => {
      setNavLabel(label)
      const section = project.sections.find((s) => s.name === label)
      const target = section?.screens[0]
      if (target && onNavigate) onNavigate(target.id)
      setMobileNav(false)
      setToast(target ? `${label} · ${target.route}` : `${label} · coming in a later milestone`)
    },
    openDrawer: () => setDrawer(true),
    drawer,
    closeDrawer: () => setDrawer(false),
    mobileNav,
    toggleMobileNav: () => setMobileNav((prev) => !prev),
  }

  const navItems = shell === 'rail' ? nav.slice(0, 7) : nav.slice(0, 6)

  return (
    <div className={`pv${mobile ? ' mobile' : ''}${mobileNav ? ' navopen' : ''}`} data-density={design.layout.density} data-prototype="interactive" style={tokenVars(design, theme)}>
      {shell !== 'topbar' && !mobile && (
        <aside className={`pv-side${shell === 'rail' ? ' rail' : ''}`}>
          <div className="pv-brand">
            <span className="pv-logo">{project.name.slice(0, 1).toUpperCase()}</span>
            {shell !== 'rail' && <span>{project.name}</span>}
          </div>
          {shell !== 'rail' && <div className="pv-navlabel">Workspace</div>}
          {navItems.map((item, i) => (
            <button
              key={item}
              type="button"
              onClick={() => ctl.navigate(item)}
              aria-current={navLabel === item ? 'page' : undefined}
              className={`pv-nav${navLabel === item ? ' active' : ''}`}
              title={item}
            >
              <NavIcon index={i} />
              {shell !== 'rail' && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item}</span>}
              {shell !== 'rail' && i === 1 && <span className="badge">{3 + (extraRows[entityForScreen?.id ?? '']?.length ?? 0)}</span>}
            </button>
          ))}
          {shell !== 'rail' && <div className="pv-navlabel">Account</div>}
          <button type="button" className="pv-nav" onClick={() => ctl.say('Settings · workspace preferences')} title="Settings">
            <Icon name="Settings" size={14} />
            {shell !== 'rail' && <span>Settings</span>}
          </button>
          <div className="pv-sidefoot">
            <span className="pv-avatar">OM</span>
            {shell !== 'rail' && <span>Ops Manager</span>}
          </div>
        </aside>
      )}
      {mobile && mobileNav && (
        <div className="pv-drawer" role="dialog" aria-label="Navigation">
          {navItems.map((item, i) => (
            <button key={item} type="button" className={`pv-nav${navLabel === item ? ' active' : ''}`} onClick={() => ctl.navigate(item)}>
              <NavIcon index={i} />
              <span>{item}</span>
            </button>
          ))}
        </div>
      )}
      <div className="pv-main">
        <header className="pv-topbar">
          {mobile && (
            <button type="button" className="pv-iconbtn" aria-label="Menu" onClick={ctl.toggleMobileNav}>
              <Icon name={mobileNav ? 'X' : 'Menu'} size={15} />
            </button>
          )}
          <span className="pv-badge brand">{project.brief.category}</span>
          <label className="pv-search">
            <Icon name="Search" size={11} />
            <input
              type="search"
              value={query}
              onChange={(event) => ctl.setQuery(event.target.value)}
              placeholder="Search or jump to…"
              aria-label="Search this screen"
            />
          </label>
          <span className="spacer" />
          <button type="button" className="pv-iconbtn" aria-label="Jump to schedule" onClick={() => ctl.say('Jump to schedule (⌘K)')}>
            <Icon name="CalendarCheck" size={12} />
          </button>
          <button type="button" className="pv-iconbtn" aria-label="Invite someone" onClick={() => ctl.say('Invite dialog opened')}>
            <Icon name="Users" size={12} />
          </button>
          <button type="button" className="pv-avatar" aria-label="Account" onClick={() => ctl.say('Account menu')}>
            OM
          </button>
        </header>
        <div className="pv-body">
          {screen.blocks.map((block, i) => (
            <div key={i} data-component={blockComponent(block.type).name} data-block={block.type}>
              <BlockView block={block} project={project} ctl={ctl} />
            </div>
          ))}
          <div className="pv-pagefoot">
            <span>{project.name} · {screen.name}</span>
            <span>{screen.route}</span>
          </div>
        </div>
      </div>
      {drawer && entityForScreen && (
        <div className="pv-overlay" role="dialog" aria-modal="true" aria-label={`New ${entityForScreen.name}`}>
          <div className="pv-sheet">
            <div className="pv-card-head">
              <span className="pv-card-title">New {entityForScreen.name.toLowerCase()}</span>
              <button type="button" className="pv-iconbtn" aria-label="Close" onClick={ctl.closeDrawer}>
                <Icon name="X" size={13} />
              </button>
            </div>
            {submitted ? (
              <div className="pv-success" role="status">
                <b>Created</b>
                <p>{entityForScreen.name} added to this session. It appears in the list immediately.</p>
                <button type="button" className="pv-btn" onClick={ctl.reset}>
                  Create another
                </button>
              </div>
            ) : (
              <form
                className="pv-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  ctl.submit(entityForScreen, entityForScreen.fields.slice(0, 6).map((f) => f.name))
                }}
              >
                {entityForScreen.fields.slice(0, 6).map((field) => (
                  <div className={`pv-field${field.type === 'longtext' ? ' wide' : ''}`} key={field.name}>
                    <label htmlFor={`drawer-${field.name}`}>
                      {humanize(field.name)}
                      {field.required ? ' *' : ''}
                    </label>
                    <input
                      id={`drawer-${field.name}`}
                      value={values[field.name] ?? ''}
                      onChange={(event) => ctl.setValue(field.name, event.target.value)}
                      placeholder={String(field.example ?? '')}
                      aria-invalid={errors[field.name] ? true : undefined}
                    />
                    {errors[field.name] && (
                      <span className="pv-error" role="alert">
                        {errors[field.name]}
                      </span>
                    )}
                  </div>
                ))}
                <div className="pv-formfoot">
                  <button type="submit" className="pv-btn primary">
                    Create {entityForScreen.name.toLowerCase()}
                  </button>
                  <button type="button" className="pv-btn" onClick={ctl.closeDrawer}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {toast && (
        <div className="pv-toast" role="status">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss">
            <Icon name="X" size={11} />
          </button>
        </div>
      )}
    </div>
  )
}

/** Lightweight wireframe used in galleries — cheaper than mounting the full preview. */
export function ScreenThumb({ project, screen }: { project: Project; screen: Screen }) {
  const design = project.design
  const tone = (i: number) => {
    const c = design.colors[i % design.colors.length]
    return c.base
  }
  return (
    <div className="thumb" style={tokenVars(design, 'light')}>
      <div className="thumb-side">
        <span className="thumb-dot" style={{ background: design.colors[0].base }} />
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`thumb-line${i === 0 ? ' on' : ''}`} />
        ))}
      </div>
      <div className="thumb-main">
        <div className="thumb-top">
          <span style={{ width: '34%' }} />
          <span style={{ width: '16%', marginLeft: 'auto' }} />
        </div>
        {screen.blocks.slice(0, 5).map((b, i) => {
          if (b.type === 'stats')
            return (
              <div className="thumb-stats" key={i}>
                {b.items.slice(0, 4).map((_, j) => (
                  <span key={j} style={{ borderColor: j === 0 ? tone(0) : undefined }} />
                ))}
              </div>
            )
          if (b.type === 'chart')
            return (
              <div className="thumb-chart" key={i}>
                {[38, 62, 44, 78, 56, 88].map((h, j) => (
                  <i key={j} style={{ height: `${h}%`, background: j % 3 === 2 ? tone(1) : tone(0) }} />
                ))}
              </div>
            )
          if (b.type === 'table' || b.type === 'list')
            return (
              <div className="thumb-rows" key={i}>
                {[0, 1, 2].map((j) => (
                  <span key={j}>
                    <i style={{ width: `${48 - j * 8}%` }} />
                    <b style={{ background: tone(j + 1) }} />
                  </span>
                ))}
              </div>
            )
          if (b.type === 'board')
            return (
              <div className="thumb-board" key={i}>
                {[0, 1, 2, 3].map((j) => (
                  <span key={j}>
                    <i style={{ background: tone(j) }} />
                    <i />
                    <i />
                  </span>
                ))}
              </div>
            )
          if (b.type === 'calendar')
            return (
              <div className="thumb-cal" key={i}>
                {Array.from({ length: 21 }, (_, j) => (
                  <i key={j} style={{ background: j % 6 === 2 ? tone(0) : undefined }} />
                ))}
              </div>
            )
          if (b.type === 'map')
            return (
              <div className="thumb-map" key={i}>
                {[0, 1, 2, 3, 4].map((j) => (
                  <i key={j} style={{ left: `${14 + j * 17}%`, top: `${28 + ((j * 23) % 44)}%`, background: tone(j) }} />
                ))}
              </div>
            )
          return <div className="thumb-block" key={i} />
        })}
      </div>
    </div>
  )
}
