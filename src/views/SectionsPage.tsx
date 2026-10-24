import type { Project } from '../types'
import { StepGuide } from '../components/StepGuide'
import { useStore } from '../lib/store'
import { NextPhase, PhaseHeader, ProgressDots, WarningBanner } from '../components/ui'
import { Icon } from '../components/Icons'
import { Link } from '../lib/router'
import { completedPhases, sectionProgress, sectionStats } from '../lib/progress'

export function SectionsPage({ project }: { project: Project }) {
  const { captures } = useStore()
  const stats = sectionStats(project, captures)
  const done = completedPhases(project, captures)

  return (
    <div className="lz-view">
      <StepGuide phase="sections" />
      <PhaseHeader
        project={project}
        current="sections"
        title="Sections"
        subtitle="The build order. Each section is a slice of the product with its own spec, sample data, screens and captured screenshots."
        actions={
          <span className="lz-pill">
            {stats.done} of {stats.total} completed
          </span>
        }
      />

      <div className="lz-stack">
        {(!done['data-shape'] || !done.design) && (
          <WarningBanner
            storageKey={`lula.banner.${project.id}`}
            text="Consider completing Data Shape and Design before designing sections."
          />
        )}
        <div className="lz-between">
          <p className="lz-muted">
            {stats.done === stats.total
              ? 'Every section is specified, screens are designed and captured. The package is ready to export.'
              : `${stats.total - stats.done} section${stats.total - stats.done === 1 ? '' : 's'} still waiting on screenshots.`}
          </p>
          <span className="lz-hint" style={{ marginTop: 0 }}>{project.archetypeLabel} · seed {project.seed.toString(36)}</span>
        </div>

        <div className="lz-seclist">
          {project.sections.map((section, index) => {
            const p = sectionProgress(section, captures)
            return (
              <Link key={section.id} to={`sections/${section.id}`} className={`lz-secrow${p.complete ? ' is-done' : ''}`}>
                <span className="lz-secrow-n">
                  {p.complete ? <Icon name="Check" size={12} strokeWidth={2.6} /> : index + 1}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="lz-secrow-t">
                    {section.name}
                    <span className={`lz-pill ${section.priority === 'MVP' ? 'peach' : section.priority === 'Next' ? 'blue' : ''}`}>
                      {section.priority}
                    </span>
                  </span>
                  <span className="lz-secrow-d">{section.purpose}</span>
                  <span className="lz-secrow-foot">
                    <ProgressDots total={4} on={[p.spec, p.data, p.screens, p.screenshots].filter(Boolean).length} label="Spec" />
                    <span className="lz-pill">Data · {section.entityIds.length}</span>
                    <span className="lz-pill">{section.screens.length} Screens</span>
                    <span className={`lz-pill ${p.screenshots ? 'green' : 'amber'}`}>
                      {p.captured}/{p.total} Screenshots
                    </span>
                  </span>
                </span>
                <Icon name="ChevronRight" size={16} className="lz-chev" />
              </Link>
            )
          })}
        </div>

        <div>
          <NextPhase
            to="export"
            label="Continue to Export"
            disabled={!stats.all}
            hint={
              stats.all
                ? 'All sections are complete. Build the handoff package.'
                : 'Capture the remaining screenshots to unlock export.'
            }
          />
          {!stats.all && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
              <Link to="export" className="lz-btn small quiet">
                Preview export readiness <Icon name="ArrowRight" size={13} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
