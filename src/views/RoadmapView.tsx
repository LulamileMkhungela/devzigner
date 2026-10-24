import type { Project } from '../types'
import { useStore } from '../lib/store'
import { Icon } from '../components/Icons'
import { ViewHead } from '../components/ui'
import { navigate } from '../lib/router'

export function RoadmapView({ project }: { project: Project }) {
  const { regenerate } = useStore()
  const { roadmap, sections } = project

  return (
    <div>
      <ViewHead
        eyebrow="Module 02 · sequencing"
        title="The build order that does not collapse"
        lede={roadmap.sequencingNote}
        actions={
          <button className="btn btn-sm" onClick={() => regenerate(project, 'roadmap')}>
            <Icon name="RefreshCw" size={12} /> Re-roll sequencing
          </button>
        }
      />

      <div className="phase-grid" style={{ '--cols': roadmap.phases.length } as React.CSSProperties}>
        {roadmap.phases.map((phase, i) => (
          <div key={phase.id} className="card fade-in" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--app-line-soft)', background: 'var(--app-bg-soft)' }}>
              <div className="row-between">
                <span className="mono tiny faint">{String(i + 1).padStart(2, '0')}</span>
                <span className="tag">{phase.horizon}</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, marginTop: 8 }}>{phase.name}</h3>
              <p className="tiny muted" style={{ marginTop: 4, lineHeight: 1.5 }}>{phase.goal}</p>
            </div>
            <div style={{ padding: 16 }}>
              <div className="field-label">Outcomes</div>
              <ul className="bullets" style={{ fontSize: 12, marginBottom: 14 }}>
                {phase.outcomes.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
              <div className="field-label">Sections</div>
              <div className="stack" style={{ gap: 4, marginBottom: 14 }}>
                {phase.sectionIds.map((id) => {
                  const s = sections.find((x) => x.id === id)
                  if (!s) return null
                  return (
                    <button
                      key={id}
                      className="file-row"
                      onClick={() => navigate(`/p/${project.id}/sections/${id}`)}
                      style={{ padding: '5px 7px' }}
                    >
                      <Icon name={s.icon} size={12} />
                      {s.name}
                      <span className="size">{s.screens.length} scr</span>
                    </button>
                  )
                })}
              </div>
              <div style={{ borderTop: '1px solid var(--app-line-soft)', paddingTop: 10 }}>
                <div className="field-label" style={{ color: 'var(--app-warn)' }}>Main risk</div>
                <p className="tiny muted" style={{ lineHeight: 1.5 }}>{phase.risk}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <Icon name="Gauge" size={14} />
          <h3>What has to be true before each phase starts</h3>
        </div>
        <div className="panel-body">
          <table className="tbl">
            <thead>
              <tr>
                <th>Phase</th>
                <th>Entry condition</th>
                <th>Exit condition</th>
              </tr>
            </thead>
            <tbody>
              {roadmap.phases.map((p) => (
                <tr key={p.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{p.name}</td>
                  <td className="muted">
                    {p.id === 'phase-1'
                      ? 'Schema reviewed; design tokens merged; one pilot user identified.'
                      : `Previous phase live with at least one team's real data for two weeks.`}
                  </td>
                  <td className="muted">
                    {p.id === 'phase-1'
                      ? `Core loop usable end to end; ${p.sectionIds.length} section(s) shipped with tests.`
                      : `${p.sectionIds.length} section(s) shipped, audit score held, no manual data fixes.`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
