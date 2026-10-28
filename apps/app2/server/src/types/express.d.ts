/**
 * Augments Express's Request with the authenticated user.
 *
 * Set by requireAuth and read by every controller, so the id is available
 * without each one re-reading and re-verifying the token.
 */
declare global {
  namespace Express {
    interface Request {
      user?: { id: string }
    }
  }
}

export {}
