import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Scan only the workspace's own entry. The repo also holds the mirrored
    // marketing site under site/, whose prebuilt /vite/assets bundles import
    // packages that are not installed here (milkdown etc.) — scanning them
    // made every dev start fail the dependency scan and skip pre-bundling.
    entries: ['index.html'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    cors: true,
  },
  preview: { host: '0.0.0.0', allowedHosts: true },
})
