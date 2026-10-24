import { useMemo, useState } from 'react'
import type { Project } from '../types'
import { useStore } from '../lib/store'
import { TrackHeader } from '../components/ui'
import { Icon } from '../components/Icons'
import { Markdown } from '../components/Markdown'
import { buildWiki } from '../lib/wiki'
import { downloadWikiZip } from '../lib/download'
import { TRACK } from './FlowsPage'

export function WikiPage({ project }: { project: Project }) {
  const { versions, branch, branches, commit, restore, createBranch, notify } = useStore()
  const entries = useMemo(() => buildWiki(project), [project])
  const [slug, setSlug] = useState(entries[0]?.slug ?? 'product')
  const [message, setMessage] = useState('')
  const [newBranch, setNewBranch] = useState('')
  const [busy, setBusy] = useState(false)

  const entry = entries.find((e) => e.slug === slug) ?? entries[0]

  const snapshot = () => {
    const version = commit(message || `Snapshot · ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`)
    setMessage('')
    notify(`Committed ${version.id} to ${version.branch}`)
  }

  return (
    <div className="lz-view">
      <TrackHeader
        project={project}
        steps={TRACK}
        current="wiki"
        title="Prototype wiki"
        subtitle="Product and design knowledge, written from the compile and versioned in this browser. Branches hold iterations; the export is a git-ready folder."
        actions={
          <>
            <button
              className="lz-btn small"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await downloadWikiZip(project, versions)
                  notify('Wiki downloaded')
                } finally {
                  setBusy(false)
                }
              }}
            >
              <Icon name="Download" size={13} /> Download wiki
            </button>
            <button className="lz-btn small primary" onClick={snapshot}>
              <Icon name="GitCommitHorizontal" size={13} /> Commit
            </button>
          </>
        }
      />

      <div className="lz-stack">
        <div className="lz-split">
          <div className="lz-col">
            <div className="lz-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="lz-fold-h" style={{ cursor: 'default', borderBottom: '1px solid var(--line-soft)' }}>
                <Icon name="BookOpen" size={15} />
                <b>Wiki pages</b>
                <span className="lz-fold-meta">{entries.length} entries · generated</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 12 }}>
                {entries.map((e) => (
                  <button
                    key={e.slug}
                    className={`lz-btn small${e.slug === entry?.slug ? ' primary' : ' quiet'}`}
                    onClick={() => setSlug(e.slug)}
                  >
                    <Icon name={e.icon} size={12} /> {e.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="lz-card">
              <div className="lz-between" style={{ marginBottom: 12 }}>
                <div>
                  <p className="lz-hint" style={{ marginTop: 0 }}>{entry?.summary}</p>
                  <h2 style={{ font: '700 19px/1.25 var(--font)', letterSpacing: '-.02em', marginTop: 2 }}>{entry?.title}</h2>
                </div>
                <span className="lz-pill mono">wiki/{entry?.slug}.md</span>
              </div>
              <div style={{ maxHeight: '58vh', overflow: 'auto', paddingRight: 4 }}>
                <Markdown source={entry?.body ?? ''} />
              </div>
            </div>
          </div>

          <aside className="lz-col">
            <div className="lz-card">
              <div className="lz-card-h" style={{ marginBottom: 10 }}>
                <div className="lz-card-hL"><Icon name="GitBranch" size={15} /><h2>Versions</h2></div>
                <span className="lz-pill peach">{branch}</span>
              </div>

              <label className="lz-field">
                <span>Branch</span>
                <select className="lz-input" value={branch} onChange={(e) => { createBranch(e.target.value); notify(`On branch ${e.target.value}`) }}>
                  {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>

              <div className="lz-inline" style={{ marginTop: 0, marginBottom: 12 }}>
                <input
                  className="lz-input"
                  placeholder="new-branch-name"
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                />
                <button
                  className="lz-btn small"
                  disabled={!newBranch.trim()}
                  onClick={() => { createBranch(newBranch); setNewBranch(''); notify('Branch created') }}
                >
                  <Icon name="Plus" size={12} /> Branch
                </button>
              </div>

              <div className="lz-inline" style={{ marginTop: 0 }}>
                <input
                  className="lz-input"
                  placeholder="What changed?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && snapshot()}
                />
                <button className="lz-btn small primary" onClick={snapshot} title="Commit snapshot">
                  <Icon name="GitCommitHorizontal" size={12} />
                </button>
              </div>
              <p className="lz-hint">A snapshot stores the seed, genome, token edits, custom flows and the stats below.</p>
            </div>

            <div className="lz-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="lz-fold-h" style={{ cursor: 'default', borderBottom: '1px solid var(--line-soft)' }}>
                <Icon name="History" size={15} />
                <b>History</b>
                <span className="lz-fold-meta">{versions.length ? `${versions.length} snapshots` : 'no snapshots yet'}</span>
              </div>
              <div style={{ maxHeight: 320, overflow: 'auto' }}>
                {versions.length === 0 && <p className="lz-hint" style={{ padding: 14 }}>Commit a snapshot to start the history.</p>}
                {versions.map((v, i) => (
                  <div key={v.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--line-soft)' }}>
                    <div className="lz-between" style={{ gap: 6 }}>
                      <b style={{ font: '600 12.5px/1.3 var(--font)' }}>{v.message}</b>
                      {i === 0 && <span className="lz-pill green">head</span>}
                    </div>
                    <p className="lz-hint" style={{ marginTop: 2 }}>
                      <code>{v.id}</code> · {v.branch} · {new Date(v.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="lz-row" style={{ gap: 4, marginTop: 5 }}>
                      <span className="lz-pill">{v.stats.sections} sections</span>
                      <span className="lz-pill">{v.stats.screens} screens</span>
                      <span className="lz-pill">{v.stats.flows} flows</span>
                      <span className="lz-pill">{v.stats.score}/100</span>
                    </div>
                    <div className="lz-row" style={{ marginTop: 6 }}>
                      <span className="lz-swatch-chip" style={{ width: 16, height: 16, borderRadius: 4, background: v.stats.primary }} />
                      <span className="lz-hint" style={{ marginTop: 0 }}>radius {v.stats.radius}px</span>
                      <button
                        className="lz-link"
                        style={{ marginLeft: 'auto' }}
                        onClick={() => { restore(v.id); notify(`Restored ${v.id}`) }}
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lz-card">
              <p className="lz-cmd-label">How this is stored</p>
              <ul className="lz-bullets" style={{ marginTop: 6 }}>
                <li>Each commit keeps the inputs needed to rebuild the product exactly.</li>
                <li>Branches hold competing directions without overwriting each other.</li>
                <li>Restoring recompiles deterministically — no merge conflicts, no stale screens.</li>
                <li>Downloading the wiki gives you <code>wiki/</code> and a changelog to commit beside the code, one worktree per branch.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
