import { useState } from 'react'
import { Icon } from './Icons'

export function ViewHead({
  eyebrow,
  title,
  lede,
  actions,
}: {
  eyebrow: string
  title: string
  lede?: string
  actions?: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div className="eyebrow">{eyebrow}</div>
      <div className="row-between" style={{ alignItems: 'flex-start', gap: 18, marginTop: 8 }}>
        <div>
          <h2 className="section-title">{title}</h2>
          {lede && (
            <p className="lede small" style={{ marginTop: 8, maxWidth: '68ch' }}>
              {lede}
            </p>
          )}
        </div>
        {actions && <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
      </div>
    </div>
  )
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setDone(true)
    setTimeout(() => setDone(false), 1400)
  }
  return (
    <button className="btn btn-sm" onClick={copy} type="button">
      <Icon name={done ? 'Check' : 'Copy'} size={12} />
      {done ? 'Copied' : label}
    </button>
  )
}

export function CodeBlock({ code, label, maxHeight }: { code: string; label?: string; maxHeight?: number }) {
  return (
    <div>
      <div className="row-between" style={{ marginBottom: 7 }}>
        <span className="field-label" style={{ margin: 0 }}>
          {label}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="code" style={maxHeight ? { maxHeight } : undefined}>
        {code}
      </pre>
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="panel panel-pad">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ marginTop: 8 }}>
        {value}
      </div>
      {hint ? (
        <div className="tiny faint" style={{ marginTop: 6 }}>
          {hint}
        </div>
      ) : null}
    </div>
  )
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="panel panel-pad" style={{ textAlign: 'center', padding: 36 }}>
      <h3 className="card-title" style={{ marginBottom: 6 }}>{title}</h3>
      <p className="small muted">{body}</p>
    </div>
  )
}
