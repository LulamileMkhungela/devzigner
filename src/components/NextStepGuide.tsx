/**
 * "What do I do next?"
 *
 * A rebuild replaces the product, and with it the five confirmations: every
 * stage goes back to unconfirmed because every stage was derived again. The
 * first version of this told the builder so in a toast — "every stage needs
 * confirming again" — and then vanished after two seconds, leaving them on a
 * page with a fresh product and no idea which of five stages to touch.
 *
 * So the guidance is a thing you can see and act on rather than a sentence you
 * can miss: a receipt that stays in the composer until it is used or dismissed,
 * saying how far along the product is, which stage is next, and carrying the
 * button that goes there. The stage is derived from the store (`nextStage`), so
 * this card can never point at a stage that is already confirmed.
 */
import { PHASES, completedPhases, nextStage } from '../lib/progress'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { Icon } from './Icons'

export function NextStepGuide({ onDismiss }: { onDismiss: () => void }) {
  const { active, captures } = useStore()
  // The first stage that is not confirmed — the one thing to do next.
  const stage = nextStage(active, captures)
  // completedPhases is a map of phase id → done, so count the trues.
  const doneMap = completedPhases(active, captures)
  const done = Object.values(doneMap).filter(Boolean).length
  const to = `/p/${active.id}${stage.path ? `/${stage.path}` : ''}`

  return (
    <div className="lz-guide" role="status" aria-live="polite">
      <div className="lz-guide-head">
        <span className="lz-guide-step mono">{`${done} of ${PHASES.length} confirmed`}</span>
        <p>
          <b>Built.</b> Everything below was derived from this description, so each stage needs confirming once — a
          tick only appears when the stage is finished. Start at <b>{stage.label}</b>: it has one action and one next
          button.
        </p>
      </div>
      <ol className="lz-guide-road" aria-label="Stage progress">
        {PHASES.map((phase, index) => {
          const finished = Boolean(doneMap[phase.id])
          return (
            <li key={phase.id} className={finished ? 'done' : phase.id === stage.id ? 'now' : ''}>
              <span className="mono">{finished ? '✓' : index + 1}</span> {phase.label}
              {phase.id === stage.id && <span className="lz-sr"> — next</span>}
            </li>
          )
        })}
      </ol>
      <div className="lz-guide-actions">
        <button className="lz-btn primary" type="button" onClick={() => navigate(to)}>
          Confirm {stage.label} <Icon name="ArrowRight" size={13} />
        </button>
        <button className="lz-btn quiet" type="button" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  )
}
