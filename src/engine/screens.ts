import type { Block, Entity, Screen, ScreenKind } from '../types'
import type { Rng } from './rng'
import { shortDate } from './samples'

function findEntity(entities: Entity[], id?: string): Entity {
  return entities.find((e) => e.id === id) ?? entities[0]
}

function statusOptions(entity: Entity): string[] {
  if (!entity.statusField) return []
  return entity.fields.find((f) => f.name === entity.statusField)?.options ?? []
}

function statusCounts(entity: Entity): { label: string; count: number }[] {
  const options = statusOptions(entity)
  if (!options.length || !entity.statusField) return []
  return options.map((o) => ({
    label: o,
    count: entity.rows.filter((r) => r[entity.statusField as string] === o).length,
  }))
}

const MONTHS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']

function trendSeries(rng: Rng, base: number, points = 6): number[] {
  let value = base
  return Array.from({ length: points }, () => {
    value = Math.max(3, Math.round(value * (0.9 + rng.next() * 0.28)))
    return value
  })
}

function moneyTotal(entity: Entity): number {
  if (!entity.valueField) return 0
  return entity.rows.reduce((sum, r) => {
    const v = r[entity.valueField as string]
    return typeof v === 'number' ? sum + v : sum
  }, 0)
}

function formatMoneyShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(Math.round(n))
}

function tableColumns(entity: Entity): string[] {
  const order = [entity.primaryField, entity.secondaryField, entity.statusField, entity.valueField]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i) as string[]
  const dateField = entity.fields.find((f) => f.type === 'date')?.name
  if (dateField && !order.includes(dateField)) order.push(dateField)
  if (order.length < 4) {
    const extra = entity.fields.find((f) => !order.includes(f.name) && f.type !== 'longtext')
    if (extra) order.push(extra.name)
  }
  return order.slice(0, 5)
}

function pageHeader(title: string, subtitle: string, actions: string[]): Block {
  return { type: 'pageHeader', title, subtitle, actions }
}

function statsBlock(entity: Entity, rng: Rng, currency: string): Block {
  const count = entity.rows.length
  const statuses = statusCounts(entity)
  const risk = statuses.find((s) => /risk|hold|overdue|late|arrears|open|at risk|watch|rejected|delayed|faulty|below/i.test(s.label))
  const good = statuses.find((s) => /active|paid|complete|delivered|healthy|live|on track/i.test(s.label))
  const moneyField = entity.valueField
  const items = [
    {
      label: `Total ${entity.plural.toLowerCase()}`,
      value: String(count),
      delta: `+${rng.int(2, 18)} this week`,
      trend: 'up' as const,
    },
    {
      label: moneyField ? `${moneyField.replace(/([A-Z])/g, ' $1')} tracked` : 'Completion',
      value: moneyField ? `${currency} ${formatMoneyShort(moneyTotal(entity))}` : `${rng.int(58, 94)}%`,
      delta: `${rng.chance(0.6) ? '+' : '−'}${rng.int(2, 14)}% vs last period`,
      trend: rng.chance(0.6) ? ('up' as const) : ('down' as const),
    },
    {
      label: risk ? `${risk.label}` : 'Needs attention',
      value: String(risk?.count ?? rng.int(1, 6)),
      delta: risk ? 'queue for review' : 'unchanged',
      trend: 'flat' as const,
    },
    {
      label: good ? `${good.label}` : 'On track',
      value: String(good?.count ?? rng.int(4, 20)),
      delta: `${Math.round(((good?.count ?? 6) / Math.max(1, count)) * 100)}% of total`,
      trend: 'up' as const,
    },
  ]
  return { type: 'stats', items }
}

function chartBlock(entity: Entity, rng: Rng): Block {
  const statuses = statusCounts(entity)
  if (statuses.length >= 3 && rng.chance(0.5)) {
    return {
      type: 'chart',
      kind: 'donut',
      title: `${entity.plural} by ${entity.statusField}`,
      labels: statuses.map((s) => s.label),
      series: statuses.map((s) => s.count),
    }
  }
  const base = Math.max(6, entity.rows.length)
  return {
    type: 'chart',
    kind: rng.chance(0.5) ? 'line' : 'area',
    title: `${entity.plural} volume`,
    labels: MONTHS,
    series: trendSeries(rng, base),
    series2: trendSeries(rng, Math.max(3, base - 2)),
  }
}

function activityBlock(entity: Entity, rng: Rng): Block {
  const dateField = entity.fields.find((f) => f.type === 'date')
  const people = entity.rows
    .map((r) => String(r[entity.primaryField] ?? ''))
    .filter(Boolean)
  const verbs = ['updated', 'moved', 'reviewed', 'flagged', 'closed', 'reopened', 'assigned']
  return {
    type: 'activity',
    title: 'Recent activity',
    items: Array.from({ length: 5 }, (_, i) => ({
      who: i % 2 === 0 ? 'System' : 'Ops team',
      what: `${rng.pick(verbs)} ${rng.pick(people)}${rng.chance(0.4) && dateField ? ' · ' + shortDate(String(entity.rows[i]?.[dateField.name] ?? '')) : ''}`,
      when: `${rng.int(2, 58)}m ago`,
    })),
  }
}

function timelineBlock(entity: Entity, rng: Rng, title: string): Block {
  const dateField = entity.fields.find((f) => f.type === 'date')?.name
  return {
    type: 'timeline',
    title,
    events: entity.rows.slice(0, 5).map((row, i) => ({
      time: dateField && row[dateField] ? shortDate(String(row[dateField])) : `D-${i + 1}`,
      title: String(row[entity.primaryField] ?? ''),
      detail: String(row[entity.secondaryField] ?? ''),
      tone: rng.chance(0.2) ? 'warn' : rng.chance(0.4) ? 'good' : 'neutral',
    })),
  }
}

function tableBlock(entity: Entity, caption: string, rng: Rng): Block {
  const rows = rng.shuffled(entity.rows).slice(0, 6).map((r) => String(r.id))
  return { type: 'table', entityId: entity.id, columns: tableColumns(entity), rows, caption }
}

function filtersBlock(entity: Entity, rng: Rng): Block {
  const statuses = statusOptions(entity).slice(0, 4)
  return {
    type: 'filters',
    chips: ['All', ...statuses, ...(rng.chance(0.5) ? ['Mine'] : [])],
    search: `Search ${entity.plural.toLowerCase()}…`,
  }
}

function detailBlock(entity: Entity, recordId: string): Block {
  return {
    type: 'detail',
    entityId: entity.id,
    recordId,
    tabs: ['Overview', 'Activity', 'Related', 'Notes'],
    fields: entity.fields.slice(0, 8).map((f) => f.name),
  }
}

function formBlock(entity: Entity, mode: 'create' | 'edit'): Block {
  const fields = entity.fields.slice(0, 7).map((f) => f.name)
  return {
    type: 'form',
    entityId: entity.id,
    fields,
    submit: mode === 'create' ? `Create ${entity.name.toLowerCase()}` : 'Save changes',
    title: mode === 'create' ? `New ${entity.name.toLowerCase()}` : `Edit ${entity.name.toLowerCase()}`,
  }
}

function boardBlock(entity: Entity, title: string): Block {
  const options = statusOptions(entity).slice(0, 4)
  const columns = (options.length ? options : ['To do', 'Doing', 'Review', 'Done']).map((name, ci) => ({
    name,
    cards: entity.rows
      .slice(ci * 2, ci * 2 + 3)
      .map((row) => ({
        title: String(row[entity.primaryField] ?? ''),
        meta: String(row[entity.secondaryField] ?? ''),
        tag: entity.valueField ? String(row[entity.valueField] ?? '') : String(entity.fields[3]?.name ?? ''),
      })),
  }))
  return { type: 'board', title, columns }
}

function calendarBlock(entity: Entity, month: string, rng: Rng): Block {
  const dateField = entity.fields.find((f) => f.type === 'date')?.name
  const events = entity.rows.slice(0, 8).map((row) => {
    const iso = dateField ? String(row[dateField] ?? '') : ''
    const day = iso ? Number(iso.slice(8, 10)) || rng.int(1, 28) : rng.int(1, 28)
    return { day, label: String(row[entity.primaryField] ?? '') }
  })
  return { type: 'calendar', month, events }
}

function mapBlock(entity: Entity, rng: Rng): Block {
  const pins = entity.rows.slice(0, 9).map((row, i) => ({
    x: 12 + ((i * 37 + rng.int(0, 18)) % 76),
    y: 14 + ((i * 53 + rng.int(0, 16)) % 70),
    label: String(row[entity.primaryField] ?? ''),
    tone: (rng.chance(0.25) ? 'warn' : rng.chance(0.5) ? 'good' : 'neutral') as 'warn' | 'good' | 'neutral',
  }))
  return {
    type: 'map',
    title: `${entity.plural} by location`,
    pins,
    legend: ['Healthy', 'Needs attention', 'Unassigned'],
  }
}

function profileBlock(entity: Entity): Block {
  const row = entity.rows[0]
  return {
    type: 'profile',
    name: String(row?.[entity.primaryField] ?? '—'),
    role: String(row?.[entity.secondaryField] ?? ''),
    meta: entity.fields.slice(2, 5).map((f) => `${f.name}: ${String(row?.[f.name] ?? '—')}`),
    stats: [
      { label: 'Records', value: String(entity.rows.length) },
      { label: 'Last touch', value: (() => {
        const dateField = entity.fields.find((f) => f.type === 'date')
        return dateField ? String(row?.[dateField.name] ?? '—') : '—'
      })() },
      { label: 'Status', value: entity.statusField ? String(row?.[entity.statusField] ?? '—') : 'Active' },
    ],
  }
}

export function buildScreen(
  kind: ScreenKind,
  name: string,
  entityIds: string[],
  entities: Entity[],
  rng: Rng,
  sectionName: string,
  currency: string,
): Screen {
  const entity = findEntity(entities, entityIds[0])
  const secondary = entities.find((e) => e.id === entityIds[1]) ?? entity
  const recordId = String(entity.rows[0]?.id ?? '')
  const blocks: Block[] = []

  switch (kind) {
    case 'overview':
      blocks.push(pageHeader(name, `${sectionName} · live view, generated from the ${entity.plural.toLowerCase()} model.`, ['New ' + entity.name.toLowerCase(), 'Export']))
      blocks.push(statsBlock(entity, rng, currency))
      blocks.push(chartBlock(entity, rng))
      blocks.push(tableBlock(entity, `${entity.plural} needing attention`, rng))
      blocks.push(activityBlock(secondary, rng))
      break
    case 'collection':
      blocks.push(pageHeader(name, `Every ${entity.plural.toLowerCase()} record, filterable and exportable.`, ['New ' + entity.name.toLowerCase(), 'Import', 'Export CSV']))
      blocks.push(filtersBlock(entity, rng))
      blocks.push(tableBlock(entity, `${entity.rows.length} ${entity.plural.toLowerCase()} · sorted by most recent`, rng))
      if (rng.chance(0.6)) blocks.push(statsBlock(entity, rng, currency))
      break
    case 'detail':
      blocks.push(pageHeader(String(entity.rows[0]?.[entity.primaryField] ?? name), `${entity.name} · ${String(entity.rows[0]?.[entity.secondaryField] ?? '')}`, ['Edit', 'Duplicate', 'Archive']))
      blocks.push(detailBlock(entity, recordId))
      blocks.push(timelineBlock(entity, rng, 'History'))
      if (rng.chance(0.5)) blocks.push(tableBlock(secondary, `Related ${secondary.plural.toLowerCase()}`, rng))
      break
    case 'editor':
      blocks.push(pageHeader(name, `A focused form. Escape cancels, Cmd+Enter saves.`, []))
      blocks.push(formBlock(entity, 'create'))
      blocks.push({
        type: 'callout',
        tone: 'info',
        title: 'Validation contract',
        body: `Required fields are marked and validated on blur. ${entity.fields.filter((f) => f.required).length} of ${entity.fields.length} fields are required. Nothing is lost if the network drops.`,
      })
      break
    case 'board':
      blocks.push(pageHeader(name, `Drag to change state. Every move is written to the audit trail.`, ['Add card', 'Group by owner']))
      blocks.push(boardBlock(entity, `${entity.plural} board`))
      blocks.push(activityBlock(entity, rng))
      break
    case 'calendar':
      blocks.push(pageHeader(name, `Month view. Arrow keys move between weeks.`, ['Today', 'Month', 'Week']))
      blocks.push(calendarBlock(entity, 'October 2026', rng))
      blocks.push(timelineBlock(entity, rng, 'Upcoming'))
      break
    case 'analytics':
      blocks.push(pageHeader(name, `Every number is shown with its window and source.`, ['Last 90 days', 'Export']))
      blocks.push(statsBlock(entity, rng, currency))
      blocks.push(chartBlock(entity, rng))
      blocks.push({
        type: 'chart',
        kind: 'bar',
        title: `${secondary.plural} by ${secondary.fields.find((f) => f.type === 'tag')?.name ?? 'category'}`,
        labels: secondary.rows.slice(0, 6).map((r) => String(r[secondary.primaryField] ?? '').split(' ').slice(0, 2).join(' ')),
        series: secondary.rows.slice(0, 6).map(() => rng.int(12, 96)),
      })
      blocks.push(tableBlock(secondary, 'Breakdown', rng))
      break
    case 'settings':
      blocks.push(pageHeader(name, 'Workspace configuration. Changes show a diff before applying.', ['Save changes']))
      blocks.push({
        type: 'split',
        leftTitle: 'Workspace',
        leftBody: 'Name, timezone, currency and week start. These choices cascade into reports and every date shown in the product.',
        rightTitle: 'Guardrails',
        bullets: [
          'Destructive changes require typing the workspace name.',
          'Every setting change is written to the audit log with an actor.',
          'Role presets: Owner, Admin, Editor, Viewer.',
          'Integrations can be connected read-only first.',
        ],
      })
      blocks.push(formBlock(entity, 'edit'))
      break
    case 'onboarding':
      blocks.push(pageHeader(name, 'Resumable setup. Nothing here blocks the workspace.', []))
      blocks.push({
        type: 'steps',
        title: 'Setup checklist',
        steps: [
          { title: 'Name the workspace', detail: 'Brand it, set the currency and timezone.', state: 'done' },
          { title: `Import ${entity.plural.toLowerCase()}`, detail: 'CSV with a dry-run preview before commit.', state: 'current' },
          { title: 'Invite the team', detail: 'Role presets, not a permissions matrix.', state: 'todo' },
          { title: 'Connect an integration', detail: 'Read-only by default, scoped tokens.', state: 'todo' },
        ],
      })
      blocks.push({ type: 'callout', tone: 'good', title: 'You can leave and come back', body: 'Progress is stored per user. Skipping a step marks it as skipped, not failed.' })
      break
    case 'profile':
      blocks.push(pageHeader(name, `${entity.name} record and history.`, ['Edit', 'Message']))
      blocks.push(profileBlock(entity))
      blocks.push(activityBlock(entity, rng))
      if (rng.chance(0.6)) blocks.push(tableBlock(secondary, 'Related records', rng))
      break
    case 'map':
      blocks.push(pageHeader(name, `Spatial view of ${entity.plural.toLowerCase()}.`, ['Filter', 'Recentre']))
      blocks.push(mapBlock(entity, rng))
      blocks.push(tableBlock(entity, 'Records in view', rng))
      break
    case 'inbox':
      blocks.push(pageHeader(name, `A queue, ordered by risk — not by arrival.`, ['Assign to me', 'Bulk resolve']))
      blocks.push(filtersBlock(entity, rng))
      blocks.push({
        type: 'list',
        entityId: entity.id,
        rows: rng.shuffled(entity.rows).slice(0, 6).map((r) => String(r.id)),
        title: 'Queue',
        metaField: entity.statusField ?? entity.secondaryField,
      })
      blocks.push(timelineBlock(entity, rng, 'SLA watch'))
      break
  }

  return {
    id: `${kind}-${entity.id}`,
    name,
    kind,
    route: routeFor(kind, sectionName, entity),
    intent: intentFor(kind, entity),
    blocks,
    states: [
      { name: 'Loading', detail: 'Skeleton rows matching final layout; no spinner over the whole page.' },
      { name: 'Empty', detail: `Zero-state explains what a ${entity.name.toLowerCase()} is and offers the primary create action.` },
      { name: 'Error', detail: 'Inline retry with the failed request named; cached data stays visible.' },
      { name: 'Permission', detail: 'Read-only view for viewers, with the create action hidden rather than disabled.' },
    ],
    acceptance: [
      `A user can reach ${name.toLowerCase()} in one click from the ${sectionName} navigation.`,
      `Every value on the screen maps to a field in the ${entity.name} model or a documented aggregate.`,
      `The screen is usable at 375px with no horizontal scroll on primary content.`,
    ],
    entityIds,
  }
}

function routeFor(kind: ScreenKind, sectionName: string, entity: Entity): string {
  const slug = sectionName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const base = `/${slug}`
  switch (kind) {
    case 'collection':
      return base
    case 'detail':
      return `${base}/:${entity.id.replace(/s$/, '')}Id`
    case 'editor':
      return `${base}/new`
    case 'overview':
      return `${base}/overview`
    case 'analytics':
      return `${base}/analytics`
    case 'settings':
      return '/settings'
    case 'onboarding':
      return '/onboarding'
    case 'profile':
      return `${base}/:id`
    default:
      return `${base}/${kind}`
  }
}

function intentFor(kind: ScreenKind, entity: Entity): string {
  const map: Record<ScreenKind, string> = {
    overview: `Answer "what needs attention right now" across ${entity.plural.toLowerCase()} in under ten seconds.`,
    collection: `Find, filter and act on any ${entity.name.toLowerCase()} without leaving the list.`,
    detail: `Hold the complete story of one ${entity.name.toLowerCase()} — fields, history and related records.`,
    editor: `Capture a ${entity.name.toLowerCase()} with the least possible friction and zero data loss.`,
    board: `See flow and move work forward by dragging, with every change auditable.`,
    calendar: `Place ${entity.plural.toLowerCase()} in time and spot collisions before they happen.`,
    analytics: `Prove what is working, with each number traceable to its window and source.`,
    settings: `Configure the workspace safely, with a visible diff before anything is applied.`,
    onboarding: `Get a new team from empty to useful in ten minutes, resumably.`,
    profile: `Show one person or ${entity.name.toLowerCase()} as a relationship, not a row.`,
    map: `See where ${entity.plural.toLowerCase()} are, and which ones are out of position.`,
    inbox: `Clear the queue in risk order with keyboard-first controls.`,
  }
  return map[kind]
}
