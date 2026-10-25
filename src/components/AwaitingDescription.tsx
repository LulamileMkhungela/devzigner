// ProdOps — developed by Lulamile Mkhungela.
//
// What a stage looks like before there is a product.
//
// The workspace used to open on a finished sample product, so every stage was
// full of somebody else's artefacts: six sections, a design system, screens,
// sample rows, a prototype. The complaint was exact — "I don't want dummy, it
// must be items I have requested" — so a stage with no product in it now says
// what it will hold and where the product comes from, and shows nothing else.
//
// It is deliberately not an error and not a spinner: this is the true state of
// a workspace with no description in it, so the page names the stage, lists the
// artefacts it will write, and offers the one action that fills it.

import { Link } from '../lib/router'
import { useStore } from '../lib/store'
import { Icon } from './Icons'

export function AwaitingDescription({
  stage,
  title,
  subtitle,
  willHold,
}: {
  /** The stage's name, for the header. */
  stage: string
  title: string
  subtitle: string
  /** What this stage writes, once there is a product to write it for. */
  willHold: string[]
}) {
  const { active } = useStore()

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
          <h2>Nothing here yet — and nothing invented to fill it.</h2>
          <p>
            ProdOps writes this stage from the product you describe. There is no sample to browse, because a
            sample is not your product: every row, section and screen you see from here on comes from your own
            words.
          </p>
          <p className="lz-awaiting-label">Once you describe the product, this stage holds:</p>
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
            <Link to="tools" className="lz-btn small">
              <Icon name="Sparkles" size={13} /> Or start from the toolkit
            </Link>
          </div>
          <p className="lz-awaiting-note">
            {active.idea
              ? 'You have written a description; it is on the Product stage.'
              : 'Nothing is stored for this stage until then, and nothing is sent anywhere.'}
          </p>
        </div>
      </div>
    </div>
  )
}
