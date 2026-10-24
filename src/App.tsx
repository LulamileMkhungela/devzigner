import { useState } from 'react'
import { useStore } from './lib/store'
import { navigate, useRoute } from './lib/router'
import { Home } from './views/Home'
import { BriefView } from './views/BriefView'
import { RoadmapView } from './views/RoadmapView'
import { DataView } from './views/DataView'
import { DesignView } from './views/DesignView'
import { SectionsView, SectionDetail } from './views/SectionsView'
import { ScreensView } from './views/ScreensView'
import { ScreenView } from './views/ScreenView'
import { AuditView } from './views/AuditView'
import { HandoffView } from './views/HandoffView'
import { Icon } from './components/Icons'
import { downloadProjectZip } from './lib/download'
import { seedPhrase } from './engine'

const NAV = [
  { id: 'brief', label: 'Brief', icon: 'FileText' },
  { id: 'roadmap', label: 'Roadmap', icon: 'Route' },
  { id: 'data', label: 'Data model', icon: 'LayoutGrid' },
  { id: 'design', label: 'Design system', icon: 'Sparkles' },
  { id: 'sections', label: 'Sections', icon: 'FolderKanban' },
  { id: 'screens', label: 'Screens', icon: 'LayoutDashboard' },
  { id: 'audit', label: 'Audit', icon: 'ShieldAlert' },
  { id: 'handoff', label: 'Handoff', icon: 'Download' },
] as const

export function App() {
  const { path } = useRoute()
  const { projects, theme, toggleTheme, regenerate } = useStore()
  const [engineLog, setEngineLog] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [zipping, setZipping] = useState(false)

  const projectId = path[0] === 'p' ? path[1] : undefined
  const project = projects.find((p) => p.id === projectId)
  const view = path[2] ?? 'brief'

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => navigate('/')} title="Lula DevZign home">
          <span className="brand-mark">LD</span>
          <span>
            Lula DevZign
            <small>deterministic design compiler</small>
          </span>
        </button>

        {project && (
          <div className="row hide-sm" style={{ gap: 8 }}>
            <span className="faint">/</span>
            <span className="small" style={{ fontWeight: 500 }}>{project.name}</span>
            <span className="tag">{project.archetypeLabel}</span>
            <span className="tag mono" title="Deterministic seed">{seedPhrase(project.seed)}</span>
          </div>
        )}

        <div className="topbar-spacer" />

        <div className="topbar-actions">
          {projects.length > 0 && (
            <button className="btn btn-sm hide-sm" onClick={() => navigate('/')}>
              <Icon name="LayoutGrid" size={12} /> All compiles
            </button>
          )}
          {project && (
            <>
              <button className="btn btn-sm hide-sm" onClick={() => setEngineLog((v) => !v)} title="See exactly how this was generated">
                <Icon name="Cog" size={12} /> Engine log
              </button>
              <button
                className="btn btn-sm"
                onClick={() => {
                  setExporting(true)
                  regenerate(project)
                  setExporting(false)
                }}
                title="Recompile the whole package from the same inputs"
              >
                <Icon name="RefreshCw" size={12} className={exporting ? 'spin' : undefined} /> Recompile
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={async () => {
                  setZipping(true)
                  await downloadProjectZip(project)
                  setZipping(false)
                }}
              >
                <Icon name={zipping ? 'RefreshCw' : 'Download'} size={12} className={zipping ? 'spin' : undefined} />
                <span className="hide-sm">{zipping ? 'Packaging…' : 'Export ZIP'}</span>
              </button>
            </>
          )}
          <button className="icon-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} studio`}>
            <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={14} />
          </button>
        </div>
      </header>

      {engineLog && project && (
        <div style={{ borderBottom: '1px solid var(--app-line)', background: 'var(--app-panel)', padding: '14px 24px' }}>
          <div className="wrap">
            <div className="row-between" style={{ marginBottom: 8 }}>
              <span className="eyebrow">Engine log · {project.id}</span>
              <button className="icon-btn" onClick={() => setEngineLog(false)}>
                <Icon name="X" size={12} />
              </button>
            </div>
            <ol className="num-list" style={{ columns: 2, columnGap: 28 }}>
              {project.engineNotes.map((n) => (
                <li key={n}>
                  <span className="small muted" style={{ lineHeight: 1.55 }}>{n}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {!projectId ? (
        <Home />
      ) : !project ? (
        <div className="wrap" style={{ paddingTop: 60 }}>
          <div className="panel panel-pad" style={{ textAlign: 'center', padding: 50 }}>
            <h2 className="section-title">That compile is not on this device</h2>
            <p className="muted small" style={{ margin: '10px 0 18px' }}>
              Projects live in local storage. It may have been deleted, or created in another browser.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              <Icon name="ChevronLeft" size={13} /> Back to the compiler
            </button>
          </div>
        </div>
      ) : (
        <div className="shell">
          <aside className="sidebar">
            <div className="nav-group">
              <div className="nav-label">Modules</div>
              {NAV.map((n) => (
                <button
                  key={n.id}
                  className={`nav-item${view === n.id || (n.id === 'sections' && view === 'sections') || (n.id === 'screens' && view === 'screen') ? ' active' : ''}`}
                  onClick={() => navigate(`/p/${project.id}/${n.id}`)}
                >
                  <Icon name={n.icon} size={14} />
                  {n.label}
                  {n.id === 'sections' && <span className="count">{project.sections.length}</span>}
                  {n.id === 'screens' && <span className="count">{project.sections.reduce((a, s) => a + s.screens.length, 0)}</span>}
                  {n.id === 'audit' && <span className="count">{project.audit.score}</span>}
                </button>
              ))}
            </div>
            <div className="nav-group">
              <div className="nav-label">Sections</div>
              {project.sections.slice(0, 7).map((s) => (
                <button
                  key={s.id}
                  className={`nav-item${path[3] === s.id ? ' active' : ''}`}
                  onClick={() => navigate(`/p/${project.id}/sections/${s.id}`)}
                  title={s.purpose}
                >
                  <Icon name={s.icon} size={13} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                </button>
              ))}
            </div>
          </aside>

          <main className="main">
            <div className="wrap">
              {view !== 'screen' && (
                <div className="project-head">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="eyebrow">
                      {project.archetypeLabel} · seed {seedPhrase(project.seed)} · {new Date(project.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <h1 style={{ margin: '8px 0 6px' }}>{project.name}</h1>
                    <p className="small muted" style={{ maxWidth: '72ch', lineHeight: 1.6 }}>{project.brief.tagline}</p>
                    <div className="meta-strip" style={{ marginTop: 12 }}>
                      <span className="tag tag-accent">{project.brief.category}</span>
                      <span className="tag">{project.sections.length} sections</span>
                      <span className="tag">{project.sections.reduce((a, s) => a + s.screens.length, 0)} screens</span>
                      <span className="tag">{project.data.entities.length} entities</span>
                      <span className="tag">{project.currency}</span>
                      <span className="tag" style={{ color: project.audit.score >= 85 ? 'var(--app-good)' : 'var(--app-warn)' }}>
                        audit {project.audit.score}
                      </span>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                    <button className="btn btn-sm" onClick={() => navigate(`/p/${project.id}/sections`)}>
                      <Icon name="FolderKanban" size={12} /> Browse specs
                    </button>
                  </div>
                </div>
              )}

              <div className="fade-in" key={view}>
                {view === 'brief' && <BriefView project={project} />}
                {view === 'roadmap' && <RoadmapView project={project} />}
                {view === 'data' && <DataView project={project} />}
                {view === 'design' && <DesignView project={project} />}
                {view === 'sections' && (
                  path[3] ? (
                    <SectionDetail project={project} section={project.sections.find((s) => s.id === path[3]) ?? project.sections[0]} />
                  ) : (
                    <SectionsView project={project} />
                  )
                )}
                {view === 'screens' && <ScreensView project={project} />}
                {view === 'screen' && (
                  <ScreenView project={project} sectionId={path[3] ?? project.sections[0].id} screenIndex={Number(path[4] ?? 0)} />
                )}
                {view === 'audit' && <AuditView project={project} />}
                {view === 'handoff' && <HandoffView project={project} />}
                {!['brief', 'roadmap', 'data', 'design', 'sections', 'screens', 'screen', 'audit', 'handoff'].includes(view) && (
                  <div className="panel panel-pad">
                    <h3 className="card-title">Unknown view</h3>
                    <p className="small muted" style={{ marginTop: 6 }}>Pick a module from the sidebar.</p>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  )
}
