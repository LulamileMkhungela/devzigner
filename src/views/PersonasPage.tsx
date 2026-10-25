/**
 * Personas — who the product is for, and what each of them drives.
 *
 * A persona is only useful if it is attached to something: the flows it walks,
 * the sections it needs, the entities it touches. This page joins the three so
 * a persona cannot be a paragraph that nobody builds against. Everything shown
 * is compiled from the brief; nothing here is written twice.
 *
 * ProdOps — developed by Lulamile Mkhungela.
 */
import type { Project } from '../types'
import { TrackHeader } from '../components/ui'
import { Icon } from '../components/Icons'
import { Link } from '../lib/router'
import { TRACK } from './FlowsPage'

export function PersonasPage({ project }: { project: Project }) {
  const { personas } = project.brief

  // A persona's name is the join key the compiler uses when it writes a flow,
  // so the two can never disagree about who a flow is for.
  const flowsFor = (name: string) => project.flows.filter((flow) => flow.persona === name)

  const screensFor = (name: string) => {
    const screenIds = new Set(flowsFor(name).flatMap((flow) => flow.steps.map((step) => step.screenId).filter(Boolean)))
    return project.sections.flatMap((section) => section.screens.filter((screen) => screenIds.has(screen.id)))
  }

  return (
    <div className="lz-view">
      <TrackHeader
        project={project}
        steps={TRACK}
        current="personas"
        title="Personas"
        subtitle="Who the product is for, and what each of them actually runs into. Every persona is joined to the flows it walks and the screens those flows land on."
        actions={
          <Link to="flows" className="lz-btn small">
            <Icon name="Route" size={13} /> Flows
          </Link>
        }
      />

      <div className="lz-cols-2">
        {personas.map((persona, index) => {
          const flows = flowsFor(persona.name)
          const screens = screensFor(persona.name)
          const entities = [...new Set(flows.flatMap((flow) => flow.entities))]
          return (
            <section key={persona.name} className="lz-card" aria-label={`Persona: ${persona.name}`}>
              <div className="lz-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div className="lz-row" style={{ gap: 10, alignItems: 'center' }}>
                  <span className="lz-avatar" aria-hidden="true">{index + 1}</span>
                  <div>
                    <h3 style={{ margin: 0 }}>{persona.name}</h3>
                    <p className="lz-sub" style={{ margin: '2px 0 0' }}>{persona.role} · {persona.segment}</p>
                  </div>
                </div>
                <span className="lz-pill">{flows.length} {flows.length === 1 ? 'flow' : 'flows'}</span>
              </div>

              <dl className="lz-kv" style={{ marginTop: 12 }}>
                <div className="lz-kv-row">
                  <dt>Wants</dt>
                  <dd>{persona.goal}</dd>
                </div>
                <div className="lz-kv-row">
                  <dt>Hits</dt>
                  <dd>{persona.pain}</dd>
                </div>
              </dl>

              <p className="lz-quote">“{persona.quote}”</p>
              <p className="lz-sub" style={{ marginTop: 6 }}>
                Synthetic quote — what is true: {persona.quoteTruth}
              </p>

              <div className="lz-rule" />

              <p className="lz-cmd-label">Walks</p>
              {flows.length ? (
                <ul className="lz-bullets">
                  {flows.map((flow) => (
                    <li key={flow.id}>
                      <Link to={`flows`}>
                        {flow.name}
                      </Link>
                      <span className="lz-sub"> · {flow.steps.length} steps · {flow.trigger}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lz-sub">
                  No flow is tagged to this persona yet.{' '}
                  <Link to="flows">Add one on the Flows page</Link>.
                </p>
              )}

              <p className="lz-cmd-label" style={{ marginTop: 12 }}>Lands on</p>
              <p className="lz-sub">
                {screens.length
                  ? `${screens.length} screens across ${new Set(screens.map((s) => s.id)).size} routes — ${
                      entities.length ? entities.join(', ') : 'no entities'
                    }`
                  : 'No screens yet.'}
              </p>
            </section>
          )
        })}
      </div>

      <div className="lz-card">
        <h3>Who this is not for</h3>
        <p className="lz-sub">
          The brief commits to these exclusions so the roadmap does not grow silently:
        </p>
        <ul className="lz-bullets">
          {project.brief.nonGoals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
