import { useMemo, useState } from 'react'
import { ARCHETYPES, GENOME_PRESETS, genomeFromSeed, seedPhrase, compileProject } from '../engine'
import type { Genome } from '../types'
import { useStore } from '../lib/store'
import { navigate } from '../lib/router'
import { Icon } from '../components/Icons'
import { timeAgo } from '../lib/format'

const EXAMPLE_IDEAS = [
  'A marketplace for township artisans',
  'Run a six-week coding cohort with marking',
  'Track repairs across 200 rental units',
  'A dispatch desk for 40 delivery trucks',
  'Money guardrails for a small finance team',
  '',
]

const CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP', 'NGN', 'KES', 'AUD', 'CAD']

const TRAITS: { key: keyof Genome; label: string; low: string; high: string }[] = [
  { key: 'density', label: 'Density', low: 'Airy', high: 'Compact' },
  { key: 'warmth', label: 'Warmth', low: 'Cool', high: 'Warm' },
  { key: 'contrast', label: 'Contrast', low: 'Soft', high: 'Bold' },
  { key: 'expression', label: 'Expression', low: 'Quiet', high: 'Expressive' },
  { key: 'geometry', label: 'Geometry', low: 'Sharp', high: 'Rounded' },
]

export function Home() {
  const { projects, create, remove } = useStore()
  const [idea, setIdea] = useState('')
  const [archetypeId, setArchetypeId] = useState('marketplace')
  const [seed, setSeed] = useState(() => 741293)
  const [genome, setGenome] = useState<Genome>(() => genomeFromSeed(741293))
  const [genomeLocked, setGenomeLocked] = useState(false)
  const [currency, setCurrency] = useState('ZAR')
  const [nameOverride, setNameOverride] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [busy, setBusy] = useState(false)

  const phrase = useMemo(() => seedPhrase(seed), [seed])
  const previewName = useMemo(
    () => compileProject({ idea, seed, archetypeId, genome, currency, nameOverride }).name,
    [idea, seed, archetypeId, genome, currency, nameOverride],
  )

  const reroll = () => {
    const next = Math.floor(Math.random() * 1_000_000_000)
    setSeed(next)
    if (!genomeLocked) setGenome(genomeFromSeed(next))
  }

  const compile = () => {
    setBusy(true)
    const project = create({ idea, seed, archetypeId, genome, currency, nameOverride })
    setTimeout(() => {
      setBusy(false)
      navigate(`/p/${project.id}/brief`)
    }, 240)
  }

  const setTrait = (key: keyof Genome, value: number) => {
    setGenomeLocked(true)
    setGenome((g) => ({ ...g, [key]: value }))
  }

  return (
    <div className="wrap">
      <section className="hero">
        <div className="fade-in">
          <div className="eyebrow">Deterministic design compiler · no prompts</div>
          <h1>
            Design the product
            <br />
            <em>before</em> the code.
          </h1>
          <p className="lede" style={{ fontSize: 18 }}>
            Lula DevZign turns one seed into a complete, internally consistent product package: brief, data model,
            design system, interactive screens, tests and an agent-ready handoff. It asks you no questions, calls no
            model, and never opens a blank page.
          </p>

          <div className="row" style={{ gap: 8, marginTop: 22, flexWrap: 'wrap' }}>
            <span className="tag tag-accent">
              <Icon name="Zap" size={11} /> 100% local compute
            </span>
            <span className="tag">12 domain archetypes</span>
            <span className="tag">computed audit</span>
            <span className="tag">ZIP handoff</span>
          </div>

          <div className="row" style={{ gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
            <button
              className="btn"
              onClick={() => {
                const next = Math.floor(Math.random() * 1_000_000_000)
                const project = create({ idea: '', seed: next, archetypeId, genome: genomeFromSeed(next), currency })
                navigate(`/p/${project.id}/brief`)
              }}
            >
              <Icon name="Zap" size={14} /> Compile a sample now
            </button>
            <span className="tiny faint" style={{ maxWidth: 260, lineHeight: 1.45 }}>
              Uses the selected archetype and a fresh seed. You can re-roll any module afterwards.
            </span>
          </div>

          <div className="grid g3" style={{ marginTop: 30, gap: 12 }}>
            {[
              { icon: 'Sparkles', title: 'Nothing to provide', body: 'Describe your idea or leave the box empty. The archetype supplies the domain vocabulary, entities and edge cases.' },
              { icon: 'RefreshCw', title: 'Reproducible', body: 'Seed + genome + archetype is the whole input. Re-run it and get a byte-identical package.' },
              { icon: 'ShieldAlert', title: 'Actually checked', body: 'Contrast maths, schema validation and coverage checks run on every compile. The score is real.' },
            ].map((c) => (
              <div key={c.title} className="card">
                <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                  <span style={{ color: 'var(--app-accent)' }}>
                    <Icon name={c.icon} size={15} />
                  </span>
                  <h3 className="card-title">{c.title}</h3>
                </div>
                <p className="small muted" style={{ lineHeight: 1.55 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="generator fade-in">
          <div className="row-between" style={{ marginBottom: 14 }}>
            <div>
              <div className="eyebrow">Compile</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, marginTop: 6 }}>
                New product
              </h2>
            </div>
            <span className="seed-badge" title="Same seed, same product">
              {phrase} · {String(seed).slice(0, 5)}
            </span>
          </div>

          <label className="field-label" htmlFor="idea">
            Your idea — optional
          </label>
          <textarea
            id="idea"
            className="textarea"
            rows={2}
            placeholder="e.g. a marketplace for township artisans… or leave blank"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            style={{ marginBottom: 8, resize: 'vertical' }}
          />
          <div className="marquee" style={{ marginBottom: 16 }}>
            {EXAMPLE_IDEAS.map((e, i) => (
              <button key={i} className={`chip${idea === e ? ' active' : ''}`} onClick={() => setIdea(e)}>
                {e || 'Blank canvas'}
              </button>
            ))}
          </div>

          <label className="field-label">Domain archetype</label>
          <div className="archetype-grid" style={{ marginBottom: 16 }}>
            {ARCHETYPES.map((a) => (
              <button
                key={a.id}
                className={`archetype${archetypeId === a.id ? ' active' : ''}`}
                onClick={() => setArchetypeId(a.id)}
                title={a.blurb}
              >
                <div className="label">{a.label}</div>
                <div className="cat">{a.category}</div>
              </button>
            ))}
          </div>

          <div className="row" style={{ gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="field-label" htmlFor="name">
                Product name — optional
              </label>
              <input
                id="name"
                className="input"
                placeholder={`auto · ${previewName}`}
                value={nameOverride}
                onChange={(e) => setNameOverride(e.target.value)}
              />
            </div>
            <div style={{ width: 92 }}>
              <label className="field-label" htmlFor="cur">
                Currency
              </label>
              <select id="cur" className="select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="row" style={{ gap: 8, marginBottom: 14 }}>
            <button className="btn btn-sm" onClick={reroll} type="button">
              <Icon name="Shuffle" size={13} /> Re-roll seed
            </button>
            <button className="btn btn-sm" onClick={() => setAdvanced((a) => !a)} type="button">
              <Icon name="Wand2" size={13} /> {advanced ? 'Hide' : 'Tune'} genome
            </button>
            <button
              className="btn btn-sm btn-ghost"
              style={{ marginLeft: 'auto' }}
              onClick={() => {
                const next = Math.floor(Math.random() * 1_000_000_000)
                setSeed(next)
                setGenome(genomeFromSeed(next))
                setGenomeLocked(false)
              }}
              type="button"
            >
              <Icon name="Sparkles" size={13} /> Surprise me
            </button>
          </div>

          {advanced && (
            <div className="fade-in" style={{ border: '1px solid var(--app-line)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div className="row-between" style={{ marginBottom: 8 }}>
                <span className="field-label" style={{ margin: 0 }}>
                  Genome {genomeLocked && <span style={{ color: 'var(--app-warn)' }}>· custom</span>}
                </span>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    setGenome(genomeFromSeed(seed))
                    setGenomeLocked(false)
                  }}
                  type="button"
                >
                  <Icon name="RefreshCw" size={11} /> from seed
                </button>
              </div>
              {TRAITS.map((t) => (
                <div className="slider-row" key={t.key}>
                  <label htmlFor={`t-${t.key}`}>{t.label}</label>
                  <input
                    id={`t-${t.key}`}
                    type="range"
                    min={0}
                    max={100}
                    value={genome[t.key]}
                    onChange={(e) => setTrait(t.key, Number(e.target.value))}
                  />
                  <output>{genome[t.key]}</output>
                </div>
              ))}
              <div className="marquee" style={{ marginTop: 10 }}>
                {GENOME_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    className="chip"
                    type="button"
                    onClick={() => {
                      setGenome(p.genome)
                      setGenomeLocked(true)
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }} onClick={compile} disabled={busy}>
            {busy ? <Icon name="RefreshCw" size={15} className="spin" /> : <Icon name="Play" size={15} />}
            {busy ? 'Compiling…' : `Compile “${nameOverride || previewName}”`}
          </button>
          <p className="tiny faint" style={{ marginTop: 9, lineHeight: 1.5 }}>
            Everything is generated on this device. No account, no API key, no prompt. Your projects stay in local storage.
          </p>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <div className="row-between" style={{ marginBottom: 16 }}>
          <div>
            <div className="eyebrow">The pipeline</div>
            <h2 className="section-title" style={{ marginTop: 8 }}>Five modules, one seed</h2>
          </div>
          <span className="tag">all deterministic</span>
        </div>
        <div className="grid g4" style={{ gap: 12 }}>
          {[
            { n: '01', t: 'Product brief', d: 'Problems, personas, jobs, metrics, risks and explicit non-goals.', icon: 'FileText' },
            { n: '02', t: 'Data model', d: 'Entities, fields, relationships, seeded rows and runnable PostgreSQL.', icon: 'LayoutGrid' },
            { n: '03', t: 'Design system', d: 'Contrast-checked ramps, type pairing, spacing, motion and tokens.', icon: 'Sparkles' },
            { n: '04', t: 'Screens & specs', d: 'Interactive screens built from real records, plus tests per section.', icon: 'LayoutDashboard' },
          ].map((s) => (
            <div className="card card-hover" key={s.n}>
              <div className="row-between" style={{ marginBottom: 14 }}>
                <span className="mono tiny faint">{s.n}</span>
                <Icon name={s.icon} size={16} />
              </div>
              <h3 className="card-title" style={{ marginBottom: 6 }}>{s.t}</h3>
              <p className="small muted" style={{ lineHeight: 1.55 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="rule" />

      <section className="grid g2" style={{ gap: 28, alignItems: 'start' }}>
        <div>
          <div className="eyebrow">Why not just prompt an agent?</div>
          <h2 className="section-title" style={{ margin: '10px 0 14px' }}>
            The spec is the product.
          </h2>
          <p className="small muted" style={{ lineHeight: 1.7, marginBottom: 16 }}>
            Asking a coding agent to invent and build at the same time produces something plausible, not something
            designed. Decisions get buried in code where nobody can review them. Lula DevZign front-loads the decisions
            into artefacts you can read, argue with, and hand over — then lets the agent do the mechanical work.
          </p>
          <div className="panel">
            <div className="panel-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Prompt-only build</th>
                    <th>Lula DevZign handoff</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Generic UI, invented on the fly', 'Design tokens derived and contrast-checked'],
                    ['Data shape discovered mid-build', 'Schema with foreign keys before the first screen'],
                    ['Tests written after the fact, if ever', 'Test statements shipped with every section'],
                    ['Requirements live in the chat log', 'Requirements with IDs and priorities in the repo'],
                  ].map(([a, b]) => (
                    <tr key={a}>
                      <td className="muted">{a}</td>
                      <td>{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="eyebrow">Built with intent</div>
          <h2 className="section-title" style={{ margin: '10px 0 14px' }}>Three things it will not fake</h2>
          <div className="stack" style={{ gap: 10 }}>
            {[
              {
                icon: 'ShieldAlert',
                t: 'Human research',
                d: 'Personas are labelled illustrative. The brief tells you to validate with three interviews, rather than dressing synthetic copy up as discovery.',
              },
              {
                icon: 'Gauge',
                t: 'The audit score',
                d: 'Every check is computed from the artefacts themselves — contrast ratios, table counts, coverage. Nothing is graded on vibes.',
              },
              {
                icon: 'RefreshCw',
                t: 'Reproducibility',
                d: 'The exact seed, genome and per-module streams are exported with the package, so the output can be regenerated or diffed.',
              },
            ].map((c) => (
              <div className="card" key={c.t} style={{ display: 'flex', gap: 12 }}>
                <span style={{ color: 'var(--app-accent)', marginTop: 2 }}>
                  <Icon name={c.icon} size={16} />
                </span>
                <div>
                  <h3 className="card-title" style={{ marginBottom: 4 }}>{c.t}</h3>
                  <p className="small muted" style={{ lineHeight: 1.6 }}>{c.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {projects.length > 0 && (
        <>
          <hr className="rule" />
          <section>
            <div className="row-between" style={{ marginBottom: 14 }}>
              <h2 className="section-title">Recent compiles</h2>
              <span className="tag">{projects.length} stored locally</span>
            </div>
            <div className="grid g3">
              {projects.map((p) => (
                <div className="card card-hover" key={p.id}>
                  <div className="row-between" style={{ marginBottom: 10 }}>
                    <span className="tag tag-accent">{p.archetypeLabel}</span>
                    <span className="tiny faint mono">{timeAgo(p.updatedAt)}</span>
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, marginBottom: 4 }}>{p.name}</h3>
                  <p className="small muted" style={{ lineHeight: 1.5, marginBottom: 12 }}>
                    {p.brief.tagline}
                  </p>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn btn-sm" onClick={() => navigate(`/p/${p.id}/brief`)}>
                      Open <Icon name="ArrowUpRight" size={12} />
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        if (confirm(`Delete “${p.name}” from this device?`)) remove(p.id)
                      }}
                      style={{ marginLeft: 'auto' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <footer className="row-between" style={{ marginTop: 56, paddingTop: 20, borderTop: '1px solid var(--app-line-soft)' }}>
        <p className="tiny faint" style={{ maxWidth: '62ch', lineHeight: 1.6 }}>
          Lula DevZign is a local-first design compiler. Inspired by the design-first workflow popularised by Builder
          Methods' Design OS, rebuilt so the artefacts are generated rather than prompted. No affiliation.
        </p>
        <span className="mono tiny faint">v1 · deterministic</span>
      </footer>
    </div>
  )
}
