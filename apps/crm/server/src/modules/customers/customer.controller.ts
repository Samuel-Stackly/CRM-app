import type { Request, Response } from 'express'

import { ApiError } from '../../utils/ApiError.js'
import type {
  CreateCustomerInput,
  ListCustomersQuery,
  UpdateCustomerInput,
} from './customer.schemas.js'
import * as customerService from './customer.service.js'

/** The authenticated id, guaranteed present by requireAuth. */
function ownerId(req: Request): string {
  if (!req.user) {
    throw ApiError.unauthorized()
  }
  return req.user.id
}

function customerId(req: Request): string {
  // Guaranteed well-formed by validateObjectId on the route.
  return req.params['id'] as string
}

export async function list(req: Request, res: Response): Promise<void> {
  const result = await customerService.listCustomers(
    ownerId(req),
    req.query as unknown as ListCustomersQuery,
  )
  res.status(200).json(result)
}

export async function create(req: Request, res: Response): Promise<void> {
  const customer = await customerService.createCustomer(
    ownerId(req),
    req.body as CreateCustomerInput,
  )
  res.status(201).json(customer)
}

export async function getById(req: Request, res: Response): Promise<void> {
  const customer = await customerService.getCustomer(ownerId(req), customerId(req))

  // docs/API.md §6.3 specifies { customer, deals, tasks }. The nested arrays
  // arrive with the Deal and Task modules; returning them as [] now would imply
  // "none" rather than "not implemented".
  res.status(200).json({ customer })
}

export async function update(req: Request, res: Response): Promise<void> {
  const customer = await customerService.updateCustomer(
    ownerId(req),
    customerId(req),
    req.body as UpdateCustomerInput,
  )
  res.status(200).json(customer)
}

export async function remove(req: Request, res: Response): Promise<void> {
  await customerService.deleteCustomer(ownerId(req), customerId(req))
  res.status(204).send()
}
