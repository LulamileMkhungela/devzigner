import type { Project, Section } from '../types'
import { PreviewStage } from '../components/PreviewStage'
import { SubHeader, useEscape } from '../components/ui'
import { useStore } from '../lib/store'
import { navigate } from '../lib/router'
import { Icon } from '../components/Icons'

export function ScreenDesignPage({
  project,
  section,
  screenId,
  fullscreen,
}: {
  project: Project
  section: Section
  screenId: string
  fullscreen: boolean
}) {
  const { theme } = useStore()
  const index = section.screens.findIndex((s) => s.id === screenId)
  const screen = section.screens[index] ?? section.screens[0]

  useEscape(() => {
    if (fullscreen) navigate(`sections/${section.id}/screen-designs/${screen.id}`)
  })

  if (!screen) {
    return (
      <div className="lz-view">
        <SubHeader backTo={`sections/${section.id}`} backLabel={section.name} title="Screen design" />
        <div className="lz-empty">
          <h3>This section has no screens</h3>
          <p>Compile the section again to generate its screens.</p>
        </div>
      </div>
    )
  }

  const base = `sections/${section.id}/screen-designs/${screen.id}`

  const stage = (
    <PreviewStage
      project={project}
      screen={screen}
      crumbs={{ section: section.name, screen: screen.name }}
      fullscreen={fullscreen}
      fullscreenPath={`${base}/fullscreen`}
      exitPath={base}
      onExit={() => navigate(base)}
      initialPct={100}
    />
  )

  if (fullscreen) {
    return (
      <div className="lz-app" data-theme={theme} style={{ display: 'block', minHeight: '100vh' }}>
        {stage}
      </div>
    )
  }

  return (
    <div className="lz-view">
      <SubHeader
        backTo={`sections/${section.id}`}
        backLabel={section.name}
        eyebrow={`${section.name} · screen design`}
        title={screen.name}
        actions={
          <>
            <span className="lz-pill mono">{screen.route}</span>
            <span className="lz-pill">{screen.kind}</span>
            {index < section.screens.length - 1 && (
              <button
                className="lz-btn small"
                onClick={() => navigate(`sections/${section.id}/screen-designs/${section.screens[index + 1].id}`)}
              >
                Next screen <Icon name="ArrowRight" size={13} />
              </button>
            )}
          </>
        }
      />

      <div className="lz-stack">
        {stage}

        <div className="lz-split">
          <div className="lz-col">
            <div className="lz-card">
              <div className="lz-card-h" style={{ marginBottom: 10 }}>
                <div className="lz-card-hL"><h2>Intent</h2></div>
              </div>
              <p className="lz-body">{screen.intent}</p>
              <div className="lz-sep" />
              <p className="lz-cmd-label">Blocks, top to bottom</p>
              <div className="lz-fieldlist" style={{ marginTop: 8 }}>
                {screen.blocks.map((b, i) => <span key={i}>{i + 1}. {b.type}</span>)}
              </div>
            </div>
            <div className="lz-card">
              <div className="lz-card-h" style={{ marginBottom: 10 }}>
                <div className="lz-card-hL"><h2>Acceptance</h2></div>
              </div>
              <ul className="lz-bullets">
                {screen.acceptance.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </div>
          </div>
          <div className="lz-col">
            <div className="lz-card">
              <div className="lz-card-h" style={{ marginBottom: 10 }}>
                <div className="lz-card-hL"><h2>States</h2></div>
              </div>
              <dl className="lz-kv">
                {screen.states.map((s) => (
                  <div className="lz-kv-row" key={s.name}>
                    <dt>{s.name}</dt>
                    <dd>{s.detail}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="lz-card">
              <div className="lz-card-h" style={{ marginBottom: 10 }}>
                <div className="lz-card-hL"><h2>Records used</h2></div>
              </div>
              <div className="lz-fieldlist">
                {screen.entityIds.map((id) => (
                  <span key={id}>{project.data.entities.find((e) => e.id === id)?.name ?? id}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
