import { useState } from 'react'
import type { Entity, Project } from '../types'
import { Collapsible, NextPhase, PhaseHeader, useFileDownload } from '../components/ui'
import { Icon } from '../components/Icons'
import { formatField } from '../lib/format'

export function DataShapePage({ project }: { project: Project }) {
  const data = project.data
  const download = useFileDownload()
  const [openEntity, setOpenEntity] = useState<string | null>(data.entities[0]?.id ?? null)

  return (
    <div className="lz-view">
      <PhaseHeader
        project={project}
        current="data-shape"
        title="Data Shape"
        subtitle="The records every screen reads and writes. Four to five entities, their fields and the joins between them — compiled before any layout."
        actions={
          <>
            <button className="lz-btn small" onClick={() => download('schema.sql', data.sql, 'text/plain')}>
              <Icon name="FileCode" size={13} /> schema.sql
            </button>
            <button className="lz-btn small" onClick={() => download('data-model.md', `${project.name} — data model\n\n${data.entities.map((e) => `## ${e.name}\n${e.description}\n`).join('\n')}`)}>
              <Icon name="Download" size={13} /> data-model.md
            </button>
          </>
        }
      />

      <div className="lz-stack">
        <div className="lz-rail">
          <section className="lz-rail-step" data-state="complete">
            <span className="lz-rail-line" aria-hidden />
            <span className="lz-rail-n"><Icon name="Check" size={13} strokeWidth={2.6} /></span>
            <div className="lz-rail-label">Entities</div>
            <div className="lz-rail-body">
              <div className="lz-cols-2">
                {data.entities.map((entity) => (
                  <EntityCard
                    key={entity.id}
                    entity={entity}
                    currency={project.currency}
                    open={openEntity === entity.id}
                    onToggle={() => setOpenEntity((cur) => (cur === entity.id ? null : entity.id))}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="lz-rail-step" data-state="complete">
            <span className="lz-rail-line" aria-hidden />
            <span className="lz-rail-n"><Icon name="Check" size={13} strokeWidth={2.6} /></span>
            <div className="lz-rail-label">Relationships</div>
            <div className="lz-rail-body">
              <div className="lz-card">
                <ul className="lz-bullets" style={{ gap: 9 }}>
                  {data.relationships.map((rel) => (
                    <li key={`${rel.from}-${rel.to}-${rel.label}`}>
                      <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{rel.from}</b> → <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{rel.to}</b>{' '}
                      <span className="lz-pill mono" style={{ marginLeft: 4 }}>{rel.kind}</span>{' '}
                      <span>{rel.label}</span>
                      {rel.via && <span style={{ color: 'var(--faint)' }}> · via {rel.via}</span>}
                    </li>
                  ))}
                </ul>
                {data.notes.length > 0 && (
                  <>
                    <div className="lz-sep" />
                    <p className="lz-hint" style={{ marginTop: 0 }}>Why the shape looks like this</p>
                    <ul className="lz-bullets" style={{ marginTop: 8 }}>
                      {data.notes.map((n) => <li key={n}>{n}</li>)}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>

        <Collapsible title="Generated schema" icon="Database" meta="Postgres · ready to run" count={`${(data.sql.match(/create table/gi) ?? []).length} tables`}>
          <pre className="lz-code">{data.sql}</pre>
        </Collapsible>

        <NextPhase to="design" label="Continue to Design" hint="The shape is fixed. Next: the tokens and shell that present it." />
      </div>
    </div>
  )
}

function EntityCard({
  entity,
  currency,
  open,
  onToggle,
}: {
  entity: Entity
  currency: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="lz-card" style={{ padding: 15 }}>
      <div className="lz-between" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name={entity.icon} size={15} />
            <b style={{ font: '600 14px/1.3 var(--font)' }}>{entity.name}</b>
            <span className="lz-pill">{entity.fields.length} fields</span>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>{entity.description}</p>
        </div>
        <button className="lz-icon-btn" onClick={onToggle} aria-expanded={open} title={open ? 'Hide fields and rows' : 'Show fields and rows'}>
          <Icon name={open ? 'ChevronDown' : 'ChevronRight'} size={13} />
        </button>
      </div>

      <div className="lz-fieldlist" style={{ marginTop: 10 }}>
        {entity.fields.slice(0, open ? undefined : 5).map((f) => (
          <span key={f.name}>
            {f.name} <i>{f.type}</i>
          </span>
        ))}
        {!open && entity.fields.length > 5 && <span>+{entity.fields.length - 5}</span>}
      </div>

      {open && (
        <>
          <div className="lz-sep" />
          <p className="lz-cmd-label" style={{ marginBottom: 7 }}>Sample data · {entity.rows.length} rows</p>
          <div className="lz-table-scroll">
            <table className="lz-table">
              <thead>
                <tr>
                  {entity.fields.slice(0, 4).map((f) => <th key={f.name}>{f.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {entity.rows.slice(0, 4).map((row, i) => (
                  <tr key={i}>
                    {entity.fields.slice(0, 4).map((f) => (
                      <td key={f.name}>{formatField(f, row[f.name], currency)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
