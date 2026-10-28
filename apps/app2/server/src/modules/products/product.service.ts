import type { QueryFilter } from 'mongoose'

import {
  Product,
  toPublicProduct,
  type IProduct,
  type PublicProduct,
} from '../../models/Product.js'
import { ApiError } from '../../utils/ApiError.js'
import { buildPaginationMeta, type PaginationMeta } from '../../utils/pagination.js'
import type { ListProductsQuery, ProductInput } from './product.schemas.js'

export interface ProductListResult {
  data: PublicProduct[]
  pagination: PaginationMeta
}

/**
 * Escapes regex metacharacters in user input.
 *
 * Without this, a search for "a.*" would match everything and "(" would throw.
 * The input is data, not a pattern.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildFilter(query: Partial<ListProductsQuery>): QueryFilter<IProduct> {
  const filter: QueryFilter<IProduct> = {}

  if (query.category) {
    filter.category = query.category
  }

  if (query.search) {
    filter.name = new RegExp(escapeRegex(query.search), 'i')
  }

  return filter
}

export async function listProducts(query: ListProductsQuery): Promise<ProductListResult> {
  const filter = buildFilter(query)
  const skip = (query.page - 1) * query.limit

  // The same filter drives both calls; a different one would make `total`
  // disagree with `data`.
  const [documents, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Product.countDocuments(filter),
  ])

  return {
    data: documents.map(toPublicProduct),
    pagination: buildPaginationMeta(query.page, query.limit, total),
  }
}

export async function createProduct(input: ProductInput): Promise<PublicProduct> {
  const product = await Product.create(input)
  return toPublicProduct(product)
}

/**
 * Replaces a product.
 *
 * PUT semantics: the body carries the whole resource, so an omitted optional
 * field clears it rather than being left alone. `overwrite` is deliberate — a
 * plain update would leave a previously set imageUrl in place.
 */
export async function replaceProduct(id: string, input: ProductInput): Promise<PublicProduct> {
  const product = await Product.findOneAndReplace({ _id: id }, input, {
    returnDocument: 'after',
    runValidators: true,
  })

  if (!product) {
    throw ApiError.notFound('Product not found')
  }

  return toPublicProduct(product)
}

export async function deleteProduct(id: string): Promise<void> {
  const product = await Product.findOneAndDelete({ _id: id })

  if (!product) {
    throw ApiError.notFound('Product not found')
  }
}
