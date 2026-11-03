// ProdOps — developed by Lulamike Mkhungela.
//
// The role chrome: project history, the role picker, the process rail in the
// left panel, the inspector in the right panel, and the gate that keeps a role
// from opening another role's pages.
//
// The shape is the IDE layout kept simple: left panel = the process (grouped by
// the role's disciplines), centre = the step's work, right panel = the
// inspector with the clarifying questions, the documents the step writes, the
// reference material (PDF, images, links) and the three review actions that
// every role shares: approved, rejected, can proceed but needs a revisit.

import { useMemo, useState, type ReactNode } from 'react'
import { useStore } from '../lib/store'
import { Link, navigate } from '../lib/router'
import { Icon } from './Icons'
import { useOutsideClose } from './ui'
import { timeAgo } from '../lib/format'
import {
  ROLES,
  answerKey,
  artifactFor,
  nextRoleStep,
  reviewKey,
  roleAllows,
  roleById,
  roleProgress,
  roleSkill,
  stepAnswers,
  stepQuestionsAnswered,
  stepReview,
  stepState,
  trackOf,
  trackSteps,
  type RoleDef,
  type RoleStep,
  type ReviewDecision,
} from '../lib/roles'

/* -------------------------------------------------------------------------
   project history dropdown
   ------------------------------------------------------------------------- */

/**
 * Every project this browser has ever held, as a dropdown in the rail. Not
 * every project is new: click one and the workspace pulls all of its data —
 * brief, stages, role, reviews, answers, saved specs — because a project record
 * is the whole workspace state for that product.
 */
export function ProjectsMenu() {
  const { projects, active, setActive, remove, newProject, notify } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose(() => setOpen(false))
  return (
    <div className="lz-dd" ref={ref}>
      <button
        type="button"
        className="lz-dd-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Workspace projects — click to open a previous one"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="History" size={14} />
        <span className="lz-dd-label">{active.name}</span>
        <Icon name="ChevronDown" size={13} className="lz-dd-caret" />
      </button>
      {open && (
        <div className="lz-dd-menu" role="menu" aria-label="Workspace projects">
          <p className="lz-dd-head">Workspace projects · {projects.length}</p>
          {projects.map((p) => (
            <div key={p.id} className={`lz-dd-item${p.id === active.id ? ' is-active' : ''}`} role="menuitem">
              <button
                type="button"
                className="lz-dd-item-open"
                onClick={() => {
                  setActive(p.id)
                  setOpen(false)
                  navigate('')
                  notify(`Opened “${p.name}” — all of its data is loaded`)
                }}
              >
                <span className="lz-dd-item-name">{p.name}</span>
                <span className="lz-dd-item-meta">
                  {p.archetypeLabel}
                  {p.roleId ? ` · ${roleById(p.roleId)?.tag ?? p.roleId}` : ''}
                  {p.artifacts?.length ? ` · ${p.artifacts.length} docs` : ''} · {timeAgo(p.updatedAt)}
                </span>
              </button>
              {p.id === active.id && <Icon name="Check" size={12} strokeWidth={3} />}
              {projects.length > 1 && (
                <button
                  type="button"
                  className="lz-dd-remove"
                  aria-label={`Remove ${p.name}`}
                  title="Remove from history"
                  onClick={() => {
                    remove(p.id)
                    notify(`Removed “${p.name}” from the history`)
                  }}
                >
                  <Icon name="X" size={11} />
                </button>
              )}
            </div>
          ))}
          <hr />
          <button
            type="button"
            className="lz-dd-new"
            role="menuitem"
            onClick={() => {
              newProject()
              setOpen(false)
              navigate('')
              notify('New project — describe it to start')
            }}
          >
            <Icon name="Plus" size={13} /> New project
          </button>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------
   role picker — the primary role, plus any other roles engaged
   ------------------------------------------------------------------------- */

export function RolePicker() {
  const { active, setRole, toggleRole, notify } = useStore()
  const role = roleById(active.roleId)
  const extras = (active.roles ?? []).filter((id) => id !== active.roleId)
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose(() => setOpen(false))
  const label = role ? (extras.length ? `${role.name} +${extras.length}` : role.name) : 'All stages'
  return (
    <div className="lz-dd" ref={ref}>
      <button
        type="button"
        className="lz-dd-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        title="The role this workspace runs as — each role owns its process start to finish"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={role?.icon ?? 'Layers'} size={14} />
        <span className="lz-dd-label">{label}</span>
        <Icon name="ChevronDown" size={13} className="lz-dd-caret" />
      </button>
      {open && (
        <div className="lz-dd-menu lz-dd-menu-wide" role="menu" aria-label="Workspace role">
          <p className="lz-dd-head">Run this workspace as</p>
          <button
            type="button"
            role="menuitem"
            className={`lz-dd-role${role ? '' : ' is-active'}`}
            onClick={() => {
              setRole(null)
              setOpen(false)
              navigate('')
              notify('All five stages — no role scoping')
            }}
          >
            <Icon name="Layers" size={14} />
            <span>
              <b>All five stages</b>
              <small>The full flow: product → data → design → sections → export.</small>
            </span>
            {!role && <Icon name="Check" size={12} strokeWidth={3} />}
          </button>
          {ROLES.map((r) => {
            const isPrimary = role?.id === r.id
            const isExtra = extras.includes(r.id)
            return (
              <div key={r.id} className="lz-dd-role-row">
                <button
                  type="button"
                  role="menuitem"
                  className={`lz-dd-role${isPrimary ? ' is-active' : ''}`}
                  onClick={() => {
                    setRole(r.id)
                    setOpen(false)
                    navigate(`role/${nextRoleStep(active, r).id}`)
                    notify(`${r.name} — the rail now shows the ${r.processLabel.toLowerCase()}`)
                  }}
                >
                  <Icon name={r.icon} size={14} />
                  <span>
                    <b>{r.name}</b>
                    <small>
                      {r.processLabel.toLowerCase()} · {r.steps.length} steps
                    </small>
                  </span>
                  {isPrimary && <Icon name="Check" size={12} strokeWidth={3} />}
                </button>
                {role && !isPrimary && (
                  <button
                    type="button"
                    className={`lz-dd-add${isExtra ? ' is-on' : ''}`}
                    aria-pressed={isExtra}
                    title={isExtra ? `Remove ${r.name} from this project` : `Also run ${r.name} on this project`}
                    aria-label={isExtra ? `Remove ${r.name}` : `Add ${r.name}`}
                    onClick={() => {
                      toggleRole(r.id)
                      notify(isExtra ? `${r.name} removed from this project` : `${r.name} added — its process is now part of this project`)
                    }}
                  >
                    <Icon name={isExtra ? 'Check' : 'Plus'} size={11} />
                  </button>
                )}
              </div>
            )
          })}
          <p className="lz-dd-note">
            Roles scope the <b>process</b> per project, not people. A project can run several roles — each keeps its own
            steps, reviews and spec folder.
          </p>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------
   the process rail (left panel)
   ------------------------------------------------------------------------- */

const STATE_ICON: Record<string, string> = {
  approved: 'Check',
  rejected: 'X',
  'proceed-revisit': 'Flag',
}

/**
 * The role's process in the left panel: under the role name, the
 * "BUSINESS ANALYSIS PROCESS · 6 STEPS" label, then every discipline and its
 * numbered steps from start to finish with their review state, and the next
 * step named at the bottom.
 */
export function RoleNav({
  role,
  activeStepId,
  extras = [],
}: {
  role: RoleDef
  activeStepId?: string
  extras?: RoleDef[]
}) {
  const { active } = useStore()
  const progress = roleProgress(active, role)
  const next = nextRoleStep(active, role)
  const nextIndex = role.steps.findIndex((s) => s.id === next.id)

  return (
    <div className="lz-role">
      <div className="lz-role-head">
        <Icon name={role.icon} size={15} />
        <span className="lz-role-name">{role.name}</span>
        <span className="lz-mode-chip">{role.tag}</span>
      </div>
      <p className="lz-nav-label lz-process-label">{role.processLabel}</p>

      {role.tracks.map((track) => {
        const steps = trackSteps(role, track)
        const approved = steps.filter((s) => stepState(active, role, s) === 'approved').length
        return (
          <div className="lz-role-track" key={track.id}>
            <p className="lz-role-track-head">
              <Icon name={track.icon} size={12} />
              <span>{track.label}</span>
              <span className="lz-role-track-count">
                {approved}/{steps.length}
              </span>
            </p>
            {steps.map((step) => {
              const state = stepState(active, role, step)
              const isActive = step.id === activeStepId
              const index = role.steps.findIndex((s) => s.id === step.id)
              const answered = stepQuestionsAnswered(active, role, step)
              return (
                <Link
                  key={step.id}
                  to={`role/${step.id}`}
                  className={`lz-nav-item lz-role-step${isActive ? ' is-active' : ''}`}
                  data-state={state}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={`lz-step-n${state !== 'todo' && state !== 'ready' ? ' has-state' : ''}`}>
                    {STATE_ICON[state] ? (
                      <Icon name={STATE_ICON[state]} size={11} strokeWidth={2.6} />
                    ) : state === 'ready' ? (
                      <span className="lz-nav-dot" aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="lz-nav-label-text">{step.title}</span>
                  {answered < step.questions.length && (
                    <span className="lz-role-q-count" title={`${answered} of ${step.questions.length} questions answered`}>
                      ?
                    </span>
                  )}
                  {state === 'approved' && <span className="lz-badge">approved</span>}
                  {state === 'rejected' && <span className="lz-badge danger">rejected</span>}
                  {state === 'proceed-revisit' && <span className="lz-badge warn">revisit</span>}
                </Link>
              )
            })}
          </div>
        )
      })}

      <div className="lz-rail-progress">
        <span className="lz-rail-progress-label">
          {progress.approved} of {progress.total} steps approved
        </span>
        <span className="lz-meter" aria-hidden="true">
          <span className="lz-meter-fill" style={{ width: `${(progress.approved / progress.total) * 100}%` }} />
        </span>
      </div>
      <p className="lz-role-next">
        Next: <b>{next.title}</b>
        <Link to={`role/${next.id}`} className="lz-role-next-go" aria-label={`Go to step ${nextIndex + 1} · ${next.title}`}>
          Step {nextIndex + 1} <Icon name="ArrowRight" size={12} />
        </Link>
      </p>

      {extras.length > 0 && (
        <div className="lz-role-extras">
          <p className="lz-nav-label">Also running</p>
          {extras.map((extra) => {
            const p = roleProgress(active, extra)
            const first = nextRoleStep(active, extra)
            return (
              <Link key={extra.id} to={`role/${first.id}`} className="lz-role-extra">
                <Icon name={extra.icon} size={13} />
                <span>{extra.name}</span>
                <span className="lz-role-extra-count">
                  {p.approved}/{p.total}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------
   reference material — PDF, images and links the builder brings in
   ------------------------------------------------------------------------- */

function kindOf(file: File): 'image' | 'pdf' | 'doc' {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type === 'application/pdf') return 'pdf'
  return 'doc'
}

/** Bring a PDF, an image or a link into the workspace so every role can cite it. */
export function ReferenceIntake({ compact = false }: { compact?: boolean }) {
  const { active, addReference, removeReference, notify } = useStore()
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')
  const references = active.references ?? []

  const readFile = async (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      notify(`${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB — keep references under 4MB`)
      return
    }
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    addReference({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, kind: kindOf(file), data, note: note.trim() || undefined })
    notify(`${file.name} attached as a reference`)
    setNote('')
  }

  return (
    <div className={`lz-ref${compact ? ' is-compact' : ''}`}>
      <div className="lz-ref-head">
        <Icon name="FolderOpen" size={13} />
        <b>References</b>
        <span className="lz-ref-count">{references.length}</span>
      </div>
      <p className="lz-hint">
        A PDF, a screenshot, a research deck, a Figma link — anything a role should read before it writes.
      </p>
      <label className="lz-ref-drop">
        <input
          type="file"
          accept="application/pdf,image/*,.md,.txt,.doc,.docx"
          aria-label="Attach a reference file"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void readFile(file)
            e.target.value = ''
          }}
        />
        <Icon name="Plus" size={12} /> Attach PDF, image or document
      </label>
      <div className="lz-ref-link">
        <input
          type="text"
          placeholder="…or paste a link (Figma, Notion, a PDF URL)"
          aria-label="Reference link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <button
          type="button"
          className="lz-btn small"
          disabled={!link.trim()}
          onClick={() => {
            const url = link.trim()
            addReference({
              name: url.replace(/^https?:\/\//, '').slice(0, 60),
              type: 'text/uri-list',
              size: 0,
              kind: 'link',
              data: /^https?:\/\//.test(url) ? url : `https://${url}`,
              note: note.trim() || undefined,
            })
            setLink('')
            setNote('')
            notify('Link added as a reference')
          }}
        >
          Add
        </button>
      </div>
      {references.length > 0 && (
        <ul className="lz-ref-list">
          {references.map((reference) => (
            <li key={reference.id} className={`lz-ref-item is-${reference.kind}`}>
              <Icon
                name={reference.kind === 'image' ? 'Image' : reference.kind === 'pdf' ? 'FileText' : reference.kind === 'link' ? 'ExternalLink' : 'FileCode'}
                size={12}
              />
              {reference.kind === 'link' ? (
                <a href={reference.data} target="_blank" rel="noreferrer noopener">
                  {reference.name}
                </a>
              ) : (
                <a href={reference.data} download={reference.name}>
                  {reference.name}
                </a>
              )}
              {reference.kind === 'image' && <img src={reference.data} alt="" className="lz-ref-thumb" />}
              <button
                type="button"
                className="lz-ref-remove"
                aria-label={`Remove ${reference.name}`}
                onClick={() => removeReference(reference.id)}
              >
                <Icon name="X" size={10} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------
   the inspector (right panel)
   ------------------------------------------------------------------------- */

const DECISIONS: { id: ReviewDecision; label: string; icon: string; hint: string }[] = [
  { id: 'approved', label: 'Approve', icon: 'Check', hint: 'This step is done and the next one can start.' },
  { id: 'rejected', label: 'Reject', icon: 'X', hint: 'This step is not right — rework it before moving on.' },
  { id: 'proceed-revisit', label: 'Proceed — revisit', icon: 'Flag', hint: 'Good enough to move on, but flagged to come back to.' },
]

/**
 * The right-hand panel on a role step: what the step decides, the clarifying
 * questions it asks (an answer is required before approval), the documents it
 * writes into the spec folder, the project's references, the three review
 * actions, what is next, and the role's skill with an optional integrate toggle.
 */
export function RoleInspector({ role, step }: { role: RoleDef; step: RoleStep }) {
  const {
    active,
    reviewStep,
    reviewStepAndSave,
    toggleSkill,
    setAnswer,
    saveStepDocuments,
    saveDocument,
    removeArtifact,
    notify,
  } = useStore()
  const review = stepReview(active, role, step)
  const ready = step.ready(active)
  const blockers = step.blockers(active)
  const next = nextRoleStep(active, role)
  const nextIsThis = next.id === step.id
  const skill = roleSkill(role)
  const integrated = (active.integratedSkills ?? []).includes(skill.toolId)
  const [note, setNote] = useState(review?.note ?? '')
  const [showRefs, setShowRefs] = useState(false)
  const index = role.steps.findIndex((s) => s.id === step.id)
  const track = trackOf(role, step)
  const answers = stepAnswers(active, role, step)
  const answered = answers.filter((a) => a.trim().length > 0).length
  const allAnswered = answered === step.questions.length
  const references = active.references ?? []
  const documents = useMemo(() => step.deliverables, [step])

  const decide = (decision: ReviewDecision, label: string) => {
    if (decision === 'approved' && !allAnswered) {
      notify(`Answer the ${step.questions.length - answered} remaining question${step.questions.length - answered === 1 ? '' : 's'} before approving`)
      return
    }
    if (decision !== 'rejected' && step.deliverables.length > 0) {
      // Approving a step is what saves its documents: the decision and the
      // written record travel together, into `spec/<role>/`, in one update.
      const saved = reviewStepAndSave(role.id, step.id, decision, note.trim() || undefined)
      notify(
        `${label} — ${step.title} · ${saved.length} document${saved.length === 1 ? '' : 's'} saved to spec/${role.id}/`,
        { label: 'See the specs', to: 'specs' },
      )
      return
    }
    reviewStep(reviewKey(role.id, step.id), decision, note.trim() || undefined)
    notify(`${label} — step ${index + 1} · ${step.title}`)
  }

  return (
    <aside className="lz-inspector" aria-label={`${role.name} step details`}>
      <div className="lz-card lz-insp-step">
        <p className="lz-nav-label">
          {role.processLabel}
          {track ? ` · ${track.label}` : ''}
        </p>
        <h2>
          <span className="mono lz-insp-n">
            {index + 1}/{role.steps.length}
          </span>{' '}
          {step.title}
        </h2>
        <p className="lz-insp-decides">{step.decides}</p>
        <ul className="lz-insp-produces">
          {step.produces.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {ready ? (
          <p className="lz-insp-ready">
            <Icon name="CircleCheck" size={13} /> The artefacts for this step are here — ready to review.
          </p>
        ) : (
          <p className="lz-insp-ready no">{blockers.join(' · ')}</p>
        )}
      </div>

      <div className="lz-card lz-insp-questions">
        <p className="lz-nav-label">
          Clarifying questions · {answered}/{step.questions.length}
        </p>
        {step.questions.map((question, i) => {
          const key = answerKey(role.id, step.id, i)
          const value = answers[i] ?? ''
          return (
            <label className="lz-insp-q" key={key}>
              <span className="lz-insp-q-text">{question.question}</span>
              <textarea
                rows={2}
                value={value}
                placeholder={question.why}
                aria-label={question.question}
                onChange={(e) => setAnswer(key, e.target.value)}
              />
              <span className="lz-insp-q-why">{question.why}</span>
            </label>
          )
        })}
        {!allAnswered && (
          <p className="lz-insp-q-gate">
            <Icon name="AlertTriangle" size={12} /> Appointing requires every answer. {step.questions.length - answered} left.
          </p>
        )}
      </div>

      <div className="lz-card lz-insp-docs">
        <p className="lz-nav-label">Writes into the spec folder</p>
        <ul className="lz-doc-list">
          {documents.map((document) => {
            const saved = artifactFor(active, role.id, step.id, document.kind)
            return (
              <li key={document.file} className={`lz-doc${saved ? ' is-saved' : ''}`}>
                <Icon
                  name={
                    document.kind === 'visual'
                      ? 'Image'
                      : document.kind === 'roadmap'
                        ? 'CalendarDays'
                        : document.kind === 'process'
                          ? 'Route'
                          : 'FileText'
                  }
                  size={12}
                />
                <div>
                  <b>{document.label}</b>
                  <code>{document.file}</code>
                  {saved && <small>saved {timeAgo(saved.createdAt)}</small>}
                </div>
                <button
                  type="button"
                  className="lz-btn small"
                  onClick={() => {
                    const artifact = saveDocument(role.id, step.id, document.kind)
                    if (artifact) notify(`${document.label} saved to ${artifact.file}`, { label: 'See the specs', to: 'specs' })
                  }}
                >
                  {saved ? 'Re-generate' : 'Save'}
                </button>
                {saved && (
                  <button
                    type="button"
                    className="lz-ref-remove"
                    aria-label={`Delete ${document.label}`}
                    title="Delete this saved document"
                    onClick={() => {
                      removeArtifact(saved.id)
                      notify(`${document.label} deleted`)
                    }}
                  >
                    <Icon name="X" size={10} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        <button type="button" className="lz-btn small primary" onClick={() => {
          const saved = saveStepDocuments(role.id, step.id)
          notify(`${saved.length} document${saved.length === 1 ? '' : 's'} saved to spec/${role.id}/`, { label: 'See the specs', to: 'specs' })
        }}>
          <Icon name="Download" size={12} /> Save all for this step
        </button>
      </div>

      <div className="lz-card lz-insp-review">
        <p className="lz-nav-label">Review this step</p>
        <div className="lz-review-row" role="group" aria-label="Review actions">
          {DECISIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`lz-btn small lz-review-btn is-${d.id}${review?.decision === d.id ? ' active' : ''}`}
              title={d.hint}
              aria-pressed={review?.decision === d.id}
              onClick={() =>
                decide(d.id, d.id === 'approved' ? 'Approved' : d.id === 'rejected' ? 'Rejected' : 'Proceeding, flagged for revisit')
              }
            >
              <Icon name={d.icon} size={12} strokeWidth={2.6} /> {d.label}
            </button>
          ))}
        </div>
        <input
          className="lz-insp-note"
          type="text"
          placeholder="Note for the revisit / rework (optional)"
          aria-label="Review note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => {
            if (review && note.trim() !== (review.note ?? '')) {
              reviewStep(reviewKey(role.id, step.id), review.decision, note.trim() || undefined)
            }
          }}
        />
        {review && (
          <p className="lz-insp-reviewed">
            Marked <b>{review.decision === 'proceed-revisit' ? 'proceed — revisit' : review.decision}</b> · {timeAgo(review.at)}
            {review.note ? ` — “${review.note}”` : ''}
          </p>
        )}
      </div>

      <div className="lz-card lz-insp-refs">
        <button type="button" className="lz-insp-refs-toggle" aria-expanded={showRefs} onClick={() => setShowRefs((v) => !v)}>
          <Icon name="FolderOpen" size={13} />
          <span>Reference material</span>
          <span className="lz-ref-count">{references.length}</span>
          <Icon name={showRefs ? 'ChevronDown' : 'ChevronRight'} size={12} />
        </button>
        {showRefs && <ReferenceIntake compact />}
      </div>

      <div className="lz-card lz-insp-next">
        <p className="lz-nav-label">What is next</p>
        {nextIsThis && roleProgress(active, role).approved === role.steps.length ? (
          <p>
            <b>Process complete.</b> Every step of the {role.name.toLowerCase()} process is approved.
          </p>
        ) : (
          <>
            <p>
              <b>
                Step {role.steps.findIndex((s) => s.id === next.id) + 1} · {next.title}
              </b>{' '}
              — {next.decides}
            </p>
            <Link to={`role/${next.id}`} className="lz-btn primary small">
              Go to {next.title} <Icon name="ArrowRight" size={12} />
            </Link>
          </>
        )}
      </div>

      <div className="lz-card lz-skill">
        <div className="lz-skill-head">
          <Icon name="Sparkles" size={14} />
          <div>
            <b>{skill.name}</b>
            <span className="mono lz-skill-path">{skill.path}</span>
          </div>
          <button
            type="button"
            className={`lz-btn small${integrated ? ' primary' : ''}`}
            aria-pressed={integrated}
            onClick={() => {
              toggleSkill(skill.toolId)
              notify(
                integrated
                  ? `${skill.name} removed from this project`
                  : `${skill.name} integrated — its steps show under each step now`,
              )
            }}
          >
            {integrated ? 'Integrated' : 'Integrate'}
          </button>
        </div>
        {skill.blurb && <p className="lz-skill-blurb">{skill.blurb}</p>}
        {skill.created && (
          <p className="lz-hint">
            No skill existed for this role, so one was created at <code>{skill.path}</code>.
          </p>
        )}
        {skill.more.length > 0 && (
          <p className="lz-hint">
            Also follows{' '}
            {skill.more.map((path, i) => (
              <span key={path}>
                {i > 0 ? ', ' : ''}
                <code>{path}</code>
              </span>
            ))}
            .
          </p>
        )}
        {!integrated && (
          <p className="lz-hint">Optional — integrating runs the skill's own steps inside this process. Off by default.</p>
        )}
        {integrated && skill.steps.length > 0 && (
          <ol className="lz-skill-steps">
            {skill.steps.map((s, i) => (
              <li key={s}>
                {s}
                {skill.stepFiles?.[i] && <code>{skill.stepFiles[i]}</code>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  )
}

/* -------------------------------------------------------------------------
   the gate — a role never opens another role's pages
   ------------------------------------------------------------------------- */

export function RoleGate({ role, reason }: { role: RoleDef; reason?: string }) {
  const { active } = useStore()
  const next = nextRoleStep(active, role)
  const index = role.steps.findIndex((s) => s.id === next.id)
  return (
    <div className="lz-view">
      <div className="lz-empty lz-gate">
        <h3>Not in the {role.name} process</h3>
        <p>
          {reason ??
            `This workspace runs as ${role.name} (${role.tag}), so it shows the ${role.processLabel.toLowerCase()} from start to finish — nothing from the other roles.`}
        </p>
        <div className="lz-row" style={{ justifyContent: 'center', marginTop: 16 }}>
          <Link to={`role/${next.id}`} className="lz-btn primary">
            Back to step {index + 1} · {next.title}
          </Link>
        </div>
      </div>
    </div>
  )
}

/** May the role open this route? Exported for the shell's page gate. */
export function roleRouteAllowed(role: RoleDef, top: string): boolean {
  return roleAllows(role, top)
}

export type { RoleDef, RoleStep, ReactNode }
