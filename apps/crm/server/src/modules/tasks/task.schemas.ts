import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

import { TASK_PRIORITIES } from '../../models/Task.js'

const objectId = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => isValidObjectId(value), { error: `${label} is not a valid id` })

/** An optional reference that can also be explicitly cleared with null. */
const nullableRef = (label: string) => objectId(label).nullable().optional()

const title = z
  .string({ error: 'Title is required' })
  .trim()
  .min(1, 'Title is required')
  .max(200, 'Title must be at most 200 characters')

const description = z
  .string()
  .trim()
  .max(5000, 'Description must be at most 5000 characters')
  .transform((value) => (value === '' ? undefined : value))
  .optional()

const dueDate = z.coerce.date({ error: 'Due date must be a valid date' })

const priority = z.enum(TASK_PRIORITIES, {
  error: `Priority must be one of: ${TASK_PRIORITIES.join(', ')}`,
})

/**
 * POST /api/tasks
 *
 * `overdue` and `completedAt` are deliberately absent. Both are derived by the
 * server, and `.strict()` turns any attempt to supply them into a 400 — which
 * is what enforces "overdue is calculated, not chosen by hand".
 */
export const createTaskSchema = z
  .object({
    title,
    description,
    dueDate,
    priority: priority.optional(),
    done: z.boolean().optional(),
    customer: nullableRef('Customer'),
    deal: nullableRef('Deal'),
  })
  .strict()

export const updateTaskSchema = z
  .object({
    title: title.optional(),
    description,
    dueDate: dueDate.optional(),
    priority: priority.optional(),
    done: z.boolean().optional(),
    customer: nullableRef('Customer'),
    deal: nullableRef('Deal'),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    error: 'At least one field must be provided',
  })

export const TASK_SORT_FIELDS = [
  'dueDate',
  '-dueDate',
  'createdAt',
  '-createdAt',
  'priority',
  '-priority',
] as const

/** Query strings carry booleans as text, so they are parsed explicitly. */
const booleanFlag = z
  .enum(['true', 'false'], { error: 'Must be true or false' })
  .transform((value) => value === 'true')

export const listTasksQuerySchema = z
  .object({
    done: booleanFlag.optional(),
    priority: priority.optional(),
    /** Derived filter — rewritten server-side into done:false + dueDate < now. */
    overdue: booleanFlag.optional(),
    customer: objectId('Customer').optional(),
    deal: objectId('Deal').optional(),
    dueBefore: z.coerce.date({ error: 'dueBefore must be a valid date' }).optional(),
    dueAfter: z.coerce.date({ error: 'dueAfter must be a valid date' }).optional(),
    search: z.string().trim().max(100, 'Search must be at most 100 characters').optional(),
    page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit must be at most 100')
      .default(20),
    sort: z.enum(TASK_SORT_FIELDS).default('dueDate'),
  })
  .strict()

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>
