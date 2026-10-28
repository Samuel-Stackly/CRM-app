import { Router } from 'express'

import { requireAuth } from '../../middleware/requireAuth.js'
import { summary } from './dashboard.controller.js'

export const dashboardRouter: Router = Router()

dashboardRouter.use(requireAuth)

// One endpoint for every figure: a single round trip for the client, and all
// pipelines share the same owner match.
dashboardRouter.get('/', summary)
