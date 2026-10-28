import { http } from '../../services/http'
import type { User } from '../../types/models'

interface AuthResponse {
  user: User
}

export interface LoginPayload {
  email: string
  password: string
}

export const authApi = {
  login: (payload: LoginPayload) => http.post<AuthResponse>('/auth/login', payload),

  logout: () => http.post<void>('/auth/logout'),

  /**
   * Session restore. A 401 here is the expected "not signed in" answer rather
   * than an error, so the global unauthorized handler is bypassed — otherwise
   * every cold load of the login page would trigger a redirect to itself.
   */
  me: (signal?: AbortSignal) =>
    http.get<AuthResponse>('/auth/me', { signal, skipUnauthorizedHandler: true }),
}
