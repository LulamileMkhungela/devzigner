import type { CSSProperties } from 'react'
import type { Block, DesignSystem, Entity, Project, Screen } from '../types'
import { formatField, humanize } from '../lib/format'
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

function TableBlock({ block, project }: { block: Extract<Block, { type: 'table' }>; project: Project }) {
  const entity = entityOf(project, block.entityId)
  if (!entity) return null
  const rows = block.rows
    .map((id) => entity.rows.find((r) => String(r.id) === id))
    .filter(Boolean) as Record<string, string | number | boolean>[]
  return (
    <div className="pv-card">
      <div className="pv-card-head">
        <span className="pv-card-title">{block.caption}</span>
        <span className="mono" style={{ fontSize: 9, color: 'var(--ink-faint)' }}>
          {rows.length} rows
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="pv-table">
          <thead>
            <tr>
              {block.columns.map((c) => (
                <th key={c}>{humanize(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)}>
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
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BlockView({ block, project }: { block: Block; project: Project }) {
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
              <button key={a} className={`pv-btn${i === 0 ? ' primary' : ''}`} tabIndex={-1}>
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
            <span key={c} className={`pv-chip${i === 0 ? ' active' : ''}`}>
              {c}
            </span>
          ))}
          <span className="pv-searchbox">
            <Icon name="Search" size={10} /> {block.search}
          </span>
        </div>
      )
    case 'table':
      return <TableBlock block={block} project={project} />
    case 'list': {
      const entity = entityOf(project, block.entityId)
      if (!entity) return null
      const rows = block.rows
        .map((id) => entity.rows.find((r) => String(r.id) === id))
        .filter(Boolean) as Record<string, string | number | boolean>[]
      return (
        <div className="pv-card">
          <div className="pv-card-head">
            <span className="pv-card-title">{block.title}</span>
            <span className="pv-badge brand">{rows.length} waiting</span>
          </div>
          {rows.map((row) => {
            const metaField = entity.fields.find((f) => f.name === block.metaField)
            return (
              <div className="pv-listrow" key={String(row.id)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t">{String(row[entity.primaryField] ?? '')}</div>
                  <div className="m">{formatField(entity.fields.find((f) => f.name === entity.secondaryField), row[entity.secondaryField], project.currency)}</div>
                </div>
                {metaField?.type === 'status' ? statusBadge(String(row[metaField.name])) : <span className="pv-badge">{String(row[block.metaField] ?? '')}</span>}
              </div>
            )
          })}
        </div>
      )
    }
    case 'detail': {
      const entity = entityOf(project, block.entityId)
      if (!entity) return null
      const row = entity.rows.find((r) => String(r.id) === block.recordId)
      return (
        <div className="pv-card">
          <div className="pv-tabs">
            {block.tabs.map((t, i) => (
              <span key={t} className={`pv-tab${i === 0 ? ' active' : ''}`}>
                {t}
              </span>
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
      return (
        <div className="pv-card">
          <div className="pv-card-head">
            <span className="pv-card-title">{block.title}</span>
            <span className="pv-badge">Required marked</span>
          </div>
          <div className="pv-form">
            {block.fields.map((f) => {
              const field = entity?.fields.find((x) => x.name === f)
              const wide = field?.type === 'longtext'
              return (
                <div className="pv-field" key={f}>
                  <label>
                    {humanize(f)}
                    {field?.required ? ' *' : ''}
                  </label>
                  <div className={`inputfake${wide ? ' textarea' : ''}`}>
                    {field?.type === 'status' ? field.options?.[0] : field?.example ? String(field.example).slice(0, 44) : ''}
                  </div>
                </div>
              )
            })}
            <div style={{ display: 'flex', gap: 7, marginTop: 2 }}>
              <button className="pv-btn primary" tabIndex={-1}>
                {block.submit}
              </button>
              <button className="pv-btn" tabIndex={-1}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )
    }
    case 'board':
      return (
        <div className="pv-card">
          <div className="pv-card-head">
            <span className="pv-card-title">{block.title}</span>
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-faint)' }}>
              drag to move
            </span>
          </div>
          <div className="pv-board">
            {block.columns.map((col) => (
              <div className="pv-col" key={col.name}>
                <div className="pv-colhead">
                  {col.name}
                  <span className="n">{col.cards.length}</span>
                </div>
                {col.cards.map((card, i) => (
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
              <button className="pv-btn" tabIndex={-1}>
                Message
              </button>
              <button className="pv-btn primary" tabIndex={-1}>
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
          <button className="pv-btn primary" tabIndex={-1}>
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
}: {
  project: Project
  screen: Screen
  theme?: 'light' | 'dark'
  device?: 'desktop' | 'mobile'
}) {
  const design = project.design
  const shell = design.layout.shell
  const nav = design.layout.nav.length ? design.layout.nav : project.sections.map((s) => s.name).slice(0, 5)
  const mobile = device === 'mobile'

  return (
    <div className={`pv${mobile ? ' mobile' : ''}`} data-density={design.layout.density} style={tokenVars(design, theme)}>
      {shell !== 'topbar' && !mobile && (
        <aside className={`pv-side${shell === 'rail' ? ' rail' : ''}`}>
          <div className="pv-brand">
            <span className="pv-logo">{project.name.slice(0, 1).toUpperCase()}</span>
            {shell !== 'rail' && <span>{project.name}</span>}
          </div>
          {shell !== 'rail' && <div className="pv-navlabel">Workspace</div>}
          {nav.slice(0, 6).map((item, i) => (
            <span key={item} className={`pv-nav${i === 0 ? ' active' : ''}`} title={item}>
              <NavIcon index={i} />
              {shell !== 'rail' && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item}</span>}
              {shell !== 'rail' && i === 1 && <span className="badge">3</span>}
            </span>
          ))}
          {shell !== 'rail' && <div className="pv-navlabel">Account</div>}
          <span className="pv-nav" title="Settings">
            <Icon name="Settings" size={14} />
            {shell !== 'rail' && <span>Settings</span>}
          </span>
          <div className="pv-sidefoot">
            <span className="pv-avatar">OM</span>
            {shell !== 'rail' && <span>Ops Manager</span>}
          </div>
        </aside>
      )}
      <div className="pv-main">
        <header className="pv-topbar">
          {mobile && <Icon name="List" size={15} />}
          <span className="pv-badge brand">{project.brief.category}</span>
          <div className="pv-search">
            <Icon name="Search" size={11} /> Search or jump to…
          </div>
          <span className="spacer" />
          <span className="pv-iconbtn">
            <Icon name="CalendarCheck" size={12} />
          </span>
          <span className="pv-iconbtn">
            <Icon name="Users" size={12} />
          </span>
          <span className="pv-avatar">OM</span>
        </header>
        <div className="pv-body">
          {screen.blocks.map((block, i) => (
            <BlockView key={i} block={block} project={project} />
          ))}
          <div className="pv-pagefoot">
            <span>{project.name} · {screen.name}</span>
            <span>{screen.route}</span>
          </div>
        </div>
      </div>
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
