import type { Block, Project, Screen, Section } from '../types'

/**
 * Deterministic SVG screenshots.
 *
 * Design OS ships a screenshot per section so the reader can see the design
 * without running anything. We have no headless browser in this app, so the
 * screenshot is drawn from the same compiled blocks that render the live
 * prototype: same shell, same content, same tokens. It is a real artefact,
 * not a placeholder — and it stays byte-identical for the same seed.
 */

const W = 1280
const H = 800
const RAIL = 232
const PAD = 28
const TOPBAR = 54

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

function wrap(value: string, max: number, lines = 2): string[] {
  const words = value.split(/\s+/)
  const out: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).trim().length > max) {
      if (current) out.push(current)
      current = word
      if (out.length === lines - 1) break
    } else {
      current = (current + ' ' + word).trim()
    }
  }
  if (current && out.length < lines) out.push(current)
  return out
}

interface Ctx {
  project: Project
  screen: Screen
  section: Section
  parts: string[]
  y: number
}

const FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'

function tokens(project: Project) {
  const s = project.design.semantic
  return {
    bg: s['--bg'] ?? '#faf8f4',
    surface: s['--surface'] ?? '#ffffff',
    surface2: s['--surface-2'] ?? '#f4f1ea',
    border: s['--border'] ?? '#e7e2d7',
    borderStrong: s['--border-strong'] ?? '#d6cebf',
    ink: s['--ink'] ?? '#1b1a18',
    ink2: s['--ink-2'] ?? '#4a4741',
    inkMuted: s['--ink-muted'] ?? '#78736a',
    inkFaint: s['--ink-faint'] ?? '#a39d92',
    primary: s['--primary'] ?? '#c4471b',
    onPrimary: s['--on-primary'] ?? '#ffffff',
    radius: project.design.radii.md ?? 10,
  }
}

function card(ctx: Ctx, x: number, y: number, w: number, h: number, fill?: string) {
  const t = tokens(ctx.project)
  ctx.parts.push(
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${t.radius}" fill="${fill ?? t.surface}" stroke="${t.border}" />`,
  )
}

function text(
  ctx: Ctx,
  x: number,
  y: number,
  value: string,
  opts: { size?: number; fill?: string; weight?: number; mono?: boolean; spacing?: number; anchor?: 'start' | 'middle' | 'end' } = {},
) {
  const t = tokens(ctx.project)
  const size = opts.size ?? 13
  ctx.parts.push(
    `<text x="${x}" y="${y}" font-family="${opts.mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : FONT}" font-size="${size}" font-weight="${opts.weight ?? 400}" fill="${opts.fill ?? t.ink2}"${opts.spacing ? ` letter-spacing="${opts.spacing}"` : ''}${opts.anchor ? ` text-anchor="${opts.anchor}"` : ''}>${esc(value)}</text>`,
  )
}

function pill(ctx: Ctx, x: number, y: number, label: string, tone: 'quiet' | 'brand' | 'good' = 'quiet') {
  const t = tokens(ctx.project)
  const w = Math.max(34, label.length * 5.6 + 14)
  const fill = tone === 'brand' ? `${t.primary}1f` : tone === 'good' ? '#1f7a4d1f' : t.surface2
  const colour = tone === 'brand' ? t.primary : tone === 'good' ? '#1f7a4d' : t.inkMuted
  ctx.parts.push(`<rect x="${x}" y="${y}" width="${w}" height="18" rx="9" fill="${fill}" />`)
  text(ctx, x + 7, y + 12.5, label, { size: 10, fill: colour, weight: 500 })
  return w
}

function button(ctx: Ctx, x: number, y: number, label: string, primary = false) {
  const t = tokens(ctx.project)
  const w = Math.max(64, label.length * 6.4 + 22)
  ctx.parts.push(
    `<rect x="${x}" y="${y}" width="${w}" height="28" rx="${Math.min(t.radius, 8)}" fill="${primary ? t.primary : t.surface}" stroke="${primary ? t.primary : t.borderStrong}" />`,
  )
  text(ctx, x + w / 2, y + 18.5, label, { size: 11.5, weight: 500, fill: primary ? t.onPrimary : t.ink, anchor: 'middle' })
  return w
}

/**
 * Draw one block at the cursor and return the height it used.
 */
function drawBlock(ctx: Ctx, block: Block, width: number): number {
  const t = tokens(ctx.project)
  const x = RAIL + PAD
  const y = ctx.y

  switch (block.type) {
    case 'pageHeader': {
      text(ctx, x, y + 22, clip(block.title, 52), { size: 26, weight: 600, fill: t.ink })
      const sub = wrap(block.subtitle, 92, 2)
      sub.forEach((line, i) => text(ctx, x, y + 45 + i * 17, line, { size: 12.5, fill: t.inkMuted }))
      let ax = x + width
      for (const action of [...block.actions].reverse()) {
        const w = Math.max(64, action.length * 6.4 + 22)
        ax -= w + 8
        button(ctx, ax, y + 4, clip(action, 24), action === block.actions[0])
      }
      return 44 + sub.length * 17
    }
    case 'stats': {
      const cols = Math.min(4, block.items.length)
      const gap = 12
      const cw = (width - gap * (cols - 1)) / cols
      block.items.slice(0, cols).forEach((item, i) => {
        const cx = x + i * (cw + gap)
        card(ctx, cx, y, cw, 78)
        text(ctx, cx + 14, y + 20, clip(item.label.toUpperCase(), 22), { size: 9, weight: 600, fill: t.inkFaint, spacing: 0.7 })
        text(ctx, cx + 14, y + 48, clip(item.value, 12), { size: 21, weight: 600, fill: t.ink })
        text(ctx, cx + 14, y + 66, clip(item.delta, 24), { size: 10, fill: t.inkMuted })
      })
      return 90
    }
    case 'filters': {
      let cx = x
      for (const [i, chip] of block.chips.slice(0, 5).entries()) {
        const w = pill(ctx, cx, y, clip(chip, 18), i === 0 ? 'brand' : 'quiet')
        cx += w + 6
      }
      const sw = Math.min(220, width * 0.3)
      ctx.parts.push(
        `<rect x="${x + width - sw}" y="${y - 1}" width="${sw}" height="26" rx="7" fill="${t.surface}" stroke="${t.border}" />`,
      )
      text(ctx, x + width - sw + 10, y + 16, `⌕  ${clip(block.search, 30)}`, { size: 10.5, fill: t.inkFaint })
      return 38
    }
    case 'chart': {
      const h = 190
      card(ctx, x, y, width, h)
      text(ctx, x + 16, y + 24, clip(block.title, 46), { size: 12.5, weight: 600, fill: t.ink })
      pill(ctx, x + width - 104, y + 10, 'Last 6 periods')
      const max = Math.max(1, ...block.series)
      const bars = block.series.slice(0, 14)
      const bw = Math.min(26, (width - 80) / Math.max(1, bars.length) - 6)
      const base = y + h - 34
      bars.forEach((value, i) => {
        const bh = Math.max(6, (value / max) * 96)
        ctx.parts.push(
          `<rect x="${x + 24 + i * (bw + 10)}" y="${base - bh}" width="${bw}" height="${bh}" rx="3" fill="${i % 3 === 2 ? ctx.project.design.colors[1]?.base ?? '#e8a15c' : t.primary}" opacity="${i % 3 === 2 ? 0.55 : 0.9}" />`,
        )
        text(ctx, x + 24 + i * (bw + 10), base + 14, clip(block.labels[i] ?? '', 4), { size: 8.5, fill: t.inkFaint })
      })
      return h + 12
    }
    case 'table':
    case 'list': {
      const isTable = block.type === 'table'
      const entity = ctx.project.data.entities.find((e) => e.id === block.entityId)
      const dataRows = (block.rows.map((id) => entity?.rows.find((r) => String(r.id) === id)).filter(Boolean) as Record<string, string | number | boolean>[]).slice(0, 6)
      const rows = Math.max(1, dataRows.length)
      const head = 34
      const rowH = 26
      const h = head + rows * rowH + 16
      card(ctx, x, y, width, h)
      text(ctx, x + 14, y + 21, clip(isTable ? block.caption : block.title, 52), { size: 12, weight: 600, fill: t.ink })
      const columns = isTable ? block.columns.slice(0, 5) : ['name', 'meta', 'status']
      const cw = (width - 28) / columns.length
      columns.forEach((col, i) => {
        const label = isTable ? col : col === 'name' ? entity?.primaryField ?? 'name' : col === 'meta' ? block.metaField : 'status'
        text(ctx, x + 14 + i * cw, y + 42, clip(String(label).toUpperCase(), 16), { size: 8.5, weight: 600, fill: t.inkFaint, spacing: 0.5 })
      })
      dataRows.forEach((row, r) => {
        const ry = y + head + 32 + r * rowH
        if (r % 2 === 1) {
          ctx.parts.push(`<rect x="${x + 1}" y="${ry - 16}" width="${width - 2}" height="${rowH}" fill="${t.surface2}" opacity="0.5" />`)
        }
        columns.forEach((col, c) => {
          const field = entity?.fields.find((f) => f.name === col)
          const raw = isTable ? row[col] : c === 0 ? row[entity?.primaryField ?? 'name'] : c === 1 ? row[block.metaField] : row[entity?.statusField ?? 'status']
          const value = raw === undefined || raw === null || raw === '' ? '—' : String(raw)
          if (field?.type === 'status' || (!isTable && c === 2)) {
            pill(ctx, x + 14 + c * cw, ry - 12, clip(value, 14), /active|paid|complete|done|confirmed|approved/i.test(value) ? 'good' : 'quiet')
          } else {
            text(ctx, x + 14 + c * cw, ry, clip(value, Math.max(8, Math.floor(cw / 6.4))), {
              size: 10.5,
              fill: c === 0 ? t.ink : t.ink2,
              weight: c === 0 ? 500 : 400,
            })
          }
        })
        if (r < dataRows.length - 1) ctx.parts.push(`<line x1="${x + 1}" y1="${ry + 10}" x2="${x + width - 1}" y2="${ry + 10}" stroke="${t.border}" />`)
      })
      return h + 12
    }
    case 'detail': {
      const h = 150
      card(ctx, x, y, width, h)
      let tx = x + 12
      block.tabs.slice(0, 4).forEach((tab, i) => {
        const w = Math.max(50, tab.length * 6 + 18)
        if (i === 0) ctx.parts.push(`<rect x="${tx}" y="${y + 10}" width="${w}" height="24" rx="6" fill="${t.surface2}" />`)
        text(ctx, tx + w / 2, y + 26, clip(tab, 16), { size: 11, fill: i === 0 ? t.ink : t.inkMuted })
        tx += w + 4
      })
      block.fields.slice(0, 6).forEach((field, i) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        const fx = x + 16 + col * (width / 2 - 10)
        const fy = y + 58 + row * 30
        text(ctx, fx, fy, clip(field.toUpperCase(), 20), { size: 8.5, weight: 600, fill: t.inkFaint, spacing: 0.5 })
        ctx.parts.push(`<rect x="${fx}" y="${fy + 6}" width="${60 + ((i * 23) % 60)}" height="6" rx="3" fill="${t.borderStrong}" />`)
      })
      return h + 12
    }
    case 'form': {
      const h = 56 + Math.ceil(block.fields.length / 2) * 44 + 40
      card(ctx, x, y, width, h)
      text(ctx, x + 16, y + 24, clip(block.title, 46), { size: 12.5, weight: 600, fill: t.ink })
      block.fields.forEach((field, i) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        const fx = x + 16 + col * (width / 2 - 12)
        const fy = y + 44 + row * 44
        text(ctx, fx, fy, clip(field, 22), { size: 9.5, weight: 500, fill: t.ink2 })
        ctx.parts.push(`<rect x="${fx}" y="${fy + 7}" width="${width / 2 - 32}" height="26" rx="6" fill="${t.surface}" stroke="${t.borderStrong}" />`)
        ctx.parts.push(`<rect x="${fx + 9}" y="${fy + 17}" width="${40 + ((i * 19) % 50)}" height="6" rx="3" fill="${t.borderStrong}" opacity="0.6" />`)
      })
      const by = y + h - 34
      button(ctx, x + 16, by, clip(block.submit, 20), true)
      button(ctx, x + 16 + Math.max(64, block.submit.length * 6.4 + 22) + 8, by, 'Cancel')
      return h + 12
    }
    case 'board': {
      const cols = Math.min(3, block.columns.length)
      const gap = 12
      const cw = (width - gap * (cols - 1)) / cols
      const h = 176
      block.columns.slice(0, cols).forEach((col, i) => {
        const cx = x + i * (cw + gap)
        card(ctx, cx, y, cw, h, t.surface2)
        text(ctx, cx + 12, y + 20, clip(col.name.toUpperCase(), 18), { size: 8.5, weight: 600, fill: t.inkFaint, spacing: 0.6 })
        col.cards.slice(0, 3).forEach((item, j) => {
          const cy = y + 32 + j * 44
          card(ctx, cx + 8, cy, cw - 16, 36)
          text(ctx, cx + 16, cy + 15, clip(item.title, Math.max(8, Math.floor(cw / 7))), { size: 10.5, weight: 500, fill: t.ink })
          text(ctx, cx + 16, cy + 29, clip(item.meta, Math.max(8, Math.floor(cw / 6))), { size: 9, fill: t.inkMuted })
        })
      })
      return h + 12
    }
    case 'callout': {
      const h = 64
      const tone = block.tone === 'warn' ? '#b8860b' : block.tone === 'good' ? '#1f7a4d' : t.primary
      ctx.parts.push(`<rect x="${x}" y="${y}" width="${width}" height="${h}" rx="${t.radius}" fill="${tone}14" stroke="${tone}55" />`)
      text(ctx, x + 16, y + 24, clip(block.title, 54), { size: 12, weight: 600, fill: t.ink })
      wrap(block.body, 108, 2).forEach((line, i) => text(ctx, x + 16, y + 42 + i * 15, line, { size: 11, fill: t.ink2 }))
      return h + 12
    }
    case 'timeline':
    case 'activity':
    case 'steps': {
      const items =
        block.type === 'timeline'
          ? block.events.map((e) => [e.title, `${e.time} · ${e.detail}`] as const)
          : block.type === 'activity'
            ? block.items.map((a) => [`${a.who} ${a.what}`, a.when] as const)
            : block.steps.map((s) => [s.title, s.detail] as const)
      const h = 44 + items.slice(0, 4).length * 34
      card(ctx, x, y, width, h)
      text(ctx, x + 16, y + 24, clip(block.title, 48), { size: 12, weight: 600, fill: t.ink })
      items.slice(0, 4).forEach((item, i) => {
        const iy = y + 52 + i * 34
        ctx.parts.push(`<circle cx="${x + 24}" cy="${iy - 4}" r="4" fill="${i === 0 ? t.primary : t.borderStrong}" />`)
        text(ctx, x + 38, iy, clip(item[0], 60), { size: 11, weight: 500, fill: t.ink })
        text(ctx, x + 38, iy + 14, clip(item[1], 70), { size: 10, fill: t.inkMuted })
      })
      return h + 12
    }
    case 'calendar': {
      const h = 210
      card(ctx, x, y, width, h)
      text(ctx, x + 16, y + 24, clip(block.month, 30), { size: 12, weight: 600, fill: t.ink })
      const cw = (width - 32) / 7
      for (let i = 0; i < 21; i++) {
        const cx = x + 16 + (i % 7) * cw
        const cy = y + 40 + Math.floor(i / 7) * 40
        ctx.parts.push(`<rect x="${cx}" y="${cy}" width="${cw - 4}" height="36" rx="4" fill="none" stroke="${t.border}" />`)
        text(ctx, cx + 5, cy + 12, String(i + 1), { size: 8.5, fill: t.inkFaint })
        if (i % 5 === 2) {
          ctx.parts.push(`<rect x="${cx + 4}" y="${cy + 18}" width="${cw - 12}" height="8" rx="3" fill="${t.primary}" opacity="0.35" />`)
        }
      }
      return h + 12
    }
    case 'empty': {
      const h = 150
      ctx.parts.push(
        `<rect x="${x}" y="${y}" width="${width}" height="${h}" rx="${t.radius}" fill="${t.surface}" stroke="${t.borderStrong}" stroke-dasharray="5 4" />`,
      )
      text(ctx, x + width / 2, y + 52, clip(block.title, 40), { size: 14, weight: 600, fill: t.ink, anchor: 'middle' })
      wrap(block.body, 92, 2).forEach((line, i) => text(ctx, x + width / 2 - 220, y + 74 + i * 16, line, { size: 11, fill: t.inkMuted }))
      button(ctx, x + width / 2 - 60, y + 106, clip(block.action, 24), true)
      return h + 12
    }
    case 'profile': {
      const h = 118
      card(ctx, x, y, width, h)
      ctx.parts.push(`<circle cx="${x + 38}" cy="${y + 38}" r="20" fill="${t.primary}22" />`)
      text(ctx, x + 38, y + 44, block.name.slice(0, 1), { size: 15, weight: 600, fill: t.primary, anchor: 'middle' })
      text(ctx, x + 70, y + 34, clip(block.name, 32), { size: 14, weight: 600, fill: t.ink })
      text(ctx, x + 70, y + 52, clip(block.role, 40), { size: 11, fill: t.inkMuted })
      block.stats.slice(0, 3).forEach((stat, i) => {
        text(ctx, x + 24 + i * 130, y + 88, clip(stat.label.toUpperCase(), 16), { size: 8.5, weight: 600, fill: t.inkFaint, spacing: 0.5 })
        text(ctx, x + 24 + i * 130, y + 104, clip(stat.value, 14), { size: 13, weight: 600, fill: t.ink })
      })
      return h + 12
    }
    case 'map': {
      const h = 170
      ctx.parts.push(`<rect x="${x}" y="${y}" width="${width}" height="${h}" rx="${t.radius}" fill="${t.surface2}" stroke="${t.border}" />`)
      for (let i = 1; i < 5; i++) {
        ctx.parts.push(`<line x1="${x}" y1="${y + (h / 5) * i}" x2="${x + width}" y2="${y + (h / 5) * i}" stroke="${t.border}" stroke-dasharray="3 5" />`)
        ctx.parts.push(`<line x1="${x + (width / 5) * i}" y1="${y}" x2="${x + (width / 5) * i}" y2="${y + h}" stroke="${t.border}" stroke-dasharray="3 5" />`)
      }
      block.pins.slice(0, 8).forEach((pin) => {
        ctx.parts.push(`<circle cx="${x + (pin.x / 100) * width}" cy="${y + (pin.y / 100) * h}" r="5" fill="${t.primary}" />`)
      })
      return h + 12
    }
    case 'split': {
      const h = 132
      const half = (width - 12) / 2
      card(ctx, x, y, half, h)
      text(ctx, x + 14, y + 24, clip(block.leftTitle, 30), { size: 12, weight: 600, fill: t.ink })
      wrap(block.leftBody, 56, 3).forEach((line, i) => text(ctx, x + 14, y + 44 + i * 16, line, { size: 10.5, fill: t.inkMuted }))
      card(ctx, x + half + 12, y, half, h)
      text(ctx, x + half + 26, y + 24, clip(block.rightTitle, 30), { size: 12, weight: 600, fill: t.ink })
      block.bullets.slice(0, 3).forEach((b, i) => text(ctx, x + half + 26, y + 44 + i * 18, `• ${clip(b, 44)}`, { size: 10.5, fill: t.inkMuted }))
      return h + 12
    }
    default:
      return 0
  }
}

function shellSvg(project: Project, screen: Screen, section: Section, surface: 'screen' | 'shell'): string {
  const t = tokens(project)
  const parts: string[] = []
  const nav = project.system.shell.nav.map((n) => n.label)
  const useSidebar = project.design.layout.shell !== 'topbar'

  const ctx: Ctx = { project, screen, section, parts, y: 0 }

  parts.push(`<rect width="${W}" height="${H}" fill="${t.bg}" />`)
  if (useSidebar) {
    parts.push(`<rect width="${RAIL}" height="${H}" fill="${t.surface}" />`)
    parts.push(`<line x1="${RAIL}" y1="0" x2="${RAIL}" y2="${H}" stroke="${t.border}" />`)
    parts.push(`<rect x="20" y="24" width="26" height="26" rx="8" fill="${t.primary}" />`)
    text(ctx, 33, 42, project.name.slice(0, 1).toUpperCase(), { size: 13, weight: 600, fill: t.onPrimary, anchor: 'middle' })
    text(ctx, 54, 42, clip(project.name, 18), { size: 13, weight: 600, fill: t.ink })
    text(ctx, 20, 76, 'WORKSPACE', { size: 8.5, weight: 600, fill: t.inkFaint, spacing: 0.8 })
    nav.slice(0, 8).forEach((label, i) => {
      const navY = 92 + i * 30
      const active = label === section.name || (i === 0 && !nav.includes(section.name))
      if (active) parts.push(`<rect x="12" y="${navY - 15}" width="${RAIL - 24}" height="26" rx="7" fill="${t.primary}14" />`)
      parts.push(`<circle cx="28" cy="${navY - 2}" r="4.5" fill="${active ? t.primary : t.borderStrong}" />`)
      text(ctx, 40, navY + 2, clip(label, 20), { size: 11.5, weight: active ? 600 : 400, fill: active ? t.primary : t.inkMuted })
    })
    parts.push(`<circle cx="34" cy="${H - 40}" r="13" fill="${t.surface2}" />`)
    text(ctx, 34, H - 36, 'OM', { size: 9, weight: 600, fill: t.inkMuted, anchor: 'middle' })
    text(ctx, 54, H - 36, 'Ops lead', { size: 10.5, fill: t.inkMuted })
  }

  const contentX = useSidebar ? RAIL : 0
  const contentW = W - contentX
  parts.push(`<rect x="${contentX}" y="0" width="${contentW}" height="${TOPBAR}" fill="${t.bg}" />`)
  parts.push(`<line x1="${contentX}" y1="${TOPBAR}" x2="${W}" y2="${TOPBAR}" stroke="${t.border}" />`)
  let chipW = pill(ctx, contentX + 20, 17, clip(project.brief.category, 22), 'brand')
  parts.push(`<rect x="${contentX + 20 + chipW + 12}" y="14" width="230" height="26" rx="7" fill="${t.surface}" stroke="${t.border}" />`)
  text(ctx, contentX + 20 + chipW + 24, 31, '⌕  Search or jump to…', { size: 10.5, fill: t.inkFaint })
  parts.push(`<circle cx="${W - 30}" cy="27" r="13" fill="${t.surface2}" />`)
  text(ctx, W - 30, 31, 'OM', { size: 9, weight: 600, fill: t.inkMuted, anchor: 'middle' })

  ctx.y = TOPBAR + 26
  const width = contentW - PAD * 2
  const body: string[] = []
  for (const block of screen.blocks) {
    if (ctx.y > H - 120) break
    ctx.parts = body
    const before = body.length
    const used = drawBlock(ctx, block, width)
    if (body.length === before) continue
    ctx.y += used
  }
  parts.push(
    `<clipPath id="bodyClip"><rect x="${contentX}" y="${TOPBAR + 1}" width="${contentW}" height="${H - TOPBAR - 28}" /></clipPath>`,
    `<g clip-path="url(#bodyClip)">`,
    ...body,
    `</g>`,
  )

  parts.push(`<line x1="${contentX + PAD}" y1="${H - 26}" x2="${W - PAD}" y2="${H - 26}" stroke="${t.border}" />`)
  text(ctx, contentX + PAD, H - 10, `${project.name} · ${screen.name}`, { size: 9.5, fill: t.inkFaint })
  text(ctx, W - PAD - 120, H - 10, `${screen.route}  ·  ${surface === 'shell' ? 'shell' : 'screenshot'}`, { size: 9.5, fill: t.inkFaint })

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(`${section.name}: ${screen.name} — designed in Lula DevZign`)}">
<rect width="${W}" height="${H}" fill="${t.bg}" />
${parts.join('\n')}
</svg>
`
}

export function screenScreenshot(project: Project, section: Section, screen: Screen): string {
  return shellSvg(project, screen, section, 'screen')
}

export function shellScreenshot(project: Project): string {
  const section = project.sections[0]
  const screen = section?.screens[0]
  if (!section || !screen) return ''
  return shellSvg(project, screen, section, 'shell')
}
