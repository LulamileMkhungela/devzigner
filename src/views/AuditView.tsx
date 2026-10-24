import type { Project } from '../types'
import { Icon } from '../components/Icons'
import { ViewHead } from '../components/ui'

const GROUP_ICON: Record<string, string> = {
  Accessibility: 'HeartPulse',
  System: 'LayoutGrid',
  Coverage: 'CheckSquare',
  Handoff: 'FileText',
}

export function AuditView({ project }: { project: Project }) {
  const { audit } = project
  const groups = ['Accessibility', 'System', 'Coverage', 'Handoff'] as const
  const tally = {
    pass: audit.checks.filter((c) => c.status === 'pass').length,
    warn: audit.checks.filter((c) => c.status === 'warn').length,
    fail: audit.checks.filter((c) => c.status === 'fail').length,
  }

  return (
    <div>
      <ViewHead
        eyebrow="Verification"
        title="The audit is computed, not claimed"
        lede="These checks run against the artefacts themselves on every compile: contrast ratios are calculated from the hex values, the schema is parsed, and coverage is counted from the generated sections. Change the genome and watch the score move."
      />

      <div className="split-side">
        <div className="stack" style={{ gap: 14 }}>
          <div className="panel panel-pad">
            <div className="score-wrap">
              <div className="score-ring" style={{ '--pct': audit.score } as React.CSSProperties}>
                <span>{audit.score}</span>
              </div>
              <div>
                <div className="field-label">Overall</div>
                <p className="small" style={{ lineHeight: 1.6 }}>{audit.summary}</p>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head">
              <Icon name="CheckSquare" size={14} />
              <h3>Breakdown</h3>
            </div>
            <div className="panel-body stack" style={{ gap: 10 }}>
              {[
                { label: 'Passing', n: tally.pass, tone: 'var(--app-good)' },
                { label: 'Warnings', n: tally.warn, tone: 'var(--app-warn)' },
                { label: 'Failing', n: tally.fail, tone: 'var(--app-danger)' },
              ].map((r) => (
                <div key={r.label}>
                  <div className="row-between tiny">
                    <span className="muted">{r.label}</span>
                    <span className="mono">{r.n}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--app-line)', borderRadius: 3, marginTop: 5 }}>
                    <div
                      style={{
                        width: `${(r.n / audit.checks.length) * 100}%`,
                        height: '100%',
                        background: r.tone,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head">
              <Icon name="RefreshCw" size={14} />
              <h3>How to move the score</h3>
            </div>
            <div className="panel-body small muted" style={{ lineHeight: 1.7 }}>
              <ul className="bullets" style={{ fontSize: 12.5 }}>
                <li>Raise <strong style={{ color: 'var(--app-text)' }}>contrast</strong> in the genome to darken the primary until white text clears 4.5:1.</li>
                <li>Warm or cool the <strong style={{ color: 'var(--app-text)' }}>neutral</strong> to change the canvas without breaking legibility.</li>
                <li>Section coverage is structural — re-roll sections only if you also accept a new spec.</li>
                <li>The schema check requires every entity to compile to a table; there is no fudge factor.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="stack" style={{ gap: 14 }}>
          {groups.map((group) => {
            const checks = audit.checks.filter((c) => c.group === group)
            if (!checks.length) return null
            return (
              <section className="panel" key={group}>
                <div className="panel-head">
                  <Icon name={GROUP_ICON[group]} size={14} />
                  <h3>{group}</h3>
                  <span className="tag" style={{ marginLeft: 'auto' }}>
                    {checks.filter((c) => c.status === 'pass').length}/{checks.length} passing
                  </span>
                </div>
                <div className="panel-body" style={{ padding: 0 }}>
                  {checks.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '22px minmax(0, 1fr) auto',
                        gap: 10,
                        padding: '11px 16px',
                        borderBottom: '1px solid var(--app-line-soft)',
                        alignItems: 'start',
                      }}
                    >
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 5,
                          marginTop: 2,
                          display: 'grid',
                          placeItems: 'center',
                          background:
                            c.status === 'pass'
                              ? 'color-mix(in srgb, var(--app-good) 16%, transparent)'
                              : c.status === 'warn'
                                ? 'color-mix(in srgb, var(--app-warn) 16%, transparent)'
                                : 'color-mix(in srgb, var(--app-danger) 16%, transparent)',
                          color: c.status === 'pass' ? 'var(--app-good)' : c.status === 'warn' ? 'var(--app-warn)' : 'var(--app-danger)',
                        }}
                      >
                        <Icon name={c.status === 'pass' ? 'Check' : c.status === 'warn' ? 'AlertTriangle' : 'X'} size={11} />
                      </span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{c.label}</div>
                        <div className="tiny faint" style={{ lineHeight: 1.55, marginTop: 2 }}>{c.detail}</div>
                      </div>
                      <span className={`tag ${c.status === 'pass' ? 'tag-good' : c.status === 'warn' ? 'tag-warn' : ''}`}>
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
