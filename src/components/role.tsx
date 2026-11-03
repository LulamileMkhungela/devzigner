// ProdOps — developed by Lulamile Mkhungela.
//
// The role chrome: the project history dropdown, the role picker, the process
// rail in the left panel, the inspector in the right panel, and the gate that
// keeps a role from opening another role's pages.
//
// The shape is the IDE layout kept simple: left panel = the process (the
// "node library"), centre = the step's work, right panel = the inspector with
// the review actions. Every role gets the same three actions on every step:
// approved, rejected, can proceed but needs a revisit.

import { useState, type ReactNode } from 'react'
import { useStore } from '../lib/store'
import { Link, navigate } from '../lib/router'
import { Icon } from './Icons'
import { useOutsideClose } from './ui'
import { timeAgo } from '../lib/format'
import {
  ROLES,
  nextRoleStep,
  reviewKey,
  roleAllows,
  roleById,
  roleProgress,
  roleSkill,
  stepReview,
  stepState,
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
 * brief, stages, role, reviews — because a project record is the whole
 * workspace state for that product.
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
                  {p.roleId ? ` · ${roleById(p.roleId)?.tag ?? p.roleId}` : ''} · {timeAgo(p.updatedAt)}
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
   role picker
   ------------------------------------------------------------------------- */

export function RolePicker() {
  const { active, setRole, notify } = useStore()
  const role = roleById(active.roleId)
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose(() => setOpen(false))
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
        <span className="lz-dd-label">{role ? role.name : 'All stages'}</span>
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
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="menuitem"
              className={`lz-dd-role${role?.id === r.id ? ' is-active' : ''}`}
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
                <small>{r.processLabel.toLowerCase()}</small>
              </span>
              {role?.id === r.id && <Icon name="Check" size={12} strokeWidth={3} />}
            </button>
          ))}
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
 * "BUSINESS ANALYSIS PROCESS · 7 STEPS" label, then every step from start to
 * finish with its review state, and the next step named at the bottom.
 */
export function RoleNav({ role, activeStepId }: { role: RoleDef; activeStepId?: string }) {
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
      {role.steps.map((step, index) => {
        const state = stepState(active, role, step)
        const isActive = step.id === activeStepId
        return (
          <Link
            key={step.id}
            to={`role/${step.id}`}
            className={`lz-nav-item lz-role-step${isActive ? ' is-active' : ''}`}
            data-state={state}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={`lz-step-n${state !== 'todo' && state !== 'ready' ? ' has-state' : ''}`}>
              {STATE_ICON[state] ? <Icon name={STATE_ICON[state]} size={11} strokeWidth={2.6} /> : state === 'ready' ? <span className="lz-nav-dot" aria-hidden="true" /> : index + 1}
            </span>
            <span className="lz-nav-label-text">{step.title}</span>
            {state === 'approved' && <span className="lz-badge">approved</span>}
            {state === 'rejected' && <span className="lz-badge danger">rejected</span>}
            {state === 'proceed-revisit' && <span className="lz-badge warn">revisit</span>}
          </Link>
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
 * The right-hand panel on a role step: what the step decides, whether it is
 * ready, the three review actions (the same for every role), what is next,
 * and the role's skill with an optional integrate toggle.
 */
export function RoleInspector({ role, step }: { role: RoleDef; step: RoleStep }) {
  const { active, reviewStep, toggleSkill, notify } = useStore()
  const review = stepReview(active, role, step)
  const ready = step.ready(active)
  const blockers = step.blockers(active)
  const next = nextRoleStep(active, role)
  const nextIsThis = next.id === step.id
  const skill = roleSkill(role)
  const integrated = (active.integratedSkills ?? []).includes(skill.toolId)
  const [note, setNote] = useState(review?.note ?? '')
  const index = role.steps.findIndex((s) => s.id === step.id)

  const decide = (decision: ReviewDecision, label: string) => {
    reviewStep(reviewKey(role.id, step.id), decision, note.trim() || undefined)
    notify(`${label} — step ${index + 1} · ${step.title}`)
  }

  return (
    <aside className="lz-inspector" aria-label={`${role.name} step details`}>
      <div className="lz-card lz-insp-step">
        <p className="lz-nav-label">{role.processLabel}</p>
        <h2>
          <span className="mono lz-insp-n">{index + 1}/{role.steps.length}</span> {step.title}
        </h2>
        <p className="lz-insp-decides">{step.decides}</p>
        <ul className="lz-insp-produces">
          {step.produces.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {ready ? (
          <p className="lz-insp-ready"><Icon name="CircleCheck" size={13} /> The artefacts for this step are here — ready to review.</p>
        ) : (
          <p className="lz-insp-ready no">{blockers.join(' · ')}</p>
        )}
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
              onClick={() => decide(d.id, d.id === 'approved' ? 'Approved' : d.id === 'rejected' ? 'Rejected' : 'Proceeding, flagged for revisit')}
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
            if (review && note.trim() !== (review.note ?? '')) reviewStep(reviewKey(role.id, step.id), review.decision, note.trim() || undefined)
          }}
        />
        {review && (
          <p className="lz-insp-reviewed">
            Marked <b>{review.decision === 'proceed-revisit' ? 'proceed — revisit' : review.decision}</b> · {timeAgo(review.at)}
            {review.note ? ` — “${review.note}”` : ''}
          </p>
        )}
      </div>

      <div className="lz-card lz-insp-next">
        <p className="lz-nav-label">What is next</p>
        {nextIsThis && roleProgress(active, role).approved === role.steps.length ? (
          <p><b>Process complete.</b> Every step of the {role.name.toLowerCase()} process is approved.</p>
        ) : (
          <>
            <p>
              <b>Step {role.steps.findIndex((s) => s.id === next.id) + 1} · {next.title}</b> — {next.decides}
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
              notify(integrated ? `${skill.name} removed from this project` : `${skill.name} integrated — its steps show under each step now`)
            }}
          >
            {integrated ? 'Integrated' : 'Integrate'}
          </button>
        </div>
        {skill.blurb && <p className="lz-skill-blurb">{skill.blurb}</p>}
        {skill.created && (
          <p className="lz-hint">No skill existed for this role, so one was created at <code>{skill.path}</code>.</p>
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
