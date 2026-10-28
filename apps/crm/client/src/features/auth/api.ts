import { http } from '../../services/http'
import type { User } from '../../types/models'

interface AuthResponse {
  user: User
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    http.post<AuthResponse>('/auth/register', payload),

  login: (payload: LoginPayload) => http.post<AuthResponse>('/auth/login', payload),

  logout: () => http.post<void>('/auth/logout'),

  /**
   * Session restore. A 401 here is the expected "not signed in" answer rather
   * than an error, so the global handler is bypassed.
   */
  me: (signal?: AbortSignal) =>
    http.get<AuthResponse>('/auth/me', { signal, skipUnauthorizedHandler: true }),
}
