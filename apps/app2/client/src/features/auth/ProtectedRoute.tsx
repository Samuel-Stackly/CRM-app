import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { Spinner } from '../../components/ui/Spinner'
import { useAuth } from './useAuth'

/**
 * Gate for every authenticated route.
 *
 * While the session is still being restored it renders a spinner rather than
 * redirecting: a cold load always starts unauthenticated, and redirecting on
 * that would bounce a signed-in user to the login page on every refresh.
 */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'restoring') {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner label="Restoring your session" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    // `from` lets the login page send the user back where they were headed.
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
