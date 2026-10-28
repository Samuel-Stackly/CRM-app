import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { Spinner } from '../../components/ui/Spinner'
import { useAuth } from './useAuth'

/**
 * Gate for authenticated routes.
 *
 * Renders a loader while the session is being restored — redirecting during
 * `restoring` would bounce a signed-in user to login on every refresh.
 */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'restoring') {
    return <Spinner fullPage label="Restoring your session" />
  }

  if (status === 'unauthenticated') {
    // Remember where they were headed so login can return them there.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}
