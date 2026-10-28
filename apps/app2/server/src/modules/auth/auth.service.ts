import bcrypt from 'bcryptjs'

import { User, toPublicUser, type PublicUser } from '../../models/User.js'
import { ApiError } from '../../utils/ApiError.js'
import type { LoginInput } from './auth.schemas.js'

/** Work factor for bcrypt. 12 is the project default for new hashes. */
export const BCRYPT_ROUNDS = 12

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

/**
 * Checks a plaintext password against a stored hash.
 *
 * The single comparison point for the whole app, so re-authenticating a
 * password change uses exactly the same bcrypt implementation as signing in.
 */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/**
 * Verifies credentials.
 *
 * An unknown email and a wrong password produce the identical 401, and the
 * comparison still runs against a dummy hash when no user is found, so the
 * response time does not reveal which emails exist.
 */
export async function login(input: LoginInput): Promise<PublicUser> {
  const user = await User.findOne({ email: input.email }).select('+passwordHash')

  if (!user) {
    // Constant-ish work for an unknown account. Without it, a missing user
    // returns measurably faster than a wrong password.
    await bcrypt.compare(input.password, '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv')
    throw ApiError.unauthorized('Invalid email or password')
  }

  const matches = await verifyPassword(input.password, user.passwordHash)

  if (!matches) {
    throw ApiError.unauthorized('Invalid email or password')
  }

  return toPublicUser(user)
}

/** Loads the signed-in user for session restore. */
export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await User.findById(userId)

  // A valid token for a deleted account is not an authorisation failure the
  // client can fix by retrying, but it is still "you are not signed in".
  if (!user) {
    throw ApiError.unauthorized()
  }

  return toPublicUser(user)
}
