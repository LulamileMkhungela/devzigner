// ProdOps — developed by Lulamile Mkhungela.
//
// The build kits: Builder Methods' pre-shaped products, as start states.
//
// A kit upstream is a folder you clone — a PRD, a stack, a design system and
// milestone prompts, plus the video that walks it. Here the same six kits are
// compiled instead of cloned: pressing Start writes the kit's description into
// the Product stage and compiles it through the five stages, so the pre-shaped
// spec lands in a product that already has a data shape, a design system and
// sections behind it.
//
// That is the whole point of putting them here: a kit you clone is a decision
// somebody else made. A kit you compile is a decision you can change at any
// stage and watch the package follow.

import { useState } from 'react'
import type { Project } from '../types'
import { TrackHeader } from '../components/ui'
import { Icon } from '../components/Icons'
import { Link, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { KITS, SCRAPED, url } from '../data/builderMethods'
import { TRACK } from './FlowsPage'

/** The kit's pre-shaped artefact, and where ProdOps writes the same thing. */
const MAPPING: { kit: string; prodops: string }[] = [
  { kit: 'The PRD', prodops: 'Product — the brief, the roadmap and `_build_plan/prd.md`' },
  { kit: 'The tech stack', prodops: 'Tech Stack — the layer-by-layer decision record and component registry' },
  { kit: 'The design system', prodops: 'Design — colour roles, type roles, DTCG tokens and the shell' },
  { kit: 'The milestone prompts', prodops: 'Export — `product-plan/` with instructions, prompts and milestones' },
  { kit: 'The video guide', prodops: 'Library — the lesson, linked, not embedded' },
]

export function KitsPage({ project }: { project: Project }) {
  const { regenerate, notify } = useStore()
  const [started, setStarted] = useState<string>('')

  function start(id: string) {
    const kit = KITS.find((entry) => entry.id === id)
    if (!kit) return
    // The archetype travels with the description: the kit's pre-shaped product
    // is the shape it was designed for, not whatever the intake profiler would
    // guess from the same sentence on its own.
    regenerate(project, undefined, { idea: kit.idea, archetypeId: kit.archetypeId })
    setStarted(id)
    notify(`Compiled from ${kit.name}`, { label: 'Open the product', to: '' })
    navigate('')
  }

  return (
    <div className="lz-view">
      <TrackHeader
        project={project}
        steps={[
          { id: 'tools', label: 'Tools', path: 'tools' },
          { id: 'library', label: 'Library', path: 'library' },
          { id: 'kits', label: 'Build kits', path: 'kits' },
          ...TRACK,
        ]}
        current="kits"
        title="The build kits"
        subtitle="Six pre-shaped products: CRM, invoicing, notes, bookmarks, real estate, content. Start one and compile it."
        actions={
          <a className="lz-btn small" href={url('/kits')} target="_blank" rel="noreferrer">
            <Icon name="ExternalLink" size={13} /> Open upstream
          </a>
        }
      />

      <div className="lz-card" style={{ marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>A kit is a starting point, not a lock-in</h3>
        <p className="lz-sub" style={{ marginBottom: 0 }}>
          Each kit below ships upstream as a folder of pre-shaped artefacts. Starting one here writes its description
          into the Product stage and compiles it — the archetype carries the entities, the sections and the design
          vocabulary, and every one of them stays editable afterwards. Nothing is fetched to do it: the kits are data in
          this build, scraped {SCRAPED}.
        </p>
      </div>

      <div className="lz-tiles">
        {KITS.map((kit) => (
          <div className="lz-tile" key={kit.id} id={kit.id}>
            <span className="lz-tile-ic">
              <Icon name="PackageCheck" size={16} />
            </span>
            <h3>{kit.name}</h3>
            <p>{kit.blurb}</p>
            <div className="lz-row" style={{ gap: 6, flexWrap: 'wrap', margin: '10px 0' }}>
              {kit.tags.map((tag) => (
                <span className="lz-pill" key={tag}>
                  {tag}
                </span>
              ))}
              <span className="lz-pill">{kit.archetypeId}</span>
            </div>
            <ul className="lz-bullets" style={{ marginTop: 0 }}>
              {kit.includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="lz-row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button type="button" className="lz-btn small primary" onClick={() => start(kit.id)}>
                <Icon name={started === kit.id ? 'Check' : 'Play'} size={13} />
                {started === kit.id ? 'Compiled' : 'Start this kit'}
              </button>
              <a className="lz-btn small" href={url(`/kits/${kit.id}`)} target="_blank" rel="noreferrer">
                <Icon name="ExternalLink" size={13} /> Upstream
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="lz-card" style={{ marginTop: 16 }}>
        <h3>What a kit ships, and where it lands here</h3>
        <div className="lz-table-scroll">
          <table className="lz-table">
            <thead>
              <tr>
                <th>In the kit</th>
                <th>In ProdOps</th>
              </tr>
            </thead>
            <tbody>
              {MAPPING.map((row) => (
                <tr key={row.kit}>
                  <td>{row.kit}</td>
                  <td>{row.prodops}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="lz-muted" style={{ marginTop: 10 }}>
          The kit's own prompts are written for a coding agent; ProdOps writes the same five decisions first, then hands
          the agent the package on <Link to="export">Export</Link>.
        </p>
      </div>
    </div>
  )
}
