import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose'

/** Customer status values. See the note in docs/API.md (Q1) — RAW_DOC names only `active`. */
export const CUSTOMER_STATUSES = ['lead', 'active', 'inactive'] as const
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number]
export const DEFAULT_CUSTOMER_STATUS: CustomerStatus = 'lead'

export interface ICustomer {
  /** The account this record belongs to. Every query filters on it. */
  owner: Types.ObjectId
  name: string
  company?: string
  email?: string
  phone?: string
  status: CustomerStatus
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export type CustomerDocument = HydratedDocument<ICustomer>

/** The shape returned to clients. `owner` is deliberately absent. */
export interface PublicCustomer {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  status: CustomerStatus
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

const customerSchema = new Schema<ICustomer>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [120, 'Name must be at most 120 characters'],
    },
    company: { type: String, trim: true, maxlength: 120 },
    // Not unique: two accounts may hold the same contact, and one account may
    // legitimately record the same address twice.
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 40 },
    status: {
      type: String,
      enum: CUSTOMER_STATUSES,
      default: DEFAULT_CUSTOMER_STATUS,
      required: true,
    },
    notes: { type: String, trim: true, maxlength: 5000 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc, ret: Record<string, unknown>) {
        ret['id'] = ret['_id']?.toString()
        delete ret['_id']
        delete ret['owner']
        return ret
      },
    },
  },
)

// Default list ordering, scoped to the owner.
customerSchema.index({ owner: 1, createdAt: -1 })
// Status filter.
customerSchema.index({ owner: 1, status: 1 })

export function toPublicCustomer(customer: CustomerDocument): PublicCustomer {
  return {
    id: customer._id.toString(),
    name: customer.name,
    company: customer.company ?? null,
    email: customer.email ?? null,
    phone: customer.phone ?? null,
    status: customer.status,
    notes: customer.notes ?? null,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  }
}

export const Customer: Model<ICustomer> = model<ICustomer>('Customer', customerSchema)
