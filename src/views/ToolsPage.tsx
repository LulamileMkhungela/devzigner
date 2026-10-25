import { useState } from 'react'
import type { Project } from '../types'
import { TrackHeader } from '../components/ui'
import { Icon } from '../components/Icons'
import { Link } from '../lib/router'
import { TOOLS, vendoredFileCount, type Tool } from '../tools'
import { TRACK } from './FlowsPage'

const KIND_ICON: Record<string, string> = {
  'Agent skill': 'Sparkles',
  Template: 'Layers',
  Convention: 'GitBranch',
  Workflow: 'Route',
}

/**
 * One tool, in full: what it is, every step it runs, the file behind each step,
 * where it ships, and the install path behind "Access free".
 *
 * It is its own component because it is the unit the checks render: every tool
 * in `TOOLS` can be mounted here and read back, which is how "each tool lists
 * its full step sequence" stays a test rather than a claim.
 */
export function ToolPanel({ tool }: { tool: Tool }) {
  /** The gate is answered locally — press it, get the install path. */
  const [access, setAccess] = useState(false)
  const count = vendoredFileCount(tool.id)

  return (
    <div className="lz-card lz-toolpanel" role="tabpanel" id="tool-panel" aria-labelledby={`tool-tab-${tool.id}`}>
      {/* The card anatomy of the tools listing, kept: kind on the left, the
          name and the one-line description in the middle, one arrow on the
          right. Same three columns, same rules, so the workspace and the
          listing page read as one product. */}
      <div className="lz-listing-head">
        <span className="lz-listing-label">
          {tool.kind}
          {count ? ` · ${count} files` : ''}
        </span>
        <div>
          <h2>{tool.name}</h2>
          <p className="lz-listing-blurb">{tool.blurb}</p>
        </div>
        <a
          className="lz-listing-arrow"
          href={`/${tool.id}.html`}
          target="_blank"
          rel="noreferrer"
          title={`${tool.name} on the site`}
        >
          <Icon name="ArrowRight" size={16} />
          <span>Explore</span>
        </a>
      </div>

      <ol className="lz-toolsteps">
        {tool.steps.map((step, index) => (
          <li key={`${tool.id}-${index}`}>
            <span className="lz-toolsteps-n">{index + 1}</span>
            <span>
              {step}
              {/* The file the agent opens for this step, so the count above can
                  be checked against the package on disk. */}
              {tool.stepFiles?.[index] && <code className="lz-toolsteps-file">{tool.stepFiles[index]}</code>}
            </span>
          </li>
        ))}
      </ol>

      <div className="lz-row" style={{ gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          className="lz-btn small primary"
          aria-expanded={access}
          aria-controls={`tool-access-${tool.id}`}
          onClick={() => setAccess((open) => !open)}
        >
          <Icon name={access ? 'Check' : 'Download'} size={13} /> {access ? 'Access granted' : 'Access free'}
        </button>
        <code className="lz-code-line">{tool.ships}</code>
      </div>

      {access && (
        <div
          className="lz-toolaccess"
          id={`tool-access-${tool.id}`}
          role="region"
          aria-label={`Installing ${tool.name}`}
        >
          <h3 style={{ marginTop: 0 }}>Access free — nothing to unlock</h3>
          <p className="lz-sub" style={{ margin: '0 0 10px' }}>
            There is no email and no key: the tool is already in the package this workspace exports.
          </p>
          <ol>
            <li>
              It ships at <code>{tool.ships}</code>, exactly where the steps above expect it.
            </li>
            <li>
              Its folder sits under <code>.agents/skills/</code>; <code>CLAUDE.md</code> and{' '}
              <code>.claude/skills</code> are symlinks to it, so there is one copy to update.
            </li>
            <li>
              Run it with the command its own file names — every step above is a section of <code>SKILL.md</code>.
            </li>
          </ol>
          <div className="lz-row" style={{ gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <Link to="export" className="lz-btn small">
              <Icon name="Download" size={13} /> Download the package
            </Link>
            <Link to="wiki" className="lz-btn small">
              <Icon name="BookOpen" size={13} /> The canon, explained
            </Link>
            <a className="lz-btn small" href="/agentcanon.html" target="_blank" rel="noreferrer">
              <Icon name="ExternalLink" size={13} /> The canon page
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * The eight free tools as one browser: a tab per tool and a single panel.
 *
 * This page used to be eight cards stacked two-up, so comparing two tools meant
 * scrolling between them and reading the same header twice. A tab strip puts
 * every tool one click away and gives the selected one the whole width, which
 * is where its steps, its files and its install path actually fit.
 *
 * Nothing behind the tabs is unreachable: the strip is a real tablist (roles,
 * `aria-selected`, ids that point at the panel), and the export package carries
 * the same files whether this page is open or not.
 */
export function ToolsPage({ project }: { project: Project }) {
  const [active, setActive] = useState(TOOLS[0].id)
  const tool = TOOLS.find((entry) => entry.id === active) ?? TOOLS[0]

  return (
    <div className="lz-view">
      <TrackHeader
        project={project}
        steps={[{ id: 'tools', label: 'Tools', path: 'tools' }, ...TRACK.filter((t) => t.id !== 'tools')]}
        current="tools"
        title="The builder toolkit"
        subtitle="All eight free tools, installed in this package with their own steps and prompts. No keys, no accounts."
        actions={
          <Link to="export" className="lz-btn small primary">
            <Icon name="Download" size={13} /> Open the package
          </Link>
        }
      />

      <div className="lz-tooltabs" role="tablist" aria-label="The eight free tools">
        {TOOLS.map((entry) => {
          const on = entry.id === tool.id
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              id={`tool-tab-${entry.id}`}
              aria-selected={on}
              aria-controls="tool-panel"
              tabIndex={on ? 0 : -1}
              className={`lz-tooltab${on ? ' is-on' : ''}`}
              onClick={() => setActive(entry.id)}
              // A tablist that only answers the mouse is half a tablist: arrows
              // move between tabs, Home and End jump to the ends, and focus
              // follows the selection.
              onKeyDown={(event) => {
                const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
                if (!keys.includes(event.key)) return
                event.preventDefault()
                const at = TOOLS.findIndex((tool) => tool.id === entry.id)
                const next =
                  event.key === 'ArrowRight'
                    ? (at + 1) % TOOLS.length
                    : event.key === 'ArrowLeft'
                      ? (at - 1 + TOOLS.length) % TOOLS.length
                      : event.key === 'Home'
                        ? 0
                        : TOOLS.length - 1
                setActive(TOOLS[next].id)
                document.getElementById(`tool-tab-${TOOLS[next].id}`)?.focus()
              }}
            >
              <Icon name={KIND_ICON[entry.kind] ?? 'Layers'} size={13} />
              <span>{entry.name}</span>
            </button>
          )
        })}
      </div>

      {/* Keyed by tool: switching tabs remounts the panel, so the open
          "Access free" card never follows you to a different tool. */}
      <ToolPanel key={tool.id} tool={tool} />

      <div className="lz-card">
        <h3>The convention they share</h3>
        <p>
          Skills live once, in <code>.agents/skills/</code>. Instructions live once, in <code>AGENTS.md</code>.{' '}
          <code>CLAUDE.md</code> and <code>.claude/skills</code> are symlinks created by{' '}
          <code>scripts/link-agents.sh</code>, so there is nothing to keep in sync by hand.
        </p>
        <p className="lz-sub">
          The fifteen commands live together in <code>.agents/commands/prodops/</code>, one markdown file each, so an
          agent that reads markdown can run them and nothing else has to be installed.
        </p>
        <div className="lz-row" style={{ gap: 8, marginTop: 12 }}>
          <Link to="coverage" className="lz-btn small">
            <Icon name="ShieldCheck" size={13} /> Verify all eight
          </Link>
          <Link to="system" className="lz-btn small">
            <Icon name="Layers" size={13} /> Stack and registry
          </Link>
        </div>
      </div>
    </div>
  )
}
