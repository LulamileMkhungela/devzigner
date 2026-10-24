import type { Project } from '../types'
import { useStore } from '../lib/store'
import { Icon } from '../components/Icons'
import { ViewHead } from '../components/ui'

export function BriefView({ project }: { project: Project }) {
  const { regenerate } = useStore()
  const b = project.brief

  return (
    <div>
      <ViewHead
        eyebrow="Module 01 · product brief"
        title={b.tagline}
        lede={b.summary}
        actions={
          <>
            <button className="btn btn-sm" onClick={() => regenerate(project, 'brief')}>
              <Icon name="RefreshCw" size={12} /> Re-roll brief
            </button>
            <span className="tag">{b.category}</span>
          </>
        }
      />

      <div className="card" style={{ padding: 24, marginBottom: 18, background: 'linear-gradient(140deg, var(--app-panel-2), var(--app-panel))' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Elevator</div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1.35, letterSpacing: '-0.01em', maxWidth: '68ch' }}>
          {b.elevator}
        </p>
      </div>

      <div className="split-main">
        <div className="stack" style={{ gap: 16 }}>
          <section className="card">
            <div className="row-between" style={{ marginBottom: 14 }}>
              <h3 className="card-title">The problem</h3>
              <span className="tag">{b.problems.length} surfaces</span>
            </div>
            <ol className="num-list">
              {b.problems.map((p) => (
                <li key={p.title}>
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>{p.title}</div>
                    <p className="small muted" style={{ lineHeight: 1.6, marginBottom: 6 }}>{p.detail}</p>
                    <span className="tag tag-warn">cost · {p.cost}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="card">
            <div className="row-between" style={{ marginBottom: 14 }}>
              <h3 className="card-title">Who it is for</h3>
              <span className="tag">illustrative</span>
            </div>
            <div className="grid g2" style={{ gap: 12 }}>
              {b.personas.map((p) => (
                <div key={p.name} style={{ border: '1px solid var(--app-line)', borderRadius: 12, padding: 16, background: 'var(--app-bg-soft)' }}>
                  <div className="row" style={{ gap: 10, marginBottom: 10 }}>
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: 'var(--app-panel-2)',
                        border: '1px solid var(--app-line)',
                        display: 'grid',
                        placeItems: 'center',
                        fontFamily: 'var(--font-display)',
                        fontSize: 16,
                      }}
                    >
                      {p.name.slice(0, 1)}
                    </span>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</div>
                      <div className="tiny faint">{p.role}</div>
                    </div>
                  </div>
                  <p className="tiny faint" style={{ marginBottom: 8, fontStyle: 'italic' }}>{p.segment}</p>
                  <div className="kv" style={{ gridTemplateColumns: '52px 1fr', fontSize: 12, gap: '4px 10px' }}>
                    <dt>goal</dt>
                    <dd>{p.goal}</dd>
                    <dt>pain</dt>
                    <dd>{p.pain}</dd>
                  </div>
                  <p style={{ marginTop: 10, fontFamily: 'var(--font-display)', fontSize: 15, lineHeight: 1.4 }}>
                    “{p.quote}”
                  </p>
                </div>
              ))}
            </div>
            <p className="tiny faint" style={{ marginTop: 12, borderTop: '1px solid var(--app-line-soft)', paddingTop: 10 }}>
              {b.personas[0]?.quoteTruth}
            </p>
          </section>

          <section className="card">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Jobs to be done</h3>
            <ul className="bullets">
              {b.jobs.map((j) => (
                <li key={j}>{j}</li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Why this wins</h3>
            <div className="stack" style={{ gap: 12 }}>
              {b.differentiators.map((d, i) => (
                <div key={d.title} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 10 }}>
                  <span className="mono tiny faint" style={{ paddingTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13.5, marginBottom: 3 }}>{d.title}</div>
                    <p className="small muted" style={{ lineHeight: 1.6 }}>{d.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Risks, named early</h3>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Risk</th>
                  <th>Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {b.risks.map((r) => (
                  <tr key={r.risk}>
                    <td style={{ maxWidth: 240 }}>{r.risk}</td>
                    <td className="muted">{r.mitigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <section className="panel">
            <div className="panel-head">
              <Icon name="Target" size={14} />
              <h3>Success metrics</h3>
            </div>
            <div className="panel-body stack" style={{ gap: 14 }}>
              {b.metrics.map((m) => (
                <div key={m.label}>
                  <div className="row-between">
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{m.label}</span>
                  </div>
                  <div className="mono" style={{ color: 'var(--app-accent)', fontSize: 12, margin: '3px 0' }}>{m.target}</div>
                  <p className="tiny faint" style={{ lineHeight: 1.5 }}>{m.why}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <Icon name="ShieldAlert" size={14} />
              <h3>Product principles</h3>
            </div>
            <div className="panel-body">
              <ul className="bullets" style={{ fontSize: 12.5 }}>
                {b.principles.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <Icon name="Mic" size={14} />
              <h3>Voice</h3>
            </div>
            <div className="panel-body">
              <p className="small" style={{ marginBottom: 10 }}>{b.voice.tone}</p>
              <div className="marquee" style={{ marginBottom: 10 }}>
                {b.voice.say.map((s) => (
                  <span key={s} className="tag tag-good">{s}</span>
                ))}
              </div>
              <div className="marquee">
                {b.voice.avoid.map((s) => (
                  <span key={s} className="tag tag-warn">{s}</span>
                ))}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <Icon name="X" size={14} />
              <h3>Explicit non-goals</h3>
            </div>
            <div className="panel-body">
              <ul className="bullets" style={{ fontSize: 12.5 }}>
                {b.nonGoals.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <Icon name="Zap" size={14} />
              <h3>Integrations in scope</h3>
            </div>
            <div className="panel-body marquee">
              {b.integrations.map((i) => (
                <span key={i} className="tag">{i}</span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
