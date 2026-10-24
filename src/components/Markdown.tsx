import type { ReactNode } from 'react'

/**
 * A deliberately small markdown renderer for the generated wiki.
 * Supports headings, paragraphs, bullet lists, ordered lists, tables, fenced
 * code and inline bold / code / links — which is everything the compiler writes.
 */

function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let match: RegExpExecArray | null
  let i = 0
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const token = match[0]
    if (token.startsWith('**')) parts.push(<strong key={`${keyPrefix}-b-${i}`}>{token.slice(2, -2)}</strong>)
    else if (token.startsWith('`')) parts.push(<code key={`${keyPrefix}-c-${i}`}>{token.slice(1, -1)}</code>)
    else {
      const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(token)
      parts.push(
        <a key={`${keyPrefix}-a-${i}`} href={link?.[2]} target="_blank" rel="noreferrer">
          {link?.[1]}
        </a>,
      )
    }
    last = match.index + token.length
    i++
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export function Markdown({ source }: { source: string }) {
  const lines = source.split('\n')
  const blocks: ReactNode[] = []
  let list: string[] = []
  let ordered = false
  let code: string[] | null = null
  let table: string[] = []

  const flushList = () => {
    if (!list.length) return
    const Tag = ordered ? 'ol' : 'ul'
    blocks.push(
      <Tag className="lz-bullets" key={`list-${blocks.length}`}>
        {list.map((item, i) => <li key={i}>{inline(item, `li-${blocks.length}-${i}`)}</li>)}
      </Tag>,
    )
    list = []
  }

  const flushTable = () => {
    if (!table.length) return
    const rows = table
      .filter((row) => !/^\|[\s|:-]+\|$/.test(row.trim()))
      .map((row) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
    const [head, ...body] = rows
    blocks.push(
      <div className="lz-table-scroll" key={`table-${blocks.length}`}>
        <table className="lz-table">
          <thead><tr>{head?.map((c, i) => <th key={i}>{inline(c, `th-${blocks.length}-${i}`)}</th>)}</tr></thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={{ whiteSpace: 'normal' }}>{inline(cell, `td-${blocks.length}-${ri}-${ci}`)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>,
    )
    table = []
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (code) {
        blocks.push(<pre className="lz-code" key={`code-${blocks.length}`}>{code.join('\n')}</pre>)
        code = null
      } else {
        flushList()
        flushTable()
        code = []
      }
      continue
    }
    if (code) {
      code.push(line)
      continue
    }
    if (line.trim().startsWith('|')) {
      flushList()
      table.push(line)
      continue
    }
    flushTable()

    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      flushList()
      const level = heading[1].length
      const content = inline(heading[2], `h-${blocks.length}`)
      if (level === 1) blocks.push(<h2 key={blocks.length} style={{ font: '700 20px/1.25 var(--font)', letterSpacing: '-.02em', margin: '2px 0 8px', color: 'var(--ink)' }}>{content}</h2>)
      else if (level === 2) blocks.push(<h3 key={blocks.length} style={{ font: '600 15px/1.3 var(--font)', margin: '14px 0 6px', color: 'var(--ink)' }}>{content}</h3>)
      else blocks.push(<h4 key={blocks.length} style={{ font: '600 13px/1.3 var(--font)', margin: '12px 0 4px', color: 'var(--ink-2)' }}>{content}</h4>)
      continue
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line)
    if (bullet) {
      if (ordered) flushList()
      ordered = false
      list.push(bullet[1])
      continue
    }
    const numbered = /^\d+\.\s+(.*)$/.exec(line)
    if (numbered) {
      if (!ordered) flushList()
      ordered = true
      list.push(numbered[1])
      continue
    }

    if (!line.trim()) {
      flushList()
      continue
    }

    flushList()
    blocks.push(
      <p key={blocks.length} style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)', margin: '4px 0' }}>
        {inline(line, `p-${blocks.length}`)}
      </p>,
    )
  }

  flushList()
  flushTable()
  if (code) blocks.push(<pre className="lz-code" key={`code-${blocks.length}`}>{code.join('\n')}</pre>)

  return <div className="lz-md">{blocks}</div>
}
