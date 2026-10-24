import { useMemo, useState } from 'react'
import type { Project } from '../types'
import { buildPackage, packageSizeKb } from '../export/package'
import { downloadProjectZip } from '../lib/download'
import { Icon } from '../components/Icons'
import { ViewHead, CopyButton } from '../components/ui'
import { download } from '../lib/format'

export function HandoffView({ project }: { project: Project }) {
  const files = useMemo(() => buildPackage(project), [project])
  const [active, setActive] = useState(files[0]?.path ?? '')
  const [zipping, setZipping] = useState(false)
  const current = files.find((f) => f.path === active) ?? files[0]

  const agentBrief = files.find((f) => f.path === 'agent-implementation-brief.md')?.content ?? ''

  return (
    <div>
      <ViewHead
        eyebrow="Module 06 · handoff"
        title="Everything the build needs, in one folder"
        lede={`${files.length} files · ${packageSizeKb(files)} KB. Markdown you can review, SQL you can run, tokens you can paste, tests you can fail first. Deterministic and offline — nothing here is a placeholder waiting on a model.`}
        actions={
          <>
            <CopyButton text={agentBrief} label="Copy agent brief" />
            <button
              className="btn btn-primary btn-sm"
              onClick={async () => {
                setZipping(true)
                await downloadProjectZip(project)
                setZipping(false)
              }}
            >
              <Icon name={zipping ? 'RefreshCw' : 'Download'} size={12} className={zipping ? 'spin' : undefined} />
              {zipping ? 'Packaging…' : 'Download ZIP'}
            </button>
          </>
        }
      />

      <div className="grid g4" style={{ gap: 12, marginBottom: 18 }}>
        {[
          { label: 'Files', value: String(files.length), hint: 'all text, all diffable' },
          { label: 'Size', value: `${packageSizeKb(files)} KB`, hint: 'no binary assets' },
          { label: 'Sections', value: String(project.sections.length), hint: `${project.sections.reduce((n, s) => n + s.screens.length, 0)} screens` },
          { label: 'Score', value: `${project.audit.score}/100`, hint: 'verified on compile' },
        ].map((s) => (
          <div className="panel panel-pad" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginTop: 6 }}>{s.value}</div>
            <div className="tiny faint" style={{ marginTop: 4 }}>{s.hint}</div>
          </div>
        ))}
      </div>

      <div className="two-pane">
        <div className="panel" style={{ padding: 8 }}>
          <div className="nav-label" style={{ padding: '6px 8px' }}>Package</div>
          <div className="file-tree">
            {files.map((f) => (
              <button key={f.path} className={`file-row${f.path === active ? ' active' : ''}`} onClick={() => setActive(f.path)} style={{ textAlign: 'left' }}>
                <Icon name={f.path.endsWith('.sql') ? 'Landmark' : f.path.endsWith('.json') ? 'Cog' : f.path.includes('/') ? 'FileText' : 'FileCheck'} size={12} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.path}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <Icon name="FileText" size={14} />
            <h3 className="mono" style={{ fontSize: 12 }}>{current?.path}</h3>
            <div className="row" style={{ marginLeft: 'auto', gap: 6 }}>
              <CopyButton text={current?.content ?? ''} />
              <button
                className="btn btn-sm"
                onClick={() => download(current?.path.split('/').pop() ?? 'file.txt', current?.content ?? '', 'text/plain')}
              >
                <Icon name="Download" size={12} /> Save
              </button>
            </div>
          </div>
          <div className="panel-body">
            <pre className="code" style={{ maxHeight: 620, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {current?.content}
            </pre>
          </div>
        </div>
      </div>

      <div className="grid g2" style={{ gap: 16, marginTop: 18, alignItems: 'start' }}>
        <div className="panel">
          <div className="panel-head">
            <Icon name="RefreshCw" size={14} />
            <h3>Reproduce this package</h3>
          </div>
          <div className="panel-body">
            <p className="small muted" style={{ lineHeight: 1.65, marginBottom: 12 }}>
              These five values fully determine the output. Save them next to the package; anyone can regenerate it, and
              a diff between two seeds is a reviewable design change rather than a vibe.
            </p>
            <pre className="code" style={{ maxHeight: 220 }}>
              {JSON.stringify(
                {
                  seed: project.seed,
                  archetypeId: project.archetypeId,
                  genome: project.genome,
                  currency: project.currency,
                  moduleSeeds: project.moduleSeeds,
                },
                null,
                2,
              )}
            </pre>
            <div style={{ marginTop: 10 }}>
              <CopyButton
                text={JSON.stringify(
                  { seed: project.seed, archetypeId: project.archetypeId, genome: project.genome, currency: project.currency, moduleSeeds: project.moduleSeeds },
                  null,
                  2,
                )}
                label="Copy reproduce block"
              />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <Icon name="Sparkles" size={14} />
            <h3>Implementation notes</h3>
          </div>
          <div className="panel-body small muted" style={{ lineHeight: 1.75 }}>
            <ol className="num-list">
              <li><span>Copy the ZIP into the repository, or keep it beside it in <span className="mono">/design</span>.</span></li>
              <li><span>Paste <span className="mono">agent-implementation-brief.md</span> before asking for code. Do not summarise it — the constraints are the value.</span></li>
              <li><span>Apply <span className="mono">schema.sql</span>, then <span className="mono">tokens.css</span>, then build the shell, then sections in roadmap order.</span></li>
              <li><span>Write the failing test from <span className="mono">tests.md</span> first. Every section ships with statements, not screen recordings.</span></li>
              <li><span>Re-run the audit after any genome change; if the score drops, the change is not ready.</span></li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
