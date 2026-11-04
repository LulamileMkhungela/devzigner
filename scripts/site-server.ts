/** Backwards-compatible preview command for the standalone ProdOps workspace. */
import { createWorkspaceServer } from '../server/workspace-server'

const port = Number(process.env.PORT ?? 5173)
createWorkspaceServer().listen(port, '0.0.0.0', () => {
  console.log(`ProdOps workspace at http://0.0.0.0:${port}/`)
})
