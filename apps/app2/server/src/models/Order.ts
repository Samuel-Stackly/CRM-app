import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose'

export const ORDER_STATUSES = ['Pending', 'Shipped', 'Delivered', 'Cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/**
 * Cancelled orders are excluded from revenue.
 *
 * Revenue is defined as the sum of `total` across every order that has not been
 * cancelled — that is, Pending, Shipped and Delivered all count. Pending is
 * included because the assignment's dashboard reports booked revenue rather
 * than settled cash; the single rule that matters is that a cancelled order
 * never contributes. Defined here so the aggregation and any future report
 * cannot drift apart.
 */
export const REVENUE_STATUSES: OrderStatus[] = ['Pending', 'Shipped', 'Delivered']

export interface IOrderItem {
  product?: Types.ObjectId
  /** Copied at the time of sale, so a later rename does not rewrite history. */
  name: string
  quantity: number
  price: number
}

export interface IOrder {
  orderNo: string
  customerName: string
  items: IOrderItem[]
  total: number
  status: OrderStatus
  createdAt: Date
  updatedAt: Date
}

export type OrderDocument = HydratedDocument<IOrder>

export interface PublicOrder {
  id: string
  orderNo: string
  customerName: string
  items: { productId: string | null; name: string; quantity: number; price: number }[]
  total: number
  status: OrderStatus
  createdAt: Date
  updatedAt: Date
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: [true, 'Item name is required'], trim: true },
    quantity: {
      type: Number,
      required: [true, 'Item quantity is required'],
      min: [1, 'Item quantity must be at least 1'],
      validate: { validator: Number.isInteger, message: 'Item quantity must be a whole number' },
    },
    price: {
      type: Number,
      required: [true, 'Item price is required'],
      min: [0, 'Item price cannot be negative'],
    },
  },
  { _id: false },
)

const orderSchema = new Schema<IOrder>(
  {
    orderNo: {
      type: String,
      required: [true, 'Order number is required'],
      trim: true,
      // Unique so a retried seed or a duplicated request cannot create two
      // orders claiming the same reference.
      unique: true,
      index: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [120, 'Customer name must be at most 120 characters'],
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: 'An order must contain at least one item',
      },
    },
    total: {
      type: Number,
      required: [true, 'Total is required'],
      min: [0, 'Total cannot be negative'],
    },
    status: {
      type: String,
      required: true,
      enum: { values: [...ORDER_STATUSES], message: 'Unknown order status' },
      default: 'Pending',
    },
  },
  { timestamps: true },
)

// Serves both the status filter and the newest-first list ordering, and the
// dashboard's 14-day window scan.
orderSchema.index({ status: 1, createdAt: -1 })

export function toPublicOrder(order: OrderDocument): PublicOrder {
  return {
    id: order.id as string,
    orderNo: order.orderNo,
    customerName: order.customerName,
    items: order.items.map((item) => ({
      productId: item.product ? item.product.toString() : null,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
    total: order.total,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }
}

export const Order: Model<IOrder> = model<IOrder>('Order', orderSchema)
