import { useState } from 'react'
import type { Project, Section } from '../types'
import { useStore } from '../lib/store'
import { Icon } from '../components/Icons'
import { ViewHead, CopyButton } from '../components/ui'
import { navigate } from '../lib/router'
import { ScreenThumb } from '../components/AppPreview'

const PRIORITIES = ['All', 'MVP', 'Next', 'Later'] as const

export function SectionsView({ project }: { project: Project }) {
  const { regenerate } = useStore()
  const [filter, setFilter] = useState<(typeof PRIORITIES)[number]>('All')
  const sections = project.sections.filter((s) => filter === 'All' || s.priority === filter)

  return (
    <div>
      <ViewHead
        eyebrow="Module 05 · feature areas"
        title="Every section, specified to build"
        lede={`${project.sections.length} sections, ${project.sections.reduce((n, s) => n + s.screens.length, 0)} screens, ${project.sections.reduce((n, s) => n + s.requirements.length, 0)} requirements and ${project.sections.reduce((n, s) => n + s.tests.length, 0)} test statements. Each screen below is interactive — open one to walk through it.`}
        actions={
          <button className="btn btn-sm" onClick={() => regenerate(project, 'sections')}>
            <Icon name="RefreshCw" size={12} /> Re-roll specs
          </button>
        }
      />

      <div className="row" style={{ gap: 6, marginBottom: 18 }}>
        {PRIORITIES.map((p) => (
          <button key={p} className={`chip${filter === p ? ' active' : ''}`} onClick={() => setFilter(p)}>
            {p}
            <span className="tiny faint" style={{ marginLeft: 2 }}>
              {p === 'All' ? project.sections.length : project.sections.filter((s) => s.priority === p).length}
            </span>
          </button>
        ))}
      </div>

      <div className="stack" style={{ gap: 14 }}>
        {sections.map((section) => (
          <div key={section.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="section-card-grid">
              <div style={{ padding: 20 }}>
                <div className="row" style={{ gap: 10, marginBottom: 8 }}>
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: 'var(--app-panel-2)',
                      border: '1px solid var(--app-line)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--app-accent)',
                    }}
                  >
                    <Icon name={section.icon} size={15} />
                  </span>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600 }}>{section.name}</h3>
                    <span className="tiny faint mono">{section.id} · {section.screens.length} screens · {section.requirements.length} reqs</span>
                  </div>
                  <span className={`tag ${section.priority === 'MVP' ? 'tag-accent' : section.priority === 'Next' ? 'tag-warn' : ''}`} style={{ marginLeft: 'auto' }}>
                    {section.priority}
                  </span>
                </div>
                <p className="small muted" style={{ lineHeight: 1.6, marginBottom: 12, maxWidth: '70ch' }}>{section.purpose}</p>
                <div className="marquee" style={{ marginBottom: 12 }}>
                  {section.entityIds.map((id) => {
                    const e = project.data.entities.find((x) => x.id === id)
                    return e ? <span key={id} className="tag">{e.plural}</span> : null
                  })}
                  {section.screens.map((s) => (
                    <button key={s.id} className="chip" onClick={() => navigate(`/p/${project.id}/screen/${section.id}/${section.screens.indexOf(s)}`)}>
                      <Icon name="LayoutDashboard" size={11} /> {s.name}
                    </button>
                  ))}
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-sm" onClick={() => navigate(`/p/${project.id}/sections/${section.id}`)}>
                    Open spec <Icon name="ArrowUpRight" size={12} />
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => navigate(`/p/${project.id}/screen/${section.id}/0`)}>
                    <Icon name="Play" size={11} /> Walk through
                  </button>
                </div>
              </div>
              <div style={{ borderLeft: '1px solid var(--app-line-soft)', padding: 14, background: 'var(--app-bg-soft)' }}>
                <div className="field-label">Screen</div>
                <ScreenThumb project={project} screen={section.screens[0]} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SectionDetail({ project, section }: { project: Project; section: Section }) {
  const plain = [
    `# ${section.name}`,
    '',
    section.purpose,
    '',
    '## Requirements',
    ...section.requirements.map((r) => `- [${r.priority}] ${r.id} — ${r.text}`),
    '',
    '## Tests',
    ...section.tests.map((t) => `- ${t}`),
  ].join('\n')

  return (
    <div>
      <button className="btn btn-sm btn-ghost" onClick={() => navigate(`/p/${project.id}/sections`)} style={{ marginBottom: 14 }}>
        <Icon name="ChevronLeft" size={12} /> All sections
      </button>
      <ViewHead
        eyebrow={`Section ${section.id}`}
        title={section.name}
        lede={section.purpose}
        actions={
          <>
            <span className={`tag ${section.priority === 'MVP' ? 'tag-accent' : 'tag-warn'}`}>{section.priority}</span>
            <CopyButton text={plain} label="Copy spec" />
          </>
        }
      />

      <div className="split-main">
        <div className="stack" style={{ gap: 16 }}>
          <section className="panel">
            <div className="panel-head">
              <Icon name="FileText" size={14} />
              <h3>Requirements</h3>
              <span className="tag" style={{ marginLeft: 'auto' }}>{section.requirements.length}</span>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Pri</th>
                    <th>Requirement</th>
                  </tr>
                </thead>
                <tbody>
                  {section.requirements.map((r) => (
                    <tr key={r.id}>
                      <td className="mono tiny" style={{ whiteSpace: 'nowrap', color: 'var(--app-faint)' }}>{r.id}</td>
                      <td>
                        <span className={`tag ${r.priority === 'must' ? 'tag-accent' : r.priority === 'should' ? 'tag-warn' : ''}`}>
                          {r.priority}
                        </span>
                      </td>
                      <td className="muted" style={{ lineHeight: 1.55 }}>{r.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <Icon name="ClipboardCheck" size={14} />
              <h3>Test instructions</h3>
              <span className="tag" style={{ marginLeft: 'auto' }}>framework-agnostic</span>
            </div>
            <div className="panel-body">
              <ol className="num-list">
                {section.tests.map((t) => (
                  <li key={t}>
                    <span className="small muted" style={{ lineHeight: 1.6 }}>{t}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {section.outOfScope.length > 0 && (
            <section className="panel">
              <div className="panel-head">
                <Icon name="X" size={14} />
                <h3>Explicitly out of scope</h3>
              </div>
              <div className="panel-body">
                <ul className="bullets" style={{ fontSize: 12.5 }}>
                  {section.outOfScope.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>

        <div className="stack" style={{ gap: 14 }}>
          <section className="panel">
            <div className="panel-head">
              <Icon name="Target" size={14} />
              <h3>Jobs served</h3>
            </div>
            <div className="panel-body">
              <ul className="bullets" style={{ fontSize: 12.5 }}>
                {section.jobs.map((j) => (
                  <li key={j}>{j}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <Icon name="LayoutDashboard" size={14} />
              <h3>Screens</h3>
            </div>
            <div className="panel-body stack" style={{ gap: 10 }}>
              {section.screens.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/p/${project.id}/screen/${section.id}/${i}`)}
                  className="card"
                  style={{ padding: 12, textAlign: 'left', background: 'var(--app-bg-soft)' }}
                >
                  <div className="row-between" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                    <Icon name="Play" size={12} />
                  </div>
                  <div className="tiny faint" style={{ lineHeight: 1.5, marginBottom: 8 }}>{s.intent}</div>
                  <div className="row" style={{ gap: 6 }}>
                    <span className="tag">{s.kind}</span>
                    <span className="tag">{s.blocks.length} blocks</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
