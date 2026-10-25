import type { Project } from '../types'
import { StepGuide } from '../components/StepGuide'
import { StageConfirm } from '../components/StageConfirm'
import { useStore } from '../lib/store'
import { Collapsible, NextPhase, PhaseHeader, useFileDownload } from '../components/ui'
import { Icon } from '../components/Icons'
import { Link } from '../lib/router'
import { tokenVars } from '../components/AppPreview'

export function DesignPage({ project }: { project: Project }) {
  const { confirmed } = useStore()
  const design = project.design
  const download = useFileDownload()
  const primary = design.colors.find((c) => c.role === 'primary') ?? design.colors[0]
  const accent = design.colors.find((c) => c.role === 'accent') ?? design.colors[1]
  const neutral = design.colors.find((c) => c.role === 'neutral') ?? design.colors[2]
  const display = design.typography.find((t) => t.role === 'display') ?? design.typography[0]
  const body = design.typography.find((t) => t.role === 'body') ?? design.typography[1]
  const mono = design.typography.find((t) => t.role === 'mono') ?? design.typography[2]

  return (
    <div className="lz-view">
      <PhaseHeader
        project={project}
        current="design"
        title="Design"
        subtitle={`${design.name} — ${design.mood.join(', ')}. Tokens are computed for contrast, then the shell is chosen to hold the screens.`}
        actions={
          <>
            <button className="lz-btn small" onClick={() => download('tokens.css', design.tokensCss, 'text/css')}>
              <Icon name="FileCode" size={13} /> tokens.css
            </button>
            <button className="lz-btn small" onClick={() => download('tokens.json', design.tokensJson, 'application/json')}>
              <Icon name="Braces" size={13} /> tokens.json
            </button>
          </>
        }
      />

      <StepGuide phase="design" />

      <div className="lz-stack">
        <div className="lz-rail">
          <section className="lz-rail-step" data-state="complete">
            <span className="lz-rail-line" aria-hidden />
            <span className="lz-rail-n"><Icon name="Check" size={13} strokeWidth={2.6} /></span>
            <div className="lz-rail-label">Design tokens</div>
            <div className="lz-rail-body">
              <div className="lz-stack">
                <div className="lz-card">
                  <div className="lz-card-h" style={{ marginBottom: 12 }}>
                    <div className="lz-card-hL"><h2>Colour</h2></div>
                    <span className="lz-pill">{design.colors.length} roles</span>
                  </div>
                  <div className="lz-swatches">
                    {[primary, accent, neutral].map((c) => (
                      <div className="lz-swatch" key={c.id}>
                        <div className="lz-swatch-chip" style={{ background: c.base }} />
                        <div className="lz-swatch-meta">
                          <b>{c.role}</b>
                          <code>{c.base}</code>
                          <p style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4 }}>{c.contrastText} text · {c.stops.length} stops</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="lz-hint">{primary.rationale}</p>
                </div>

                <div className="lz-card">
                  <div className="lz-card-h" style={{ marginBottom: 12 }}>
                    <div className="lz-card-hL"><h2>Typography</h2></div>
                    <span className="lz-pill">{design.typography.length} roles</span>
                  </div>
                  <div className="lz-cols-3">
                    {[display, body, mono].map((t) => (
                      <div className="lz-spec" key={t.role} style={{ fontFamily: t.stack }}>
                        <small>{t.role}</small>
                        <b style={{ fontSize: t.role === 'display' ? 20 : 15 }}>{t.family}</b>
                        <span>{t.size} · {t.lineHeight} · {t.tracking}</span>
                        <span style={{ marginTop: 6 }}>{t.weights.join(' / ')}</span>
                      </div>
                    ))}
                  </div>
                  <p className="lz-hint">{body.usage}</p>
                </div>

                <Collapsible title="Full palette" icon="Palette" count={design.colors.length}>
                  <div className="lz-stack" style={{ gap: 10 }}>
                    {design.colors.map((c) => (
                      <div key={c.id}>
                        <div className="lz-between" style={{ marginBottom: 6 }}>
                          <b style={{ font: '600 12.5px/1.2 var(--font)', textTransform: 'capitalize' }}>{c.role} · {c.base}</b>
                          <span className="lz-hint" style={{ marginTop: 0 }}>{c.contrastText} on {c.base}</span>
                        </div>
                        <div style={{ display: 'flex', borderRadius: 7, overflow: 'hidden', border: '1px solid var(--line)' }}>
                          {c.stops.map((stop) => (
                            <span key={stop.step} style={{ flex: 1, height: 26, background: stop.hex }} title={`${stop.step} · ${stop.hex}`} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Collapsible>

                <Collapsible title="Type scale, spacing and radii" icon="Ruler">
                  <div className="lz-cols-2">
                    <div>
                      <p className="lz-cmd-label">Type scale</p>
                      <dl className="lz-kv">
                        {design.scale.map((s) => (
                          <div className="lz-kv-row" key={s.name}>
                            <dt>{s.name}</dt>
                            <dd>{s.px}px <span style={{ color: 'var(--faint)' }}>· {s.usage}</span></dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    <div>
                      <p className="lz-cmd-label">Space</p>
                      <dl className="lz-kv">
                        {design.spacing.map((s) => (
                          <div className="lz-kv-row" key={s.name}>
                            <dt>{s.name}</dt>
                            <dd>{s.px}px</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="lz-cmd-label" style={{ marginTop: 12 }}>Radius</p>
                      <div className="lz-row">
                        {Object.entries(design.radii).map(([name, px]) => (
                          <span className="lz-pill mono" key={name}>{name} {px}px</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="lz-sep" />
                  <p className="lz-cmd-label">Elevation</p>
                  <div className="lz-row">
                    {Object.entries(design.shadows).map(([name, value]) => (
                      <span className="lz-pill mono" key={name} title={value}>{name}</span>
                    ))}
                  </div>
                  <div className="lz-sep" />
                  <p className="lz-cmd-label">Motion</p>
                  <dl className="lz-kv">
                    {design.motion.map((m) => (
                      <div className="lz-kv-row" key={m.name}>
                        <dt>{m.name}</dt>
                        <dd>{m.duration} · {m.easing} — {m.usage}</dd>
                      </div>
                    ))}
                  </dl>
                </Collapsible>

                <Collapsible title="Components" icon="Layers" count={design.components.length}>
                  <div className="lz-fieldlist">
                    {design.components.map((c) => <span key={c}>{c}</span>)}
                  </div>
                </Collapsible>
              </div>
            </div>
          </section>

          <section className="lz-rail-step" data-state="complete">
            <span className="lz-rail-line" aria-hidden />
            <span className="lz-rail-n"><Icon name="Check" size={13} strokeWidth={2.6} /></span>
            <div className="lz-rail-label">Shell</div>
            <div className="lz-rail-body">
              <div className="lz-card">
                <div className="lz-split" style={{ gap: 20 }}>
                  <div>
                    <p className="lz-body">{design.layout.contentWidth}px content column inside a {design.layout.shell} shell, {design.layout.density} density, {design.layout.grid}.</p>
                    <p className="lz-card-lead" style={{ margin: '14px 0 8px' }}>Navigation items, in order</p>
                    <ul className="lz-bullets">
                      {design.layout.nav.map((item, i) => (
                        <li key={item}>
                          <b style={{ color: 'var(--ink)' }}>{i + 1}. {item}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ background: 'var(--card-soft)', border: '1px solid var(--line)', borderRadius: 10, padding: 12 }} aria-hidden>
                    <ShellSketch design={design} project={project} />
                  </div>
                </div>
                <div className="lz-sep" />
                <div className="lz-between">
                  <span className="lz-hint" style={{ marginTop: 0 }}>Card style: {design.layout.cardStyle}</span>
                  <Link to="shell/design" className="lz-btn small">
                    <Icon name="Expand" size={13} /> View Shell Design
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>

        <Collapsible title="Global token sheet" icon="FileCode" meta="CSS custom properties">
          <pre className="lz-code">{design.tokensCss}</pre>
        </Collapsible>

        <StageConfirm phase="design" />
        <NextPhase
          to="sections"
          label="Continue to Sections"
          disabled={!confirmed.includes('design')}
          hint={
            confirmed.includes('design')
              ? 'Tokens and shell locked. Next: the build order.'
              : 'Mark Design complete above to unlock Sections.'
          }
        />
      </div>
    </div>
  )
}

function ShellSketch({ design, project }: { design: Project['design']; project: Project }) {
  const v = tokenVars(design, 'light')
  const nav = design.layout.nav.length ? design.layout.nav : project.sections.map((s) => s.name).slice(0, 5)
  return (
    <div style={{ ...v, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg)', height: 190, display: 'flex', fontFamily: 'var(--font-body)' }}>
      <div style={{ width: design.layout.shell === 'rail' ? 42 : 96, background: 'var(--surface)', borderRight: '1px solid var(--border)', padding: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ width: 16, height: 16, borderRadius: 5, background: 'var(--primary)', marginBottom: 4 }} />
        {nav.slice(0, 5).map((item, i) => (
          <div
            key={item}
            style={{
              height: 9,
              borderRadius: 3,
              background: i === 0 ? 'var(--primary)' : 'var(--border)',
              opacity: i === 0 ? 0.85 : 1,
              width: i === 0 ? '100%' : `${70 - i * 6}%`,
            }}
          />
        ))}
      </div>
      <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ height: 11, width: '42%', borderRadius: 3, background: 'var(--ink)', opacity: 0.75 }} />
        <div style={{ height: 26, borderRadius: 4, background: 'var(--surface)', border: '1px solid var(--border)' }} />
        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
          <div style={{ flex: 2, borderRadius: 4, background: 'var(--surface)', border: '1px solid var(--border)' }} />
          <div style={{ flex: 1, borderRadius: 4, background: 'var(--surface)', border: '1px solid var(--border)' }} />
        </div>
        <div style={{ height: 7, width: '55%', borderRadius: 3, background: 'var(--border-strong)' }} />
      </div>
    </div>
  )
}
