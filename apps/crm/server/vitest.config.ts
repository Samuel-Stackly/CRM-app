import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/__tests__/env.setup.ts', 'src/__tests__/setup.ts'],
    // The in-memory MongoDB binary can take a while to start on a cold run.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // One in-memory database for the whole suite rather than one per worker.
    pool: 'forks',
    fileParallelism: false,
  },
})
