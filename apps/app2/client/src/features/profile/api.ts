import { http } from '../../services/http'
import type { User } from '../../types/models'

interface ProfileResponse {
  user: User
}

/**
 * Fields the server accepts.
 *
 * All optional, and at least one of `name`/`password` is required — the server
 * rejects an empty body rather than treating it as a no-op. A `password` must
 * be accompanied by `currentPassword`, which the server checks against the
 * stored hash before applying the change.
 */
export interface ProfilePayload {
  name?: string
  password?: string
  currentPassword?: string
}

export const profileApi = {
  /**
   * A 401 from this endpoint means "that current password is wrong", not
   * "your session has expired", so the global unauthorized handler is bypassed
   * — otherwise a mistyped password would silently sign the user out mid-form
   * instead of showing them the error.
   */
  update: (payload: ProfilePayload) =>
    http.put<ProfileResponse>('/users/me', payload, { skipUnauthorizedHandler: true }),
}
