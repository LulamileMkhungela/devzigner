import { useMemo, useState } from 'react'
import type { Project, RegistryComponent } from '../types'
import { Collapsible, TrackHeader, useFileDownload } from '../components/ui'
import { Icon } from '../components/Icons'
import { Link, navigate } from '../lib/router'
import { TRACK } from './FlowsPage'
import { buildSystemFiles } from '../export/systemFiles'
import { useStore } from '../lib/store'

export function SystemPage({ project }: { project: Project }) {
  const { notify, setStack, addComponent, removeComponent, resetSystem, systemOverrides } = useStore()
  const download = useFileDownload()
  const system = project.system
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<'All' | 'Primitive' | 'Composite' | 'Pattern'>('All')
  const [copied, setCopied] = useState('')
  const [adding, setAdding] = useState(false)
  const custom = systemOverrides.components ?? []
  const removed = systemOverrides.removed ?? []

  const components = useMemo(
    () =>
      system.components.filter(
        (c) =>
          (group === 'All' || c.group === group) &&
          (query.trim() === '' ||
            `${c.name} ${c.variants.join(' ')} ${c.usedBy.join(' ')} ${c.tokens.join(' ')}`.toLowerCase().includes(query.toLowerCase())),
      ),
    [system.components, group, query],
  )

  const files = useMemo(() => buildSystemFiles(project), [project])

  return (
    <div className="lz-view">
      <TrackHeader
        project={project}
        steps={TRACK}
        current="system"
        title="System"
        subtitle="The prototype is only as disciplined as its system: a fixed stack, a registry of components that may use tokens only, an AppShell, and a data layer the UI cannot reach around."
        actions={
          <>
            <button className="lz-btn small" onClick={() => download('registry.json', files.find((f) => f.path === 'system/registry.json')?.content ?? '{}', 'application/json')}>
              <Icon name="Braces" size={13} /> registry.json
            </button>
            <button className="lz-btn small" onClick={() => setAdding(true)}>
              <Icon name="Plus" size={13} /> Component
            </button>
            <Link to="editor" className="lz-btn small">
              <Icon name="Sliders" size={13} /> Open token editor
            </Link>
          </>
        }
      />

      <div className="lz-stack">
        <div className="lz-cols-4">
          <Stat label="Stack decisions" value={String(system.stack.length)} />
          <Stat label="Registry" value={`${system.components.length}${custom.length ? ` · +${custom.length}` : ''}`} />
          <Stat label="Routes" value={String(system.shell.routes.length)} />
          <Stat label="Adapters" value="1 mock" />
        </div>

        <Collapsible title="Tech stack" icon="Cog" count={`${system.stack.length} layers`} defaultOpen>
          <div className="lz-table-scroll">
            <table className="lz-table" style={{ minWidth: 620 }}>
              <thead>
                <tr><th>Layer</th><th>Choice</th><th>Version</th><th>Why</th></tr>
              </thead>
              <tbody>
                {system.stack.map((entry) => {
                  const options = STACK_OPTIONS[entry.layer]
                  return (
                    <tr key={entry.layer}>
                      <td style={{ color: 'var(--faint)' }}>{entry.layer}</td>
                      <td>
                        {options ? (
                          <select
                            className="lz-input"
                            style={{ padding: '4px 6px', fontSize: 12, minWidth: 150 }}
                            value={entry.choice}
                            onChange={(e) => { setStack(entry.layer, e.target.value); notify(`${entry.layer}: ${e.target.value}`) }}
                            aria-label={`${entry.layer} choice`}
                          >
                            {Array.from(new Set([entry.choice, ...options])).map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{entry.choice}</b>
                        )}
                      </td>
                      <td><span className="lz-pill mono">{entry.version}</span></td>
                      <td style={{ whiteSpace: 'normal', maxWidth: 340 }}>{entry.reason}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="lz-between" style={{ marginTop: 10 }}>
            <p className="lz-hint" style={{ marginTop: 0 }}>The stack is a decision record, not a scaffold. Editable layers are decisions you make; the rest is derived. Export writes it to <code>system/stack.md</code>.</p>
            {(Object.keys(systemOverrides.stack ?? {}).length > 0 || removed.length > 0 || custom.length > 0) && (
              <button className="lz-btn small quiet" onClick={() => { resetSystem(); notify('System reset to compiled') }}>
                <Icon name="RotateCcw" size={12} /> Reset system
              </button>
            )}
          </div>
        </Collapsible>

        <div className="lz-card">
          <div className="lz-card-h" style={{ marginBottom: 12 }}>
            <div className="lz-card-hL">
              <Icon name="Layers" size={16} />
              <h2>Component registry</h2>
            </div>
            <span className="lz-pill">{components.length} of {system.components.length}</span>
          </div>

          <div className="lz-row" style={{ marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <input
                className="lz-input"
                placeholder="Search components, variants or tokens…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ paddingLeft: 32 }}
              />
              <Icon name="Search" size={13} style={{ position: 'absolute', left: 11, top: 12, color: 'var(--faint)' }} />
            </div>
            {(['All', 'Primitive', 'Composite', 'Pattern'] as const).map((g) => (
              <button key={g} className={`lz-btn small${group === g ? ' primary' : ' quiet'}`} onClick={() => setGroup(g)}>{g}</button>
            ))}
          </div>

          <div className="lz-cols-2">
            {components.map((c) => (
              <div className="lz-tile" key={c.id} style={{ gap: 8 }}>
                <div className="lz-between" style={{ alignItems: 'center' }}>
                  <b style={{ fontSize: 13 }}>
                    {c.name}{' '}
                    {(systemOverrides.components ?? []).some((x) => x.id === c.id) && <span className="lz-pill peach" style={{ marginLeft: 4 }}>custom</span>}
                  </b>
                  <div className="lz-row" style={{ gap: 4 }}>
                    <span className={`lz-pill ${c.group === 'Primitive' ? 'blue' : c.group === 'Composite' ? 'green' : 'purple'}`}>{c.group}</span>
                    <button
                      className="lz-icon-btn"
                      style={{ width: 22, height: 22 }}
                      aria-label={`Remove ${c.name} from the registry`}
                      title={`Remove ${c.name}`}
                      onClick={() => { removeComponent(c.id); notify(`${c.name} removed from the registry`) }}
                    >
                      <Icon name="X" size={11} />
                    </button>
                  </div>
                </div>
                <div className="lz-row" style={{ gap: 4 }}>
                  {c.variants.map((v) => <span key={v} className="lz-pill" style={{ fontSize: 10.5 }}>{v}</span>)}
                </div>
                <div className="lz-fieldlist">
                  {c.tokens.slice(0, 4).map((t) => <span key={t}>{t}</span>)}
                </div>
                <span className="lz-hint" style={{ marginTop: 0 }}>Used by {c.usedBy.slice(0, 2).join(', ')}{c.usedBy.length > 2 ? ` +${c.usedBy.length - 2}` : ''}</span>
              </div>
            ))}
          </div>
          {components.length === 0 && <p className="lz-hint">Nothing matches that search.</p>}
          <p className="lz-hint">
            A component may only use the tokens listed against it. That rule is what stops UI slop entering the prototype: there is nothing else to build with.
          </p>
        </div>

        <div className="lz-split">
          <Collapsible title="App shell" icon="Layout" meta={system.shell.frame} defaultOpen>
            <div className="lz-stack" style={{ gap: 10 }}>
              {system.shell.regions.map((r) => (
                <div key={r.region} style={{ border: '1px solid var(--line)', borderRadius: 9, padding: 11 }}>
                  <b style={{ font: '600 12.5px/1.3 var(--font)', color: 'var(--ink)' }}>{r.region}</b>
                  <p style={{ fontSize: 12, marginTop: 3 }}>{r.description}</p>
                  <div className="lz-fieldlist" style={{ marginTop: 6 }}>
                    {r.components.map((c) => <span key={c}>{c}</span>)}
                  </div>
                </div>
              ))}
            </div>
            <div className="lz-sep" />
            <p className="lz-cmd-label">Navigation</p>
            <ul className="lz-bullets" style={{ marginTop: 6 }}>
              {system.shell.nav.map((n, i) => (
                <li key={n.label}><b style={{ color: 'var(--ink)' }}>{i + 1}.</b> {n.label}</li>
              ))}
            </ul>
            <Link to="prototype" className="lz-btn small" style={{ marginTop: 12 }}>
              <Icon name="Play" size={13} /> Open the prototype
            </Link>
          </Collapsible>

          <Collapsible title="Data layer" icon="Database" meta="mock adapter · separated" defaultOpen>
            <p className="lz-muted" style={{ fontSize: 12.5 }}>{system.dataLayer.pattern}</p>
            <ul className="lz-bullets" style={{ marginTop: 10 }}>
              {system.dataLayer.separation.map((s) => <li key={s}>{s}</li>)}
            </ul>
            <div className="lz-sep" />
            <p className="lz-cmd-label">Repository interfaces</p>
            <div style={{ marginTop: 6 }}>
              {system.dataLayer.interfaces.map((i) => (
                <div key={i.entity} style={{ marginBottom: 8 }}>
                  <code style={{ font: '600 12px/1.4 var(--mono)', color: 'var(--ink)' }}>{i.entity}Repository</code>
                  <div className="lz-fieldlist" style={{ marginTop: 4 }}>
                    {i.methods.map((m) => <span key={m}>{m}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </Collapsible>
        </div>

        <Collapsible title="Files this produces" icon="FolderOpen" count={`${files.length} files`} meta="src/data · system · src/components">
          <div className="lz-fieldlist">
            {files.map((f) => <span key={f.path}>{f.path}</span>)}
          </div>
          <div className="lz-row" style={{ marginTop: 12 }}>
            <button className="lz-btn small" onClick={() => download('app-shell.tsx', files.find((f) => f.path === 'src/components/app-shell.tsx')?.content ?? '', 'text/plain')}>
              <Icon name="Download" size={13} /> app-shell.tsx
            </button>
            <button className="lz-btn small" onClick={() => download('mock-adapter.ts', files.find((f) => f.path === 'src/data/mock-adapter.ts')?.content ?? '', 'text/plain')}>
              <Icon name="Download" size={13} /> mock-adapter.ts
            </button>
            <button
              className="lz-btn small quiet"
              onClick={() => {
                const stack = system.stack.map((s) => `${s.layer}: ${s.choice} ${s.version}`).join('\n')
                navigator.clipboard?.writeText(stack).then(() => { setCopied('Copied'); notify('Stack copied') }).catch(() => notify('Copy blocked'))
              }}
            >
              <Icon name="Copy" size={13} /> {copied || 'Copy stack'}
            </button>
          </div>
        </Collapsible>

        <button className="lz-btn primary block" onClick={() => navigate('prototype')} style={{ minHeight: 46 }}>
          Continue to Prototype <Icon name="ArrowRight" size={15} />
        </button>
      </div>

      {adding && (
        <ComponentModal
          onClose={() => setAdding(false)}
          onSave={(component) => { addComponent(component); setAdding(false); notify(`${component.name} added to the registry`) }}
        />
      )}
    </div>
  )
}

const STACK_OPTIONS: Record<string, string[]> = {
  Framework: ['Next.js', 'Remix', 'SvelteKit', 'Nuxt'],
  Data: ['Drizzle ORM', 'Prisma', 'Kysely', 'Raw SQL'],
  Registry: ['Radix UI primitives', 'Base UI', 'Ark UI', 'Headless UI'],
  Charts: ['Recharts', 'visx', 'Chart primitives (generated)', 'ECharts'],
}

function ComponentModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (component: RegistryComponent) => void
}) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState<RegistryComponent['group']>('Composite')
  const [variants, setVariants] = useState('default')
  const [tokens, setTokens] = useState('--surface, --border, --ink, --radius-md')

  return (
    <div className="lz-modal" role="dialog" aria-modal="true" aria-label="Add component" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lz-modal-card">
        <div className="lz-modal-h">
          <h2>Add to the registry</h2>
          <button className="lz-modal-x" onClick={onClose} aria-label="Close"><Icon name="X" size={14} /></button>
        </div>
        <p className="lz-muted" style={{ fontSize: 13, marginBottom: 14 }}>
          A registry entry declares the tokens it may use. Anything not listed here is not available to build with.
        </p>
        <label className="lz-field">
          <span>Component name</span>
          <input className="lz-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="DisputeBanner" autoFocus />
        </label>
        <label className="lz-field">
          <span>Group</span>
          <select className="lz-input" value={group} onChange={(e) => setGroup(e.target.value as RegistryComponent['group'])}>
            {['Primitive', 'Composite', 'Pattern'].map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <label className="lz-field">
          <span>Variants (comma separated)</span>
          <input className="lz-input" value={variants} onChange={(e) => setVariants(e.target.value)} />
        </label>
        <label className="lz-field" style={{ marginBottom: 0 }}>
          <span>Allowed tokens (comma separated)</span>
          <input className="lz-input" value={tokens} onChange={(e) => setTokens(e.target.value)} />
        </label>
        <div className="lz-modal-foot">
          <button className="lz-btn" onClick={onClose}>Cancel</button>
          <button
            className="lz-btn primary"
            disabled={!name.trim()}
            onClick={() =>
              onSave({
                id: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                name: name.trim(),
                group,
                variants: variants.split(',').map((v) => v.trim()).filter(Boolean),
                tokens: tokens.split(',').map((v) => v.trim()).filter(Boolean),
                usedBy: ['Added in this workspace'],
                props: [{ name: 'children', type: 'ReactNode' }],
              })
            }
          >
            <Icon name="Plus" size={14} /> Add component
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="lz-card" style={{ padding: 14 }}>
      <span style={{ font: '600 11px/1 var(--font)', letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--faint)' }}>{label}</span>
      <strong style={{ font: '700 20px/1.2 var(--font)', letterSpacing: '-.02em', marginTop: 6 }}>{value}</strong>
    </div>
  )
}
