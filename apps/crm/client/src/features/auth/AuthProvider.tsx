import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { setUnauthorizedHandler } from '../../services/http'
import type { User } from '../../types/models'
import { authApi, type LoginPayload, type RegisterPayload } from './api'
import { AuthContext, type AuthStatus } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('restoring')
  const [user, setUser] = useState<User | null>(null)

  // Guards against a 401 arriving after the user has already signed in again.
  const signedOutRef = useRef(false)

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

  // Any 401 from any request ends the session in one place, rather than each
  // caller handling expiry itself.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      signedOutRef.current = true
      setUser(null)
      setStatus('unauthenticated')
    })

    return () => setUnauthorizedHandler(undefined)
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await authApi.login(payload)
    signedOutRef.current = false
    setUser(response.user)
    setStatus('authenticated')
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await authApi.register(payload)
    signedOutRef.current = false
    setUser(response.user)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      // Clear local state even if the request failed: the user asked to leave.
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [])

  const value = useMemo(
    () => ({ status, user, login, register, logout }),
    [status, user, login, register, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
