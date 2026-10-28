import 'dotenv/config'
import { z } from 'zod'

/**
 * Environment contract.
 *
 * Parsed once at startup. The process exits if anything is missing or malformed,
 * which is what enforces the "no fallback secrets" rule: there is no
 * `process.env.JWT_SECRET || 'dev'` anywhere, because the app refuses to boot
 * without a real value.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce
    .number()
    .int('PORT must be an integer')
    .min(1, 'PORT must be between 1 and 65535')
    .max(65535, 'PORT must be between 1 and 65535')
    .default(5000),

  MONGO_URI: z
    .string()
    .min(1, 'MONGO_URI is required'),

  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters'),

  /** Token lifetime, as an `ms`-style duration string (e.g. 7d, 12h). */
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN must look like 7d, 12h, 30m or 60s')
    .default('7d'),

  CLIENT_URL: z
    .string()
    .url('CLIENT_URL must be a valid URL, e.g. http://localhost:5173')
    .default('http://localhost:5173'),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')

    // Never log the values themselves, only which variables are wrong.
    console.error(`Invalid environment configuration:\n${details}`)
    process.exit(1)
  }

  return parsed.data
}

export const env = loadEnv()

export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'
