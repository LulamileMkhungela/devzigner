import type { DataModel, Entity, EntityField, Relationship, SampleRow } from '../types'
import type { EntityDef, Pack } from './packTypes'
import type { Rng } from './rng'
import { sampleValue, money } from './samples'

function singular(id: string): string {
  return id.endsWith('ies') ? id.slice(0, -3) + 'y' : id.replace(/s$/, '')
}

function resolveTarget(field: { name: string }, entity: EntityDef, all: EntityDef[]): EntityDef | undefined {
  const needle = field.name.toLowerCase().replace(/[_\s]/g, '')
  return all.find((e) => {
    if (e.id === entity.id) return e.id === entity.id && false
    const candidates = [e.id.toLowerCase(), singular(e.id).toLowerCase(), e.name.toLowerCase(), e.plural.toLowerCase()]
    return candidates.some((c) => c.includes(needle) || needle.includes(c))
  })
}

const SQL_TYPES: Record<string, string> = {
  text: 'text',
  longtext: 'text',
  email: 'citext',
  phone: 'text',
  number: 'integer',
  percent: 'smallint',
  money: 'numeric(14,2)',
  date: 'date',
  boolean: 'boolean',
  status: 'text',
  tag: 'text',
  location: 'text',
  relation: 'uuid',
  rating: 'numeric(2,1)',
  image: 'text',
}

function columnName(field: EntityField): string {
  return field.name
}

export function compileDataModel(pack: Pack, rng: Rng): DataModel {
  const defs = pack.entities
  const entities: Entity[] = defs.map((def) => {
    const fields: EntityField[] = def.fields.map((fd) => {
      const target = fd.type === 'relation' ? resolveTarget(fd, def, defs) : undefined
      return {
        name: fd.name,
        type: fd.type,
        required: fd.required ?? true,
        example: '',
        options: fd.options,
        note: fd.note ?? describeField({ name: fd.name, type: fd.type, options: fd.options }, target?.name),
        references: target?.id,
      }
    })

    return {
      id: def.id,
      name: def.name,
      plural: def.plural,
      icon: def.icon,
      description: def.description,
      fields,
      rows: [],
      primaryField: def.primaryField,
      secondaryField: def.secondaryField,
      statusField: def.statusField,
      valueField: def.valueField,
    }
  })

  // Pass 1: scalar values
  for (const entity of entities) {
    const count = rng.int(7, 13)
    for (let i = 0; i < count; i++) {
      const row: SampleRow = { id: `${entity.id.slice(0, 3)}-${1000 + i}` }
      for (const field of entity.fields) {
        if (field.type === 'relation') continue
        row[field.name] = sampleValue(field, rng, entity.id)
      }
      entity.rows.push(row)
    }
  }

  // Pass 2: relation values point at real sample rows
  for (const entity of entities) {
    for (const field of entity.fields) {
      if (field.type !== 'relation') continue
      const target = entities.find((e) => e.id === field.references) ?? entities.find((e) => e.id !== entity.id)
      if (!target) continue
      for (const row of entity.rows) {
        const pick = target.rows[rng.int(0, target.rows.length - 1)]
        row[field.name] = String(pick?.[target.primaryField] ?? '—')
      }
    }
  }

  // Money must look like a ledger, not noise: sort the value column descending
  for (const entity of entities) {
    if (!entity.valueField) continue
    const field = entity.fields.find((f) => f.name === entity.valueField)
    if (!field) continue
    if (field.type === 'money') {
      entity.rows.forEach((r) => {
        if (typeof r[field.name] === 'number') r[field.name] = money(rng, 80, 18000)
      })
    }
  }

  // Examples
  for (const entity of entities) {
    for (const field of entity.fields) {
      const v = entity.rows[0]?.[field.name]
      field.example = typeof v === 'boolean' ? (v ? 'true' : 'false') : v ?? ''
    }
  }

  const relationships: Relationship[] = []
  for (const entity of entities) {
    for (const field of entity.fields) {
      if (field.type !== 'relation' || !field.references) continue
      const target = entities.find((e) => e.id === field.references)
      if (!target) continue
      if (relationships.some((r) => r.from === entity.id && r.to === target.id)) continue
      relationships.push({
        from: entity.id,
        to: target.id,
        kind: '1:N',
        label: `${target.name} has many ${entity.plural.toLowerCase()}`,
        via: field.name,
      })
    }
  }

  const notes = [
    `Every table carries a uuid primary key plus created_at / updated_at timestamptz columns.`,
    `${relationships.length} foreign keys resolved from the ${entities.length} core entities; nothing is denormalised until a query proves it necessary.`,
    `Status columns are text with a check constraint rather than enums, so new states ship without a migration lock.`,
    `Money is numeric(14,2), never floating point. Percentages are smallint (0–100), never fractions.`,
    `Soft deletes (deleted_at timestamptz) are used on ${entities.slice(0, 3).map((e) => e.plural.toLowerCase()).join(', ')}; everything else is hard-deleted.`,
    `Suggest indexes on every status and date column used by the workspace queue.`,
  ]

  return { entities, relationships, notes, sql: generateSql(entities, relationships) }
}

function describeField(field: { name: string; type: string; options?: string[] }, target?: string): string {
  if (field.type === 'relation') return `Links to ${target ?? 'a related record'}; enforced as a foreign key.`
  if (field.type === 'status' && field.options) return `One of: ${field.options.join(' · ')}`
  if (field.type === 'money') return 'Currency amount, stored as numeric(14,2).'
  if (field.type === 'percent') return 'Whole percentage, 0–100.'
  if (field.type === 'date') return 'Calendar date; rendered in the workspace timezone.'
  if (field.type === 'boolean') return 'Boolean flag used by filters and automation.'
  if (field.type === 'rating') return 'Star rating, one decimal place.'
  if (field.type === 'email') return 'Validated email address, used for notifications.'
  if (field.type === 'phone') return 'E.164 formatted where possible.'
  if (field.type === 'tag') return 'Free-form label drawn from a controlled vocabulary.'
  if (field.type === 'location') return 'Human-readable place; geocoded lazily.'
  return 'Plain text, maximum 500 characters unless specified.'
}

export function generateSql(entities: Entity[], relationships: Relationship[]): string {
  const lines: string[] = [
    '-- Lula DevZign — generated schema (PostgreSQL)',
    '-- Deterministic output: the same seed always produces this file.',
    'create extension if not exists "pgcrypto";',
    'create extension if not exists "citext";',
    '',
  ]
  for (const entity of entities) {
    lines.push(`create table ${entity.id} (`)
    lines.push('  id uuid primary key default gen_random_uuid(),')
    for (const field of entity.fields) {
      const col = field.type === 'relation' ? `${columnName(field)}_id` : columnName(field)
      let type = SQL_TYPES[field.type] ?? 'text'
      if (field.type === 'relation') {
        const rel = relationships.find((r) => r.from === entity.id && r.via === field.name)
        type = rel ? `uuid references ${rel.to} (id) on delete set null` : 'uuid'
      }
      const notNull = field.required && field.type !== 'relation' ? ' not null' : ''
      let check = ''
      if (field.type === 'status' && field.options?.length) {
        check = ` check (${col} in (${field.options.map((o) => `'${o}'`).join(', ')}))`
      }
      const comment = field.note ? `  -- ${field.note}` : ''
      lines.push(`  ${col} ${type}${notNull}${check},${comment}`)
    }
    lines.push('  created_at timestamptz not null default now(),')
    lines.push('  updated_at timestamptz not null default now(),')
    lines.push('  deleted_at timestamptz')
    lines.push(');')
    const statusField = entity.fields.find((f) => f.type === 'status')
    if (statusField) lines.push(`create index ${entity.id}_${statusField.name}_idx on ${entity.id} (${statusField.name});`)
    const dateField = entity.fields.find((f) => f.type === 'date')
    if (dateField) lines.push(`create index ${entity.id}_${dateField.name}_idx on ${entity.id} (${dateField.name});`)
    lines.push('')
  }
  lines.push('-- Relationships')
  for (const r of relationships) {
    lines.push(`-- ${r.to} 1 —— * ${r.from}  (via ${r.from}.${r.via}_id)`)
  }
  return lines.join('\n')
}
