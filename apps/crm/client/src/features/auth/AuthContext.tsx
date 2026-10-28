import { createContext } from 'react'

import type { User } from '../../types/models'
import type { LoginPayload, RegisterPayload } from './api'

/**
 * Three states, not two.
 *
 * Collapsing `restoring` into `unauthenticated` would flash the login page on
 * every refresh while GET /auth/me is still in flight.
 */
export type AuthStatus = 'restoring' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
