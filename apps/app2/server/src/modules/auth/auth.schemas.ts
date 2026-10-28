import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  // No format rule on login: the only question is whether it matches, and
  // rejecting a "badly formed" password here would leak the policy to anyone
  // probing the endpoint.
  password: z.string().min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof loginSchema>
