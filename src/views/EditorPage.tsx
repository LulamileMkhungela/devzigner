import { useMemo, useState } from 'react'
import type { Project } from '../types'
import { compileProject } from '../engine'
import { useStore } from '../lib/store'
import { SubHeader, useFileDownload } from '../components/ui'
import { Icon } from '../components/Icons'
import { AppPreview } from '../components/AppPreview'
import { Link } from '../lib/router'

/**
 * The inline design editor. It edits the tokens, not the pixels: every change
 * rebuilds the ramps and the semantic layer, then the preview, the screens, the
 * audit and the export all follow from the same compile.
 */
export function EditorPage({ project }: { project: Project }) {
  const { overrides, setOverride, clearOverrides, commit, notify } = useStore()
  const download = useFileDownload()
  const screens = project.sections.flatMap((s) => s.screens)
  const [activeId, setActiveId] = useState(screens[0]?.id ?? '')
  const active = screens.find((s) => s.id === activeId) ?? screens[0]

  const baseline = useMemo(
    () =>
      compileProject({
        idea: project.idea,
        seed: project.seed,
        archetypeId: project.archetypeId,
        genome: project.genome,
        currency: project.currency,
        moduleSeeds: project.moduleSeeds,
        nameOverride: project.name,
        overrides: {},
      }),
    [project.idea, project.seed, project.archetypeId, project.genome, project.currency, project.moduleSeeds, project.name],
  )

  const base = baseline.design
  const cur = project.design
  const basePrimary = base.colors.find((c) => c.role === 'primary') ?? base.colors[0]
  const baseAccent = base.colors.find((c) => c.role === 'accent') ?? base.colors[1]
  const curPrimary = cur.colors.find((c) => c.role === 'primary') ?? cur.colors[0]
  const curAccent = cur.colors.find((c) => c.role === 'accent') ?? cur.colors[1]

  const hue = overrides.primaryHue ?? basePrimary.hue
  const accentHue = overrides.accentHue ?? baseAccent.hue
  const radius = overrides.radius ?? base.radii.md
  const spacing = overrides.spacing ?? 1
  const shell = overrides.shell ?? base.layout.shell
  const cardStyle = overrides.cardStyle ?? base.layout.cardStyle
  const edited = Object.keys(overrides).length > 0

  const setHue = (value: number) => setOverride('primaryHue', value === basePrimary.hue ? undefined : value)
  const setAccent = (value: number) => setOverride('accentHue', value === baseAccent.hue ? undefined : value)
  const setRadius = (value: number) => setOverride('radius', value === base.radii.md ? undefined : value)
  const setSpacing = (value: number) => setOverride('spacing', value === 1 ? undefined : value)
  const setShell = (value: string) => setOverride('shell', value === base.layout.shell ? undefined : (value as typeof shell))
  const setCardStyle = (value: string) => setOverride('cardStyle', value === base.layout.cardStyle ? undefined : (value as typeof cardStyle))

  if (!active) {
    return (
      <div className="lz-view">
        <SubHeader backTo="system" backLabel="System" title="Design tokens" />
        <div className="lz-empty"><h3>No screens to preview</h3><p>Compile a section first.</p></div>
      </div>
    )
  }

  return (
    <div className="lz-view">
      <SubHeader
        backTo="prototype"
        backLabel="Prototype"
        eyebrow="Inline design editor"
        title="Design tokens"
        actions={
          <>
            <span className={`lz-pill ${edited ? 'peach' : ''}`}>{edited ? `${Object.keys(overrides).length} token edits` : 'compiled tokens'}</span>
            <button className="lz-btn small" onClick={() => { clearOverrides(); notify('Back to compiled tokens') }} disabled={!edited}>
              <Icon name="RotateCcw" size={13} /> Revert
            </button>
            <button
              className="lz-btn small primary"
              onClick={() => {
                commit(`Token edit · hue ${hue}° · radius ${radius}px`)
                notify('Snapshot committed')
              }}
            >
              <Icon name="GitBranch" size={13} /> Commit
            </button>
          </>
        }
      />

      <div className="lz-split" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 330px)' }}>
        <div className="lz-col">
          <div className="lz-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="lz-stage-bar">
              <div className="lz-crumb">
                <Icon name="LayoutDashboard" size={14} />
                <span>{active.name}</span>
                <Icon name="ChevronRight" size={12} />
                <b>{active.route}</b>
              </div>
              <span className="lz-spacer" />
              <select
                className="lz-input"
                style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
                value={active.id}
                onChange={(e) => setActiveId(e.target.value)}
              >
                {screens.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ background: 'var(--card-soft)', padding: 14, maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
              <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
                <AppPreview project={project} screen={active} theme="light" />
              </div>
            </div>
          </div>
          <p className="lz-hint">
            Edits re-run the whole design compiler: ramps, contrast checks, semantic aliases, tokens.css, Tailwind theme, the screens and the audit.
          </p>
        </div>

        <div className="lz-col">
          <div className="lz-card">
            <div className="lz-card-h" style={{ marginBottom: 12 }}>
              <div className="lz-card-hL"><Icon name="Sliders" size={15} /><h2>Tokens</h2></div>
            </div>

            <Control label="Primary hue" value={`${hue}°`} overridden={overrides.primaryHue !== undefined} hint={`compiled ${basePrimary.hue}°`}>
              <div className="lz-row" style={{ gap: 8 }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: curPrimary.base, border: '1px solid var(--line)' }} />
                <input type="range" min={0} max={359} value={hue} onChange={(e) => setHue(Number(e.target.value))}
                  aria-label="Primary hue" style={{ flex: 1, accentColor: 'var(--accent)' }} />
              </div>
            </Control>

            <Control label="Accent hue" value={`${accentHue}°`} overridden={overrides.accentHue !== undefined} hint={`compiled ${baseAccent.hue}°`}>
              <div className="lz-row" style={{ gap: 8 }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: curAccent.base, border: '1px solid var(--line)' }} />
                <input type="range" min={0} max={359} value={accentHue} onChange={(e) => setAccent(Number(e.target.value))}
                  aria-label="Accent hue" style={{ flex: 1, accentColor: 'var(--accent)' }} />
              </div>
            </Control>

            <Control label="Radius" value={`${radius}px`} overridden={overrides.radius !== undefined} hint={`compiled ${base.radii.md}px`}>
              <input type="range" min={0} max={20} value={radius} onChange={(e) => setRadius(Number(e.target.value))}
                aria-label="Base radius" style={{ width: '100%', accentColor: 'var(--accent)' }} />
              <div className="lz-row" style={{ gap: 6, marginTop: 8 }}>
                {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((k) => (
                  <span key={k} style={{ flex: 1, height: 22, background: 'var(--card-soft)', border: '1px solid var(--line)', borderRadius: cur.radii[k] }} title={`${k} ${cur.radii[k]}px`} />
                ))}
              </div>
            </Control>

            <Control label="Spacing" value={`×${spacing.toFixed(2)}`} overridden={overrides.spacing !== undefined} hint="compiled ×1.00">
              <input type="range" min={0.8} max={1.25} step={0.05} value={spacing} onChange={(e) => setSpacing(Number(e.target.value))}
                aria-label="Spacing scale" style={{ width: '100%', accentColor: 'var(--accent)' }} />
            </Control>

            <label className="lz-field">
              <span>Shell</span>
              <select className="lz-input" value={shell} onChange={(e) => setShell(e.target.value)}>
                {['sidebar', 'rail', 'topbar', 'split'].map((v) => <option key={v} value={v}>{v}{v === base.layout.shell ? ' (compiled)' : ''}</option>)}
              </select>
            </label>

            <label className="lz-field" style={{ marginBottom: 0 }}>
              <span>Card style</span>
              <select className="lz-input" value={cardStyle} onChange={(e) => setCardStyle(e.target.value)}>
                {['flat', 'outlined', 'elevated', 'glass'].map((v) => <option key={v} value={v}>{v}{v === base.layout.cardStyle ? ' (compiled)' : ''}</option>)}
              </select>
            </label>
          </div>

          <div className="lz-card">
            <div className="lz-card-h" style={{ marginBottom: 10 }}>
              <div className="lz-card-hL"><Icon name="Gauge" size={15} /><h2>What changed</h2></div>
              <span className={`lz-pill ${project.audit.score >= baseline.audit.score ? 'green' : 'amber'}`}>audit {project.audit.score}</span>
            </div>
            <dl className="lz-kv">
              <Diff label="Primary" was={basePrimary.base} now={curPrimary.base} />
              <Diff label="Accent" was={baseAccent.base} now={curAccent.base} />
              <Diff label="Radius md" was={`${base.radii.md}px`} now={`${cur.radii.md}px`} />
              <Diff label="Space md" was={`${base.spacing[4].px}px`} now={`${cur.spacing[4].px}px`} />
              <Diff label="Shell" was={base.layout.shell} now={cur.layout.shell} />
              <Diff label="Cards" was={base.layout.cardStyle} now={cur.layout.cardStyle} />
            </dl>
            <div className="lz-row" style={{ marginTop: 12 }}>
              <button className="lz-btn small" onClick={() => download('tokens.css', cur.tokensCss, 'text/css')}>
                <Icon name="FileCode" size={13} /> tokens.css
              </button>
              <Link to="prototype" className="lz-btn small quiet">
                <Icon name="Play" size={13} /> Prototype
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Control({
  label,
  value,
  hint,
  overridden,
  children,
}: {
  label: string
  value: string
  hint?: string
  overridden?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="lz-field">
      <div className="lz-between" style={{ gap: 8 }}>
        <span>
          {label} {overridden && <span className="lz-pill peach" style={{ marginLeft: 4 }}>edited</span>}
        </span>
        <code style={{ font: '500 11.5px/1 var(--mono)', color: 'var(--muted)' }}>{value}</code>
      </div>
      {children}
      {hint && <span className="lz-hint" style={{ marginTop: 0 }}>{hint}</span>}
    </div>
  )
}

function Diff({ label, was, now }: { label: string; was: string; now: string }) {
  const changed = was !== now
  return (
    <div className="lz-kv-row">
      <dt>{label}</dt>
      <dd>
        {changed ? (
          <>
            <span style={{ color: 'var(--faint)', textDecoration: 'line-through' }}>{was}</span>{' '}
            <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{now}</span>
          </>
        ) : (
          <span style={{ color: 'var(--faint)' }}>{now}</span>
        )}
      </dd>
    </div>
  )
}
