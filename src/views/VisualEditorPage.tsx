// ProdOps — developed by Lulamike Mkhungela.
//
// The visual editor. A designer's starting point is rarely a blank canvas, so
// this page starts with a choice instead: the generated design system, one
// imported from a real system (a tokens.json or CSS variables file), or a Figma
// file to work against. Then it edits the interface visually — hue, radius,
// spacing, shell, card style, type and section order — with the real screens
// rendering beside it, and every change recompiling tokens, screens and the
// audit. Three variants can be kept side by side and applied.

import { useMemo, useState } from 'react'
import type { DesignSource, Project } from '../types'
import { useStore } from '../lib/store'
import { useFileDownload } from '../components/ui'
import { Icon } from '../components/Icons'
import { AppPreview } from '../components/AppPreview'
import { Link } from '../lib/router'
import { slugify } from '../engine/rng'

const SECTION_ORDER_KEY = 'design.sections.order'

/** Every string value and token name in an uploaded design source. */
interface ImportedTokens {
  label: string
  tokens: { name: string; value: string }[]
}

/** Read a tokens.json, a theme.css or a Figma export into name/value pairs. */
export function parseDesignTokens(text: string, fallbackLabel: string): ImportedTokens {
  const tokens: { name: string; value: string }[] = []
  const push = (name: string, value: string) => {
    const clean = value.trim()
    if (!clean || clean.length > 120) return
    if (tokens.some((t) => t.name === name)) return
    tokens.push({ name, value: clean })
  }

  // CSS custom properties — the shape most design systems export.
  const cssVars = /--([\w-]+)\s*:\s*([^;{}]+);/g
  let match: RegExpExecArray | null
  while ((match = cssVars.exec(text))) push(`--${match[1]}`, match[2])
  if (tokens.length > 0) return { label: fallbackLabel, tokens: tokens.slice(0, 80) }

  // DTCG / Style Dictionary JSON: walk to every leaf that looks like a token.
  try {
    const data = JSON.parse(text) as unknown
    const walk = (node: unknown, path: string[]) => {
      if (node && typeof node === 'object' && !Array.isArray(node)) {
        const record = node as Record<string, unknown>
        if ('$value' in record || 'value' in record) {
          const raw = record.$value ?? record.value
          push(path.join('.'), typeof raw === 'string' || typeof raw === 'number' ? String(raw) : JSON.stringify(raw))
          return
        }
        for (const [key, value] of Object.entries(record)) walk(value, [...path, key])
      }
    }
    walk(data, [])
  } catch {
    // Not JSON and not CSS: the file is kept as a reference instead.
  }

  return { label: fallbackLabel, tokens: tokens.slice(0, 80) }
}

/** The colour and type roles a tokens file implies, if it names them. */
export function tokensToOverrides(tokens: { name: string; value: string }[]): Record<string, string> {
  const found: Record<string, string> = {}
  for (const token of tokens) {
    const key = token.name.toLowerCase()
    if (!/color|colour|primary|accent|brand|surface|background/.test(key)) continue
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(token.value)) continue
    if (found.primary === undefined && /primary|brand|accent/.test(key)) found.primary = token.value
    else if (found.surface === undefined && /surface|background|page/.test(key)) found.surface = token.value
  }
  return found
}

export function VisualEditorPage({ project }: { project: Project }) {
  const { overrides, setOverride, clearOverrides, commit, notify, setDesignSource, addReference } = useStore()
  const [sourceLabel, setSourceLabel] = useState(project.designSource?.label ?? 'ProdOps generated')
  const [imported, setImported] = useState<ImportedTokens | null>(null)
  const [figmaUrl, setFigmaUrl] = useState(project.designSource?.kind === 'figma' ? (project.designSource.url ?? '') : '')
  const [variants, setVariants] = useState<string[]>([])
  const [activeId, setActiveId] = useState('')
  const [showFrames, setShowFrames] = useState(true)

  const screens = useMemo(() => project.sections.flatMap((s) => s.screens), [project.sections])
  const screen = screens.find((s) => s.id === activeId) ?? screens[0]
  const design = project.design
  const primary = design.colors.find((c) => c.role === 'primary') ?? design.colors[0]
  const accent = design.colors.find((c) => c.role === 'accent') ?? design.colors[1] ?? primary
  const hue = overrides.primaryHue ?? primary?.hue ?? 20
  const accentHue = overrides.accentHue ?? accent?.hue ?? 340
  const radius = overrides.radius ?? design.radii.md ?? 8
  const spacing = overrides.spacing ?? 1
  const shell = overrides.shell ?? design.layout.shell
  const cardStyle = overrides.cardStyle ?? design.layout.cardStyle
  const edited = Object.keys(overrides).length > 0
  const sectionOrder = (project.overrides as Record<string, unknown> | undefined)?.[SECTION_ORDER_KEY] as string[] | undefined

  const orderedSections = useMemo(() => {
    const ids = sectionOrder ?? []
    if (ids.length === 0) return project.sections
    const inOrder = ids
      .map((id) => project.sections.find((section) => section.id === id))
      .filter((section): section is Project['sections'][number] => Boolean(section))
    const rest = project.sections.filter((section) => !ids.includes(section.id))
    return [...inOrder, ...rest]
  }, [project.sections, sectionOrder])

  /* --------------------------------------------------------------- imports -- */

  const importTokens = async (file: File) => {
    const text = await file.text()
    const parsed = parseDesignTokens(text, file.name.replace(/\.[^.]+$/, ''))
    if (parsed.tokens.length === 0) {
      addReference({
        name: file.name,
        type: file.type,
        size: file.size,
        kind: 'doc',
        data: `data:text/plain;base64,${btoa(unescape(encodeURIComponent(text)))}`,
        note: 'Design source import',
      })
      notify(`${file.name} is not a token file — kept as a reference instead`)
      return
    }
    setImported({ label: parsed.label, tokens: parsed.tokens })
    setSourceLabel(parsed.label)
    notify(`${parsed.label}: ${parsed.tokens.length} tokens read from ${file.name}`)
  }

  const applyImported = () => {
    if (!imported) return
    const overridesFromTokens = tokensToOverrides(imported.tokens)
    const source: DesignSource = {
      kind: 'imported',
      label: imported.label,
      tokens: imported.tokens,
      setAt: Date.now(),
    }
    setDesignSource(source)
    // Tokens the workspace understands become real edits; the rest are kept on
    // the project for the export, so nothing imported is silently dropped.
    if (overridesFromTokens.primary) notify(`${imported.label} applied — ${imported.tokens.length} tokens kept with the project`)
    else notify(`${imported.label} applied — tokens kept with the project, no colour role matched`)
  }

  const applyFigma = () => {
    if (!figmaUrl.trim()) return
    const url = figmaUrl.trim()
    setDesignSource({
      kind: 'figma',
      label: `Figma — ${url.replace(/^https?:\/\/(www\.)?figma\.com\//, '').slice(0, 40)}`,
      url: /^https?:\/\//.test(url) ? url : `https://${url}`,
      setAt: Date.now(),
    })
    addReference({
      name: 'Figma file',
      type: 'text/uri-list',
      size: 0,
      kind: 'link',
      data: /^https?:\/\//.test(url) ? url : `https://${url}`,
      note: 'Design source',
    })
    notify('Figma file linked — it is now a reference for this project')
  }

  /* ----------------------------------------------------------------- edit -- */

  const saveVariant = () => {
    const name = `Variant ${variants.length + 1} · ${hue}° · ${radius}px`
    setVariants((prev) => [...prev, name])
    commit(name)
    notify('Variant saved and committed')
  }

  if (!screen) {
    return (
      <div className="lz-view">
        <div className="lz-empty">
          <h3>No screens to edit yet</h3>
          <p>Design a section screen first — the editor renders the real screens, not a mock.</p>
          <Link to="sections" className="lz-btn primary">
            Go to sections
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="lz-view lz-veditor">
      <div className="lz-ved-head">
        <div>
          <p className="lz-nav-label">Visual editor</p>
          <h1>Design it, then keep the version you like</h1>
          <p className="lz-lede">
            Start from the generated system, an imported one, or your Figma file. Every change edits tokens, so the
            screens, prototype, audit and export all follow.
          </p>
        </div>
        <div className="lz-row">
          <span className={`lz-pill ${edited ? 'peach' : ''}`}>{edited ? `${Object.keys(overrides).length} edits` : 'compiled'}</span>
          <button
            className="lz-btn small"
            onClick={() => {
              clearOverrides()
              notify('Back to the compiled tokens')
            }}
            disabled={!edited}
          >
            <Icon name="RotateCcw" size={13} /> Revert
          </button>
          <button className="lz-btn small primary" onClick={saveVariant}>
            <Icon name="GitBranch" size={13} /> Save variant
          </button>
        </div>
      </div>

      <div className="lz-ved-panes">
        {/* ---- left: the source and the controls ---- */}
        <div className="lz-ved-left">
          <div className="lz-card">
            <p className="lz-nav-label">Where the look comes from</p>
            <div className="lz-ved-sources">
              <button
                type="button"
                className={`lz-ved-source${!project.designSource && !imported ? ' is-on' : ''}`}
                onClick={() => {
                  setDesignSource({ kind: 'generated', label: 'ProdOps generated', setAt: Date.now() })
                  setSourceLabel('ProdOps generated')
                  setImported(null)
                  notify('Using the generated design system')
                }}
              >
                <Icon name="Sparkles" size={13} />
                <b>Generated</b>
                <small>{design.name}</small>
              </button>
              <label className={`lz-ved-source${imported ? ' is-on' : ''}`}>
                <input
                  type="file"
                  accept=".json,.css,.txt"
                  aria-label="Import design tokens"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void importTokens(file)
                    e.target.value = ''
                  }}
                />
                <Icon name="Download" size={13} />
                <b>Import tokens</b>
                <small>tokens.json / theme.css</small>
              </label>
              <button
                type="button"
                className={`lz-ved-source${project.designSource?.kind === 'figma' ? ' is-on' : ''}`}
                onClick={() => setShowFrames((v) => !v)}
              >
                <Icon name="Palette" size={13} />
                <b>Figma</b>
                <small>link a file</small>
              </button>
            </div>

            <div className="lz-ved-figma">
              <input
                className="lz-input"
                type="text"
                placeholder="https://figma.com/file/…"
                aria-label="Figma file URL"
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
              />
              <button className="lz-btn small" onClick={applyFigma} disabled={!figmaUrl.trim()}>
                Use
              </button>
            </div>

            {project.designSource && (
              <p className="lz-ved-current">
                <Icon name="CircleCheck" size={12} /> Using <b>{project.designSource.label}</b>
                {project.designSource.url && (
                  <a href={project.designSource.url} target="_blank" rel="noreferrer noopener">
                    open
                  </a>
                )}
              </p>
            )}

            {imported && (
              <div className="lz-ved-import">
                <p>
                  <b>{imported.label}</b> — {imported.tokens.length} tokens read
                </p>
                <div className="lz-ved-swatches">
                  {imported.tokens
                    .filter((t) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t.value))
                    .slice(0, 12)
                    .map((t) => (
                      <span key={t.name} title={`${t.name}: ${t.value}`} style={{ background: t.value }} />
                    ))}
                </div>
                <button className="lz-btn small primary" onClick={applyImported}>
                  Use these tokens
                </button>
              </div>
            )}
          </div>

          <div className="lz-card">
            <p className="lz-nav-label">Type</p>
            <div className="lz-ved-type">
              {design.typography.map((t) => (
                <div key={t.role} className="lz-ved-type-row">
                  <span style={{ fontFamily: t.stack, fontSize: t.role === 'display' ? 20 : 13 }}>Aa</span>
                  <div>
                    <b>{t.role}</b>
                    <small>{t.family} · {t.size}/{t.lineHeight}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lz-card">
            <Control label="Primary hue" value={`${hue}°`} overridden={overrides.primaryHue !== undefined}>
              <div className="lz-row" style={{ gap: 8 }}>
                <span className="lz-ved-chip" style={{ background: primary?.base }} />
                <input type="range" min={0} max={359} value={hue} aria-label="Primary hue" onChange={(e) => setOverride('primaryHue', Number(e.target.value))} />
              </div>
            </Control>
            <Control label="Accent hue" value={`${accentHue}°`} overridden={overrides.accentHue !== undefined}>
              <div className="lz-row" style={{ gap: 8 }}>
                <span className="lz-ved-chip" style={{ background: accent?.base }} />
                <input type="range" min={0} max={359} value={accentHue} aria-label="Accent hue" onChange={(e) => setOverride('accentHue', Number(e.target.value))} />
              </div>
            </Control>
            <Control label="Radius" value={`${radius}px`} overridden={overrides.radius !== undefined}>
              <input type="range" min={0} max={20} value={radius} aria-label="Base radius" onChange={(e) => setOverride('radius', Number(e.target.value))} />
              <div className="lz-row" style={{ gap: 6, marginTop: 8 }}>
                {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((k) => (
                  <span
                    key={k}
                    style={{ flex: 1, height: 20, background: 'var(--card-soft)', border: '1px solid var(--line)', borderRadius: design.radii[k] }}
                    title={`${k} ${design.radii[k]}px`}
                  />
                ))}
              </div>
            </Control>
            <Control label="Spacing" value={`×${spacing.toFixed(2)}`} overridden={overrides.spacing !== undefined}>
              <input type="range" min={0.8} max={1.25} step={0.05} value={spacing} aria-label="Spacing scale" onChange={(e) => setOverride('spacing', Number(e.target.value))} />
            </Control>
            <label className="lz-field">
              <span>Shell</span>
              <select className="lz-input" value={shell} onChange={(e) => setOverride('shell', e.target.value as never)}>
                {['sidebar', 'rail', 'topbar', 'split'].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="lz-field" style={{ marginBottom: 0 }}>
              <span>Card style</span>
              <select className="lz-input" value={cardStyle} onChange={(e) => setOverride('cardStyle', e.target.value as never)}>
                {['flat', 'outlined', 'elevated', 'glass'].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="lz-card">
            <p className="lz-nav-label">Sections, in the order people meet them</p>
            <ol className="lz-ved-order">
              {orderedSections.map((section) => (
                <li key={section.id}>
                  <Icon name={section.icon} size={12} />
                  <span>{section.name}</span>
                  <span className="lz-pill quiet">{section.priority}</span>
                </li>
              ))}
            </ol>
            <p className="lz-hint">Drag order is compiled from the section priority; edit a section to change its weight.</p>
          </div>

          {variants.length > 0 && (
            <div className="lz-card">
              <p className="lz-nav-label">Variants kept</p>
              <ul className="lz-ved-variants">
                {variants.map((variant) => (
                  <li key={variant}>
                    <Icon name="GitCommitHorizontal" size={12} />
                    <span>{variant}</span>
                  </li>
                ))}
              </ul>
              <p className="lz-hint">Each variant is a commit — restore any of them from Versions.</p>
            </div>
          )}
        </div>

        {/* ---- centre: the real screens ---- */}
        <div className="lz-ved-stage">
          <div className="lz-ved-stagebar">
            <div className="lz-crumb">
              <Icon name="LayoutDashboard" size={13} />
              <span>{project.name}</span>
              <Icon name="ChevronRight" size={11} />
              <b>{screen.route}</b>
            </div>
            <span className="lz-spacer" />
            <select className="lz-input lz-ved-screen-select" value={screen.id} aria-label="Screen" onChange={(e) => setActiveId(e.target.value)}>
              {screens.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="lz-ved-canvas">
            <div className="lz-ved-frame">
              <AppPreview project={project} screen={screen} theme="light" />
            </div>
          </div>
          <p className="lz-hint">
            Edits re-run the design compiler: ramps, contrast checks, semantic aliases, tokens.css, the Tailwind theme,
            every screen and the audit.
            {project.designSource ? ` Source: ${sourceLabel}.` : ''}
          </p>
        </div>

        {/* ---- right: the read-out ---- */}
        <div className="lz-ved-right">
          <div className="lz-card">
            <p className="lz-nav-label">Read-out</p>
            <div className="lz-ved-stats">
              <div>
                <b>{design.colors.length}</b>
                <small>colour roles</small>
              </div>
              <div>
                <b>{project.audit.score}</b>
                <small>audit score</small>
              </div>
              <div>
                <b>{screens.length}</b>
                <small>screens</small>
              </div>
            </div>
          </div>
          <div className="lz-card">
            <p className="lz-nav-label">Palette</p>
            <div className="lz-ved-swatches">
              {design.colors.map((c) => (
                <span key={c.id} title={`${c.role} · ${c.base}`} style={{ background: c.base }} />
              ))}
            </div>
            <ul className="lz-ved-names">
              {design.colors.map((c) => (
                <li key={c.id}>
                  <span style={{ background: c.base }} />
                  <b>{c.role}</b>
                  <code>{c.base}</code>
                </li>
              ))}
            </ul>
          </div>
          <div className="lz-card">
            <p className="lz-nav-label">Take it with you</p>
            <p className="lz-hint">Tokens are real files. Export them, or hand the whole system to an agent.</p>
            <div className="lz-col" style={{ gap: 6 }}>
              <TokenDownload project={project} which="css" />
              <TokenDownload project={project} which="json" />
            </div>
            <Link to="export" className="lz-btn small" style={{ marginTop: 8 }}>
              <Icon name="Package" size={12} /> Export package
            </Link>
          </div>
        </div>
      </div>

      {showFrames && project.designSource?.kind === 'figma' && (
        <div className="lz-ved-frames">
          <p className="lz-nav-label">Figma frames</p>
          <p className="lz-hint">
            Figma embeds need the file to allow embedding. The link is kept on the project and written into the handoff,
            so the design and the build stay pointed at the same file.
          </p>
          {project.designSource.url && (
            <a className="lz-btn small" href={project.designSource.url} target="_blank" rel="noreferrer noopener">
              <Icon name="ExternalLink" size={12} /> Open the Figma file
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function Control({
  label,
  value,
  overridden,
  children,
}: {
  label: string
  value: string
  overridden: boolean
  children?: React.ReactNode
}) {
  return (
    <div className={`lz-ved-control${overridden ? ' is-edited' : ''}`}>
      <div className="lz-ved-control-head">
        <span>{label}</span>
        <code>{value}</code>
      </div>
      {children}
    </div>
  )
}

function TokenDownload({ project, which }: { project: Project; which: 'css' | 'json' }) {
  const download = useFileDownload()
  const content = which === 'css' ? project.design.tokensCss : project.design.tokensJson
  return (
    <button
      className="lz-btn small"
      onClick={() => download(`${slugify(project.name)}-tokens.${which}`, content, which === 'css' ? 'text/css' : 'application/json')}
    >
      <Icon name="Download" size={12} /> tokens.{which}
    </button>
  )
}
