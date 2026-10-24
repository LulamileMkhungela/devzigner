import { useMemo, useState } from 'react'
import type { Project } from '../types'
import { Icon } from '../components/Icons'
import { ViewHead } from '../components/ui'
import { ScreenThumb } from '../components/AppPreview'
import { navigate } from '../lib/router'

export function ScreensView({ project }: { project: Project }) {
  const [q, setQ] = useState('')
  const all = useMemo(
    () =>
      project.sections.flatMap((section) =>
        section.screens.map((screen, index) => ({ section, screen, index })),
      ),
    [project],
  )
  const filtered = all.filter(({ screen, section }) =>
    `${screen.name} ${screen.kind} ${section.name}`.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <div>
      <ViewHead
        eyebrow="Gallery"
        title={`${all.length} designed screens`}
        lede="Each screen is generated from the same data model and tokens, then rendered with real seeded records. Open one to inspect its blocks, states and acceptance criteria."
        actions={
          <div className="pv-searchbox" style={{ marginLeft: 0, borderColor: 'var(--app-line)', color: 'var(--app-muted)', background: 'var(--app-bg-soft)' }}>
            <Icon name="Search" size={12} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter screens…"
              style={{ background: 'transparent', border: 0, outline: 'none', width: 150, fontSize: 12 }}
            />
          </div>
        }
      />

      <div className="grid g3" style={{ gap: 14 }}>
        {filtered.map(({ section, screen, index }) => (
          <button
            key={`${section.id}-${screen.id}-${index}`}
            className="card card-hover"
            style={{ padding: 12, textAlign: 'left' }}
            onClick={() => navigate(`/p/${project.id}/screen/${section.id}/${index}`)}
          >
            <ScreenThumb project={project} screen={screen} />
            <div className="row-between" style={{ marginTop: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {screen.name}
                </div>
                <div className="tiny faint">{section.name} · {screen.kind}</div>
              </div>
              <Icon name="ArrowUpRight" size={13} />
            </div>
          </button>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="panel panel-pad" style={{ textAlign: 'center' }}>
          <p className="muted">No screens match “{q}”.</p>
        </div>
      )}
    </div>
  )
}
