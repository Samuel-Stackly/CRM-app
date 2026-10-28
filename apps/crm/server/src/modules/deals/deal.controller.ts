import type { Request, Response } from 'express'

import { DEAL_STAGES, isOpenStage } from '../../models/Deal.js'
import { ApiError } from '../../utils/ApiError.js'
import type { CreateDealInput, ListDealsQuery, UpdateDealInput } from './deal.schemas.js'
import * as dealService from './deal.service.js'

function ownerId(req: Request): string {
  if (!req.user) {
    throw ApiError.unauthorized()
  }
  return req.user.id
}

function dealId(req: Request): string {
  return req.params['id'] as string
}

/** Static stage list, so the client never hardcodes stage strings. */
export function stages(_req: Request, res: Response): void {
  res.status(200).json({
    stages: DEAL_STAGES.map((stage) => ({
      value: stage,
      label: stage,
      open: isOpenStage(stage),
    })),
  })
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListDealsQuery

  // Board mode returns columns instead of a page, so it carries no pagination.
  if (query.groupBy === 'stage') {
    res.status(200).json(await dealService.getDealBoard(ownerId(req), query))
    return
  }

  res.status(200).json(await dealService.listDeals(ownerId(req), query))
}

export async function create(req: Request, res: Response): Promise<void> {
  const deal = await dealService.createDeal(ownerId(req), req.body as CreateDealInput)
  res.status(201).json(deal)
}

export async function getById(req: Request, res: Response): Promise<void> {
  res.status(200).json(await dealService.getDeal(ownerId(req), dealId(req)))
}

export async function update(req: Request, res: Response): Promise<void> {
  const deal = await dealService.updateDeal(
    ownerId(req),
    dealId(req),
    req.body as UpdateDealInput,
  )
  res.status(200).json(deal)
}

export async function remove(req: Request, res: Response): Promise<void> {
  await dealService.deleteDeal(ownerId(req), dealId(req))
  res.status(204).send()
}
