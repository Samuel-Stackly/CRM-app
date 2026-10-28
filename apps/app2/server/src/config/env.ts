import 'dotenv/config'
import { z } from 'zod'

/**
 * Environment contract.
 *
 * Parsed once at startup; the process exits if anything is missing or
 * malformed. That is what enforces the "no fallback secrets" rule — there is no
 * `process.env.JWT_SECRET || 'dev'` anywhere in the codebase, because the app
 * refuses to boot without a real value.
 *
 * MONGO_URI and JWT_SECRET are required as of the database increment: the
 * server opens a connection and issues tokens on startup, so a missing value is
 * a misconfiguration to surface immediately rather than a 500 on first request.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // PORT is injected by scripts/run.mjs from apps.config.json when started
  // through the root scripts, and falls back to the app's own default.
  PORT: z.coerce
    .number()
    .int('PORT must be an integer')
    .min(1, 'PORT must be between 1 and 65535')
    .max(65535, 'PORT must be between 1 and 65535')
    .default(5001),

  /** May list several origins separated by commas (production plus previews). */
  CLIENT_URL: z
    .string()
    .min(1, 'CLIENT_URL is required')
    .default('http://localhost:5174'),

  /**
   * Accept browser requests from any origin, ignoring CLIENT_URL.
   *
   * Defaults to true by request, so a dev server that drifts to another port
   * still works. Because the auth cookie makes every call credentialed, this
   * cannot be served as `Access-Control-Allow-Origin: *` — the origin is
   * reflected instead, which means any site a signed-in admin visits can call
   * this API with their cookie and read the response. Set it to false in
   * production to restore the CLIENT_URL allowlist.
   */
  CORS_ALLOW_ALL: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),

  /** MongoDB connection string. Carries credentials — never logged. */
  MONGO_URI: z
    // The message is set on the type as well as the length: a missing variable
    // is `undefined`, which never reaches the .min() check, so without this it
    // would report Zod's generic "expected string, received undefined".
    .string({ message: 'MONGO_URI is required' })
    .min(1, 'MONGO_URI is required'),

  JWT_SECRET: z
    .string({ message: 'JWT_SECRET is required and must be at least 16 characters' })
    .min(16, 'JWT_SECRET is required and must be at least 16 characters'),

  /** Token lifetime, as an `ms`-style duration string (e.g. 7d, 12h). */
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN must look like 7d, 12h, 30m or 60s')
    .default('7d'),
})

export type Env = z.infer<typeof envSchema>

/**
 * Treats an empty variable as an absent one.
 *
 * `.optional()` only covers a key that is missing entirely. A key present but
 * blank — which is what copying .env.example produces, and what a hosting
 * dashboard produces for a field left empty — still reaches the validator and
 * fails its `min()` check, so the process would exit on a value nobody set.
 */
function withoutBlanks(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = {}
  for (const [key, value] of Object.entries(source)) {
    if (value !== '') result[key] = value
  }
  return result
}

function loadEnv(): Env {
  const parsed = envSchema.safeParse(withoutBlanks(process.env))

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
