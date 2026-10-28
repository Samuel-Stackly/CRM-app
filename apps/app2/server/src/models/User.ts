import { Schema, model, type HydratedDocument, type Model } from 'mongoose'

export interface IUser {
  name: string
  email: string
  /** bcrypt hash. Never selected by default, never serialised. */
  passwordHash: string
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
}

export type UserDocument = HydratedDocument<IUser>

/** The shape returned to clients. `passwordHash` is deliberately absent. */
export interface PublicUser {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [120, 'Name must be at most 120 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      // Unique index: the login lookup is by email, and two accounts sharing
      // one would make "which user is this" ambiguous.
      unique: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      // Excluded from every query unless explicitly re-selected, so a hash
      // cannot reach a response through a forgotten projection.
      select: false,
    },
    avatarUrl: { type: String, trim: true },
  },
  { timestamps: true },
)

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user.id as string,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
  }
}

export const User: Model<IUser> = model<IUser>('User', userSchema)
