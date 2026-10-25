/**
 * A tick is earned, not compiled.
 *
 * The compiler can finish a stage's artefacts on its own, but a stage is only
 * *done* once the builder has looked at it and said so. This control makes that
 * explicit: it says what is still missing while the artefacts are incomplete,
 * offers the confirmation when they are, and can be undone when something is
 * changed afterwards.
 */
import { useStore } from '../lib/store'
import { phaseBlockers, phaseIndex, phaseReady, PHASES } from '../lib/progress'
import { Icon } from './Icons'
import type { GuidePhase } from './StepGuide'

export function StageConfirm({ phase }: { phase: GuidePhase }) {
  const { active, captures, confirmed, confirmStage, unconfirmStage, notify } = useStore()
  const ready = phaseReady(active, captures, phase)
  const done = confirmed.includes(phase)
  const blockers = phaseBlockers(active, captures, phase)
  const index = phaseIndex(phase)
  const next = PHASES[index + 1]

  if (done) {
    return (
      <div className="lz-stage-done" role="status">
        <span className="lz-stage-badge">
          <Icon name="Check" size={12} strokeWidth={3} /> Stage {index + 1} complete
        </span>
        <span className="lz-stage-next">
          {next ? (
            <>
              Next: <b>{next.label}</b>
            </>
          ) : (
            'Every stage is confirmed — the package is ready to hand over.'
          )}
        </span>
        <button
          className="lz-btn small quiet"
          type="button"
          onClick={() => {
            unconfirmStage(phase)
            notify(`${PHASES[index].label} reopened`)
          }}
        >
          Reopen
        </button>
      </div>
    )
  }

  return (
    <div className={`lz-stage${ready ? ' is-ready' : ''}`}>
      <div className="lz-stage-main">
        {ready ? (
          <>
            <b>Everything this stage needs is here.</b>
            <span>Review it above, then tick it off — the tick is what marks the stage done.</span>
          </>
        ) : (
          <>
            <b>Not ready to complete yet.</b>
            <span>{blockers.join(' · ')}</span>
          </>
        )}
      </div>
      <button
        className="lz-btn primary small"
        type="button"
        disabled={!ready}
        onClick={() => {
          confirmStage(phase)
          notify(`${PHASES[index].label} marked complete`)
        }}
      >
        <Icon name="Check" size={13} strokeWidth={3} /> Mark stage complete
      </button>
    </div>
  )
}
