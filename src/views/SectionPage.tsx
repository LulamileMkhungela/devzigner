import type { Project, Screen, Section } from '../types'
import { useStore } from '../lib/store'
import { EmptyState, StepRail, SubHeader, useFileDownload, WarningBanner, type RailStep } from '../components/ui'
import { Icon } from '../components/Icons'
import { Link } from '../lib/router'
import { ScreenThumb } from '../components/AppPreview'
import { formatField } from '../lib/format'
import { completedPhases, sectionProgress } from '../lib/progress'

function screenSpec(screen: Screen, project: Project): string {
  const lines = [
    `# ${screen.name}`,
    '',
    `Section: ${project.name}`,
    `Route: \`${screen.route}\``,
    `Type: ${screen.kind}`,
    '',
    `**Intent.** ${screen.intent}`,
    '',
    `**Entities.** ${screen.entityIds.join(', ')}`,
    '',
    '## Blocks',
    '',
    ...screen.blocks.map((b) => `- \`${b.type}\``),
    '',
    '## States',
    '',
    ...screen.states.map((s) => `- **${s.name}** — ${s.detail}`),
    '',
    '## Acceptance',
    '',
    ...screen.acceptance.map((a) => `- [ ] ${a}`),
    '',
  ]
  return lines.join('\n')
}

export function SectionPage({ project, section }: { project: Project; section: Section }) {
  const { captures, capture, notify } = useStore()
  const download = useFileDownload()
  const p = sectionProgress(section, captures)
  const done = completedPhases(project, captures)
  const index = project.sections.findIndex((s) => s.id === section.id)
  const next = project.sections[index + 1]

  const captureAll = () => {
    capture(section.screens.map((s) => s.id))
    notify(`${section.screens.length} screens captured`)
  }

  const steps: RailStep[] = [
    {
      id: 'spec',
      title: 'Spec',
      state: p.spec ? 'complete' : 'current',
      hint: `${section.requirements.length} requirements`,
      children: (
        <div className="lz-stack">
          <div className="lz-card">
            <p className="lz-body">{section.purpose}</p>
            <div className="lz-sep" />
            <p className="lz-cmd-label">Jobs this section does</p>
            <ul className="lz-bullets" style={{ marginTop: 8 }}>
              {section.jobs.map((j) => <li key={j}>{j}</li>)}
            </ul>
          </div>

          <div className="lz-card">
            <div className="lz-card-h" style={{ marginBottom: 10 }}>
              <div className="lz-card-hL"><h2>Requirements</h2></div>
              <span className="lz-pill">{section.requirements.length}</span>
            </div>
            <div className="lz-stack" style={{ gap: 7 }}>
              {section.requirements.map((r) => (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 9, alignItems: 'start', fontSize: 13 }}>
                  <Icon name="CircleCheck" size={13} style={{ marginTop: 3, color: 'var(--faint)' }} />
                  <span style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>{r.text}</span>
                  <span className={`lz-pill ${r.priority === 'must' ? 'peach' : r.priority === 'should' ? 'blue' : ''}`}>{r.priority}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lz-cols-2">
            <div className="lz-card">
              <p className="lz-cmd-label">Acceptance tests</p>
              <ul className="lz-bullets" style={{ marginTop: 8 }}>
                {section.tests.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
            <div className="lz-card">
              <p className="lz-cmd-label">Not in this section</p>
              <ul className="lz-bullets" style={{ marginTop: 8 }}>
                {section.outOfScope.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'data',
      title: 'Sample data',
      state: p.data ? 'complete' : 'upcoming',
      hint: `${section.entityIds.length} entities`,
      children: (
        <div className="lz-stack">
          {section.entityIds.map((entityId) => {
            const entity = project.data.entities.find((e) => e.id === entityId)
            if (!entity) return null
            return (
              <div className="lz-card" key={entityId} style={{ padding: 0, overflow: 'hidden' }}>
                <div className="lz-between" style={{ padding: '12px 14px' }}>
                  <div className="lz-card-hL">
                    <Icon name={entity.icon} size={14} />
                    <b style={{ font: '600 13.5px/1.3 var(--font)' }}>{entity.name}</b>
                  </div>
                  <span className="lz-pill">{entity.rows.length} rows · seeded</span>
                </div>
                <div className="lz-table-scroll" style={{ border: 0, borderRadius: 0, borderTop: '1px solid var(--line)' }}>
                  <table className="lz-table">
                    <thead>
                      <tr>{entity.fields.slice(0, 5).map((f) => <th key={f.name}>{f.name}</th>)}</tr>
                    </thead>
                    <tbody>
                      {entity.rows.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          {entity.fields.slice(0, 5).map((f) => (
                            <td key={f.name}>{formatField(f, row[f.name], project.currency)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
          <p className="lz-hint" style={{ marginTop: 0 }}>
            Sample rows are compiled from the entity fields, so every table, card and chart on the screens renders with real-looking values.
          </p>
        </div>
      ),
    },
    {
      id: 'screens',
      title: 'Screen designs',
      state: p.screens ? 'complete' : 'upcoming',
      hint: `${section.screens.length} screens`,
      children: (
        <div className="lz-stack" style={{ gap: 9 }}>
          {section.screens.map((screen) => (
            <Link key={screen.id} to={`sections/${section.id}/screen-designs/${screen.id}`} className="lz-secrow">
              <span className="lz-secrow-n">
                <Icon name={screen.kind === 'analytics' ? 'Gauge' : screen.kind === 'board' ? 'Columns3' : 'Layout'} size={12} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span className="lz-secrow-t">{screen.name}</span>
                <span className="lz-secrow-d">{screen.intent}</span>
                <span className="lz-secrow-foot">
                  <span className="lz-pill mono">{screen.route}</span>
                  <span className="lz-pill">{screen.kind}</span>
                  <span className="lz-pill">{screen.blocks.length} blocks</span>
                </span>
              </span>
              <Icon name="ChevronRight" size={16} className="lz-chev" />
            </Link>
          ))}
        </div>
      ),
    },
    {
      id: 'screenshots',
      title: 'Screenshots',
      state: p.screenshots ? 'complete' : p.screens ? 'current' : 'upcoming',
      hint: `${p.captured} of ${p.total} captured`,
      children: p.screenshots ? (
        <div className="lz-stack">
          <div className="lz-cols-2">
            {section.screens.map((screen) => (
              <div className="lz-card" key={screen.id} style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 8, background: 'var(--card-soft)' }}>
                  <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--line)' }}>
                    <ScreenThumb project={project} screen={screen} />
                  </div>
                </div>
                <div className="lz-between" style={{ padding: '9px 11px', borderTop: '1px solid var(--line-soft)' }}>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ font: '600 12px/1.3 var(--font)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{screen.name}</b>
                    <span className="lz-hint" style={{ marginTop: 0 }}>{screen.route}</span>
                  </div>
                  <button
                    className="lz-btn small quiet"
                    title={`Download the ${screen.name} spec`}
                    onClick={() => download(`${section.id}-${screen.id}.md`, screenSpec(screen, project))}
                  >
                    <Icon name="Download" size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="lz-between">
            <p className="lz-hint" style={{ marginTop: 0 }}>Captured renders are stored with this product in your browser.</p>
            <button className="lz-btn small quiet" onClick={() => { capture(section.screens.map((s) => s.id)); notify('Screens recaptured') }}>
              <Icon name="RefreshCw" size={12} /> Recapture
            </button>
          </div>
        </div>
      ) : (
        <EmptyState
          icon="Image"
          title="No screenshots yet"
          description={
            <>
              Screenshots are the one artefact this flow does not assume. Capture the {section.screens.length} rendered screens for <b>{section.name}</b>; they land in the export package.
            </>
          }
          command={`lula capture --section ${section.id}`}
          action={
            <button className="lz-btn primary" onClick={captureAll}>
              <Icon name="Image" size={13} /> Capture {section.screens.length} screens
            </button>
          }
        />
      ),
    },
  ]

  return (
    <div className="lz-view">
      <SubHeader
        backTo="sections"
        backLabel="Sections"
        eyebrow={`Section ${index + 1} of ${project.sections.length} · ${section.priority}`}
        title={section.name}
        actions={
          <>
            <span className={`lz-pill ${p.complete ? 'green' : 'amber'}`}>
              {p.complete ? 'Complete' : `${[p.spec, p.data, p.screens, p.screenshots].filter(Boolean).length} of 4 steps`}
            </span>
            {!p.screenshots && (
              <button className="lz-btn small" onClick={captureAll}>
                <Icon name="Image" size={13} /> Capture all
              </button>
            )}
          </>
        }
      />

      {(!done['data-shape'] || !done.design) && (
        <div style={{ marginBottom: 18 }}>
          <WarningBanner
            storageKey={`lula.banner.${project.id}`}
            text="Consider completing Data Shape and Design before designing sections."
          />
        </div>
      )}

      <StepRail steps={steps} />

      <div className="lz-between" style={{ marginTop: 28, borderTop: '1px solid var(--line-soft)', paddingTop: 16 }}>
        <Link to="sections" className="lz-btn small quiet">
          <Icon name="ArrowLeft" size={13} /> All sections
        </Link>
        {next ? (
          <Link to={`sections/${next.id}`} className="lz-btn small">
            Next: {next.name} <Icon name="ArrowRight" size={13} />
          </Link>
        ) : (
          <Link to="export" className="lz-btn small primary">
            Continue to Export <Icon name="ArrowRight" size={13} />
          </Link>
        )}
      </div>
    </div>
  )
}
