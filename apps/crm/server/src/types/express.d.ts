/**
 * Adds the authenticated user to Express's Request.
 *
 * Populated by `requireAuth`; absent on public routes.
 */
declare global {
  namespace Express {
    interface Request {
      user?: { id: string }
    }
  }
}

export {}
