import { Types, type QueryFilter } from 'mongoose'

import { Customer } from '../../models/Customer.js'
import {
  DEAL_STAGES,
  Deal,
  toPublicDeal,
  type DealStage,
  type IDeal,
  type PublicDeal,
} from '../../models/Deal.js'
import { ApiError } from '../../utils/ApiError.js'
import { buildPaginationMeta, type PaginationMeta } from '../../utils/pagination.js'
import type { CreateDealInput, ListDealsQuery, UpdateDealInput } from './deal.schemas.js'

/** Fields embedded for each deal's customer. */
const CUSTOMER_PROJECTION = 'name company'

/** Per-column cap in board mode, where there is no page parameter. */
const BOARD_COLUMN_LIMIT = 50

export interface DealListResult {
  data: PublicDeal[]
  pagination: PaginationMeta
}

export interface DealBoardColumn {
  stage: DealStage
  count: number
  totalValue: number
  deals: PublicDeal[]
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Confirms the customer exists and belongs to the caller.
 *
 * Returns 400 rather than 404: the referenced record is part of an invalid
 * *request body*, not the resource being addressed. Another user's customer is
 * reported identically to a non-existent one, so the check cannot be used to
 * probe for ids.
 */
async function assertCustomerOwned(ownerId: string, customerId: string): Promise<void> {
  const exists = await Customer.exists({ _id: customerId, owner: ownerId })

  if (!exists) {
    throw ApiError.badRequest('Validation failed', [
      { path: 'customer', message: 'Customer not found' },
    ])
  }
}

/**
 * Converts a query filter into one usable by the aggregation pipeline.
 *
 * `find()` casts id strings automatically; `$match` does not, and an uncast id
 * matches no documents rather than raising an error.
 */
function toAggregateMatch(filter: QueryFilter<IDeal>): Record<string, unknown> {
  const match: Record<string, unknown> = { ...filter }

  for (const key of ['owner', 'customer'] as const) {
    const value = match[key]
    if (typeof value === 'string') {
      match[key] = new Types.ObjectId(value)
    }
  }

  return match
}

function buildFilter(ownerId: string, query: Partial<ListDealsQuery>): QueryFilter<IDeal> {
  const filter: QueryFilter<IDeal> = { owner: ownerId }

  if (query.stage) filter.stage = query.stage
  if (query.customer) filter.customer = query.customer
  if (query.search) filter.title = new RegExp(escapeRegex(query.search), 'i')

  return filter
}

export async function listDeals(
  ownerId: string,
  query: ListDealsQuery,
): Promise<DealListResult> {
  const filter = buildFilter(ownerId, query)
  const skip = (query.page - 1) * query.limit

  const [documents, total] = await Promise.all([
    Deal.find(filter)
      .populate('customer', CUSTOMER_PROJECTION)
      .sort(query.sort)
      .skip(skip)
      .limit(query.limit),
    Deal.countDocuments(filter),
  ])

  return {
    data: documents.map(toPublicDeal),
    pagination: buildPaginationMeta(query.page, query.limit, total),
  }
}

/**
 * Board view: one column per stage.
 *
 * Every stage is always present, including empty ones, so the board never
 * silently drops a column. Totals come from an aggregation rather than from the
 * returned page, so `count` and `totalValue` describe the whole column.
 */
export async function getDealBoard(
  ownerId: string,
  query: ListDealsQuery,
): Promise<{ stages: DealBoardColumn[] }> {
  const baseFilter = buildFilter(ownerId, { customer: query.customer, search: query.search })

  const [totals, documents] = await Promise.all([
    Deal.aggregate<{ _id: DealStage; count: number; totalValue: number }>([
      // Aggregation does not cast strings to ObjectId the way find() does, so
      // the match has to be built with real ObjectIds or it silently matches
      // nothing and every total comes back as zero.
      { $match: toAggregateMatch(baseFilter) },
      { $group: { _id: '$stage', count: { $sum: 1 }, totalValue: { $sum: '$value' } } },
    ]),
    Deal.find(baseFilter)
      .populate('customer', CUSTOMER_PROJECTION)
      .sort(query.sort)
      .limit(BOARD_COLUMN_LIMIT * DEAL_STAGES.length),
  ])

  const totalsByStage = new Map(totals.map((entry) => [entry._id, entry]))
  const dealsByStage = new Map<DealStage, PublicDeal[]>()

  for (const document of documents) {
    const bucket = dealsByStage.get(document.stage) ?? []
    if (bucket.length < BOARD_COLUMN_LIMIT) {
      bucket.push(toPublicDeal(document))
      dealsByStage.set(document.stage, bucket)
    }
  }

  return {
    stages: DEAL_STAGES.map((stage) => ({
      stage,
      count: totalsByStage.get(stage)?.count ?? 0,
      totalValue: totalsByStage.get(stage)?.totalValue ?? 0,
      deals: dealsByStage.get(stage) ?? [],
    })),
  }
}

export async function createDeal(
  ownerId: string,
  input: CreateDealInput,
): Promise<PublicDeal> {
  await assertCustomerOwned(ownerId, input.customer)

  const deal = await Deal.create({
    ...input,
    owner: ownerId,
    // A deal created directly in the Won stage is won as of now.
    ...(input.stage === 'Won' ? { wonAt: new Date() } : {}),
  })

  await deal.populate('customer', CUSTOMER_PROJECTION)
  return toPublicDeal(deal)
}

export async function getDeal(ownerId: string, id: string): Promise<PublicDeal> {
  const deal = await Deal.findOne({ _id: id, owner: ownerId }).populate(
    'customer',
    CUSTOMER_PROJECTION,
  )

  if (!deal) {
    throw ApiError.notFound('Deal not found')
  }

  return toPublicDeal(deal)
}

/**
 * Applies a partial update, including stage changes from the pipeline board.
 *
 * The document is loaded, mutated and saved rather than updated in place,
 * because `wonAt` depends on the stage it is moving *from*.
 */
export async function updateDeal(
  ownerId: string,
  id: string,
  input: UpdateDealInput,
): Promise<PublicDeal> {
  if (input.customer) {
    await assertCustomerOwned(ownerId, input.customer)
  }

  const deal = await Deal.findOne({ _id: id, owner: ownerId })

  if (!deal) {
    throw ApiError.notFound('Deal not found')
  }

  const previousStage = deal.stage
  deal.set(input)

  if (input.stage && input.stage !== previousStage) {
    if (input.stage === 'Won') {
      deal.wonAt = new Date()
    } else if (previousStage === 'Won') {
      // Moved back out of Won — the win no longer holds.
      deal.set('wonAt', undefined)
    }
  }

  await deal.save()
  await deal.populate('customer', CUSTOMER_PROJECTION)

  return toPublicDeal(deal)
}

export async function deleteDeal(ownerId: string, id: string): Promise<void> {
  const deal = await Deal.findOneAndDelete({ _id: id, owner: ownerId })

  if (!deal) {
    throw ApiError.notFound('Deal not found')
  }

  // Detaching this deal from its tasks is handled once the Task model exists.
}
