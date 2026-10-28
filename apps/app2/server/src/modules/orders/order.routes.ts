import { Router } from 'express'

import { requireAuth } from '../../middleware/requireAuth.js'
import { validate } from '../../middleware/validate.js'
import { validateObjectId } from '../../middleware/validateObjectId.js'
import * as controller from './order.controller.js'
import { listOrdersQuerySchema, updateOrderStatusSchema } from './order.schemas.js'

export const orderRouter: Router = Router()

orderRouter.use(requireAuth)

orderRouter.get('/', validate(listOrdersQuerySchema, 'query'), controller.list)
orderRouter.patch(
  '/:id/status',
  validateObjectId('id', 'Order'),
  validate(updateOrderStatusSchema),
  controller.updateStatus,
)
