import { StepGuide } from '../components/StepGuide'
import { StageConfirm } from '../components/StageConfirm'
import { useMemo, useState } from 'react'
import type { Project } from '../types'
import { useStore } from '../lib/store'
import { CheckRow, Collapsible, CommandBox, PhaseHeader, useCopy } from '../components/ui'
import { Icon } from '../components/Icons'
import { buildPackage, packageSizeKb } from '../export/package'
import { downloadProjectZip } from '../lib/download'
import { readiness } from '../lib/progress'
import { Link, navigate } from '../lib/router'

const INCLUDED = [
  { icon: 'FileText', title: 'Product brief & roadmap', detail: 'Why it exists, who it serves, what success looks like, and the build order.' },
  { icon: 'Database', title: 'Data shape', detail: 'Entities, fields, relationships, sample rows and a runnable schema.sql.' },
  { icon: 'Palette', title: 'Design system', detail: 'Colour, type, scale, radii, spacing, motion, tokens.css and tokens.json.' },
  { icon: 'LayoutList', title: 'Section specs', detail: 'A markdown spec per section: jobs, requirements, tests, out of scope.' },
  { icon: 'LayoutDashboard', title: 'Screen designs', detail: 'Every screen as a block-by-block spec with states and acceptance.' },
  { icon: 'ShieldCheck', title: 'Audit & agent brief', detail: 'The 24-check audit plus one-shot prompts, milestone instructions and Agent OS standards.' },
  { icon: 'Boxes', title: 'Copy-paste components', detail: 'Props-based, responsive React per screen, with tests.md and screenshots. Typechecked before export.' },
]

export function ExportPage({ project }: { project: Project }) {
  const { captures, regenerate, notify, projects, create, versions } = useStore()
  const copy = useCopy()
  const [zipping, setZipping] = useState(false)
  const rows = readiness(project, captures)
  const ready = rows.every((r) => r.state !== 'fail')
  const files = useMemo(() => buildPackage(project, versions), [project, versions])
  const kb = packageSizeKb(files)
  const grouped = useMemo(() => {
    const map = new Map<string, typeof project.audit.checks>()
    for (const check of project.audit.checks) {
      const list = map.get(check.group) ?? []
      list.push(check)
      map.set(check.group, list)
    }
    return Array.from(map.entries())
  }, [project.audit.checks])

  const download = async () => {
    setZipping(true)
    try {
      await downloadProjectZip(project, versions)
      notify('Package downloaded')
    } finally {
      setZipping(false)
    }
  }

  return (
    <div className="lz-view">
      <StepGuide phase="export" />
      <StageConfirm phase="export" />
      <PhaseHeader
        project={project}
        current="export"
        title="Export"
        subtitle="Everything the build needs, generated locally from one seed. No keys, no model calls, no missing pieces."
        actions={
          <button className="lz-btn small" onClick={() => { regenerate(project); notify('Recompiled from the same seed') }}>
            <Icon name="RefreshCw" size={13} /> Recompile
          </button>
        }
      />

      <div className="lz-stack">
        <div className="lz-card">
          <div className="lz-card-h" style={{ marginBottom: 12 }}>
            <div className="lz-card-hL">
              <span className="lz-num">{project.audit.score}</span>
              <h2>Readiness</h2>
            </div>
            <span className={`lz-pill ${ready ? 'green' : 'amber'}`}>{ready ? 'Ready to ship' : 'Needs attention'}</span>
          </div>
          {rows.map((row) => (
            <CheckRow key={row.label} state={row.state} label={row.label} detail={row.detail} />
          ))}
        </div>

        <div className="lz-ready">
          <span className="lz-ready-ic">
            <Icon name="PackageCheck" size={21} />
          </span>
          <div>
            <h2>{ready ? 'Your package is ready' : 'Your package is nearly ready'}</h2>
            <p>{files.length} files · {kb} kB · generated in this browser, deterministic from seed {project.seed.toString(36)}</p>
          </div>
          <div className="lz-row">
            <button className="lz-btn primary" onClick={download} disabled={zipping}>
              <Icon name={zipping ? 'RefreshCw' : 'Download'} size={14} />
              {zipping ? 'Packaging…' : 'Download package'}
            </button>
          </div>
        </div>

        <Collapsible title="What's included" icon="FolderOpen" count={`${files.length} files`} defaultOpen>
          <div className="lz-tiles">
            {INCLUDED.map((item) => (
              <div className="lz-tile" key={item.title}>
                <span className="lz-tile-ic"><Icon name={item.icon} size={15} /></span>
                <b>{item.title}</b>
                <span>{item.detail}</span>
              </div>
            ))}
          </div>
          <div className="lz-sep" />
          <p className="lz-cmd-label">Every file in this package</p>
          <div className="lz-fieldlist" style={{ marginTop: 8 }}>
            {files.map((f) => <span key={f.path}>{f.path}</span>)}
          </div>
        </Collapsible>

        <Collapsible
          title="Prototype layer"
          icon="Layers"
          count={`${files.filter((f) => f.path.startsWith('system/') || f.path.startsWith('src/') || f.path.startsWith('wiki/')).length} files`}
          meta={`${project.flows.length} flows · ${project.system.components.length} components · ${versions.length} snapshots`}
        >
          <div className="lz-cols-3">
            <div>
              <p className="lz-cmd-label">System</p>
              <div className="lz-fieldlist" style={{ marginTop: 6 }}>
                {files.filter((f) => f.path.startsWith('system/')).map((f) => <span key={f.path}>{f.path}</span>)}
              </div>
            </div>
            <div>
              <p className="lz-cmd-label">Data layer</p>
              <div className="lz-fieldlist" style={{ marginTop: 6 }}>
                {files.filter((f) => f.path.startsWith('src/data/') || f.path === 'src/components/app-shell.tsx').map((f) => <span key={f.path}>{f.path}</span>)}
              </div>
              <p className="lz-hint">Typed repositories + a mock adapter. UI code imports the interface, never a fixture.</p>
            </div>
            <div>
              <p className="lz-cmd-label">Wiki</p>
              <div className="lz-fieldlist" style={{ marginTop: 6 }}>
                {files.filter((f) => f.path.startsWith('wiki/')).map((f) => <span key={f.path}>{f.path}</span>)}
              </div>
              <p className="lz-hint">Commit this folder beside the code; one worktree per branch.</p>
            </div>
          </div>
          <div className="lz-row" style={{ marginTop: 12 }}>
            <Link to="wiki" className="lz-btn small"><Icon name="BookOpen" size={13} /> Open the wiki</Link>
            <Link to="system" className="lz-btn small quiet"><Icon name="Layers" size={13} /> System</Link>
            <Link to="flows" className="lz-btn small quiet"><Icon name="Route" size={13} /> Flows</Link>
          </div>
        </Collapsible>

        <div className="lz-cols-2">
          <Collapsible title="Option A — incremental" icon="Route" meta="one section at a time">
            <p>Work the build order the way the roadmap sequences it. Each section ships independently.</p>
            <ol style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
              <li>Drop the package into the repo root of the project.</li>
              <li>Point the coding agent at <code>agent-implementation-brief.md</code>.</li>
              <li>Build <b>sections/{project.sections[0]?.id}.md</b> first, then run the acceptance tests in <code>tests.md</code>.</li>
              <li>Move to the next section only when its screens pass.</li>
            </ol>
            <CommandBox command={`lula build --section ${project.sections[0]?.id ?? 'section'}`} />
          </Collapsible>

          <Collapsible title="Option B — one shot" icon="Zap" meta="whole product">
            <p>Hand the full package over and let the agent scaffold everything, then review section by section.</p>
            <ol style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
              <li>Unzip at the repo root.</li>
              <li>Give the agent <code>agent-implementation-brief.md</code> and <code>screens.md</code>.</li>
              <li>Apply <code>tokens.css</code> and <code>schema.sql</code> before any component work.</li>
              <li>Use <code>audit.md</code> as the definition of done.</li>
            </ol>
            <CommandBox command="lula build --all --from agent-implementation-brief.md" />
          </Collapsible>
        </div>

        <Collapsible title="Audit" icon="ShieldCheck" count={`${project.audit.score}/100`} meta={`${project.audit.checks.length} checks · ${project.audit.checks.filter((c) => c.status === 'fail').length} fail`}>
          <p style={{ fontSize: 13 }}>{project.audit.summary}</p>
          <div className="lz-sep" />
          <div className="lz-stack" style={{ gap: 8 }}>
            {grouped.map(([group, checks]) => (
              <div key={group}>
                <p className="lz-cmd-label">{group} · {checks.filter((c) => c.status === 'pass').length}/{checks.length} pass</p>
                <div style={{ marginTop: 6 }}>
                  {checks.map((c) => (
                    <CheckRow key={c.id} state={c.status} label={c.label} detail={c.detail} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Collapsible>

        <Collapsible title="Engine log" icon="Cog" count={`${project.engineNotes.length} steps`}>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
            {project.engineNotes.map((n) => <li key={n}>{n}</li>)}
          </ol>
        </Collapsible>

        <div className="lz-card" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ font: '600 13.5px/1.3 var(--font)' }}>Need a second product?</b>
            <p className="lz-hint" style={{ marginTop: 2 }}>{projects.length} compiled product{projects.length === 1 ? '' : 's'} live in this browser.</p>
          </div>
          <button className="lz-btn small" onClick={() => { create({}); navigate(''); notify('New product compiled') }}>
            <Icon name="Plus" size={13} /> Compile another
          </button>
          <button className="lz-btn small quiet" onClick={() => copy(JSON.stringify({ seed: project.seed, archetypeId: project.archetypeId, genome: project.genome }, null, 2))}>
            <Icon name="Copy" size={13} /> Copy recipe
          </button>
        </div>
      </div>
    </div>
  )
}
