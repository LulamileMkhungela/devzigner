/**
 * The backend half of the handoff.
 *
 * ProdOps hands a coding agent a UI. This hands it a working product: domain
 * rules, an HTTP API, a repository, seeds from the section sample data, and the
 * tests that prove the rules. Everything is dependency-free TypeScript that
 * runs on Node's own `http` module and its own test runner, so the generated
 * server can be executed — not just read — the moment it is unzipped.
 *
 * The rules are not invented per export: status flows come from the compiled
 * entity options, required fields from the compiled data shape, relation checks
 * from the compiled relationships, and money/percent/rating invariants from the
 * field types.
 */
import type { Entity, Project } from '../types'
import type { PackageFile } from './package'

const json = (value: unknown): string => JSON.stringify(value, null, 2)
const q = (value: unknown): string => JSON.stringify(value)

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function terminal(entity: Entity): string[] {
  const options = entity.fields.find((f) => f.name === entity.statusField)?.options ?? []
  return options.filter((option) => /cancel|churn|archiv|ban|reject|void|lost|refund|fail|closed|expired/i.test(option))
}

function fieldsMeta(entity: Entity): unknown {
  return entity.fields.map((field) => ({
    name: field.name,
    type: field.type,
    required: field.required,
    ...(field.options ? { options: field.options } : {}),
    ...(field.references ? { references: field.references } : {}),
  }))
}

export function entityTable(project: Project): string {
  return project.data.entities
    .map(
      (entity) =>
        `| ${entity.name} | \`/api/${entity.id}\` | ${(entity.fields.find((f) => f.name === entity.statusField)?.options ?? []).join(' → ') || '—'} | ${entity.fields.filter((f) => f.required).length} | ${entity.rows.length} |`,
    )
    .join('\n')
}

/* --------------------------------------------------------------------------
   fixed runtime: the parts that do not depend on the product
   -------------------------------------------------------------------------- */

const TYPES = `export type Scalar = string | number | boolean
export type Row = Record<string, Scalar>
export type Role = 'viewer' | 'member' | 'admin'

export interface FieldDef {
  name: string
  type: string
  required: boolean
  options?: string[]
  references?: string
}

export interface EntityDef {
  id: string
  name: string
  plural: string
  primaryField: string
  statusField?: string
  valueField?: string
  fields: FieldDef[]
}

export type ApiResponse = { status: number; body: unknown }
`

const ERRORS = `export type ErrorCode =
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'forbidden'
  | 'bad_request'
  | 'method_not_allowed'

const STATUS: Record<ErrorCode, number> = {
  validation: 422,
  not_found: 404,
  conflict: 409,
  forbidden: 403,
  bad_request: 400,
  method_not_allowed: 405,
}

export class AppError extends Error {
  code: ErrorCode
  status: number
  details: unknown

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = STATUS[code]
    this.details = details ?? null
  }
}

export function fail(code: ErrorCode, message: string, details?: unknown): never {
  throw new AppError(code, message, details)
}
`

const REPOSITORY = `import type { Row } from './types.ts'
import { ENTITIES } from './types.ts'

export interface ListOptions {
  limit?: number
  offset?: number
  sort?: string
  dir?: 'asc' | 'desc'
  q?: string
  filters?: Record<string, string>
}

function compare(a: Row, b: Row, field: string): number {
  const left = a[field]
  const right = b[field]
  if (typeof left === 'number' && typeof right === 'number') return left - right
  return String(left ?? '').localeCompare(String(right ?? ''))
}

/**
 * A deterministic in-memory repository. Swap this class for a Postgres adapter
 * with the same five methods and nothing above it has to change.
 */
export class MemoryRepository {
  private tables = new Map<string, Row[]>()
  private sequence = new Map<string, number>()

  constructor(seed: Record<string, Row[]>) {
    for (const [entity, rows] of Object.entries(seed)) {
      this.tables.set(entity, rows.map((row) => ({ ...row })))
      this.sequence.set(entity, rows.length)
    }
  }

  all(entity: string): Row[] {
    return this.tables.get(entity) ?? []
  }

  list(entity: string, options: ListOptions = {}): ListResult {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100)
    const offset = Math.max(options.offset ?? 0, 0)
    const def = ENTITIES[entity]
    let rows = [...this.all(entity)]

    const filters = options.filters ?? {}
    for (const [field, value] of Object.entries(filters)) {
      if (!def.fields.some((f) => f.name === field)) continue
      rows = rows.filter((row) => String(row[field] ?? '').toLowerCase() === value.toLowerCase())
    }

    if (options.q) {
      const needle = options.q.toLowerCase()
      const searchable = def.fields.filter((f) => ['text', 'longtext', 'email', 'tag', 'location'].includes(f.type))
      rows = rows.filter((row) => searchable.some((f) => String(row[f.name] ?? '').toLowerCase().includes(needle)))
    }

    const sort = options.sort ?? 'id'
    if (def.fields.some((f) => f.name === sort) || sort === 'id') {
      rows.sort((a, b) => compare(a, b, sort))
    }
    if ((options.dir ?? 'asc') === 'desc') rows.reverse()

    return { rows: rows.slice(offset, offset + limit), total: rows.length, limit, offset }
  }

  find(entity: string, id: string): Row | undefined {
    return this.all(entity).find((row) => String(row.id) === id)
  }

  findBy(entity: string, field: string, value: string): Row | undefined {
    return this.all(entity).find((row) => String(row[field] ?? '').toLowerCase() === value.toLowerCase())
  }

  insert(entity: string, row: Omit<Row, 'id'>): Row {
    const next = (this.sequence.get(entity) ?? 0) + 1
    this.sequence.set(entity, next)
    const created: Row = { id: entity.replace(/s$/, '') + '-' + String(1000 + next), ...row }
    this.tables.set(entity, [...this.all(entity), created])
    return created
  }

  update(entity: string, id: string, patch: Row): Row | undefined {
    let updated: Row | undefined
    const rows = this.all(entity).map((row) => {
      if (String(row.id) !== id) return row
      updated = { ...row, ...patch }
      return updated
    })
    if (updated) this.tables.set(entity, rows)
    return updated
  }

  remove(entity: string, id: string): boolean {
    const rows = this.all(entity)
    const next = rows.filter((row) => String(row.id) !== id)
    this.tables.set(entity, next)
    return next.length !== rows.length
  }

  count(entity: string): number {
    return this.all(entity).length
  }
}

export interface ListResult {
  rows: Row[]
  total: number
  limit: number
  offset: number
}
`

const RULES = `import type { Row } from './types.ts'
import { ENTITIES, STATUS_FLOW, TERMINAL } from './types.ts'

export type Decision = { ok: true } | { ok: false; reason: string }

/** The declared order of a status field. Empty when the entity has none. */
export function statuses(entity: string): string[] {
  return STATUS_FLOW[entity] ?? []
}

export function isTerminal(entity: string, status: unknown): boolean {
  return typeof status === 'string' && (TERMINAL[entity] ?? []).includes(status)
}

/**
 * One step forward is always legal. A terminal status may be entered from
 * anywhere; nothing may leave a terminal status. Anything else is refused with
 * the reason, so the API can say what to do instead.
 */
export function canTransition(entity: string, from: unknown, to: unknown): Decision {
  const flow = statuses(entity)
  if (!flow.length) return { ok: false, reason: entity + ' has no status field' }
  if (typeof to !== 'string' || !flow.includes(to)) {
    return { ok: false, reason: q(to) + ' is not one of: ' + flow.join(', ') }
  }
  const current = typeof from === 'string' && flow.includes(from) ? from : flow[0]
  if (current === to) return { ok: false, reason: 'already ' + to }
  if (isTerminal(entity, current)) return { ok: false, reason: current + ' is final' }
  if (isTerminal(entity, to)) return { ok: true }
  const at = flow.indexOf(current)
  const next = flow[at + 1]
  if (to !== next) {
    return { ok: false, reason: 'the next step after ' + current + ' is ' + (next ?? 'none') }
  }
  return { ok: true }
}

/** Cross-field rules that must hold on every write. */
export function invariants(entity: string, row: Row): string[] {
  const issues: string[] = []
  const def = ENTITIES[entity]
  for (const field of def.fields) {
    const value = row[field.name]
    if (value === undefined) continue
    if (field.type === 'money' && typeof value === 'number' && value < 0) {
      issues.push(field.name + ' cannot be negative')
    }
    if (field.type === 'percent' && typeof value === 'number' && (value < 0 || value > 100)) {
      issues.push(field.name + ' must be between 0 and 100')
    }
    if (field.type === 'rating' && typeof value === 'number' && (value < 0 || value > 5)) {
      issues.push(field.name + ' must be between 0 and 5')
    }
    if (field.type === 'number' && /stock|qty|quantity|count/i.test(field.name) && typeof value === 'number' && value < 0) {
      issues.push(field.name + ' cannot be negative')
    }
  }
  return issues
}
`

function rulesConst(): string {
  return 'function q(value: unknown): string {\n  return JSON.stringify(value)\n}\n\n'
}

const VALIDATE = `import type { Row } from './types.ts'
import { ENTITIES } from './types.ts'
import { AppError } from './errors.ts'
import type { MemoryRepository } from './repository.ts'
import { invariants } from './rules.ts'

export interface Issue {
  field: string
  message: string
}

const EMAIL = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/
const DATE = /^\\d{4}-\\d{2}-\\d{2}$/

function blank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
}

function relationExists(repo: MemoryRepository, entity: string, value: string): boolean {
  const target = ENTITIES[entity]
  if (!target) return false
  return repo.all(entity).some((row) => String(row[target.primaryField] ?? '').toLowerCase() === value.toLowerCase())
}

/**
 * Rejects unknown fields, enforces required fields, coerces scalars, checks
 * enums against the compiled options, dates, emails, and foreign keys against
 * the seeded rows. Returns the clean row or throws a 422 with every issue.
 */
export function validate(
  repo: MemoryRepository,
  entity: string,
  input: Row,
  mode: 'create' | 'update',
): Row {
  const def = ENTITIES[entity]
  const issues: Issue[] = []
  const clean: Row = {}

  // A status with options defaults to the first one on create, before required
  // fields are checked, so callers can omit it and still get a valid row.
  const source: Row = { ...input }
  if (mode === 'create') {
    for (const field of def.fields) {
      if (field.type === 'status' && blank(source[field.name]) && field.options?.length) {
        source[field.name] = field.options[0]
      }
    }
  }

  for (const key of Object.keys(source)) {
    if (key === 'id') {
      issues.push({ field: 'id', message: 'id is assigned by the server' })
      continue
    }
    if (!def.fields.some((field) => field.name === key)) {
      issues.push({ field: key, message: 'not a field on ' + def.name })
    }
  }

  for (const field of def.fields) {
    const value = source[field.name]
    const missing = blank(value)
    if (missing) {
      if (mode === 'create' && field.required) {
        issues.push({ field: field.name, message: field.name + ' is required' })
      }
      continue
    }

    switch (field.type) {
      case 'number':
      case 'money':
      case 'rating':
      case 'percent': {
        const numeric = typeof value === 'number' ? value : Number(value)
        if (!Number.isFinite(numeric)) {
          issues.push({ field: field.name, message: field.name + ' must be a number' })
        } else {
          clean[field.name] = numeric
        }
        break
      }
      case 'boolean': {
        if (typeof value !== 'boolean') {
          issues.push({ field: field.name, message: field.name + ' must be true or false' })
        } else {
          clean[field.name] = value
        }
        break
      }
      case 'email': {
        const text = String(value).trim()
        if (!EMAIL.test(text)) issues.push({ field: field.name, message: field.name + ' must be an email address' })
        else clean[field.name] = text
        break
      }
      case 'phone': {
        const text = String(value).trim()
        if (text.replace(/[^0-9]/g, '').length < 7) issues.push({ field: field.name, message: field.name + ' must be a phone number' })
        else clean[field.name] = text
        break
      }
      case 'date': {
        const text = String(value).trim()
        if (!DATE.test(text) || Number.isNaN(Date.parse(text))) {
          issues.push({ field: field.name, message: field.name + ' must be a YYYY-MM-DD date' })
        } else {
          clean[field.name] = text
        }
        break
      }
      case 'status': {
        const text = String(value).trim()
        const options = field.options ?? []
        if (options.length && !options.includes(text)) {
          issues.push({ field: field.name, message: field.name + ' must be one of: ' + options.join(', ') })
        } else {
          clean[field.name] = text
        }
        break
      }
      case 'relation': {
        const text = String(value).trim()
        if (field.references && !relationExists(repo, field.references, text)) {
          issues.push({ field: field.name, message: field.name + ' must reference an existing ' + field.references.replace(/s$/, '') })
        } else {
          clean[field.name] = text
        }
        break
      }
      default: {
        const text = String(value).trim()
        if (text.length > 5000) issues.push({ field: field.name, message: field.name + ' is too long' })
        else clean[field.name] = text
      }
    }
  }

  for (const issue of invariants(entity, clean)) {
    issues.push({ field: 'invariant', message: issue })
  }

  if (issues.length) {
    throw new AppError('validation', 'The ' + def.name + ' could not be saved', { issues })
  }

  return clean
}
`

const SERVICES = `import type { Row, Role } from './types.ts'
import { ENTITIES } from './types.ts'
import { AppError } from './errors.ts'
import type { ListOptions, MemoryRepository } from './repository.ts'
import { canTransition, statuses } from './rules.ts'
import { validate } from './validate.ts'

export interface Event {
  seq: number
  at: string
  entity: string
  action: 'create' | 'update' | 'transition' | 'archive'
  id: string
  from?: string
  to?: string
  role: Role
}

function entityOrFail(entity: string): void {
  if (!ENTITIES[entity]) throw new AppError('not_found', 'No entity called ' + entity)
}

function write(role: Role): void {
  if (role === 'viewer') throw new AppError('forbidden', 'The viewer role is read-only')
}

/**
 * The business layer. Every mutation goes through here: validation, status
 * transitions, invariants, and an append-only event log that the audit page
 * and the tests both read.
 */
export class EntityService {
  private repo: MemoryRepository
  private log: Event[] = []

  constructor(repo: MemoryRepository) {
    this.repo = repo
  }

  events(): Event[] {
    return [...this.log]
  }

  list(entity: string, options: ListOptions) {
    entityOrFail(entity)
    return this.repo.list(entity, options)
  }

  get(entity: string, id: string): Row {
    entityOrFail(entity)
    const row = this.repo.find(entity, id)
    if (!row) throw new AppError('not_found', ENTITIES[entity].name + ' ' + id + ' does not exist')
    return row
  }

  create(entity: string, input: Row, role: Role): Row {
    entityOrFail(entity)
    write(role)
    const clean = validate(this.repo, entity, input, 'create')
    const row = this.repo.insert(entity, clean)
    this.record(entity, 'create', row, role)
    return row
  }

  update(entity: string, id: string, patch: Row, role: Role): Row {
    entityOrFail(entity)
    write(role)
    const current = this.get(entity, id)
    const statusKey = ENTITIES[entity].statusField ?? 'status'
    if (patch[statusKey] !== undefined && patch[statusKey] !== current[statusKey]) {
      throw new AppError('conflict', 'Use the transition endpoint to change status', {
        hint: 'POST /api/' + entity + '/' + id + '/transition',
        legal: statuses(entity),
      })
    }
    const clean = validate(this.repo, entity, patch, 'update')
    const row = this.repo.update(entity, id, clean)
    if (!row) throw new AppError('not_found', ENTITIES[entity].name + ' ' + id + ' does not exist')
    this.record(entity, 'update', row, role)
    return row
  }

  transition(entity: string, id: string, to: unknown, role: Role): Row {
    entityOrFail(entity)
    write(role)
    const current = this.get(entity, id)
    const statusKey = ENTITIES[entity].statusField ?? 'status'
    const decision = canTransition(entity, current[statusKey], to)
    if (!decision.ok) throw new AppError('conflict', decision.reason, { statuses: statuses(entity) })
    const row = this.repo.update(entity, id, { [statusKey]: String(to) })
    if (!row) throw new AppError('not_found', ENTITIES[entity].name + ' ' + id + ' does not exist')
    this.record(entity, 'transition', row, role, String(current[statusKey]), String(to))
    return row
  }

  archive(entity: string, id: string, role: Role): void {
    entityOrFail(entity)
    write(role)
    const current = this.get(entity, id)
    const removed = this.repo.remove(entity, id)
    if (!removed) throw new AppError('not_found', ENTITIES[entity].name + ' ' + id + ' does not exist')
    this.log.push({
      seq: this.log.length + 1,
      at: new Date().toISOString(),
      entity,
      action: 'archive',
      id,
      from: String(current[ENTITIES[entity].statusField ?? 'status'] ?? ''),
      role,
    })
  }

  private record(entity: string, action: Event['action'], row: Row, role: Role, from?: string, to?: string): void {
    this.log.push({
      seq: this.log.length + 1,
      at: new Date().toISOString(),
      entity,
      action,
      id: String(row.id),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      role,
    })
  }
}
`

const HTTP = `import type { ApiResponse, Row, Role } from './types.ts'
import { ENTITIES, ENTITY_IDS } from './types.ts'
import { AppError } from './errors.ts'
import { MemoryRepository } from './repository.ts'
import { EntityService } from './services.ts'
import { SEED } from './seed.ts'

export interface ApiRequest {
  method: string
  path: string
  query?: Record<string, string>
  body?: unknown
  role?: Role
}

export interface App {
  handle(request: ApiRequest): Promise<ApiResponse>
  service: EntityService
  repository: MemoryRepository
}

function asRow(body: unknown): Row {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('bad_request', 'A JSON object body is required')
  }
  return body as Row
}

function meta() {
  return {
    entities: ENTITY_IDS.map((id) => ({
      id,
      name: ENTITIES[id].name,
      plural: ENTITIES[id].plural,
      primaryField: ENTITIES[id].primaryField,
      statusField: ENTITIES[id].statusField ?? null,
      valueField: ENTITIES[id].valueField ?? null,
      fields: ENTITIES[id].fields,
    })),
    roles: ['viewer', 'member', 'admin'],
    routes: [
      'GET /api/health',
      'GET /api/meta',
      'GET /api/events',
      'GET /api/:entity',
      'POST /api/:entity',
      'GET /api/:entity/:id',
      'PATCH /api/:entity/:id',
      'POST /api/:entity/:id/transition',
      'DELETE /api/:entity/:id',
    ],
  }
}

export function createApp(seed: Record<string, Row[]> = SEED): App {
  const repository = new MemoryRepository(seed)
  const service = new EntityService(repository)

  async function handle(request: ApiRequest): Promise<ApiResponse> {
    const query = request.query ?? {}
    const role: Role = request.role ?? 'member'
    const path = request.path.replace(/\\/+$/, '') || '/'
    const parts = path.split('/').filter(Boolean)

    try {
      if (parts[0] !== 'api') throw new AppError('not_found', 'Unknown route ' + path)

      if (parts.length === 2 && parts[1] === 'health') {
        return { status: 200, body: { ok: true, entities: ENTITY_IDS.length } }
      }
      if (parts.length === 2 && parts[1] === 'meta') {
        return { status: 200, body: meta() }
      }
      if (parts.length === 2 && parts[1] === 'events') {
        return { status: 200, body: { events: service.events() } }
      }

      const entity = parts[1]
      if (!ENTITY_IDS.includes(entity)) throw new AppError('not_found', 'Unknown entity ' + entity)

      if (parts.length === 2) {
        if (request.method === 'GET') {
          const filters: Record<string, string> = {}
          for (const [key, value] of Object.entries(query)) {
            if (!['limit', 'offset', 'sort', 'dir', 'q'].includes(key)) filters[key] = value
          }
          const result = service.list(entity, {
            limit: query.limit ? Number(query.limit) : undefined,
            offset: query.offset ? Number(query.offset) : undefined,
            sort: query.sort,
            dir: query.dir === 'desc' ? 'desc' : 'asc',
            q: query.q,
            filters,
          })
          return { status: 200, body: result }
        }
        if (request.method === 'POST') {
          return { status: 201, body: service.create(entity, asRow(request.body), role) }
        }
        throw new AppError('method_not_allowed', request.method + ' is not allowed on ' + path)
      }

      const id = parts[2]
      if (!id) throw new AppError('not_found', 'Unknown route ' + path)

      if (parts.length === 4 && parts[3] === 'transition') {
        if (request.method !== 'POST') {
          throw new AppError('method_not_allowed', 'Use POST to transition ' + id)
        }
        const body = asRow(request.body)
        const row = service.transition(entity, id, body.to ?? body.status, role)
        return { status: 200, body: row }
      }

      if (parts.length === 3) {
        if (request.method === 'GET') return { status: 200, body: service.get(entity, id) }
        if (request.method === 'PATCH') return { status: 200, body: service.update(entity, id, asRow(request.body), role) }
        if (request.method === 'DELETE') {
          service.archive(entity, id, role)
          return { status: 204, body: null }
        }
        throw new AppError('method_not_allowed', request.method + ' is not allowed on ' + path)
      }

      throw new AppError('not_found', 'Unknown route ' + path)
    } catch (error) {
      if (error instanceof AppError) {
        return {
          status: error.status,
          body: { error: { code: error.code, message: error.message, details: error.details } },
        }
      }
      return {
        status: 500,
        body: { error: { code: 'internal', message: error instanceof Error ? error.message : 'Unknown error' } },
      }
    }
  }

  return { handle, service, repository }
}
`

const SERVER = `import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createApp } from './http.ts'
import type { ApiRequest } from './http.ts'
import type { Role } from './types.ts'

const app = createApp()
const port = Number(process.env.PORT ?? 4000)

function collect(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
  const url = new URL(request.url ?? '/', 'http://' + (request.headers.host ?? 'localhost'))
  const raw = await collect(request)
  let body: unknown = undefined
  if (raw.trim()) {
    try {
      body = JSON.parse(raw)
    } catch {
      body = undefined
    }
  }
  const role = (request.headers['x-user-role'] as Role | undefined) ?? 'member'
  const apiRequest: ApiRequest = {
    method: request.method ?? 'GET',
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    body,
    role,
  }
  const result = await app.handle(apiRequest)
  response.statusCode = result.status
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.setHeader('access-control-allow-origin', '*')
  response.setHeader('access-control-allow-headers', 'content-type, x-user-role')
  response.end(result.body === null ? '' : JSON.stringify(result.body))
})

server.listen(port, () => {
  console.log('API listening on http://localhost:' + port + '/api/health')
})
`

const TESTS_RULES = `import test from 'node:test'
import assert from 'node:assert/strict'
import { canTransition, invariants, isTerminal, statuses } from '../rules.ts'
import { ENTITIES } from '../types.ts'

const entity = STATUS_ENTITY
const flow: string[] = STATUS_FLOW

test('the first step exists and the flow is ordered', () => {
  assert.ok(statuses(entity).length >= 2)
  assert.equal(statuses(entity)[0], flow[0])
})

test('one step forward is allowed', () => {
  assert.deepEqual(canTransition(entity, flow[0], flow[1]), { ok: true })
})

test('skipping a step is refused with the next legal step', () => {
  const target = flow[2]
  if (!target || isTerminal(entity, target)) return
  const decision = canTransition(entity, flow[0], target)
  assert.equal(decision.ok, false)
  assert.match(decision.ok ? '' : decision.reason, /next step/i)
})

test('a terminal status cannot be left', () => {
  const terminal = flow[flow.length - 1]
  if (!isTerminal(entity, terminal)) return
  assert.equal(canTransition(entity, terminal, flow[0]).ok, false)
})

test('an unknown status is refused', () => {
  assert.equal(canTransition(entity, flow[0], 'NotAStatus').ok, false)
})

test('invariants catch negative money and out-of-range percentages', () => {
  const money = ENTITIES[entity].fields.find((f) => f.type === 'money')
  const percent = ENTITIES[entity].fields.find((f) => f.type === 'percent')
  if (money) assert.ok(invariants(entity, { [money.name]: -1 }).length === 1)
  if (percent) assert.ok(invariants(entity, { [percent.name]: 140 }).length === 1)
})
`

function apiTests(entities: Entity[]): string {
  const primary = entities[0].id
  const main = entities[0]
  const statusField = main.statusField ?? 'status'
  const options = main.fields.find((f) => f.name === main.statusField)?.options ?? []
  const first = options[0] ?? 'Open'
  const second = options[1] ?? first
  const required = main.fields.filter((f) => f.required)
  const missingField = required.find((f) => f.type === 'text')?.name ?? required[0]?.name ?? 'name'

  // Start from a real seeded row: relations, enums, dates and numbers are then
  // valid by construction, which is what a real client would do too.
  const base: Record<string, unknown> = { ...(main.rows[0] ?? {}) }
  delete base.id
  for (const field of required) {
    if (field.name === missingField) base[field.name] = 'Created by the test suite'
  }
  if (statusField in base) base[statusField] = first

  return `import test from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../http.ts'
import type { Row } from '../types.ts'

const entity = ${q(primary)}
const statusField = ${q(statusField)}
const flow: string[] = ${JSON.stringify(options)}
const payload = ${json(base)} as Row

function app() {
  return createApp()
}

test('health and meta describe the API', async () => {
  const { handle } = app()
  const health = await handle({ method: 'GET', path: '/api/health' })
  assert.equal(health.status, 200)
  const meta = await handle({ method: 'GET', path: '/api/meta' })
  assert.equal(meta.status, 200)
  const body = meta.body as { entities: { id: string }[] }
  assert.ok(body.entities.some((e) => e.id === entity))
})

test('list returns seeded rows with pagination', async () => {
  const { handle } = app()
  const response = await handle({ method: 'GET', path: '/api/' + entity, query: { limit: '2' } })
  assert.equal(response.status, 200)
  const body = response.body as { rows: Row[]; total: number; limit: number }
  assert.equal(body.rows.length, Math.min(2, body.total))
  assert.equal(body.limit, 2)
})

test('create validates and returns 201 with the seeded status', async () => {
  const { handle } = app()
  const response = await handle({ method: 'POST', path: '/api/' + entity, body: payload })
  assert.equal(response.status, 201)
  const row = response.body as Row
  assert.ok(String(row.id).length > 0)
  if (flow.length && statusField in payload) assert.equal(row[statusField], ${q(first)})
})

test('an omitted status defaults to the first step', async () => {
  if (!flow.length) return
  const { handle } = app()
  const withoutStatus: Row = { ...payload }
  delete withoutStatus[statusField]
  const response = await handle({ method: 'POST', path: '/api/' + entity, body: withoutStatus })
  assert.equal(response.status, 201)
  assert.equal((response.body as Row)[statusField], ${q(first)})
})

test('a missing required field is a 422 with the field named', async () => {
  const { handle } = app()
  const response = await handle({
    method: 'POST',
    path: '/api/' + entity,
    body: { ...payload, ${q(missingField)}: '' },
  })
  assert.equal(response.status, 422)
  const body = response.body as { error: { details: { issues: { field: string }[] } } }
  assert.ok(body.error.details.issues.some((issue) => issue.field === ${q(missingField)}))
})

test('a legal transition updates the status and logs an event', async () => {
  if (flow.length < 2) return
  const instance = app()
  const created = await instance.handle({ method: 'POST', path: '/api/' + entity, body: payload })
  const row = created.body as Row
  const moved = await instance.handle({
    method: 'POST',
    path: '/api/' + entity + '/' + row.id + '/transition',
    body: { to: ${q(second)} },
  })
  assert.equal(moved.status, 200)
  assert.equal((moved.body as Row)[statusField], ${q(second)})
  const events = await instance.handle({ method: 'GET', path: '/api/events' })
  const log = events.body as { events: { action: string }[] }
  assert.ok(log.events.some((event) => event.action === 'transition'))
})

test('an illegal transition is a 409', async () => {
  const instance = app()
  const created = await instance.handle({ method: 'POST', path: '/api/' + entity, body: payload })
  const row = created.body as Row
  const moved = await instance.handle({
    method: 'POST',
    path: '/api/' + entity + '/' + row.id + '/transition',
    body: { to: 'NotAStatus' },
  })
  assert.equal(moved.status, 409)
})

test('a PATCH cannot change status', async () => {
  if (flow.length < 2) return
  const instance = app()
  const created = await instance.handle({ method: 'POST', path: '/api/' + entity, body: payload })
  const row = created.body as Row
  const patched = await instance.handle({
    method: 'PATCH',
    path: '/api/' + entity + '/' + row.id,
    body: { [statusField]: ${q(second)} },
  })
  assert.equal(patched.status, 409)
})

test('a viewer can read but not write', async () => {
  const instance = app()
  const read = await instance.handle({ method: 'GET', path: '/api/' + entity, role: 'viewer' })
  assert.equal(read.status, 200)
  const write = await instance.handle({ method: 'POST', path: '/api/' + entity, body: payload, role: 'viewer' })
  assert.equal(write.status, 403)
})

test('unknown ids are 404 and deletes are 204', async () => {
  const instance = app()
  const missing = await instance.handle({ method: 'GET', path: '/api/' + entity + '/does-not-exist' })
  assert.equal(missing.status, 404)
  const created = await instance.handle({ method: 'POST', path: '/api/' + entity, body: payload })
  const row = created.body as Row
  const removed = await instance.handle({ method: 'DELETE', path: '/api/' + entity + '/' + row.id })
  assert.equal(removed.status, 204)
  const gone = await instance.handle({ method: 'GET', path: '/api/' + entity + '/' + row.id })
  assert.equal(gone.status, 404)
})

test('unknown entities are 404 rather than 500', async () => {
  const { handle } = app()
  const response = await handle({ method: 'GET', path: '/api/not-an-entity' })
  assert.equal(response.status, 404)
})

test('an empty list is still a valid response', async () => {
  const { handle } = app()
  const response = await handle({ method: 'GET', path: '/api/' + entity, query: { offset: '10000' } })
  assert.equal(response.status, 200)
  const body = response.body as { rows: Row[]; total: number }
  assert.equal(body.rows.length, 0)
  assert.ok(body.total >= 0)
})
`
}

/* --------------------------------------------------------------------------
   product-specific files
   -------------------------------------------------------------------------- */

export function buildBackend(project: Project): PackageFile[] {
  const entities = project.data.entities
  const files: PackageFile[] = []
  const push = (path: string, content: string) => files.push({ path, content: content.endsWith('\n') ? content : content + '\n' })

  const meta: Record<string, unknown> = {}
  for (const entity of entities) {
    meta[entity.id] = {
      id: entity.id,
      name: entity.name,
      plural: entity.plural,
      primaryField: entity.primaryField,
      ...(entity.statusField ? { statusField: entity.statusField } : {}),
      ...(entity.valueField ? { valueField: entity.valueField } : {}),
      fields: JSON.parse(JSON.stringify(fieldsMeta(entity))),
    }
  }

  const flows: Record<string, string[]> = {}
  const terminals: Record<string, string[]> = {}
  for (const entity of entities) {
    if (!entity.statusField) continue
    const options = entity.fields.find((f) => f.name === entity.statusField)?.options ?? []
    if (options.length) {
      flows[entity.id] = options
      const end = terminal(entity)
      if (end.length) terminals[entity.id] = end
    }
  }

  const seed: Record<string, unknown[]> = {}
  for (const entity of entities) seed[entity.id] = entity.rows

  push(
    'server/src/types.ts',
    `${TYPES}
export const ENTITIES: Record<string, EntityDef> = ${json(meta)}

export const ENTITY_IDS = Object.keys(ENTITIES)

/** The declared order of each status field. */
export const STATUS_FLOW: Record<string, string[]> = ${json(flows)}

/** Statuses nothing can leave. */
export const TERMINAL: Record<string, string[]> = ${json(terminals)}
`,
  )

  push('server/src/errors.ts', ERRORS)
  push('server/src/repository.ts', REPOSITORY)
  push('server/src/rules.ts', rulesConst() + RULES)
  push('server/src/validate.ts', VALIDATE)
  push('server/src/services.ts', SERVICES)
  push('server/src/http.ts', HTTP)
  push('server/src/server.ts', SERVER)
  push('server/src/seed.ts', `import type { Row } from './types.ts'\n\n/** Seeded from the section sample data, so the API starts with real rows. */\nexport const SEED: Record<string, Row[]> = ${json(seed)}\n`)

  push(
    'server/src/tests/rules.test.ts',
    TESTS_RULES.replace('STATUS_ENTITY', q(entities[0].id)).replace('STATUS_FLOW', JSON.stringify(flows[entities[0].id] ?? ['Open', 'Closed'])),
  )
  push('server/src/tests/api.test.ts', apiTests(entities))

  push(
    'server/package.json',
    `${json({
      name: `${slug(project.name)}-api`,
      private: true,
      type: 'module',
      scripts: {
        dev: 'node --experimental-strip-types src/server.ts',
        test: 'node --experimental-strip-types --test src/tests/rules.test.ts src/tests/api.test.ts',
      },
      engines: { node: '>=22.6' },
    })}
`,
  )

  push(
    'server/tsconfig.json',
    `${json({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        verbatimModuleSyntax: true,
        strict: true,
        allowImportingTsExtensions: true,
        noEmit: true,
        skipLibCheck: true,
        types: ['node'],
      },
      include: ['src'],
    })}
`,
  )

  push(
    'server/README.md',
    `# ${project.name} — API

A working backend for the exported UI. No dependencies: Node's own \`http\` server,
Node's own test runner, and the seed rows from the sections.

\`\`\`bash
cd server
npm run dev     # http://localhost:4000/api/health
npm test        # domain rules + API behaviour
\`\`\`

The four layers, in the order a request travels through them:

1. **http.ts** — routing, roles, status codes. Framework-free and callable from a test.
2. **services.ts** — the business layer: validation, status transitions, the event log.
3. **rules.ts** — the status machine and cross-field invariants.
4. **repository.ts** — an in-memory store with list/filter/sort/paginate. Swap this
   one class for Postgres and nothing above it changes.

## Roles

\`x-user-role: viewer | member | admin\` (default \`member\`). Viewers are read-only;
members and admins write. Everything else is in [API.md](./API.md).

## Endpoints

| Method | Path | Returns |
| --- | --- | --- |
| GET | \`/api/health\` | \`{ ok, entities }\` |
| GET | \`/api/meta\` | entities, fields, roles, routes |
| GET | \`/api/events\` | the append-only mutation log |
| GET | \`/api/:entity\` | \`{ rows, total, limit, offset }\` — \`q\`, \`limit\`, \`offset\`, \`sort\`, \`dir\`, and field filters |
| POST | \`/api/:entity\` | 201 with the created row |
| GET | \`/api/:entity/:id\` | the row, or 404 |
| PATCH | \`/api/:entity/:id\` | the updated row (status changes are refused with 409) |
| POST | \`/api/:entity/:id/transition\` | \`{ to: "<status>" }\`, or 409 with the legal next step |
| DELETE | \`/api/:entity/:id\` | 204 |

## Why the status field is not a PATCH

A status is a journey, not a column. PATCH refuses to change it and points at the
transition endpoint, which only allows one step forward (or a terminal status).
That is where the domain rules live, so they cannot be bypassed by a form.
`,
  )

  push(
    'server/API.md',
    `# API — ${project.name}

Base URL \`http://localhost:4000\`. All bodies are JSON. Errors are always:

\`\`\`json
{ "error": { "code": "validation", "message": "The ${entities[0].name} could not be saved", "details": { "issues": [] } } }
\`\`\`

| Code | Status | When |
| --- | --- | --- |
| \`validation\` | 422 | a field is missing, not coercible, not an option, or references nothing |
| \`conflict\` | 409 | a status transition is not legal, or a PATCH tries to change status |
| \`forbidden\` | 403 | the viewer role writes |
| \`not_found\` | 404 | unknown entity, unknown id, unknown route |
| \`method_not_allowed\` | 405 | the route exists, the verb does not |
| \`bad_request\` | 400 | the body is not an object |

## Entities

| Entity | Collection | Statuses | Required fields | Seed rows |
| --- | --- | --- | --- | --- |
${entityTable(project)}

## Examples

\`\`\`bash
curl localhost:4000/api/${entities[0].id}?limit=2
curl -X POST localhost:4000/api/${entities[0].id} \\
  -H 'content-type: application/json' \\
  -H 'x-user-role: member' \\
  -d '${JSON.stringify(Object.fromEntries(entities[0].fields.filter((f) => f.required).map((f) => [f.name, f.type === 'number' || f.type === 'money' ? 10 : String(f.example ?? 'example')])))}'
curl -X POST localhost:4000/api/${entities[0].id}/<id>/transition \\
  -H 'content-type: application/json' -d '{"to":"${(flows[entities[0].id] ?? ['Open'])[1] ?? 'Open'}"}'
\`\`\`
`,
  )

  // Business logic, written for a human and for the agent that continues the build.
  const ruleRows = entities
    .map((entity) => {
      const flow = flows[entity.id] ?? []
      const end = terminals[entity.id] ?? []
      const required = entity.fields.filter((f) => f.required).map((f) => `\`${f.name}\``).join(', ')
      return `### ${entity.name}

- **Status journey:** ${flow.length ? flow.join(' → ') : 'no status field'}
- **Terminal:** ${end.length ? end.join(', ') : 'none — every status can move forward'}
- **Required:** ${required || 'none'}
- **Relation:** ${entity.fields.filter((f) => f.references).map((f) => `\`${f.name}\` → \`${f.references}\``).join(', ') || 'none'}
- **Value field:** ${entity.valueField ? `\`${entity.valueField}\`` : 'none'}
- **Rules:** a status moves one step forward, or into a terminal status, never backwards; ${entity.fields.filter((f) => f.type === 'money').map((f) => `\`${f.name}\` ≥ 0`).join(', ') || 'no money fields'}; unknown fields are rejected.
`
    })
    .join('\n')

  push(
    'business-logic.md',
    `# Business logic — ${project.name}

The rules below are generated from the compiled data shape, so the API, the tests
and the screens agree. Each rule has an endpoint and a test that proves it.

## What the domain guarantees

1. **Every write is validated** against the compiled fields: required, type, enum
   options, date format, email shape, and foreign keys against real rows.
2. **Status is a journey.** A record moves one step forward, or into a terminal
   status. It never moves backwards and never skips a step. PATCH refuses status
   changes entirely and points at the transition endpoint.
3. **Invariants hold on every write.** Money is never negative, percentages stay
   inside 0–100, ratings inside 0–5, stock counts inside ≥ 0.
4. **Writes are roles.** \`viewer\` reads, \`member\` and \`admin\` write.
5. **Every mutation is logged** — entity, action, id, from, to, role — and exposed
   at \`GET /api/events\` for the audit trail.
6. **Unknown things are 404s**, not 500s.

## Per entity

${ruleRows}
## Tests

\`server/src/tests/rules.test.ts\` proves the state machine and the invariants.
\`server/src/tests/api.test.ts\` drives the HTTP layer: pagination, creation,
validation failures with the field named, a legal transition, an illegal one, a
read-only role, 404s and deletes. \`npm test\` in \`server/\` runs both on Node's
built-in runner, with no dependencies to install.
`,
  )

  // The frontend adapter: the same DataLayer interface, talking to the API.
  const adapterLines: string[] = []
  adapterLines.push(`// Generated by ProdOps — the real adapter.
// Implements the same DataLayer interface as the mock, so the UI is untouched:
// swap the import at the edge of the app and the screens now read the API.
import type { DataLayer } from './repository'
import type { ListFilter } from './types'
`)
  const names = entities.map((e) => e.name)
  adapterLines.push(`import type { ${names.join(', ')} } from './types'\n`)
  adapterLines.push(`
const BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:4000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(BASE + path, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-user-role': 'member', ...(init?.headers ?? {}) },
  })
  if (response.status === 204) return undefined as T
  const body = await response.json()
  if (!response.ok) {
    const error = body?.error ?? {}
    throw new Error(error.message ?? 'Request failed: ' + response.status)
  }
  return body as T
}

function query(filter?: ListFilter): string {
  const params = new URLSearchParams()
  if (!filter) return ''
  if (filter.status) params.set('status', filter.status)
  if (filter.search) params.set('q', filter.search)
  if (filter.limit) params.set('limit', String(filter.limit))
  const text = params.toString()
  return text ? '?' + text : ''
}
`)
  adapterLines.push('export const api: DataLayer = {')
  for (const entity of entities) {
    const key = entity.plural.toLowerCase().replace(/[^a-z0-9]+/g, '')
    adapterLines.push(`  ${key}: {
    list: (filter) => request<{ rows: ${entity.name}[]; total: number }>('/api/${entity.id}' + query(filter)),
    byId: async (id) => request<${entity.name}[]>('/api/${entity.id}?limit=1&q=' + encodeURIComponent(id)).then((r) => r.rows[0] ?? null),
    create: (input) => request<${entity.name}>('/api/${entity.id}', { method: 'POST', body: JSON.stringify(input) }),
    update: (id, patch) => request<${entity.name}>('/api/${entity.id}/' + id, { method: 'PATCH', body: JSON.stringify(patch) }),
    archive: async (id) => {
      await request<void>('/api/${entity.id}/' + id, { method: 'DELETE' })
    },
  },`)
  }
  adapterLines.push('}\n')
  push('src/data/http-adapter.ts', adapterLines.join('\n'))

  return files
}
