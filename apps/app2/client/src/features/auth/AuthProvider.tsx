import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { setUnauthorizedHandler } from '../../services/http'
import type { User } from '../../types/models'
import { authApi, type LoginPayload } from './api'
import { AuthContext, type AuthStatus } from './AuthContext'

/**
 * Session state.
 *
 * There is no token in JavaScript to hold: the API issues an httpOnly cookie,
 * which the browser attaches to every credentialed request and which no script
 * on the page can read. The only client-side session state is "who is signed
 * in", recovered from the server on load. See the security note in README terms
 * — nothing is kept in localStorage or sessionStorage.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('restoring')
  const [user, setUser] = useState<User | null>(null)

  // Restore the session once on load. A 401 simply means "not signed in".
  useEffect(() => {
    const controller = new AbortController()

    authApi
      .me(controller.signal)
      .then((response) => {
        setUser(response.user)
        setStatus('authenticated')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setUser(null)
        setStatus('unauthenticated')
      })

    return () => controller.abort()
  }, [])

  // Any 401 from any request ends the session in one place, rather than every
  // caller handling expiry itself. The backend has no refresh mechanism, so an
  // expired token is simply a session that is over.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setStatus('unauthenticated')
    })

    return () => setUnauthorizedHandler(undefined)
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await authApi.login(payload)
    setUser(response.user)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      // Clear local state even if the request failed: the user asked to leave,
      // and leaving them looking signed-in would be worse than a stale cookie.
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [])

  const replaceUser = useCallback((next: User) => setUser(next), [])

  const value = useMemo(
    () => ({ status, user, login, logout, setUser: replaceUser }),
    [status, user, login, logout, replaceUser],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
