// ProdOps — developed by Lulamike Mkhungela.
//
// The spec folder, as a page. Every role writes documents — a spec, a process,
// a roadmap, a visual sheet — and this is where they live: browsable by role and
// step, downloadable one by one, or as the whole folder in a zip that drops into
// the handoff as `spec/<role>/…`.

import { useMemo, useState } from 'react'
import type { Project, RoleArtifact } from '../types'
import { useStore } from '../lib/store'
import { Icon } from '../components/Icons'
import { ReferenceIntake } from '../components/role'
import { ROLES, roleById } from '../lib/roles'
import { artifactCoverage, projectRoleIds } from '../lib/documents'
import { download } from '../lib/format'
import { slugify } from '../engine/rng'
import { timeAgo } from '../lib/format'

const KIND_ICON: Record<RoleArtifact['kind'], string> = {
  spec: 'FileText',
  process: 'Route',
  roadmap: 'CalendarDays',
  visual: 'Image',
  markdown: 'FileCode',
}

/**
 * A tiny, safe markdown renderer: headings, lists, tables, bold, code and
 * blockquotes. Enough for the documents this workspace writes, and no new
 * dependency in the bundle to do it.
 */
function renderMarkdown(source: string): string {
  const escape = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const inline = (text: string) =>
    escape(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')

  const lines = source.split('\n')
  const out: string[] = []
  let inList = false
  let inTable = false
  let inQuote = false

  const closeBlocks = () => {
    if (inList) {
      out.push('</ul>')
      inList = false
    }
    if (inTable) {
      out.push('</tbody></table>')
      inTable = false
    }
    if (inQuote) {
      out.push('</blockquote>')
      inQuote = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      closeBlocks()
      continue
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed)
    if (heading) {
      closeBlocks()
      const level = heading[1].length
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      continue
    }

    if (/^\|.*\|$/.test(trimmed)) {
      const cells = trimmed.slice(1, -1).split('|').map((cell) => cell.trim())
      const isRule = cells.every((cell) => /^-{2,}$/.test(cell))
      if (isRule) continue
      if (!inTable) {
        // The first row of a table is its header.
        closeBlocks()
        out.push('<table><thead><tr>' + cells.map((cell) => `<th>${inline(cell)}</th>`).join('') + '</tr></thead><tbody>')
        inTable = true
        continue
      }
      out.push('<tr>' + cells.map((cell) => `<td>${inline(cell)}</td>`).join('') + '</tr>')
      continue
    }

    const bullet = /^[-*]\s+(.*)$/.exec(trimmed)
    if (bullet) {
      if (!inList) {
        closeBlocks()
        out.push('<ul>')
        inList = true
      }
      out.push(`<li>${inline(bullet[1])}</li>`)
      continue
    }

    const numbered = /^\d+\.\s+(.*)$/.exec(trimmed)
    if (numbered) {
      if (!inList) {
        closeBlocks()
        out.push('<ul class="lz-md-ol">')
        inList = true
      }
      out.push(`<li>${inline(numbered[1])}</li>`)
      continue
    }

    if (trimmed.startsWith('>')) {
      if (!inQuote) {
        closeBlocks()
        out.push('<blockquote>')
        inQuote = true
      }
      out.push(`<p>${inline(trimmed.replace(/^>\s?/, ''))}</p>`)
      continue
    }

    closeBlocks()
    out.push(`<p>${inline(trimmed)}</p>`)
  }

  closeBlocks()
  return out.join('\n')
}

export function SpecsPage({ project }: { project: Project }) {
  const { notify, removeArtifact } = useStore()
  const [filter, setFilter] = useState<string>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const artifacts = project.artifacts ?? []
  const engaged = projectRoleIds(project)
  const rolesWithDocs = engaged.length > 0 ? engaged : ROLES.map((role) => role.id)
  const visible = useMemo(
    () => (filter === 'all' ? artifacts : artifacts.filter((artifact) => artifact.roleId === filter)),
    [artifacts, filter],
  )
  const open = visible.find((artifact) => artifact.id === openId) ?? visible[0]

  const downloadOne = (artifact: RoleArtifact) => {
    download(artifact.file.split('/').pop() ?? 'spec.md', artifact.body, 'text/markdown;charset=utf-8')
    notify(`${artifact.file} downloaded`)
  }

  const downloadAll = async () => {
    if (artifacts.length === 0) {
      notify('Nothing saved yet — approve a role step and its documents are written')
      return
    }
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    for (const artifact of artifacts) zip.file(artifact.file, artifact.body)
    zip.file(
      'README.md',
      `# ${project.name} — spec folder\n\nGenerated by ProdOps from the roles this project runs.\n\n${artifacts
        .map((a) => `- \`${a.file}\` — ${a.title}`)
        .join('\n')}\n`,
    )
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
    download(`${slugify(project.name)}-spec.zip`, blob, 'application/zip')
    notify(`${artifacts.length} documents downloaded as a zip`)
  }

  return (
    <div className="lz-view lz-specs">
      <div className="lz-ved-head">
        <div>
          <p className="lz-nav-label">Spec folder</p>
          <h1>Everything the roles have written</h1>
          <p className="lz-lede">
            Each role step produces real documents — a spec, a process, a roadmap, a visual sheet. They are saved here,
            and they ship in the handoff under <code>spec/&lt;role&gt;/</code>.
          </p>
        </div>
        <div className="lz-row">
          <span className="lz-pill">{artifacts.length} documents</span>
          <button className="lz-btn small primary" onClick={() => void downloadAll()}>
            <Icon name="Download" size={13} /> Download spec folder
          </button>
        </div>
      </div>

      {engaged.length > 0 && (
        <div className="lz-spec-coverage">
          {projectRoleIds(project).map((id) => {
            const role = roleById(id)
            if (!role) return null
            const coverage = artifactCoverage(project, role)
            return (
              <div key={id} className="lz-spec-cov">
                <Icon name={role.icon} size={13} />
                <b>{role.name}</b>
                <span className="lz-meter" aria-hidden="true">
                  <span
                    className="lz-meter-fill"
                    style={{ width: `${coverage.total ? (coverage.saved / coverage.total) * 100 : 0}%` }}
                  />
                </span>
                <small>
                  {coverage.saved}/{coverage.total} docs
                </small>
              </div>
            )
          })}
        </div>
      )}

      <div className="lz-specs-body">
        <div className="lz-specs-list">
          <div className="lz-specs-filter" role="tablist" aria-label="Filter by role">
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              className={`lz-seg-btn${filter === 'all' ? ' is-on' : ''}`}
              onClick={() => setFilter('all')}
            >
              All <span>{artifacts.length}</span>
            </button>
            {rolesWithDocs.map((id) => {
              const role = roleById(id)
              if (!role) return null
              const count = artifacts.filter((artifact) => artifact.roleId === id).length
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={filter === id}
                  className={`lz-seg-btn${filter === id ? ' is-on' : ''}`}
                  onClick={() => setFilter(id)}
                >
                  {role.tag} <span>{count}</span>
                </button>
              )
            })}
          </div>

          {visible.length === 0 ? (
            <div className="lz-empty">
              <h3>No documents yet</h3>
              <p>
                Approve a step in a role workspace and its documents are written automatically, or press{' '}
                <b>Save</b> on a document in the inspector.
              </p>
            </div>
          ) : (
            <ul className="lz-spec-items">
              {visible.map((artifact) => {
                const role = roleById(artifact.roleId)
                return (
                  <li key={artifact.id} className={`lz-spec-item${open?.id === artifact.id ? ' is-open' : ''}`}>
                    <button type="button" className="lz-spec-open" onClick={() => setOpenId(artifact.id)}>
                      <Icon name={KIND_ICON[artifact.kind]} size={14} />
                      <span>
                        <b>{artifact.title}</b>
                        <code>{artifact.file}</code>
                      </span>
                      <span className="lz-pill quiet">{role?.tag ?? artifact.roleId}</span>
                      <small>{timeAgo(artifact.createdAt)}</small>
                    </button>
                    <div className="lz-spec-actions">
                      <button type="button" className="lz-ref-remove" aria-label={`Download ${artifact.title}`} title="Download" onClick={() => downloadOne(artifact)}>
                        <Icon name="Download" size={11} />
                      </button>
                      <button
                        type="button"
                        className="lz-ref-remove"
                        aria-label={`Delete ${artifact.title}`}
                        title="Delete"
                        onClick={() => {
                          removeArtifact(artifact.id)
                          notify(`${artifact.title} deleted`)
                        }}
                      >
                        <Icon name="X" size={11} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="lz-specs-reader">
          {open ? (
            <>
              <div className="lz-specs-reader-head">
                <div>
                  <p className="lz-nav-label">{open.file}</p>
                  <h2>{open.title}</h2>
                </div>
                <button type="button" className="lz-btn small" onClick={() => downloadOne(open)}>
                  <Icon name="Download" size={12} /> .md
                </button>
              </div>
              {open.kind === 'visual' ? (
                <iframe title={open.title} className="lz-specs-frame" srcDoc={open.body} sandbox="" />
              ) : (
                <div className="lz-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(open.body) }} />
              )}
            </>
          ) : (
            <div className="lz-empty">
              <h3>The spec folder is empty</h3>
              <p>Documents appear here the moment a step is approved or saved.</p>
            </div>
          )}
        </div>

        <div className="lz-specs-side">
          <div className="lz-card">
            <ReferenceIntake />
          </div>
        </div>
      </div>
    </div>
  )
}
