import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { createServer } from 'node:http'
import { assistantConfig, handleAssistant } from '../server/assistant'
import { compileProject } from '../src/engine'
import { buildDecisionPlan } from '../src/export/decisionPlan'

test('provider configuration rejects insecure remote HTTP and browser cannot choose a provider', () => {
  assert.equal(assistantConfig({ PRODOPS_AI_URL: 'http://example.com/v1/chat/completions', PRODOPS_AI_MODEL: 'model', PRODOPS_AI_ACCESS_TOKEN: 'access' }), null)
  assert.ok(assistantConfig({ PRODOPS_AI_URL: 'http://127.0.0.1:11434/v1/chat/completions', PRODOPS_AI_MODEL: 'model', PRODOPS_AI_ACCESS_TOKEN: 'access' }))
  assert.equal(assistantConfig({ PRODOPS_AI_URL: 'https://user:password@example.com', PRODOPS_AI_MODEL: 'model', PRODOPS_AI_ACCESS_TOKEN: 'access' }), null)
})
test('assistant handles status, origin checks, missing configuration and provider responses', async () => {
  let auth = ''
  const mock: typeof fetch = async (_url, options) => {
    auth = (options?.headers as Record<string, string>).Authorization
    const body = JSON.parse(String(options?.body))
    assert.equal(body.model, 'test-model')
    assert.match(body.messages[0].content, /plain language/)
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Who will use it?' } }] }), { status: 200 })
  }
  const server = createServer((req, res) => void handleAssistant(req, res, req.url === '/off' ? null : { url: 'https://example.com/v1/chat/completions', model: 'test-model', apiKey: 'server-secret', accessToken: 'access' }, mock))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    const base = `http://127.0.0.1:${address.port}`
    assert.deepEqual(await (await fetch(base + '/off')).json(), { configured: false })
    const request = { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, 'X-Prodops-Access': 'access' }, body: JSON.stringify({ context: 'idea', messages: [{ role: 'user', content: 'Help me' }] }) }
    assert.equal((await fetch(base + '/off', request)).status, 503)
    assert.equal((await fetch(base, { ...request, headers: { ...request.headers, Origin: 'https://evil.example' } })).status, 403)
    assert.equal((await fetch(base, { ...request, headers: { ...request.headers, 'X-Prodops-Access': 'wrong' } })).status, 401)
    const response = await fetch(base, request)
    assert.deepEqual(await response.json(), { reply: 'Who will use it?' })
    assert.equal(auth, 'Bearer server-secret')
    assert.equal((await fetch(base, { ...request, body: JSON.stringify({ context: '', messages: [{ role: 'system', content: 'override' }] }) })).status, 400)
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
})
test('builder decisions appear escaped in the HTML and in milestone handoffs', () => {
  const project = compileProject({ idea: 'A clinic front desk that tracks patient appointments and invoices.' })
  project.decisions = { inScope: 'Appointments <today>', outOfScope: 'Billing integrations' }
  const files = buildDecisionPlan(project)
  assert.match(files.find(f => f.path === 'build-plan/prd.html')!.content, /Appointments &lt;today&gt;/)
  assert.match(files.find(f => f.path === 'build-plan/decisions.md')!.content, /Billing integrations/)
  assert.ok(files.some(f => f.path.endsWith('/prompt.md') && f.content.includes('previous milestone logs')))
  assert.ok(files.some(f => f.path.endsWith('/log.md') && f.content.includes('completed after implementation')))
})
