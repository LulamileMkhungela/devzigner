/**
 * Where the builder says what they want built.
 *
 * This is the first action in the product, and it is deliberately a plain
 * textarea rather than a wizard: ProdOps's first command asks what the product
 * is for and who it is for, in prose. The placeholder shows the shape of a good
 * answer, the checklist says what a complete answer contains, and the reader
 * underneath says what the compiler understood *before* anything is rebuilt —
 * so nobody has to guess what the field does.
 *
 * Nothing here calls a model. The compiler reads the text by rules, which is why
 * the answer can be edited and rebuilt as often as you like.
 *
 * Rebuilding resets the five confirmations, which used to be announced by a
 * toast that vanished before anyone could act on it: the builder was told that
 * something had changed and nothing about what to do. So a build now leaves a
 * receipt in place — what was read, what the next stage is, and the button that
 * goes there — which stays until it is used or dismissed.
 */
import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { nextStage } from '../lib/progress'
import { describeIntake, profileIdea } from '../engine/intake'
import { Icon } from './Icons'
import { NextStepGuide } from './NextStepGuide'

/**
 * Four starting points, each an example of a *complete* answer rather than a
 * category. The label is short on purpose: a chip that repeats the whole
 * sentence is unreadable in a row of four.
 */
const EXAMPLES: { label: string; text: string }[] = [
  {
    label: 'Mobile grooming',
    text: 'A booking tool for mobile dog groomers: owners pick a slot, the groomer sees the day route, and payment is taken on arrival. It has to work on a phone, offline.',
  },
  {
    label: 'Clinic front desk',
    text: 'A clinic front desk that registers patients, books appointments, and keeps each visit’s notes and invoice in one place. Reception must not need a manual.',
  },
  {
    label: 'Artisan marketplace',
    text: 'A marketplace where township artisans list products, buyers pay into escrow, and disputes pause the payout until they are resolved.',
  },
  {
    label: 'Volunteer roster',
    text: 'A tool for scheduling volunteer shifts at a food bank: staff publish the roster, volunteers swap shifts, and hours are logged for funders.',
  },
]

const GUIDANCE = [
  { do: 'Name the problem', detail: 'what is broken today, and for whom' },
  { do: 'Say who uses it', detail: 'the one person whose day it changes' },
  { do: 'State the must-haves', detail: 'the two or three things it has to do' },
]

export function BriefComposer() {
  const { active, setBrief, notify } = useStore()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  /** Set by a successful build; cleared by going to the next stage or closing it. */
  const [built, setBuilt] = useState(false)

  const trimmed = value.trim()
  const words = trimmed ? trimmed.split(/\s+/).length : 0
  const ready = trimmed.length >= 24
  const preview = useMemo(() => profileIdea(trimmed), [trimmed])
  const current = useMemo(() => profileIdea(active.idea), [active.idea])

  const build = () => {
    if (!ready || busy) return
    setBusy(true)
    try {
      const rebuilt = setBrief(trimmed)
      setBuilt(true)
      // The card below is the lasting answer; the toast is the short version of
      // it. Both point at the same stage, computed from the *rebuilt* project
      // and an empty capture list — the rebuild cleared every confirmation, so
      // the next stage is the first one, and the button says so.
      const first = nextStage(rebuilt, [])
      notify('Brief rebuilt — confirm the stages, starting with ' + first.label, {
        label: 'Open ' + first.label,
        to: `/p/${rebuilt.id}${first.path ? `/${first.path}` : ''}`,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="lz-card lz-compose" aria-labelledby="compose-title">
      <div className="lz-compose-head">
        <div>
          <p className="lz-compose-kicker">Your brief</p>
          <h2 id="compose-title">What do you want built?</h2>
        </div>
        <span className="lz-compose-count mono">{words} words</span>
      </div>

      <p className="lz-compose-lede">
        The problem in your own words: what is broken, who it is for, what it must do. Two sentences is enough.
      </p>

      {/* Nothing to report before the first build: "Currently building Untitled
          product · Not started" was a line of noise above an empty field. */}
      {active.idea && (
        <p className="lz-compose-current">
          Building <b>{active.name}</b>
          <span> · {active.archetypeLabel}</span>
          <span className="lz-compose-current-idea" title={active.idea}>
            {' — “'}
            {active.idea.length > 96 ? `${active.idea.slice(0, 93).trimEnd()}…` : active.idea}
            {'”'}
          </span>
        </p>
      )}

      <label className="lz-compose-field">
        <span className="sr-only">Describe the product you want built</span>
        <textarea
          className="lz-input"
          rows={4}
          value={value}
          placeholder="e.g. A booking tool for mobile dog groomers — owners choose a slot, the groomer sees the day's route, payment is taken on arrival. It has to work on a phone, offline, and show today's takings."
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') build()
          }}
        />
      </label>

      <div className="lz-compose-foot">
        <ul className="lz-compose-guide">
          {GUIDANCE.map((item) => (
            <li key={item.do}>
              <b>{item.do}</b> — {item.detail}
            </li>
          ))}
        </ul>
        <button
          className="lz-btn primary"
          type="button"
          onClick={build}
          disabled={!ready || busy}
          title="Build from this description (⌘↵)"
        >
          <Icon name="Sparkles" size={13} />
          Build from this
        </button>
      </div>

      {ready ? (
        <p className="lz-compose-read">
          <Icon name="Sparkles" size={12} /> The compiler will read this as: <b>{describeIntake(preview)}</b>
          {!preview.archetypeId && ' — add what kind of product it is and who it serves.'}
        </p>
      ) : (
        <p className="lz-compose-hint">
          <Icon name="AlertTriangle" size={12} /> Write at least a sentence — what it is, who it is for, what it must do.
        </p>
      )}

      <div className="lz-compose-examples">
        <span>Or start from an example:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example.label}
            type="button"
            className="lz-compose-example"
            onClick={() => setValue(example.text)}
            title={example.text}
          >
            {example.label}
          </button>
        ))}
      </div>

      {built && <NextStepGuide onDismiss={() => setBuilt(false)} />}

      {current.used && (
        <p className="lz-compose-note">
          The product below came from a description the compiler read as {describeIntake(current).replace(/^reads as a /, '')}.
          Rewriting the field above replaces it — the name, the data shape and the sections are all derived again.
        </p>
      )}
    </section>
  )
}
