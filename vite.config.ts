import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { assistantPlugin } from './server/assistant'
import { studioPlugin } from './server/studio'

// Vite can otherwise serve old captured HTML files directly from the repository root.
function workspaceOnly(): Plugin {
  return {
    name: 'workspace-only',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        let path: string
        try { path = decodeURIComponent(new URL(req.url ?? '/', 'http://workspace.local').pathname) }
        catch { res.statusCode = 400; return res.end('Invalid request.') }
        if (/^\/site(?:\/|$)/i.test(path) || (path.toLowerCase().endsWith('.html') && path !== '/index.html')) {
          res.statusCode = 404; return res.end('Not found.')
        }
        next()
      })
    },
  }
}
export default defineConfig({
  plugins: [workspaceOnly(), react(), assistantPlugin(), studioPlugin()],
  optimizeDeps: { entries: ['index.html'] },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    cors: true,
  },
  preview: { host: '0.0.0.0', allowedHosts: true },
})
