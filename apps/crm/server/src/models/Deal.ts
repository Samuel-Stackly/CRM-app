import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose'

/** Pipeline stages, in board order. Fixed by the assignment brief. */
export const DEAL_STAGES = ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost'] as const
export type DealStage = (typeof DEAL_STAGES)[number]

export const DEFAULT_DEAL_STAGE: DealStage = 'Lead'

/** Stages still in play. `Won` is realised revenue and `Lost` is neither. */
export const OPEN_DEAL_STAGES: readonly DealStage[] = ['Lead', 'Qualified', 'Proposal']

export function isOpenStage(stage: DealStage): boolean {
  return OPEN_DEAL_STAGES.includes(stage)
}

export interface IDeal {
  owner: Types.ObjectId
  customer: Types.ObjectId
  title: string
  value: number
  stage: DealStage
  expectedCloseDate?: Date
  /**
   * When the deal entered the `Won` stage. Server-controlled and never accepted
   * from a request body.
   *
   * Without it the only available proxy for "won this month" is `updatedAt`,
   * which any edit re-dates. See docs/API.md Q9 — this field is an addition to
   * the brief's field list, recorded there as the recommended default.
   */
  wonAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type DealDocument = HydratedDocument<IDeal>

/** Customer summary embedded in deal responses — three fields, not a full populate. */
export interface DealCustomerSummary {
  id: string
  name: string
  company: string | null
}

export interface PublicDeal {
  id: string
  title: string
  value: number
  stage: DealStage
  expectedCloseDate: Date | null
  customer: DealCustomerSummary | null
  createdAt: Date
  updatedAt: Date
}

const dealSchema = new Schema<IDeal>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title must be at most 200 characters'],
    },
    value: {
      type: Number,
      required: [true, 'Value is required'],
      min: [0, 'Value must be zero or greater'],
    },
    stage: {
      type: String,
      enum: DEAL_STAGES,
      default: DEFAULT_DEAL_STAGE,
      required: true,
    },
    expectedCloseDate: { type: Date },
    wonAt: { type: Date },
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

// Board grouping and the stage filter.
dealSchema.index({ owner: 1, stage: 1 })
// Deals nested under a customer.
dealSchema.index({ owner: 1, customer: 1 })
// Default list ordering.
dealSchema.index({ owner: 1, createdAt: -1 })

type PopulatedCustomer = { _id: Types.ObjectId; name?: string; company?: string }

function toCustomerSummary(customer: unknown): DealCustomerSummary | null {
  if (!customer || typeof customer !== 'object') return null

  // Unpopulated: the field is still a raw ObjectId.
  if (!('name' in customer)) return null

  const populated = customer as PopulatedCustomer
  return {
    id: populated._id.toString(),
    name: populated.name ?? '',
    company: populated.company ?? null,
  }
}

export function toPublicDeal(deal: DealDocument): PublicDeal {
  return {
    id: deal._id.toString(),
    title: deal.title,
    value: deal.value,
    stage: deal.stage,
    expectedCloseDate: deal.expectedCloseDate ?? null,
    customer: toCustomerSummary(deal.customer),
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
  }
}

export const Deal: Model<IDeal> = model<IDeal>('Deal', dealSchema)
