// ProdOps — developed by Lulamile Mkhungela.
//
// "Is this what I asked for?"
//
// The Product stage compiles a brief from one sentence, so it has to show its
// working. This panel is that working: the words the compiler read, the gaps it
// could not answer, and every section the archetype pack offered — kept with a
// reason, or left out with a one-click way to add it. Nothing here is decorative
// and nothing is read-only: each row toggles the real compile input, so the
// roadmap, the screens, the prototype and the export all follow.

import { useMemo } from 'react'
import type { Project } from '../types'
import { useStore } from '../lib/store'
import { profileIdea, intakeGaps } from '../engine/intake'

const MAX_GAPS = 3

export function ScopeReview({ project }: { project: Project }) {
  const { setSectionScope, notify } = useStore()
  const intake = useMemo(() => profileIdea(project.idea ?? ''), [project.idea])
  const decisions = project.scope ?? []
  const kept = decisions.filter((d) => d.included)
  const dropped = decisions.filter((d) => !d.included)
  const gaps = intakeGaps(intake, project.idea ?? '').slice(0, MAX_GAPS)
  const matched = intake.matched.slice(0, 5)

  const toggle = (id: string, included: boolean, name: string) => {
    setSectionScope(id, included)
    notify(included ? `${name} added to the scope` : `${name} removed from the scope`)
  }

  return (
    <section className="lz-card lz-scope" aria-labelledby="scope-title">
      <div className="lz-scope-head">
        <div>
          <p className="lz-cmd-label">What the compiler read</p>
          <h2 id="scope-title">Check this before you go on</h2>
        </div>
        <span className="lz-pill">
          {kept.length} of {decisions.length} offered
        </span>
      </div>

      <dl className="lz-scope-read">
        <div>
          <dt>Reads as</dt>
          <dd>{intake.archetypeId ? project.archetypeLabel : 'Not recognised'}</dd>
        </div>
        <div>
          <dt>For</dt>
          <dd>{intake.actor || '— not said yet'}</dd>
        </div>
        <div>
          <dt>Tracks</dt>
          <dd>{intake.object || '— not said yet'}</dd>
        </div>
        <div>
          <dt>Name</dt>
          <dd>{project.name}</dd>
        </div>
      </dl>

      {matched.length > 0 && (
        <p className="lz-scope-evidence">
          Words it used:{' '}
          {matched.map((word) => (
            <span key={word} className="lz-scope-word">
              {word}
            </span>
          ))}
        </p>
      )}

      {gaps.length > 0 && (
        <div className="lz-scope-ask">
          <p className="lz-cmd-label">Your brief does not answer yet</p>
          <ul>
            {gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
          <p className="lz-scope-ask-note">
            Answer these above, then recompile. All five stages change with them.
          </p>
        </div>
      )}

      <div className="lz-scope-list">
        <p className="lz-cmd-label">Sections in this product</p>
        <ul>
          {kept.map((decision) => {
            const section = project.sections.find((s) => s.id === decision.id)
            return (
              <li key={decision.id} className="lz-scope-row">
                <div>
                  <b>{decision.name}</b>
                  <span>{decision.why}</span>
                </div>
                <span className="lz-scope-meta mono">
                  {section ? `${section.screens.length} screens · ${section.requirements.length} reqs` : 'compiled'}
                </span>
                <button
                  type="button"
                  className="lz-btn small lz-scope-remove"
                  onClick={() => toggle(decision.id, false, decision.name)}
                  aria-label={`Remove ${decision.name} from the scope`}
                >
                  Remove
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {dropped.length > 0 && (
        <div className="lz-scope-list lz-scope-out">
          <p className="lz-cmd-label">Not in your brief — add if you want it</p>
          <ul>
            {dropped.map((decision) => (
              <li key={decision.id} className="lz-scope-row">
                <div>
                  <b>{decision.name}</b>
                  <span>{decision.why}</span>
                </div>
                <button
                  type="button"
                  className="lz-btn small"
                  onClick={() => toggle(decision.id, true, decision.name)}
                  aria-label={`Add ${decision.name} to the scope`}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
