import { createContext } from 'react'

import type { User } from '../../types/models'
import type { LoginPayload } from './api'

/** `restoring` is the state before GET /auth/me has answered. */
export type AuthStatus = 'restoring' | 'authenticated' | 'unauthenticated'

export interface AuthValue {
  status: AuthStatus
  user: User | null
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
  /**
   * Replaces the cached user after the profile is edited, so the topbar and
   * anything else reading `user` update without a refetch or a page reload.
   */
  setUser: (user: User) => void
}

export const AuthContext = createContext<AuthValue | undefined>(undefined)
