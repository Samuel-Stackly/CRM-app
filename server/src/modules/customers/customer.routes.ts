import { Router } from 'express'

import { requireAuth } from '../../middleware/requireAuth.js'
import { validate } from '../../middleware/validate.js'
import { validateObjectId } from '../../middleware/validateObjectId.js'
import * as controller from './customer.controller.js'
import {
  createCustomerSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from './customer.schemas.js'

export const customerRouter: Router = Router()

// Applied to the whole router: no customer route is reachable without a session.
customerRouter.use(requireAuth)

const withId = validateObjectId('id', 'Customer')

customerRouter.get('/', validate(listCustomersQuerySchema, 'query'), controller.list)
customerRouter.post('/', validate(createCustomerSchema), controller.create)
customerRouter.get('/:id', withId, controller.getById)
customerRouter.patch('/:id', withId, validate(updateCustomerSchema), controller.update)
customerRouter.delete('/:id', withId, controller.remove)
