import bcrypt from 'bcryptjs'

import { User, toPublicUser, type PublicUser } from '../../models/User.js'
import { ApiError } from '../../utils/ApiError.js'
import { signAuthToken } from '../../utils/jwt.js'
import type { LoginInput, RegisterInput } from './auth.schemas.js'

const BCRYPT_ROUNDS = 10

export interface AuthResult {
  user: PublicUser
  token: string
}

/**
 * Creates an account.
 *
 * The unique index on email is the real guard against duplicates: two
 * simultaneous registrations can both pass a pre-check, so the race is settled
 * by the database and surfaced here as a 409.
 */
export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)

  try {
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
    })

    return { user: toPublicUser(user), token: signAuthToken(user.id as string) }
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw ApiError.conflict('An account with that email already exists')
    }
    throw error
  }
}

/**
 * Verifies credentials.
 *
 * Unknown email and wrong password produce the identical 401 so the endpoint
 * cannot be used to discover which addresses are registered.
 */
export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await User.findOne({ email: input.email }).select('+passwordHash')

  if (!user) {
    // Hash anyway so a missing account and a wrong password take comparable
    // time, rather than the fast path revealing that the email is unknown.
    await bcrypt.compare(input.password, DUMMY_HASH)
    throw ApiError.unauthorized('Invalid email or password')
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash)

  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password')
  }

  return { user: toPublicUser(user), token: signAuthToken(user.id as string) }
}

/** Loads the authenticated user for GET /api/auth/me. */
export async function getUserById(id: string): Promise<PublicUser> {
  const user = await User.findById(id)

  // The token can outlive the account it names, so a valid signature is not on
  // its own proof that the user still exists.
  if (!user) {
    throw ApiError.unauthorized()
  }

  return toPublicUser(user)
}

/** A real bcrypt hash, used only to equalise timing on the unknown-email path. */
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8e3VN4VjQ3Xm9Qp1Q8Zq1Zq1Zq1Zq1'

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 11000
  )
}
