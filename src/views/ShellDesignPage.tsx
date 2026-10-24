import type { Project, Screen } from '../types'
import { PreviewStage } from '../components/PreviewStage'
import { SubHeader, useEscape } from '../components/ui'
import { useStore } from '../lib/store'
import { navigate } from '../lib/router'
import { Icon } from '../components/Icons'

export function ShellDesignPage({ project, fullscreen }: { project: Project; fullscreen: boolean }) {
  const screens = project.sections.flatMap((s) => s.screens)
  const screen: Screen | undefined = screens.find((s) => s.kind === 'overview') ?? screens[0]
  const design = project.design
  const { theme } = useStore()

  useEscape(() => {
    if (fullscreen) navigate('shell/design')
  })

  if (!screen) {
    return (
      <div className="lz-view">
        <SubHeader backTo="design" backLabel="Design" title="Shell design" />
        <div className="lz-empty">
          <h3>No screen to hang the shell on</h3>
          <p>The shell preview needs at least one compiled screen.</p>
        </div>
      </div>
    )
  }

  const stage = (
    <PreviewStage
      project={project}
      screen={screen}
      crumbs={{ section: 'Shell', screen: design.layout.shell[0].toUpperCase() + design.layout.shell.slice(1) }}
      fullscreen={fullscreen}
      fullscreenPath="shell/design/fullscreen"
      exitPath="shell/design"
      onExit={() => navigate('shell/design')}
      initialPct={100}
      note={`${design.layout.shell} shell · ${design.layout.contentWidth}px content · ${design.layout.density} density`}
    />
  )

  if (fullscreen) return <div className="lz-app" data-theme={theme} style={{ display: 'block', minHeight: '100vh' }}>{stage}</div>

  return (
    <div className="lz-view">
      <SubHeader
        backTo="design"
        backLabel="Design"
        eyebrow="Design · shell"
        title="Shell design"
        actions={
          <span className="lz-pill">
            <Icon name="Layout" size={12} /> {design.layout.shell}
          </span>
        }
      />
      <div className="lz-split">
        <div>{stage}</div>
        <aside className="lz-col">
          <div className="lz-card">
            <div className="lz-card-h" style={{ marginBottom: 10 }}>
              <div className="lz-card-hL"><h2>Navigation</h2></div>
              <span className="lz-pill">{design.layout.nav.length}</span>
            </div>
            <ul className="lz-bullets">
              {design.layout.nav.map((item, i) => (
                <li key={item}>
                  <b style={{ color: 'var(--ink)' }}>{i + 1}.</b> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="lz-card">
            <div className="lz-card-h" style={{ marginBottom: 10 }}>
              <div className="lz-card-hL"><h2>Frame</h2></div>
            </div>
            <dl className="lz-kv">
              <div className="lz-kv-row"><dt>Shell</dt><dd>{design.layout.shell}</dd></div>
              <div className="lz-kv-row"><dt>Content</dt><dd>{design.layout.contentWidth}px</dd></div>
              <div className="lz-kv-row"><dt>Grid</dt><dd>{design.layout.grid}</dd></div>
              <div className="lz-kv-row"><dt>Density</dt><dd>{design.layout.density}</dd></div>
              <div className="lz-kv-row"><dt>Cards</dt><dd>{design.layout.cardStyle}</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  )
}
