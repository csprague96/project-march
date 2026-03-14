import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Generates a unique cache key on every build so the service worker
// invalidates stale app shell assets (prevents white screen after deploy).
const BUILD_TIMESTAMP = Date.now()

export default defineConfig({
  plugins: [react()],
  define: {
    __SW_CACHE_VERSION__: JSON.stringify(`triage-shell-${BUILD_TIMESTAMP}`),
  },
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
})
