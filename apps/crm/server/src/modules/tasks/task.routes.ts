import { Router } from 'express'

import { requireAuth } from '../../middleware/requireAuth.js'
import { validate } from '../../middleware/validate.js'
import { validateObjectId } from '../../middleware/validateObjectId.js'
import * as controller from './task.controller.js'
import { createTaskSchema, listTasksQuerySchema, updateTaskSchema } from './task.schemas.js'

export const taskRouter: Router = Router()

taskRouter.use(requireAuth)

const withId = validateObjectId('id', 'Task')

taskRouter.get('/', validate(listTasksQuerySchema, 'query'), controller.list)
taskRouter.post('/', validate(createTaskSchema), controller.create)
taskRouter.get('/:id', withId, controller.getById)
taskRouter.patch('/:id', withId, validate(updateTaskSchema), controller.update)
taskRouter.delete('/:id', withId, controller.remove)
