import { z } from 'zod'
import { isValidObjectId } from 'mongoose'

import { DEAL_STAGES } from '../../models/Deal.js'

/** An ObjectId supplied in a body or query string. */
const objectId = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .refine((value) => isValidObjectId(value), { error: `${label} is not a valid id` })

const title = z
  .string({ error: 'Title is required' })
  .trim()
  .min(1, 'Title is required')
  .max(200, 'Title must be at most 200 characters')

const value = z
  .number({ error: 'Value is required' })
  .min(0, 'Value must be zero or greater')
  .max(1_000_000_000, 'Value must be at most 1,000,000,000')

const stage = z.enum(DEAL_STAGES, {
  error: `Stage must be one of: ${DEAL_STAGES.join(', ')}`,
})

/** Accepts an ISO date string and rejects an unparseable one. */
const expectedCloseDate = z.coerce
  .date({ error: 'Expected close date must be a valid date' })
  .optional()

/**
 * POST /api/deals
 *
 * `wonAt` is absent by design: it is set by the server when a deal reaches the
 * Won stage, and `.strict()` turns any client attempt to supply it into a 400.
 */
export const createDealSchema = z
  .object({
    title,
    value,
    stage: stage.optional(),
    expectedCloseDate,
    customer: objectId('Customer'),
  })
  .strict()

export const updateDealSchema = z
  .object({
    title: title.optional(),
    value: value.optional(),
    stage: stage.optional(),
    expectedCloseDate,
    customer: objectId('Customer').optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    error: 'At least one field must be provided',
  })

export const DEAL_SORT_FIELDS = [
  'createdAt',
  '-createdAt',
  'value',
  '-value',
  'expectedCloseDate',
] as const

export const listDealsQuerySchema = z
  .object({
    stage: stage.optional(),
    customer: objectId('Customer').optional(),
    search: z.string().trim().max(100, 'Search must be at most 100 characters').optional(),
    page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit must be at most 100')
      .default(20),
    sort: z.enum(DEAL_SORT_FIELDS).default('-createdAt'),
    /** Board mode: group every stage into its own column. */
    groupBy: z.literal('stage').optional(),
  })
  .strict()

export type CreateDealInput = z.infer<typeof createDealSchema>
export type UpdateDealInput = z.infer<typeof updateDealSchema>
export type ListDealsQuery = z.infer<typeof listDealsQuerySchema>
