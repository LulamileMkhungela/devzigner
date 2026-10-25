import { StepGuide } from '../components/StepGuide'
import { BriefComposer } from '../components/BriefComposer'
import { StageConfirm } from '../components/StageConfirm'
import { useState } from 'react'
import type { Project } from '../types'
import { useStore } from '../lib/store'
import { Collapsible, NextPhase, PhaseHeader, useFileDownload } from '../components/ui'
import { Link } from '../lib/router'
import { Icon } from '../components/Icons'
import { buildPackage } from '../export/package'
import { seedPhrase } from '../engine'

export function ProductPage({ project }: { project: Project }) {
  const { regenerate, notify, confirmed } = useStore()
  const download = useFileDownload()
  const [busy, setBusy] = useState(false)
  const brief = project.brief

  const compile = () => {
    setBusy(true)
    regenerate(project)
    setBusy(false)
    notify('Product recompiled from the same seed')
  }

  const downloadBrief = () => {
    const file = buildPackage(project).find((f) => f.path === 'product-brief.md')
    if (file) download('product-brief.md', file.content)
  }

  return (
    <div className="lz-view">
      <PhaseHeader
        project={project}
        current="product"
        title={project.name}
        subtitle={brief.tagline}
        actions={
          <>
            <button className="lz-btn small" onClick={downloadBrief}>
              <Icon name="Download" size={13} /> Brief
            </button>
            <button className="lz-btn small" onClick={compile} disabled={busy}>
              <Icon name="RefreshCw" size={13} /> Recompile
            </button>
          </>
        }
      />

      <BriefComposer />

      <StepGuide phase="product" />

      <div className="lz-stack">
        <div className="lz-cols-4">
          <Stat label="Archetype" value={project.archetypeLabel} />
          <Stat label="Sections" value={String(project.sections.length)} />
          <Stat label="Screens" value={String(project.sections.reduce((n, s) => n + s.screens.length, 0))} />
          <Stat label="Seed" value={seedPhrase(project.seed)} />
        </div>

        <div className="lz-rail">
          <section className="lz-rail-step" data-state="complete">
            <span className="lz-rail-line" aria-hidden />
            <span className="lz-rail-n">
              <Icon name="Check" size={13} strokeWidth={2.6} />
            </span>
            <div className="lz-rail-label">Product vision</div>
            <div className="lz-rail-body">
              <div className="lz-stack">
                <div className="lz-card">
                  <div className="lz-card-h">
                    <div className="lz-card-hL">
                      <h2>The idea</h2>
                    </div>
                    <span className="lz-pill peach">{brief.category}</span>
                  </div>
                  <p className="lz-body" style={{ marginTop: 10 }}>{brief.summary}</p>
                  <div style={{ marginTop: 12, paddingLeft: 12, borderLeft: '2px solid var(--accent-line)' }}>
                    <p className="lz-cmd-label" style={{ marginBottom: 4 }}>Value proposition</p>
                    <p className="lz-body">{brief.elevator}</p>
                  </div>
                </div>

                <Collapsible title="Problems" count={brief.problems.length} defaultOpen>
                  <div className="lz-cols-3">
                    {brief.problems.map((p) => (
                      <div key={p.title} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 13, background: 'var(--card-soft)' }}>
                        <b style={{ font: '600 13px/1.35 var(--font)', color: 'var(--ink)', display: 'block' }}>{p.title}</b>
                        <p style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.55 }}>{p.detail}</p>
                        <p style={{ marginTop: 8, fontSize: 11.5, color: 'var(--accent)' }}>{p.cost}</p>
                      </div>
                    ))}
                  </div>
                </Collapsible>

                <Collapsible title="Who it is for" count={brief.personas.length} icon="Users">
                  <div className="lz-stack" style={{ gap: 10 }}>
                    {brief.personas.map((persona) => (
                      <div key={persona.name} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 13 }}>
                        <div className="lz-between" style={{ marginBottom: 6 }}>
                          <b style={{ font: '600 13.5px/1.3 var(--font)', color: 'var(--ink)' }}>{persona.name}</b>
                          <span className="lz-pill">{persona.role}</span>
                        </div>
                        <dl className="lz-kv">
                          <div className="lz-kv-row"><dt>Goal</dt><dd>{persona.goal}</dd></div>
                          <div className="lz-kv-row"><dt>Pain</dt><dd>{persona.pain}</dd></div>
                        </dl>
                        <p className="lz-quote">“{persona.quote}”</p>
                        <p style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 6 }}>What is actually true: {persona.quoteTruth}</p>
                      </div>
                    ))}
                  </div>
                </Collapsible>

                <Collapsible title="What is different" count={brief.differentiators.length} icon="Sparkles">
                  <div className="lz-cols-2">
                    {brief.differentiators.map((d) => (
                      <div key={d.title}>
                        <b style={{ font: '600 12.5px/1.35 var(--font)', color: 'var(--ink)' }}>{d.title}</b>
                        <p style={{ marginTop: 3, fontSize: 12.5, lineHeight: 1.55 }}>{d.detail}</p>
                      </div>
                    ))}
                  </div>
                </Collapsible>

                <Collapsible title="Success measures" count={brief.metrics.length} icon="Target">
                  <dl className="lz-kv">
                    {brief.metrics.map((m) => (
                      <div className="lz-kv-row" key={m.label}>
                        <dt>{m.label}</dt>
                        <dd>
                          <b>{m.target}</b> — {m.why}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Collapsible>

                <Collapsible title="Principles, voice and boundaries" icon="BookOpen">
                  <div className="lz-cols-2">
                    <div>
                      <b style={{ font: '600 12px/1 var(--font)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--faint)' }}>Principles</b>
                      <ul className="lz-bullets" style={{ marginTop: 8 }}>
                        {brief.principles.map((p) => <li key={p}>{p}</li>)}
                      </ul>
                    </div>
                    <div>
                      <b style={{ font: '600 12px/1 var(--font)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--faint)' }}>Voice · {brief.voice.tone}</b>
                      <ul className="lz-bullets" style={{ marginTop: 8 }}>
                        {brief.voice.say.map((p) => <li key={p}>{p}</li>)}
                      </ul>
                      <p className="lz-hint" style={{ marginTop: 8 }}>Never say: {brief.voice.avoid.join(', ')}</p>
                    </div>
                  </div>
                  <div className="lz-sep" />
                  <div className="lz-cols-2">
                    <div>
                      <b style={{ font: '600 12px/1 var(--font)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--faint)' }}>Not in scope</b>
                      <ul className="lz-bullets" style={{ marginTop: 8 }}>
                        {brief.nonGoals.map((p) => <li key={p}>{p}</li>)}
                      </ul>
                    </div>
                    <div>
                      <b style={{ font: '600 12px/1 var(--font)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--faint)' }}>Integrations</b>
                      <div className="lz-fieldlist" style={{ marginTop: 8 }}>
                        {brief.integrations.map((p) => <span key={p}>{p}</span>)}
                      </div>
                    </div>
                  </div>
                </Collapsible>
              </div>
            </div>
          </section>

          <section className="lz-rail-step" data-state="complete">
            <span className="lz-rail-line" aria-hidden />
            <span className="lz-rail-n">
              <Icon name="Check" size={13} strokeWidth={2.6} />
            </span>
            <div className="lz-rail-label">Roadmap</div>
            <div className="lz-rail-body">
              <div className="lz-stack">
                <p className="lz-muted" style={{ fontSize: 13 }}>{project.roadmap.sequencingNote}</p>
                <div className="lz-cols-3">
                  {project.roadmap.phases.map((phase) => (
                    <div className="lz-tile" key={phase.id} style={{ padding: 15 }}>
                      <span className="lz-pill outline" style={{ alignSelf: 'flex-start', marginBottom: 4 }}>{phase.horizon}</span>
                      <b style={{ fontSize: 14 }}>{phase.name}</b>
                      <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{phase.goal}</p>
                      <ul className="lz-bullets" style={{ fontSize: 11.5, marginTop: 4 }}>
                        {phase.outcomes.map((o) => <li key={o}>{o}</li>)}
                      </ul>
                      <p style={{ fontSize: 11, color: 'var(--faint)', marginTop: 6 }}>{phase.sectionIds.length} sections · {phase.risk}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <Collapsible title="Engine log" icon="Cog" meta={`${project.engineNotes.length} steps, no model calls`}>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {project.engineNotes.map((note) => (
              <li key={note} style={{ fontSize: 12.5, lineHeight: 1.55 }}>{note}</li>
            ))}
          </ol>
        </Collapsible>

        <div className="lz-card" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span className="lz-tile-ic" style={{ width: 36, height: 36 }}><Icon name="Route" size={17} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ font: '600 13.5px/1.3 var(--font)' }}>UX flows</b>
            <p className="lz-hint" style={{ marginTop: 2 }}>
              {project.flows.length} flows · {project.flows.reduce((n, f) => n + f.steps.length, 0)} steps, every one landing on a compiled screen.
            </p>
          </div>
          <Link to="flows" className="lz-btn small">Open flows <Icon name="ArrowRight" size={13} /></Link>
        </div>

        <NextPhase
          to="data-shape"
          label="Continue to Data Shape"
          hint={
            confirmed.includes('product')
              ? 'The brief is compiled. Next: the records it needs.'
              : 'Mark Product complete above to unlock Data Shape.'
          }
          disabled={!confirmed.includes('product')}
        />
      </div>
      <StageConfirm phase="product" />
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
