// ProdOps — developed by Lulamile Mkhungela.
//
// What a stage looks like before there is a product.
//
// The workspace used to open on a finished sample product, so every stage was
// full of somebody else's artefacts: six sections, a design system, screens,
// sample rows, a prototype. A stage with no product in it now says what it will
// hold and where the product comes from — in one line, not a paragraph — and
// keeps its how-to steps, because the steps are how the stage gets filled.

import { Link } from '../lib/router'
import { StepGuide } from './StepGuide'
import type { GuidePhase } from './StepGuide'
import { Icon } from './Icons'

export function AwaitingDescription({
  stage,
  title,
  subtitle,
  willHold,
  guide,
}: {
  /** The stage's name, for the header. */
  stage: string
  title: string
  subtitle: string
  /** What this stage writes, once there is a product to write it for. */
  willHold: string[]
  /** The stage's how-to, so the page still teaches the work. */
  guide?: GuidePhase
}) {
  return (
    <div className="lz-view">
      <div className="lz-pagehead">
        <div className="lz-head">
          <div>
            <p className="lz-cmd-label">{stage}</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="lz-card lz-awaiting">
        <div className="lz-awaiting-ic">
          <Icon name="PenLine" size={20} />
        </div>
        <div>
          <h2>Nothing here yet</h2>
          <p>This stage is written from your description. Nothing is stored until you write it.</p>
          <ul className="lz-awaiting-list">
            {willHold.map((item) => (
              <li key={item}>
                <Icon name="Check" size={12} strokeWidth={2.6} />
                {item}
              </li>
            ))}
          </ul>
          <div className="lz-row" style={{ gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <Link to="" className="lz-btn primary">
              <Icon name="Sparkles" size={13} /> Describe the product
            </Link>
          </div>
        </div>
      </div>

      {guide && <StepGuide phase={guide} />}
    </div>
  )
}
