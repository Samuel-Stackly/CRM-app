import { Router } from 'express'

import { requireAuth } from '../../middleware/requireAuth.js'
import { validate } from '../../middleware/validate.js'
import { validateObjectId } from '../../middleware/validateObjectId.js'
import * as controller from './product.controller.js'
import { listProductsQuerySchema, productBodySchema } from './product.schemas.js'

export const productRouter: Router = Router()

// Applied to the whole router: no product route is reachable without a session.
productRouter.use(requireAuth)

const withId = validateObjectId('id', 'Product')

productRouter.get('/', validate(listProductsQuerySchema, 'query'), controller.list)
productRouter.post('/', validate(productBodySchema), controller.create)
productRouter.put('/:id', withId, validate(productBodySchema), controller.replace)
productRouter.delete('/:id', withId, controller.remove)
