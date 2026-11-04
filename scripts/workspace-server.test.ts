import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createWorkspaceServer } from '../server/workspace-server'
import { createServer as createViteServer } from 'vite'

test('workspace is the only site served at the root and the previous workspace URL still works', async () => {
  const dist = await mkdtemp(join(tmpdir(), 'prodops-workspace-'))
  await mkdir(join(dist, 'assets')); await mkdir(join(dist, 'site'))
  await writeFile(join(dist, 'index.html'), '<html><title>ProdOps workspace</title></html>')
  await writeFile(join(dist, 'assets', 'app.js'), 'workspace asset')
  await writeFile(join(dist, 'favicon.svg'), '<svg/>')
  await writeFile(join(dist, 'site', 'old.png'), 'old marketing image')
  await writeFile(join(dist, 'old.html'), 'old marketing page')
  const server = createWorkspaceServer(dist, {})
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const address = server.address(); assert.ok(address && typeof address !== 'string'); const base = `http://127.0.0.1:${address.port}`
    for (const path of ['/', '/index.html', '/workspace', '/workspace/']) {
      const response = await fetch(base + path); assert.equal(response.status, 200, path); assert.match(await response.text(), /ProdOps workspace/)
    }
    for (const path of ['/assets/app.js', '/workspace/assets/app.js', '/favicon.svg']) assert.equal((await fetch(base + path)).status, 200, path)
    for (const path of ['/old.html', '/tools.html', '/about.html', '/site/old.png', '/site/index.html', '/workspace/old.html']) assert.equal((await fetch(base + path)).status, 404, path)
    const head = await fetch(base, {method:'HEAD'}); assert.equal(head.status, 200); assert.equal(await head.text(), '')
    assert.equal((await fetch(base, {method:'POST'})).status, 405)
    assert.deepEqual(await (await fetch(base + '/api/studio')).json(), {configured:false, provider:null})
    assert.deepEqual(await (await fetch(base + '/api/figma-reference')).json(), {configured:false})
  } finally { await new Promise<void>(resolve => server.close(()=>resolve())); await rm(dist, {recursive:true, force:true}) }
})

test('Vite development server opens the workspace and does not serve captured site pages', async () => {
  const vite = await createViteServer({server:{host:'127.0.0.1', port:0}, optimizeDeps:{noDiscovery:true, entries:[]}, logLevel:'error'})
  try {
    await vite.listen()
    const address=vite.httpServer?.address(); assert.ok(address && typeof address !== 'string'); const base=`http://127.0.0.1:${address.port}`
    assert.match(await (await fetch(base + '/')).text(), /ProdOps — product workspace/)
    assert.match(await (await fetch(base + '/workspace/', {headers:{Accept:'text/html'}})).text(), /ProdOps — product workspace/)
    assert.equal((await fetch(base + '/about.html')).status,404)
    assert.equal((await fetch(base + '/site/index.html')).status,404)
    assert.equal((await fetch(base + '/@vite/client')).status,200)
  } finally { await vite.close() }
})
