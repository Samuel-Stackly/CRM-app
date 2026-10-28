import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose'

/** Task priorities. See docs/API.md Q3 — the brief requires the field but names no values. */
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]
export const DEFAULT_TASK_PRIORITY: TaskPriority = 'medium'

/**
 * Severity order, stored alongside the label purely so the database can sort by
 * it. Sorting on the string itself would order high, low, medium alphabetically.
 * Derived server-side and never accepted from a request.
 */
export const PRIORITY_RANK: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3 }

export interface ITask {
  owner: Types.ObjectId
  title: string
  description?: string
  dueDate: Date
  priority: TaskPriority
  priorityRank: number
  done: boolean
  /** Set when `done` becomes true, cleared when it is reversed. Server-controlled. */
  completedAt?: Date
  customer?: Types.ObjectId
  deal?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export type TaskDocument = HydratedDocument<ITask>

export interface TaskRefSummary {
  id: string
  name: string
}

export interface PublicTask {
  id: string
  title: string
  description: string | null
  dueDate: Date
  priority: TaskPriority
  done: boolean
  /** Derived on every read — never stored. */
  overdue: boolean
  completedAt: Date | null
  customer: TaskRefSummary | null
  deal: TaskRefSummary | null
  createdAt: Date
  updatedAt: Date
}

const taskSchema = new Schema<ITask>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title must be at most 200 characters'],
    },
    description: { type: String, trim: true, maxlength: 5000 },
    dueDate: { type: Date, required: [true, 'Due date is required'] },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: DEFAULT_TASK_PRIORITY,
      required: true,
    },
    priorityRank: { type: Number, default: PRIORITY_RANK[DEFAULT_TASK_PRIORITY], required: true },
    done: { type: Boolean, default: false, required: true },
    completedAt: { type: Date },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    deal: { type: Schema.Types.ObjectId, ref: 'Deal' },
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
        delete ret['priorityRank']
        return ret
      },
    },
  },
)

/** Keeps the sortable rank consistent with the label on every write path. */
taskSchema.pre('validate', function syncPriorityRank() {
  if (this.isModified('priority') || this.isNew) {
    this.priorityRank = PRIORITY_RANK[this.priority]
  }
})

// Due-today and overdue queries, and the default ordering.
taskSchema.index({ owner: 1, dueDate: 1 })
// Tasks nested under a customer or a deal.
taskSchema.index({ owner: 1, customer: 1 })
taskSchema.index({ owner: 1, deal: 1 })
// Open-vs-done filtering, which every overdue query also uses.
taskSchema.index({ owner: 1, done: 1, dueDate: 1 })

/**
 * The overdue rule, defined once.
 *
 * A completed task is never overdue, regardless of its due date. Computed per
 * read so it is always current — there is no stored value that can go stale.
 */
export function isOverdue(task: Pick<ITask, 'done' | 'dueDate'>, now: Date = new Date()): boolean {
  return !task.done && task.dueDate.getTime() < now.getTime()
}

type PopulatedRef = { _id: Types.ObjectId; name?: string; title?: string }

function toRefSummary(ref: unknown): TaskRefSummary | null {
  if (!ref || typeof ref !== 'object') return null
  // Unpopulated references are still raw ObjectIds.
  if (!('name' in ref) && !('title' in ref)) return null

  const populated = ref as PopulatedRef
  return { id: populated._id.toString(), name: populated.name ?? populated.title ?? '' }
}

export function toPublicTask(task: TaskDocument, now: Date = new Date()): PublicTask {
  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description ?? null,
    dueDate: task.dueDate,
    priority: task.priority,
    done: task.done,
    overdue: isOverdue(task, now),
    completedAt: task.completedAt ?? null,
    customer: toRefSummary(task.customer),
    deal: toRefSummary(task.deal),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }
}

export const Task: Model<ITask> = model<ITask>('Task', taskSchema)
