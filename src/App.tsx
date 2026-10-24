import { useEffect, useMemo, useState } from 'react'
import { useStore } from './lib/store'
import { Link, navigate, useRoute } from './lib/router'
import { PHASES, completedPhases, phaseIndex, sectionStats } from './lib/progress'
import { ARCHETYPES, GENOME_PRESETS } from './engine'
import { downloadProjectZip } from './lib/download'
import { Icon } from './components/Icons'
import { Toast, useOutsideClose } from './components/ui'
import { ProductPage } from './views/ProductPage'
import { DataShapePage } from './views/DataShapePage'
import { DesignPage } from './views/DesignPage'
import { ShellDesignPage } from './views/ShellDesignPage'
import { SectionsPage } from './views/SectionsPage'
import { SectionPage } from './views/SectionPage'
import { ScreenDesignPage } from './views/ScreenDesignPage'
import { ExportPage } from './views/ExportPage'

export function App() {
  const { path, fullscreen } = useRoute()
  const { projects, active, captures, theme, toggleTheme, create, setActive, regenerate, reset, notify } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [sectionsOpen, setSectionsOpen] = useState(true)

  const done = useMemo(() => completedPhases(active, captures), [active, captures])
  const stats = useMemo(() => sectionStats(active, captures), [active, captures])
  const currentPhase = path[0] === 'data-shape' || path[0] === 'design' || path[0] === 'shell' ? (path[0] === 'shell' ? 'design' : path[0]) : path[0] ?? 'product'

  useEffect(() => {
    document.body.classList.toggle('lz-nav-open', navOpen)
    return () => document.body.classList.remove('lz-nav-open')
  }, [navOpen])

  useEffect(() => {
    setNavOpen(false)
    setMenuOpen(false)
  }, [path.join('/')])

  const menuRef = useOutsideClose(() => setMenuOpen(false))

  const section = path[0] === 'sections' && path[1] ? active.sections.find((s) => s.id === path[1]) : undefined
  const screenId = path[0] === 'sections' && path[2] === 'screen-designs' ? path[3] : undefined

  function page() {
    if (path[0] === 'data-shape') return <DataShapePage project={active} />
    if (path[0] === 'design') return <DesignPage project={active} />
    if (path[0] === 'shell') return <ShellDesignPage project={active} fullscreen={fullscreen} />
    if (path[0] === 'export') return <ExportPage project={active} />
    if (path[0] === 'sections') {
      if (!path[1]) return <SectionsPage project={active} />
      if (!section) {
        return (
          <div className="lz-view">
            <div className="lz-empty">
              <h3>That section is not in this product</h3>
              <p>It may have been recompiled away. Pick a section from the list.</p>
              <div className="lz-row" style={{ justifyContent: 'center', marginTop: 16 }}>
                <Link to="sections" className="lz-btn small">All sections</Link>
              </div>
            </div>
          </div>
        )
      }
      if (screenId) return <ScreenDesignPage project={active} section={section} screenId={screenId} fullscreen={fullscreen} />
      return <SectionPage project={active} section={section} />
    }
    return <ProductPage project={active} />
  }

  if (fullscreen) {
    return (
      <>
        {page()}
        <Toast />
      </>
    )
  }

  return (
    <div className="lz-app" data-theme={theme}>
      <aside className="lz-side" aria-label="Lula DevZign">
        <div className="lz-brand">
          <span className="lz-brand-dot" aria-hidden="true" />
          <span className="lz-brand-name">Lula DevZign</span>
          <span className="lz-mode-chip" title="Compiled in this browser. No keys, no model calls.">Local</span>
        </div>

        <nav className="lz-nav" aria-label="Primary">
          <p className="lz-nav-label">Workspace</p>
          {PHASES.map((phase) => {
            const isActive = currentPhase === phase.id
            return (
              <Link
                key={phase.id}
                to={phase.path}
                className={`lz-nav-item${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon name={phase.icon} size={17} />
                <span className="lz-nav-label-text">{phase.label}</span>
                {phase.id === 'sections' && (
                  <span className={`lz-badge${stats.done === stats.total ? '' : ' quiet'}`}>{stats.done}/{stats.total}</span>
                )}
                {done[phase.id] && phase.id !== 'sections' && (
                  <span className="lz-checkdot"><Icon name="Check" size={10} strokeWidth={3} /></span>
                )}
              </Link>
            )
          })}

          <div className="lz-nav-group">
            <button
              className="lz-nav-item lz-nav-group-toggle"
              type="button"
              aria-expanded={sectionsOpen}
              aria-controls="sections-sub"
              onClick={() => setSectionsOpen((v) => !v)}
            >
              <Icon name="FolderKanban" size={17} />
              <span className="lz-nav-label-text">Sections</span>
              <span className="lz-caret"><Icon name="ChevronRight" size={13} /></span>
            </button>
            {sectionsOpen && (
              <div className="lz-nav-sub" id="sections-sub">
                {active.sections.map((s) => (
                  <Link key={s.id} to={`sections/${s.id}`} className={path[1] === s.id ? 'is-active' : undefined}>
                    {s.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="lz-nav-group">
            <button className="lz-nav-item" type="button" onClick={() => setNewOpen(true)}>
              <Icon name="Plus" size={17} />
              <span className="lz-nav-label-text">New product</span>
            </button>
          </div>
        </nav>

        <div className="lz-side-foot">
          <div className="lz-avatar" aria-hidden="true">{active.name.slice(0, 1).toUpperCase()}</div>
          <div className="lz-account">
            <div className="lz-account-name" title={active.name}>{active.name}</div>
            <div className="lz-account-email">{active.archetypeLabel} · {projects.length} compiled</div>
          </div>
          <button
            className="lz-dots"
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Product menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            •••
          </button>
          {menuOpen && (
            <div className="lz-menu" role="menu" ref={menuRef}>
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setNewOpen(true) }}>
                New product…
              </button>
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); navigate('export') }}>
                Export package
              </button>
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); regenerate(active); notify('Recompiled from the same seed') }}>
                Recompile product
              </button>
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); toggleTheme() }}>
                Use {theme === 'dark' ? 'light' : 'dark'} theme
              </button>
              <hr />
              {projects.filter((p) => p.id !== active.id).slice(0, 5).map((p) => (
                <button key={p.id} type="button" role="menuitem" onClick={() => { setActive(p.id); navigate(''); setMenuOpen(false) }}>
                  Switch to {p.name}
                </button>
              ))}
              <button
                type="button"
                role="menuitem"
                onClick={async () => { setMenuOpen(false); await downloadProjectZip(active); notify('Package downloaded') }}
              >
                Download .zip
              </button>
              <hr />
              <button type="button" role="menuitem" onClick={() => { reset(); navigate(''); setMenuOpen(false); notify('Starter product restored') }}>
                Reset to starter product
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="lz-main">
        <div className="lz-mobile-bar">
          <button className="lz-btn small" onClick={() => setNavOpen((v) => !v)} aria-label="Menu">
            <Icon name="Menu" size={15} />
          </button>
          <strong>{active.name}</strong>
          <span className="lz-spacer" />
          <span className="lz-pill">{PHASES[phaseIndex(currentPhase)]?.label ?? 'Product'}</span>
        </div>

        <div key={path.join('/') || 'product'}>{page()}</div>
      </main>

      {newOpen && <NewProductModal onClose={() => setNewOpen(false)} onCreate={(opts) => { create(opts); setNewOpen(false); navigate(''); notify('Product compiled') }} />}
      <Toast />
    </div>
  )
}

function NewProductModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (opts: { idea: string; archetypeId: string; genome?: (typeof GENOME_PRESETS)[number]['genome'] }) => void
}) {
  const [idea, setIdea] = useState('')
  const [archetypeId, setArchetypeId] = useState(ARCHETYPES[0]?.id ?? 'marketplace')
  const [preset, setPreset] = useState(GENOME_PRESETS[0].id)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="lz-modal" role="dialog" aria-modal="true" aria-label="New product" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lz-modal-card">
        <div className="lz-modal-h">
          <h2>New product</h2>
          <button className="lz-modal-x" onClick={onClose} aria-label="Close">
            <Icon name="X" size={14} />
          </button>
        </div>
        <p className="lz-muted" style={{ fontSize: 13, marginBottom: 16 }}>
          One line is enough — the compiler supplies the rest. Leave it blank and the archetype pack writes the product for you.
        </p>

        <label className="lz-field">
          <span>What is it? (optional)</span>
          <textarea
            className="lz-input"
            rows={3}
            value={idea}
            placeholder="A booking tool for mobile dog groomers…"
            onChange={(e) => setIdea(e.target.value)}
          />
        </label>

        <label className="lz-field">
          <span>Archetype pack</span>
          <select className="lz-input" value={archetypeId} onChange={(e) => setArchetypeId(e.target.value)}>
            {ARCHETYPES.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </label>

        <label className="lz-field">
          <span>Genome preset</span>
          <select className="lz-input" value={preset} onChange={(e) => setPreset(e.target.value)}>
            {GENOME_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>

        <div className="lz-modal-foot">
          <button className="lz-btn" onClick={onClose}>Cancel</button>
          <button
            className="lz-btn primary"
            onClick={() => onCreate({ idea, archetypeId, genome: GENOME_PRESETS.find((p) => p.id === preset)?.genome })}
          >
            <Icon name="Zap" size={14} /> Compile product
          </button>
        </div>
      </div>
    </div>
  )
}
