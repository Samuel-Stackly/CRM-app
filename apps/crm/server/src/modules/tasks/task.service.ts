import type { QueryFilter } from 'mongoose'

import { Customer } from '../../models/Customer.js'
import { Deal } from '../../models/Deal.js'
import { Task, toPublicTask, type ITask, type PublicTask } from '../../models/Task.js'
import { ApiError } from '../../utils/ApiError.js'
import { buildPaginationMeta, type PaginationMeta } from '../../utils/pagination.js'
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from './task.schemas.js'

const CUSTOMER_PROJECTION = 'name'
const DEAL_PROJECTION = 'title'

export interface TaskListResult {
  data: PublicTask[]
  pagination: PaginationMeta
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Confirms any referenced customer and deal belong to the caller.
 *
 * Reported as a 400 on the offending field: the reference makes the *body*
 * invalid. Another user's record is indistinguishable from a missing one.
 */
async function assertReferencesOwned(
  ownerId: string,
  input: { customer?: string | null; deal?: string | null },
): Promise<void> {
  const issues: { path: string; message: string }[] = []

  const [customerExists, dealExists] = await Promise.all([
    input.customer ? Customer.exists({ _id: input.customer, owner: ownerId }) : null,
    input.deal ? Deal.exists({ _id: input.deal, owner: ownerId }) : null,
  ])

  if (input.customer && !customerExists) {
    issues.push({ path: 'customer', message: 'Customer not found' })
  }
  if (input.deal && !dealExists) {
    issues.push({ path: 'deal', message: 'Deal not found' })
  }

  if (issues.length > 0) {
    throw ApiError.badRequest('Validation failed', issues)
  }
}

function buildFilter(
  ownerId: string,
  query: Partial<ListTasksQuery>,
  now: Date,
): QueryFilter<ITask> {
  const filter: QueryFilter<ITask> = { owner: ownerId }

  if (query.priority) filter.priority = query.priority
  if (query.customer) filter.customer = query.customer
  if (query.deal) filter.deal = query.deal
  if (query.search) filter.title = new RegExp(escapeRegex(query.search), 'i')
  if (query.done !== undefined) filter.done = query.done

  const dueDate: Record<string, Date> = {}
  if (query.dueAfter) dueDate['$gte'] = query.dueAfter
  if (query.dueBefore) dueDate['$lte'] = query.dueBefore

  if (query.overdue !== undefined) {
    if (query.overdue) {
      // Overdue is not a stored field: it is rewritten into the same rule the
      // read path uses, so the client never reimplements it.
      filter.done = false
      dueDate['$lt'] = now
    } else {
      // Not overdue: either already done, or not yet past due.
      filter.$or = [{ done: true }, { dueDate: { $gte: now } }]
    }
  }

  if (Object.keys(dueDate).length > 0) {
    filter.dueDate = dueDate
  }

  return filter
}

/** Maps the public sort key onto the stored field. */
function resolveSort(sort: ListTasksQuery['sort']): string {
  // Highest severity first is the useful default for a priority sort; the
  // stored rank exists because sorting the label would give high, low, medium.
  if (sort === 'priority') return '-priorityRank'
  if (sort === '-priority') return 'priorityRank'
  return sort
}

export async function listTasks(
  ownerId: string,
  query: ListTasksQuery,
): Promise<TaskListResult> {
  const now = new Date()
  const filter = buildFilter(ownerId, query, now)
  const skip = (query.page - 1) * query.limit

  const [documents, total] = await Promise.all([
    Task.find(filter)
      .populate('customer', CUSTOMER_PROJECTION)
      .populate('deal', DEAL_PROJECTION)
      .sort(resolveSort(query.sort))
      .skip(skip)
      .limit(query.limit),
    Task.countDocuments(filter),
  ])

  return {
    data: documents.map((document) => toPublicTask(document, now)),
    pagination: buildPaginationMeta(query.page, query.limit, total),
  }
}

async function populateRefs(task: InstanceType<typeof Task>): Promise<void> {
  await task.populate('customer', CUSTOMER_PROJECTION)
  await task.populate('deal', DEAL_PROJECTION)
}

export async function createTask(
  ownerId: string,
  input: CreateTaskInput,
): Promise<PublicTask> {
  await assertReferencesOwned(ownerId, input)

  const task = new Task({
    ...input,
    owner: ownerId,
    // A task created already complete is completed as of now.
    ...(input.done ? { completedAt: new Date() } : {}),
  })

  await task.save()
  await populateRefs(task)

  return toPublicTask(task)
}

export async function getTask(ownerId: string, id: string): Promise<PublicTask> {
  const task = await Task.findOne({ _id: id, owner: ownerId })
    .populate('customer', CUSTOMER_PROJECTION)
    .populate('deal', DEAL_PROJECTION)

  if (!task) {
    throw ApiError.notFound('Task not found')
  }

  return toPublicTask(task)
}

/**
 * Applies a partial update.
 *
 * Loaded, mutated and saved rather than updated in place, so the pre-validate
 * hook keeps `priorityRank` in step and `completedAt` can react to the previous
 * value of `done`.
 */
export async function updateTask(
  ownerId: string,
  id: string,
  input: UpdateTaskInput,
): Promise<PublicTask> {
  await assertReferencesOwned(ownerId, input)

  const task = await Task.findOne({ _id: id, owner: ownerId })

  if (!task) {
    throw ApiError.notFound('Task not found')
  }

  const wasDone = task.done
  task.set(input)

  // Explicit null clears a reference; undefined leaves it untouched.
  if (input.customer === null) task.set('customer', undefined)
  if (input.deal === null) task.set('deal', undefined)

  if (input.done !== undefined && input.done !== wasDone) {
    task.set('completedAt', input.done ? new Date() : undefined)
  }

  await task.save()
  await populateRefs(task)

  return toPublicTask(task)
}

export async function deleteTask(ownerId: string, id: string): Promise<void> {
  const task = await Task.findOneAndDelete({ _id: id, owner: ownerId })

  if (!task) {
    throw ApiError.notFound('Task not found')
  }
}
