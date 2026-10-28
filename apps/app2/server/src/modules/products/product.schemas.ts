import { z } from 'zod'

import { PRODUCT_CATEGORIES } from '../../models/Product.js'

/** The assignment fixes the page size at 10. */
export const PRODUCTS_PER_PAGE = 10

const price = z
  .number({ message: 'Price must be a number' })
  .positive('Price must be greater than zero')
  // Two decimal places: a price of 10.005 would round on display and
  // disagree with the stored value.
  .max(1_000_000, 'Price must be at most 1,000,000')

const stock = z
  .number({ message: 'Stock must be a number' })
  .int('Stock must be a whole number')
  .min(0, 'Stock cannot be negative')
  .max(1_000_000, 'Stock must be at most 1,000,000')

export const productBodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(160, 'Name must be at most 160 characters'),
  category: z.enum(PRODUCT_CATEGORIES, { message: 'Choose a valid category' }),
  price,
  stock,
  // Optional, and an empty string is treated as "not set" rather than an
  // invalid URL, because that is what an untouched form field sends.
  imageUrl: z
    .union([z.string().trim().url('Enter a valid image URL'), z.literal('')])
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
})

export type ProductInput = z.infer<typeof productBodySchema>

export const listProductsQuerySchema = z.object({
  search: z.string().trim().max(160).optional(),
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(PRODUCTS_PER_PAGE),
})

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>
