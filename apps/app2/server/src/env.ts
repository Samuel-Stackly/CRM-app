import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // PORT is injected by scripts/run.mjs from apps.config.json when started
  // through the root scripts, and falls back to the app's own default.
  PORT: z.coerce.number().int().positive().default(5001),
  CLIENT_URL: z.string().url().default('http://localhost:5174'),
})

export const env = envSchema.parse(process.env)
