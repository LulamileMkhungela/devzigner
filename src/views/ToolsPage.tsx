import type { Project } from '../types'
import { Collapsible, TrackHeader } from '../components/ui'
import { Icon } from '../components/Icons'
import { Link } from '../lib/router'
import { TOOLS, vendoredFileCount } from '../tools'
import { TRACK } from './FlowsPage'

const KIND_ICON: Record<string, string> = {
  'Agent skill': 'Sparkles',
  Template: 'Layers',
  Convention: 'GitBranch',
  Workflow: 'Route',
}

/**
 * The eight free tools from buildermethods.com/tools, with the steps each one
 * actually runs. The skill text is shipped verbatim in the package, so this page
 * is an index of real files rather than a description of them.
 */
export function ToolsPage({ project }: { project: Project }) {
  return (
    <div className="lz-view">
      <TrackHeader
        project={project}
        steps={[{ id: 'tools', label: 'Tools', path: 'tools' }, ...TRACK.filter((t) => t.id !== 'tools')]}
        current="tools"
        title="The builder toolkit"
        subtitle="All eight free tools from buildermethods.com/tools, installed in this package with their own steps and prompts. No keys, no accounts."
        actions={
          <Link to="export" className="lz-btn small primary">
            <Icon name="Download" size={13} /> Open the package
          </Link>
        }
      />

      <div className="lz-cols-2">
        {TOOLS.map((tool) => {
          const count = vendoredFileCount(tool.id)
          return (
            <div key={tool.id} className="lz-card">
              <div className="lz-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div className="lz-row" style={{ gap: 10, alignItems: 'center' }}>
                  <span className="lz-icon-tile" aria-hidden="true">
                    <Icon name={KIND_ICON[tool.kind] ?? 'Layers'} size={16} />
                  </span>
                  <div>
                    <h3 style={{ margin: 0 }}>{tool.name}</h3>
                    <p className="lz-sub" style={{ margin: '2px 0 0' }}>
                      {tool.kind}
                      {count ? ` · ${count} files` : ''}
                    </p>
                  </div>
                </div>
                <a className="lz-btn small" href={tool.url} target="_blank" rel="noreferrer">
                  Source <Icon name="ArrowUpRight" size={12} />
                </a>
              </div>

              <p style={{ marginTop: 12 }}>{tool.blurb}</p>

              <ol className="lz-toolsteps">
                {tool.steps.map((step, index) => (
                  <li key={`${tool.id}-${index}`}>
                    <span className="lz-toolsteps-n">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              <Collapsible title="Installed at" icon="Folder" count={1}>
                <code className="lz-code-line">{tool.ships}</code>
              </Collapsible>
            </div>
          )
        })}
      </div>

      <div className="lz-card">
        <h3>The convention they share</h3>
        <p>
          Skills live once, in <code>.agents/skills/</code>. Instructions live once, in <code>AGENTS.md</code>.{' '}
          <code>CLAUDE.md</code> and <code>.claude/skills</code> are symlinks created by{' '}
          <code>scripts/link-agents.sh</code>, so there is nothing to keep in sync by hand.
        </p>
        <p className="lz-sub">
          Design OS and Agent OS commands are the exception: they stay in <code>.claude/commands/</code>, where their
          installers put them.
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
