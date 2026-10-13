import { Schema, model, type HydratedDocument, type Model } from 'mongoose'

/**
 * A registered account. Every Customer, Deal and Task references a User as its
 * owner, which is the basis of per-user data isolation.
 */
export interface IUser {
  name: string
  email: string
  /**
   * bcrypt hash. Named `passwordHash` so that no code path can mistake it for a
   * plain-text password, and excluded from queries by default (`select: false`)
   * so it cannot leak through an unguarded `res.json(user)`.
   */
  passwordHash: string
  createdAt: Date
  updatedAt: Date
}

export type UserDocument = HydratedDocument<IUser>

/** The shape returned to clients — never includes the hash. */
export interface PublicUser {
  id: string
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [1, 'Name is required'],
      maxlength: [120, 'Name must be at most 120 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, 'Email must be at most 254 characters'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
  },
  {
    timestamps: true,
    // Normalises every serialisation path, including nested documents and
    // res.json(), so the hash cannot escape even if a caller forgets to project.
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc, ret: Record<string, unknown>) {
        ret['id'] = ret['_id']?.toString()
        delete ret['_id']
        delete ret['passwordHash']
        return ret
      },
    },
    toObject: { virtuals: true },
  },
)

/**
 * Projects a user document into its public representation.
 *
 * Used by controllers so the response shape is defined in one place rather than
 * assembled ad hoc at each call site.
 */
export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export const User: Model<IUser> = model<IUser>('User', userSchema)
