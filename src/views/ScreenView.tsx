import { useState } from 'react'
import type { Project } from '../types'
import { Icon } from '../components/Icons'
import { AppPreview } from '../components/AppPreview'
import { navigate } from '../lib/router'
import { humanize } from '../lib/format'

export function ScreenView({
  project,
  sectionId,
  screenIndex,
}: {
  project: Project
  sectionId: string
  screenIndex: number
}) {
  const section = project.sections.find((s) => s.id === sectionId) ?? project.sections[0]
  const index = Math.min(Math.max(0, screenIndex), section.screens.length - 1)
  const screen = section.screens[index]
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [inspect, setInspect] = useState(true)

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate(`/p/${project.id}/sections`)}>
            <Icon name="ChevronLeft" size={12} /> Sections
          </button>
          <span className="faint">/</span>
          <span className="small muted">{section.name}</span>
          <span className="faint">/</span>
          <span className="small" style={{ fontWeight: 500 }}>{screen.name}</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <div className="row" style={{ gap: 2, border: '1px solid var(--app-line)', borderRadius: 9, padding: 2 }}>
            {(['desktop', 'mobile'] as const).map((d) => (
              <button
                key={d}
                className={`chip${device === d ? ' active' : ''}`}
                style={{ border: 0, padding: '4px 9px' }}
                onClick={() => setDevice(d)}
              >
                <Icon name={d === 'desktop' ? 'LayoutGrid' : 'Smartphone'} size={11} />
                {d}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 2, border: '1px solid var(--app-line)', borderRadius: 9, padding: 2 }}>
            {(['light', 'dark'] as const).map((t) => (
              <button
                key={t}
                className={`chip${theme === t ? ' active' : ''}`}
                style={{ border: 0, padding: '4px 9px' }}
                onClick={() => setTheme(t)}
              >
                <Icon name={t === 'light' ? 'Sun' : 'Moon'} size={11} />
                {t}
              </button>
            ))}
          </div>
          <button className={`btn btn-sm${inspect ? ' btn-primary' : ''}`} onClick={() => setInspect((v) => !v)}>
            <Icon name="ClipboardList" size={12} /> Spec
          </button>
        </div>
      </div>

      <div className="player" style={inspect ? undefined : { gridTemplateColumns: '1fr' }}>
        <div className="player-main">
          <div className="player-bar">
            <span className="row" style={{ gap: 4 }}>
              {section.screens.map((s, i) => (
                <button
                  key={s.id}
                  className={`chip${i === index ? ' active' : ''}`}
                  style={{ border: 0, padding: '4px 9px', fontSize: 11 }}
                  onClick={() => navigate(`/p/${project.id}/screen/${section.id}/${i}`)}
                  title={`${s.name} · ${s.kind}`}
                >
                  {s.name}
                </button>
              ))}
            </span>
            <span className="route-pill" style={{ flex: 'none', maxWidth: 220, marginLeft: 'auto' }}>{screen.route}</span>
          </div>
          <div className={`canvas-frame${device === 'mobile' ? ' mobile' : ''}`}>
            <div className={`canvas-inner${device === 'mobile' ? ' mobile' : ''}`}>
              <AppPreview project={project} screen={screen} theme={theme} device={device} />
            </div>
          </div>
          <div className="row-between" style={{ marginTop: 10 }}>
            <span className="tiny faint">
              Rendered with real seeded records from <span className="mono">{project.data.entities.find((e) => e.id === screen.entityIds[0])?.plural}</span>. No images, no mockups.
            </span>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn btn-sm btn-ghost" disabled={index === 0} onClick={() => navigate(`/p/${project.id}/screen/${section.id}/${index - 1}`)}>
                <Icon name="ChevronLeft" size={12} /> Prev
              </button>
              <button
                className="btn btn-sm btn-ghost"
                disabled={index >= section.screens.length - 1}
                onClick={() => navigate(`/p/${project.id}/screen/${section.id}/${index + 1}`)}
              >
                Next <Icon name="ChevronRight" size={12} />
              </button>
            </div>
          </div>
        </div>

        {inspect && (
          <aside className="block-panel stack" style={{ gap: 12 }}>
            <div className="panel">
              <div className="panel-head">
                <Icon name="Target" size={13} />
                <h3>Intent</h3>
              </div>
              <div className="panel-body">
                <p className="small" style={{ lineHeight: 1.6 }}>{screen.intent}</p>
                <div className="divider" />
                <div className="kv" style={{ gridTemplateColumns: '74px 1fr', fontSize: 11.5 }}>
                  <dt>route</dt>
                  <dd className="mono tiny">{screen.route}</dd>
                  <dt>type</dt>
                  <dd>{screen.kind}</dd>
                  <dt>entities</dt>
                  <dd className="tiny">{screen.entityIds.join(', ')}</dd>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <Icon name="LayoutGrid" size={13} />
                <h3>Blocks ({screen.blocks.length})</h3>
              </div>
              <div className="panel-body" style={{ padding: '8px 12px' }}>
                <ol style={{ margin: 0, paddingLeft: 14 }} className="tiny">
                  {screen.blocks.map((b, i) => (
                    <li key={i} style={{ margin: '6px 0', color: 'var(--app-muted)' }}>
                      <span className="mono" style={{ color: 'var(--app-accent)' }}>{b.type}</span>
                      <span className="faint">
                        {' '}
                        · {humanize(b.type === 'pageHeader' ? 'header' : b.type)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <Icon name="RefreshCw" size={13} />
                <h3>States</h3>
              </div>
              <div className="panel-body stack" style={{ gap: 9 }}>
                {screen.states.map((s) => (
                  <div key={s.name}>
                    <div className="tiny" style={{ fontWeight: 600 }}>{s.name}</div>
                    <div className="tiny faint" style={{ lineHeight: 1.5 }}>{s.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <Icon name="Check" size={13} />
                <h3>Acceptance</h3>
              </div>
              <div className="panel-body">
                <ul className="bullets tiny">
                  {screen.acceptance.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
