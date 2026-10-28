import { z } from 'zod'

/**
 * Profile update.
 *
 * Every field is optional so the client can send only what changed, but an
 * empty body is rejected — it is almost always a bug in the caller rather than
 * a deliberate no-op.
 *
 * A password change additionally requires `currentPassword`. Re-authenticating
 * the change is what stops a hijacked session from locking the real owner out:
 * holding a valid cookie is not the same as knowing the password.
 */
export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(120, 'Name must be at most 120 characters')
      .optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(200, 'Password must be at most 200 characters')
      .optional(),
    /**
     * The existing password, checked against the stored hash.
     *
     * No length or format rule: the only question is whether it matches, and
     * applying the new-password policy here would reject a correct older
     * password that predates the rule.
     */
    currentPassword: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.name === undefined && value.password === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide a name or a password to update',
        path: [],
      })
      return
    }

    if (value.password !== undefined && !value.currentPassword) {
      // Pathed at the field so the client can render it inline rather than as
      // a form-level message. Catches both missing and empty-string.
      ctx.addIssue({
        code: 'custom',
        message: 'Current password is required to set a new one',
        path: ['currentPassword'],
      })
    }
  })

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
