import type { QueryFilter } from 'mongoose'

import {
  Customer,
  toPublicCustomer,
  type ICustomer,
  type PublicCustomer,
} from '../../models/Customer.js'
import { ApiError } from '../../utils/ApiError.js'
import { buildPaginationMeta, type PaginationMeta } from '../../utils/pagination.js'
import type {
  CreateCustomerInput,
  ListCustomersQuery,
  UpdateCustomerInput,
} from './customer.schemas.js'

export interface CustomerListResult {
  data: PublicCustomer[]
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

/**
 * Builds the query filter.
 *
 * `owner` is applied first and unconditionally — it is the mechanism that keeps
 * one user's data invisible to another.
 */
function buildFilter(ownerId: string, query: Partial<ListCustomersQuery>): QueryFilter<ICustomer> {
  const filter: QueryFilter<ICustomer> = { owner: ownerId }

  if (query.status) {
    filter.status = query.status
  }

  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i')
    filter.$or = [{ name: pattern }, { company: pattern }, { email: pattern }]
  }

  return filter
}

export async function listCustomers(
  ownerId: string,
  query: ListCustomersQuery,
): Promise<CustomerListResult> {
  const filter = buildFilter(ownerId, query)
  const skip = (query.page - 1) * query.limit

  // The same filter drives both calls; using a different one for the count
  // would make `total` disagree with `data`.
  const [documents, total] = await Promise.all([
    Customer.find(filter).sort(query.sort).skip(skip).limit(query.limit),
    Customer.countDocuments(filter),
  ])

  return {
    data: documents.map(toPublicCustomer),
    pagination: buildPaginationMeta(query.page, query.limit, total),
  }
}

export async function createCustomer(
  ownerId: string,
  input: CreateCustomerInput,
): Promise<PublicCustomer> {
  const customer = await Customer.create({ ...input, owner: ownerId })
  return toPublicCustomer(customer)
}

/**
 * Loads one customer.
 *
 * Ownership is part of the query rather than a check after the fetch, so another
 * user's record simply does not match and produces the same 404 as a record that
 * does not exist. The response never reveals that it belongs to someone else.
 */
export async function getCustomer(ownerId: string, id: string): Promise<PublicCustomer> {
  const customer = await Customer.findOne({ _id: id, owner: ownerId })

  if (!customer) {
    throw ApiError.notFound('Customer not found')
  }

  return toPublicCustomer(customer)
}

export async function updateCustomer(
  ownerId: string,
  id: string,
  input: UpdateCustomerInput,
): Promise<PublicCustomer> {
  const customer = await Customer.findOneAndUpdate(
    { _id: id, owner: ownerId },
    input,
    { returnDocument: 'after', runValidators: true },
  )

  if (!customer) {
    throw ApiError.notFound('Customer not found')
  }

  return toPublicCustomer(customer)
}

export async function deleteCustomer(ownerId: string, id: string): Promise<void> {
  const customer = await Customer.findOneAndDelete({ _id: id, owner: ownerId })

  if (!customer) {
    throw ApiError.notFound('Customer not found')
  }

  // Cascade to this customer's deals and tasks is deferred until those models
  // exist. See docs/API.md Q6.
}
