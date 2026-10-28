import type { NextFunction, Request, Response } from 'express'

import type { ListProductsQuery, ProductInput } from './product.schemas.js'
import * as service from './product.service.js'

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.listProducts(req.query as unknown as ListProductsQuery)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await service.createProduct(req.body as ProductInput)
    res.status(201).json({ product })
  } catch (error) {
    next(error)
  }
}

export async function replace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await service.replaceProduct(req.params.id as string, req.body as ProductInput)
    res.status(200).json({ product })
  } catch (error) {
    next(error)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.deleteProduct(req.params.id as string)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}
