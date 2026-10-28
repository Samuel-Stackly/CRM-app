import { z } from 'zod'

/**
 * Validation rules for the authentication endpoints.
 *
 * Every schema is `.strict()`, so an unknown key is a 400 rather than being
 * silently dropped. That is what prevents a client from smuggling fields such
 * as `passwordHash`, `_id` or `role` into a create payload.
 */

/** Minimum password length. See the note in docs/API.md (Q2) — RAW_DOC does not specify one. */
export const PASSWORD_MIN_LENGTH = 8
/** bcrypt silently truncates beyond 72 bytes, so longer input is rejected rather than quietly cut. */
export const PASSWORD_MAX_LENGTH = 72

const nameField = z
  .string({ error: 'Name is required' })
  .trim()
  .min(1, 'Name is required')
  .max(120, 'Name must be at most 120 characters')

/**
 * Email is trimmed and lowercased *before* format validation, so that
 * "  Ada@Example.COM  " normalises to "ada@example.com" rather than failing.
 * Validating first would reject the surrounding whitespace.
 *
 * The same pipeline is used for register and login, so a lookup always matches
 * the stored, normalised value.
 */
const emailField = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .pipe(
    z
      .email('Enter a valid email address')
      .max(254, 'Email must be at most 254 characters'),
  )

const passwordField = z
  .string({ error: 'Password is required' })
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`)

/** POST /api/auth/register */
export const registerSchema = z
  .object({
    name: nameField,
    email: emailField,
    password: passwordField,
  })
  .strict()

/**
 * POST /api/auth/login
 *
 * The password is deliberately *not* length-checked here. Applying the register
 * rules would reject a short password with a validation error, telling an
 * attacker the credential was malformed rather than simply wrong — and it would
 * lock out any account created before a future policy change.
 */
export const loginSchema = z
  .object({
    email: emailField,
    password: z.string({ error: 'Password is required' }).min(1, 'Password is required'),
  })
  .strict()

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
