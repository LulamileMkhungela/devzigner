import { useState } from 'react'
import type { Project } from '../types'
import { useStore } from '../lib/store'
import { Icon } from '../components/Icons'
import { CodeBlock, CopyButton, ViewHead } from '../components/ui'
import { formatField, humanize, download } from '../lib/format'

export function DataView({ project }: { project: Project }) {
  const { regenerate } = useStore()
  const [tab, setTab] = useState<'model' | 'sample' | 'sql'>('model')
  const [selected, setSelected] = useState(project.data.entities[0]?.id)
  const entity = project.data.entities.find((e) => e.id === selected) ?? project.data.entities[0]

  return (
    <div>
      <ViewHead
        eyebrow="Module 03 · data shape"
        title="The schema the screens are built on"
        lede={`${project.data.entities.length} entities, ${project.data.entities.reduce((n, e) => n + e.fields.length, 0)} fields, ${project.data.relationships.length} relationships and ${project.data.entities.reduce((n, e) => n + e.rows.length, 0)} seeded records. Every screen in this product reads from these tables — no hard-coded demo arrays.`}
        actions={
          <>
            <button className="btn btn-sm" onClick={() => regenerate(project, 'data')}>
              <Icon name="RefreshCw" size={12} /> Re-roll data
            </button>
            <button className="btn btn-sm" onClick={() => download('schema.sql', project.data.sql, 'text/sql')}>
              <Icon name="Download" size={12} /> schema.sql
            </button>
          </>
        }
      />

      <div className="tabs">
        {(
          [
            ['model', 'Entities & relationships'],
            ['sample', 'Seeded sample data'],
            ['sql', 'PostgreSQL schema'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={`tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'sql' ? (
        <div className="grid g2" style={{ gap: 16, alignItems: 'start' }}>
          <div>
            <CodeBlock code={project.data.sql} label="schema.sql" maxHeight={620} />
          </div>
          <div className="stack" style={{ gap: 14 }}>
            <div className="panel">
              <div className="panel-head">
                <Icon name="FileText" size={14} />
                <h3>Conventions applied</h3>
              </div>
              <div className="panel-body">
                <ul className="bullets" style={{ fontSize: 12.5 }}>
                  {project.data.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="panel">
              <div className="panel-head">
                <Icon name="ShieldAlert" size={14} />
                <h3>Before you run this</h3>
              </div>
              <div className="panel-body small muted" style={{ lineHeight: 1.7 }}>
                The schema targets PostgreSQL 14+. It creates <code className="mono">pgcrypto</code> and{' '}
                <code className="mono">citext</code> extensions. Apply it in a fresh database, then add row-level security
                policies for your tenancy model — that decision is deliberately left out because it depends on your
                auth provider, not on the product design.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="two-pane">
          <div className="panel" style={{ padding: 8 }}>
            <div className="nav-label" style={{ padding: '6px 8px' }}>
              Entities
            </div>
            <div className="file-tree">
              {project.data.entities.map((e) => (
                <button
                  key={e.id}
                  className={`file-row${e.id === entity?.id ? ' active' : ''}`}
                  onClick={() => setSelected(e.id)}
                >
                  <Icon name={e.icon} size={13} />
                  {e.plural}
                  <span className="size">{e.rows.length}</span>
                </button>
              ))}
            </div>
            <div className="divider" />
            <div className="nav-label" style={{ padding: '0 8px 6px' }}>
              Relationships
            </div>
            <div className="stack" style={{ gap: 6, padding: '0 4px 4px' }}>
              {project.data.relationships.map((r) => (
                <div key={`${r.from}-${r.to}`} className="tiny" style={{ color: 'var(--app-muted)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="tag">{r.from}</span>
                  <span className="faint">→</span>
                  <span className="tag">{r.to}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="stack" style={{ gap: 16 }}>
            {entity && (
              <>
                <div className="panel">
                  <div className="panel-head">
                    <Icon name={entity.icon} size={15} />
                    <h3>{entity.name}</h3>
                    <span className="tag" style={{ marginLeft: 'auto' }}>{entity.id}</span>
                  </div>
                  <div className="panel-body">
                    <p className="small muted" style={{ marginBottom: 14, lineHeight: 1.6 }}>{entity.description}</p>
                    {tab === 'model' ? (
                      <div className="table-wrap">
                        <table className="tbl">
                          <thead>
                            <tr>
                              <th>Field</th>
                              <th>Type</th>
                              <th>Req</th>
                              <th>Example</th>
                              <th>Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entity.fields.map((f) => (
                              <tr key={f.name}>
                                <td className="mono" style={{ color: 'var(--app-text)' }}>{f.name}</td>
                                <td>
                                  <span className="tag">{f.type}</span>
                                  {f.options && (
                                    <div className="tiny faint" style={{ marginTop: 4, maxWidth: 180 }}>{f.options.join(' · ')}</div>
                                  )}
                                </td>
                                <td className="faint">{f.required ? 'yes' : '—'}</td>
                                <td className="mono tiny" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {String(f.example)}
                                </td>
                                <td className="muted tiny" style={{ maxWidth: 260, lineHeight: 1.5 }}>{f.note}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="table-wrap">
                        <table className="tbl">
                          <thead>
                            <tr>
                              {entity.fields.slice(0, 6).map((f) => (
                                <th key={f.name}>{humanize(f.name)}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {entity.rows.map((row) => (
                              <tr key={String(row.id)}>
                                {entity.fields.slice(0, 6).map((f) => (
                                  <td key={f.name} style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {formatField(f, row[f.name], project.currency)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {tab === 'model' && (
                  <div className="grid g2" style={{ gap: 14 }}>
                    <div className="panel">
                      <div className="panel-head">
                        <Icon name="ArrowLeftRight" size={14} />
                        <h3>Links out</h3>
                      </div>
                      <div className="panel-body">
                        {project.data.relationships.filter((r) => r.from === entity.id).length === 0 ? (
                          <p className="tiny faint">No outgoing relations. This is a root record.</p>
                        ) : (
                          <div className="stack" style={{ gap: 8 }}>
                            {project.data.relationships
                              .filter((r) => r.from === entity.id)
                              .map((r) => (
                                <div key={r.to} className="small">
                                  <span className="mono tiny" style={{ color: 'var(--app-accent)' }}>{r.via}</span>
                                  <span className="faint"> → {r.to}</span>
                                  <div className="tiny faint">{r.label}</div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="panel">
                      <div className="panel-head">
                        <Icon name="Link" size={14} />
                        <h3>Referenced by</h3>
                      </div>
                      <div className="panel-body">
                        {project.data.relationships.filter((r) => r.to === entity.id).length === 0 ? (
                          <p className="tiny faint">Nothing points here yet.</p>
                        ) : (
                          <div className="marquee">
                            {project.data.relationships
                              .filter((r) => r.to === entity.id)
                              .map((r) => (
                                <span key={r.from} className="tag">{r.from}.{r.via}</span>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {tab === 'sample' && (
                  <div className="panel">
                    <div className="panel-head">
                      <Icon name="Copy" size={14} />
                      <h3>Seed data — copy into fixtures</h3>
                      <div style={{ marginLeft: 'auto' }}>
                        <CopyButton
                          text={JSON.stringify(
                            Object.fromEntries(entity.fields.map((f) => [f.name, f.example])),
                            null,
                            2,
                          )}
                          label="Copy one row"
                        />
                      </div>
                    </div>
                    <div className="panel-body">
                      <p className="tiny faint" style={{ marginBottom: 10 }}>
                        Deterministic fixtures generated from the same seed as the design. Use them for tests and empty-state checks.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
