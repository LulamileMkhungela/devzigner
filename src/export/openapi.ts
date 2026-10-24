/**
 * The API contract for the generated backend.
 *
 * `openapi.json` is the machine-readable half of `server/API.md`: the same
 * entities, the same status journeys, the same roles and error codes. It is
 * generated from the compiled data shape, so a client generated from it and the
 * reference server cannot disagree about what a field is called.
 */
import type { Entity, Project } from '../types'
import type { PackageFile } from './package'

export interface ApiRoute {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  summary: string
  roles: string
}

export function apiRoutes(project: Project): ApiRoute[] {
  const routes: ApiRoute[] = [
    { method: 'GET', path: '/api/health', summary: 'Liveness and entity count', roles: 'any' },
    { method: 'GET', path: '/api/meta', summary: 'Entities, fields, roles and routes', roles: 'any' },
    { method: 'GET', path: '/api/events', summary: 'Append-only mutation log', roles: 'any' },
  ]
  for (const entity of project.data.entities) {
    routes.push(
      { method: 'GET', path: `/api/${entity.id}`, summary: `List ${entity.plural.toLowerCase()} (q, limit, offset, sort, dir, field filters)`, roles: 'any' },
      { method: 'POST', path: `/api/${entity.id}`, summary: `Create a ${entity.name.toLowerCase()}`, roles: 'member, admin' },
      { method: 'GET', path: `/api/${entity.id}/:id`, summary: `Read one ${entity.name.toLowerCase()}`, roles: 'any' },
      { method: 'PATCH', path: `/api/${entity.id}/:id`, summary: `Update a ${entity.name.toLowerCase()} (status changes are refused)`, roles: 'member, admin' },
    )
    if (entity.statusField) {
      routes.push({
        method: 'POST',
        path: `/api/${entity.id}/:id/transition`,
        summary: `Move a ${entity.name.toLowerCase()} one step along its status journey`,
        roles: 'member, admin',
      })
    }
    routes.push({ method: 'DELETE', path: `/api/${entity.id}/:id`, summary: `Archive a ${entity.name.toLowerCase()}`, roles: 'member, admin' })
  }
  return routes
}

function schemaFor(entity: Entity): Record<string, unknown> {
  const properties: Record<string, unknown> = { id: { type: 'string' } }
  const required: string[] = []
  for (const field of entity.fields) {
    const numeric = ['number', 'money', 'rating', 'percent'].includes(field.type)
    properties[field.name] = {
      type: field.type === 'boolean' ? 'boolean' : numeric ? 'number' : 'string',
      ...(field.options ? { enum: field.options } : {}),
      ...(field.type === 'date' ? { format: 'date' } : {}),
      ...(field.type === 'email' ? { format: 'email' } : {}),
      ...(field.type === 'money' ? { minimum: 0 } : {}),
      ...(field.type === 'percent' ? { minimum: 0, maximum: 100 } : {}),
      ...(field.type === 'rating' ? { minimum: 0, maximum: 5 } : {}),
      description: field.note,
    }
    if (field.required) required.push(field.name)
  }
  return { type: 'object', properties, required }
}

export function buildOpenApi(project: Project): PackageFile {
  const entities = project.data.entities
  const paths: Record<string, unknown> = {
    '/api/health': { get: { summary: 'Liveness', responses: { '200': { description: 'OK' } } } },
    '/api/meta': { get: { summary: 'API metadata', responses: { '200': { description: 'OK' } } } },
    '/api/events': { get: { summary: 'Mutation log', responses: { '200': { description: 'OK' } } } },
  }

  const errorSchema = {
    type: 'object',
    properties: {
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', enum: ['validation', 'conflict', 'forbidden', 'not_found', 'method_not_allowed', 'bad_request'] },
          message: { type: 'string' },
          details: { type: 'object', nullable: true },
        },
        required: ['code', 'message'],
      },
    },
  }

  for (const entity of entities) {
    const name = entity.name
    paths[`/api/${entity.id}`] = {
      get: {
        summary: `List ${entity.plural}`,
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0 } },
          ...(entity.statusField
            ? [{ name: entity.statusField, in: 'query', schema: { type: 'string', enum: entity.fields.find((f) => f.name === entity.statusField)?.options ?? [] } }]
            : []),
        ],
        responses: {
          '200': {
            description: 'A page of rows',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    rows: { type: 'array', items: { $ref: `#/components/schemas/${name}` } },
                    total: { type: 'integer' },
                    limit: { type: 'integer' },
                    offset: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: `Create ${name}`,
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}Input` } } } },
        responses: {
          '201': { description: 'Created', content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}` } } } },
          '422': { description: 'Validation failed', content: { 'application/json': { schema: errorSchema } } },
          '403': { description: 'Viewer role', content: { 'application/json': { schema: errorSchema } } },
        },
      },
    }
    paths[`/api/${entity.id}/{id}`] = {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: {
        summary: `Read ${name}`,
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}` } } } }, '404': { description: 'Not found' } },
      },
      patch: {
        summary: `Update ${name}`,
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}Input` } } } },
        responses: {
          '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}` } } } },
          '409': { description: 'Status changes must use /transition', content: { 'application/json': { schema: errorSchema } } },
          '422': { description: 'Validation failed', content: { 'application/json': { schema: errorSchema } } },
        },
      },
      delete: { summary: `Archive ${name}`, responses: { '204': { description: 'Archived' }, '404': { description: 'Not found' } } },
    }
    if (entity.statusField) {
      const flow = entity.fields.find((f) => f.name === entity.statusField)?.options ?? []
      paths[`/api/${entity.id}/{id}/transition`] = {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        post: {
          summary: `Transition ${name}`,
          description: flow.length ? `One step forward along ${flow.join(' → ')}, or into a terminal status.` : undefined,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { to: { type: 'string', enum: flow } }, required: ['to'] } } },
          },
          responses: {
            '200': { description: 'New status', content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}` } } } },
            '409': { description: 'Illegal transition', content: { 'application/json': { schema: errorSchema } } },
          },
        },
      }
    }
  }

  const schemas: Record<string, unknown> = {}
  for (const entity of entities) {
    schemas[entity.name] = schemaFor(entity)
    const inputProperties = { ...(schemas[entity.name] as { properties: Record<string, unknown> }).properties }
    delete (inputProperties as Record<string, unknown>).id
    schemas[`${entity.name}Input`] = {
      type: 'object',
      properties: inputProperties,
      required: (schemas[entity.name] as { required: string[] }).required,
    }
  }

  const document = {
    openapi: '3.1.0',
    info: {
      title: `${project.name} API`,
      version: '1.0.0',
      description: `Business rules, endpoints and tests for ${project.name}. The reference implementation is in server/. See API.md and business-logic.md.`,
    },
    servers: [{ url: 'http://localhost:4000' }],
    security: [{ roleHeader: [] }],
    paths,
    components: {
      securitySchemes: {
        roleHeader: { type: 'apiKey', in: 'header', name: 'x-user-role', description: 'viewer | member | admin (default member)' },
      },
      schemas,
    },
    'x-status-flows': Object.fromEntries(
      entities
        .filter((entity) => entity.statusField)
        .map((entity) => [
          entity.id,
          {
            field: entity.statusField,
            statuses: entity.fields.find((f) => f.name === entity.statusField)?.options ?? [],
            rule: 'one step forward, or a terminal status; never backwards, never skipping',
          },
        ]),
    ),
  }

  return { path: 'openapi.json', content: JSON.stringify(document, null, 2) + '\n' }
}

export function apiDoc(project: Project): PackageFile {
  const routes = apiRoutes(project)
  return {
    path: 'api/README.md',
    content: `# API quick reference

${routes.length} endpoints for ${project.data.entities.length} entities. The full
contract is \`openapi.json\` (OpenAPI 3.1); the prose version is \`server/API.md\`;
the implementation is \`server/\`.

| Method | Path | What it does | Who |
| --- | --- | --- | --- |
${routes.map((route) => `| ${route.method} | \`${route.path}\` | ${route.summary} | ${route.roles} |`).join('\n')}

## Roles

Send \`x-user-role: viewer | member | admin\`. Viewers read; members and admins write.

## Errors

\`\`\`json
{ "error": { "code": "validation", "message": "The Vendor could not be saved", "details": { "issues": [{ "field": "email", "message": "email must be an email address" }] } } }
\`\`\`

| Code | Status |
| --- | --- |
| \`validation\` | 422 |
| \`conflict\` | 409 |
| \`forbidden\` | 403 |
| \`not_found\` | 404 |
| \`method_not_allowed\` | 405 |

## Generating a client

\`\`\`bash
npx openapi-typescript openapi.json -o src/api-types.ts
\`\`\`

The frontend adapter in \`src/data/http-adapter.ts\` already implements the
\`DataLayer\` interface the UI imports, so the screens do not know which one they have.
`,
  }
}

export function buildApi(project: Project): PackageFile[] {
  return [buildOpenApi(project), apiDoc(project)]
}
