import type { QueryFilter } from 'mongoose'

import { Order, toPublicOrder, type IOrder, type PublicOrder } from '../../models/Order.js'
import { ApiError } from '../../utils/ApiError.js'
import { buildPaginationMeta, type PaginationMeta } from '../../utils/pagination.js'
import type { ListOrdersQuery, UpdateOrderStatusInput } from './order.schemas.js'

export interface OrderListResult {
  data: PublicOrder[]
  pagination: PaginationMeta
}

export async function listOrders(query: ListOrdersQuery): Promise<OrderListResult> {
  const filter: QueryFilter<IOrder> = {}
  if (query.status) {
    filter.status = query.status
  }

  const skip = (query.page - 1) * query.limit

  const [documents, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Order.countDocuments(filter),
  ])

  return {
    data: documents.map(toPublicOrder),
    pagination: buildPaginationMeta(query.page, query.limit, total),
  }
}

/**
 * Moves an order to a new status.
 *
 * The status itself is validated by Zod before this runs, so an unknown value
 * never reaches the database. No transition rules are enforced beyond that —
 * the assignment defines none, and an operator correcting a mistaken
 * "Delivered" back to "Shipped" is a legitimate action.
 */
export async function updateOrderStatus(
  id: string,
  input: UpdateOrderStatusInput,
): Promise<PublicOrder> {
  const order = await Order.findOneAndUpdate(
    { _id: id },
    { status: input.status },
    { returnDocument: 'after', runValidators: true },
  )

  if (!order) {
    throw ApiError.notFound('Order not found')
  }

  return toPublicOrder(order)
}
