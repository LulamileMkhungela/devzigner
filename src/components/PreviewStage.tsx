import { useCallback, useRef, useState } from 'react'
import type { Project, Screen } from '../types'
import { AppPreview } from './AppPreview'
import { Icon } from './Icons'
import { Link } from '../lib/router'

/**
 * The design canvas: device presets at 30/60/100 %, a live percentage readout,
 * grips on either edge that resize from the centre, a light/dark switch for the
 * artefact and an address for the fullscreen view.
 */
export function PreviewStage({
  project,
  screen,
  crumbs,
  fullscreen = false,
  fullscreenPath,
  exitPath,
  onExit,
  initialPct = 100,
  note,
}: {
  project: Project
  screen: Screen
  crumbs: { section?: string; screen: string }
  fullscreen?: boolean
  fullscreenPath: string
  exitPath: string
  onExit?: () => void
  initialPct?: number
  note?: string
}) {
  const [pct, setPct] = useState(fullscreen ? 100 : initialPct)
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light')
  const [dragging, setDragging] = useState(false)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ startX: number; startPct: number; width: number } | null>(null)

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      const width = canvasRef.current?.clientWidth ?? 900
      drag.current = { startX: e.clientX, startPct: pct, width }
      setDragging(true)
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    [pct],
  )

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current) return
    const { startX, startPct, width } = drag.current
    // resize from the centre: every pixel dragged on one side moves both edges
    const next = startPct + ((e.clientX - startX) * 2 * 100) / width
    setPct(Math.max(25, Math.min(100, Math.round(next))))
  }, [])

  const endDrag = useCallback(() => {
    drag.current = null
    setDragging(false)
  }, [])

  const body = (
    <div className={`lz-stage${fullscreen ? ' lz-stage-full' : ''}`}>
      <div className="lz-stage-bar">
        <div className="lz-crumb">
          <Icon name="LayoutDashboard" size={14} />
          {crumbs.section && (
            <>
              <span>{crumbs.section}</span>
              <Icon name="ChevronRight" size={12} />
            </>
          )}
          <b>{crumbs.screen}</b>
        </div>
        <span className="lz-spacer" />
        <div className="lz-seg" role="group" aria-label="Preview size">
          <button className={pct === 30 ? 'is-on' : ''} onClick={() => setPct(30)} title="Narrow · 30%">
            <Icon name="Smartphone" size={13} />
          </button>
          <button className={pct === 60 ? 'is-on' : ''} onClick={() => setPct(60)} title="Tablet · 60%">
            <Icon name="Tablet" size={13} />
          </button>
          <button className={pct === 100 ? 'is-on' : ''} onClick={() => setPct(100)} title="Desktop · 100%">
            <Icon name="Monitor" size={13} />
          </button>
        </div>
        <span className="lz-pct" aria-live="polite">{pct}%</span>
        <button
          className="lz-icon-btn"
          onClick={() => setPreviewTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          title={`Preview in ${previewTheme === 'dark' ? 'light' : 'dark'}`}
          aria-label={`Preview in ${previewTheme === 'dark' ? 'light' : 'dark'}`}
        >
          <Icon name={previewTheme === 'dark' ? 'Sun' : 'Moon'} size={13} />
        </button>
        {fullscreen ? (
          <Link to={exitPath} className="lz-icon-btn" title="Exit fullscreen" onClick={onExit} aria-label="Exit fullscreen">
            <Icon name="Minimize2" size={13} />
          </Link>
        ) : (
          <Link to={fullscreenPath} className="lz-icon-btn" title="Fullscreen" aria-label="Fullscreen">
            <Icon name="Maximize2" size={13} />
          </Link>
        )}
      </div>

      <div className="lz-stage-canvas" ref={canvasRef}>
        <div
          className={`lz-stage-frame${dragging ? ' dragging' : ''}`}
          style={{ ['--pct' as string]: `${pct}%` }}
        >
          <span
            className={`lz-grip left${dragging ? ' dragging' : ''}`}
            role="separator"
            aria-label="Resize preview"
            aria-orientation="vertical"
            onPointerDown={startDrag}
            onPointerMove={onMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          />
          <div className="lz-stage-scroll">
            <AppPreview project={project} screen={screen} theme={previewTheme} device={pct < 55 ? 'mobile' : 'desktop'} />
          </div>
          <span
            className={`lz-grip right${dragging ? ' dragging' : ''}`}
            role="separator"
            aria-label="Resize preview"
            aria-orientation="vertical"
            onPointerDown={startDrag}
            onPointerMove={onMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          />
        </div>
      </div>
      <p className="lz-stage-hint">{note ?? 'Drag either edge to resize, or pick 30 / 60 / 100 %.'}</p>
    </div>
  )

  return body
}
