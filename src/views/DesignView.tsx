import { useState } from 'react'
import type { Project } from '../types'
import { useStore } from '../lib/store'
import { Icon } from '../components/Icons'
import { CodeBlock, ViewHead } from '../components/ui'
import { download } from '../lib/format'
import { contrastRatio, PAPER } from '../engine/color'
import { AppPreview, tokenVars } from '../components/AppPreview'

export function DesignView({ project }: { project: Project }) {
  const { regenerate } = useStore()
  const [tab, setTab] = useState<'css' | 'tailwind' | 'json'>('css')
  const [canvasTheme, setCanvasTheme] = useState<'light' | 'dark'>('light')
  const d = project.design
  const firstScreen = project.sections[0]?.screens[0]

  const tokenCode =
    tab === 'css' ? d.tokensCss : tab === 'tailwind' ? d.tailwindTheme : d.tokensJson

  return (
    <div>
      <ViewHead
        eyebrow="Module 04 · design system"
        title={d.name}
        lede={d.rationale}
        actions={
          <>
            <button className="btn btn-sm" onClick={() => regenerate(project, 'design')}>
              <Icon name="RefreshCw" size={12} /> Re-roll system
            </button>
            <button className="btn btn-sm" onClick={() => download(`${project.name.toLowerCase().replace(/\s+/g, '-')}-tokens.css`, d.tokensCss, 'text/css')}>
              <Icon name="Download" size={12} /> tokens.css
            </button>
          </>
        }
      />

      <div className="marquee" style={{ marginBottom: 20 }}>
        {d.mood.map((m) => (
          <span key={m} className="tag tag-accent">{m}</span>
        ))}
        <span className="tag">{d.typography[1].family} · {d.typography[0].family}</span>
        <span className="tag">{d.layout.shell} shell</span>
      </div>

      {/* Palette */}
      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <Icon name="Sparkles" size={14} />
          <h3>Palette — every ramp is computed, not chosen</h3>
          <span className="tag" style={{ marginLeft: 'auto' }}>WCAG checked</span>
        </div>
        <div className="panel-body stack" style={{ gap: 18 }}>
          {d.colors.map((c) => (
            <div key={c.id}>
              <div className="row-between" style={{ marginBottom: 8 }}>
                <div className="row" style={{ gap: 10 }}>
                  <span className="swatch" style={{ width: 34, height: 34, borderRadius: 8, background: c.base, flex: 'none' }} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13.5 }}>{c.name}</div>
                    <div className="mono tiny faint">{c.base} · hue {c.hue}° · sat {c.saturation}%</div>
                  </div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <span className="tag">{contrastRatio(c.base, PAPER)}:1 on white</span>
                  <span className="tag">text {c.contrastText}</span>
                </div>
              </div>
              <div className="ramp">
                {c.stops.map((s) => (
                  <span
                    key={s.step}
                    style={{ background: s.hex }}
                    title={`${s.step} · ${s.hex}`}
                  />
                ))}
              </div>
              <div className="row-between" style={{ marginTop: 4 }}>
                <span className="tiny faint mono">50</span>
                <span className="tiny faint" style={{ flex: 1, textAlign: 'center', lineHeight: 1.4 }}>{c.rationale}</span>
                <span className="tiny faint mono">950</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid g2" style={{ gap: 16, alignItems: 'start', marginBottom: 16 }}>
        {/* Typography */}
        <section className="panel">
          <div className="panel-head">
            <Icon name="FileText" size={14} />
            <h3>Type system</h3>
          </div>
          <div className="panel-body">
            {d.typography.map((t) => (
              <div className="type-specimen" key={t.role}>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <span className="field-label" style={{ margin: 0 }}>{t.role} · {t.family}</span>
                  <span className="tiny faint mono">{t.size} / {t.lineHeight}</span>
                </div>
                <div
                  className="specimen-line"
                  style={{
                    fontFamily: t.stack,
                    fontSize: t.role === 'display' ? 32 : t.role === 'mono' ? 15 : 19,
                    letterSpacing: t.tracking,
                    lineHeight: t.lineHeight,
                    fontWeight: t.role === 'display' ? 400 : 500,
                  }}
                >
                  {t.role === 'display' ? 'The quiet part is the design.' : t.role === 'mono' ? 'PAY-4821 · R 12,450.00 · 2026-10-24' : 'Every state has a name, an owner and a time.'}
                </div>
                <p className="tiny faint" style={{ marginTop: 6 }}>{t.usage} · weights {t.weights.join('/')}</p>
              </div>
            ))}
            <div className="divider" />
            <table className="tbl">
              <thead>
                <tr>
                  <th>Scale</th>
                  <th>Size</th>
                  <th>Usage</th>
                </tr>
              </thead>
              <tbody>
                {d.scale.map((s) => (
                  <tr key={s.name}>
                    <td className="mono">{s.name}</td>
                    <td>{s.px}px</td>
                    <td className="faint">{s.usage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="stack" style={{ gap: 16 }}>
          <section className="panel">
            <div className="panel-head">
              <Icon name="LayoutGrid" size={14} />
              <h3>Space, radius, elevation</h3>
            </div>
            <div className="panel-body">
              <div className="field-label">Spacing</div>
              <div className="stack" style={{ gap: 5, marginBottom: 16 }}>
                {d.spacing.map((s) => (
                  <div key={s.name} className="row" style={{ gap: 10 }}>
                    <span className="mono tiny faint" style={{ width: 34 }}>{s.name}</span>
                    <span style={{ width: s.px * 2, height: 7, background: 'var(--app-accent)', opacity: 0.55, borderRadius: 2 }} />
                    <span className="mono tiny faint">{s.px}px</span>
                  </div>
                ))}
              </div>
              <div className="field-label">Radius</div>
              <div className="row" style={{ gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {Object.entries(d.radii).map(([k, v]) => (
                  <div key={k} style={{ textAlign: 'center' }}>
                    <div style={{ width: 44, height: 34, background: 'var(--app-panel-2)', border: '1px solid var(--app-line)', borderRadius: v }} />
                    <div className="tiny faint mono" style={{ marginTop: 4 }}>{k} {v}</div>
                  </div>
                ))}
              </div>
              <div className="field-label">Elevation</div>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(d.shadows).map(([k, v]) => (
                  <div key={k} style={{ textAlign: 'center' }}>
                    <div style={{ width: 52, height: 30, background: 'var(--app-panel)', borderRadius: 8, boxShadow: v }} />
                    <div className="tiny faint mono" style={{ marginTop: 4 }}>{k}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <Icon name="Gauge" size={14} />
              <h3>Motion & layout</h3>
            </div>
            <div className="panel-body">
              <table className="tbl" style={{ marginBottom: 14 }}>
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Duration</th>
                    <th>Easing</th>
                  </tr>
                </thead>
                <tbody>
                  {d.motion.map((m) => (
                    <tr key={m.name}>
                      <td className="mono">{m.name}</td>
                      <td>{m.duration}</td>
                      <td className="faint tiny">{m.easing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="kv">
                <dt>shell</dt>
                <dd>{d.layout.shell}</dd>
                <dt>content</dt>
                <dd>{d.layout.contentWidth}px max</dd>
                <dt>cards</dt>
                <dd>{d.layout.cardStyle}</dd>
                <dt>density</dt>
                <dd>{d.layout.density}</dd>
                <dt>grid</dt>
                <dd>{d.layout.grid}</dd>
              </div>
              <div className="marquee" style={{ marginTop: 12 }}>
                {d.layout.nav.map((n) => (
                  <span key={n} className="tag">{n}</span>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Semantic tokens */}
      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <Icon name="Copy" size={14} />
          <h3>Semantic tokens</h3>
          <span className="tag" style={{ marginLeft: 'auto' }}>{Object.keys(d.semantic).length} variables</span>
        </div>
        <div className="panel-body">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
            {Object.entries(d.semantic).map(([k, v]) => (
              <div key={k} className="row" style={{ gap: 8, border: '1px solid var(--app-line-soft)', borderRadius: 8, padding: 7 }}>
                <span style={{ width: 22, height: 22, borderRadius: 5, background: v, border: '1px solid rgba(255,255,255,0.12)', flex: 'none' }} />
                <div style={{ minWidth: 0 }}>
                  <div className="mono tiny" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{k}</div>
                  <div className="tiny faint mono">{v}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live preview */}
      {firstScreen && (
        <section style={{ marginBottom: 16 }}>
          <div className="row-between" style={{ marginBottom: 8 }}>
            <h3 className="card-title">The system rendered on itself</h3>
            <div className="row" style={{ gap: 6 }}>
              <button className={`chip${canvasTheme === 'light' ? ' active' : ''}`} onClick={() => setCanvasTheme('light')}>Light</button>
              <button className={`chip${canvasTheme === 'dark' ? ' active' : ''}`} onClick={() => setCanvasTheme('dark')}>Dark</button>
            </div>
          </div>
          <div className="canvas-frame" style={{ borderRadius: 12, border: '1px solid var(--app-line)', padding: 14, background: 'var(--app-bg-soft)' }}>
            <div className="canvas-inner" style={{ maxHeight: 560, overflow: 'auto' }}>
              <AppPreview project={project} screen={firstScreen} theme={canvasTheme} />
            </div>
          </div>
          <p className="tiny faint" style={{ marginTop: 8 }}>
            Every colour, radius, font and shadow above is consumed through CSS variables — this preview has no bespoke styling.
          </p>
        </section>
      )}

      {/* Components + code */}
      <div className="grid g2" style={{ gap: 16, alignItems: 'start' }}>
        <section className="panel">
          <div className="panel-head">
            <Icon name="LayoutGrid" size={14} />
            <h3>Component inventory for handoff</h3>
          </div>
          <div className="panel-body">
            <ul className="num-list">
              {d.components.map((c) => (
                <li key={c} style={{ gridTemplateColumns: '24px 1fr', padding: '8px 0' }}>
                  <span style={{ fontSize: 13 }}>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <Icon name="FileText" size={14} />
            <h3>Token output</h3>
            <div className="row" style={{ marginLeft: 'auto', gap: 6 }}>
              {(['css', 'tailwind', 'json'] as const).map((t) => (
                <button key={t} className={`chip${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="panel-body">
            <CodeBlock code={tokenCode} label={tab === 'css' ? 'tokens.css' : tab === 'tailwind' ? 'tailwind-theme.css' : 'tokens.json'} maxHeight={420} />
            <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--app-line)' }}>
              <div style={{ ...tokenVars(d, 'light'), background: 'var(--bg)', padding: 16, color: 'var(--ink)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ background: 'var(--primary)', color: 'var(--on-primary)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600 }}>
                    Primary action
                  </span>
                  <span style={{ border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>
                    Secondary
                  </span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)' }}>
                    tokens in use
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
