import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// VITE_PORT is injected by scripts/run.mjs from apps.config.json, so each app
// keeps its own dev port and the two can run side by side.
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.VITE_PORT) || 5173,
  },
})
