import type { NextFunction, Request, Response } from 'express'

import type { ListOrdersQuery, UpdateOrderStatusInput } from './order.schemas.js'
import * as service from './order.service.js'

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.listOrders(req.query as unknown as ListOrdersQuery)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export async function updateStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const order = await service.updateOrderStatus(
      req.params.id as string,
      req.body as UpdateOrderStatusInput,
    )
    res.status(200).json({ order })
  } catch (error) {
    next(error)
  }
}
