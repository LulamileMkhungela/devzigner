// ProdOps — developed by Lulamile Mkhungela.
//
// The library: everything Builder Methods publishes, read inside the workspace.
//
// Upstream this is five separate surfaces — the video library, the series index,
// the course list, the workshop calendar and the article archive — each behind
// its own navigation and, for three of them, a Pro login. Here they are one
// page with a tab strip, because in ProdOps they answer one question: what else
// has this school already worked out, and where do I read it.
//
// Nothing on this page is fetched. The catalogue is in `src/data/builderMethods.ts`
// with the URL and the scrape date beside each row, so it renders with no
// network, no key and no account — the same rule as the rest of the workspace.

import { useMemo, useState } from 'react'
import type { Project } from '../types'
import { TrackHeader } from '../components/ui'
import { Icon } from '../components/Icons'
import { Link } from '../lib/router'
import { ARTICLES, COURSES, COUNTS, SCRAPED, SERIES, SESSIONS, SOURCE, VIDEOS, url } from '../data/builderMethods'
import { TRACK } from './FlowsPage'

type Tab = 'videos' | 'series' | 'courses' | 'sessions' | 'articles'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'videos', label: 'Videos', icon: 'Play' },
  { id: 'series', label: 'Series', icon: 'Presentation' },
  { id: 'courses', label: 'Courses', icon: 'GraduationCap' },
  { id: 'sessions', label: 'Workshops', icon: 'CalendarDays' },
  { id: 'articles', label: 'Articles', icon: 'FileText' },
]

function Tag({ children }: { children: string }) {
  return <span className="lz-pill">{children}</span>
}

function Row({
  title,
  blurb,
  meta,
  href,
  cta = 'Open',
}: {
  title: string
  blurb: string
  meta?: string
  href: string
  cta?: string
}) {
  return (
    <div className="lz-card">
      <div className="lz-listing-head">
        <span className="lz-listing-label">{meta ?? ''}</span>
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <p className="lz-listing-blurb">{blurb}</p>
        </div>
        <a className="lz-listing-arrow" href={href} target="_blank" rel="noreferrer" title={`${title} on Builder Methods`}>
          <Icon name="ArrowRight" size={16} />
          <span>{cta}</span>
        </a>
      </div>
    </div>
  )
}

export function LibraryPage({ project }: { project: Project }) {
  const [tab, setTab] = useState<Tab>('videos')
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('')

  const tags = useMemo(() => {
    const seen = new Set<string>()
    for (const video of VIDEOS) for (const t of video.tags) seen.add(t)
    return [...seen].sort()
  }, [])

  const videos = useMemo(() => {
    const q = query.trim().toLowerCase()
    return VIDEOS.filter(
      (video) =>
        (!tag || video.tags.includes(tag)) &&
        (!q || `${video.title} ${video.blurb} ${video.tags.join(' ')}`.toLowerCase().includes(q)),
    )
  }, [query, tag])

  const articles = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ARTICLES.filter((article) => !q || `${article.title} ${article.blurb}`.toLowerCase().includes(q))
  }, [query])

  const counts: Record<Tab, string> = {
    videos: `${COUNTS.videos} videos`,
    series: `${COUNTS.series} series`,
    courses: `${COUNTS.courses} courses`,
    sessions: `${COUNTS.sessions} workshops`,
    articles: `${COUNTS.articles} articles`,
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
        current="library"
        title="The library"
        subtitle="Six series, four courses, the workshop calendar and the article archive — read here, linked out."
        actions={
          <a className="lz-btn small" href={url('/library/all')} target="_blank" rel="noreferrer">
            <Icon name="ExternalLink" size={13} /> Open upstream
          </a>
        }
      />

      <div className="lz-tooltabs" role="tablist" aria-label="The library">
        {TABS.map((entry) => {
          const on = entry.id === tab
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              id={`library-tab-${entry.id}`}
              aria-selected={on}
              aria-controls="library-panel"
              tabIndex={on ? 0 : -1}
              className={`lz-tooltab${on ? ' is-on' : ''}`}
              onClick={() => setTab(entry.id)}
              onKeyDown={(event) => {
                const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
                if (!keys.includes(event.key)) return
                event.preventDefault()
                const at = TABS.findIndex((t) => t.id === entry.id)
                const next =
                  event.key === 'ArrowRight'
                    ? (at + 1) % TABS.length
                    : event.key === 'ArrowLeft'
                      ? (at - 1 + TABS.length) % TABS.length
                      : event.key === 'Home'
                        ? 0
                        : TABS.length - 1
                setTab(TABS[next].id)
                document.getElementById(`library-tab-${TABS[next].id}`)?.focus()
              }}
            >
              <Icon name={entry.icon} size={13} />
              <span>{entry.label}</span>
            </button>
          )
        })}
      </div>

      <div id="library-panel" role="tabpanel" aria-labelledby={`library-tab-${tab}`}>
        {/* Search is one field for every tab: the catalogue is read the same way
            whichever shelf you are standing at. */}
        <div className="lz-row" style={{ gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="lz-field" style={{ flex: '1 1 260px' }}>
            <span className="lz-sr">Search the library</span>
            <input
              className="lz-input"
              type="search"
              placeholder={`Search ${counts[tab].replace(/^\d+ /, '')}…`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <span className="lz-pill">{counts[tab]}</span>
          <span className="lz-muted">Scraped {SCRAPED}</span>
        </div>

        {tab === 'videos' && (
          <>
            <div className="lz-row" style={{ gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`lz-btn small${tag ? '' : ' primary'}`}
                onClick={() => setTag('')}
              >
                All tags
              </button>
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`lz-btn small${tag === t ? ' primary' : ''}`}
                  onClick={() => setTag(tag === t ? '' : t)}
                >
                  {t}
                </button>
              ))}
            </div>
            {videos.length === 0 && (
              <div className="lz-empty">
                <h3>Nothing matches that</h3>
                <p>Clear the search or the tag and the catalogue comes back.</p>
              </div>
            )}
            <div className="lz-stack" style={{ gap: 10 }}>
              {videos.map((video) => (
                <Row
                  key={video.slug}
                  title={video.title}
                  blurb={video.blurb}
                  meta={SERIES.find((s) => s.id === video.series)?.title ?? video.tags[0]}
                  href={url(`/library/${video.slug}`)}
                  cta="Watch"
                />
              ))}
            </div>
            <p className="lz-muted" style={{ marginTop: 14 }}>
              {COUNTS.catalogued} of {COUNTS.videos} videos catalogued — the newest page of the library, with the tags
              the page shows. The other series are one click away under <b>Series</b>.
            </p>
          </>
        )}

        {tab === 'series' && (
          <div className="lz-tiles">
            {SERIES.map((series) => (
              <div className="lz-tile" key={series.id}>
                <span className="lz-tile-ic">
                  <Icon name="Presentation" size={16} />
                </span>
                <h3>{series.title}</h3>
                <p>{series.blurb}</p>
                <div className="lz-row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  <Tag>{`${series.lessons} lessons`}</Tag>
                  <Tag>{series.stage}</Tag>
                </div>
                <a className="lz-btn small" href={url(`/library/series/${series.id}`)} target="_blank" rel="noreferrer">
                  <Icon name="ArrowRight" size={12} /> Open the series
                </a>
              </div>
            ))}
          </div>
        )}

        {tab === 'courses' && (
          <>
            <div className="lz-stack" style={{ gap: 10 }}>
              {COURSES.map((course) => (
                <Row
                  key={course.id}
                  title={course.title}
                  blurb={course.blurb}
                  meta={`${course.lessons} lessons · Pro`}
                  href={url(`/pro/${course.id}`)}
                  cta="Course"
                />
              ))}
            </div>
            <div className="lz-card" style={{ marginTop: 12 }}>
              <h3>Every course is the same series you can already read here</h3>
              <p className="lz-sub">
                A course is a series with the Pro wrapper around it: the same lessons, in the same order. ProdOps reads
                the series, so nothing behind the paywall is needed to know what the course contains — only to watch it.
              </p>
              <Link to="kits" className="lz-btn small">
                <Icon name="PackageCheck" size={13} /> The build kits
              </Link>
            </div>
          </>
        )}

        {tab === 'sessions' && (
          <div className="lz-stack" style={{ gap: 10 }}>
            {SESSIONS.map((session) => (
              <Row
                key={session.slug}
                title={session.title}
                blurb={session.blurb}
                meta={session.kind === 'Live' ? `Live · ${session.when}` : `${session.kind} · ${session.when}`}
                href={url(`/sessions/${session.slug}`)}
                cta={session.kind === 'Live' ? 'RSVP' : 'Open'}
              />
            ))}
          </div>
        )}

        {tab === 'articles' && (
          <div className="lz-stack" style={{ gap: 10 }}>
            {articles.length === 0 && (
              <div className="lz-empty">
                <h3>Nothing matches that</h3>
                <p>Try a shorter search.</p>
              </div>
            )}
            {articles.map((article) => (
              <Row
                key={article.slug}
                title={article.title}
                blurb={article.blurb}
                meta={article.date}
                href={url(`/articles/${article.slug}`)}
                cta="Read"
              />
            ))}
          </div>
        )}
      </div>

      <div className="lz-card" style={{ marginTop: 16 }}>
        <h3>Why the library is in the workspace</h3>
        <p className="lz-sub">
          The five stages decide a product; the library is what the school already knows about deciding it. It is also
          where the kits and the reference workflows come from, so the reading and the build sit in one place instead of
          two tabs. Every row carries its upstream URL, and the catalogue is dated{' '}
          <code>{SCRAPED}</code>, so a stale row is visible rather than invisible.
        </p>
        <div className="lz-row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <a className="lz-btn small" href={SOURCE} target="_blank" rel="noreferrer">
            <Icon name="ExternalLink" size={13} /> buildermethods.com
          </a>
          <Link to="kits" className="lz-btn small">
            <Icon name="PackageCheck" size={13} /> Start from a kit
          </Link>
          <Link to="tools" className="lz-btn small">
            <Icon name="Sparkles" size={13} /> The eight tools
          </Link>
        </div>
      </div>
    </div>
  )
}
