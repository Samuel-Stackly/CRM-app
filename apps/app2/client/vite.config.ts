/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// VITE_PORT is injected by scripts/run.mjs from apps.config.json, so each app
// keeps its own dev port and the two can run side by side.
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: Number(process.env.VITE_PORT) || 5174,
    // Fail instead of silently moving to the next free port. The API allowlists
    // this exact origin, so a dev server that drifts to 5175 because an old one
    // is still running gets a 403 on every request — which surfaces in the
    // browser as a CORS error with nothing obviously wrong in the config.
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/__tests__/setup.ts'],
  },
})
