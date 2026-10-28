import { User, toPublicUser, type PublicUser } from '../../models/User.js'
import { ApiError } from '../../utils/ApiError.js'
import { hashPassword, verifyPassword } from '../auth/auth.service.js'
import type { UpdateProfileInput } from './user.schemas.js'

/**
 * Updates the signed-in user's own profile.
 *
 * Scoped to `userId` from the verified token, never from the body, so one
 * account cannot edit another by passing a different id.
 *
 * A password change is re-authenticated against the stored hash first: a valid
 * session proves the browser was signed in at some point, not that whoever is
 * driving it knows the password. Without that check, a borrowed laptop or a
 * stolen cookie is enough to lock the owner out permanently.
 *
 * Neither password nor hash is ever returned or logged — `toPublicUser` omits
 * the hash, and nothing here writes either to the console.
 */
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<PublicUser> {
  const changingPassword = input.password !== undefined

  if (changingPassword) {
    // The hash is `select: false` on the model, so it has to be asked for
    // explicitly. Only a password change needs it, so a name-only save still
    // costs a single round trip.
    const existing = await User.findById(userId).select('+passwordHash')

    if (!existing) {
      throw ApiError.unauthorized()
    }

    // The schema guarantees currentPassword is present and non-empty here.
    const matches = await verifyPassword(input.currentPassword!, existing.passwordHash)

    if (!matches) {
      throw ApiError.unauthorized('Current password is incorrect')
    }
  }

  const update: { name?: string; passwordHash?: string } = {}

  if (input.name !== undefined) {
    update.name = input.name
  }

  if (changingPassword) {
    update.passwordHash = await hashPassword(input.password!)
  }

  const user = await User.findByIdAndUpdate(userId, update, {
    returnDocument: 'after',
    runValidators: true,
  })

  if (!user) {
    throw ApiError.unauthorized()
  }

  return toPublicUser(user)
}
