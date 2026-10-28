import { z } from 'zod'

import { ORDER_STATUSES } from '../../models/Order.js'

export const listOrdersQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES, { message: 'Unknown order status' }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, { message: 'Unknown order status' }),
})

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>
