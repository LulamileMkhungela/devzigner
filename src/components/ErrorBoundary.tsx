/**
 * A blank page is a bug report with no information in it.
 *
 * If the app never mounts — a runtime error, a blocked module, a proxy that
 * strips the entry point — the browser shows nothing and the person looking at
 * it has to guess. This boundary catches render errors, and the inline guard in
 * `index.html` catches boot failures before React exists. Both print the actual
 * message, the URL and the next step, in the same skin as the app.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep it in the console too: the preview may be the only place it surfaces.
    console.error('Lula DevZign crashed while rendering:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div
        role="alert"
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          maxWidth: 720,
          margin: '12vh auto',
          padding: 24,
          borderRadius: 12,
          border: '1px solid #e7e5e4',
          background: '#ffffff',
          color: '#1c1917',
          lineHeight: 1.55,
        }}
      >
        <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a8a29e' }}>
          Lula DevZign
        </p>
        <h1 style={{ margin: '6px 0 8px', fontSize: 20, fontWeight: 600 }}>The workspace hit an error</h1>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: '#57534e' }}>
          The app is still here — this panel is the error that would otherwise have left you with a blank page.
        </p>
        <pre
          style={{
            margin: '0 0 14px',
            padding: 12,
            borderRadius: 8,
            background: '#fafaf9',
            border: '1px solid #e7e5e4',
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            overflowX: 'auto',
          }}
        >
          {error.message}
        </pre>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #1c1917',
              background: '#1c1917',
              color: '#fafaf9',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.clear()
              } catch {
                /* storage may be unavailable — reloading is still worth trying */
              }
              location.reload()
            }}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #d6d3d1',
              background: '#ffffff',
              color: '#1c1917',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Clear saved state and reload
          </button>
        </div>
      </div>
    )
  }
}
