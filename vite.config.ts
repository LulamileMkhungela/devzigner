import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { assistantPlugin } from './server/assistant'
import { studioPlugin } from './server/studio'

export default defineConfig({
  plugins: [react(), assistantPlugin(), studioPlugin()],
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
