import { useState } from 'react'
import type { FlowStep, Project, UserFlow } from '../types'
import { useStore } from '../lib/store'
import { Collapsible, TrackHeader } from '../components/ui'
import { Icon } from '../components/Icons'
import { Link, navigate } from '../lib/router'

export const TRACK = [
  { id: 'personas', label: 'Who it is for', path: 'personas' },
  { id: 'flows', label: 'User Flows', path: 'flows' },
  { id: 'system', label: 'Tech Stack', path: 'system' },
  { id: 'prototype', label: 'Prototype', path: 'prototype' },
  { id: 'wiki', label: 'Wiki', path: 'wiki' },
  { id: 'coverage', label: 'Coverage', path: 'coverage' },
]

const STEP_ICON: Record<FlowStep['kind'], string> = {
  entry: 'DoorOpen',
  step: 'ArrowRight',
  decision: 'Shuffle',
  exit: 'Flag',
}

export function FlowsPage({ project }: { project: Project }) {
  const { addFlow, removeFlow, notify } = useStore()
  const [adding, setAdding] = useState(false)

  return (
    <div className="lz-view">
      <TrackHeader
        project={project}
        steps={TRACK}
        current="flows"
        title="UX flows"
        subtitle="Steps built from real screens — never a diagram of a page that is not there."
        actions={
          <button className="lz-btn small primary" onClick={() => setAdding(true)}>
            <Icon name="Plus" size={13} /> New flow
          </button>
        }
      />

      <div className="lz-stack">
        <div className="lz-between">
          <p className="lz-muted">
            {project.flows.length} flows · {project.flows.reduce((n, f) => n + f.steps.length, 0)} steps ·{' '}
            {new Set(project.flows.flatMap((f) => f.entities)).size} entities touched
          </p>
          <Link to="prototype" className="lz-btn small quiet">
            <Icon name="Play" size={13} /> Walk them in the prototype
          </Link>
        </div>

        {project.flows.map((flow, i) => (
          <Collapsible
            key={flow.id}
            title={flow.name}
            icon="Route"
            count={`${flow.steps.length} steps`}
            meta={`${flow.persona} · ${flow.custom ? 'added in this workspace' : 'compiled'}`}
            defaultOpen={i === 0}
            right={
              flow.custom ? (
                <button
                  className="lz-icon-btn"
                  title="Remove this flow"
                  aria-label="Remove this flow"
                  onClick={() => {
                    removeFlow(flow.id)
                    notify('Flow removed')
                  }}
                >
                  <Icon name="X" size={12} />
                </button>
              ) : undefined
            }
          >
            <div className="lz-cols-2" style={{ marginBottom: 12 }}>
              <div>
                <p className="lz-cmd-label">Goal</p>
                <p className="lz-body" style={{ fontSize: 13 }}>{flow.goal}</p>
              </div>
              <div>
                <p className="lz-cmd-label">Trigger</p>
                <p className="lz-body" style={{ fontSize: 13 }}>{flow.trigger}</p>
              </div>
            </div>

            <div className="lz-rail">
              {flow.steps.map((step, index) => {
                const section = project.sections.find((s) => s.id === step.sectionId)
                const screen = section?.screens.find((s) => s.id === step.screenId)
                return (
                  <div className="lz-rail-step" data-state={step.kind === 'exit' ? 'complete' : step.kind === 'entry' ? 'current' : 'upcoming'} key={step.id}>
                    <span className="lz-rail-line" aria-hidden />
                    <span className="lz-rail-n">
                      <Icon name={STEP_ICON[step.kind]} size={12} />
                    </span>
                    <div className="lz-rail-label" style={{ paddingTop: 4 }}>
                      {step.title}
                      <span className="lz-pill" style={{ textTransform: 'capitalize' }}>{step.kind}</span>
                      {screen && (
                        <Link to={`sections/${section?.id}/screen-designs/${screen.id}`} className="lz-link" style={{ marginLeft: 'auto' }}>
                          {screen.route}
                        </Link>
                      )}
                    </div>
                    <div className="lz-rail-body">
                      <p className="lz-muted" style={{ fontSize: 12.5, lineHeight: 1.55 }}>{step.detail}</p>
                      {index === flow.steps.length - 1 && (
                        <p className="lz-hint" style={{ marginTop: 6 }}>
                          Success: {flow.success} · Failure: {flow.failure}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="lz-sep" />
            <div className="lz-between">
              <div className="lz-row">
                <span className="lz-hint" style={{ marginTop: 0 }}>Entities</span>
                {flow.entities.map((e) => <span className="lz-pill mono" key={e}>{e}</span>)}
              </div>
              <span className="lz-hint" style={{ marginTop: 0 }}>
                {flow.steps.filter((s) => s.screenId).length} of {flow.steps.length} steps land on a real screen
              </span>
            </div>
          </Collapsible>
        ))}

        <div className="lz-card" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ font: '600 13.5px/1.3 var(--font)' }}>Iterate with a new flow</b>
            <p className="lz-hint" style={{ marginTop: 2 }}>
              A new flow is stored with the product, written into the wiki and committed with the next snapshot.
            </p>
          </div>
          <button className="lz-btn small" onClick={() => setAdding(true)}>
            <Icon name="Plus" size={13} /> Add flow
          </button>
        </div>

        <button className="lz-btn primary block" onClick={() => navigate('system')} style={{ minHeight: 46 }}>
          Continue to System <Icon name="ArrowRight" size={15} />
        </button>
      </div>

      {adding && <NewFlowModal project={project} onClose={() => setAdding(false)} onSave={(flow) => { addFlow(flow); setAdding(false); notify('Flow added to the prototype') }} />}
    </div>
  )
}

function NewFlowModal({
  project,
  onClose,
  onSave,
}: {
  project: Project
  onClose: () => void
  onSave: (flow: UserFlow) => void
}) {
  const [name, setName] = useState('')
  const [persona, setPersona] = useState(project.brief.personas[0]?.name ?? 'Primary user')
  const [goal, setGoal] = useState('')
  const [trigger, setTrigger] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [success, setSuccess] = useState('The record reaches its next state and the queue reflects it.')
  const [failure, setFailure] = useState('The user cannot tell whether the action worked.')

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))

  const save = () => {
    if (!name.trim() || picked.length === 0) return
    const steps: FlowStep[] = picked.map((screenId, index) => {
      const section = project.sections.find((s) => s.screens.some((sc) => sc.id === screenId))
      const screen = section?.screens.find((sc) => sc.id === screenId)
      return {
        id: `custom-${Date.now().toString(36)}-${index}`,
        title: screen?.name ?? 'Step',
        detail: screen?.intent ?? '',
        kind: index === 0 ? 'entry' : index === picked.length - 1 ? 'exit' : 'step',
        sectionId: section?.id,
        screenId,
      }
    })
    onSave({
      id: `flow-custom-${Date.now().toString(36)}`,
      name: name.trim(),
      persona,
      goal: goal.trim() || `Complete ${name.trim()}`,
      trigger: trigger.trim() || 'The user starts this job.',
      steps,
      entities: Array.from(new Set(picked.flatMap((id) => project.sections.flatMap((s) => s.screens).find((s) => s.id === id)?.entityIds ?? []))),
      success,
      failure,
      custom: true,
    })
  }

  return (
    <div className="lz-modal" role="dialog" aria-modal="true" aria-label="New flow" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lz-modal-card" style={{ width: 'min(680px, 100%)' }}>
        <div className="lz-modal-h">
          <h2>New user flow</h2>
          <button className="lz-modal-x" onClick={onClose} aria-label="Close"><Icon name="X" size={14} /></button>
        </div>

        <label className="lz-field">
          <span>Flow name</span>
          <input className="lz-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Refund a disputed order" autoFocus />
        </label>
        <div className="lz-cols-2">
          <label className="lz-field">
            <span>Persona</span>
            <select className="lz-input" value={persona} onChange={(e) => setPersona(e.target.value)}>
              {project.brief.personas.map((p) => <option key={p.name} value={p.name}>{p.name} — {p.role}</option>)}
            </select>
          </label>
          <label className="lz-field">
            <span>Trigger</span>
            <input className="lz-input" value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="A buyer disputes a charge" />
          </label>
        </div>
        <label className="lz-field">
          <span>Goal</span>
          <input className="lz-input" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Resolve it without leaving the queue" />
        </label>

        <Label>Steps — pick the screens this flow walks through</Label>
        <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 10, padding: 10, marginBottom: 14 }}>
          {project.sections.map((section) => (
            <div key={section.id} style={{ marginBottom: 10 }}>
              <p className="lz-cmd-label" style={{ marginBottom: 5 }}>{section.name}</p>
              {section.screens.map((screen) => (
                <label key={screen.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '3px 0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={picked.includes(screen.id)} onChange={() => toggle(screen.id)} />
                  {screen.name}
                  <span className="lz-hint" style={{ marginTop: 0 }}>{screen.route}</span>
                  {picked.includes(screen.id) && <span className="lz-pill green">step {picked.indexOf(screen.id) + 1}</span>}
                </label>
              ))}
            </div>
          ))}
        </div>

        <div className="lz-cols-2">
          <label className="lz-field">
            <span>Success</span>
            <input className="lz-input" value={success} onChange={(e) => setSuccess(e.target.value)} />
          </label>
          <label className="lz-field">
            <span>Failure</span>
            <input className="lz-input" value={failure} onChange={(e) => setFailure(e.target.value)} />
          </label>
        </div>

        <div className="lz-modal-foot">
          <button className="lz-btn" onClick={onClose}>Cancel</button>
          <button className="lz-btn primary" onClick={save} disabled={!name.trim() || picked.length === 0}>
            <Icon name="Route" size={14} /> Add flow
          </button>
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ font: '600 12.5px/1.2 var(--font)', color: 'var(--ink-2)', marginBottom: 7 }}>{children}</p>
}
