import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icons'
import { Link, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { PHASES, completedPhases, phaseIndex } from '../lib/progress'
import type { Project } from '../types'

/* -------------------------------------------------------------------------
   copy helper
   ------------------------------------------------------------------------- */

export function useCopy() {
  const { notify } = useStore()
  return (text: string) => {
    const done = () => notify('Copied to clipboard')
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback)
    } else {
      fallback()
    }
    function fallback() {
      try {
        const el = document.createElement('textarea')
        el.value = text
        el.style.position = 'fixed'
        el.style.opacity = '0'
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        el.remove()
        done()
      } catch {
        notify('Copy blocked by the browser')
      }
    }
  }
}

/* -------------------------------------------------------------------------
   collapsible card — the Design OS fold, used for every section of a page
   ------------------------------------------------------------------------- */

export function Collapsible({
  title,
  icon,
  count,
  meta,
  defaultOpen = false,
  children,
  right,
}: {
  title: string
  icon?: string
  count?: number | string
  meta?: string
  defaultOpen?: boolean
  children: ReactNode
  right?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="lz-fold" data-open={open}>
      <div className="lz-row" style={{ gap: 0, alignItems: 'stretch' }}>
        <button className="lz-fold-h" type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <Icon name="ChevronRight" size={13} className="lz-chev" />
          {icon && <Icon name={icon} size={15} />}
          <b>{title}</b>
          {meta && <span className="lz-fold-meta">{meta}</span>}
          {count !== undefined && <span className="lz-fold-count">{count}</span>}
        </button>
        {right && <div style={{ padding: '8px 12px 8px 0', display: 'flex', alignItems: 'center' }}>{right}</div>}
      </div>
      {open && <div className="lz-fold-b">{children}</div>}
    </section>
  )
}

/* -------------------------------------------------------------------------
   phase header: page title + the five-phase pill stepper
   ------------------------------------------------------------------------- */

export function PhaseHeader({
  project,
  current,
  title,
  subtitle,
  actions,
}: {
  project: Project
  current: string
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  const { captures, theme, toggleTheme } = useStore()
  const done = completedPhases(project, captures)
  const idx = phaseIndex(current)
  return (
    <div className="lz-pagehead">
      <div className="lz-head">
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="lz-head-actions">
          {actions}
          <button
            className="lz-icon-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={14} />
          </button>
        </div>
      </div>

      <div className="lz-weekhead">
        <div className="lz-weeknow">
          <strong>{project.archetypeLabel}</strong>
          <span>{project.sections.length} sections · {project.audit.score}/100</span>
        </div>
        <div className="lz-weekhead-div" />
        <nav className="lz-steps" aria-label="Product phases">
          {PHASES.map((phase, i) => {
            const isActive = phase.id === current
            return (
              <span className="lz-row" style={{ gap: 0 }} key={phase.id}>
                <Link
                  to={phase.path}
                  className={`lz-step${isActive ? ' is-active' : ''}${done[phase.id] && !isActive ? ' is-done' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="lz-step-n">
                    {done[phase.id] && i !== idx ? <Icon name="Check" size={11} strokeWidth={2.6} /> : i + 1}
                  </span>
                  {phase.label}
                </Link>
                {i < PHASES.length - 1 && <span className="lz-step-line" />}
              </span>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

/** Header for the prototype track: flows → system → prototype → wiki. */
export function TrackHeader({
  project,
  steps,
  current,
  title,
  subtitle,
  actions,
}: {
  project: Project
  steps: { id: string; label: string; path: string }[]
  current: string
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  const { theme, toggleTheme } = useStore()
  const idx = steps.findIndex((s) => s.id === current)
  return (
    <div className="lz-pagehead">
      <div className="lz-head">
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="lz-head-actions">
          {actions}
          <button
            className="lz-icon-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={14} />
          </button>
        </div>
      </div>
      <div className="lz-weekhead">
        <div className="lz-weeknow">
          <strong>Prototype track</strong>
          <span>{project.flows.length} flows · {project.system.components.length} components</span>
        </div>
        <div className="lz-weekhead-div" />
        <nav className="lz-steps" aria-label="Prototype track">
          {steps.map((step, i) => (
            <span className="lz-row" style={{ gap: 0 }} key={step.id}>
              <Link
                to={step.path}
                className={`lz-step${step.id === current ? ' is-active' : ''}${i < idx ? ' is-done' : ''}`}
                aria-current={step.id === current ? 'page' : undefined}
              >
                <span className="lz-step-n">{i < idx ? <Icon name="Check" size={11} strokeWidth={2.6} /> : i + 1}</span>
                {step.label}
              </Link>
              {i < steps.length - 1 && <span className="lz-step-line" />}
            </span>
          ))}
        </nav>
      </div>
    </div>
  )
}

/** Sub-page header: back link, breadcrumb title, actions. */
export function SubHeader({
  backTo,
  backLabel,
  eyebrow,
  title,
  actions,
}: {
  backTo: string
  backLabel: string
  eyebrow?: string
  title: ReactNode
  actions?: ReactNode
}) {
  const { theme, toggleTheme } = useStore()
  return (
    <div className="lz-head" style={{ marginBottom: 22 }}>
      <div style={{ minWidth: 0 }}>
        <Link to={backTo} className="lz-btn small quiet" style={{ marginBottom: 12 }}>
          <Icon name="ArrowLeft" size={13} /> {backLabel}
        </Link>
        {eyebrow && (
          <div className="lz-hint" style={{ marginTop: 0, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 600 }}>
            {eyebrow}
          </div>
        )}
        <h1>{title}</h1>
      </div>
      <div className="lz-head-actions">
        {actions}
        <button
          className="lz-icon-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={14} />
        </button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------
   numbered step rail (Design OS StepIndicator)
   ------------------------------------------------------------------------- */

export interface RailStep {
  id: string
  title: string
  state: 'complete' | 'current' | 'upcoming' | 'skipped'
  hint?: string
  children: ReactNode
}

export function StepRail({ steps }: { steps: RailStep[] }) {
  return (
    <div className="lz-rail">
      {steps.map((step) => (
        <section className="lz-rail-step" data-state={step.state} key={step.id}>
          <span className="lz-rail-line" aria-hidden />
          <span className="lz-rail-n">
            {step.state === 'complete' ? (
              <Icon name="Check" size={13} strokeWidth={2.6} />
            ) : step.state === 'skipped' ? (
              <Icon name="AlertTriangle" size={13} />
            ) : step.state === 'current' ? (
              <Icon name="ArrowRight" size={13} strokeWidth={2.4} />
            ) : (
              steps.findIndex((s) => s.id === step.id) + 1
            )}
          </span>
          <div className="lz-rail-label">
            {step.title}
            {step.hint && <span className="lz-hint" style={{ marginTop: 0 }}>{step.hint}</span>}
          </div>
          <div className="lz-rail-body">{step.children}</div>
        </section>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------
   next phase button
   ------------------------------------------------------------------------- */

export function NextPhase({
  to,
  label,
  disabled,
  hint,
}: {
  to: string
  label: string
  disabled?: boolean
  hint?: string
}) {
  return (
    <div style={{ marginTop: 26 }}>
      <button className="lz-btn primary block" disabled={disabled} onClick={() => !disabled && navigate(to)} style={{ minHeight: 46, fontSize: 14.5 }}>
        {label} <Icon name="ArrowRight" size={15} />
      </button>
      {hint && <p className="lz-hint" style={{ textAlign: 'center' }}>{hint}</p>}
    </div>
  )
}

/* -------------------------------------------------------------------------
   empty state with the engine command that fills it
   ------------------------------------------------------------------------- */

export function CommandBox({ command }: { command: string }) {
  const copy = useCopy()
  return (
    <div className="lz-cmd">
      <div style={{ minWidth: 0, flex: 1 }}>
        <span className="lz-cmd-label">Run from the project root:</span>
        <code>{command}</code>
      </div>
      <button className="lz-icon-btn" onClick={() => copy(command)} title="Copy command" aria-label="Copy command">
        <Icon name="Copy" size={13} />
      </button>
    </div>
  )
}

export function EmptyState({
  icon = 'Sparkles',
  title,
  description,
  command,
  action,
}: {
  icon?: string
  title: string
  description: ReactNode
  command?: string
  action?: ReactNode
}) {
  return (
    <div className="lz-empty">
      <div className="lz-empty-ic">
        <Icon name={icon} size={19} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {command && <CommandBox command={command} />}
      {action && <div className="lz-row" style={{ justifyContent: 'center', marginTop: 16 }}>{action}</div>}
    </div>
  )
}

/* -------------------------------------------------------------------------
   small bits
   ------------------------------------------------------------------------- */

export function ProgressDots({ total, on, label }: { total: number; on: number; label: string }) {
  return (
    <span className="lz-secrow-progress">
      <span style={{ display: 'inline-flex', gap: 3 }}>
        {Array.from({ length: total }, (_, i) => (
          <i key={i} className={`lz-secrow-dot${i < on ? ' on' : ''}`} />
        ))}
      </span>
      {label}
    </span>
  )
}

export function WarningBanner({ text, storageKey }: { text: string; storageKey: string }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === '1'
    } catch {
      return false
    }
  })
  if (hidden) return null
  return (
    <div className="lz-banner" role="status">
      <Icon name="AlertTriangle" size={15} />
      <span>{text}</span>
      <button
        className="lz-banner-x"
        aria-label="Dismiss"
        onClick={() => {
          setHidden(true)
          try {
            localStorage.setItem(storageKey, '1')
          } catch {
            /* ignore */
          }
        }}
      >
        <Icon name="X" size={13} />
      </button>
    </div>
  )
}

export function CheckRow({ state, label, detail }: { state: 'pass' | 'warn' | 'fail'; label: string; detail: string }) {
  return (
    <div className="lz-checkrow">
      <span className={`lz-checkrow-ic ${state}`}>
        <Icon name={state === 'pass' ? 'Check' : state === 'warn' ? 'AlertTriangle' : 'X'} size={12} strokeWidth={2.4} />
      </span>
      <div style={{ minWidth: 0 }}>
        <b>{label}</b>
        <span>{detail}</span>
      </div>
    </div>
  )
}

export function Toast() {
  const { toast } = useStore()
  return <div className={`lz-toast${toast ? ' show' : ''}`} role="status" aria-live="polite">{toast}</div>
}

/** Downloads a single generated file without touching the zip machinery. */
export function useFileDownload() {
  const { notify } = useStore()
  return (name: string, content: string, type = 'text/markdown') => {
    try {
      const blob = new Blob([content], { type: `${type};charset=utf-8` })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      notify(`Downloaded ${name}`)
    } catch {
      notify('Download blocked by the browser')
    }
  }
}

/** Escape closes the fullscreen preview. */
export function useEscape(fn: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fn()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return ref
}
