import { Router } from 'express'

import { requireAuth } from '../../middleware/requireAuth.js'
import { validate } from '../../middleware/validate.js'
import { validateObjectId } from '../../middleware/validateObjectId.js'
import * as controller from './deal.controller.js'
import { createDealSchema, listDealsQuerySchema, updateDealSchema } from './deal.schemas.js'

export const dealRouter: Router = Router()

dealRouter.use(requireAuth)

const withId = validateObjectId('id', 'Deal')

// Declared before '/:id', or Express would match 'stages' as an id.
dealRouter.get('/stages', controller.stages)

dealRouter.get('/', validate(listDealsQuerySchema, 'query'), controller.list)
dealRouter.post('/', validate(createDealSchema), controller.create)
dealRouter.get('/:id', withId, controller.getById)
dealRouter.patch('/:id', withId, validate(updateDealSchema), controller.update)
dealRouter.delete('/:id', withId, controller.remove)
