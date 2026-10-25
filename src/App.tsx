// ProdOps — developed by Lulamile Mkhungela.
//
// The application shell: the sticky header that carries the brand, the phase
// stepper and the account menu; the routed view in the main column; the credit
// at the end of the document; and the toast that confirms every action.

import { useEffect, useMemo, useState } from 'react'
import { useStore } from './lib/store'
import { Link, navigate, useRoute } from './lib/router'
import { PHASES, completedPhases, phaseIndex, sectionStats } from './lib/progress'
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
import { FlowsPage } from './views/FlowsPage'
import { PersonasPage } from './views/PersonasPage'
import { SystemPage } from './views/SystemPage'
import { PrototypePage } from './views/PrototypePage'
import { EditorPage } from './views/EditorPage'
import { WikiPage } from './views/WikiPage'
import { CoveragePage } from './views/CoveragePage'
import { ToolsPage } from './views/ToolsPage'
import { AwaitingDescription } from './components/AwaitingDescription'
import { started } from './lib/state'

/**
 * What each stage holds once there is a product to hold it.
 *
 * This is the empty state's copy, and it is the same list the stage's own guide
 * gives — so a page that has nothing in it is still teaching what will be here,
 * instead of showing a sample that is not the builder's.
 */
const STAGE_INTRO: Record<string, { stage: string; title: string; subtitle: string; willHold: string[] }> = {
  'data-shape': {
    stage: 'Data Shape',
    title: 'Data Shape',
    subtitle: 'The things your product has to remember, and how they relate.',
    willHold: [
      'The entities your product actually needs, with their fields and types',
      'The relationships between them, enforced by the database rather than the UI',
      'Seeded rows, so every screen has something real to render',
      'schema.sql, generated from the same definition',
    ],
  },
  design: {
    stage: 'Design',
    title: 'Design system',
    subtitle: 'Colour, type, spacing and the shell — tokens, not screenshots.',
    willHold: [
      'Colour roles derived from the product, checked for contrast',
      'Type roles, spacing, radii and motion as W3C DTCG tokens',
      'The application shell: navigation, header and page frame',
      'A live preview of the shell in both themes',
    ],
  },
  shell: {
    stage: 'Design',
    title: 'Shell design',
    subtitle: 'The frame every screen sits inside.',
    willHold: ['The navigation for your sections', 'The header and page frame', 'Both themes, previewable'],
  },
  sections: {
    stage: 'Sections',
    title: 'Sections',
    subtitle: 'The build order: each slice of the product with its own spec, data and screens.',
    willHold: [
      'The sections you ask for — nothing is added that you did not describe',
      'A spec and acceptance checks per section',
      'Sample data and designed screens per section',
      'Screenshots, captured from the screens you approve',
    ],
  },
  export: {
    stage: 'Export',
    title: 'Export',
    subtitle: 'The handoff package a coding agent builds from.',
    willHold: [
      'The brief, the data shape and the design tokens',
      'Every section spec, component and screenshot',
      'The backend contract, its rules and its tests',
      'A README the agent reads first',
    ],
  },
  personas: {
    stage: 'Workspace',
    title: 'Personas',
    subtitle: 'The people the product is for.',
    willHold: ['The person whose day the product changes', 'Their goal, their pain, and what is actually true'],
  },
  flows: {
    stage: 'Workspace',
    title: 'User flows',
    subtitle: 'The routes through the product.',
    willHold: ['A flow per persona', 'The screens each flow passes through', 'The flows you add yourself'],
  },
  system: {
    stage: 'Workspace',
    title: 'Tech stack',
    subtitle: 'What the product is built on, and the components it is built from.',
    willHold: ['The stack, layer by layer', 'The component registry every screen uses', 'Anything you override'],
  },
  prototype: {
    stage: 'Workspace',
    title: 'Prototype',
    subtitle: 'The screens you designed, running as one app.',
    willHold: ['Your sections as screens', 'Navigation between them', 'The data your product actually has'],
  },
  editor: {
    stage: 'Workspace',
    title: 'Token editor',
    subtitle: 'Change the design system and see every screen follow.',
    willHold: ['Your tokens, editable', 'A live preview of the effect', 'An override you can reset'],
  },
  wiki: {
    stage: 'Workspace',
    title: 'Wiki',
    subtitle: 'The project, written down.',
    willHold: ['The pages a new builder would read', 'A version for every snapshot you take', 'Branches, if you want them'],
  },
  coverage: {
    stage: 'Workspace',
    title: 'Coverage',
    subtitle: 'Every command, checked against the package that exists.',
    willHold: ['The ten stage commands and their artefacts', 'The standards commands', 'What is missing, named'],
  },
}

const TRACK_NAV = [
  { path: 'tools', label: 'Tools', icon: 'Sparkles' },
  { path: 'personas', label: 'Personas', icon: 'Users' },
  { path: 'flows', label: 'User Flows', icon: 'Route' },
  { path: 'system', label: 'Tech Stack', icon: 'Layers' },
  { path: 'prototype', label: 'Prototype', icon: 'Play' },
  { path: 'editor', label: 'Token editor', icon: 'Sliders' },
  { path: 'wiki', label: 'Wiki', icon: 'BookOpen' },
  { path: 'coverage', label: 'Coverage', icon: 'ShieldCheck' },
] as const

export function App() {
  const { path, fullscreen } = useRoute()
  const { active, captures, theme, toggleTheme, regenerate, reset, notify, versions } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [sectionsOpen, setSectionsOpen] = useState(true)

  const done = useMemo(() => completedPhases(active, captures), [active, captures])
  const stats = useMemo(() => sectionStats(active, captures), [active, captures])
  const currentPhase = path[0] === 'data-shape' || path[0] === 'design' || path[0] === 'shell' ? (path[0] === 'shell' ? 'design' : path[0]) : path[0] ?? 'product'
  const trackActive = TRACK_NAV.some((n) => n.path === path[0])
  const doneCount = PHASES.filter((phase) => done[phase.id]).length

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
    // A stage with no product in it says so, and says what it will hold. The
    // toolkit is exempt: those eight tools are real files, not artefacts of a
    // product, and the Product stage is where the product comes from.
    const stage = path[0] ?? ''
    if (!started(active) && stage !== '' && stage !== 'tools') {
      const intro = STAGE_INTRO[stage] ?? STAGE_INTRO['data-shape']
      return <AwaitingDescription {...intro} />
    }
    if (path[0] === 'data-shape') return <DataShapePage project={active} />
    if (path[0] === 'design') return <DesignPage project={active} />
    if (path[0] === 'shell') return <ShellDesignPage project={active} fullscreen={fullscreen} />
    if (path[0] === 'export') return <ExportPage project={active} />
    if (path[0] === 'personas') return <PersonasPage project={active} />
    if (path[0] === 'flows') return <FlowsPage project={active} />
    if (path[0] === 'system') return <SystemPage project={active} />
    if (path[0] === 'prototype') return <PrototypePage project={active} />
    if (path[0] === 'editor') return <EditorPage project={active} />
    if (path[0] === 'wiki') return <WikiPage project={active} />
    if (path[0] === 'coverage') return <CoveragePage project={active} />
    if (path[0] === 'tools') return <ToolsPage project={active} />
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
      <aside className="lz-side" aria-label="ProdOps">
        <div className="lz-brand">
          <img className="lz-brand-mark" src="/prodops-mark.svg" alt="" width={22} height={22} />
          <span className="lz-brand-name">ProdOps</span>
          <span className="lz-mode-chip" title="Compiled in this browser. No keys, no model calls.">Local</span>
        </div>

        <nav className="lz-nav" aria-label="Process">
          {/* The five stages, in order, each with its own completion mark. This
              is the process rail: it is why the panel exists, and it is the only
              place the stages are navigated from. */}
          <p className="lz-nav-label">Process</p>
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
                {!done[phase.id] && phase.id !== 'sections' && <span className="lz-nav-dot" aria-hidden="true" />}
              </Link>
            )
          })}

          {/* How far the process has actually got, in the rail where the
              stages are. Every tick above is a stage the builder confirmed. */}
          <div className="lz-rail-progress">
            <span className="lz-rail-progress-label">{doneCount} of {PHASES.length} stages complete</span>
            <span className="lz-meter" aria-hidden="true">
              <span className="lz-meter-fill" style={{ width: `${(doneCount / PHASES.length) * 100}%` }} />
            </span>
          </div>

          <p className="lz-nav-label">Workspace</p>
          {TRACK_NAV.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`lz-nav-item${path[0] === item.path ? ' is-active' : ''}`}
              aria-current={path[0] === item.path ? 'page' : undefined}
            >
              <Icon name={item.icon} size={17} />
              <span className="lz-nav-label-text">{item.label}</span>
              {item.path === 'wiki' && versions.length > 0 && <span className="lz-badge quiet">{versions.length}</span>}
              {item.path === 'flows' && <span className="lz-badge quiet">{active.flows.length}</span>}
            </Link>
          ))}

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

        </nav>

        {/* The workspace is one page of a site that is 100+ pages wide. The
            builder got here from a page, and the way back has to be a link in
            the panel they are already looking at — not the browser's back
            button across nine documents. */}
        <a className="lz-side-back" href="/">
          <Icon name="ArrowLeft" size={13} />
          <span>Back to the ProdOps site</span>
          <Icon name="ArrowUpRight" size={12} className="lz-side-back-out" />
        </a>

        <div className="lz-side-foot">
          <div className="lz-avatar" aria-hidden="true">{active.name.slice(0, 1).toUpperCase()}</div>
          <div className="lz-account">
            <div className="lz-account-name" title={active.name}>{active.name}</div>
            <div className="lz-account-email">{active.archetypeLabel} · {doneCount}/5 phases</div>
          </div>
          {/* The theme is one click away instead of two: it sits beside the
              account actions, and the same switch is still in the menu. */}
          <button
            className="lz-theme-toggle"
            type="button"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={theme === 'dark'}
            onClick={toggleTheme}
          >
            <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={15} />
          </button>
          <button
            className="lz-dots"
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Actions"
            onClick={() => setMenuOpen((v) => !v)}
          >
            •••
          </button>
          {menuOpen && (
            <div className="lz-menu" role="menu" ref={menuRef}>
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
              <button
                type="button"
                role="menuitem"
                onClick={async () => { setMenuOpen(false); await downloadProjectZip(active); notify('Package downloaded') }}
              >
                Download .zip
              </button>
              <hr />
              <a className="lz-menu-link" role="menuitem" href="/">
                Back to the ProdOps site
              </a>
              <button type="button" role="menuitem" onClick={() => { reset(); navigate(''); setMenuOpen(false); notify('Cleared — describe a product') }}>
                Clear this product
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
          <span className="lz-pill">{trackActive ? TRACK_NAV.find((n) => n.path === path[0])?.label : PHASES[phaseIndex(currentPhase)]?.label ?? 'Product'}</span>
        </div>

        <div key={path.join('/') || 'product'}>{page()}</div>

        <footer className="lz-credit">
          {/* The founder, in his own workspace: the name is credited, and the
              face behind it is the photograph he supplied rather than a mark. */}
          <span className="lz-credit-founder">
            <img src="/lulamile-mkhungela.png" alt="Lulamile Mkhungela" width={28} height={28} loading="lazy" />
          </span>
          <span>
            <b>ProdOps</b> — developed by <b>Lulamile Mkhungela</b>. Compiled in this browser: no keys, no model calls,
            no data leaves the page.
          </span>
        </footer>
      </main>

      <Toast />
    </div>
  )
}

