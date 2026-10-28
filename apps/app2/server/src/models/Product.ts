import { Schema, model, type HydratedDocument, type Model } from 'mongoose'

/** The four categories the seed spreads products across. */
export const PRODUCT_CATEGORIES = ['Apparel', 'Electronics', 'Home', 'Outdoors'] as const
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

/** Stock at or below this counts as low in the dashboard figures. */
export const LOW_STOCK_THRESHOLD = 10

export interface IProduct {
  name: string
  category: ProductCategory
  /** Minor units are not used; the assignment's figures are plain currency. */
  price: number
  stock: number
  imageUrl?: string
  createdAt: Date
  updatedAt: Date
}

export type ProductDocument = HydratedDocument<IProduct>

export interface PublicProduct {
  id: string
  name: string
  category: ProductCategory
  price: number
  stock: number
  imageUrl: string | null
  createdAt: Date
  updatedAt: Date
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [160, 'Name must be at most 160 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: { values: [...PRODUCT_CATEGORIES], message: 'Unknown category' },
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0.01, 'Price must be greater than zero'],
    },
    stock: {
      type: Number,
      required: [true, 'Stock is required'],
      min: [0, 'Stock cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be a whole number',
      },
    },
    imageUrl: { type: String, trim: true },
  },
  { timestamps: true },
)

// The list endpoint filters by category and sorts newest-first by default;
// this index serves that query directly rather than scanning the collection.
productSchema.index({ category: 1, createdAt: -1 })

export function toPublicProduct(product: ProductDocument): PublicProduct {
  return {
    id: product.id as string,
    name: product.name,
    category: product.category,
    price: product.price,
    stock: product.stock,
    imageUrl: product.imageUrl ?? null,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}

export const Product: Model<IProduct> = model<IProduct>('Product', productSchema)
