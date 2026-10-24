import { useMemo, useState } from 'react'
import type { Project } from '../types'
import { TrackHeader } from '../components/ui'
import { Icon } from '../components/Icons'
import { AppPreview } from '../components/AppPreview'
import { useStore } from '../lib/store'
import { Link, navigate } from '../lib/router'
import { TRACK } from './FlowsPage'

export function PrototypePage({ project }: { project: Project }) {
  const { commit, notify, overrides } = useStore()
  const screens = useMemo(
    () => project.sections.flatMap((section) => section.screens.map((screen) => ({ section, screen }))),
    [project.sections],
  )
  const [activeId, setActiveId] = useState(screens[0]?.screen.id ?? '')
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [flowId, setFlowId] = useState(project.flows[0]?.id ?? '')
  const [stepIndex, setStepIndex] = useState(0)

  const active = screens.find((s) => s.screen.id === activeId) ?? screens[0]
  const flow = project.flows.find((f) => f.id === flowId) ?? project.flows[0]

  const goStep = (index: number) => {
    if (!flow) return
    const step = flow.steps[Math.max(0, Math.min(flow.steps.length - 1, index))]
    setStepIndex(Math.max(0, Math.min(flow.steps.length - 1, index)))
    if (step?.screenId) setActiveId(step.screenId)
  }

  if (!active) {
    return (
      <div className="lz-view">
        <TrackHeader project={project} steps={TRACK} current="prototype" title="Prototype" />
        <div className="lz-empty"><h3>Nothing to prototype yet</h3><p>Compile a section with at least one screen.</p></div>
      </div>
    )
  }

  return (
    <div className="lz-view">
      <TrackHeader
        project={project}
        steps={TRACK}
        current="prototype"
        title="Prototype"
        subtitle="A production-ready prototype: real routes, real seeded records, assembled only from the registry. No placeholder screens, no layout invented in the browser."
        actions={
          <>
            <div className="lz-seg" role="group" aria-label="Device">
              <button className={device === 'desktop' ? 'is-on' : ''} onClick={() => setDevice('desktop')} title="Desktop">
                <Icon name="Monitor" size={13} />
              </button>
              <button className={device === 'mobile' ? 'is-on' : ''} onClick={() => setDevice('mobile')} title="Mobile">
                <Icon name="Smartphone" size={13} />
              </button>
            </div>
            <Link to="editor" className="lz-btn small">
              <Icon name="Sliders" size={13} /> Edit tokens
            </Link>
            <button
              className="lz-btn small primary"
              onClick={() => {
                commit(`Prototype snapshot · ${active.section.name}`)
                notify('Snapshot committed')
              }}
            >
              <Icon name="GitBranch" size={13} /> Commit snapshot
            </button>
          </>
        }
      />

      <div className="lz-stack">
        <div className="lz-between">
          <div className="lz-row">
            <span className="lz-pill green"><Icon name="ShieldCheck" size={11} /> registry only</span>
            <span className="lz-pill"><Icon name="Database" size={11} /> mock data layer</span>
            <span className="lz-pill"><Icon name="Layers" size={11} /> {project.system.components.length} components</span>
            {Object.keys(overrides).length > 0 && <span className="lz-pill peach"><Icon name="Sliders" size={11} /> tokens edited</span>}
          </div>
          <span className="lz-hint" style={{ marginTop: 0 }}>{project.system.shell.routes.length} routes · {project.system.shell.frame}</span>
        </div>

        <div className="lz-proto">
          <div className="lz-proto-bar">
            <span className="lz-proto-dots"><i /><i /><i /></span>
            <span className="lz-proto-url">{active.screen.route}</span>
            <span className="lz-spacer" />
            <span className="lz-pill mono">{overrides.primaryHue !== undefined ? `hue ${overrides.primaryHue}` : project.design.colors[0].base}</span>
            <span className="lz-pill">{device}</span>
          </div>
          <div className="lz-proto-canvas">
            <div className={device === 'mobile' ? 'lz-proto-device' : undefined}>
              <AppPreview project={project} screen={active.screen} theme="light" device={device} />
            </div>
          </div>
        </div>

        <div className="lz-split">
          <div className="lz-card">
            <div className="lz-card-h" style={{ marginBottom: 10 }}>
              <div className="lz-card-hL"><Icon name="LayoutList" size={15} /><h2>Pages</h2></div>
              <span className="lz-pill">{screens.length}</span>
            </div>
            <div className="lz-stack" style={{ gap: 10 }}>
              {project.sections.map((section) => (
                <div key={section.id}>
                  <p className="lz-cmd-label" style={{ marginBottom: 5 }}>{section.name}</p>
                  <div className="lz-row" style={{ gap: 5 }}>
                    {section.screens.map((screen) => (
                      <button
                        key={screen.id}
                        className={`lz-btn small${screen.id === active.screen.id ? ' primary' : ' quiet'}`}
                        onClick={() => setActiveId(screen.id)}
                        title={screen.route}
                      >
                        {screen.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lz-card">
            <div className="lz-card-h" style={{ marginBottom: 10 }}>
              <div className="lz-card-hL"><Icon name="Route" size={15} /><h2>Walk a flow</h2></div>
              <select
                className="lz-input"
                style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
                value={flow?.id}
                onChange={(e) => { setFlowId(e.target.value); setStepIndex(0) }}
              >
                {project.flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            {flow && (
              <>
                <p className="lz-hint" style={{ marginTop: 0, marginBottom: 8 }}>
                  {flow.persona} · {flow.steps.length} steps · {stepIndex + 1} of {flow.steps.length}
                </p>
                <div className="lz-row" style={{ gap: 5, marginBottom: 10 }}>
                  {flow.steps.map((step, i) => (
                    <button
                      key={step.id}
                      className={`lz-btn small${i === stepIndex ? ' primary' : ' quiet'}`}
                      onClick={() => goStep(i)}
                      title={step.detail}
                      disabled={!step.screenId}
                    >
                      {i + 1}. {step.title}
                    </button>
                  ))}
                </div>
                <div className="lz-row">
                  <button className="lz-btn small" onClick={() => goStep(stepIndex - 1)} disabled={stepIndex === 0}>
                    <Icon name="ArrowLeft" size={12} /> Back
                  </button>
                  <button className="lz-btn small primary" onClick={() => goStep(stepIndex + 1)} disabled={stepIndex >= flow.steps.length - 1}>
                    Next step <Icon name="ArrowRight" size={12} />
                  </button>
                </div>
                <div className="lz-sep" />
                <p className="lz-body" style={{ fontSize: 12.5 }}>
                  {flow.steps[stepIndex]?.detail}
                </p>
                <p className="lz-hint">Success: {flow.success}</p>
              </>
            )}
          </div>
        </div>

        <button className="lz-btn primary block" onClick={() => navigate('wiki')} style={{ minHeight: 46 }}>
          Continue to Wiki <Icon name="ArrowRight" size={15} />
        </button>
      </div>
    </div>
  )
}
