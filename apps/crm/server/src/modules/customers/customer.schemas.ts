import { z } from 'zod'

import { CUSTOMER_STATUSES } from '../../models/Customer.js'

const name = z
  .string({ error: 'Name is required' })
  .trim()
  .min(1, 'Name is required')
  .max(120, 'Name must be at most 120 characters')

/** Optional free-text field: blank input is stored as "not set" rather than "". */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .transform((value) => (value === '' ? undefined : value))
    .optional()

const email = z
  .union([z.literal(''), z.string().trim().toLowerCase()])
  .optional()
  .transform((value) => (value === '' || value === undefined ? undefined : value))
  .pipe(
    z
      .email('Enter a valid email address')
      .max(254, 'Email must be at most 254 characters')
      .optional(),
  )

const status = z.enum(CUSTOMER_STATUSES, {
  error: `Status must be one of: ${CUSTOMER_STATUSES.join(', ')}`,
})

/** POST /api/customers */
export const createCustomerSchema = z
  .object({
    name,
    company: optionalText(120, 'Company'),
    email,
    phone: optionalText(40, 'Phone'),
    status: status.optional(),
    notes: optionalText(5000, 'Notes'),
  })
  .strict()

/**
 * PATCH /api/customers/:id
 *
 * Every field optional, but an empty object is rejected: a PATCH that changes
 * nothing is a client mistake, not a no-op worth a 200.
 */
export const updateCustomerSchema = z
  .object({
    name: name.optional(),
    company: optionalText(120, 'Company'),
    email,
    phone: optionalText(40, 'Phone'),
    status: status.optional(),
    notes: optionalText(5000, 'Notes'),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    error: 'At least one field must be provided',
  })

export const CUSTOMER_SORT_FIELDS = [
  'createdAt',
  '-createdAt',
  'name',
  '-name',
] as const

/** GET /api/customers query string. */
export const listCustomersQuerySchema = z
  .object({
    search: z.string().trim().max(100, 'Search must be at most 100 characters').optional(),
    status: status.optional(),
    page: z.coerce.number().int('Page must be an integer').min(1, 'Page must be at least 1').default(1),
    limit: z.coerce
      .number()
      .int('Limit must be an integer')
      .min(1, 'Limit must be at least 1')
      // Capped so a client cannot request the entire collection in one call.
      .max(100, 'Limit must be at most 100')
      .default(20),
    sort: z.enum(CUSTOMER_SORT_FIELDS).default('-createdAt'),
  })
  .strict()

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>
