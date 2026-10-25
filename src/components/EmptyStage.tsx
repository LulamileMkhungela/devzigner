import { PhaseHeader } from './ui'
import { StepGuide } from './StepGuide'
import { Link } from '../lib/router'
import type { Project } from '../types'
import type { GuidePhase } from './StepGuide'

/**
 * A stage with nothing behind it.
 *
 * Four of the five stages describe artefacts that are derived from the
 * description: the entities, the tokens, the sections, the package. With no
 * description there is no artefact, and the page used to show the archetype's
 * own design system and schema anyway — somebody else's product, visible before
 * the builder had said a word. The stage keeps its how-to steps and says what it
 * is waiting for, and nothing else.
 */
export function EmptyStage({
  project,
  current,
  title,
  waiting,
}: {
  project: Project
  current: GuidePhase
  title: string
  /** What this stage will hold, in the builder's terms. */
  waiting: string
}) {
  return (
    <div className="lz-view">
      <PhaseHeader project={project} current={current} title={title} subtitle="Compiled from your description." />
      <div className="lz-card lz-empty-stage">
        <h2>Nothing compiled yet</h2>
        <p>{waiting}</p>
        <Link className="lz-btn primary" to="/">
          Describe the product
        </Link>
      </div>
      <StepGuide phase={current} />
    </div>
  )
}
